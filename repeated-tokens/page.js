(() => {
  const SVG = "http://www.w3.org/2000/svg";
  const A = 0.0203, P = 1.07;

  // Exact non-embedding counts from the grid (Appendix C). Total counts add tied
  // embeddings once; 78M and 361M widths are not stated in the paper and are inferred.
  const MODELS = [
    { label: "23M", n: 23.087168, nt: 48.818752 },
    { label: "45M", n: 45.0849, nt: 77.24938 },
    { label: "78M", n: 77.898384, nt: 116.49576, inferred: true },
    { label: "185M", n: 184.62336, nt: 236.086528 },
    { label: "361M", n: 360.5636, nt: 424.89256, inferred: true },
  ];

  const deltaL = (z) => (z > 0 ? A * Math.pow(z, P) : 0);
  const critical = (tpp) => 2.7 * Math.pow(tpp, 0.24);
  const fmt = (x, sig = 3) => {
    if (!isFinite(x)) return "—";
    if (x === 0) return "0";
    if (Math.abs(x) >= 1000) return Math.round(x).toLocaleString("en-US");
    return String(+x.toPrecision(sig));
  };
  const tokens = (b) => (b >= 1000 ? `${fmt(b / 1000)}T` : b >= 1 ? `${fmt(b)}B` : `${fmt(b * 1000)}M`);
  const el = (tag, attrs, parent) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };

  function segment(container, items, onPick, initial) {
    const buttons = items.map((it, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = it.label;
      b.setAttribute("aria-pressed", String(i === initial));
      b.addEventListener("click", () => { pick(i); onPick(it, i); });
      container.appendChild(b);
      return b;
    });
    const pick = (i) => buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(i === j)));
    return { pick };
  }

  /* Calculator */
  const form = document.getElementById("calc");
  if (form) {
    const $ = (id) => document.getElementById(id);
    const inN = $("in-n"), inNt = $("in-nt"), inU = $("in-u"), inR = $("in-r");
    const presetItems = [...MODELS, { label: "Custom" }];
    const presets = segment($("presets"), presetItems, (m) => {
      if (!m.n) { inN.focus(); return; }
      inN.value = +m.n.toFixed(3); inNt.value = +m.nt.toFixed(3);
      update();
    }, 3);
    inN.value = 184.623; inNt.value = 236.087; inU.value = 1; inR.value = 4;
    const chart = $("calc-chart");

    function draw(n, nt, u, r) {
      chart.replaceChildren();
      const W = 420, H = 170, L = 44, R = 12, T = 10, B = 30;
      const xs = (v) => L + (Math.log2(v) / 5) * (W - L - R);
      const pts = [];
      for (let k = 2; k <= 32; k += 0.25) pts.push([k, deltaL(((k - 1) * nt) / (u * 1000))]);
      const lo = Math.floor(Math.log10(pts[0][1])), hi = Math.ceil(Math.log10(pts[pts.length - 1][1]));
      const span = Math.max(1, hi - lo);
      const ys = (v) => T + ((hi - Math.log10(v)) / span) * (H - T - B);
      el("rect", { class: "c-zone", x: xs(2), y: T, width: xs(16) - xs(2), height: H - T - B, rx: 4 }, chart);
      for (let e = lo; e <= hi; e++) {
        el("path", { class: "grid", d: `M${L} ${ys(10 ** e)}H${W - R}` }, chart);
        el("text", { class: "tick", x: L - 8, y: ys(10 ** e) + 4, "text-anchor": "end" }, chart).textContent = e >= 0 ? String(10 ** e) : String(+(10 ** e).toPrecision(1));
      }
      for (const v of [1, 2, 4, 8, 16, 32]) el("text", { class: "tick", x: xs(v), y: H - B + 18, "text-anchor": "middle" }, chart).textContent = v;
      el("text", { class: "tick", x: xs(2) + 6, y: T + 14 }, chart).textContent = "fitted range";
      const rStar = Math.pow(2.7 * Math.pow((u * 1000) / n, 0.24), 1 / 0.76);
      if (rStar > 1 && rStar <= 32) {
        el("path", { class: "c-ref", d: `M${xs(rStar)} ${T}V${H - B}` }, chart);
        el("text", { class: "tick", x: xs(rStar) + 5, y: H - B - 6 }, chart).textContent = "R = Rc";
      }
      el("path", { class: "c-line", d: "M" + pts.map(([k, v]) => `${xs(k).toFixed(1)} ${ys(v).toFixed(1)}`).join("L") }, chart);
      if (r >= 2) el("circle", { class: "c-dot", cx: xs(r), cy: ys(deltaL(((r - 1) * nt) / (u * 1000))), r: 4.5 }, chart);
    }

    function update() {
      const n = +inN.value, nt = Math.max(+inNt.value, n), u = +inU.value, r = +inR.value;
      const ok = n > 0 && u > 0;
      const d = r * u, tpp = (d * 1000) / n, z = ((r - 1) * nt) / (u * 1000);
      const dl = deltaL(z), rc = critical(tpp);
      $("out-r").textContent = `${r} · D = ${tokens(d)} tokens`;
      $("o-tpp").textContent = ok ? fmt(tpp) : "—";
      $("o-z").textContent = ok ? fmt(z) : "—";
      $("o-dl").innerHTML = ok ? `${fmt(dl, 2)}<small>bpb</small>` : "—";
      $("o-rc").innerHTML = ok ? `${fmt(rc, 2)}<small>epochs</small>` : "—";
      const v = $("o-verdict");
      v.classList.toggle("is-warn", ok && r >= rc);
      if (!ok) v.textContent = "Enter positive parameter and token counts.";
      else if (r === 1) v.innerHTML = "<b>One epoch.</b> Nothing is repeated, so there is no excess loss.";
      else if (r < rc) v.innerHTML = `<b>Below the critical epoch count.</b> At ${fmt(tpp)} tokens per parameter, a repeated token stays worth more than half a fresh one until about ${fmt(rc, 2)} epochs.`;
      else v.innerHTML = `<b>Past the critical epoch count.</b> Beyond about ${fmt(rc, 2)} epochs at this budget, a repeated token is worth less than half a fresh one, so more unique data would help more than more epochs.`;
      const flags = [];
      if (n < 23 || n > 361) flags.push("Model size is outside the fitted 23M–361M range.");
      if (tpp < 5 || tpp > 300) flags.push("Tokens per parameter are outside the fitted 5–300 range.");
      if (r > 16) flags.push("More than 16 epochs extrapolates beyond the grid.");
      $("o-flags").innerHTML = flags.map((f) => `<li>${f}</li>`).join("");
      if (ok) draw(n, nt, u, r);
      const match = MODELS.findIndex((m) => Math.abs(m.n - n) < 0.01 && Math.abs(m.nt - nt) < 0.01);
      presets.pick(match === -1 ? MODELS.length : match);
    }

    for (const i of [inN, inNt, inU, inR]) i.addEventListener("input", update);
    update();
  }

  /* Figure 12a grid: measured excess loss in 1e-3 bpb, rows R = 2, 4, 8, 16, columns D/N. */
  const TPP = [5, 10, 20, 50, 100, 200, 300];
  const GRID = {
    "23M": [[7.6, 2.3, 7.3, 0.5, -1.1, -1.8, -1.4], [55, 33, 24, 11, 6.0, -0.4, 0.5], [610, 262, 122, 47, 25, 10.0, 7.4], [3900, 2500, 1100, 242, 94, 40, 22]],
    "45M": [[5.6, 7.1, 6.1, 0.5, 0.9, -0.6, 1.0], [46, 33, 21, 9.6, 6.1, 1.4, 4.4], [496, 216, 98, 37, 20, 8.9, 7.6], [3800, 2200, 797, 188, 73, 31, 21]],
    "78M": [[5.2, 3.6, 2.6, 2.4, -1.2, 0.8, 1.4], [38, 25, 16, 8.0, 2.0, 3.4, 1.6], [385, 174, 84, 34, 15, 11, 7.8], [3300, 1800, 648, 166, 66, 31, 21]],
    "185M": [[6.1, 3.5, 3.5, 1.0, 1.0, 0.4, 1.0], [32, 21, 15, 6.6, 4.2, 2.8, 1.5], [291, 141, 70, 30, 16, 8.8, 5.8], [2700, 1300, 501, 140, 61, 29, 19]],
    "361M": [[4.2, 3.6, 2.1, 1.3, 0.7, 0.1, 0.3], [29, 20, 12, 6.2, 3.5, 1.5, 1.4], [252, 127, 64, 28, 15, 8.7, 5.3], [2400, 1200, 442, 129, 56, 26, 18]],
  };
  const EPOCHS = [2, 4, 8, 16];
  const heat = document.getElementById("grid-heat");
  if (heat) {
    let size = 0, mode = "m";
    const cell = (x) => {
      if (x >= 1000) return `${(x / 1000).toFixed(1)}k`;
      if (Math.abs(x) >= 100) return x.toFixed(0);
      if (Math.abs(x) >= 10) return x.toFixed(0);
      return x.toFixed(1);
    };
    const shade = (x) => Math.max(0, Math.min(1, Math.log10(Math.max(x, 2) / 2) / Math.log10(2000)));
    function render() {
      const m = MODELS[size], ratio = m.nt / m.n, rows = GRID[m.label];
      let h = `<thead><tr><th scope="col">Epochs</th>${TPP.map((t) => `<th scope="col">${t}<small>D/N</small></th>`).join("")}</tr></thead><tbody>`;
      EPOCHS.forEach((r, i) => {
        h += `<tr><th scope="row">${r} epochs</th>`;
        TPP.forEach((t, j) => {
          const meas = rows[i][j], pred = 1000 * deltaL(((r - 1) * r / t) * ratio);
          const x = mode === "m" ? meas : pred;
          const v = shade(x);
          const cls = x < 2 ? "is-nil" : v > 0.55 ? "is-dark" : "";
          h += `<td class="${cls}" style="--v:${v.toFixed(3)}" title="${r} epochs, D/N ${t}: measured ${cell(meas)}, Eq. 3 ${cell(pred)}">${cell(x)}</td>`;
        });
        h += "</tr>";
      });
      heat.innerHTML = h + "</tbody>";
      heat.setAttribute("aria-label", `Excess loss for the ${m.label} model, ${mode === "m" ? "measured" : "predicted by Eq. 3"}, in 10^-3 bits per byte`);
      document.getElementById("grid-note").textContent = mode === "m"
        ? "Measured. Cells below 2 are within run-to-run noise."
        : `Eq. 3 with N_total/N = ${ratio.toFixed(2)}${m.inferred ? " (width inferred)" : ""}. One curve, no per-size term.`;
    }
    segment(document.getElementById("grid-size"), MODELS, (_, i) => { size = i; render(); }, 0);
    const modeBtns = [...document.querySelectorAll("#grid-mode button")];
    modeBtns.forEach((b) => b.addEventListener("click", () => {
      mode = b.dataset.mode;
      modeBtns.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      render();
    }));
    render();
  }
})();
