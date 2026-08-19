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
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC_DIR = os.path.join(HERE, "src")
OPT = os.path.join(HERE, "opt")           # optional smaller images, if present
# Venue photographs come from Urban Sports Club's own media bucket at runtime
# (see data/venues.json); these are the design images plus three offline fallbacks.
IMAGES = ["hero-climber.jpg", "email-header.jpg",
          # offline fallbacks for three venues, from the supplied designs
          "venue-boulderklub.jpg", "venue-stadtbad.jpg", "venue-yoga.jpg"]

MODULES = [
    "icons.js",
    "questions.js",
    "domain.js",
    "urby.js",
    "state.js",
    "components.js",
    "screens/landing.js",
    "screens/catalog.js",
    "screens/questions.js",
    "screens/recommendation.js",
    "screens/checkout.js",
    "screens/save.js",
    "screens/data.js",
    "events.js",
]


def read(*parts):
    with open(os.path.join(ROOT, *parts), encoding="utf-8") as fh:
        return fh.read()


def git(*args):
    """Run one read-only git command, or answer None when git cannot tell us anything."""
    try:
        done = subprocess.run(("git",) + args, cwd=ROOT,
                              capture_output=True, text=True, timeout=10)
    except (OSError, subprocess.SubprocessError):
        return None                     # no git on the machine, or it hung
    if done.returncode != 0:
        return None                     # not a repository, or no commits yet
    return done.stdout.strip()


def build_stamp():
    """The commit the build came from, so a tester can tell which build they are on.

    Deliberately not a clock. The generated file is committed, so a timestamp rewrote
    ~11,000 lines on every build whether or not anything had changed, and `git diff` was
    never readable. A commit hash moves only when the content does. Uncommitted work is
    named out loud, because that is exactly when the hash on its own would mislead.
    """
    head = git("rev-parse", "--short", "HEAD")
    if not head:
        return "dev"                    # no git, or not a repository — say so honestly
    return f"{head} + local edits" if git("status", "--porcelain") else head


def data_url(name):
    """Prefer the size-optimised copy in standalone/opt/ when it exists."""
    optimised = os.path.join(OPT, name)
    path = optimised if os.path.exists(optimised) else os.path.join(ROOT, "public", "images", name)
    with open(path, "rb") as fh:
        return "data:image/jpeg;base64," + base64.b64encode(fh.read()).decode()


def font_data_url(name):
    with open(os.path.join(ROOT, "public", "fonts", name), "rb") as fh:
        return "data:font/woff2;base64," + base64.b64encode(fh.read()).decode()


def inline_fonts(css):
    """Carry the typeface in the file rather than fetching it.

    public/styles.css points at real /fonts/*.woff2 URLs so the Node server can serve them,
    but the standalone demo is opened straight off a laptop or a USB stick, where a request
    to fonts.googleapis.com fails and Figtree silently falls back to Helvetica — in which
    weights 600 through 900 all render as one bold face and the type hierarchy disappears.
    ~40 KB of base64 buys a demo whose typography survives with no network at all.
    """
    for name in ("figtree-latin.woff2", "figtree-latin-ext.woff2"):
        css = css.replace("url('/fonts/%s')" % name, "url('%s')" % font_data_url(name))
    return css


def load_app_js():
    chunks = []
    for mod in MODULES:
        mod_path = os.path.join(SRC_DIR, mod)
        if os.path.exists(mod_path):
            with open(mod_path, "r", encoding="utf-8") as fh:
                chunks.append(fh.read())
        else:
            raise FileNotFoundError(f"Missing module: {mod_path}")
    return "\n\n".join(chunks)


def main():
    payload = {
        "plans": json.loads(read("data", "plans.json")),
        "venues": json.loads(read("data", "venues.json")),
        "faqs": json.loads(read("data", "faqs.json")),
        "apps": json.loads(read("data", "apps.json")),
    }
    images = {f"/images/{name}": data_url(name) for name in IMAGES}
    app_js = load_app_js()

    template = read("standalone", "template.html")
    if "/*__APP_JS__*/" in template:
        template = template.replace("/*__APP_JS__*/", app_js)

    html = (
        template
        .replace("/*__CSS__*/", inline_fonts(read("public", "styles.css")))
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
