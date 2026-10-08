# floatai.github.io

Homepage of FloatAI Research. Plain static HTML/CSS/JS, no build step.

```
index.html            page
assets/css/site.css   styles (light + dark via prefers-color-scheme)
assets/js/site.js     hero graph, xiangqi board, live HF download count
assets/brand/         logo files from the FloatAI brand kit
```

## Preview locally

```bash
python3 -m http.server 4173 --bind 127.0.0.1
# open http://127.0.0.1:4173
```

## Deploy to https://floatai.github.io

1. In the `floatai` GitHub org, create a public repository named exactly `floatai.github.io`.
2. Push this directory to its `main` branch:

   ```bash
   git remote add origin git@github.com:floatai/floatai.github.io.git
   git add . && git commit -m "Add FloatAI homepage"
   git push -u origin main
   ```

3. Repository Settings → Pages → Source: "Deploy from a branch", branch `main`, folder `/ (root)`.

The site is live at https://floatai.github.io a minute or two later. `.nojekyll` keeps GitHub Pages from running Jekyll.
