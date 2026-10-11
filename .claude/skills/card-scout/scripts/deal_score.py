#!/usr/bin/env python3
"""Score active listings against sold comps and print a ranked deal table.

Input is one JSON file (or stdin) shaped like this:

{
  "card": "2013-14 prizm giannis antetokounmpo #290",
  "grade": "raw",                       # raw | psa10 | psa9 | bgs | sgc | csg | any
  "comps": [                            # sold listings, same card AND same grade bucket
    {"price": 185.0, "shipping": 4.5, "date": "2026-10-03", "title": "...", "url": "..."},
    ...
  ],
  "listings": [                         # active listings to score
    {"price": 120.0, "shipping": 0, "title": "...", "url": "...",
     "format": "bin" | "auction" | "bin_offer",
     "bids": 0, "ends_in_hours": 2.5, "seller_feedback": 37, "seller_pct": 100.0,
     "grade": "raw", "is_lot": false, "typo_title": true}
  ]
}

Only price, shipping, title and url are required for a listing; the rest sharpens the score.

  python3 deal_score.py scored.json             # markdown table, best deal first
  python3 deal_score.py scored.json --json      # machine-readable
  python3 deal_score.py scored.json --min-discount 0.2 --min-confidence low

How the score works:
  market     = median of comps after dropping the top and bottom 10% (one wild sale shouldn't move it)
  landed     = price + shipping (what the buyer actually pays)
  discount   = (market - landed) / market          -> 0.30 means 30% under market
  confidence = how much to trust the discount, from comp count, comp spread, and comp age
  flags      = things a human should check before paying (grade mismatch, lot, new seller...)
"""
import argparse
import json
import statistics
import sys
from datetime import date, datetime

GRADE_BUCKETS = {"raw", "psa10", "psa9", "psa8", "bgs", "sgc", "csg", "any"}


def trimmed_median(values: list[float]) -> float | None:
    vals = sorted(v for v in values if v is not None and v > 0)
    if not vals:
        return None
    trim = int(len(vals) * 0.10)
    if len(vals) - 2 * trim >= 3:
        vals = vals[trim:len(vals) - trim]
    return statistics.median(vals)


def spread(values: list[float]) -> float | None:
    """Coefficient of variation: stdev / mean. Big spread means the comps disagree."""
    vals = [v for v in values if v is not None and v > 0]
    if len(vals) < 2:
        return None
    mean = statistics.fmean(vals)
    return statistics.pstdev(vals) / mean if mean else None


def comp_age_days(comps: list[dict], today: date) -> float | None:
    ages = []
    for c in comps:
        d = c.get("date")
        if not d:
            continue
        try:
            ages.append((today - datetime.fromisoformat(d).date()).days)
        except ValueError:
            continue
    return statistics.median(ages) if ages else None


def confidence(n: int, cv: float | None, age: float | None) -> str:
    """Three buckets so the report stays readable. Thresholds explained in SKILL.md."""
    score = 0
    score += 2 if n >= 8 else 1 if n >= 4 else 0
    score += 2 if (cv is not None and cv < 0.25) else 1 if (cv is not None and cv < 0.5) else 0
    score += 1 if (age is not None and age <= 45) else 0
    return "high" if score >= 4 else "medium" if score >= 2 else "low"


def landed(item: dict) -> float:
    return float(item.get("price") or 0) + float(item.get("shipping") or 0)


