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
index.html              the homepage
<project>/index.html    one page per project, e.g. xiangqibench/, tkeval/
assets/css/site.css     styles; light and dark themes follow prefers-color-scheme
assets/js/site.js       hero graph, xiangqi board, copy buttons, scroll reveal
assets/brand/           logo files from the FloatAI brand kit
favicon.ico, *.png      favicons and touch icon
.nojekyll               serve files as-is, without Jekyll
```

## Preview locally

```bash
git clone https://github.com/floatai/floatai.github.io.git
cd floatai.github.io
python3 -m http.server 4173 --bind 127.0.0.1
```

Then open http://127.0.0.1:4173.

## Updating content

The homepage gives one card per project under Research and one entry per paper under Publications. Each project has its own page at `floatai.github.io/<project>/` with the overview, findings, setup, code and citation.

To add a project:

1. Copy an existing project folder, for example `repeated-tokens/`, to a new lowercase slug and rewrite its `index.html`.
2. In `index.html`, add an `<article class="theme">` to `.themes` linking to `/<slug>/`, with an inline SVG illustration.
3. Add an `<li class="pub">` at the top of `.pubs`, with authors, venue and a Project link.
4. Update the "More research" links at the bottom of the other project pages.

Keep entries newest first. Copy follows the existing style: state what a study measures and what it found, and use numbers from the paper rather than adjectives.

## Deployment

GitHub Pages serves the `main` branch from the repository root. A push to `main` is live at https://floatai.github.io within a minute or two.

Paths under `floatai.github.io/<name>/` are shared with project repositories in the `floatai` organization: if a repository such as `floatai/xiangqibench` turns on its own GitHub Pages, it takes over `floatai.github.io/xiangqibench/`. Keep project pages in this repository and leave Pages off in project repositories.

## Brand

The mark is an integral sign on an Arco blue (`#165DFF`) tile; the wordmark is IBM Plex Sans SemiBold. Use the files in `assets/brand/` as they are: do not recolour, redraw or re-set the wordmark in another font, and keep clear space of at least half the tile height around the lockup.

## License

Site content and brand assets © FloatAI. Each research repository is released under its own license; see the repository for details.
