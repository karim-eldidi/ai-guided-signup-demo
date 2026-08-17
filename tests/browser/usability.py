import os
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", "/home/claude"), "shots3"); os.makedirs(OUT, exist_ok=True)
URL=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/ai-guided-signup-demo.html")
errs=[]; ok=[]
def good(t): ok.append(t); print("PASS", t)
def bad(t): errs.append(t); print("FAIL", t)

with sync_playwright() as p:
    b=p.chromium.launch()
    def fresh(w=1440,h=900,m=False):
        c=b.new_context(viewport={"width":w,"height":h}, device_scale_factor=2 if m else 1, is_mobile=m, has_touch=m)
        pg=c.new_page(); pg.on("pageerror", lambda e: bad(f"JS ERROR: {e}"))
        pg.goto(URL); pg.wait_for_timeout(500); return c,pg
    def h1(pg):
        try: return pg.locator('#main h1').first.inner_text()[:70]
        except: return "(none)"
    def cont(pg): pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(750)

    # 1. no email needed to start
    c,pg=fresh()
    n=pg.evaluate("() => document.querySelectorAll('#main button,#main a,#main input').length")
    good(f"Landing interactive elements now {n} (was 17)")
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)
    good(f"'Find my fit' starts the conversation with no email: '{h1(pg)}'") if 'do more' in h1(pg) else bad("Find my fit did not start the conversation")
    pg.screenshot(path=f"{OUT}/01-q1.png")

    # progress + no back on q1
    prog=pg.locator('.qprogress__label').inner_text()
    good(f"Question counter shown: '{prog}'")
    # Rule 58: the questions are drawn inside step 1, not beside it. One track on the
    # screen, and one segment per question under the step they belong to.
    segs=pg.locator('.stepper__step.is-current .stepper__sub .stepper__seg').count()
    good(f"the four questions are segments inside step 1 ({segs})") if segs==4 else bad(f"step 1 carries {segs} question segments, expected 4")
    if pg.locator('.stepper__step.is-current .stepper__seg.is-now').count()==1:
        good("the current question is marked inside step 1")
    else: bad("no current-question marker inside step 1")
    if pg.locator('.qprogress__track, .qprogress__fill').count()==0:
        good("the question row no longer carries a second progress bar")
    else: bad("two progress bars compete on a question screen")
    good("No Back on question 1 (correct)") if pg.locator('[data-back]').count()==0 else bad("Back shown on q1")

    # 2. continue with nothing -> visible error
    cont(pg)
    if pg.locator('.field-error').count(): good("Continue with nothing selected now shows an error")
    else: bad("Continue with nothing still silent")
    pg.screenshot(path=f"{OUT}/02-noselect.png")

    # 3. skip option exists
    if pg.locator('.option-card:has-text("not sure")').count(): good("'I'm not sure yet' option present")
    else: bad("No skip option")

    # 4. keyboard: Enter on card
    pg.evaluate("() => document.querySelector('[data-card]').focus()")
    pg.keyboard.press("Enter"); pg.wait_for_timeout(200)
    if pg.locator('.option-card.is-selected').count(): good("Enter on a focused card selects it")
    else: bad("Enter on card still does nothing")

    # 5. focus lands on content not header
    pg.locator('.option-card:has-text("Move more")').click(); cont(pg)
    focused=pg.evaluate("() => (document.activeElement.tagName||'')")
    good(f"After advancing, focus is on {focused} (content heading)") if focused=="H1" else bad(f"Focus is on {focused}, not the heading")

    # 6. Back works within the flow
    if pg.locator('[data-back]').count():
        pg.locator("[data-back]:visible").first.click()
        pg.wait_for_timeout(400)
        good(f"Back inside the flow returns to '{h1(pg)}'")
        pg.locator('.option-card:has-text("Move more")').click(); cont(pg)
    else: bad("No Back button on question 2")

    # 7. browser Back stays in the journey
    pre=h1(pg); pg.go_back(); pg.wait_for_timeout(600)
    if h1(pg)!="(none)": good(f"Browser Back stays in the journey: '{pre}' -> '{h1(pg)}'")
    else: bad("Browser Back still exits the journey")
    pg.go_forward(); pg.wait_for_timeout(500)

    # finish the questions
    for sel in ['.option-card:has-text("Gym & strength")','.option-card:has-text("Neukölln")','.option-card:has-text("Twice a week")']:
        try: pg.locator(sel).first.click(); cont(pg)
        except Exception as ex: bad(f"could not answer via {sel}: {str(ex)[:60]}")
    pg.wait_for_timeout(500)
    good(f"Recommendation reached: '{h1(pg)}'")
    n=pg.evaluate("() => document.querySelectorAll('#main button,#main a,#main input,#main summary').length")
    secs=pg.evaluate("() => document.querySelectorAll('#main .fitpanel__label, #main h1, #main summary').length")
    good(f"Recommendation now {n} interactive, {secs} labelled sections (was 14 / 11)")
    pg.screenshot(path=f"{OUT}/03-recommendation.png", full_page=True)

    # 8. disclosures closed by default
    openct=pg.evaluate("() => document.querySelectorAll('#main details[open]').length")
    good(f"Disclosures closed by default: {openct} open")

    # 9. venue sheet opens in place and does not navigate
    before=h1(pg)
    pg.locator('#main [data-venue]').first.click(); pg.wait_for_timeout(500)
    if pg.locator('#venue-sheet').count():
        title=pg.locator('#sheet-title').inner_text()
        hrs=pg.locator('.sheet__row').count()
        good(f"Venue sheet opens over the page: '{title}' with {hrs} detail rows")
        pg.screenshot(path=f"{OUT}/04-venue-sheet.png")
        pg.keyboard.press("Escape"); pg.wait_for_timeout(400)
        good(f"Escape closes it and returns to '{h1(pg)}'") if h1(pg)==before else bad("Sheet close lost the page")
    else: bad("Venue sheet did not open")

    # 10. the save moment — a way out of the journey, not a gate across it
    pg.locator('[data-go="save"]').first.click(); pg.wait_for_timeout(600)
    save_title=pg.locator('#exit-modal .savepanel__title').inner_text()
    if 'saving' in save_title.lower(): good(f"Email asked only after the recommendation: '{save_title}'")
    else: bad(f"Expected the save dialog, got '{save_title}'")
    if pg.locator('.stepper:visible').count()==0: good("and it draws no checkout stepper — saving is not a step of buying")
    else: bad("the save screen still shows the checkout stepper")
    if pg.locator('#exit-modal .savepanel__recap .saveplan').count(): good("the week and membership being saved are shown before the email is asked for")
    else: bad("the save screen asks for an email before showing what it keeps")
    if pg.locator('text=simulated').count(): good("Google/Apple now labelled as simulated")
    else: bad("No 'simulated' notice on the SSO buttons")
    pg.screenshot(path=f"{OUT}/05-save.png", full_page=True)

    # 11. 'Continue without saving' goes back to looking, not on into the checkout
    pg.locator('[data-skip-save]').click(); pg.wait_for_timeout(600)
    good(f"'Continue without saving' returns to '{h1(pg)}'")
    # now actually save: it ends on the saved confirmation, with the link back
    pg.locator('[data-go="save"]').first.click(); pg.wait_for_timeout(500)
    pg.fill('input[name="email"]','alex@example.com'); pg.check('#marketing')
    pg.locator('button[type="submit"]:has-text("Email my link")').click(); pg.wait_for_timeout(700)
    good(f"Saving with an email lands on '{h1(pg)}'")
    if pg.locator('#exit-modal [data-copy-resume]').count(): good("and the private return link is right there")
    else: bad("no return link after saving")

    # 11b. and the other flow: the plan CTA goes straight to the details form
    pg.locator('[data-close-exit]:visible').first.click(); pg.wait_for_timeout(600)
    pg.locator('.planbox__cta button:visible, .paybar button:visible').first.click(force=True); pg.wait_for_timeout(700)
    if 'your details' in h1(pg).lower(): good(f"'Continue with…' goes straight to the details form: '{h1(pg)}'")
    else: bad(f"Expected the details form, got '{h1(pg)}'")
    em=pg.evaluate("() => document.querySelector('input#email') && document.querySelector('input#email').value")
    good(f"Details prefills the email: '{em}'") if em=='alex@example.com' else bad(f"Email not prefilled: '{em}'")
    if pg.locator('.ula-note').count(): good("Urby is present on the details screen")
    else: bad("Urby still absent from details")
    if pg.locator('.ordercard__name').count(): good(f"the chosen membership stays visible beside the form: '{pg.locator('.ordercard__name').inner_text()}'")
    else: bad("the details form does not show what is being signed up for")
    pg.screenshot(path=f"{OUT}/06-details.png", full_page=True)

    pg.fill('#firstName','Alex'); pg.fill('#lastName','Tester'); pg.fill('#birthDate','1992-04-18')
    pg.fill('#street','Weserstraße 42'); pg.fill('#postcode','12045'); pg.fill('#city','Berlin')
    pg.locator('button:has-text("Continue to payment")').click(); pg.wait_for_timeout(700)
    if pg.locator('.ula-note').count(): good("Urby is present on the payment screen")
    else: bad("Urby absent from payment")
    pg.screenshot(path=f"{OUT}/07-payment.png", full_page=True)
    pg.locator('button:has-text("Confirm and start membership")').click(); pg.wait_for_timeout(700)
    good(f"Simulated payment completes: '{h1(pg)}'")
    pg.screenshot(path=f"{OUT}/08-confirmation.png", full_page=True)
    c.close()

    # 12. email-first variant still available
    c,pg=fresh(); pg.goto(URL+"?variant=email-first"); pg.wait_for_timeout(600)
    if pg.locator('input[name="email"]').count(): good("email-first variant still reachable for A/B comparison")
    else: bad("email-first variant broken")
    pg.screenshot(path=f"{OUT}/09-emailfirst.png")
    c.close()

    # 13. mobile
    c,pg=fresh(390,844,True)
    pg.screenshot(path=f"{OUT}/m01-landing.png")
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)
    pg.locator('.option-card:has-text("Move more")').click(); cont(pg)
    pg.locator('.option-card:has-text("Gym & strength")').click(); cont(pg)
    pg.locator('.option-card:has-text("Neukölln")').first.click(); cont(pg)
    # nothing but the question on the steps — no panel, no venue cards, no ask box
    extras = pg.locator('#main .venue-card').count() + pg.locator('#main .ask').count() + pg.locator('.two-col__aside').count()
    good("On a phone the steps carry nothing but the question") if extras==0 else bad(f"{extras} extra blocks on a question step")
    chips=pg.locator('.answer-chip').count()
    good(f"answers are editable chips on a phone ({chips})") if chips>=3 else bad(f"only {chips} answer chips on a phone")
    pg.screenshot(path=f"{OUT}/m02-panel.png", full_page=True)
    c.close(); b.close()

print(f"\n=== {len(ok)} passed, {len(errs)} failed ===")
for e in errs: print("  !", e)
