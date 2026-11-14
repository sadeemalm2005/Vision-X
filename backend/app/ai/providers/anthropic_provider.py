"""Claude via the official Anthropic Python SDK."""

from __future__ import annotations

import anthropic

from .base import Generation, ProviderError

DEFAULT_MODEL = "claude-opus-5-5"
# Models that accept server-side refusal fallbacks (fallbacks="default").
_FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1", "claude-fable-5-2"}


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, model: str | None = None, timeout_s: float = 60.0):
        self.model = model or DEFAULT_MODEL
        # Credentials resolve from ANTHROPIC_API_KEY (or an `ant auth login` profile).
        self._client = anthropic.Anthropic(timeout=timeout_s, max_retries=2)

    def generate(self, system: str, user: str) -> Generation:
        kwargs: dict = {
            "model": self.model,
            "max_tokens": 16000,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            # A short, well-specified summary: low effort is enough and keeps cost down.
            "output_config": {"effort": "low"},
        }
        if self.model in _FALLBACK_MODELS:
            # If a safety classifier declines, the API retries on a fallback model in the same call.
            kwargs |= {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}
        try:
            response = self._client.beta.messages.create(**kwargs)
        except anthropic.AuthenticationError as e:
            raise ProviderError("Anthropic rejected the API key.") from e
        except anthropic.PermissionDeniedError as e:
            raise ProviderError("The Anthropic API key lacks permission for this model.") from e
        except anthropic.NotFoundError as e:
            raise ProviderError(f"Unknown Claude model '{self.model}'.") from e
        except anthropic.BadRequestError as e:
            raise ProviderError(f"Claude request rejected: {e.message}") from e
        except anthropic.RateLimitError as e:
            raise ProviderError("Claude rate limit reached; try again shortly.", retryable=True) from e
        except anthropic.APIStatusError as e:
            raise ProviderError(f"Claude API error ({e.status_code}).", retryable=e.status_code >= 500) from e
        except anthropic.APIConnectionError as e:
            raise ProviderError("Could not reach the Claude API.", retryable=True) from e

        if response.stop_reason == "refusal":
            raise ProviderError("Claude declined to write this summary.")
        text = "".join(b.text for b in response.content if b.type == "text").strip()
        if not text:
            raise ProviderError("Claude returned no text.", retryable=True)
        return Generation(text=text, provider=self.name, model=response.model)
