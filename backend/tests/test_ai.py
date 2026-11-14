"""AI summary tests. No real API is called: a fake provider stands in."""

import pytest
from fastapi.testclient import TestClient

import app.api as api_module
from app.ai.providers.base import Generation, ProviderError
from app.ai.service import AIDisabled, SummaryRejected, SummaryService
from app.ai.verify import numbers_in, unverified_numbers
from app.main import app

client = TestClient(app)
REQ = {
    "body": "moon", "target_id": "moon_flat_plain", "mission_id": "rover_mobility",
    "features": ["slope", "roughness", "elevation_relief", "terrain_variability"],
}


class FakeProvider:
    name, model = "fake", "fake-1"

    def __init__(self, text_fn):
        self.text_fn, self.calls, self.last_user = text_fn, 0, None

    def generate(self, system, user):
        self.calls += 1
        self.last_user = user
        return Generation(self.text_fn(user), self.name, self.model)


# ------------------------------------------------------------------ verify


def test_numbers_in_handles_units_and_thousands():
    assert numbers_in("slope 5.0° vs 5.5°, relief 1,634 m, tile s23w069") == [5.0, 5.5, 1634.0]


def test_verifier_accepts_fact_numbers_and_roundings():
    facts = {"slope": "5.04°", "similarity": 0.85, "score": 92.3}
    assert unverified_numbers("Slope is 5.04° (about 5.0°), similarity 85%, score 92.3 or 92.", facts) == []


def test_verifier_flags_invented_numbers():
    facts = {"slope": "5.0°"}
    assert unverified_numbers("Slope 5.0° and gravity 9.81 m/s².", facts) == [9.81]


def test_small_counts_are_allowed():
    assert unverified_numbers("Three features, 2 of them strong.", {}) == []


def test_gemini_picks_newest_stable_flash_model():
    from app.ai.providers.gemini_provider import pick_model

    models = [
        {"name": "models/gemini-2.0-flash", "supportedGenerationMethods": ["generateContent"]},
        {"name": "models/gemini-2.5-flash", "supportedGenerationMethods": ["generateContent"]},
        {"name": "models/gemini-2.5-flash-lite", "supportedGenerationMethods": ["generateContent"]},
        {"name": "models/gemini-3.0-flash-preview", "supportedGenerationMethods": ["generateContent"]},
        {"name": "models/gemini-2.5-pro", "supportedGenerationMethods": ["generateContent"]},
        {"name": "models/text-embedding-004", "supportedGenerationMethods": ["embedContent"]},
    ]
    assert pick_model(models) == "gemini-2.5-flash"
    assert pick_model([{"name": "models/gemini-9-flash-preview", "supportedGenerationMethods": ["generateContent"]}]) == "gemini-9-flash-preview"
    assert pick_model([]) is None


def test_gemini_falls_back_to_next_model_when_newest_is_unavailable(monkeypatch):
    import httpx

    from app.ai.providers import gemini_provider as gp

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    listed = {"models": [
        {"name": f"models/{n}", "supportedGenerationMethods": ["generateContent"]}
        for n in ("gemini-3.8-flash", "gemini-3.5-flash", "gemini-3.0-flash")
    ]}
    calls = []

    def fake_get(url, **kw):
        return httpx.Response(200, json=listed, request=httpx.Request("GET", url))

    def fake_post(url, **kw):
        calls.append(url)
        req = httpx.Request("POST", url)
        if "3.8" in url:
            return httpx.Response(503, json={}, request=req)
        return httpx.Response(200, json={"candidates": [{"content": {"parts": [{"text": "ok"}]}}]}, request=req)

    monkeypatch.setattr(gp.httpx, "get", fake_get)
    monkeypatch.setattr(gp.httpx, "post", fake_post)
    p = gp.GeminiProvider(model=None)
    g = p.generate("sys", "user")
    assert g.model == "gemini-3.5-flash" and g.text == "ok"
    assert p.model == "gemini-3.5-flash"  # remembered for next time
    calls.clear()
    p.generate("sys", "user")
    assert len(calls) == 1 and "3.5" in calls[0]  # no retry of the failing model


