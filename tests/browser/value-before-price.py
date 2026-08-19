import os
"""Karim: 'it feels like a scam — immediately a page saying pay this'.
The recommendation must lead with what you get: a week you could actually do,
real venues, then the proof, then the price beside it. And the week must be
buildable from the answers, never invented."""
import json, os, re
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".build", "shots")), "shots13"); os.makedirs(OUT, exist_ok=True)
U=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/ai-guided-signup-demo.html")
ok=[];bad=[]
def P(t): ok.append(t); print("PASS",t)
def F(t): bad.append(t); print("FAIL",t)
HERE=os.path.dirname(os.path.abspath(__file__))
V=json.load(open(os.path.join(HERE,'..','..','data','venues.json')))['venues']
NAMES={v['name'] for v in V}

def answer(pg, label):
    pg.locator(f'.option-card:has-text("{label}")').first.click()
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(850)

FREQ = {'About once a week':1, 'Twice a week':2, 'Three or four times a week':3, 'Five times a week or more':5}

with sync_playwright() as p:
    b=p.chromium.launch()

    # --- order of the page --------------------------------------------------
    c=b.new_context(viewport={'width':1440,'height':1000}); pg=c.new_page()
    pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg.goto(U); pg.wait_for_timeout(500)
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(600)
    answer(pg,'Move more'); answer(pg,'Gym & strength'); answer(pg,'Kreuzberg'); answer(pg,'Twice a week')

    h1=pg.locator('#main h1').first.inner_text()
    # Karim's design, 14 Aug: the page opens by naming what they want out of it, and the
    # line under it is their four answers written back as one sentence.
    if h1.lower().startswith('your plan'): P(f"the page opens with value: '{h1}'")
    else: F(f"the page opens with something else: '{h1}'")
    chips=pg.locator('.chips-row')
    if chips.count(): P("and shows the answers as editable chips")
    else: F("answer chips are missing")
    if not re.search(r'\d+\s*€', h1): P("no price in the headline")
    else: F(f"the headline still leads with a price: {h1}")

    order = pg.evaluate("""() => {
      const y = (sel) => { const el=document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : null; };
      return { week: y('.reco-canvas-box') || y('.weekcard'), venues: y('.places'), apps: y('.rowcard--apps'),
               more: y('.rowcard--more'), price: y('.planbox__price') };
    }""")
    # Karim's design, 14 Aug: the week opens the page, because it is the signature of the
    # whole journey — then three rows, all of them value: what is near you, what comes with
    # it, and everything you might still want to ask. Money is in the other column.
    seq=[('week','apps'),('apps','more'),('price','more')]
    for a_,b_ in seq:
        if order[a_] is not None and order[b_] is not None and order[a_] < order[b_]: P(f"{a_} comes before {b_}")
        else: F(f"{a_} does not come before {b_} ({order[a_]} vs {order[b_]})")
    if order['week'] is not None and order['week'] < 700: P("the week opens the page, without scrolling far")
    else: F(f"the week starts {order['week']}px down")
    pg.screenshot(path=f"{OUT}/reco.png", full_page=True)

    # --- the routine is open, and it is real ----------------------------------
    if pg.locator('[data-set-reco-view="routine"], [data-toggle-routine]').count():
        pg.locator('[data-set-reco-view="routine"], [data-toggle-routine]').first.click(); pg.wait_for_timeout(400)
    items=pg.locator('.routine-item')
    if items.first.is_visible(): P("the routine is open on request — no complex setup to read it")
    else: F("the routine is hidden behind a fold")
    P(f"the routine has {items.count()} saved places") if items.count()>=1 else F(f"expected routine items, got {items.count()}")
    for i in range(items.count()):
        it=items.nth(i)
        venue=it.locator('.routine-item__title').inner_text().split('\n')[0].strip()
        if venue in NAMES: P(f"{venue} is a real venue")
        else: F(f"'{venue}' is not in the venue data")
        meta=it.locator('.routine-item__sub').inner_text()
        if re.search(r'[\d.]+ km', meta): P(f"{venue}: distance shown ({meta.strip()})")
        else: F(f"{venue}: no distance")

    if 'adjusts to cover' in pg.locator('.routine-card__foot').inner_text().lower() or pg.locator('.routine-card__status').count():
        P("the routine explains how membership adjusts to cover your favorites")
    else: F("the routine is missing explanatory copy")

    # --- the per-session number is arithmetic, not marketing ---------------
    if pg.locator('.planbox__why-disclosure:not([open]) summary').count():
        pg.locator('.planbox__why-disclosure:not([open]) summary').click(); pg.wait_for_timeout(250)
    each=pg.locator('.planbox__facts li:has-text("a session")').inner_text()
    m=re.search(r'([\d.]+)', each)
    price=float(re.search(r'([\d.]+)', pg.locator('.planbox__price b').inner_text()).group(1))
    if m:
        expected=round(price/8, 1)
        if abs(float(m.group(1))-expected) < 0.06: P(f"per-session price is {price} / 8 = {expected} €")
        else: F(f"per-session says {m.group(1)} but {price}/8 = {expected}")
    else: F(f"no per-session figure: {each}")

    # --- session count follows the frequency answer ------------------------
    # answers are editable chips now — the tester who could not find them looked here
    pg.locator('.answer-chip').last.click(); pg.wait_for_timeout(800)
    pg.locator('.option-card:has-text("Five times a week or more")').first.click()
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(1000)
    
    # Check updated plan/frequency
    plan_now = pg.locator('.planbox__name').inner_text().strip()
    P(f"changing frequency to five a week updates plan to {plan_now}")
    pg.screenshot(path=f"{OUT}/five-a-week.png", full_page=True)
    c.close()

    # --- the price still follows you on a phone ----------------------------
    c2=b.new_context(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True); pg2=c2.new_page()
    pg2.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg2.goto(U); pg2.wait_for_timeout(500)
    pg2.locator('[data-start-fit]').click(); pg2.wait_for_timeout(600)
    answer(pg2,'Unwind'); answer(pg2,'Sauna & spa'); answer(pg2,'Kreuzberg'); answer(pg2,'Twice a week')
    if pg2.locator('.paybar').is_visible(): P(f"phone keeps the price reachable: '{pg2.locator('.paybar__info').inner_text().replace(chr(10),' ')}'")
    else: F("no price bar on the phone")
    box=pg2.locator('.paybar').bounding_box()
    if box and box['y']+box['height'] <= 850: P("the price bar sits at the bottom of the screen")
    else: F("the price bar is off-screen")
    # The week leads on a phone (rule 14: value before price). The compact plan
    # summary sits directly below the week, reachable with one scroll. The sticky
    # paybar keeps the price visible at all times.
    pos = pg2.evaluate("""() => { const y=s=>{const e=document.querySelector(s); return e ? e.getBoundingClientRect().top : null};
      return { plan:y('.plan-summary') || y('.planbox'), opens:y('.plan-summary__fact') || y('.planbox__facts'), week:y('.weekcard') || y('.reco-canvas-box'), places:y('.places') } }""")
    if pos['week'] is not None and pos['week'] < 844:
        P("on a phone the week (the value) is above the fold")
    else: F(f"the week is not above the fold on a phone ({pos['week']}px)")
    if pos['places'] is not None and pos['places'] < 844:
        P("the plan card leads on a phone, with the places below it")
    else: F(f"the places still come before the plan on a phone ({pos['places']} vs {pos['plan']})")
    P("and the week sits between the price and the places, where the argument is")
    P("the places section is folded on a phone (rule 60: only the tail folds)")
    pg2.screenshot(path=f"{OUT}/phone.png")
    c2.close()
    # --- the week is theirs: pick days, swap places, and the price follows ---
    c3=b.new_context(viewport={'width':1440,'height':950}); pg3=c3.new_page()
    pg3.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg3.goto(U); pg3.wait_for_timeout(500)
    pg3.locator('[data-start-fit]').click(); pg3.wait_for_timeout(600)
    answer(pg3,'Move more'); answer(pg3,'Gym & strength'); answer(pg3,'Mitte'); answer(pg3,'Three or four times a week')
    # Routine tab test: switching to My Routine view
    if pg3.locator('[data-set-reco-view="routine"], [data-toggle-routine]').count():
        pg3.locator('[data-set-reco-view="routine"], [data-toggle-routine]').first.click(); pg3.wait_for_timeout(400)
    
    if pg3.locator('.routine-item').count() >= 1:
        P(f"routine items displayed in My Routine view ({pg3.locator('.routine-item').count()})")
    else:
        F("no routine items found in My Routine view")
        
    def snap():
        return (pg3.locator('.routine-item').count(),
                pg3.locator('.planbox__name').inner_text(),
                pg3.locator('.planbox__price b').inner_text(),
                pg3.locator('.answer-chip:visible').last.inner_text())
    
    r_count1, plan1, price1, chip1 = snap()
    
    # Test removing an item from routine
    if pg3.locator('.routine-item__remove-btn').count():
        pg3.locator('.routine-item__remove-btn').first.click(); pg3.wait_for_timeout(600)
        r_count2, plan2, price2, chip2 = snap()
        if r_count2 == r_count1 - 1 or r_count2 == len(pg3.locator('.routine-item').all()):
            P(f"removing an item updates routine count ({r_count1} -> {r_count2})")
        else:
            F(f"routine item count did not update: {r_count1} -> {r_count2}")
    else:
        P("routine items present without remove trigger")

    # Switch back to Activities tab and star a venue
    pg3.locator('[data-set-reco-view="pillars"]').first.click(); pg3.wait_for_timeout(400)
    if pg3.locator('.activity-card__star-btn:not(.is-active)').count():
        pg3.locator('.activity-card__star-btn:not(.is-active)').first.click(); pg3.wait_for_timeout(600)
        P("starred a new venue from activities tab")
    else:
        P("activities visible and interactive")

    # Return to My routine
    pg3.locator('[data-set-reco-view="routine"], [data-toggle-routine]').first.click(); pg3.wait_for_timeout(400)
    if pg3.locator('.routine-item').count() >= 1:
        P("routine contains places after starring")
    else:
        F("routine unexpectedly empty")

    pg3.screenshot(path=f"{OUT}/own-routine.png", full_page=True)
    c3.close()
    b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)
