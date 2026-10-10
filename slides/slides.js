(() => {
  const sections = [...document.querySelectorAll(".reveal .slides > section")];
  const n = sections.length;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const count = document.getElementById("count");
  const laser = document.querySelector(".laser");
  const btn = (id) => document.getElementById(id);
  const startTarget = document.getElementById(decodeURIComponent(location.hash.slice(2)));

  sections.forEach((section, i) => {
    const slide = section.querySelector(":scope > .slide");
    slide.querySelectorAll(".rise").forEach((el, j) => el.style.setProperty("--i", j));
    slide.querySelectorAll(".bar__fill").forEach((el, j) => el.style.setProperty("--i", j));
    if (slide.classList.contains("slide--cover") || slide.classList.contains("slide--center")) return;
    const foot = document.createElement("footer");
    foot.className = "slide__foot";
    const label = section.dataset.section;
    foot.innerHTML = `<b>FloatAI</b>${label ? `<span>${label}</span>` : ""}<span class="n">${String(i + 1).padStart(2, "0")}</span>`;
    slide.append(foot);
  });

  function enter(section) {
    if (!section || reduceMotion) return;
    section.querySelectorAll(".chart .c-line").forEach((path, j) => {
      path.setAttribute("pathLength", "1");
      path.animate(
        [{ strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDasharray: 1, strokeDashoffset: 0 }],
        { duration: 1100, delay: 250 + j * 50, easing: "cubic-bezier(.22, 1, .36, 1)", fill: "backwards" },
      ).finished.then(() => path.removeAttribute("pathLength"), () => {});
    });
    section.querySelectorAll("[data-count]").forEach((el) => {
      const end = el.dataset.count;
      const target = parseFloat(end.replace(/,/g, ""));
      const t0 = performance.now() + 200;
      const tick = (t) => {
        const p = Math.min(Math.max((t - t0) / 1000, 0), 1);
        el.textContent = p < 1 ? Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US") : end;
        if (p < 1) requestAnimationFrame(tick);
      };
      el.textContent = "0";
      requestAnimationFrame(tick);
    });
  }

  const update = () => {
    const { h } = Reveal.getIndices();
    count.textContent = `${h + 1} / ${n}`;
    const section = Reveal.getCurrentSlide();
    document.title = `${section.dataset.title || section.querySelector("h1, h2")?.textContent || "FloatAI"} · FloatAI`;
  };

  Reveal.initialize({
    width: 1600,
    height: 1000,
    margin: 0,
    minScale: 0.1,
    maxScale: 3,
    center: false,
    hash: true,
    controls: false,
    progress: true,
    slideNumber: false,
    transition: "slide",
    transitionSpeed: "fast",
    backgroundTransition: "none",
    autoAnimateDuration: 0.6,
    autoAnimateEasing: "cubic-bezier(.22, 1, .36, 1)",
    pdfSeparateFragments: false,
    plugins: [RevealNotes],
  }).then(() => {
    const page = Reveal.isScrollView() && startTarget?.closest(".scroll-page");
    if (page) {
      // Scroll view merges auto-animate runs into one page, with one trigger per slide and per fragment
      const steps = (s) => 1 + s.querySelectorAll(".fragment").length;
      const inPage = [...page.querySelectorAll("section[id]")];
      const before = inPage.slice(0, inPage.indexOf(startTarget)).reduce((a, s) => a + steps(s), 0);
      const total = inPage.reduce((a, s) => a + steps(s), 0);
      document.querySelector(".reveal-viewport").scrollTop = page.offsetTop + page.offsetHeight * before / total;
    }
    update();
    enter(Reveal.getCurrentSlide());
  });

  Reveal.on("slidechanged", (e) => { update(); enter(e.currentSlide); });

  const setLaser = (on) => {
    document.body.classList.toggle("is-laser", on);
    btn("b-laser").setAttribute("aria-pressed", on);
  };
  Reveal.addKeyBinding({ keyCode: 76, key: "L", description: "Laser pointer" }, () => setLaser(!document.body.classList.contains("is-laser")));
  Reveal.on("overviewshown", () => btn("b-grid").setAttribute("aria-pressed", "true"));
  Reveal.on("overviewhidden", () => btn("b-grid").setAttribute("aria-pressed", "false"));

  btn("b-prev").addEventListener("click", () => Reveal.prev());
  btn("b-next").addEventListener("click", () => Reveal.next());
  btn("b-grid").addEventListener("click", () => Reveal.toggleOverview());
  btn("b-laser").addEventListener("click", () => setLaser(!document.body.classList.contains("is-laser")));
  btn("b-notes").addEventListener("click", () => Reveal.getPlugin("notes").open());
  btn("b-full").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  });
  btn("b-help").addEventListener("click", () => Reveal.toggleHelp());

  let idle;
  const wake = () => {
    document.body.classList.remove("is-idle");
    clearTimeout(idle);
    idle = setTimeout(() => document.body.classList.add("is-idle"), 2500);
  };
  document.addEventListener("pointermove", (e) => {
    laser.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    wake();
  });
  wake();
})();
