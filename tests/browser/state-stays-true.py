"""Every line on screen must describe the state the visitor is actually in.

An external reviewer walked the journey, switched off the recommended plan, and found
three sentences still describing the world as it was before the switch: a chosen plan
relabelled as Urby's recommendation, a venue count that counted the wrong thing, and a
live status line naming the plan he had just moved away from. Each was true when it was
written and false by the time it was read.

These are the assertions that stop the same class of bug coming back — plus the two
landing-page promises that were being made without anything to back them: marketing
consent with no address, and a radius named rather than measured.
"""
import os, re
from playwright.sync_api import sync_playwright

U = os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/usc-ula-demo.html")
OUT = os.path.join(os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".build", "shots")), "shots19")
os.makedirs(OUT, exist_ok=True)

ok = []; bad = []
def P(t): ok.append(t); print("PASS", t)
def F(t): bad.append(t); print("FAIL", t)


def answer(pg, label):
    pg.locator(f'.option-card:has-text("{label}")').first.click()
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(850)


def to_recommendation(pg):
    """Swimming and climbing in Kreuzberg, twice a week — the reviewer's own journey,
    because it is the one that lands on Classic with a cheaper tier worth offering."""
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)
    answer(pg, 'Unwind')
    for lab in ['Swimming', 'Climbing']:
        pg.locator(f'.option-card:has-text("{lab}")').first.click(); pg.wait_for_timeout(120)
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(850)
    answer(pg, 'Kreuzberg')
    answer(pg, 'Twice a week')


