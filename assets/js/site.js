(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const mathRoots = document.querySelectorAll("[data-math]");
  if (mathRoots.length) {
    const base = "/assets/vendor/katex/";
    const reveal = () => mathRoots.forEach((el) => el.classList.add("is-typeset"));
    const fallback = setTimeout(reveal, 3000);
    const load = (src) => new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = base + src;
      s.onload = resolve;
      s.onerror = reject;
      document.head.append(s);
    });
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = base + "katex.min.css";
    const cssReady = new Promise((resolve) => { css.onload = css.onerror = resolve; });
    document.head.append(css);
    const typeset = load("katex.min.js")
      .then(() => load("contrib/auto-render.min.js"))
      .then(() => mathRoots.forEach((el) => window.renderMathInElement(el, {
        delimiters: [{ left: "\\[", right: "\\]", display: true }, { left: "\\(", right: "\\)", display: false }],
        throwOnError: false,
      })));
    Promise.all([cssReady, typeset])
      .catch(() => {})
      .finally(() => { clearTimeout(fallback); reveal(); });
  }

  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const revealTargets = document.querySelectorAll(".section__head, .page-figure, .block, .theme, .pub, .steps li, .network__intro, .footer__statement");
  const drawCharts = (root) => {
    root.querySelectorAll(".chart .c-line").forEach((path, i) => {
      path.setAttribute("pathLength", "1");
      path.animate(
        [{ strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDasharray: 1, strokeDashoffset: 0 }],
        { duration: 1400, delay: 200 + i * 60, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "backwards" },
      ).finished.then(() => path.removeAttribute("pathLength"), () => {});
    });
    root.querySelectorAll(".chart .c-dot").forEach((dot) => {
      dot.animate([{ opacity: 0 }, { opacity: getComputedStyle(dot).opacity }], { duration: 500, delay: 1300, fill: "backwards" });
    });
  };
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); drawCharts(e.target); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${(i % 3) * 80}ms`;
      io.observe(el);
    });
  }

  const pubList = document.querySelector(".pubx[data-bib]");
  if (pubList) {
    fetch(pubList.dataset.bib)
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); })
      .then((text) => renderPubs(pubList, parseBib(text)))
      .catch(() => { pubList.hidden = true; pubList.nextElementSibling?.removeAttribute("hidden"); });
  }

  const tocLinks = [...document.querySelectorAll(".toc a[href^='#']")];
  if (tocLinks.length && "IntersectionObserver" in window) {
    const byId = new Map(tocLinks.map((a) => [a.getAttribute("href").slice(1), a]));
    const visible = new Set();
    const tocIo = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? visible.add(e.target.id) : visible.delete(e.target.id);
      const first = [...byId.keys()].find((id) => visible.has(id));
      if (!first) return;
      tocLinks.forEach((a) => a.classList.toggle("is-active", a === byId.get(first)));
    }, { rootMargin: "-130px 0px -55% 0px" });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) tocIo.observe(s); });
  }

  document.querySelectorAll("pre.code").forEach((pre) => {
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "code__copy"; btn.textContent = "Copy";
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(pre.querySelector("code").innerText.trim());
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = "Copy"; }, 1600);
      } catch { /* clipboard unavailable */ }
    });
    pre.appendChild(btn);
  });

  function parseBib(text) {
    const entries = [];
    let i = 0;
    const skipWs = () => { while (i < text.length && /\s/.test(text[i])) i++; };
    const readBraced = () => {
      let depth = 0, start = ++i;
      for (; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") { if (depth === 0) break; depth--; }
      }
      return text.slice(start, i++);
    };
    const readQuoted = () => {
      let depth = 0, start = ++i;
      for (; i < text.length; i++) {
        if (text[i] === "{") depth++;
        else if (text[i] === "}") depth--;
        else if (text[i] === '"' && depth === 0) break;
      }
      return text.slice(start, i++);
    };
    while ((i = text.indexOf("@", i)) !== -1) {
      const type = /^@(\w+)\s*\{/.exec(text.slice(i));
      if (!type) { i++; continue; }
      i += type[0].length;
      const comma = text.indexOf(",", i);
      const entry = { type: type[1].toLowerCase(), key: text.slice(i, comma).trim() };
      i = comma + 1;
      for (;;) {
        skipWs();
        if (text[i] === "}") { i++; break; }
        const name = /^([\w-]+)\s*=\s*/.exec(text.slice(i));
        if (!name) break;
        i += name[0].length;
        let value;
        if (text[i] === "{") value = readBraced();
        else if (text[i] === '"') value = readQuoted();
        else { const bare = /^[\w.-]+/.exec(text.slice(i))[0]; i += bare.length; value = bare; }
        entry[name[1].toLowerCase()] = value.replace(/\s+/g, " ").trim();
        skipWs();
        if (text[i] === ",") i++;
      }
      entries.push(entry);
    }
    return entries;
  }

  function renderPubs(list, entries) {
    const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const clean = (s = "") => s
      .replace(/\\["'`^~=.]\{?(\w)\}?/g, "$1")
      .replace(/\\(o|O|ae|AE|ss|l|L)\b\s?/g, (_, c) => ({ o: "ø", O: "Ø", ae: "æ", AE: "Æ", ss: "ß", l: "ł", L: "Ł" })[c])
      .replace(/[{}]/g, "")
      .replace(/---/g, "—").replace(/--/g, "–");
    const monthOf = (m = "") => {
      const n = parseInt(m, 10);
      return n >= 1 && n <= 12 ? n : MONTHS.indexOf(m.slice(0, 3).toLowerCase()) + 1;
    };
    const rows = entries
      .map((e, order) => ({ e, order, year: parseInt(e.year, 10) || 0, month: monthOf(e.month) }))
      .sort((a, b) => b.year - a.year || b.month - a.month || a.order - b.order);
    list.replaceChildren(...rows.map(({ e, year, month }) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = e.page || e.url || "#";
      if (!e.page) { a.target = "_blank"; a.rel = "noopener"; }
      const time = document.createElement("time");
      time.dateTime = month ? `${year}-${String(month).padStart(2, "0")}` : String(year);
      time.textContent = month ? `${MONTHS[month - 1][0].toUpperCase()}${MONTHS[month - 1].slice(1)} ${year}` : String(year);
      const span = (cls, text) => { const s = document.createElement("span"); s.className = cls; s.textContent = text; return s; };
      a.append(time, span("pubx__cat", clean(e.category)), span("pubx__title", clean(e.title)), span("pubx__venue", clean(e.venue || e.booktitle || e.journal)));
      li.append(a);
      return li;
    }));
  }

  // Hero: a slowly drifting graph of research topics, densest on the right.
  const canvas = document.getElementById("graph");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const LABELS = ["pretraining", "mid-training", "post-training", "scaling laws", "data attribution", "reasoning", "optimization", "evaluation", "efficiency", "coding agents", "harnesses", "tokenization", "multilingual", "interpretability"];
  const SLOTS = [[0.70, 0.07], [0.85, 0.04], [0.77, 0.14], [0.89, 0.20], [0.68, 0.25], [0.83, 0.31], [0.72, 0.37], [0.89, 0.42], [0.79, 0.48], [0.68, 0.54], [0.87, 0.59], [0.73, 0.65], [0.86, 0.71], [0.70, 0.78]];
  let w, h, dpr, nodes = [], pointer = { x: -1e4, y: -1e4 };

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  let blue, ink;
  const readColors = () => { blue = css("--blue"); ink = css("--ink-3"); };
  readColors();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", readColors);

  function build() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const count = Math.round(Math.min(72, (w * h) / 14000));
    const rand = mulberry32(7);
    nodes = Array.from({ length: count }, (_, i) => {
      const bias = Math.pow(rand(), 0.5);
      return {
        x: w * (0.3 + 0.7 * bias),
        y: h * rand(),
        vx: (rand() - 0.5) * 0.14,
        vy: (rand() - 0.5) * 0.14,
        r: 1.2 + rand() * 1.4,
        label: i < LABELS.length ? LABELS[i] : null,
      };
    });
    nodes.forEach((n, i) => {
      if (!n.label) return;
      n.x = w * SLOTS[i][0];
      n.y = h * SLOTS[i][1];
      n.vx *= 0.4; n.vy *= 0.4;
      n.r = 3.2;
    });
  }

  function step() {
    const maxD = Math.min(160, w / 8);
    ctx.clearRect(0, 0, w, h);

    if (!reduceMotion) {
      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy;
        if (n.x < w * (n.label ? 0.66 : 0.25) || n.x > w - (n.label ? 110 : 0)) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
      }
    }

    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d > maxD) continue;
        const near = Math.min(Math.hypot(a.x - pointer.x, a.y - pointer.y), Math.hypot(b.x - pointer.x, b.y - pointer.y)) < 150;
        ctx.strokeStyle = near ? blue : ink;
        ctx.globalAlpha = (1 - d / maxD) * (near ? 0.6 : 0.2);
        ctx.lineWidth = near ? 1 : 0.7;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }

    ctx.font = '400 12px "IBM Plex Sans", system-ui, sans-serif';
    for (const n of nodes) {
      ctx.fillStyle = n.label ? blue : ink;
      ctx.globalAlpha = n.label ? 0.95 : 0.45;
      ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2); ctx.fill();
      if (n.label) {
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = ink;
        ctx.fillText(n.label, n.x + 10, n.y + 4);
      }
    }
    ctx.globalAlpha = 1;

    if (!reduceMotion && running) requestAnimationFrame(step);
    else frameQueued = false;
  }

  let running = true, frameQueued = true;
  const resume = () => {
    if (running && !frameQueued && !reduceMotion) { frameQueued = true; requestAnimationFrame(step); }
  };
  const setRunning = (v) => { running = v && canvas.clientWidth > 0 && !document.hidden; resume(); };
  let heroVisible = true;
  new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; setRunning(heroVisible); }).observe(canvas);
  document.addEventListener("visibilitychange", () => setRunning(heroVisible));

  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const hero = canvas.parentElement;
  hero.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  hero.addEventListener("pointerleave", () => { pointer = { x: -1e4, y: -1e4 }; });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { build(); if (reduceMotion) step(); else setRunning(heroVisible); }, 150);
  });

  build();
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(step);
})();
