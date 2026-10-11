---
name: card-scout
description: >-
  Scouts eBay for underpriced basketball cards and for new listings that match a collector's
  saved-search watch list (108 searches, heavy on Giannis Antetokounmpo rookies, Larry Bird,
  Luka Doncic, Topps Chrome refractors, 2013-14 Prizm, Court Kings, CSG and SGC slabs).
  Use this whenever the user asks to find deals, steals, bargains, mispriced or "below market"
  cards, to sweep or check the watch list, to see what's new for a player or set, to price a
  card against sold comps, to decide if a listing is a good buy, or to run a daily or weekly
  card report. Trigger on player names plus card words (prizm, optic, refractor, xfractor,
  select, court kings, national treasures, psa, bgs, sgc, csg, rookie, rc, /99, auto, patch)
  even when eBay is not mentioned, and on "my saved searches" or "my watch list" when the
  topic is cards.
---

# Card Scout

A listing is underpriced when what the buyer actually pays (price plus shipping) sits well
under what the same card, in the same grade, sold for recently. Everything here serves that
comparison, plus one more job: telling the user what just showed up for the things on their
watch list, because being first matters as much as being right.

The watch list is the user's eBay saved searches, transcribed into
`references/watchlist.md`. It is the spine of this skill. Read it before any sweep.

## Tools in this skill

All scripts are Python 3.10+, standard library only, run from the skill folder:

| Script | Job |
|---|---|
| `scripts/watchlist.py list` | the watch list, filterable by player or focus |
| `scripts/watchlist.py plan --budget N` | today's rotation: which searches to run and the eBay URLs for each |
| `scripts/ebay_url.py "<query>" --lens all` | eBay URLs for one query: sold comps, newly listed, ending soon, cheapest, best-offer |
| `scripts/typo_variants.py "<name>"` | misspellings to search for buried listings |
| `scripts/deal_score.py in.json` | turn extracted comps and listings into a ranked deal table |

The scripts build URLs and do the math. **Fetching and reading the eBay pages is your job**,
using whatever web fetch or browser tool the session has. That split is deliberate: eBay
changes its page markup and blocks scrapers, but a model reading a page copes with both.

If the user also has the `ebay-card-deals` skill installed, its `scan` command fetches and
parses pages itself. Use it for the fetch-and-comp step when it is available and working; feed
its JSON into the lenses and report below. It is optional, not required.

## How to read an eBay search page

Fetch the URL and, for each result, pull out: title, price, shipping (free or amount), format
(Buy It Now, auction with bid count and time left, "or Best Offer"), seller feedback count and
percentage when shown, and the item URL. For sold pages also pull the sold date. Write what
you extract as the JSON shape in the header of `scripts/deal_score.py`. Skip "Shop on eBay"
placeholder rows and anything in the standing exclusions list at the bottom of the watch list.

If the fetch comes back as "Pardon Our Interruption" or a captcha, eBay has flagged the
network. Don't hammer it. Give the user the URLs (they are in the script output) and ask them
to paste the results or save the page; `deal_score.py` works on whatever JSON you build from it.

Pace requests. A sweep is a dozen searches at two to five pages each; leave a couple of
seconds between pages and don't run more than one sweep an hour. Being blocked for a day costs
more than any single deal.

## Modes

Pick the mode from what the user asks. When in doubt, `sweep`.

### `sweep`: what's new and cheap on the watch list

1. `python3 scripts/watchlist.py plan --budget 12`. Card-focused searches get all five lenses;
   set, player and sealed searches get only "new" and "cheap". Twelve searches is about an
   hour of polite fetching. The user can say "full sweep" or name a player to override.
2. For each search, fetch the lenses in the plan. Comps first (`sold`), so you know the
   market before you look at the live listings.
3. Extract, run `deal_score.py`, keep anything 15% or more under market, or anything new in
   the last 24 hours on a `card`-focus search regardless of price (the user set that search
   because they want to see every copy).
4. Run at least two hunting lenses from the list below on the three highest-value cards in
   the plan. The plain query finds what everyone finds.
5. Report (format below). Note which searches were covered so the next sweep rotates on.

### `check <card>`: is this listing or card a deal?

Pin down player, year, set, parallel, serial, and grade bucket first; see
`references/card-knowledge.md` for the sets on the watch list and where sellers get them
wrong. Pull sold comps for that exact bucket, then the live listings, then score. If the user
gave a URL, score that one listing against the comps and say what to verify in the photos.

### `price <card>`: what is it worth?

Sold comps only. Give the trimmed median, count, spread, and the most recent three sales
with dates. If the grade isn't stated, show raw and the main graded buckets side by side.

### `watch add|remove <search>`: edit the watch list

Append or remove a row in `references/watchlist.md`, keeping alphabetical order and the
`search | player | focus | notes` shape. Tell the user to mirror the change in their eBay
saved searches, since the file is a copy, not a sync.

## Hunting lenses: where the underpriced listings hide

A correctly titled listing is seen by every buyer with the same saved search, and priced by a
seller who checked comps. Discounts live in listings those buyers never see. Use at least two
of these on any serious hunt and say which ones you ran.

