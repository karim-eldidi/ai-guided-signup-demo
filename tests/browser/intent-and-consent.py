"""Two promises: never ask for something already given, and know what the
visitor actually wanted — including the wants we could not serve."""
import os
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".build", "shots")), "shots8"); os.makedirs(OUT, exist_ok=True)
U=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/ai-guided-signup-demo.html")
ok=[];bad=[]
def P(t): ok.append(t); print("PASS",t)
def F(t): bad.append(t); print("FAIL",t)

def answer(pg, label):
    pg.locator(f'.option-card:has-text("{label}")').first.click()
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(750)

with sync_playwright() as p:
    b=p.chromium.launch()

    # --- A. the journey, with the email given where it is now asked for -------
    # It used to be handed over on the landing page. Four reviews called that a toll
    # gate, so the front door asks for nothing and the save screen asks once there is a
    # week and a plan worth keeping (rule 61).
    c=b.new_context(viewport={'width':1440,'height':900}); pg=c.new_page()
    pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg.goto(U); pg.wait_for_timeout(500)
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(800)

    # own words instead of an option, on the very first question
    pg.fill('.ownwords input','i want to swim and use a sauna near kreuzberg')
    pg.locator('.ownwords__send').click(); pg.wait_for_timeout(1800)   # Urby "types" before answering
    if pg.locator('.notice').count(): P(f"Urby acknowledges free text: '{pg.locator('.notice').first.inner_text()[:60]}'")
    else: F("free text produced no acknowledgement")

    for lab in ['Sauna & spa','Kreuzberg','Three or four times a week']:
        answer(pg, lab)

    # the moment the address is actually asked for, and what it buys
    pg.locator('[data-go="save"]:visible').first.click(); pg.wait_for_timeout(600)
    pg.fill('form[data-form="save"] input[name="email"]','karim@example.com')
    pg.locator('form[data-form="save"] button[type="submit"]').first.click(); pg.wait_for_timeout(700)
    if 'karim@example.com' in pg.locator('#exit-modal .modal').inner_text(): P("an email given on the save screen is acknowledged in the saved confirmation")
    else: F("email not acknowledged after the save screen")
    pg.locator('[data-close-exit]:visible').first.click(); pg.wait_for_timeout(700)

    # ask something she cannot answer -> should become a recorded gap.
    # Ask Urby lives on the landing and the recommendation now, not on the steps.
    # Folded on the recommendation: it is the last thing below the decision, so it costs
    # a click rather than a screen. Open it the way a visitor would.
    pg.locator('[data-more="ask"]').first.click(); pg.wait_for_timeout(400)
    pg.fill('.rowcard--more .ask__row input','do you have a creche for my kids')
    pg.locator('.rowcard--more .ask__row button[type="submit"]').first.click(); pg.wait_for_timeout(600)
    ans=pg.locator('.ask__answer').inner_text()
    if "reliable answer" in ans.lower() or "don't have" in ans.lower(): P("Urby admits when she has no approved answer")
    else: F(f"Urby answered something she should not have: {ans[:100]}")

    # the exit modal must not re-ask for the email or the consent decision
    pg.locator('[data-open-exit]').first.click(); pg.wait_for_timeout(500)
    m=pg.locator('#exit-modal .modal').inner_text()
    pg.screenshot(path=f"{OUT}/exit-already-known.png")
    if 'karim@example.com' in m: P("exit modal shows the saved email instead of asking for one")
    else: F("exit modal does not show the saved email")
    for phrase in ['Yes, email me', 'Save my progress', 'Give me an email']:
        if phrase in m.split('Changed your mind')[0]: F(f"exit modal still asks: '{phrase}'")
    if not bad or all('still asks' not in x for x in bad): P("exit modal asks nothing that was already answered")
    if 'what i heard' in m.lower(): P("exit modal plays back what Urby heard")
    else: F("no intent playback in the exit modal")
    if 'unwind' in m.lower() and 'kreuzberg' in m.lower(): P("playback uses the real answers")
    else: F(f"playback missing the answers: {m[:200]}")
    if 'swim and use a sauna' in m: P("playback quotes what they typed")
    else: F("playback does not quote the free text")

    # the journey data carries the full intent record, gaps included
    pg.locator('[data-close-exit]').first.click(); pg.wait_for_timeout(300)
    pg.goto(U.replace('usc-ula-demo.html','usc-ula-demo.html')+'#') if False else None
    pg.locator('[data-go="data"]').first.click() if pg.locator('[data-go="data"]').count() else pg.goto(U)
    pg.wait_for_timeout(700)
    txt=pg.locator('#main').inner_text()
    if 'What this visitor really wanted' in txt: P("journey data has an intent record")
    else: F("journey data has no intent record")
    if 'creche' in txt: P("the question Urby could not answer is recorded as an unserved want")
    else: F("unanswered question missing from the intent record")
    if 'swim and use a sauna' in txt: P("what they typed is recorded verbatim")
    else: F("free text missing from the intent record")
    pg.screenshot(path=f"{OUT}/journey-data.png", full_page=True)
    c.close()

    # --- B. no email given: the ask is still there, exactly once ------------
    c=b.new_context(viewport={'width':1440,'height':900}); pg=c.new_page()
    pg.goto(U); pg.wait_for_timeout(500)
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)
    # Swimming near Neukölln, because that journey has a real alternative to test.
    # A gym journey correctly offers none: the cheaper plan opens nothing and the
    # richer one opens nothing extra, so the honest answer is no second option.
    for lab in ['Move more','Swimming','Neuk','Twice a week']: answer(pg, lab)
    pg.locator('[data-open-exit]').first.click(); pg.wait_for_timeout(500)
    m=pg.locator('#exit-modal .modal').inner_text()
    if 'what you’re saving' in m.lower() or 'keep your fit for later' in m.lower(): P("an anonymous visitor is still asked to save")
    else: F("anonymous visitor is not offered a save")
    pg.screenshot(path=f"{OUT}/exit-anonymous.png")

    # --- C. the alternatives, in the open, beside the recommendation -------
    pg.locator('[data-close-exit]:visible').first.click(); pg.wait_for_timeout(300)
    # Karim, 14 Aug: "comparing the plans is nice but hidden." The single alternative
    # card and the compare fold merged into one table that is simply on the card, so
    # every alternative is visible without opening anything. Rule 64.
    rows=pg.locator('.allplans__row')
    shown=pg.locator('.allplans__row:visible').count()
    if rows.count()==4 and shown==4: P("all four memberships are on the card, open on arrival")
    else: F(f"{shown} of {rows.count()} memberships are visible on the card")
    # One of them is also spotlit as the cheaper option, in the open beside the pick
    alt=pg.locator('.altbox__card')
    if alt.count() and 'visits' in alt.inner_text(): P(f"a cheaper option is in the open: '{' '.join(alt.inner_text().split())[:60]}'")
    else: F("no cheaper option beside the recommendation")
    # and each must say what it costs them, not only what it saves
    warns=[pg.locator('.allplans__warn').nth(i).inner_text() for i in range(pg.locator('.allplans__warn').count())]
    limits=[w for w in warns if 'visit routine' in w]
    if limits: P(f"a plan that cannot carry their week says so: '{limits[0].strip()}'")
    else: F(f"no plan states the allowance it cannot meet: {warns}")
    # Rule 32: a plan that opens nothing they asked for carries no way to choose it, so
    # the switch we test is on a row that is genuinely an option.
    cheaper=pg.locator('.allplans__row:not(.is-current)[data-plan]').first
    name=cheaper.locator('.allplans__name').inner_text().strip().split('\n')[0]
    cheaper.click(); pg.wait_for_timeout(800)
    now=pg.locator('.planbox__name').inner_text()
    if name==now: P(f"switching to another membership works: now on '{now}'")
    else: F(f"switch did nothing: wanted '{name}', still on '{now}'")
    # rule 67: the way back to Urby's own pick never folds
    back=pg.locator('.planbox__back').inner_text() if pg.locator('.planbox__back').count() else ''
    if 'would have picked' in back: P(f"after switching, the way back to Urby's pick is in the open: '{' '.join(back.split())}'")
    else: F(f"no way back to Urby's recommendation: '{back[:80]}'")
    if 'Your choice' in pg.locator('.planbox__badge').inner_text(): P("the plan column marks it as your choice, not a recommendation")
    else: F("still labelled as recommended after an override")
    pg.screenshot(path=f"{OUT}/after-switch.png")
    c.close()

    # --- D. the way out opens from anywhere (rule 71) -------------------------
    # "Save and exit" on question two used to be guarded like a checkout screen, so it
    # silently redirected back to question two and read as a broken button.
    c=b.new_context(viewport={'width':1440,'height':900}); pg=c.new_page()
    pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg.goto(U); pg.wait_for_timeout(500)
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(800)
    answer(pg, 'Unwind')                       # one answer in, three still to go
    pg.locator('[data-open-exit]').first.click(); pg.wait_for_timeout(400)

    head = pg.locator('#exit-modal .savepanel__title').inner_text()
    if 'saving' in head.lower(): P(f"Save and exit works mid-questions: '{head}'")
    else: F(f"Save and exit before the four questions went nowhere — still on '{head}'")

    # and it says only what is true that early: no plan, no price, no places
    if pg.locator('.savepanel__name').count()==0: P("it names no membership before one has been recommended")
    else: F(f"it invents a membership at question two: {pg.locator('.savepanel__name').inner_text()!r}")
    if pg.locator('.savevenue').count()==0: P("and no places, because none have been matched yet")
    else: F("it shows matched places before the questions that match them")
    where = pg.locator('.savepanel__where').inner_text()
    if 'question 2 of 4' in where: P(f"it says where they stopped instead: '{' '.join(where.split())[:60]}'")
    else: F(f"the early save screen does not say where they stopped: {where!r}")
    if pg.locator('.stepper:visible').count()==0: P("still no checkout stepper on the way out")
    else: F("the early save screen draws a checkout stepper")

    # the way back matches where they actually came from
    if pg.locator('[data-close-exit]:visible').count(): P("and the dialog closes back to the question they came from")
    else: F("the early save dialog has no way back")
    pg.screenshot(path=f"{OUT}/save-early.png", full_page=True)

    # saving that early still ends on the confirmation, and claims only the answers
    pg.fill('form[data-form="save"] input[name="email"]','early@example.com')
    pg.locator('form[data-form="save"] button[type="submit"]').first.click(); pg.wait_for_timeout(800)
    lede = pg.locator('#exit-modal .modal__sub').inner_text()
    if 'recommendation' not in lede.lower(): P(f"the saved screen claims only what it holds: '{' '.join(lede.split())[:70]}'")
    else: F(f"it promises a stored recommendation that does not exist: {lede!r}")
    c.close(); b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)
