# Shared subagent contracts for Atlas authoring skills

This document defines the two reusable subagent contracts used by `paper-ingest`,
`algo-page`, `deep-model-page`, and `concept-page`. Each Atlas skill cites this
document instead of duplicating prompt text.

The architect+reviewer pattern from `.claude/skills/impl/SKILL.md` applies: the
main agent (Opus) orchestrates and verifies; Sonnet does the heavy reads.

**Single source of truth: the research note.** Notes at
`docs/research/notes/<source-id>.md` are the canonical structured artifact for a
source. They carry the narrative (Setting, Core idea, Assumptions, Failure
regime, Numerical sensitivity, Connections, Atlas update plan, Provenance), all
equations as inline LaTeX, all numerical constants, and citation pointers back
to the source. Downstream page-authoring skills draft from notes — never from
raw cache files.

## Extract contract

Used by `paper-ingest` to turn a cached source into a research note.

**Inputs (provided by orchestrator):**
- `cache_path` — explicit path under `docs/papers/.cache/` (paper) or
  `docs/sources/.cache/` (repo/doc)
- `source_id`, `kind` (`paper` | `repo` | `doc`)
- Path to the appropriate template under `docs/research/templates/`
- Candidate Atlas slugs (string list) for `relevant_atlas_pages` and the
  Connections / Atlas update plan sections

**Output (file write):**
- `docs/research/notes/<source-id>.md` — written ONLY IF the file does not
  already exist. If it exists, the subagent reports "already ingested" and
  exits without overwriting. Notes are hand-curated reasoning substrate; they
  are never auto-overwritten.

**Output (reply):**
- A short status report: source-id, atlas role, affected slugs, equations
  count, constants count. The orchestrator uses this to populate Step 8 of
  `paper-ingest`.

**Hard rules:**
- Read only the cache file + template. Do not network-fetch.
- Every numerical constant / equation / symbol that appears in the note prose
  MUST be traceable to a `# Provenance` citation pointing to a specific
  paper section, equation number, or table.
- Mark uncertain claims with `?` inline. Do not hallucinate.
- For arxiv papers, prefer reading `<id>.html` (ar5iv rendering, LaTeX
  preserved) for equation fidelity; fall back to `<id>.txt` (pdftotext) for
  search-and-narrow.

## Draft contract

Used by `algo-page`, `deep-model-page`, `concept-page` to turn note(s) into a
page body.

**Inputs (provided by orchestrator):**
- Primary research note path (`docs/research/notes/<id>.md`)
- List of reference note paths (for cited references and competing methods)
- Page-template skeleton path (defines the 5-section structure)
- Optional implementation-file paths (Rust/Python source for the
  `# Implementation` snippet)
- Target slug

**Output (reply):**
- The full page body as a markdown string in the reply (not wrapped in fences;
  so it can be appended directly to a frontmatter block).
- A `<<<AUDIT>>>{json}<<<END>>>` block listing every constant / symbol /
  equation used in the body. Each entry points to the note that supplied it:
  `{ "kind": "constant", "name": "k", "value": "0.04", "source_note": "harris1988-corner.md" }`.
  This lets Opus mechanically check that nothing was invented.

**File writes:**
- NONE. The Draft subagent never writes files. Opus is the only writer for
  page files; it assembles `--- frontmatter --- \n <body string>` and calls
  `Write` once.

**Hard rules:**
- Read only the provided notes + template + impl files. NEVER read cache files
  (`docs/papers/.cache/*.{html,txt}` or `docs/sources/.cache/**`).
- If a needed equation / constant / symbol is not present in any provided
  note, return exactly: `blocked: missing <kind> <name> for <source-id>` and
  stop. Do not improvise. The orchestrator will extend the note (re-running
  `paper-ingest` after deleting the note, or asking the user to amend it
  by hand) and retry.
- Voice and structure must match the page-template skeleton.

## Verification recipe (run by Opus after Draft contract returns)

For each entry in the AUDIT JSON, verify the value appears verbatim in the
named source note. This is a cheap string-match — no cache file is opened.

```bash
BODY=/tmp/draft.md       # the body string Opus received from Sonnet
AUDIT=/tmp/audit.json    # the AUDIT JSON block extracted from Sonnet's reply
miss=0
total=0
jq -r '.[] | "\(.name)\t\(.value // .latex // "")\t\(.source_note)"' "$AUDIT" \
  | while IFS=$'\t' read -r name value note; do
      [ -n "$value" ] || continue
      total=$((total+1))
      if ! grep -F -- "$value" "docs/research/notes/$note" > /dev/null; then
        echo "MISS: $name = $value (not in $note)"
        miss=$((miss+1))
      fi
    done
# Zero MISS lines = page faithfully copies from notes; nothing invented.
```

Any MISS line is a hallucination flag. Opus has two responses:
1. **Note is incomplete.** The constant/equation belongs in the note but isn't
   there. Extend the note by hand, then re-delegate the Draft contract.
2. **Sonnet invented.** The constant/equation isn't in any cited paper. Reject
   the draft; re-delegate with a stricter "use only what's in the notes" clause.

The verification only catches mismatches between page and note. To catch
mismatches between note and source paper, review the note when it is first
created (Step 7 of `paper-ingest`). Notes are the trust boundary.
