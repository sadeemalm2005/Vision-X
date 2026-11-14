"""Minimal grayscale PNG writer (zlib + struct), so no imaging library is needed."""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

import numpy as np


def _chunk(kind: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + kind + data + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF)


def write_gray_png(path: Path, img: np.ndarray) -> None:
    if img.dtype != np.uint8 or img.ndim != 2:
        raise ValueError("expected a 2-D uint8 array")
    h, w = img.shape
    raw = b"".join(b"\x00" + img[r].tobytes() for r in range(h))  # filter type 0 per row
    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0))
    png += _chunk(b"IDAT", zlib.compress(raw, 9))
    png += _chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
