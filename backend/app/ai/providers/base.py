"""Common interface for language-model providers."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


class ProviderError(RuntimeError):
    """A provider call failed; ``retryable`` tells the API how to report it."""

    def __init__(self, message: str, retryable: bool = False):
        super().__init__(message)
        self.retryable = retryable


@dataclass(frozen=True)
class Generation:
    text: str
    provider: str
    model: str


class LLMProvider(Protocol):
    name: str
    model: str

    def generate(self, system: str, user: str) -> Generation: ...