with sync_playwright() as p:
    b = p.chromium.launch()
    c = b.new_context(viewport={'width': 1440, 'height': 1000}); pg = c.new_page()
    pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg.goto(U); pg.wait_for_timeout(500)

    # --- the landing asks for nothing at all (rules 61 and 55) ---------------
    # The conditional consent row used to live here, revealing itself when an address
    # was typed. There is no address to type on this page any more, so the whole
    # question moved to the screen that asks for one.
    if pg.locator('#main input[type="email"]').count()==0 and pg.locator('#main .consent-row').count()==0:
        P("the landing asks for neither an address nor a consent decision")
    else:
        F("the landing is asking for an email or a consent decision again")

    # --- and the consent question travels with the field it needs ------------
    c0 = b.new_context(viewport={'width':1440,'height':1000}); pg0 = c0.new_page()
    pg0.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg0.goto(U); pg0.wait_for_timeout(400)
    to_recommendation(pg0)
    pg0.locator('[data-go="save"]:visible').first.click(); pg0.wait_for_timeout(600)
    sform = pg0.locator('form[data-form="save"]')
    if sform.locator('input[name="email"]').count() and sform.locator('input[name="marketing"]').count():
        P("consent is asked in the same form as the address it would attach to")
    else:
        F("the consent question is not in the form that collects the address")
    if sform.locator('input[name="marketing"]').count() and not sform.locator('input[name="marketing"]').first.is_checked():
        P("and it starts unticked, separate from the Terms (rule 5)")
    else:
        F("marketing consent is pre-ticked on the save screen")
    c0.close()

    # --- the landing mentions email once, and only to say it is not wanted ----
    hero = pg.locator('.landing__body').inner_text().lower()
    if hero.count('email') == 1 and 'no email needed' in hero:
        P("the landing mentions email once, to say it is not needed")
    else:
        F(f"the landing mentions email {hero.count('email')} times, expected once")

    # --- the demo banner can be got out of the way ---------------------------
    bar = pg.locator('#demo-banner')
    pg.locator('[data-banner-toggle]').click(); pg.wait_for_timeout(200)
    if 'is-collapsed' in (bar.get_attribute('class') or ''): P("the prototype banner collapses")
    else: F("the prototype banner cannot be collapsed")
    if 'build' in bar.inner_text().lower() and 'pilot demo' in bar.inner_text().lower():
        P("collapsed, it still says it is a demo and which build it is")
    else:
        F(f"the collapsed banner lost the demo warning or the build stamp: {bar.inner_text()!r}")
    pg.locator('[data-banner-toggle]').click(); pg.wait_for_timeout(200)

    # --- into the recommendation --------------------------------------------
    to_recommendation(pg)

    # Karim's design, 14 Aug: the places are behind their own row — the row is the answer,
    # and the cards, the search and the distance control are what you can do about it.
    if pg.locator('.places__fold:not([open])').count():
        pg.locator('[data-toggle-places]').first.click(); pg.wait_for_timeout(450)
    # --- the radius is measured, not felt ------------------------------------
    chips = [pg.locator('.radius .chip-sm').nth(i).inner_text().strip()
             for i in range(pg.locator('.radius .chip-sm').count())]
    if chips and all(re.search(r'\d|berlin', ch, re.I) for ch in chips):
        P(f"every radius option is measurable: {chips}")
    else:
        F(f"a radius option cannot be checked against anything: {chips}")

    # Rule 33: the selected chip already carries the distance, so the count must not
    # repeat it. It names one only when the automatic radius reached past what the chip
    # claims — that is new information, not an echo.
    count_line = pg.locator('.radius__count').inner_text()
    current = pg.locator('.radius .chip-sm.is-current').inner_text().strip()
    echoes = re.search(r'within \d+ km', count_line) and 'reached' not in count_line.lower()
    if re.search(r'\d|berlin', current, re.I) and not echoes:
        P(f"how far we looked is stated once, on the control: '{current}' / '{count_line}'")
    else:
        F(f"the radius is echoed or missing: chip '{current}', count '{count_line}'")

    # --- the places heading counts only the places it claims -----------------
    head = pg.locator('.places .rowcard__text b').inner_text()
    m = re.match(r'(\d+) matching places? near ', head)
    if m:
        claimed = int(m.group(1))
        if pg.locator('.places__fold:not([open])').count():
            pg.locator('[data-toggle-places]').first.click(); pg.wait_for_timeout(400)
        cards = pg.locator('.venue-grid .venue-card')
        matching = sum(1 for i in range(cards.count())
                       if 'other activities' not in cards.nth(i).inner_text().lower())
        if claimed == matching:
            P(f"the heading counts {claimed} matching places and the rail holds exactly that many")
        else:
            F(f"heading claims {claimed} matching places, rail holds {matching}")
    else:
        P(f"no activity match to claim, so the heading does not claim one: '{head}'")

    # --- what Urby picked, before anyone overrides it ------------------------
    recommended = pg.locator('.planbox__name').inner_text().strip()
    if pg.locator('.planbox__badge').inner_text().strip().lower().startswith('recommended'):
        P(f"Urby's own pick is badged as a recommendation ({recommended})")
    else:
        F("the untouched recommendation is not badged as one")

    # the coverage figures the visitor is looking at, to check the save screen later
    # The reasoning lives in the "Questions and details" row at the foot of the page now,
    # and its handle names it, so this is the click a visitor makes to read it.
    if pg.locator('[data-more="why"]').count():
        pg.locator('[data-more="why"]').first.click(); pg.wait_for_timeout(400)
    cov = pg.locator('.cov__summary').inner_text() if pg.locator('.cov__summary').count() else ''
    covm = re.search(r'(\d+) of the (\d+) places?', cov)

    # --- switch the days, then switch the plan -------------------------------
    # Adjusting the week is what folds now, so ask for it the way a visitor would.
    pg.locator('[data-toggle-week]').first.click(); pg.wait_for_timeout(400)
    days = pg.locator('.daybtn:not(.is-on)')
    if days.count():
        days.first.click(); pg.wait_for_timeout(650)
    note = pg.locator('.week__changed')
    if note.count():
        P(f"changing the days says so at that moment: '{note.inner_text().strip()}'")
    else:
        P("changing the days produced no claim to go stale")

    # The single alternative card merged into the comparison table, which is now open on
    # the card rather than behind a fold. Any row that is not the current plan is a
    # switch a visitor can make.
    altrow = pg.locator('.allplans__row:not(.is-current):has([data-plan])').first
    alt = altrow.locator('[data-plan]')
    if not alt.count():
        F("no alternative plan offered, so the override path cannot be tested")
    else:
        chosen_name = altrow.locator('.allplans__name').inner_text().strip()
        alt.first.click(); pg.wait_for_timeout(800)

        # P1: the live status line must describe the plan selected NOW
        note = pg.locator('.week__changed')
        if not note.count():
            P("the day note was cleared rather than left describing the old plan")
        else:
            txt = note.inner_text()
            now = pg.locator('.planbox__name').inner_text().strip()
            if now.lower() in txt.lower() and (recommended.lower() not in txt.lower() or recommended == now):
                P(f"the live note follows the switch: '{txt.strip()}'")
            else:
                F(f"the live note still names {recommended} after switching to {now}: {txt!r}")

        # the sidebar stops calling it a recommendation
        badge = pg.locator('.planbox__badge').inner_text().strip().lower()
        if 'recommend' not in badge: P(f"after an override the plan is badged '{badge}', not a recommendation")
        else: F(f"an overridden plan is still badged '{badge}'")

        pg.screenshot(path=f"{OUT}/overridden.png", full_page=True)

        # --- P0: the save screen must not relabel a choice as advice ---------
        # It is its own screen now: the plan CTA goes straight to the details form, and
        # this is reached by choosing to keep the fit and come back.
        pg.locator('[data-go="save"]:visible').first.click(force=True)
        pg.wait_for_timeout(800)
        heads = [t for t in pg.locator('.savepanel__plabel').all_inner_texts() if 'membership' in t.lower()]
        head = heads[0] if heads else ''
        card = pg.locator('.savepanel__recap').inner_text()

        if 'recommend' in head.lower():
            F(f"the save screen calls the visitor's own choice a recommendation: {head!r}")
        else:
            P("the save screen does not relabel an override as Urby's recommendation")

        if 'chose' in head.lower():
            P(f"it says the choice was theirs: '{head}'")
        else:
            F(f"the save screen never acknowledges the override: {head!r}")

        named = pg.locator('.savepanel__name').inner_text().strip()
        if named == chosen_name:
            P(f"and it saves the plan they chose ({named})")
        else:
            F(f"the save screen names {named}, but they chose {chosen_name}")

        # --- P0: and its counts must be the counts they just read ------------
        if 'venue matches' in card.lower():
            F(f"the save screen still calls nearby venues 'matches': {card!r}")
        else:
            P("nearby venues are no longer counted as activity matches")

        # The line says "1 of your 3" when the plan opens some of them, and "both" or
        # "all 4" when it opens every one — three shapes, one count behind them.
        inc = near = None
        sm = re.search(r'Includes (\d+) of your (\d+) matching', card)
        if sm: inc, near = int(sm.group(1)), int(sm.group(2))
        elif re.search(r'Includes both of your matching', card): inc = near = 2
        else:
            sa = re.search(r'Includes all (\d+) of your matching', card)
            if sa: inc = near = int(sa.group(1))
            elif re.search(r'Includes your matching', card): inc = near = 1
        if inc is None:
            F(f"the save screen states no checkable place count: {card!r}")
        else:
            if inc <= near:
                P(f"the save screen count is internally consistent ({inc} of {near})")
            else:
                F(f"the save screen claims {inc} places open of {near} nearby")
            if covm and int(covm.group(2)) == near:
                P(f"and its 'nearby' figure matches the coverage block's ({near})")
            elif covm:
                F(f"save screen says {near} nearby, the recommendation said {covm.group(2)}")

        pg.screenshot(path=f"{OUT}/save.png", full_page=True)

    c.close(); b.close()

print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !", x)
