# Contributing

## Setup

You need Python 3.10+ and Node 22+. Nothing to install.

```sh
git config core.hooksPath .githooks          # strips AI co-author trailers from your commits
python3 tools/security_scan.py
python3 tools/check_data.py
python3 -m unittest discover -s tests/python
node --test tests/js/lib.test.mjs
python3 -m http.server                       # then open http://localhost:8000
```

All of these must pass before you open a pull request (CI runs the same commands).

## Adding or fixing a term

Terms live in `data/terms.json`, one object per term:

```json
{"term": "water cut", "disc": ["PR", "PL"], "def": "The fraction or percentage of water in the total liquid produced."}
```

- **Write the definition in your own words.** Do not paste definitions from the SLB Energy Glossary or any other copyrighted source. Every term already links to its official SLB entry, so readers can see the exact wording there.
- One definition per term, 30 to 420 characters.
- `disc` uses the discipline codes in `data/disciplines.json`.
- Allowed inline tags: `<sub>`, `<sup>`, `<i>`, `<b>`, `<br>`. Anything else is shown as text.
- If SLB lists the term under a different name, add `"slb": "their_slug"`; if it has no entry, add `"slb": false`.

Questions (`data/questions.json`), cheat sheets (`data/notes.json`) and exercises (`data/exercises.json`) follow the same rules. Every worked problem's answer is recomputed in `tests/python/test_data.py`, so add a line there for a new one.

## Rules

- **No dependencies, CDNs or externally hosted fonts.** Fonts live in `fonts/` with their licence. The page must keep working under its Content-Security-Policy.
- **No inline scripts or styles** in `index.html`; no `eval`, `new Function` or network calls in `js/` other than loading `data/*.json`.
- **No AI agent config files** in commits (`CLAUDE.md`, `AGENTS.md`, `.mcp.json`, `.claude/` …). Keep them local; they're gitignored. See [docs/AI_TOOLING.md](docs/AI_TOOLING.md).
