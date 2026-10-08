(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const SVG = "http://www.w3.org/2000/svg";

  document.getElementById("year").textContent = new Date().getFullYear();

  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const revealTargets = document.querySelectorAll(".section__head, .feature__art, .feature__text, .findings > div, .theme, .pub, .repo, .steps li, .network__intro, .footer__statement");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      }
    }, { rootMargin: "0px 0px -8% 0px" });
    revealTargets.forEach((el, i) => {
      el.classList.add("reveal");
      el.style.transitionDelay = `${(i % 3) * 80}ms`;
      io.observe(el);
    });
  }

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    const hint = btn.querySelector(".copy__hint");
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add("is-copied"); hint.textContent = "Copied";
        setTimeout(() => { btn.classList.remove("is-copied"); hint.textContent = "Copy"; }, 1600);
      } catch { /* clipboard unavailable */ }
    });
  });

  const downloadsEl = document.querySelector("[data-hf-downloads]");
  Promise.all(["HumanEval-XL", "TKEval"].map((d) =>
    fetch(`https://huggingface.co/api/datasets/floatai/${d}?expand[]=downloadsAllTime`)
      .then((r) => (r.ok ? r.json() : {}))
      .then((j) => j.downloadsAllTime || 0)
      .catch(() => 0)
  )).then((counts) => {
    const total = counts.reduce((a, b) => a + b, 0);
    if (total >= 1000) downloadsEl.textContent = `${Math.floor(total / 1000)}k+`;
  });

  // Featured: a legal xiangqi position where the rook's move to the back rank is mate.
  // King on f10 has two flight squares: e10 (covered by the rook along the rank) and f9 (covered by the horse).
  const board = document.getElementById("board");
  if (board) {
    const O = 40, S = 48;
    const X = (c) => O + c * S, Y = (r) => O + r * S;
    const el = (tag, attrs, parent = board) => {
      const n = document.createElementNS(SVG, tag);
      for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
      parent.appendChild(n);
      return n;
    };
    const defs = el("defs", {});
    const marker = el("marker", { id: "arMove", viewBox: "0 0 10 10", refX: 7, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, defs);
    el("path", { d: "M0 0L10 5L0 10z", fill: "var(--blue)" }, marker);

    let d = "";
    for (let r = 0; r <= 9; r++) d += `M${X(0)} ${Y(r)}H${X(8)}`;
    for (let c = 1; c < 8; c++) d += `M${X(c)} ${Y(0)}V${Y(4)}M${X(c)} ${Y(5)}V${Y(9)}`;
    d += `M${X(3)} ${Y(0)}L${X(5)} ${Y(2)}M${X(5)} ${Y(0)}L${X(3)} ${Y(2)}`;
    d += `M${X(3)} ${Y(7)}L${X(5)} ${Y(9)}M${X(5)} ${Y(7)}L${X(3)} ${Y(9)}`;
    el("path", { d, class: "b-line" });
    el("rect", { x: X(0), y: Y(0), width: 8 * S, height: 9 * S, class: "b-frame" });
    el("text", { x: X(1.5), y: Y(4.5) + 7, class: "b-river" }).textContent = "楚河";
    el("text", { x: X(5.5), y: Y(4.5) + 7, class: "b-river" }).textContent = "漢界";

    el("path", { d: `M${X(7)} ${Y(2)}H${X(6)}L${X(5)} ${Y(1)}`, class: "b-move", "stroke-dasharray": "2 5", "stroke-linecap": "round", opacity: ".7" });
    el("circle", { cx: X(0), cy: Y(3), r: 19, class: "b-ghost" });
    el("path", { d: `M${X(0)} ${Y(3) - 24}V${Y(0) + 26}`, class: "b-move", "marker-end": "url(#arMove)" });
    for (const [c, r] of [[4, 0], [5, 1]]) {
      el("path", { d: `M${X(c) - 6} ${Y(r) - 6}l12 12m0 -12l-12 12`, class: "b-cover" });
    }

    const pieces = [
      ["red", "車", 0, 0], ["red", "馬", 7, 2], ["red", "帥", 3, 9],
      ["black", "將", 5, 0], ["black", "象", 8, 2], ["black", "卒", 2, 6],
    ];
    for (const [side, ch, c, r] of pieces) {
      const g = el("g", { class: `b-piece b-piece--${side}` });
      el("circle", { cx: X(c), cy: Y(r), r: 19 }, g);
      const t = el("text", { x: X(c), y: Y(r) + 7.5, "text-anchor": "middle" }, g);
      t.textContent = ch;
    }
    el("circle", { cx: X(5), cy: Y(0), r: 19, class: "b-ring" });
    el("text", { x: X(5) + 26, y: Y(0) - 14, class: "b-tag" }).textContent = "mate";
  }

  // Hero: a slowly drifting graph of research topics, densest on the right.
  const canvas = document.getElementById("graph");
  const ctx = canvas.getContext("2d");
  const LABELS = ["evaluation", "agents", "tokenization", "robustness", "multilingual", "code", "reasoning", "open data"];
  const SLOTS = [[0.70, 0.18], [0.86, 0.12], [0.78, 0.32], [0.90, 0.40], [0.69, 0.52], [0.84, 0.60], [0.74, 0.76], [0.88, 0.84]];
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
