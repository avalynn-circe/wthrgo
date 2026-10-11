#!/usr/bin/env python3
"""Read references/watchlist.md and turn it into search plans.

  python3 watchlist.py list                       # every saved search, with player and focus
  python3 watchlist.py list --player giannis      # filter by player (substring, case-insensitive)
  python3 watchlist.py list --focus card          # card | set | sealed | player
  python3 watchlist.py plan --budget 12           # today's rotation: which searches to run and which lenses
  python3 watchlist.py plan --seed 2026-10-11     # same rotation as a given day (default: today)
  python3 watchlist.py urls "larry bird cracked ice"   # the eBay URLs for one search

A full sweep of 100+ saved searches across five lenses is hundreds of page loads, which is slow
and gets the IP bot-checked. `plan` instead rotates through the list so every search comes up
within about a week, and gives card-focused searches more lenses than set-wide ones.
"""
import argparse
import hashlib
import json
import os
import re
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
WATCHLIST = os.path.join(HERE, "..", "references", "watchlist.md")
sys.path.insert(0, HERE)
from ebay_url import build_url  # noqa: E402

ROW = re.compile(r"^(?P<q>[^|#]+?)\s*\|\s*(?P<player>[^|]+?)\s*\|\s*(?P<focus>card|set|sealed|player)\s*\|\s*(?P<notes>.*)$")

# Which lenses each focus gets, and why.
#   card:   the search names one card, so comps are meaningful -> full treatment
#   player: broad, comps meaningless; just catch fresh and cheap listings
#   set:    a whole set; only worth scanning for watch-list players and oddly cheap numbered cards
#   sealed: boxes and packs; price moves slowly, newest + cheapest is enough
LENSES_BY_FOCUS = {
    "card": ["sold", "new", "ending", "cheap", "offers"],
    "player": ["new", "ending"],
    "set": ["new", "cheap"],
    "sealed": ["new", "cheap"],
}


def load() -> list[dict]:
    rows = []
    with open(WATCHLIST, encoding="utf-8") as f:
        for line in f:
            m = ROW.match(line.strip())
            if not m:
                continue
            d = {k: v.strip() for k, v in m.groupdict().items()}
            d["gap_after"] = "(gap?)" in d["notes"]
            d["notes"] = d["notes"].replace("(gap?)", "").strip()
            rows.append(d)
    return rows


def grade_hint(q: str, notes: str) -> str:
    t = f"{q} {notes}".lower()
    if "psa 10" in t:
        return "psa10"
    for g in ("psa", "bgs", "sgc", "csg"):
        if re.search(rf"\b{g}\b", t):
            return g
    return "any"


def plan(rows: list[dict], budget: int, seed: str) -> list[dict]:
    # Deterministic shuffle keyed on the day, so re-running the same day gives the same plan
    # and the next day moves on. Card-focused rows are weighted to come up more often.
    def key(r):
        h = hashlib.sha256(f"{seed}|{r['q']}".encode()).hexdigest()
        weight = {"card": 0.0, "player": 0.25, "set": 0.5, "sealed": 0.6}[r["focus"]]
        return int(h[:8], 16) / 0xFFFFFFFF + weight
    chosen = sorted(rows, key=key)[:budget]
    out = []
    for r in chosen:
        grade = grade_hint(r["q"], r["notes"])
        lenses = LENSES_BY_FOCUS[r["focus"]]
        out.append({**r, "grade": grade, "lenses": lenses,
                    "urls": {l: build_url(r["q"], l, grade) for l in lenses}})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    l = sub.add_parser("list")
    l.add_argument("--player")
    l.add_argument("--focus", choices=list(LENSES_BY_FOCUS))
    l.add_argument("--json", action="store_true")
    p = sub.add_parser("plan")
    p.add_argument("--budget", type=int, default=12)
    p.add_argument("--seed", default=date.today().isoformat())
    p.add_argument("--player")
    p.add_argument("--json", action="store_true")
    u = sub.add_parser("urls")
    u.add_argument("query")
    u.add_argument("--grade", default=None)
    a = ap.parse_args()

    rows = load()
    if getattr(a, "player", None):
        rows = [r for r in rows if a.player.lower() in r["player"].lower() or a.player.lower() in r["q"].lower()]
    if getattr(a, "focus", None):
        rows = [r for r in rows if r["focus"] == a.focus]

    if a.cmd == "list":
        if a.json:
            json.dump(rows, sys.stdout, indent=2); print()
        else:
            for r in rows:
                print(f"{r['focus']:6s} {r['player']:15s} {r['q']}")
            print(f"\n{len(rows)} saved searches", file=sys.stderr)
    elif a.cmd == "plan":
        out = plan(rows, a.budget, a.seed)
        if a.json:
            json.dump(out, sys.stdout, indent=2); print()
        else:
            print(f"Rotation for {a.seed}: {len(out)} of {len(rows)} searches\n")
            for r in out:
                print(f"[{r['focus']}] {r['q']}  (player: {r['player']}, grade: {r['grade']})")
                for lens, url in r["urls"].items():
                    print(f"    {lens:7s} {url}")
    elif a.cmd == "urls":
        match = next((r for r in rows if r["q"] == a.query.lower().strip()), None)
        grade = a.grade or (grade_hint(match["q"], match["notes"]) if match else "any")
        focus = match["focus"] if match else "card"
        for lens in LENSES_BY_FOCUS[focus]:
            print(f"{lens:7s} {build_url(a.query, lens, grade)}")


if __name__ == "__main__":
    main()
