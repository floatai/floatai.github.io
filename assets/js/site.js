(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();

  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  const revealTargets = document.querySelectorAll(".section__head, .page-figure, .block, .theme, .pub, .steps li, .network__intro, .footer__statement");
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

  // Hero: a slowly drifting graph of research topics, densest on the right.
  const canvas = document.getElementById("graph");
  if (!canvas) return;
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
