import os
"""A tester's three findings:
  1. 'Ask Urby anything' and 'Your fit' were a distraction in the first few steps
  2. she couldn't find her earlier choices to change them
  3. too much information along the way, and too much to process at the end
Each one gets an assertion here so it cannot quietly come back."""
import os, re
from playwright.sync_api import sync_playwright
OUT=os.path.join(os.environ.get("SHOT_DIR", "/home/claude"), "shots15"); os.makedirs(OUT, exist_ok=True)
U=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/usc-ula-demo.html")
ok=[];bad=[]
def P(t): ok.append(t); print("PASS",t)
def F(t): bad.append(t); print("FAIL",t)

def answer(pg, label):
    pg.locator(f'.option-card:has-text("{label}")').first.click()
    pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(850)

with sync_playwright() as p:
    b=p.chromium.launch()
    for label,(w,h),m in [("desktop",(1440,900),False),("phone",(390,844),True)]:
        c=b.new_context(viewport={'width':w,'height':h},is_mobile=m,has_touch=m); pg=c.new_page()
        pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
        pg.goto(U); pg.wait_for_timeout(500)
        pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700)

        # 1. the first question owns the screen
        if pg.locator('.two-col__aside').count()==0: P(f"{label} Q1: no side panel competing with the question")
        else: F(f"{label} Q1: a side panel is back")
        if pg.locator('#main .ask').count()==0: P(f"{label} Q1: Ask Urby is not an open box")
        else: F(f"{label} Q1: the Ask box is open on the first question")
        if pg.locator('[data-open-ask]').count()==0: P(f"{label} Q1: no Ask entry point competing with the question either")
        else: F(f"{label} Q1: the Ask link is back on the question")
        if pg.locator('.answer-chip').count()==0: P(f"{label} Q1: no answer chips before there are answers")
        else: F(f"{label} Q1: chips shown with nothing answered")
        blocks=pg.evaluate("() => document.querySelectorAll('#main > *').length")
        P(f"{label} Q1: {blocks} blocks on screen") if blocks<=6 else F(f"{label} Q1: {blocks} blocks is still busy")
        pg.screenshot(path=f"{OUT}/{label}-q1.png")

        blocks_now = pg.evaluate("() => document.querySelectorAll('#main > *').length")
        P(f"{label} Q1: {blocks_now} blocks — question, progress, form") if blocks_now<=4 else F(f"{label} Q1: {blocks_now} blocks")

        # 2. answers are visible and editable from the next question on
        answer(pg,'Unwind')
        chips=pg.locator('.answer-chip')
        if chips.count()==1 and 'Unwind' in chips.first.inner_text(): P(f"{label} Q2: the answer you gave is on screen as a chip")
        else: F(f"{label} Q2: {chips.count()} chips, expected 1 saying Unwind")
        chips.first.click(); pg.wait_for_timeout(800)
        if 'love to do more of' in pg.locator('#main h1').first.inner_text(): P(f"{label}: tapping a chip goes back to that question")
        else: F(f"{label}: the chip did not reopen the question: {pg.locator('#main h1').first.inner_text()}")
        # and the previous choice is still selected, so changing is a change not a restart
        if pg.locator('.option-card.is-selected').count()==1: P(f"{label}: the old choice is still selected when you go back")
        else: F(f"{label}: went back to an empty question")
        pg.locator('.option-card:has-text("Move more")').first.click()
        pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(900)
        if 'Move more' in pg.locator('.answer-chip').first.inner_text(): P(f"{label}: the change stuck")
        else: F(f"{label}: the change was lost")

        answer(pg,'Sauna & spa'); answer(pg,'Kreuzberg')
        n=pg.locator('.answer-chip').count()
        P(f"{label} Q4: all {n} answers so far are editable") if n==3 else F(f"{label} Q4: {n} chips, expected 3")
        pg.screenshot(path=f"{OUT}/{label}-q4.png")
        answer(pg,'Twice a week')

        # 3. the end screen is processable
        chips=pg.locator('.answer-chip').count()
        P(f"{label} end: answers are editable here too ({chips})") if chips==4 else F(f"{label} end: {chips} chips")
        open_details=pg.evaluate("() => document.querySelectorAll('#main details[open]').length")
        P(f"{label} end: {open_details} section open by default") if open_details<=1 else F(f"{label} end: {open_details} sections open at once")
        disc=pg.locator('#main details.disclosure').count()
        P(f"{label} end: {disc} disclosures, not five") if disc<=2 else F(f"{label} end: {disc} disclosures")
        # The places are a scrollable rail now, so more of them is the point rather than
        # the problem: Karim asked for more than four, and to be able to scroll. What
        # still matters is how many are in view at a time.
        cards=pg.locator('.venue-grid--big .venue-card').count()
        P(f"{label} end: {cards} places in the rail") if cards>=4 else F(f"{label} end: only {cards} places offered")
        vis=pg.evaluate("() => { const r=document.querySelector('.is-rail'); if(!r) return null;"
                        " const p=r.getBoundingClientRect();"
                        " return [...r.querySelectorAll('.venue-card')].filter(c=>{const b=c.getBoundingClientRect();"
                        " return b.left >= p.left-2 && b.right <= p.right+2}).length }")
        limit = 2 if label=='phone' else 4
        P(f"{label} end: {vis} places in view at a time") if vis and vis<=limit else F(f"{label} end: {vis} places in view")
        js = "() => [...document.querySelectorAll('.cov__row')].filter(el => el.checkVisibility({checkVisibilityCSS:true})).length"
        rows_shown = pg.evaluate(js)
        if rows_shown==0: P(f"{label} end: the activity-by-activity detail starts collapsed")
        else: F(f"{label} end: {rows_shown} coverage rows open by default")
        # on the recommendation Ask Urby IS open — but it must sit after the reasons,
        # not compete with them
        ask_y=pg.evaluate("() => { const a=document.querySelector('.rowcard--more'); return a?a.getBoundingClientRect().top+window.scrollY:null }")
        # The reasons live in the plan column now, so what this checks is that Ask Urby is
        # the last thing in the story column rather than competing with the week.
        week_y=pg.evaluate("() => { const w=document.querySelector('.weekcard'); return w?w.getBoundingClientRect().top+window.scrollY:null }")
        if ask_y and week_y and week_y < ask_y: P(f"{label} end: Ask Urby is open, and sits after the week")
        else: F(f"{label} end: Ask Urby is not last in the story column ({week_y} vs {ask_y})")
        # no duplicated answers list
        if pg.locator('.fitpanel__facts').count()==0: P(f"{label} end: the answers are not listed twice")
        else: F(f"{label} end: answers appear both as chips and as a panel")
        height=pg.evaluate("() => document.body.scrollHeight")
        limit = 2800 if label=="desktop" else 4400
        P(f"{label} end: page is {height}px, under {limit}") if height<limit else F(f"{label} end: page is {height}px")
        pg.screenshot(path=f"{OUT}/{label}-end.png", full_page=True)
        c.close()
    b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)
