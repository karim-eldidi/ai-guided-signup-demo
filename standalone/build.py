#!/usr/bin/env python3
"""
Build the self-contained demo: one HTML file with everything inlined.

    python3 standalone/build.py

Writes standalone/ai-guided-signup-demo.html — a single file you can double-click, or email
to anyone. No server, no install, no accounts.

It inlines:
  - public/styles.css                (so the design tokens stay in one place)
  - data/plans.json, data/venues.json (so content edits flow through)
  - the venue and hero photography as base64 data URLs

The journey logic lives in standalone/template.html and is a direct port of
src/recommend.js, src/venues.js, src/questions.js and the keyword fallbacks in
src/urby.js. If you change a rule in src/, change it there too — or better, run the
full app, which is the source of truth.

Differences from the full app, by design:
  - progress travels in the page address rather than a database
  - journey data covers one visitor at a time, in one browser
  - no AI wording layer (that needs a server and an API key)
"""

import base64
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OPT = os.path.join(HERE, "opt")           # optional smaller images, if present
# Venue photographs come from Urban Sports Club's own media bucket at runtime
# (see data/venues.json); these are the design images plus three offline fallbacks.
IMAGES = ["hero-climber.jpg", "email-header.jpg",
          # offline fallbacks for three venues, from the supplied designs
          "venue-boulderklub.jpg", "venue-stadtbad.jpg", "venue-yoga.jpg"]


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as fh:
        return fh.read()


def build_stamp():
    """A visible version, so a tester can tell whether they are on the latest build."""
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).strftime("%d %b %H:%M UTC")


def data_url(name):
    """Prefer the size-optimised copy in standalone/opt/ when it exists."""
    optimised = os.path.join(OPT, name)
    path = optimised if os.path.exists(optimised) else os.path.join(ROOT, "public", "images", name)
    with open(path, "rb") as fh:
        return "data:image/jpeg;base64," + base64.b64encode(fh.read()).decode()


def main():
    payload = {
        "plans": json.loads(read("data", "plans.json")),
        "venues": json.loads(read("data", "venues.json")),
        "faqs": json.loads(read("data", "faqs.json")),
        "apps": json.loads(read("data", "apps.json")),
    }
    images = {f"/images/{name}": data_url(name) for name in IMAGES}

    html = (
        read("standalone", "template.html")
        .replace("/*__CSS__*/", read("public", "styles.css"))
        .replace("/*__DATA__*/", json.dumps(payload, ensure_ascii=False))
        .replace("/*__IMAGES__*/", json.dumps(images))
        .replace("/*__BUILD__*/", build_stamp())
    )

    out = os.path.join(HERE, "ai-guided-signup-demo.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"built {out} ({round(len(html) / 1024)} KB)")


if __name__ == "__main__":
    main()
