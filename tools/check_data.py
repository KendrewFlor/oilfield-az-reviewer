"""Validates the study data in data/*.json. Standard library only; runs in CI and locally.

    python3 tools/check_data.py

Checks that every term has exactly one definition and at least one known discipline, that ids
don't collide, that every one of the 20 disciplines is covered, that only the allowed inline
tags appear, that quiz answers point at a real option, that exercises are complete, and that
resource links use https.
"""
from __future__ import annotations

import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
ALLOWED_TAG = re.compile(r"</?(sub|sup|i|b|br)>")
ANY_TAG = re.compile(r"</?[A-Za-z][^>]*>")
MIN_TERMS_PER_DISCIPLINE = 10


def load(name: str):
    return json.loads((DATA / f"{name}.json").read_text(encoding="utf-8"))


def term_id(term: str) -> str:
    """Same rule as Lib.termId in js/lib.js."""
    t = ANY_TAG.sub("", term).lower()
    t = "".join(c for c in unicodedata.normalize("NFKD", t) if not unicodedata.combining(c))
    return re.sub(r"^-+|-+$", "", re.sub(r"[^a-z0-9]+", "-", t))


def bad_tags(s: str) -> list[str]:
    return [m.group(0) for m in ANY_TAG.finditer(s) if not ALLOWED_TAG.fullmatch(m.group(0))]


def validate() -> list[str]:
    errors: list[str] = []
    err = errors.append

    disc = load("disciplines")["disciplines"]
    codes = [d["code"] for d in disc]
    if len(codes) != 20 or len(set(codes)) != 20:
        err(f"disciplines.json must list 20 unique disciplines (found {len(set(codes))})")
    known = set(codes)

    terms = load("terms")
    ids: dict[str, str] = {}
    per: dict[str, int] = {c: 0 for c in codes}
    for i, t in enumerate(terms):
        where = f"terms[{i}] {t.get('term', '?')!r}"
        if set(t) - {"term", "disc", "def", "slb"} or not {"term", "disc", "def"} <= set(t):
            err(f"{where}: keys must be term, disc, def (+ optional slb)")
            continue
        if not isinstance(t["term"], str) or not t["term"].strip():
            err(f"{where}: empty term")
        if not isinstance(t["def"], str) or not 30 <= len(t["def"]) <= 420:
            err(f"{where}: definition must be one string of 30-420 characters")
        if not t["disc"] or any(c not in known for c in t["disc"]) or len(set(t["disc"])) != len(t["disc"]):
            err(f"{where}: disc must be a non-empty list of known, distinct discipline codes")
        for c in t["disc"]:
            per[c] = per.get(c, 0) + 1
        if "slb" in t and not (t["slb"] is False or (isinstance(t["slb"], str) and re.fullmatch(r"[a-z0-9_-]+", t["slb"]))):
            err(f"{where}: slb must be false or a lowercase slug")
        for field in ("term", "def"):
            for tag in bad_tags(t[field]):
                err(f"{where}: tag {tag} not allowed")
        tid = term_id(t["term"])
        if tid in ids:
            err(f"{where}: id {tid!r} collides with {ids[tid]!r}")
        ids[tid] = t["term"]
    for c, n in per.items():
        if n < MIN_TERMS_PER_DISCIPLINE:
            err(f"discipline {c}: only {n} terms (minimum {MIN_TERMS_PER_DISCIPLINE})")

    notes = load("notes")
    seen = [n["disc"] for n in notes]
    for c in codes:
        if seen.count(c) != 1:
            err(f"notes.json: discipline {c} needs exactly one cheat sheet (found {seen.count(c)})")
    for n in notes:
        if not n.get("points") or not isinstance(n.get("equations"), list) or not n.get("tip"):
            err(f"notes.json {n.get('disc')}: needs points, equations (list) and tip")
        for s in [n["title"], n["tip"], *n["points"], *[x for e in n["equations"] for x in e]]:
            for tag in bad_tags(s):
                err(f"notes.json {n['disc']}: tag {tag} not allowed")

    qs = load("questions")
    qcount = {c: 0 for c in codes}
    for i, q in enumerate(qs):
        if q.get("disc") not in known:
            err(f"questions[{i}]: unknown discipline {q.get('disc')}")
            continue
        qcount[q["disc"]] += 1
        if len(q.get("options", [])) != 4 or len(set(q["options"])) != 4:
            err(f"questions[{i}]: needs 4 distinct options")
        if not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < 4:
            err(f"questions[{i}]: answer must be an index 0-3")
        if not q.get("why"):
            err(f"questions[{i}]: needs an explanation")
        for s in [q["q"], q["why"], *q["options"]]:
            for tag in bad_tags(s):
                err(f"questions[{i}]: tag {tag} not allowed")
    for c, n in qcount.items():
        if n < 3:
            err(f"questions.json: discipline {c} has {n} questions (minimum 3)")

    ex = load("exercises")
    pids = set()
    for p in ex["problems"]:
        if p["id"] in pids:
            err(f"exercises: duplicate id {p['id']}")
        pids.add(p["id"])
        if any(c not in known for c in p["disc"]):
            err(f"exercises {p['id']}: unknown discipline")
        a = p.get("answer", {})
        if not isinstance(a.get("value"), (int, float)) or not isinstance(a.get("tol"), (int, float)) or a["tol"] <= 0:
            err(f"exercises {p['id']}: answer needs numeric value and positive tol")
        if not p.get("steps") or any(not s.get("eq") for s in p["steps"]):
            err(f"exercises {p['id']}: every step needs at least one equation line")
        if "cashflow" in p and not all(isinstance(v, (int, float)) for v in p["cashflow"]):
            err(f"exercises {p['id']}: cashflow must be numbers")
    for p in ex["projects"]:
        if any(c not in known for c in p["disc"]) or not p.get("tasks") or not p.get("deliverables"):
            err(f"projects {p.get('id')}: needs known disciplines, tasks and deliverables")

    for g in load("resources"):
        for it in g["items"]:
            if not it["url"].startswith("https://"):
                err(f"resources: {it['name']} must use https")
    return errors


def main() -> int:
    errors = validate()
    if errors:
        print(f"Data check found {len(errors)} problem(s):", file=sys.stderr)
        for e in errors:
            print("  x " + e, file=sys.stderr)
        return 1
    terms = load("terms")
    print(f"Data check passed: {len(terms)} terms, {len(load('questions'))} questions, "
          f"{len(load('exercises')['problems'])} worked problems.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
