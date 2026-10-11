#!/usr/bin/env python3
"""Generate misspellings of a player or set name for "typo trawl" searches.

Listings with a misspelled player name don't show up in the saved searches everyone else runs,
so they get fewer bids and sit at lower prices. This script produces the spellings a seller
is most likely to type wrong, ranked by how plausible they are.

  python3 typo_variants.py "giannis antetokounmpo"          # top 12 variants
  python3 typo_variants.py "antetokounmpo" --count 25 --json

Curated variants for the names on the watch list are included and come out first, because
they are real spellings seen in listing titles, not just machine-made permutations.
"""
import argparse
import json
import sys

CURATED = {
    "antetokounmpo": [
        "antetokoumpo", "antetokunmpo", "antetokounpo", "antetokounmbo", "antetokumpo",
        "antentokounmpo", "antetekounmpo", "antetokoumbo", "antetokonmpo", "antetokounmpoo",
        "antentokoumpo", "antetokoumnpo", "adetokunbo", "antetokounmpu", "antetoukounmpo",
    ],
    "giannis": ["gianis", "giannas", "gianniss", "giannes", "gianni", "yiannis", "giannis"],
    "doncic": ["donic", "donsic", "dončić", "doncik", "doncich", "donchic", "donncic"],
    "luka": ["luca", "lukka"],
    "bird": [],
    "larry": ["lary", "larey"],
    "middleton": ["middelton", "midleton", "middleten", "middletown"],
    "kessler": ["kesler", "kessller", "kestler"],
    "rollins": ["rollin", "rolins", "rollings"],
    "lopez": ["lopes"],
    "curry": ["currey", "curri"],
    "sharman": ["sharmen", "shearman", "sherman"],
    "bryant": ["briant", "bryan"],
    "refractor": ["refactor", "refracter", "refractors", "refrator", "refrector"],
    "xfractor": ["x-fractor", "x fractor", "xfracter", "xfractors"],
    "prizm": ["prism", "prizim", "prizem", "prizms"],
    "optic": ["optics", "optik"],
    "mosaic": ["mosiac", "mosaik"],
    "immaculate": ["immaculte", "imaculate", "immaculat"],
    "chronicles": ["chronicals", "cronicles"],
    "courtside": ["court side"],
    "psychedelic": ["psychadelic", "psycedelic", "psychedelc"],
    "revolution": ["revoloution", "revolucion"],
}

KEYBOARD_NEIGHBORS = {
    "a": "qwsz", "b": "vghn", "c": "xdfv", "d": "serfcx", "e": "wsdr", "f": "drtgvc",
    "g": "ftyhbv", "h": "gyujnb", "i": "ujko", "j": "huikmn", "k": "jiolm", "l": "kop",
    "m": "njk", "n": "bhjm", "o": "iklp", "p": "ol", "q": "wa", "r": "edft", "s": "awedxz",
    "t": "rfgy", "u": "yhji", "v": "cfgb", "w": "qase", "x": "zsdc", "y": "tghu", "z": "asx",
}

PHONETIC = [("ou", "u"), ("mp", "p"), ("nm", "m"), ("ck", "k"), ("ph", "f"), ("ie", "ei"),
            ("ei", "ie"), ("ll", "l"), ("ss", "s"), ("tt", "t"), ("ic", "ik"), ("c", "k")]


def machine_variants(word: str) -> dict[str, float]:
    """Return {variant: plausibility} for one word. Higher is more plausible."""
    out: dict[str, float] = {}
    n = len(word)

    def add(v, score):
        if v and v != word and v.isalpha():
            out[v] = max(out.get(v, 0), score)

    # dropped letter: very common in long names, especially in the middle
    for i in range(n):
        add(word[:i] + word[i + 1:], 0.9 if 1 < i < n - 1 else 0.6)
    # swapped neighbours
    for i in range(n - 1):
        add(word[:i] + word[i + 1] + word[i] + word[i + 2:], 0.8)
    # doubled letter
    for i in range(n):
        add(word[:i] + word[i] + word[i:], 0.5)
    # phonetic slips
    for src, dst in PHONETIC:
        if src in word:
            add(word.replace(src, dst, 1), 0.7)
    # fat-finger neighbours (only in the middle; people usually get the first letter right)
    for i in range(1, n - 1):
        for nb in KEYBOARD_NEIGHBORS.get(word[i], ""):
            add(word[:i] + nb + word[i + 1:], 0.3)
    return out


def variants_for_phrase(phrase: str, count: int) -> list[str]:
    words = phrase.lower().split()
    results: list[tuple[float, str]] = []
    for idx, w in enumerate(words):
        if len(w) < 4:
            continue  # typos in short words don't hide listings much
        ranked: list[tuple[float, str]] = [(2.0, c) for c in CURATED.get(w, []) if c != w]
        # long words get mangled more often; scale machine variants by length
        weight = min(1.0, len(w) / 10)
        ranked += [(s * weight, v) for v, s in machine_variants(w).items()]
        for score, v in ranked:
            results.append((score, " ".join(words[:idx] + [v] + words[idx + 1:])))
    results.sort(key=lambda t: -t[0])
    seen, out = set(), []
    for _, v in results:
        if v not in seen:
            seen.add(v)
            out.append(v)
        if len(out) >= count:
            break
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("phrase")
    ap.add_argument("--count", type=int, default=12)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    v = variants_for_phrase(a.phrase, a.count)
    if a.json:
        json.dump(v, sys.stdout, indent=2)
        print()
    else:
        print("\n".join(v))


if __name__ == "__main__":
    main()