def score_listing(item: dict, market: float, grade: str) -> dict:
    l = landed(item)
    discount = (market - l) / market if market else 0.0
    flags = []
    g = (item.get("grade") or "unknown").lower()
    if grade != "any" and g not in (grade, "unknown"):
        flags.append(f"grade is {g}, comps are {grade}")
    if g == "unknown":
        flags.append("grade not stated in title; confirm raw vs slabbed")
    if item.get("is_lot"):
        flags.append("lot: value is the best card, not the whole bundle")
    if item.get("typo_title"):
        flags.append("misspelled title: fewer competing eyes")
    fmt = item.get("format", "")
    if fmt == "auction":
        hrs = item.get("ends_in_hours")
        bids = item.get("bids")
        if hrs is not None and hrs <= 3 and (bids or 0) <= 1:
            flags.append(f"auction ends in {hrs:.1f}h with {bids or 0} bids; price will move")
        elif hrs is not None:
            flags.append(f"auction, {hrs:.0f}h left; current bid is not the final price")
    if fmt == "bin_offer":
        flags.append("accepts offers: try 10-15% under ask")
    fb = item.get("seller_feedback")
    if fb is not None and fb < 25:
        flags.append(f"new seller ({fb} feedback): check photos and return policy")
    pct = item.get("seller_pct")
    if pct is not None and pct < 98:
        flags.append(f"seller rating {pct}%")
    if discount > 0.6:
        flags.append("too good? check for reprint, damage, wrong card, or stock photo")
    return {"landed": round(l, 2), "discount": round(discount, 3), "flags": flags}


def run(data: dict, today: date) -> dict:
    grade = (data.get("grade") or "any").lower()
    comps = data.get("comps", [])
    comp_prices = [landed(c) for c in comps]
    market = trimmed_median(comp_prices)
    cv = spread(comp_prices)
    age = comp_age_days(comps, today)
    conf = confidence(len(comp_prices), cv, age)
    rows = []
    for item in data.get("listings", []):
        s = score_listing(item, market or 0.0, grade)
        rows.append({**item, **s})
    rows.sort(key=lambda r: -r["discount"])
    return {
        "card": data.get("card"), "grade": grade, "market": round(market, 2) if market else None,
        "comp_count": len(comp_prices), "comp_spread": round(cv, 2) if cv is not None else None,
        "comp_age_days": age, "confidence": conf, "listings": rows,
    }


def to_markdown(result: dict, min_discount: float) -> str:
    out = [f"### {result['card']} ({result['grade']})",
           f"Market: ${result['market']} from {result['comp_count']} sold comps "
           f"(spread {result['comp_spread']}, median age {result['comp_age_days']} days). "
           f"Confidence: **{result['confidence']}**", "",
           "| Deal | Landed | Format | Title | Flags |", "|---|---|---|---|---|"]
    shown = 0
    for r in result["listings"]:
        if r["discount"] < min_discount:
            continue
        shown += 1
        title = r.get("title", "")[:70]
        link = f"[{title}]({r['url']})" if r.get("url") else title
        pct = f"{r['discount'] * 100:+.0f}%"
        out.append(f"| {pct} | ${r['landed']} | {r.get('format', '?')} | {link} | {'; '.join(r['flags'])} |")
    if not shown:
        out.append(f"| | | | nothing under market by {min_discount * 100:.0f}% or more | |")
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", help="JSON input; stdin if omitted")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--min-discount", type=float, default=0.15, help="hide listings below this discount (0.15 = 15%%)")
    ap.add_argument("--min-confidence", choices=["low", "medium", "high"], default="low")
    ap.add_argument("--today", help="YYYY-MM-DD, for comp age (defaults to today)")
    a = ap.parse_args()
    data = json.load(open(a.file)) if a.file else json.load(sys.stdin)
    today = datetime.fromisoformat(a.today).date() if a.today else date.today()
    result = run(data, today)
    order = ["low", "medium", "high"]
    if order.index(result["confidence"]) < order.index(a.min_confidence):
        result["listings"] = []
        result["note"] = f"confidence {result['confidence']} is below {a.min_confidence}; comps too thin to call deals"
    if a.json:
        json.dump(result, sys.stdout, indent=2)
        print()
    else:
        print(to_markdown(result, a.min_discount))
        if result.get("note"):
            print(f"\n_{result['note']}_")


if __name__ == "__main__":
    main()
