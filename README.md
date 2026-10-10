<p align="center">
  <a href="https://floatai.github.io">
    <img src="assets/brand/floatai-lockup.svg" alt="FloatAI" height="56" />
  </a>
</p>

<p align="center">
  Source of <a href="https://floatai.github.io"><b>floatai.github.io</b></a>, the homepage of FloatAI,
  an open research network for large language models.
</p>

<p align="center">
  <a href="https://floatai.github.io">Website</a> ·
  <a href="https://github.com/floatai">GitHub</a> ·
  <a href="https://huggingface.co/floatai">Hugging Face</a> ·
  <a href="https://github.com/orgs/floatai/discussions">Discussions</a>
</p>

---

The site is plain HTML, CSS and JavaScript. There is no build step and no dependency to install.

## Layout

```
index.html                 the homepage
publications.bib           every paper; the homepage Publications list is rendered from it
research/<project>/        one page per project: index.html, page.js and data/
  repeated-tokens/         multi-epoch scaling, with the calculator
  xiangqibench/            boards, leaderboard, per-position heatmap and replays
  tkeval/                  tokenization probes and typo examples
  humaneval-xl/            prompt viewer and pass@1 leaderboard
slides/                    the research talk on reveal.js: index.html, slides.css (theme) and slides.js
<project>/index.html       redirects from the old top-level URLs to research/<project>/
404.html                   not-found page
assets/css/site.css        styles; light and dark themes follow prefers-color-scheme
assets/js/site.js          hero graph, copy buttons, scroll reveal, publication list, math
assets/vendor/katex/       KaTeX 0.16.22 (MIT), loaded only on pages with math
assets/vendor/reveal/      reveal.js 6.0.2 (MIT): core and the speaker-notes plugin
assets/brand/              logo files from the FloatAI brand kit
assets/img/og/             1200×630 share cards, one per page
scripts/make_og_cards.py   renders the share cards (optional, needs Playwright)
sitemap.xml, robots.txt    for search engines
favicon.ico, *.png         favicons and touch icon
.nojekyll                  serve files as-is, without Jekyll
```

## Preview locally

```bash
git clone https://github.com/floatai/floatai.github.io.git
cd floatai.github.io
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open http://127.0.0.1:4173.

## Updating content

The homepage gives one card per project under Research and one row per paper under Publications. Each project has its own page at `floatai.github.io/research/<project>/` with the overview, findings, setup, code and citation.

### Add a paper

Add a BibTeX entry to `publications.bib`. Besides the standard fields, the homepage reads three extra ones, which BibTeX ignores:

| Field | Shown as | Example |
| --- | --- | --- |
| `category` | topic label | `Multilingual` |
| `venue` | short venue | `EMNLP 2024` |
| `page` | optional project page on this site; the row links there instead of `url` | `/research/tkeval/` |

Rows are sorted by `year` and `month`, newest first; entries from the same month keep their order in the file. Rows with a `page` show a blue → arrow, the rest link to `url` with a grey ↗.

### Add a project

1. Copy an existing folder, for example `research/repeated-tokens/`, to `research/<slug>/` with a lowercase slug, and rewrite its `index.html`.
2. In `index.html`, add an `<article class="theme">` to `.themes` linking to `/research/<slug>/`, with an inline SVG illustration.
3. Set `page = {/research/<slug>/}` on the paper's entry in `publications.bib`.
4. Update the previous and next links in the `.pager` of the neighbouring project pages, the list in `404.html`, and `sitemap.xml`.
5. Add the page to `PAGES` in `scripts/make_og_cards.py`, run it to render `assets/img/og/<slug>.png`, and point the page's `og:image` to it.

After changing `assets/css/site.css`, `assets/js/site.js` or a `page.js`, bump the `?v=` suffix on the asset links in every `.html` file so browsers fetch the new version.

### Edit the talk

`slides/index.html` is a [reveal.js](https://revealjs.com) deck. Each slide is a `<section id="…">` wrapping one `<div class="slide">` on a 1600 × 1000 canvas; the `id` becomes the URL, such as `/slides/#/tkeval`. Use `slide--cover` or `slide--center` for centred slides, `data-section` for the footer label, and `<aside class="notes">` for speaker notes. Elements with `rise` animate in when the slide opens; add `class="fragment fade-up"` to reveal an element on the next key press, and put `data-auto-animate` on two adjacent sections, with matching `data-id` attributes, to morph an element between them. Keys: arrows or Space to move, S for the speaker view (notes, timer, next slide), O for the overview, F for fullscreen, L for a laser pointer, ? for help. Open `/slides/?print-pdf` and print to save a PDF. The publication slide is a static copy of `publications.bib`, so update it when you add a paper.

### Write math

Put `data-math` on any element and write LaTeX inside it: `\( … \)` for inline math, `\[ … \]` for display math, and `\tag{3}` for an equation number. `site.js` loads KaTeX from `assets/vendor/katex/` only when a page has a `data-math` element, so pages without math don't download it. Example:

```html
<p data-math>The excess loss grows as \(\Delta L \propto z^{1.07}\).</p>
<div data-math>\[ R_c \approx 2.7 \left(\frac{D}{N}\right)^{0.24} \tag{4} \]</div>
```

Copy follows the existing style: state what a study measures and what it found, and use numbers from the paper rather than adjectives.

## Deployment

GitHub Pages serves the `main` branch from the repository root. A push to `main` is live at https://floatai.github.io within a minute or two.

Paths under `floatai.github.io/<name>/` are shared with project repositories in the `floatai` organization: if a repository such as `floatai/xiangqibench` turns on its own GitHub Pages, it takes over `floatai.github.io/xiangqibench/`. Project pages live under `research/` so they do not collide, but the old top-level redirects can still be taken over. Leave Pages off in project repositories, and do not name a repository `research`.

The old project URLs, such as `floatai.github.io/xiangqibench/`, still work: each top-level `<project>/index.html` forwards to `research/<project>/`, keeping any `#anchor`. Keep these files so links in papers and posts do not break.

## Brand

The mark is an integral sign on an Arco blue (`#165DFF`) tile; the wordmark is IBM Plex Sans SemiBold. Use the files in `assets/brand/` as they are: do not recolour, redraw or re-set the wordmark in another font, and keep clear space of at least half the tile height around the lockup.

## License

Site content and brand assets © FloatAI. Each research repository is released under its own license; see the repository for details.
