#!/usr/bin/env python3
"""Build eBay search URLs for card scouting.

Examples:
  python3 ebay_url.py "2013-14 prizm giannis antetokounmpo" --lens sold
  python3 ebay_url.py "larry bird cracked ice" --lens all --grade raw
  python3 ebay_url.py "bucks refractor" --lens ending --max 50 --json

Lenses (what each URL is for):
  sold     completed + sold listings, newest first      -> price comps
  new      active listings, newly listed first          -> catch fresh underpriced BINs
  ending   active auctions ending soonest               -> low-bid auctions about to close
  cheap    active listings, price + shipping low to high-> cheapest copies right now
  offers   Buy It Now with Best Offer, oldest first     -> stale listings, sellers likely to deal
  all      every lens above
"""
import argparse
import json
import sys
from urllib.parse import urlencode

BASE = "https://www.ebay.com/sch/i.html"

# eBay category 261328 = Sports Trading Card Singles. Narrower than 0 (all), still catches
# almost every card listing, and it drops t-shirts, posters and the like.
CARD_SINGLES = "261328"

# Words that mean the listing is not the card itself. Removed with eBay's -(a,b,c) syntax.
DEFAULT_EXCLUDE = [
    "reprint", "rp", "custom", "novelty", "digital", "nft", "facsimile",
    "proxy", "aceo", "sticker", "mystery", "repack",
]

GRADE_TERMS = {
    "raw": {"exclude": ["psa", "bgs", "sgc", "csg", "cgc", "graded", "gem", "mint"]},
    "psa10": {"append": "psa 10"},
    "psa9": {"append": "psa 9"},
    "bgs": {"append": "bgs"},
    "sgc": {"append": "sgc"},
    "csg": {"append": "csg"},
    "any": {},
}

LENSES = {
    # _sop: 10 newly listed, 1 ending soonest, 15 price+shipping lowest, 13 ended recently, 12 time: newly listed (completed)
    "sold":   {"LH_Sold": "1", "LH_Complete": "1", "_sop": "13"},
    "new":    {"_sop": "10"},
    "ending": {"LH_Auction": "1", "_sop": "1"},
    "cheap":  {"_sop": "15"},
    "offers": {"LH_BIN": "1", "LH_BO": "1", "_sop": "10"},
}


def build_query(terms: str, grade: str, extra_exclude: list[str], no_default_exclude: bool) -> str:
    q = terms.strip()
    spec = GRADE_TERMS.get(grade, {})
    if "append" in spec and spec["append"] not in q.lower():
        q = f"{q} {spec['append']}"
    exclude = [] if no_default_exclude else list(DEFAULT_EXCLUDE)
    exclude += spec.get("exclude", [])
    exclude += extra_exclude
    # de-duplicate, keep order
    seen, ex = set(), []
    for w in exclude:
        w = w.strip().lower()
        if w and w not in seen:
            seen.add(w)
            ex.append(w)
    if ex:
        q = f"{q} -({','.join(ex)})"
    return q


def build_url(terms, lens, grade="any", min_price=None, max_price=None, per_page=120,
              extra_exclude=None, no_default_exclude=False, category=CARD_SINGLES, us_only=False):
    params = {"_nkw": build_query(terms, grade, extra_exclude or [], no_default_exclude),
              "_sacat": category, "_ipg": str(per_page)}
    params.update(LENSES[lens])
    if min_price is not None:
        params["_udlo"] = f"{min_price:.2f}"
    if max_price is not None:
        params["_udhi"] = f"{max_price:.2f}"
    if us_only:
        params["LH_PrefLoc"] = "1"
    return f"{BASE}?{urlencode(params)}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("terms", help="search text, e.g. '2013-14 prizm giannis antetokounmpo'")
    ap.add_argument("--lens", default="all", choices=list(LENSES) + ["all"])
    ap.add_argument("--grade", default="any", choices=list(GRADE_TERMS))
    ap.add_argument("--min", type=float, dest="min_price")
    ap.add_argument("--max", type=float, dest="max_price")
    ap.add_argument("--exclude", action="append", default=[], help="extra word to exclude (repeatable)")
    ap.add_argument("--no-default-exclude", action="store_true", help="keep reprints/customs in results")
    ap.add_argument("--all-categories", action="store_true", help="search all of eBay, not just card singles")
    ap.add_argument("--us-only", action="store_true")
    ap.add_argument("--json", action="store_true", help="print {lens: url} as JSON")
    a = ap.parse_args()

    lenses = list(LENSES) if a.lens == "all" else [a.lens]
    out = {}
    for lens in lenses:
        out[lens] = build_url(a.terms, lens, a.grade, a.min_price, a.max_price,
                              extra_exclude=a.exclude, no_default_exclude=a.no_default_exclude,
                              category="0" if a.all_categories else CARD_SINGLES, us_only=a.us_only)
    if a.json:
        json.dump(out, sys.stdout, indent=2)
        print()
    else:
        for lens, url in out.items():
            print(f"{lens:7s} {url}")


if __name__ == "__main__":
    main()
