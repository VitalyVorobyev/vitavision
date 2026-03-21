# TASK-31: Backend P1 fixes (BE-001 through BE-004)
Backlog: BE-001, BE-002, BE-003, BE-004 | Date: 2026-03-21

## Plan
Fix 4 P1 backend issues identified in the backend pre-release review:
1. Content-Length parsing crash on malformed header (BE-001)
2. Add image byte-size guard before CV processing (BE-002)
3. Move load_dotenv() before _configure_logging() (BE-003)
4. Add rate limiting and middleware integration tests (BE-004)

## Implementation
- **Files changed:**
  - `backend/main.py` — moved load_dotenv(), added try/except for Content-Length parsing
  - `backend/routers/cv.py` — added byte-size check in `_decode_grayscale_image()`
  - `backend/tests/test_api.py` — added 7 new tests (3 rate limiting, 4 middleware)
  - `CHANGELOG.md` — 4 new entries

- **Deviations:** BE-002 scope adjusted. The original concern (chunked TE bypassing middleware) was inaccurate since CV endpoints read from storage, not request body. Instead added a byte-size guard in `_decode_grayscale_image()` to reject oversized images before decode.

- **Gate results:**

  | Gate | Result |
  |------|--------|
  | ruff check | Pass |
  | ruff format | Pass (after auto-format) |
  | mypy | Pass |
  | pytest (31 tests) | Pass |
  | bun run build | Pass |

## Review
- **Verdict:** approved
- **Issues found & fixed:** ruff format required reformatting of main.py (auto-fixed)
- **Residual risks:** None
