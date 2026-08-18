import os
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".build", "shots")), "shots5"); os.makedirs(OUT, exist_ok=True)
URL=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/ai-guided-signup-demo.html")
ok=[];bad=[]
def P(t): ok.append(t); print("PASS",t)
def F(t): bad.append(t); print("FAIL",t)

with sync_playwright() as p:
    b=p.chromium.launch()
    for label,(w,h),mob in [("desktop 1440x900",(1440,900),False),
                            ("laptop 1280x800",(1280,800),False),
                            ("tablet 900x1000",(900,1000),False),
                            ("phone 390x844",(390,844),True)]:
        c=b.new_context(viewport={"width":w,"height":h}, is_mobile=mob, has_touch=mob)
        pg=c.new_page(); pg.on("pageerror", lambda e: F(f"JS ERROR {label}: {e}"))
        pg.goto(URL); pg.wait_for_timeout(500)

        # The landing collects nothing at all now: no email (rule 61), and the search box
        # went behind a link so the panel could ask the first question itself (rule 66).
        if pg.locator('#main form').count()==0: P(f"{label}: the landing asks for nothing")
        else: F(f"{label}: {pg.locator('#main form').count()} forms are back on the landing")
        # What it offers instead has to be the loudest thing on it: three answers, and
        # the two ways past them plainly quieter. Karim clicked the links first when the
        # links were the only outlined things on the page.
        hero = pg.locator('.landing-hero-card, .options--door .option-card')
        P(f"{label}: the guide entry is clear on the front door") if hero.count()>=1 else F(f"{label}: missing guide entry on the landing")
        shortcuts = pg.locator('.landing-sub-actions .sub-action-btn, .landing__shortcuts .shortcut')
        if shortcuts.count()==2:
            P(f"{label}: two quiet ways past the question")
        else: F(f"{label}: the shortcuts row is wrong")

        # start the journey and count visible Continue buttons
        pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)
        n=pg.locator('[data-continue]:visible').count()
        P(f"{label}: exactly one Continue visible") if n==1 else F(f"{label}: {n} Continue buttons visible")

        # answering in your own words is visible and labelled, not hidden behind a link
        if pg.locator('.ownwords input').is_visible(): P(f"{label}: own-words field is visible")
        else: F(f"{label}: own-words field is hidden")
        lbl=pg.locator('.ownwords__label').inner_text()
        P(f"{label}: own-words is labelled: '{lbl[:44]}'") if 'own words' in lbl else F(f"{label}: unclear label: {lbl[:60]}")
        if pg.locator('[data-toggle-freetext]').count()==0: P(f"{label}: no leftover toggle link")
        else: F(f"{label}: the old toggle link is still there")
        # choices read as visual tiles, two per row
        cols=pg.evaluate("() => getComputedStyle(document.querySelector('.options')).gridTemplateColumns.split(' ').length")
        P(f"{label}: options are a {cols}-column visual grid") if cols==2 else F(f"{label}: options are {cols} columns")

        # does the question fit without scrolling?
        pg.reload(); pg.wait_for_timeout(400)
        pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)
        cta=pg.locator('[data-continue]:visible').first.bounding_box()
        bottom=cta['y']+cta['height']
        if bottom<=h: P(f"{label}: question + CTA fit on screen (CTA bottom {int(bottom)} of {h})")
        else: F(f"{label}: must scroll to reach Continue (CTA bottom {int(bottom)} of {h})")
        pg.screenshot(path=f"{OUT}/q-{w}x{h}.png")
        # 4-option question (area) also fits
        pg.locator('.option-card:has-text("Move more")').first.click()
        pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(700)
        pg.locator('.option-card:has-text("Gym & strength")').first.click()
        pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(700)
        n=pg.locator('[data-continue]:visible').count()
        P(f"{label}: area question still one Continue") if n==1 else F(f"{label}: area question has {n} Continues")
        pg.screenshot(path=f"{OUT}/area-{w}x{h}.png")
        c.close()
    b.close()

# --- nothing may escape its own box ----------------------------------------
# A full-page black circle covered the payment screen. The selected-state tick is
# absolutely positioned over the option icon, and the payment cards kept the tick
# outside the icon, so inset:0 resolved against the page instead of the card. Cheap
# to check, and it catches every future version of the same mistake.
def rogue_elements(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('*')].filter(e => {
        const b = e.getBoundingClientRect();
        return b.width > 0 && (b.width > window.innerWidth * 1.3 || b.height > 4200);
      }).map(e => (e.tagName + '.' + (typeof e.className === 'string' ? e.className : '')).slice(0, 50)
                  + ' ' + Math.round(e.getBoundingClientRect().width) + 'x'
                  + Math.round(e.getBoundingClientRect().height))""")

def ticks_contained(pg):
    return pg.evaluate("""() => [...document.querySelectorAll('.option-card__check')]
        .every(c => c.parentElement && c.parentElement.classList.contains('option-card__icon'))""")

with sync_playwright() as p:
    b = p.chromium.launch()
    for label, (w, h) in [("desktop", (1440, 950)), ("phone", (390, 844))]:
        c = b.new_context(viewport={"width": w, "height": h})
        pg = c.new_page(); pg.on("pageerror", lambda e: F(f"JS ERROR {label}: {e}"))
        pg.goto(URL); pg.wait_for_timeout(400)

        steps = [("landing", None)]
        pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(600)
        for want in ['Move more', 'Gym & strength', 'Mitte', 'Twice a week']:
            pg.locator(f'.option-card:has-text("{want}")').first.click()
            pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(650)
        steps.append(("recommendation", None))
        # the plan's own CTA — on a desktop it is in the plan card, on a phone in the paybar
        pg.locator('.planbox__cta button:visible, .paybar button:visible').first.click(force=True); pg.wait_for_timeout(600)
        steps.append(("details", None))
        for f_, v in [('#firstName', 'Alex'), ('#lastName', 'T'), ('#email', 'a@b.com'),
                      ('#birthDate', '1990-01-01'), ('#street', 'W 42'), ('#postcode', '10117'), ('#city', 'Berlin')]:
            pg.fill(f_, v)
        pg.locator('.details-form__actions button:visible, .paybar button:visible').first.click(force=True); pg.wait_for_timeout(800)

        # the payment screen is the one that broke, so it is the one asserted by name
        rogue = rogue_elements(pg)
        P(f"{label} payment: nothing overflows its own box") if not rogue else F(f"{label} payment: escaped — {rogue[:3]}")
        P(f"{label} payment: every tick sits on its icon") if ticks_contained(pg) else F(f"{label} payment: a tick is outside its icon")
        pg.screenshot(path=f"{OUT}/payment-{w}x{h}.png", full_page=True)

        # and the plans grid, the other screen full of option-shaped things
        pg.goto(URL); pg.wait_for_timeout(400)
        pg.locator('[data-go="plans"]').first.click(); pg.wait_for_timeout(600)
        rogue = rogue_elements(pg)
        P(f"{label} plans: nothing overflows its own box") if not rogue else F(f"{label} plans: escaped — {rogue[:3]}")
        c.close()
    b.close()

print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)

