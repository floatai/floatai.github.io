(() => {
  const SVG = "http://www.w3.org/2000/svg";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const MODELS = [
    ["gemini-3.1-pro", "Gemini 3.1 Pro", "Google DeepMind"],
    ["gpt-5.5", "GPT-5.5", "OpenAI"],
    ["qwen3.7-max", "Qwen 3.7 Max", "Qwen"],
    ["claude-opus-4.7", "Claude Opus 4.7", "Anthropic"],
    ["deepseek-v4-pro", "DeepSeek V4 Pro", "DeepSeek"],
    ["seed-2.0-pro", "Seed 2.0 Pro", "ByteDance Seed"],
    ["kimi-k2.5", "Kimi K2.5", "Moonshot AI"],
    ["mistral-large-3", "Mistral Large 3", "Mistral AI"],
    ["minimax-m2.5", "MiniMax M2.5", "MiniMax"],
    ["deepseek-r1", "DeepSeek R1", "DeepSeek"],
    ["gpt-oss-120b", "GPT-OSS 120B", "OpenAI"],
    ["deepseek-v3.2", "DeepSeek V3.2", "DeepSeek"],
  ];
  const SETTINGS = [["S", "Sighted"], ["R", "Restricted"]];

  const svgEl = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVG, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const h = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "text") n.textContent = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k);
    return n;
  };
  const pct = (x) => (100 * x).toFixed(1);

  // ---------------------------------------------------------------- board

  const O = 40, S = 48;
  const X = (c) => O + c * S, Y = (r) => O + r * S;
  const GLYPH = {
    R: "車", N: "馬", B: "相", A: "仕", K: "帥", C: "炮", P: "兵",
    r: "車", n: "馬", b: "象", a: "士", k: "將", c: "砲", p: "卒",
  };

  function drawGrid(svg) {
    svg.replaceChildren();
    const defs = svgEl("defs", {}, svg);
    for (const [id, color] of [["arRed", "var(--blue)"], ["arBlack", "var(--ink-2)"]]) {
      const m = svgEl("marker", { id: `${svg.id}-${id}`, viewBox: "0 0 10 10", refX: 7, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto" }, defs);
      svgEl("path", { d: "M0 0L10 5L0 10z", fill: color }, m);
    }
    let d = "";
    for (let r = 0; r <= 9; r++) d += `M${X(0)} ${Y(r)}H${X(8)}`;
    for (let c = 1; c < 8; c++) d += `M${X(c)} ${Y(0)}V${Y(4)}M${X(c)} ${Y(5)}V${Y(9)}`;
    d += `M${X(3)} ${Y(0)}L${X(5)} ${Y(2)}M${X(5)} ${Y(0)}L${X(3)} ${Y(2)}`;
    d += `M${X(3)} ${Y(7)}L${X(5)} ${Y(9)}M${X(5)} ${Y(7)}L${X(3)} ${Y(9)}`;
    svgEl("path", { d, class: "b-line" }, svg);
    svgEl("rect", { x: X(0), y: Y(0), width: 8 * S, height: 9 * S, class: "b-frame" }, svg);
    svgEl("text", { x: X(1.5), y: Y(4.5) + 7, class: "b-river" }, svg).textContent = "楚河";
    svgEl("text", { x: X(5.5), y: Y(4.5) + 7, class: "b-river" }, svg).textContent = "漢界";
    return { marks: svgEl("g", {}, svg), pieces: svgEl("g", {}, svg), over: svgEl("g", {}, svg) };
  }

  function drawPiece(layer, side, ch, c, r) {
    const g = svgEl("g", { class: `b-piece b-piece--${side}` }, layer);
    svgEl("circle", { cx: X(c), cy: Y(r), r: 19 }, g);
    svgEl("text", { x: X(c), y: Y(r) + 7.5, "text-anchor": "middle" }, g).textContent = ch;
  }

  function parseFen(fen) {
    const out = [];
    fen.split(" ")[0].split("/").forEach((row, r) => {
      let c = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) c += +ch;
        else { out.push([ch === ch.toUpperCase() ? "red" : "black", ch, c, r]); c += 1; }
      }
    });
    return out;
  }

  // ICCS: files a–i left to right from Red's side, ranks 0–9 from Red's back rank.
  const sq = (s) => [s.charCodeAt(0) - 97, 9 - +s[1]];

  function drawArrow(layer, svgId, mv, side) {
    const [c0, r0] = sq(mv.slice(0, 2)), [c1, r1] = sq(mv.slice(2, 4));
    const dx = X(c1) - X(c0), dy = Y(r1) - Y(r0), len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    svgEl("circle", { cx: X(c0), cy: Y(r0), r: 19, class: `b-ghost b-ghost--${side}` }, layer);
    svgEl("path", {
      d: `M${X(c0) + ux * 22} ${Y(r0) + uy * 22}L${X(c1) - ux * 24} ${Y(r1) - uy * 24}`,
      class: `b-move b-move--${side}`, "marker-end": `url(#${svgId}-${side === "red" ? "arRed" : "arBlack"})`,
    }, layer);
  }

  // A legal position where the rook's move to the back rank is mate: the king on f10 has two
  // flight squares, e10 (covered by the rook along the rank) and f9 (covered by the horse).
  const hero = document.getElementById("board");
  if (hero) {
    const L = drawGrid(hero);
    svgEl("path", { d: `M${X(7)} ${Y(2)}H${X(6)}L${X(5)} ${Y(1)}`, class: "b-move", "stroke-dasharray": "2 5", "stroke-linecap": "round", opacity: ".7" }, L.marks);
    svgEl("circle", { cx: X(0), cy: Y(3), r: 19, class: "b-ghost" }, L.marks);
    svgEl("path", { d: `M${X(0)} ${Y(3) - 24}V${Y(0) + 26}`, class: "b-move", "marker-end": `url(#board-arRed)` }, L.marks);
    for (const [c, r] of [[4, 0], [5, 1]]) svgEl("path", { d: `M${X(c) - 6} ${Y(r) - 6}l12 12m0 -12l-12 12`, class: "b-cover" }, L.marks);
    for (const [side, ch, c, r] of [["red", "車", 0, 0], ["red", "馬", 7, 2], ["red", "帥", 3, 9], ["black", "將", 5, 0], ["black", "象", 8, 2], ["black", "卒", 2, 6]]) {
      drawPiece(L.pieces, side, ch, c, r);
    }
    svgEl("circle", { cx: X(5), cy: Y(0), r: 19, class: "b-ring" }, L.over);
    svgEl("text", { x: X(5) + 26, y: Y(0) - 14, class: "b-tag" }, L.over).textContent = "mate";
  }

  const lbRoot = document.getElementById("lb-root");
  const hmRoot = document.getElementById("hm-root");
  const rpRoot = document.getElementById("rp-root");
  if (!lbRoot && !hmRoot && !rpRoot) return;

  const load = (name) => fetch(`/research/xiangqibench/data/${name}.json`).then((r) => {
    if (!r.ok) throw new Error(`${name}.json: HTTP ${r.status}`);
    return r.json();
  });

  // ---------------------------------------------------------------- metrics

  function metrics(results) {
    const out = {};
    for (const [s] of SETTINGS) {
      out[s] = MODELS.map(([key, name, org]) => {
        const wins = [...results[s][key]].map(Number);
        const n = wins.length;
        return {
          key, name, org, wins,
          p1: wins.reduce((a, b) => a + b, 0) / (3 * n),
          p3: wins.filter((w) => w > 0).length / n,
          h3: wins.filter((w) => w === 3).length / n,
          won: wins.filter((w) => w > 0).length,
          all: wins.filter((w) => w === 3).length,
        };
      });
    }
    return out;
  }

  // ---------------------------------------------------------------- leaderboard

  function leaderboard(root, M) {
    const SCALE = 0.4;
    let setting = "S";
    const tbody = h("tbody");
    const seg = h("div", { class: "switch", role: "group", "aria-label": "Observation setting" });
    const buttons = SETTINGS.map(([s, label]) => {
      const b = h("button", { type: "button", class: "switch__btn", "aria-pressed": String(s === setting), text: label, onclick: () => render(s) });
      seg.append(b);
      return [s, b];
    });
    const legend = h("div", { class: "lbx__legend", "aria-hidden": "true" },
      h("span", { class: "key key--p3" }), "pass@3",
      h("span", { class: "key key--h3" }), "pass^3",
    );
    const table = h("table", { class: "lbx" },
      h("caption", { class: "sr-only", text: "XiangqiBench leaderboard" }),
      h("thead", {}, h("tr", {},
        h("th", { scope: "col", class: "lbx__rank", text: "#" }),
        h("th", { scope: "col", class: "lbx__model", text: "Model" }),
        h("th", { scope: "col", class: "lbx__p1", text: "pass@1" }),
        h("th", { scope: "col", class: "lbx__num", text: "pass@3" }),
        h("th", { scope: "col", class: "lbx__num", text: "pass^3" }),
        h("th", { scope: "col", class: "lbx__rel" }, "Reliability"),
      )),
      tbody,
    );
    root.replaceChildren(h("div", { class: "lbx__bar" }, seg, legend), h("div", { class: "lb-scroll" }, table));

    function render(s) {
      setting = s;
      for (const [k, b] of buttons) b.setAttribute("aria-pressed", String(k === s));
      const before = new Map([...tbody.rows].map((tr) => [tr.dataset.key, tr.getBoundingClientRect().top]));
      const rows = [...M[s]].sort((a, b) => b.p1 - a.p1 || b.p3 - a.p3 || b.h3 - a.h3);
      const best = { p1: rows[0].p1, p3: Math.max(...rows.map((r) => r.p3)), h3: Math.max(...rows.map((r) => r.h3)) };
      let rank = 0, prev = null;
      tbody.replaceChildren(...rows.map((m, i) => {
        const sig = `${m.p1}|${m.p3}|${m.h3}`;
        if (sig !== prev) { rank = i + 1; prev = sig; }
        const zero = m.p1 === 0;
        const w = (x) => `${Math.min(100, (100 * x) / SCALE)}%`;
        return h("tr", { "data-key": m.key, class: [rank === 1 && !zero ? "is-top" : "", zero ? "is-zero" : ""].join(" ").trim() || null },
          h("td", { class: "lbx__rank", text: zero ? "–" : String(rank) }),
          h("th", { scope: "row", class: "lbx__model" }, h("span", { class: "lbx__name", text: m.name }), h("span", { class: "lbx__org", text: m.org })),
          h("td", { class: "lbx__p1" }, h("div", { class: "lbx__cell" },
            h("span", { class: "lbx__track" }, h("span", { class: "lbx__fill", style: `width:${w(m.p1)}` })),
            h("span", { class: `lbx__val${m.p1 === best.p1 && !zero ? " is-best" : ""}`, text: pct(m.p1) }))),
          h("td", { class: `lbx__num${m.p3 === best.p3 && m.p3 > 0 ? " is-best" : ""}`, text: pct(m.p3) }),
          h("td", { class: `lbx__num${m.h3 === best.h3 && m.h3 > 0 ? " is-best" : ""}`, text: pct(m.h3) }),
          h("td", { class: "lbx__rel", title: `${m.won} positions won at least once, ${m.all} in all three trials` }, h("div", { class: "lbx__cell" },
            h("span", { class: "rel" },
              h("span", { class: "rel__p3", style: `width:${w(m.p3)}` }),
              h("span", { class: "rel__h3", style: `width:${w(m.h3)}` })),
            h("span", { class: "rel__txt", text: `${m.all}/${m.won}` }))),
        );
      }));
      if (reduceMotion || !before.size) return;
      for (const tr of tbody.rows) {
        const dy = before.get(tr.dataset.key) - tr.getBoundingClientRect().top;
        if (!dy) continue;
        tr.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: 520, easing: "cubic-bezier(.2,.7,.2,1)" });
      }
    }
    render(setting);
  }

  // ---------------------------------------------------------------- heatmap

  function heatmap(root, results, M, replayIds, openReplay) {
    // Within each mate distance, order positions by total sighted wins so that columns stay fixed
    // when the setting changes.
    const total = (j) => MODELS.reduce((a, [k]) => a + +results.S[k][j], 0);
    const order = results.cases.map((_, j) => j).sort((a, b) => results.cases[a][1] - results.cases[b][1] || total(b) - total(a) || a - b);
    const cases = order.map((j) => results.cases[j]);
    const cell = (s, key, j) => results[s][key][order[j]];
    const W = 760, LW = 132, CW = (W - LW) / cases.length, RH = 15, GAP = 3, TOP = 6;
    const H = TOP + MODELS.length * (RH + GAP) + 44;
    let setting = "S";

    const seg = h("div", { class: "switch", role: "group", "aria-label": "Observation setting" });
    const buttons = SETTINGS.map(([s, label]) => {
      const b = h("button", { type: "button", class: "switch__btn", "aria-pressed": String(s === setting), text: label, onclick: () => render(s) });
      seg.append(b);
      return [s, b];
    });
    const legend = h("div", { class: "hm__legend", "aria-hidden": "true" }, "Wins in 3 trials",
      ...[0, 1, 2, 3].map((k) => h("span", { class: "hm__key" }, h("i", { class: `w${k}` }), String(k))));
    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, class: "hm", role: "img" });
    const readout = h("p", { class: "hm__readout", "aria-live": "polite" });
    root.replaceChildren(h("div", { class: "lbx__bar" }, seg, legend), h("div", { class: "hm-scroll" }, svg), readout);

    const cells = svgEl("g", {}, svg);
    const hover = svgEl("g", {}, svg);
    const axis = svgEl("g", {}, svg);
    const yBottom = TOP + MODELS.length * (RH + GAP);

    MODELS.forEach(([, name], i) => {
      svgEl("text", { x: 0, y: TOP + i * (RH + GAP) + RH - 3.5, class: "hm__label" }, axis).textContent = name;
    });
    let start = 0;
    for (let j = 1; j <= cases.length; j++) {
      if (j < cases.length && cases[j][1] === cases[start][1]) continue;
      const x0 = LW + start * CW, x1 = LW + j * CW;
      svgEl("path", { d: `M${x0 + 1} ${yBottom + 6}H${x1 - 1}`, class: "hm__span" }, axis);
      svgEl("text", { x: (x0 + x1) / 2, y: yBottom + 22, class: "hm__tick", "text-anchor": "middle" }, axis).textContent = cases[start][1];
      start = j;
    }
    svgEl("text", { x: 0, y: yBottom + 22, class: "hm__axis" }, axis).textContent = "Mate in (plies)";
    cases.forEach(([label], j) => {
      if (!replayIds.has(label)) return;
      const cx = LW + (j + 0.5) * CW;
      const g = svgEl("g", { class: "hm__replay", tabindex: 0, role: "button", "aria-label": `Open replay of ${label}` }, axis);
      svgEl("path", { d: `M${cx} ${yBottom + 30}l4 7h-8z` }, g);
      const go = () => openReplay(label);
      g.addEventListener("click", go);
      g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    svgEl("text", { x: W, y: yBottom + 38, class: "hm__axis", "text-anchor": "end" }, axis).textContent = "▲ replay below";

    const colHi = svgEl("rect", { y: TOP - 3, width: CW, height: MODELS.length * (RH + GAP) + 3, class: "hm__col", visibility: "hidden" }, hover);
    const rowHi = svgEl("rect", { x: LW - 2, width: W - LW + 2, height: RH + 2, class: "hm__row", visibility: "hidden" }, hover);

    function summary() {
      const anyWin = cases.filter((_, j) => MODELS.some(([k]) => cell(setting, k, j) !== "0")).length;
      const name = SETTINGS.find(([s]) => s === setting)[1].toLowerCase();
      readout.textContent = `Under ${name} observation, ${anyWin} of ${cases.length} positions are won at least once by some model; ${cases.length - anyWin} are never won. Hover a cell for details.`;
    }

    function render(s) {
      setting = s;
      for (const [k, b] of buttons) b.setAttribute("aria-pressed", String(k === s));
      svg.setAttribute("aria-label", `Wins out of three trials for each model and position, ${s === "S" ? "sighted" : "restricted"} observation`);
      cells.replaceChildren();
      MODELS.forEach(([key], i) => {
        for (let j = 0; j < cases.length; j++) {
          svgEl("rect", { x: LW + j * CW + 0.4, y: TOP + i * (RH + GAP), width: CW - 0.8, height: RH, rx: 1, class: `w${cell(s, key, j)}` }, cells);
        }
      });
      summary();
    }

    svg.addEventListener("pointermove", (e) => {
      const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
      const j = Math.floor((p.x - LW) / CW), i = Math.floor((p.y - TOP) / (RH + GAP));
      if (j < 0 || j >= cases.length || i < 0 || i >= MODELS.length) {
        colHi.setAttribute("visibility", "hidden"); rowHi.setAttribute("visibility", "hidden");
        return summary();
      }
      colHi.setAttribute("x", LW + j * CW); colHi.setAttribute("visibility", "visible");
      rowHi.setAttribute("y", TOP + i * (RH + GAP) - 1); rowHi.setAttribute("visibility", "visible");
      const [label, mate] = cases[j];
      const [key, name] = MODELS[i];
      const wins = +cell(setting, key, j);
      const solvedBy = MODELS.filter(([k]) => cell(setting, k, j) !== "0").length;
      readout.textContent = `${label} · mate in ${mate} · ${name}: ${wins} of 3 trials won. ${solvedBy} of 12 models win this position at least once.`;
    });
    svg.addEventListener("pointerleave", () => {
      colHi.setAttribute("visibility", "hidden"); rowHi.setAttribute("visibility", "hidden");
      summary();
    });
    render(setting);
  }

  // ---------------------------------------------------------------- replays

  const COMMAND = { get_legal_moves: "legal_moves", view_board: "view_board", get_history: "history" };

  function replays(root, groups) {
    let gi = 0, ti = 0, step = 0, timer = null;
    const tabs = h("div", { class: "rp__tabs", role: "tablist", "aria-label": "Replay cases" });
    const note = h("p", { class: "rp__note" });
    const trials = h("div", { class: "rp__trials", role: "group", "aria-label": "Trials" });
    const svg = svgEl("svg", { id: "rp-board", viewBox: "0 0 464 512", class: "rp__board", role: "img" });
    const status = h("p", { class: "rp__status", "aria-live": "polite" });
    const prevB = h("button", { type: "button", class: "rp__btn", "aria-label": "Previous ply", text: "‹", onclick: () => go(step - 1) });
    const playB = h("button", { type: "button", class: "rp__btn rp__btn--play", text: "Play", onclick: () => toggle() });
    const nextB = h("button", { type: "button", class: "rp__btn", "aria-label": "Next ply", text: "›", onclick: () => go(step + 1) });
    const range = h("input", { type: "range", min: 0, value: 0, class: "rp__range", "aria-label": "Ply" });
    range.addEventListener("input", () => { stop(); go(+range.value); });
    const plies = h("ol", { class: "rp__plies" });
    const log = h("div", { class: "rp__log" });

    root.replaceChildren(
      tabs, note, trials,
      h("div", { class: "rp__stage" },
        h("div", { class: "rp__left" }, h("div", { class: "rp__boardwrap" }, svg),
          h("div", { class: "rp__controls" }, prevB, playB, nextB, range), status),
        h("div", { class: "rp__right" }, plies, log)),
    );
    root.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); stop(); go(step + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); stop(); go(step - 1); }
    });

    groups.forEach((g, i) => {
      tabs.append(h("button", {
        type: "button", role: "tab", class: "rp__tab", id: `rp-tab-${g.label}`, "aria-selected": "false",
        onclick: () => selectGroup(i),
      }, h("span", { class: "rp__tablabel", text: `${g.label} · mate in ${g.mate}` }), h("span", { class: "rp__tabtitle", text: g.title })));
    });

    const trial = () => groups[gi].trials[ti];
    const outcome = (t) => (t.win ? "Win" : t.plies.at(-1).acts?.some((a) => a.kind === "resign") ? "Resigned" : "Loss");

    function selectGroup(i) {
      stop();
      gi = i; ti = 0;
      [...tabs.children].forEach((b, k) => b.setAttribute("aria-selected", String(k === i)));
      note.textContent = groups[i].note;
      trials.replaceChildren(...groups[i].trials.map((t, k) => h("button", {
        type: "button", class: `rp__trial${t.win ? " is-win" : ""}`, "aria-pressed": String(k === 0), onclick: () => selectTrial(k),
      }, h("span", { class: "rp__tm", text: t.model }), h("span", { class: "rp__ts", text: `${t.setting} · trial ${t.trial}` }), h("span", { class: "rp__to", text: outcome(t) }))));
      selectTrial(0);
    }

    function selectTrial(k) {
      stop();
      ti = k;
      [...trials.children].forEach((b, j) => b.setAttribute("aria-pressed", String(j === k)));
      const t = trial();
      range.max = t.plies.length;
      plies.replaceChildren(h("li", { class: "rp__ply", "data-step": 0 }, h("button", { type: "button", onclick: () => { stop(); go(0); }, text: "Start" })),
        ...t.plies.map((p, j) => h("li", { class: `rp__ply rp__ply--${p.side}`, "data-step": j + 1 },
          h("button", { type: "button", onclick: () => { stop(); go(j + 1); } },
            h("span", { class: "rp__pn", text: String(j + 1) }), p.mv || "resign"))));
      go(0);
    }

    function actView(a) {
      const out = [];
      if (a.text) {
        out.push(h("p", { class: "rp__text", text: a.text }));
        if (a.more) out.push(h("p", { class: "rp__more", text: `… ${a.more.toLocaleString("en-US")} more characters of reasoning` }));
      }
      const cmd = a.kind === "think" ? null : a.kind === "move" ? `move ${a.mv}` : a.kind === "simulate" ? `simulate ${(a.line || []).join(" ")}` : (COMMAND[a.kind] || a.kind);
      if (!cmd) return h("div", { class: "rp__act rp__act--think" }, h("span", { class: "rp__kind", text: "think" }), ...out);
      const term = h("div", { class: `rp__term${a.ok ? "" : " is-rejected"}` }, h("div", { class: "rp__cmd", text: `$ ${cmd}` }));
      if (a.kind === "simulate" && a.steps) {
        term.append(h("div", { class: "rp__steps" }, ...a.steps.map((s) => h("span", { class: `rp__step${s.ok ? "" : " is-bad"}`, title: s.why || "legal" }, s.mv, h("i", { text: s.ok ? "✓" : "✗" })))));
        const bad = a.steps.find((s) => !s.ok);
        if (bad?.why) term.append(h("div", { class: "rp__fb", text: bad.why.replace(/^Error:\s*/, "") }));
        if (a.end) term.append(h("div", { class: "rp__fb", text: `Line ends: ${a.end}` }));
      }
      if (a.fb) term.append(h("div", { class: "rp__fb", text: a.fb }));
      return h("div", { class: "rp__act" }, ...out, term);
    }

    function go(k) {
      const t = trial();
      step = Math.max(0, Math.min(t.plies.length, k));
      range.value = step;
      const fen = step === 0 ? t.start : t.plies[step - 1].fen;
      const L = drawGrid(svg);
      for (const [side, ch, c, r] of parseFen(fen)) drawPiece(L.pieces, side, GLYPH[ch], c, r);
      const last = step > 0 ? t.plies[step - 1] : null;
      if (last?.mv) drawArrow(L.marks, svg.id, last.mv, last.side === "r" ? "red" : "black");
      const done = step === t.plies.length;
      if (done && t.end.includes("no legal reply")) {
        const loser = t.end.startsWith("Red wins") ? "k" : "K";
        const king = parseFen(fen).find((p) => p[1] === loser);
        if (king) {
          svgEl("circle", { cx: X(king[2]), cy: Y(king[3]), r: 19, class: `b-ring b-ring--${loser === "k" ? "red" : "black"}` }, L.over);
        }
      }
      svg.setAttribute("aria-label", `Board after ply ${step} of ${t.plies.length}`);
      [...plies.children].forEach((li) => li.classList.toggle("is-current", +li.dataset.step === step));
      const cur = plies.querySelector(".is-current");
      if (cur) {
        const left = cur.offsetLeft - plies.offsetLeft, right = left + cur.offsetWidth;
        if (left < plies.scrollLeft) plies.scrollLeft = left;
        else if (right > plies.scrollLeft + plies.clientWidth) plies.scrollLeft = right - plies.clientWidth;
      }
      prevB.disabled = step === 0; nextB.disabled = done;
      status.textContent = done ? t.end : step === 0 ? `${t.model}, ${t.setting.toLowerCase()} observation, trial ${t.trial}. Red to move.` : `Ply ${step} of ${t.plies.length}`;

      const g = groups[gi];
      if (step === 0) {
        log.replaceChildren(h("div", { class: "rp__head" }, h("b", { text: "Start" }), h("span", { text: g.name })),
          h("p", { class: "rp__text", text: `Red to move with a forced mate in ${g.mate} plies. The stored solution begins ${g.ref}. Step through the game to see what the agent wrote, simulated and played before each move.` }));
      } else if (last.side === "b") {
        log.replaceChildren(h("div", { class: "rp__head" }, h("b", { text: `Ply ${step} · Black ${last.mv}` }), h("span", { text: "Pikafish defender" })),
          h("p", { class: "rp__text", text: done ? t.end : "The defender replies. The agent sees this move in its next observation." }));
      } else {
        const acts = last.acts || [];
        log.replaceChildren(h("div", { class: "rp__head" }, h("b", { text: last.mv ? `Ply ${step} · Red ${last.mv}` : `Ply ${step} · Red resigns` }),
          h("span", { text: `${acts.length} command${acts.length === 1 ? "" : "s"} this turn` })),
          ...acts.map(actView), ...(done ? [h("p", { class: "rp__end", text: t.end })] : []));
      }
      log.scrollTop = 0;
      if (done) stop();
    }

    function stop() { clearInterval(timer); timer = null; playB.textContent = "Play"; }
    function toggle() {
      if (timer) return stop();
      if (step >= trial().plies.length) go(0);
      playB.textContent = "Pause";
      timer = setInterval(() => go(step + 1), 1700);
    }

    selectGroup(0);
    return (label) => {
      const i = groups.findIndex((g) => g.label === label);
      if (i < 0) return;
      selectGroup(i);
      root.closest(".block").scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    };
  }

  // ---------------------------------------------------------------- wiring

  const fail = (root, err) => {
    if (root) root.replaceChildren(h("p", { class: "rp__note", text: "This interactive figure could not be loaded. The numbers are in the paper." }));
    console.error(err);
  };

  Promise.all([load("results"), rpRoot ? load("replays") : Promise.resolve([])]).then(([results, groups]) => {
    const M = metrics(results);
    if (lbRoot) { try { leaderboard(lbRoot, M); } catch (e) { fail(null, e); } }
    let open = () => {};
    if (rpRoot) { try { open = replays(rpRoot, groups); } catch (e) { fail(rpRoot, e); } }
    if (hmRoot) { try { heatmap(hmRoot, results, M, new Set(groups.map((g) => g.label)), (l) => open(l)); } catch (e) { fail(hmRoot, e); } }
  }).catch((e) => { fail(hmRoot, e); fail(rpRoot, e); });
})();
