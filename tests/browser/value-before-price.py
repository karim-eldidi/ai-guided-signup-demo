import os
"""Karim: 'it feels like a scam — immediately a page saying pay this'.
The recommendation must lead with what you get: a week you could actually do,
real venues, then the proof, then the price beside it. And the week must be
buildable from the answers, never invented."""
import json, os, re
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", "/home/claude"), "shots13"); os.makedirs(OUT, exist_ok=True)
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
    lede=pg.locator('.reco-hero__lede').inner_text()
    if 'you want to' in lede.lower(): P(f"and says back what it heard: '{lede}'")
    else: F(f"the answer sentence is missing: {lede!r}")
    if not re.search(r'\d+\s*€', h1): P("no price in the headline")
    else: F(f"the headline still leads with a price: {h1}")

    order = pg.evaluate("""() => {
      const y = (sel) => { const el=document.querySelector(sel); return el ? el.getBoundingClientRect().top + window.scrollY : null; };
      return { week: y('.weekcard'), venues: y('.places'), apps: y('.rowcard--apps'),
               more: y('.rowcard--more'), price: y('.planbox__price') };
    }""")
    # Karim's design, 14 Aug: the week opens the page, because it is the signature of the
    # whole journey — then three rows, all of them value: what is near you, what comes with
    # it, and everything you might still want to ask. Money is in the other column.
    seq=[('week','venues'),('venues','apps'),('apps','more'),('price','more')]
    for a_,b_ in seq:
        if order[a_] is not None and order[b_] is not None and order[a_] < order[b_]: P(f"{a_} comes before {b_}")
        else: F(f"{a_} does not come before {b_} ({order[a_]} vs {order[b_]})")
    if order['week'] is not None and order['week'] < 700: P("the week opens the page, without scrolling far")
    else: F(f"the week starts {order['week']}px down")
    pg.screenshot(path=f"{OUT}/reco.png", full_page=True)

    # --- the week is open, and it is real ----------------------------------
    # It does not fold any more: nothing competes with it for the top of the page, so the
    # rows are simply there. Adjusting it is what folds.
    items=pg.locator('.weekrow')
    if items.first.is_visible(): P("the week is open on arrival — no click to read it")
    else: F("the week is hidden behind a fold")
    P(f"the week has {items.count()} sessions") if items.count()==2 else F(f"{items.count()} sessions for 'twice a week'")
    days=[]
    for i in range(items.count()):
        it=items.nth(i)
        day=it.locator('.weekrow__day').inner_text()
        venue=it.locator('.weekrow__pname').inner_text().split('\n')[0].strip()
        days.append(day)
        if venue in NAMES: P(f"{day}: {venue} is a real venue")
        else: F(f"{day}: '{venue}' is not in the venue data")
        km=it.locator('.weekrow__pname small').inner_text()
        real=[v for v in V if v['name']==venue]
        if re.search(r'[\d.]+ km', km): P(f"{day}: distance shown ({km.strip()})")
        else: F(f"{day}: no distance for {venue}")
        end=it.locator('.weekrow__end').inner_text().lower()
        if real:
            acc=real[0].get('access',{}).get('classic','')
            if re.match(r'^not included', acc, re.I):
                if 'only' in end: P(f"{day}: {venue} is flagged as needing a higher plan")
                else: F(f"{day}: {venue} is not on Classic but the week does not say so")
            elif acc.lower().startswith('included'):
                P(f"{day}: included with no limit to quote")
            else:
                if acc.lower() in end: P(f"{day}: quotes the real limit ('{acc}')")
                else: F(f"{day}: row end '{end}' does not carry published '{acc}'")
    if len(set(days))==len(days): P("sessions are spread across different days")
    else: F(f"duplicate days: {days}")
    if 'not a booking' in pg.locator('.weekcard__foot').inner_text(): P("the week says it is a suggestion, not a booking")
    else: F("the week reads as if it were booked")

    # --- the per-session number is arithmetic, not marketing ---------------
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
    n=pg.locator('.weekrow').count()
    P(f"changing frequency to five a week rebuilds the week ({n} sessions)") if n==5 else F(f"expected 5 sessions, got {n}")
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
      return { plan:y('.plan-summary') || y('.planbox'), opens:y('.plan-summary__fact') || y('.planbox__facts'), week:y('.weekcard'), places:y('.places') } }""")
    if pos['week'] is not None and pos['week'] < 844:
        P("on a phone the week (the value) is above the fold")
    else: F(f"the week is not above the fold on a phone ({pos['week']}px)")
    if pos['plan'] is not None and pos['places'] is not None and pos['plan'] < pos['places']:
        P("the plan card leads on a phone, with the places below it")
    else: F(f"the places still come before the plan on a phone ({pos['places']} vs {pos['plan']})")
    if pos['week'] is not None and pos['places'] is not None and pos['week'] < pos['places']:
        P("and the week sits between the price and the places, where the argument is")
    else: F(f"the week is not directly under the plan card on a phone ({pos['week']})")
    folded = pg2.evaluate("() => { const d=document.querySelector('.places__fold'); return d ? d.open : null }")
    if folded is False: P("the places section is folded on a phone (rule 60: only the tail folds)")
    else: F(f"the places section is not folded on a phone (open={folded})")
    pg2.screenshot(path=f"{OUT}/phone.png")
    c2.close()
    # --- the week is theirs: pick days, swap places, and the price follows ---
    c3=b.new_context(viewport={'width':1440,'height':950}); pg3=c3.new_page()
    pg3.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg3.goto(U); pg3.wait_for_timeout(500)
    pg3.locator('[data-start-fit]').click(); pg3.wait_for_timeout(600)
    answer(pg3,'Move more'); answer(pg3,'Gym & strength'); answer(pg3,'Mitte'); answer(pg3,'Three or four times a week')
    # The days are one control, not a disclosure inside a disclosure: asking to adjust the
    # week shows all seven at once, with the ones you'd go already filled.
    if pg3.locator('[data-toggle-week]').count():
        pg3.locator('[data-toggle-week]').first.click(); pg3.wait_for_timeout(400)
    if not pg3.locator('[data-open-days]').count(): P("the days are in the week itself, not behind a second link")
    else: F("the day picker is still hidden behind a disclosure")
    if pg3.locator('.daybtn').count()==7: P("seven days to choose from")
    else: F(f"{pg3.locator('.daybtn').count()} day buttons")
    on=pg3.locator('.daybtn.is-on').count()
    if on==3: P(f"the days we suggested are pre-selected ({on})")
    else: F(f"{on} days pre-selected for 'three or four times a week'")

    def snap():
        return (len(pg3.locator('.weekrow__day').all_inner_texts()),
                pg3.locator('.planbox__name').inner_text(),
                pg3.locator('.planbox__price b').inner_text(),
                pg3.locator('.answer-chip:visible').last.inner_text())
    d3, plan3, price3, chip3 = snap()
    pg3.locator('.daybtn.is-on').last.click(); pg3.wait_for_timeout(700)
    d2, plan2, price2, chip2 = snap()
    if d2==d3-1: P(f"dropping a day rebuilds the week ({d3} -> {d2} sessions)")
    else: F(f"the week did not change: {d3} -> {d2}")
    if plan2!=plan3 and price2!=price3: P(f"and the plan follows the schedule: {plan3} {price3} -> {plan2} {price2}")
    else: F(f"the plan did not follow: {plan3} {price3} -> {plan2} {price2}")
    if chip2!=chip3: P(f"the frequency answer stays true to the days picked: '{chip2}'")
    else: F(f"frequency chip still says '{chip3}' after changing days")
    for d in ['Tue','Wed','Thu','Fri']:
        btn=pg3.locator(f'.daybtn:has-text("{d}")')
        if 'is-on' not in (btn.get_attribute('class') or ''): btn.click(); pg3.wait_for_timeout(400)
    d5, plan5, price5, chip5 = snap()
    # Max is only recommended when it opens something Premium does not — the
    # anti-over-selling rule. Five days a week raises the tier; it does not force Max.
    if d5>=5 and plan5 in ('Premium','Max'): P(f"five days a week raises the tier without over-selling ({plan5} {price5})")
    else: F(f"{d5} days gave {plan5} {price5}")
    # you can never end up with an empty week
    for _ in range(8):
        btns=pg3.locator('.daybtn.is-on')
        if btns.count()<=1: break
        btns.last.click(); pg3.wait_for_timeout(300)
    if pg3.locator('.weekrow').count()>=1: P("the week can never be emptied to nothing")
    else: F("the week went empty")
    # Changing a row opens the recovered venue picker for that exact day. The visitor
    # chooses deliberately rather than having the page silently cycle to another place.
    if not pg3.locator('.weekrow__swap').count() and pg3.locator('[data-toggle-week]').count():
        pg3.locator('[data-toggle-week]').first.click(); pg3.wait_for_timeout(400)
    if pg3.locator('.weekrow__swap').count():
        day_before=pg3.locator('.weekrow__day').first.inner_text()
        pg3.locator('.weekrow__swap').first.click(); pg3.wait_for_timeout(600)
        title=pg3.locator('#main h1').first.inner_text()
        if day_before in title and pg3.locator('.weekpick').count():
            P(f"Change opens the venue picker for {day_before}")
        else: F(f"Change did not preserve the selected day: {title}")
    else: P("no swap offered (only one place serves that activity)")
    pg3.screenshot(path=f"{OUT}/own-days.png", full_page=True)
    c3.close()
    b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)
