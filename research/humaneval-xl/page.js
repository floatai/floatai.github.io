(() => {
  const $ = (id) => document.getElementById(id);
  const mean = (a) => a.reduce((s, x) => s + x, 0) / a.length;
  const fmt = (x) => (Number.isInteger(x) ? String(x) : String(+x.toFixed(2)));
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const modelHead = (m) => {
    const [fam, size] = m.split(" ");
    return `${esc(fam)}<small>${size || "&nbsp;"}</small>`;
  };

  function segment(container, labels, onPick, initial, titles) {
    const buttons = labels.map((label, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      if (titles) b.title = titles[i];
      b.setAttribute("aria-pressed", String(i === initial));
      b.addEventListener("click", () => {
        buttons.forEach((o, j) => o.setAttribute("aria-pressed", String(i === j)));
        onPick(i);
      });
      container.appendChild(b);
      return b;
    });
  }

  const results = fetch("/research/humaneval-xl/data/results.json").then((r) => r.json());

  /* Leaderboard */
  results.then((R) => {
    const heat = $("lb-heat"), note = $("lb-note");
    const plNames = R.pls.map((p) => p.name);
    let view = -1, sortCol = null;
    const shade = (x) => Math.min(1, x / 85);
    const td = (x, title, text = fmt(x)) => {
      const v = shade(x);
      const cls = x === 0 ? "is-nil" : v > 0.55 ? "is-dark" : "";
      return `<td class="${cls}" style="--v:${v.toFixed(3)}" title="${esc(title)}">${text}</td>`;
    };

    function renderAll() {
      const avg = R.pls.map((p) => R.models.map((_, j) => mean(p.rows.map((r) => r[j]))));
      let h = `<thead><tr><th scope="col">Model</th>${plNames.map((n) => `<th scope="col">${esc(n)}</th>`).join("")}</tr></thead><tbody>`;
      R.models.forEach((m, j) => {
        h += `<tr><th scope="row">${esc(m)}</th>${avg.map((a, i) => td(a[j], `${m}, ${plNames[i]}: mean over 23 natural languages`, a[j].toFixed(1))).join("")}</tr>`;
      });
      heat.innerHTML = h + "</tbody>";
      heat.setAttribute("aria-label", "Mean pass@1 by model and programming language");
      note.textContent = "Mean pass@1 over the 23 natural languages, computed from appendix Tables 5–16.";
    }

    function renderPl(k) {
      const pl = R.pls[k];
      let order = R.langs.map((_, i) => i);
      if (sortCol !== null) order.sort((a, b) => pl.rows[b][sortCol] - pl.rows[a][sortCol]);
      let h = `<thead><tr><th scope="col">${sortCol === null ? "Natural language" : '<button type="button" class="heat__sort" data-col="-1">Natural language</button>'}</th>`;
      R.models.forEach((m, j) => {
        const pressed = sortCol === j;
        h += `<th scope="col" aria-sort="${pressed ? "descending" : "none"}"><button type="button" class="heat__sort${pressed ? " is-on" : ""}" data-col="${j}" title="Sort by ${esc(m)}">${modelHead(m)}</button></th>`;
      });
      h += "</tr></thead><tbody>";
      for (const i of order) {
        const L = R.langs[i];
        h += `<tr><th scope="row">${esc(L.name)}<small>${L.code}</small></th>${pl.rows[i].map((x, j) => td(x, `${R.models[j]}, ${L.name} → ${pl.name}`)).join("")}</tr>`;
      }
      h += `</tbody><tfoot><tr><th scope="row">Mean</th>${R.models.map((_, j) => `<td>${mean(pl.rows.map((r) => r[j])).toFixed(1)}</td>`).join("")}</tr></tfoot>`;
      heat.innerHTML = h;
      heat.setAttribute("aria-label", `pass@1 for ${pl.name} across 23 natural languages and 9 models`);
      note.textContent = `Table ${pl.table} of the paper.${sortCol === null ? " Click a model to sort." : ` Sorted by ${R.models[sortCol]}.`}`;
      heat.querySelectorAll(".heat__sort").forEach((b) => b.addEventListener("click", () => {
        const c = +b.dataset.col;
        sortCol = c < 0 || c === sortCol ? null : c;
        renderPl(k);
      }));
    }

    const render = () => (view < 0 ? renderAll() : renderPl(view));
    segment($("lb-pl"), ["All", ...plNames], (i) => { view = i - 1; render(); }, 0);
    render();
  }).catch(() => { $("lb-note").textContent = "Results could not be loaded."; });

  /* Example viewer */
  const code = $("ex-code");
  if (!code) return;
  const examples = fetch("/research/humaneval-xl/data/example.json").then((r) => r.json());
  Promise.all([examples, results]).then(([E, R]) => {
    const pls = R.pls.map((p) => p.name), langs = R.langs;
    let pl = 0, nl = langs.findIndex((l) => l.name === "English");
    const show = () => {
      const L = langs[nl], P = R.pls[pl];
      code.textContent = E.prompts[P.name][L.name];
      code.setAttribute("aria-label", `Problem ${E.task} in ${L.name}, ${P.name} stub`);
      $("ex-cap").textContent = `Problem ${E.task} · ${L.name} · ${P.name}`;
      const row = P.rows[nl], pick = (name) => row[R.models.indexOf(name)];
      $("ex-score").innerHTML = `pass@1 over all 80 problems in this pair: GPT-4 <b>${fmt(pick("GPT-4"))}</b> · GPT-3.5 <b>${fmt(pick("GPT-3.5"))}</b> · CodeGen2 16B <b>${fmt(pick("CodeGen2 16B"))}</b>`;
    };
    segment($("ex-pl"), pls, (i) => { pl = i; show(); }, 0);
    segment($("ex-nl"), langs.map((l) => l.code), (i) => { nl = i; show(); }, nl, langs.map((l) => l.name));
    show();
  });
})();
