"""Render 1200x630 share cards into assets/img/og/ from the live pages.

Serve the site first (python3 -m http.server 4173 --bind 127.0.0.1), then:
    pip install playwright && playwright install chromium
    python3 scripts/make_og_cards.py
"""
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:4173"
OUT = Path(__file__).resolve().parent.parent / "assets" / "img" / "og"
PAGES = {"home": "/", "xiangqibench": "/research/xiangqibench/", "repeated-tokens": "/research/repeated-tokens/", "tkeval": "/research/tkeval/", "humaneval-xl": "/research/humaneval-xl/"}

CARD = r"""
(slug) => {
  const isHome = slug === 'home';
  const q = (s) => document.querySelector(s);
  let title, meta, art;
  if (isHome) {
    title = q('.hero__title').innerHTML;
    meta = 'Open research on large language models';
    art = [...document.querySelectorAll('.theme__art svg')].map(s => `<div class="cell">${s.outerHTML}</div>`).join('');
    art = `<div class="grid4">${art}</div>`;
  } else {
    title = q('.page-title').innerHTML;
    meta = q('.page-head .overline').textContent.trim();
    art = `<div class="one">${q('.page-figure svg').outerHTML}</div>`;
  }
  const url = 'floatai.github.io' + (isHome ? '' : '/' + slug);
  document.body.innerHTML = `
  <style>
    html,body{margin:0;background:#fff}
    .card{width:1200px;height:630px;box-sizing:border-box;padding:64px 64px 60px 72px;display:grid;grid-template-columns:minmax(0,1fr) 500px;gap:56px;background:#fff;color:#1d2129}
    .l{display:flex;flex-direction:column;min-width:0}
    .l img{height:38px;width:auto;align-self:flex-start}
    .l .overline{margin-top:auto}
    .l h1{margin:22px 0 0;font-family:var(--serif);font-weight:300;font-size:${isHome ? 70 : 76}px;line-height:1.02;letter-spacing:-.035em;text-wrap:balance}
    .l h1 em{color:#165dff;font-style:italic}
    .l h1 br{display:${isHome ? 'block' : 'none'}}
    .url{margin-top:auto;padding-top:28px;font-family:var(--mono);font-size:18px;color:#646c78}
    .r{background:#f6f7f9;border-radius:24px;display:grid;place-items:center;padding:36px;overflow:hidden}
    .one{width:100%}
    .one svg{width:100%;height:auto;max-height:440px;display:block}
    .grid4{display:grid;grid-template-columns:1fr 1fr;gap:14px;width:100%}
    .cell{background:#fff;border-radius:14px;padding:10px;aspect-ratio:16/10;display:grid;place-items:center}
    .cell svg{width:100%;height:auto}
  </style>
  <div class="card">
    <div class="l">
      <img src="/assets/brand/floatai-lockup.svg" alt="">
      <p class="overline">${meta}</p>
      <h1>${title}</h1>
      <div class="url">${url}</div>
    </div>
    <div class="r">${art}</div>
  </div>`;
}
"""

with sync_playwright() as p:
    b = p.chromium.launch()
    for slug, path in PAGES.items():
        pg = b.new_page(viewport={"width": 1200, "height": 630}, device_scale_factor=1, color_scheme="light")
        pg.goto(BASE + path, wait_until="networkidle")
        pg.evaluate(CARD, slug)
        pg.evaluate("document.fonts.ready.then(() => true)")
        pg.wait_for_timeout(800)
        fam = pg.evaluate("[...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style)")
        assert any("Newsreader" in f and "300" in f for f in fam), (slug, fam)
        pg.locator(".card").screenshot(path=f"{OUT}/{slug}.png")
        print("ok", slug)
        pg.close()
    b.close()