def test_gemini_reports_when_all_candidates_fail(monkeypatch):
    import httpx

    from app.ai.providers import gemini_provider as gp

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(gp.httpx, "get", lambda url, **kw: httpx.Response(200, json={"models": [
        {"name": "models/gemini-3.8-flash", "supportedGenerationMethods": ["generateContent"]}]}, request=httpx.Request("GET", url)))
    monkeypatch.setattr(gp.httpx, "post", lambda url, **kw: httpx.Response(503, json={}, request=httpx.Request("POST", url)))
    with pytest.raises(ProviderError) as e:
        gp.GeminiProvider(model=None).generate("s", "u")
    assert e.value.retryable and "unavailable" in str(e.value)


def test_gemini_without_key_is_disabled(monkeypatch):
    from app.ai.providers.gemini_provider import GeminiProvider

    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with pytest.raises(ProviderError):
        GeminiProvider(model=None)


# ----------------------------------------------------------------- service


def test_service_caches_and_enforces_daily_limit():
    fake = FakeProvider(lambda u: "Close match on slope.")
    svc = SummaryService(provider_factory=lambda: fake, daily_limit=1)
    first = svc.summarize({"a": 1})
    assert first["verified"] and not first["cached"]
    assert svc.summarize({"a": 1})["cached"] and fake.calls == 1
    with pytest.raises(AIDisabled):
        svc.summarize({"a": 2})


def test_service_rejects_hallucinated_numbers():
    svc = SummaryService(provider_factory=lambda: FakeProvider(lambda u: "Gravity is 1.62 m/s²."), daily_limit=5)
    with pytest.raises(SummaryRejected):
        svc.summarize({"slope": "5.0°"})


def test_service_reports_missing_configuration():
    def factory():
        raise ProviderError("Set EARTH2MOON_AI_MODEL")

    st = SummaryService(provider_factory=factory).status()
    assert not st.enabled and "EARTH2MOON_AI_MODEL" in st.reason


# --------------------------------------------------------------------- API


@pytest.fixture
def fake_service(monkeypatch):
    def echo_facts(user):
        # Uses only numbers that appear in the fact sheet it was given.
        import json, re
        sheet = json.loads(user.split("Fact sheet:\n", 1)[1].rsplit("\n\nWrite", 1)[0])
        f = next(x for x in sheet["features"] if x["status"] == "scored")
        return f"{sheet['earth_window']['name']} scores {sheet['score_out_of_100']} out of 100; {f['feature']} is {f['earth_value']} versus {f['target_value']}."

    fake = FakeProvider(echo_facts)
    svc = SummaryService(provider_factory=lambda: fake, daily_limit=10)
    monkeypatch.setattr(api_module, "ai_service", svc)
    return fake


def test_summary_endpoint_uses_server_computed_facts(fake_service):
    top = client.post("/api/analyze", json=REQ).json()["results"][0]
    r = client.post("/api/ai/summary", json=REQ | {"site_id": top["site"]["id"]})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["verified"] and body["provider"] == "fake"
    assert str(top["score"]) in body["summary"]
    assert "what_earth_cannot_reproduce" in fake_service.last_user  # limits are always in the facts


def test_summary_endpoint_errors(fake_service, monkeypatch):
    assert client.post("/api/ai/summary", json=REQ | {"site_id": "nope"}).status_code == 404
    assert client.post("/api/ai/summary", json=REQ | {"site_id": "x", "target_id": "nope"}).status_code == 422

    def disabled():
        raise AIDisabled("No AI provider configured.")

    monkeypatch.setattr(api_module, "ai_service", SummaryService(provider_factory=disabled))
    top = client.post("/api/analyze", json=REQ).json()["results"][0]
    r = client.post("/api/ai/summary", json=REQ | {"site_id": top["site"]["id"]})
    assert r.status_code == 503 and "No AI provider" in r.json()["detail"]


def test_status_endpoint_shape():
    s = client.get("/api/ai/status").json()
    assert set(s) == {"enabled", "provider", "model", "reason"}
