#!/usr/bin/env python3
"""Generate minimal PWA icon PNGs (192×192, 512×512, 180×180 apple-touch).

Creates solid-color icons with a central diamond motif in kendo-themed
navy (#1e3a5f) and gold (#c9a84c).  Pure stdlib — no deps needed.

Usage:
    python3 scripts/generate-pwa-icons.py
"""

import struct
import zlib
import math
from pathlib import Path

PUBLIC = Path(__file__).resolve().parent.parent / "public"
PUBLIC.mkdir(parents=True, exist_ok=True)

BG = (0x1e, 0x3a, 0x5f)    # navy
FG = (0xc9, 0xa8, 0x4c)    # gold accent


def crc32(data: bytes) -> int:
    return zlib.crc32(data) & 0xFFFF_FFFF


def write_png(path: Path, width: int, height: int, pixels: list[tuple[int, int, int]]):
    """Write a minimal RGBA PNG.

    `pixels` is a flat list of (r, g, b) tuples, row-major, top-to-bottom.
    """
    sig = b"\x89PNG\r\n\x1a\n"

    # IHDR – colour type 2 (RGB), 8-bit
    ihdr_data = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    ihdr = struct.pack(">I", 13) + b"IHDR" + ihdr_data + struct.pack(">I", crc32(b"IHDR" + ihdr_data))

    # Build raw pixel rows (filter byte 0 + RGB triplets)
    raw = b""
    for y in range(height):
        raw += b"\x00"
        for x in range(width):
            r, g, b = pixels[y * width + x]
            raw += bytes([r, g, b])

    compressed = zlib.compress(raw, 9)
    idat = (
        struct.pack(">I", len(compressed))
        + b"IDAT"
        + compressed
        + struct.pack(">I", crc32(b"IDAT" + compressed))
    )

    iend = struct.pack(">I", 0) + b"IEND" + struct.pack(">I", crc32(b"IEND"))

    path.write_bytes(sig + ihdr + idat + iend)
    print(f"  wrote {path.name} ({width}×{height})")


def diamond_icon(size: int) -> list[tuple[int, int, int]]:
    """Render a diamond shape centred on a square canvas."""
    cx, cy = size / 2, size / 2
    margin = size * 0.22  # inset from edge
    half_diag = (size / 2 - margin) * math.sqrt(2)
    pixels: list[tuple[int, int, int]] = []
    for y in range(size):
        for x in range(size):
            # Manhattan distance from centre in diamond coordinates
            dx = abs(x - cx)
            dy = abs(y - cy)
            # Diamond outline + fill
            if dx + dy <= half_diag:
                # Inner diamond – slightly lighter gold
                pixels.append((0xdd, 0xbe, 0x55))
            elif dx + dy <= half_diag + size * 0.04:
                # Border
                pixels.append(FG)
            else:
                pixels.append(BG)
    return pixels


# ── Generate icons ────────────────────────────────────────────────────────
for size, name in [(192, "icon-192.png"), (512, "icon-512.png"), (180, "apple-touch-icon.png")]:
    # Scale the diamond proportionally
    px = diamond_icon(size)
    write_png(PUBLIC / name, size, size, px)

print("PWA icons generated.")
