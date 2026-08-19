import os
"""Verifying an external reviewer's findings, one assertion each."""
import datetime
from playwright.sync_api import sync_playwright
_TODAY = datetime.date.today().isoformat()
U=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/ai-guided-signup-demo.html")
OUT=os.path.join(os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".build", "shots")), "shots18"); os.makedirs(OUT, exist_ok=True)
ok=[];bad=[]
def P(t): ok.append(t); print("PASS",t)
def F(t): bad.append(t); print("FAIL",t)
def answer(pg,l):
    pg.locator(f'.option-card:has-text("{l}")').first.click()
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(800)

with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={'width':1440,'height':900}); pg=c.new_page()
    pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg.goto(U); pg.wait_for_timeout(500)

    # 4. skip link target on the landing
    if pg.locator('main#main').count(): P("landing exposes a main landmark for the skip link")
    else: F("no main#main on the landing")

    # Rule 33, on the longest page we have: the panel asks the first question, and the
    # section a scroll below it used to ask exactly the same one again. Repeating the
    # question reads as persuasion, not progress.
    asks = pg.evaluate("() => (document.body.innerText.match(/What would you love to do more of/g)||[]).length")
    if asks == 1: P("the landing asks its question once, not twice")
    else: F(f"the landing asks 'What would you love to do more of?' {asks} times")

    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(600)

    # 3. keyboard: tab into the group, arrows move, space selects
    pg.locator('.option-card__input').first.focus()
    pg.keyboard.press("ArrowDown"); pg.wait_for_timeout(200)
    sel=pg.locator('.option-card.is-selected')
    if sel.count()==1: P(f"arrow keys move within the radio group ('{sel.first.inner_text().strip()}')")
    else: F(f"{sel.count()} selected after ArrowDown")
    focused=pg.evaluate("() => document.activeElement.tagName + ':' + (document.activeElement.type||'')")
    P(f"focus is on the real input ({focused})") if 'INPUT' in focused else F(f"focus is on {focused}")
    ring=pg.evaluate("() => { const el=document.querySelector('.option-card:has(.option-card__input:focus-visible)'); return !!el }")
    P("the focused option shows a visible ring") if ring else F("no visible focus ring")

    # 12. the editing note must not appear on a first attempt
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(400)  # nothing selected? one is now
    pg.goto(U); pg.wait_for_timeout(400)
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(600)
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(500)
    body=pg.locator('#main').inner_text()
    if 'Pick one of the options' in body or 'Pick at least one' in body: P("empty submit still shows the error")
    else: F("empty submit produced no error")
    if 'changing an earlier answer' not in body: P("and does not claim you are changing an earlier answer")
    else: F("still claims the visitor is editing on a first attempt")

    answer(pg,'Move more'); answer(pg,'Gym & strength'); answer(pg,'Neukölln'); answer(pg,'Twice a week')

    # Karim's design, 14 Aug: the places are behind their own row — the row is the answer,
    # and the cards, the search and the distance control are what you can do about it.
    if pg.locator('.places__fold:not([open])').count():
        pg.locator('[data-toggle-places]').first.click(); pg.wait_for_timeout(450)
    # 5. every venue card says what it matched
    metas=pg.locator('.venue-grid--big .venue-card__meta').all_inner_texts()
    if metas and all(('for ' in m or 'other activities' in m) for m in metas):
        P(f"venue cards name the match: '{metas[0]}'")
    else: F(f"venue cards do not explain the match: {metas[:2]}")

    # 6. the coverage denominator is qualified
    # The reasoning lives in the "Questions and details" row at the foot of the page now,
    # and its handle names it, so this is the click a visitor makes to read it.
    if pg.locator('[data-more="why"]').count():
        pg.locator('[data-more="why"]').first.click(); pg.wait_for_timeout(400)
    cav=pg.locator('.cov__caveat').inner_text() if pg.locator('.cov__caveat').count() else ''
    if 'not the whole network' in cav: P(f"coverage says what the count is not: '{cav[:60]}…'")
    else: F("coverage still implies whole-network coverage")

    # 1. guest who declines to save is never told it was saved
    pg.evaluate("() => { const a = document.querySelector('.two-col__aside'); if (a) a.scrollTop = 0; window.scrollTo(0, document.body.scrollHeight) }"); pg.wait_for_timeout(250); pg.locator('.planbox__cta button:visible, .paybar button:visible').first.click(force=True); pg.wait_for_timeout(600)
    if pg.locator('[data-skip-save]:visible').count():
        pg.locator('[data-skip-save]:visible').click(); pg.wait_for_timeout(600)
    elif pg.locator('[data-close-exit]:visible').count():
        pg.locator('[data-close-exit]:visible').first.click(); pg.wait_for_timeout(600)
    top=pg.locator('.topbar').inner_text()
    if 'Saved to' not in top: P("after declining to save, the top bar does not claim it saved")
    else: F(f"top bar claims: '{top}'")
    lbl=pg.locator('label[for="email"]').inner_text()
    P(f"the details email is labelled for its purpose: '{lbl}'") if 'membership' in lbl.lower() else F(f"email label: '{lbl}'")
    why=pg.locator('#email ~ .field__why, .field:has(#email) .field__why').first.inner_text()
    if 'does not save' in why.lower(): P("and says it does not save your progress")
    else: F(f"the email field does not explain itself: '{why}'")

    # 2. no validation leaking between screens
    for f_,v in [('#firstName','Alex'),('#lastName','T'),('#email','a@b.com'),('#birthDate','1992-04-18'),('#street','W 42'),('#postcode','12045'),('#city','Berlin')]:
        pg.fill(f_,v)
    if pg.locator('.field-error').count()==0: P("the details form starts with no inherited errors")
    else: F(f"{pg.locator('.field-error').count()} stale errors on the details form")

    # 8. autofill metadata
    autos=pg.evaluate("() => [...document.querySelectorAll('#main input')].map(i=>i.id+':'+(i.autocomplete||'')).filter(x=>x.split(':')[0])")
    missing=[a for a in autos if a.endswith(':')]
    P(f"all {len(autos)} detail fields carry autofill hints") if not missing else F(f"missing autofill: {missing}")
    # 9. required cue. This used to look for a blanket "required except the mobile"
    #    sentence at the top of the form. The one optional field now says so on its own
    #    label, which is a stronger cue and survives the field list changing.
    tag = pg.locator('#main .field:has(#phone) .field__opt')
    unreq = pg.evaluate("() => [...document.querySelectorAll('#main .details-form input')].filter(i => !i.required).map(i => i.id)")
    if tag.count() == 1 and tag.inner_text().strip().lower() == 'optional' and unreq == ['phone']:
        P("the form marks its one optional field and requires the rest")
    else: F(f"required-field cue unclear: {tag.count()} optional tags, not-required {unreq}")

    # Date of birth accepted tomorrow. The picker is now bounded, and because the form is
    # novalidate the typed value has to be caught by the screen that produced it (rule 20).
    bounds = pg.evaluate("() => { const i=document.getElementById('birthDate'); return {max:i.max, min:i.min} }")
    if bounds['max'] == _TODAY: P(f"date of birth cannot be picked past today ({bounds['max']})")
    else: F(f"date of birth max is '{bounds['max']}', expected {_TODAY}")
    if bounds['min'] and bounds['min'] < '1930-01-01': P(f"and has a floor for typos ({bounds['min']})")
    else: F(f"date of birth has no sane floor: '{bounds['min']}'")
    pg.fill('#birthDate','2099-01-01')
    pg.locator('button:has-text("Continue to payment")').click(); pg.wait_for_timeout(500)
    err = pg.locator('.field:has(#birthDate) .field-error')
    if err.count() and 'happened yet' in err.first.inner_text(): P("a typed future birth date is refused, on the screen that asked")
    else: F("a birth date in the future was accepted")
    pg.fill('#birthDate','1992-04-18')

    pg.locator('button:has-text("Continue to payment")').click(); pg.wait_for_timeout(700)
    top=pg.locator('.topbar').inner_text()
    if 'Saved to' not in top: P("still not claiming 'saved' on the payment screen")
    else: F(f"payment screen claims: '{top}'")
    # 7. start date explained. It used to read "(1st of next month)", which stopped being true
    # once the visitor could defer the start — the picker offers the 1st of the next three
    # months. The rule it states is what must be on screen, not that one hardcoded month.
    main=pg.locator('#main').inner_text()
    if 'start on the 1st' in main or '1st of next month' in main: P("the start date explains itself")
    else: F(f"start date still unexplained: {main[:120]}")
    pg.screenshot(path=os.path.join(OUT, "payment.png"), full_page=True)

    # and the opposite: someone who DID ask to save should be told so
    c2=b.new_context(viewport={'width':1440,'height':900}); pg2=c2.new_page()
    pg2.goto(U); pg2.wait_for_timeout(400)
    # The address is asked for on the save screen now, not on the landing page: after
    # there is a week and a plan worth keeping (rule 61). So getting to "Saved" means
    # walking the journey and then choosing to save.
    pg2.locator('[data-start-fit]').click(); pg2.wait_for_timeout(700)
    for want in ['Move more','Gym & strength','Mitte','Twice a week']:
        pg2.locator(f'.option-card:has-text("{want}")').first.click()
        pg2.locator('[data-continue]:visible').first.click(); pg2.wait_for_timeout(700)
    pg2.locator('[data-go="save"]:visible').first.click(); pg2.wait_for_timeout(600)
    pg2.fill('form[data-form="save"] input[name="email"]','karim@example.com')
    pg2.locator('form[data-form="save"] button[type="submit"]').first.click(); pg2.wait_for_timeout(700)
    pg2.locator('[data-close-exit]:visible').first.click(); pg2.wait_for_timeout(400)
    # A receipt, not a headline: the note shrank to "Saved · <address>" because a
    # long address in the top-left was pulling the eye off the question.
    note = pg2.locator('.topbar .saved-note')
    txt = note.inner_text() if note.count() else ''
    if 'Saved' in txt and 'karim@example.com' in txt: P(f"someone who asked to save IS told it is saved: '{txt}'")
    else: F(f"the save confirmation went missing for someone who wanted it: '{txt}'")
    size = pg2.evaluate("() => { const n=document.querySelector('.topbar .saved-note'); return n?parseFloat(getComputedStyle(n).fontSize):null }")
    if size and size <= 13: P(f"and it is the smallest type on the page ({size}px)")
    else: F(f"the saved note is still shouting at {size}px")
    c2.close(); b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)
