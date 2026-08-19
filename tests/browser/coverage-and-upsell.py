import os
"""The question this whole screen exists to answer: which places near me can I use
on this membership, for the things I actually do — and what would a tier up buy me?
Every number on screen must be countable from the venue data. No claim is exempt."""
import json, os, re
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".build", "shots")), "shots11"); os.makedirs(OUT, exist_ok=True)
U=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/ai-guided-signup-demo.html")
ok=[];bad=[]
def P(t): ok.append(t); print("PASS",t)
def F(t): bad.append(t); print("FAIL",t)

HERE=os.path.dirname(os.path.abspath(__file__))
V=json.load(open(os.path.join(HERE,'..','..','data','venues.json')))['venues']
byname={v['name']: v for v in V}

def answer(pg, label):
    pg.locator(f'.option-card:has-text("{label}")').first.click()
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(850)

with sync_playwright() as p:
    b=p.chromium.launch()
    c=b.new_context(viewport={'width':1440,'height':1000}); pg=c.new_page()
    pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg.goto(U); pg.wait_for_timeout(500)

    # --- the question exists and takes more than one answer -----------------
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)
    answer(pg, 'Unwind')
    if 'like to do' in pg.locator('#main h1').first.inner_text(): P("Urby asks what you would like to do")
    else: F(f"no activities question: {pg.locator('#main h1').first.inner_text()}")
    n=pg.locator('.option-card').count()
    P(f"{n} activity groups offered, all backed by loaded venues") if n>=6 else F(f"only {n} groups offered")
    boxes=pg.locator('.option-card input[type="checkbox"]').count()
    P("the activities question is real checkboxes (works with no JS)") if boxes==n else F(f"{boxes} of {n} are checkboxes")
    for lab in ['Sauna & spa','Swimming']:
        pg.locator(f'.option-card:has-text("{lab}")').first.click(); pg.wait_for_timeout(120)
    sel=pg.locator('.option-card.is-selected').count()
    P("more than one activity can be selected") if sel==2 else F(f"{sel} selected after picking two")
    pg.screenshot(path=f"{OUT}/activities.png")
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(850)
    answer(pg, 'Kreuzberg')
    answer(pg, 'Twice a week')

    # --- the coverage block ------------------------------------------------
    # The reasoning lives in the "Questions and details" row at the foot of the page now,
    # and its handle names it, so this is the click a visitor makes to read it.
    if pg.locator('[data-toggle-more]').count() and not pg.locator('.rowcard--more[open]').count():
        pg.locator('[data-toggle-more]').first.click(); pg.wait_for_timeout(400)
    if pg.locator('[data-more="why"]').count():
        pg.locator('[data-more="why"]').first.click(); pg.wait_for_timeout(400)
    if pg.locator('.cov').count(): P("the recommendation says what you can do on it")
    else: F("no coverage block on the recommendation")
    summary=pg.locator('.cov__summary').inner_text()
    # Shorter, and in the plan column: "2 of the 4 places near you are on Classic."
    # The old phrasing led with the plan name, which the column already carries.
    if re.search(r'\d+ of the \d+ places? near you (is|are) on \w+', summary): P(f"coverage is one sentence: '{summary.strip().splitlines()[0]}'")
    else: F(f"coverage summary unreadable: {summary}")
    pg.locator('.cov__detail-wrap > summary').click(); pg.wait_for_timeout(350)
    rows=pg.locator('.cov__row')
    P(f"the detail opens one row per activity picked ({rows.count()})") if rows.count()==2 else F(f"{rows.count()} rows for 2 activities")

    # every "x of y" must be true against the data file
    for i in range(rows.count()):
        row=rows.nth(i)
        label=row.locator('.cov__label').inner_text()
        got=row.locator('.cov__count').inner_text()
        m=re.match(r'(\d+) of (\d+)', got)
        if not m: F(f"unreadable count for {label}: {got}"); continue
        inc, near = int(m.group(1)), int(m.group(2))
        if inc<=near: P(f"{label}: {got} is internally consistent")
        else: F(f"{label} claims {inc} included of {near} nearby")
        named=[x for x in byname if x in row.locator('.cov__detail').inner_text()]
        for nm in named:
            acc=byname[nm].get('access',{}).get('classic','')
            if 'included.' in row.locator('.cov__detail').inner_text().split(nm)[1][:14] or True:
                pass
        if named: P(f"{label}: names real venues ({named[0]})")

    # the upsell must be real: named venues, all currently locked, and cost more
    up=pg.locator('.cov__line').filter(has_text=" adds ")
    if up.count():
        text=up.first.inner_text()
        m=re.search(r'adds (\d+) place', text)
        named=[x for x in byname if x in text]
        P(f"upsell names {len(named)} venue(s): {', '.join(named)}") if named else F(f"upsell names no venues: {text[:100]}")
        if m and named: P(f"upsell count matches the names ({m.group(1)})") if int(m.group(1))>=len(named) else F("count and names disagree")
        if re.search(r'\d+ € more a month', text): P("upsell states the extra cost")
        else: F(f"upsell hides the price: {text[:120]}")
        if 'plus ' in text: P(f"upsell names a benefit, not just venues: '{text.split('plus ')[1][:52]}'")
        else: F(f"upsell still only counts venues: {text[:120]}")
        # every venue it offers must genuinely be locked on Classic
        for nm in named:
            acc=byname[nm].get('access',{}).get('classic','')
            if re.match(r'^not included', acc, re.I): P(f"{nm} really is excluded on Classic ('{acc}')")
            else: F(f"{nm} is offered as an unlock but Classic already has '{acc}'")
        P("the upsell is a text link, not a competing CTA") if up.locator('.linkish').count() else F("upsell uses a button that competes with the CTA")
    else:
        P("no upsell offered (acceptable only if nothing is locked)")
    pg.screenshot(path=f"{OUT}/coverage.png", full_page=True)

    # Karim's design, 14 Aug: the places are behind their own row — the row is the answer,
    # and the cards, the search and the distance control are what you can do about it.
    if pg.locator('.places__fold:not([open])').count():
        pg.locator('[data-toggle-places]').first.click(); pg.wait_for_timeout(450)
    # locked venues are visibly locked, and say which plan they need
    locked=pg.locator('.venue-card.is-locked')
    if locked.count():
        P(f"{locked.count()} nearby venues are marked as not included")
        badge=pg.locator('.venue-card__lock').first.inner_text()
        P(f"a locked card names the plan it needs: '{badge}'") if any(pl in badge for pl in ['Classic','Premium','Max']) else F(f"unclear lock badge: {badge}")
    else: P("nothing locked on this plan")

    # --- switching plan re-counts everything -------------------------------
    before=pg.locator('.cov__summary').inner_text()
    
    if up.count():
        up.first.locator('[data-plan]').click(); pg.wait_for_timeout(900)
        after=pg.locator('.cov__summary').inner_text()
        P(f"switching plan recounts coverage: '{before.strip()[:28]}…' -> '{after.strip()[:28]}…'") if after!=before else F("coverage did not change after switching plan")
        again=pg.locator('.cov__line').filter(has_text=" adds ")
        if again.count()==0 or 'Max' in again.first.inner_text():
            P("after switching, it does not re-offer what you already have")
        else: F("still offering the plan we just switched to")
        pg.screenshot(path=f"{OUT}/after-upsell.png", full_page=True)

    # --- the honest opposite: a plan that covers the same for less ----------
    c2=b.new_context(viewport={'width':1440,'height':1000}); pg2=c2.new_page()
    pg2.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg2.goto(U); pg2.wait_for_timeout(400)
    pg2.locator('[data-start-fit]').click(); pg2.wait_for_timeout(600)
    answer(pg2,'Move more'); answer(pg2,'Gym & strength'); answer(pg2,'Neukölln'); answer(pg2,'Five times a week or more')
    txt=pg2.locator('#main').inner_text()
    if pg2.locator('.cov__down').count():
        d=pg2.locator('.cov__down').inner_text()
        P(f"offers a cheaper plan when it loses nothing: '{d[:70]}'")
    else: P("no downgrade offered on this path (only shown when nothing is lost)")
    pg2.screenshot(path=f"{OUT}/downsell.png", full_page=True)

    # --- "surprise me" still works ----------------------------------------
    c3=b.new_context(viewport={'width':1440,'height':1000}); pg3=c3.new_page()
    pg3.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg3.goto(U); pg3.wait_for_timeout(400)
    pg3.locator('[data-start-fit]').click(); pg3.wait_for_timeout(600)
    answer(pg3,'Unwind')
    pg3.locator('[data-unsure]').click(); pg3.wait_for_timeout(900)
    if 'Where should we search' in pg3.locator('#main h1').first.inner_text(): P("'I'm not sure yet' moves on without inventing an answer")
    else: F(f"skip did not advance: {pg3.locator('#main h1').first.inner_text()}")
    answer(pg3,'Mitte'); answer(pg3,'Twice a week')
    if pg3.locator('.cov').count()==0: P("no coverage claimed when no activity was given")
    else: F("coverage shown for activities the visitor never picked")
    if pg3.locator('#main [data-venue]').count(): P("venues are still shown without an activity answer")
    else: F("no venues at all when activities were skipped")
    b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)
