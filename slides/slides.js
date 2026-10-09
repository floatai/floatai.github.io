(() => {
  const W = 1600, H = 1000;
  const stage = document.querySelector(".stage");
  const slides = [...stage.querySelectorAll(".slide")];
  const n = slides.length;
  const count = document.getElementById("count");
  const progress = document.querySelector(".progress i");
  const help = document.getElementById("help");
  const laser = document.querySelector(".laser");
  const btn = (id) => document.getElementById(id);

  const thumbs = slides.map((slide, i) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.dataset.n = i + 1;
    slide.before(thumb);
    thumb.append(slide);
    slide.setAttribute("aria-roledescription", "slide");
    slide.setAttribute("aria-label", `${i + 1} of ${n}`);
    slide.querySelectorAll(".rise").forEach((el, j) => el.style.setProperty("--i", j));
    slide.querySelectorAll(".bar__fill").forEach((el, j) => el.style.setProperty("--i", j));
    const section = slide.dataset.section;
    if (!slide.classList.contains("slide--cover") && !slide.classList.contains("slide--section")) {
      const foot = document.createElement("footer");
      foot.className = "slide__foot";
      foot.innerHTML = `<img src="/assets/brand/floatai-icon.svg" alt="" /><span>FloatAI</span>${section ? `<span>${section}</span>` : ""}<span style="margin-left:auto">${i + 1} / ${n}</span>`;
      slide.append(foot);
    }
    thumb.addEventListener("click", () => { if (overview) { go(i); setOverview(false); } });
    return thumb;
  });

  let cur = -1;
  let overview = false;

  const fromHash = () => {
    const k = parseInt(location.hash.slice(1), 10);
    return Number.isFinite(k) ? Math.min(Math.max(k, 1), n) - 1 : 0;
  };

  function go(i) {
    i = Math.min(Math.max(i, 0), n - 1);
    if (i === cur) return;
    if (cur >= 0) thumbs[cur].classList.remove("is-active");
    cur = i;
    thumbs[cur].classList.add("is-active");
    slides.forEach((s, j) => s.setAttribute("aria-hidden", j === cur ? "false" : "true"));
    count.textContent = `${cur + 1} / ${n}`;
    progress.style.setProperty("--p", `${((cur + 1) / n) * 100}%`);
    if (location.hash !== `#${cur + 1}`) history.replaceState(null, "", `#${cur + 1}`);
    document.title = `${slides[cur].dataset.title || slides[cur].querySelector("h1, h2")?.textContent || "FloatAI"} · FloatAI talk`;
  }

  function fit() {
    if (overview) {
      const w = thumbs[0].getBoundingClientRect().width;
      stage.style.setProperty("--k", w / W);
      return;
    }
    stage.style.setProperty("--scale", Math.min(innerWidth / W, innerHeight / H));
  }

  function setOverview(on) {
    overview = on;
    document.body.classList.toggle("is-overview", on);
    btn("b-grid").setAttribute("aria-pressed", on);
    stage.style.removeProperty("--scale");
    fit();
    if (on) thumbs[cur].scrollIntoView({ block: "center" });
    else window.scrollTo(0, 0);
  }

  function setLaser(on) {
    document.body.classList.toggle("is-laser", on);
    btn("b-laser").setAttribute("aria-pressed", on);
  }

  const toggleHelp = (on = help.hidden) => { help.hidden = !on; };
  const toggleFull = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  btn("b-prev").addEventListener("click", () => go(cur - 1));
  btn("b-next").addEventListener("click", () => go(cur + 1));
  btn("b-grid").addEventListener("click", () => setOverview(!overview));
  btn("b-laser").addEventListener("click", () => setLaser(!document.body.classList.contains("is-laser")));
  btn("b-full").addEventListener("click", toggleFull);
  btn("b-help").addEventListener("click", () => toggleHelp());
  help.addEventListener("click", (e) => { if (e.target === help) toggleHelp(false); });

  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (!help.hidden && (k === "Escape" || k === "?")) { toggleHelp(false); return; }
    if (overview) {
      const cols = Math.max(1, Math.round(stage.getBoundingClientRect().width / (thumbs[0].getBoundingClientRect().width + 22)));
      const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols };
      if (k in moves) { e.preventDefault(); go(cur + moves[k]); thumbs[cur].scrollIntoView({ block: "nearest" }); return; }
      if (k === "Enter" || k === "Escape" || k === "g" || k === "o") { e.preventDefault(); setOverview(false); return; }
    }
    switch (k) {
      case "ArrowRight": case "ArrowDown": case "PageDown": case " ": case "Enter": case "j":
        e.preventDefault(); go(cur + 1); break;
      case "ArrowLeft": case "ArrowUp": case "PageUp": case "Backspace": case "k":
        e.preventDefault(); go(cur - 1); break;
      case "Home": e.preventDefault(); go(0); break;
      case "End": e.preventDefault(); go(n - 1); break;
      case "g": case "o": case "Escape": setOverview(!overview && k !== "Escape"); break;
      case "f": toggleFull(); break;
      case "l": setLaser(!document.body.classList.contains("is-laser")); break;
      case "?": toggleHelp(); break;
    }
  });

  let touch = null;
  document.addEventListener("touchstart", (e) => { touch = e.touches[0]; }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!touch || overview) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touch.clientX, dy = t.clientY - touch.clientY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
    touch = null;
  });

  document.addEventListener("pointermove", (e) => {
    laser.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
  });
  laser.style.left = laser.style.top = "0";

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
    Promise.all([cssReady, typeset]).catch(() => {}).finally(() => { clearTimeout(fallback); reveal(); });
  }

  addEventListener("resize", fit);
  addEventListener("hashchange", () => go(fromHash()));
  fit();
  go(fromHash());
})();