1. **Typo trawl.** `typo_variants.py "giannis antetokounmpo"`. Antetokounmpo is the most
   misspelled name in the hobby, which makes it the best typo market in the hobby. Search the
   top five variants with the set name. Also search "greek freak" and "giannis" alone with the
   year. Catch: casual sellers, so insist on clear photos.
2. **Bucks, not Giannis.** Six watch-list searches are "bucks <parallel>". Sellers who title
   a card by team only are usually clearing a collection and pricing by feel. Scan these for
   Giannis, Middleton, Lopez, Ray Allen.
3. **Number, no name.** "2013-14 prizm 290", "2018-19 prizm 280" (Luka). Finds listings titled
   by card number. Keep the year or every year's #290 shows up.
4. **Parallel without the set, set without the parallel.** "giannis silver rc" (no prizm),
   "giannis prizm rc" (no silver). The photo decides. A rainbow sheen on a listing titled
   "prizm" is a buried silver.
5. **Wrong aisle.** Rerun the query with `--all-categories`. Cards listed under Collectibles
   or Football get no card-buyer traffic.
6. **Graveyard shift.** Sort auctions ending soonest and look for ones closing between about
   1am and 7am Eastern on a weeknight, or during a big game. Fewer snipers. Only auctions
   under a few hours out count; a low bid on a six-day auction is not a price.
7. **Stale offers.** Best Offer listings that have sat for weeks. A seller 10% under market
   who takes 15% off is a 25% deal. One-listing sellers accept; storefront sellers counter.
8. **Estate language.** "collection", "estate", "inherited", "dad's", "cleaning out", "found"
   plus the player. Priced by feel, photographed badly, often raw and unsleeved.
9. **Grader arbitrage.** This list has four CSG searches and an SGC one for a reason: those
   slabs sell near raw while the card inside may cross to PSA. Compare CSG 10 and SGC 10
   comps against raw and PSA 9 for the same card; when the slab is cheaper than raw plus a
   grading fee, that is the trade.
10. **Lot sniffing.** Search "<player> lot" with the year. A five-card lot whose headline card
    covers the price is a deal; value the lot by its best card, not its count. Manual and
    slow, and the best source of raw rookies.
11. **Serial siblings.** Search "/50" or "/25" with the set and no player, sorted by
    cheapest. Numbered cards of unfashionable players are cheap, but numbered Giannis, Bird
    and Luka cards titled lazily show up here too.
12. **News lag.** After a trade, injury or playoff run, live listings keep last month's
    prices for weeks. Compare the 30-day median to the 90-day one. If recent sales are
    higher, everything under the 90-day median is behind the market. After bad news, the
    reverse: the "deals" are the new price, so say so.
13. **The flip side.** The nephew sells too. When the 30-day median for a card he holds runs
    well above the 90-day one, or when the cheapest live copy is above the last three sales,
    say "sell signal" in the report. Finding deals is half the job.

## Reading the comps before trusting a deal

`deal_score.py` prints a confidence of high, medium or low from comp count, spread and age.
Treat it as the headline, not the number under it:

- Fewer than four comps: the market number is a guess. Widen to 90 days, loosen the query,
  and say the comps are thin.
- Spread above 0.5: the query is probably mixing two cards (base and silver, raw and slab).
  Tighten and rerun.
- Median age over 45 days: the price may have moved. Say so.
- More than 60% under a solid median: assume reprint, wrong card, damage, or scam until the
  photos prove otherwise. The script flags it.

Grade is the comp bucket. A PSA 10 against raw comps is not a deal, it is a different market.
Serial numbering and auto/patch are their own buckets too. The flags column tells the user
when a listing's bucket doesn't match.

## Report format

Lead with the best finds. Use this shape; keep each row to one line.

```
# Card Scout: <date>, <mode>, <N> searches covered

## Buy now
| Deal | Landed | Card | Why cheap | Verify | Link |
(15% or more under market, confidence medium or high, sorted by discount)

## Watch
| Ends | Bid | Card | Market | Link |
(auctions under 12h with low bids, and best-offer listings worth an offer)

## New on the watch list
(fresh listings for card-focus searches, even at market, newest first)

## Sell signals
(cards whose recent sales outrun the 90-day median, if any)

## Comps used
(one line per card: market, count, confidence)

## Covered
(searches and lenses run this time, and what came up empty; next rotation picks up from here)
```

Every "Buy now" row needs a reason it is cheap and one thing to check in the photos. A number
without a reason is a guess, and the user is about to spend money on it. Never say "guaranteed",
and never present the discount as a probability.

## Boundaries

- Never place bids, make offers, or buy. Report and link; the user acts.
- Don't fabricate comps. If a fetch failed, say which search has no comps rather than
  estimating from memory. Card prices move too fast for memory to be worth anything.
- Don't widen the watch list on your own. Suggest a new saved search in one line if a lens
  keeps turning up the same unlisted card, and let the user add it.
- Keep eBay traffic polite, as above. A blocked IP ends the session's usefulness.
