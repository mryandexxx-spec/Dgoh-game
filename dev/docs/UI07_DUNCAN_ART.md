# UI-07 — Duncan skill artwork / Other Memory rank plaque

Approved by owner on 24 November 2026. Original AI-generated art (OpenAI image generation); no external franchise image files used. Production WebP files have alpha and were cropped to the main connected opaque object, resized with Lanczos (maximum dimension 128 px, plaque 64 px), encoded with quality 80, method 6. The original full-resolution artwork was generated in the project conversation. Numeric rank is rendered dynamically and not baked into the artwork.

| Asset | Ability | Dimensions | Bytes |
|---|---|---:|---:|
| skill-duncan-basic.webp | Клинок гинацца | 117×128 | 6734 |
| skill-duncan-special.webp | Стойка мастера меча | 117×128 | 6592 |
| skill-duncan-ult.webp | Восемь против одного | 118×128 | 7120 |
| skill-duncan-passive.webp | Мастер меча | 120×128 | 6950 |
| memory-rank-plaque.webp | Dynamic Other Memory rank | 64×59 | 2268 |

Shared art registry: `src/ui/common.js`. The existing SVG glyph is retained as fallback. All files use the existing immutable asset map and offline shell pipeline; no network dependencies or gameplay changes.
