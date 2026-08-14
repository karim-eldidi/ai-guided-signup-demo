import os
"""Hard rule: at most one main (filled black) call to action visible per screen."""
from playwright.sync_api import sync_playwright
U=os.environ.get("DEMO_URL", "file:///mnt/user-data/outputs/usc-ula-demo.html")
ok=[];bad=[]
def P(t): ok.append(t); print("PASS",t)
def F(t): bad.append(t); print("FAIL",t)
CTAS = """() => {
  const filled = (el) => {
    const s = getComputedStyle(el), m = s.backgroundColor.match(/[\\d.]+/g);
    if (!m) return false;
    const [r,g,b,a] = [ +m[0], +m[1], +m[2], m[3]===undefined?1:+m[3] ];
    return a > 0.5 && r < 70 && g < 70 && b < 70;
  };
  return [...document.querySelectorAll('button,a,input[type=submit]')].filter(el => {
    if (!el.checkVisibility || !el.checkVisibility({checkVisibilityCSS:true})) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 70 && r.height >= 40 && filled(el);
  }).map(el => (el.innerText||el.value||'').trim().replace(/\\s+/g,' ').slice(0,34));
}"""
with sync_playwright() as p:
    b=p.chromium.launch()
    for label,(w,h),m in [("desktop",(1440,900),False),("phone",(390,844),True)]:
        c=b.new_context(viewport={'width':w,'height':h},is_mobile=m,has_touch=m)
        pg=c.new_page(); pg.on("pageerror", lambda e: F(f"JS ERROR: {e}"))
        def check(name):
            got=pg.evaluate(CTAS)
            (P if len(got)<=1 else F)(f"{label} · {name}: {len(got)} main CTA {got}")
        pg.goto(U); pg.wait_for_timeout(500); check("landing")
        pg.evaluate("window.scrollTo(0, document.body.scrollHeight)"); pg.wait_for_timeout(400); check("landing, scrolled to Ask Urby")
        pg.locator('[data-start-fit]').click(); pg.wait_for_timeout(700); check("question 1")
        pg.locator('.option-card:has-text("Move more")').first.click(); pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(700); check("question 2")
        pg.locator('.option-card:has-text("Gym & strength")').first.click(); pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(700); check("question 3")
        pg.locator('[data-change-city]').click(); pg.wait_for_timeout(300); check("question 3, city picker open")
        pg.locator('.ownwords input').click(); pg.wait_for_timeout(300); check("question 3, own-words focused")
        pg.locator('.option-card:has-text("Neuk")').first.click(); pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(700)
        pg.locator('.option-card:has-text("Twice a week")').first.click(); pg.locator('[data-continue]:visible').first.click(); pg.wait_for_timeout(900); check("recommendation")
        for s_ in pg.locator('summary').all():
            try: s_.click(); pg.wait_for_timeout(150)
            except Exception: pass
        check("recommendation, every disclosure open")
        # "Continue with <plan>" goes straight to the details form — there is no
        # email screen between the recommendation and the checkout any more.
        pg.evaluate("() => { const a = document.querySelector('.two-col__aside'); if (a) a.scrollTop = 0; window.scrollTo(0, document.body.scrollHeight) }"); pg.wait_for_timeout(250); pg.locator('.planbox__cta button:visible, .paybar button:visible').first.click(force=True); pg.wait_for_timeout(600)
        check("details")
        # and the save screen, which is the other way out of the recommendation
        pg.go_back(); pg.wait_for_timeout(600)
        pg.evaluate("() => { const a = document.querySelector('.two-col__aside'); if (a) a.scrollTop = 0; window.scrollTo(0, document.body.scrollHeight) }"); pg.wait_for_timeout(250)
        pg.locator('[data-go="save"]:visible').first.click(force=True); pg.wait_for_timeout(600); check("save")
        pg.locator('[data-skip-save]').click(); pg.wait_for_timeout(600)
        pg.locator('.planbox__cta button:visible, .paybar button:visible').first.click(force=True); pg.wait_for_timeout(600)
        for f,v in [('#firstName','Alex'),('#lastName','T'),('#email','a@b.com'),('#birthDate','1992-04-18'),('#street','W 42'),('#postcode','12045'),('#city','Berlin')]: pg.fill(f,v)
        pg.locator('button:has-text("Continue to payment")').click(); pg.wait_for_timeout(700); check("payment")
        pg.locator('button:has-text("Confirm and start")').click(); pg.wait_for_timeout(900); check("confirmation")
        c.close()
    b.close()
print(f"\n=== {len(ok)} passed, {len(bad)} failed ===")
for x in bad: print("  !",x)
