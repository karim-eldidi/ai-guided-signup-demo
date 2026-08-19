import os, re
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", os.path.join(os.path.dirname(__file__), "..", "..", ".build", "shots")), "shots4"); os.makedirs(OUT, exist_ok=True)
URL=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/ai-guided-signup-demo.html")
ok=[]; bad=[]
def P(t): ok.append(t); print("PASS", t)
def F(t): bad.append(t); print("FAIL", t)

QUESTIONS = [
 ("Can I pause a 12-month membership?", "cannot be paused"),
 ("How often can I go?", "one check-in per day"),
 ("how do i cancel", "72 hours"),
 ("what are plus check-ins", "high-end"),
 ("how much is classic", "64"),
 ("is there a pool near Neukölln", "Stadtbad"),
 ("what's the cheapest plan", "29"),
 ("can I change plan later", "upgrade"),
 ("do i have to commit for a year", "no minimum term"),
 ("what is the weather in paris", "don't have a reliable answer"),
]

with sync_playwright() as p:
    b=p.chromium.launch(); c=b.new_context(viewport={"width":1440,"height":950}); pg=c.new_page()
    pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
    pg.goto(URL); pg.wait_for_timeout(600)

    # the landing states what you get, once, instead of four ways of saying it
    # The landing was cut back to two buttons and one sentence: a bullet list of
    # "what you get" plus a "no email needed" line said the same thing three times.
    if pg.locator('.getlist').count()==0: P("Landing does not repeat what you get in a bullet list")
    else: F("the 'what you get' list is back on the landing")
    # The toll gate is gone entirely, not softened: no email field on the front door at
    # all. Four reviews called it a toll however loudly the field said "optional", and the
    # address only ever fed the resume link, so the save screen asks for it (rule 61).
    if pg.locator('#main input[type="email"]').count()==0: P("no email field on the landing page")
    else: F("the landing page still asks for an email")
    if pg.locator('#main .consent-row').count()==0: P("and no consent box with no address to attach it to")
    else: F("a marketing consent box is back on the landing page")
    # What took its place is the guide's own first question, with the search one tap
    # behind it (rules 62 and 66) — the landing itself now collects nothing at all.
    if pg.locator('#main form').count()==0: P("the landing asks for nothing")
    else: F("a form is back on the landing page")
    if pg.locator('.landing__shortcuts [data-go="search"]').count()==1: P("and the search is one tap behind the question")
    else: F("no way from the landing to the venue search")
    if pg.locator('[data-start-fit]').count()==1: P("one way into the four questions, not two")
    else: F(f"{pg.locator('[data-start-fit]').count()} controls start the four questions, expected 1")
    pg.screenshot(path=f"{OUT}/01-landing.png")

    # the landing now stops at Ask Urby — no pricing grid below the fold
    txt=pg.locator('.ula-section').inner_text()
    # "Ask Urby anything" over-promised: Urby has a narrow domain and her own subtitle
    # said so in the next breath. The heading now names the domain it can serve.
    if "A specific membership question?" in txt: P("Landing ends at Ask Urby, without over-promising")
    else: F("Ask Urby block missing from the landing page")
    if not any(n in txt for n in ["35 €","75 €","115 €","165 €"]):
        P("No pricing list on the landing page (deliberate)")
    else: F("A pricing list is back on the landing page")
    # Searching a real venue by name has to end where a venue directory cannot: the
    # membership that opens it (rule 63). "I couldn't find a way to look up my local
    # yoga studio" was the first thing the fourth reviewer said.
    pg.locator('.landing__shortcuts [data-go="search"]').click(); pg.wait_for_timeout(500)

    # ---- the venue page, before anything has been typed (rule 74) ----------------
    # It used to be a search box and nothing else: arrive with nothing to type and there
    # was nothing to look at. Now the page browses, and every control on it is one of
    # Urby's four questions in another form.
    cards = pg.locator('.placesrow .hit')
    if cards.count()==4: P("the venue page shows real places before anything is typed")
    else: F(f"the venue page browses {cards.count()} places, expected 4")
    badges = [pg.locator('.hit__badge').nth(i).inner_text() for i in range(pg.locator('.hit__badge').count())]
    plans = {"Essential","Classic","Premium","Max"}
    if len(badges)==4 and all(x in plans for x in badges):
        P(f"every card names the cheapest membership that opens it: {', '.join(badges)}")
    else: F(f"a browsed card does not name a membership: {badges}")
    # The pilot holds no popularity data, so the heading counts instead of flattering.
    head = pg.locator('.placesrow__title h2').inner_text()
    if 'Popular' not in head and 'Places near' in head: P(f"the row heading claims only what it counted: '{head}'")
    else: F(f"the row heading claims popularity the pilot cannot source: '{head}'")
    # The location is a guess until they say otherwise, and it says so (rules 26 and 53).
    where = pg.locator('.findbar__wheretext').inner_text()
    if 'Looks like' in where: P(f"the assumed location is labelled as one: '{where}'")
    else: F(f"the venue page states the location as fact: '{where}'")
    pg.screenshot(path=f"{OUT}/venue-page.png", full_page=True)
    # A category chip is not a menu item: it answers the activities question, which is why
    # the heading can then count what it counted (rules 66 and 54).
    pg.locator('.catchip:has-text("Swimming")').click(); pg.wait_for_timeout(400)
    head = pg.locator('.placesrow__title h2').inner_text()
    if 'for swimming' in head: P(f"a category chip filters and counts: '{head}'")
    else: F(f"a category chip did not change the row: '{head}'")
    if pg.locator('.routine__fit .answer-chip').count()==1:
        P("and it shows up as an answer chip, editable (rule 15)")
    else: F("choosing a category did not record an answer")
    # Picking a location answers the area question, so Urby must not ask it again (rule 11).
    pg.locator('[data-toggle-where]').click(); pg.wait_for_timeout(300)
    pg.locator('.wherepick [data-where="kreuzberg"]').click(); pg.wait_for_timeout(400)
    if 'Showing places near Kreuzberg' in pg.locator('.findbar__wheretext').inner_text():
        P("picking a location states it as theirs, not as a guess")
    else: F("the location line still hedges after they picked one")
    if pg.locator('.routine__fit .answer-chip').count()==2: P("and it is recorded as the area answer")
    else: F("the picked location was not recorded as an answer")
    # How far we looked is a control, in km (rules 50 and 56).
    counted = lambda: int((re.match(r'(\d+)', pg.locator('.placesrow__title h2').inner_text()) or ['0','0'])[1])
    near = counted()
    labels = pg.locator('select[data-radius-pick] option').all_inner_texts()
    pg.select_option('select[data-radius-pick]', 'any'); pg.wait_for_timeout(400)
    wide = counted()
    if all(('km' in x) or ('Berlin' in x) for x in labels) and pg.eval_on_selector('select[data-radius-pick]','s=>s.value')=='any':
        P(f"how far we looked is a control, measured in km: {labels}")
    else: F(f"the distance control does not state a distance: {labels}")
    if wide > near: P(f"widening it reaches further ({near} within 3 km, {wide} across Berlin)")
    else: F(f"widening the radius did not reach further ({near} -> {wide})")
    # The panel at the foot asks the one thing browsing cannot tell us, and answering it
    # stays on the page rather than dropping the visitor into the four questions.
    q = pg.locator('.routine__q').inner_text()
    if 'often' in q: P(f"the foot panel asks what the row cannot answer: '{q}'")
    else: F(f"the foot panel asks something the page already knows: '{q}'")
    pg.locator('.routine__opts .pill:has-text("Twice a week")').click(); pg.wait_for_timeout(400)
    if pg.locator('.placesrow').count()==1 and pg.locator('.routine__fit .answer-chip').count()==3:
        P("answering it stays on the venue page")
    else: F("answering the foot panel left the venue page")
    # A search and a browse are two answers to one question, never both on screen (rule 8).
    pg.fill('form[data-form="search"] input[name="q"]', 'bouldering')
    pg.locator('form[data-form="search"] button[type="submit"]').click(); pg.wait_for_timeout(600)
    if pg.locator('.placesrow').count()==0 and pg.locator('.hit').count():
        P("a search replaces the browsed row instead of sitting above it")
    else: F("the browsed row and a search result are both on screen")

    pg.fill('form[data-form="search"] input[name="q"]', 'LIQUIDROM')
    pg.locator('form[data-form="search"] button[type="submit"]').click(); pg.wait_for_timeout(700)
    hits = pg.locator('.hit')
    if hits.count() == 1 and 'LIQUIDROM' in hits.first.inner_text():
        P("a named venue is found by name")
    else: F(f"searching a real venue name returned {hits.count()} rows")
    if hits.count() and 'Included from' in hits.first.inner_text():
        P(f"and the row says which membership opens it: '{hits.first.inner_text().split('Included from')[-1].strip()[:28]}'")
    else: F("the search result never names a membership")
    if 'Find my fit' in pg.locator('.searchnext').inner_text(): P("a search leads on to the four questions")
    else: F("no way from a search into the guide")
    # An activity query must not be hijacked by a district name. Half the venues in
    # Berlin carry one, so "swimming in Kreuzberg" first answered with a bouldering hall
    # and a HYROX gym — both genuinely called Kreuzberg, neither of them a pool.
    pg.fill('form[data-form="search"] input[name="q"]', 'swimming in Kreuzberg')
    pg.locator('form[data-form="search"] button[type="submit"]').click(); pg.wait_for_timeout(600)
    head = pg.locator('#main h1').inner_text()
    names = ' | '.join(pg.locator('.hit__name').nth(i).inner_text() for i in range(pg.locator('.hit__name').count()))
    if 'for swimming near Kreuzberg' in head: P(f"an activity near a district is read as an activity: '{head}'")
    else: F(f"the district name hijacked the activity search: '{head}'")
    if 'BOULDERKLUB' not in names and 'HYROX' not in names: P("and it returns only places that do it")
    else: F(f"a non-swimming venue came back for a swimming search: {names}")

    # a miss is honest about the sample rather than about Urban Sports Club
    # deliberately nothing: no venue name starts with either word, and neither is an
    # activity ("studio" would have matched Flow Motion Studio, quite correctly)
    pg.fill('form[data-form="search"] input[name="q"]', 'qwertz plutonium')
    pg.locator('form[data-form="search"] button[type="submit"]').click(); pg.wait_for_timeout(600)
    if pg.locator('.hit').count()==0 and 'does not mean a miss' in pg.locator('#main').inner_text():
        P("a miss says the pilot's sample is smaller than the network")
    else: F("a search miss is not honest about the pilot's venue sample")
    if pg.locator('form[data-form="place-demand"]').count(): P("and it collects the place we do not have (rule 12)")
    else: F("a miss does not record demand")
    # and the four questions still start with nothing given at all
    pg.goto(URL); pg.wait_for_timeout(400)
    pg.locator('[data-start-fit]').first.click(); pg.wait_for_timeout(800)
    if pg.locator('.h-question').count() and 'Saved' not in pg.locator('.topbar').inner_text():
        P("Find my fit works with no email, and does not claim anything was saved")
    else: F("Find my fit did not start the journey cleanly")
    pg.goto(URL); pg.wait_for_timeout(400)

    # ask ula on the landing page
    pg.evaluate("() => document.querySelector('.ask').scrollIntoView()"); pg.wait_for_timeout(500)
    pg.screenshot(path=f"{OUT}/02-ula-section.png", full_page=False)
    if pg.locator('.ask').count(): P("Ask Urby box present on the landing page")
    else: F("No Ask Urby box")

    for q, expect in QUESTIONS:
        pg.fill('.ask__row input', q)
        pg.locator('.ask form button[type="submit"]').first.click()
        pg.wait_for_timeout(450)
        ans = pg.locator('.ask__answer').inner_text() if pg.locator('.ask__answer').count() else "(no answer)"
        if expect.lower() in ans.lower(): P(f'"{q}" -> correct ({expect})')
        else: F(f'"{q}" -> expected "{expect}", got: {ans[:110]}')
        pg.locator('[data-ask-clear]').click(); pg.wait_for_timeout(200)

    # source attribution
    pg.fill('.ask__row input', "how do i cancel"); pg.locator('.ask form button[type="submit"]').first.click(); pg.wait_for_timeout(500)
    src = pg.locator('.ask__source').inner_text()
    if "help centre" in src: P(f"Answers cite a source: '{src[:70]}'")
    else: F(f"No source shown: {src[:70]}")
    if pg.locator('.ask__source a').count(): P("Source links to the original article")
    else: F("No link to the source article")
    pg.screenshot(path=f"{OUT}/03-ask-answer.png")

    # venue answer renders cards
    pg.locator('[data-ask-clear]').click(); pg.wait_for_timeout(200)
    pg.fill('.ask__row input', "is there a pool near Neukölln"); pg.locator('.ask form button[type="submit"]').first.click(); pg.wait_for_timeout(500)
    if pg.locator('.ask__answer .venue-card').count()>=1: P(f"Venue question returns {pg.locator('.ask__answer .venue-card').count()} tappable venue cards")
    else: F("Venue question returned no cards")
    pg.screenshot(path=f"{OUT}/04-ask-venues.png")

    # journey still works, with real plan names/prices
    pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(800)
    for sel in ['Move more','Gym & strength','Neukölln','Twice a week']:
        pg.locator(f'.option-card:has-text("{sel}")').first.click()
        pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(750)
    head=pg.locator('#main h1').first.inner_text()
    # the price moved into the plan column when the page was rebuilt around value
    # the term moved onto the reassurance line under the CTA when the card was rebuilt
    price=pg.locator('.planbox__price').first.inner_text() + ' · ' + pg.locator('.planbox__fine').first.inner_text()
    plan=pg.locator('.planbox__name').first.inner_text()
    P(f"Recommendation: '{plan}' at {price.strip()} (page leads with '{head}')")
    if "Classic" in plan and "75" in price: P("Monthly (no minimum term) price is the default: 75 €")
    elif "Classic" in plan: F(f"Classic recommended but price reads {price.strip()}")
    else: F(f"Unexpected recommendation: {plan}")
    if head.lower().startswith('your plan'): P("the page opens with what you could do, not with a price")
    else: F(f"the page still opens with a pitch: {head}")
    # Folded here, not gone: one of the three sections behind "Questions and details",
    # named on its own handle so nobody has to guess what is in the drawer.
    if pg.locator('[data-toggle-more]').count() and not pg.locator('.rowcard--more[open]').count():
        pg.locator('[data-toggle-more]').first.click(); pg.wait_for_timeout(400)
    if pg.locator('[data-more="ask"]').count():
        pg.locator('[data-more="ask"]').first.click(); pg.wait_for_timeout(400)
        if pg.locator('.rowcard--more .ask__row input').is_visible():
            P("Ask Urby is one line on the recommendation, and it opens")
        else: F("Ask Urby folds open but the field never appears")
    else: F("no way to ask Urby from the recommendation")
    pg.screenshot(path=f"{OUT}/05-recommendation.png", full_page=True)

    # Monthly / 12 / 24 months now sits next to the headline price it changes,
    # instead of inside the small print where the PM session could not find it.
    opts=pg.locator('.termpick__opt').count()
    P(f"Commitment options beside the price: {opts} (monthly / 12 / 24 months)") if opts==3 else F(f"Expected 3 commitments in the plan column, got {opts}")
    # Rule 64 as amended: the plans live inside the plan card, one tap away, each counting
    # what it opens near this visitor — and the full grid is still one link further on.
    # The count is no longer fixed at four. Max is contextual now: it joins the card only
    # when the visitor's own week would run past the Plus check-ins their plan includes.
    # This journey (gym / Neukölln / twice a week) is recommended Classic, which publishes
    # no Plus allowance, so three rows is correct and four would be the bug.
    if pg.locator('.allplans:not([open]) summary').count():
        pg.locator('.allplans:not([open]) summary').first.click(); pg.wait_for_timeout(350)
    rows = pg.locator('.allplans__row')
    shown = pg.locator('.allplans__row:visible').count()
    names = [' '.join(rows.nth(i).locator('.allplans__name').inner_text().split()) for i in range(rows.count())]
    if rows.count() and shown==rows.count(): P(f"every plan on the card is visible: {', '.join(names)}")
    else: F(f"{shown} of {rows.count()} plans are visible on the card")
    if all(any(n.startswith(p) for n in names) for p in ['Essential','Classic','Premium']):
        P("the three primary plans are always one tap from the recommendation")
    else: F(f"a primary plan is missing from the plan column: {names}")
    if pg.locator('.allplans [data-go="plans"]').count(): P("and one quiet way out to the full grid")
    else: F("no link to the full plan grid from the plan column")
    if pg.locator('.allplans__row.is-current .allplans__tag').count(): P("the plan on screen is labelled in the table")
    else: F("the table does not mark the plan currently on screen")
    pg.screenshot(path=f"{OUT}/06-commitments.png")

    # payment terms tell the truth about pausing an annual plan
    pg.locator('.termpick__opt[data-commit="annual"]').click(); pg.wait_for_timeout(500)
    pg.evaluate("() => { const a = document.querySelector('.two-col__aside'); if (a) a.scrollTop = 0; window.scrollTo(0, document.body.scrollHeight) }"); pg.wait_for_timeout(250); pg.locator('.planbox__cta button:visible, .paybar button:visible').first.click(force=True); pg.wait_for_timeout(500)
    if pg.locator('[data-skip-save]:visible').count(): pg.locator('[data-skip-save]:visible').click(); pg.wait_for_timeout(500)
    elif pg.locator('[data-close-exit]:visible').count(): pg.locator('[data-close-exit]:visible').first.click(); pg.wait_for_timeout(500)
    pg.fill('#firstName','Alex'); pg.fill('#lastName','Tester'); pg.fill('#email','a@b.com'); pg.fill('#birthDate','1992-04-18')
    pg.fill('#street','Weserstr 42'); pg.fill('#postcode','12045'); pg.fill('#city','Berlin')
    pg.locator('button:has-text("Continue to payment")').click(); pg.wait_for_timeout(700)
    terms=pg.locator('.disclosure').inner_text()
    if "cannot be paused" in terms: P("Payment terms correctly say a 12-month membership cannot be paused")
    else: F(f"Pause terms still wrong: {terms[:140]}")
    if "72 hours" in terms: P("Cancellation notice is the real 72 hours")
    else: F("Cancellation notice not corrected")
    pg.screenshot(path=f"{OUT}/07-payment-terms.png", full_page=True)
    c.close(); b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !", x)
