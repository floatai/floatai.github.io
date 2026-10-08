(() => {
  // Perturbed examples from Figures 9 and 10 of the paper.
  const EX = {"char": {"Original": "def largest_divisor(n: int) -> int:\n    \"\"\" For a given number n, find \n    the largest number that divides n evenly, smaller than n\n    >>> largest_divisor(15)\n    5\n    \"\"\"", "Permutation": "def largest_divisor(n: int) -> int:\n    \"\"\" For a given number n, fdin\n    teh raglets number htat dividse n leenvy, asllmer than n\n    >>> largest_divisor(15)\n    5\n    \"\"\"", "Noise": "def largest_divisor(n: int) -> int:\n    \"\"\" For a gaiven numberwn, find \n    the largest number that diaides n evenly, smaller than n\n    >>> laUgest_|divisor(15)\n    H5\n    \"\"\""}, "tok": {"Original": ["She", " eats", " three", " for", " breakfast", " every", " morning", " and", " b", "akes", " muff", "ins", " for", " her", " friends", " every", " day", " with", " four", ".", " She", " sells", " the", " remainder", " at", " the", " farmers", "'", " market", " daily", " for", " $", "2", " per", " fresh", " duck", " egg", "."], "Permutation": ["She", " eats", " three", " for", " breakfast", " every", " morning", " b", " and", "akes", " muff", "ins", " for", " her", " friends", " every", " day", " with", " four", ".", " She", " the", " sells", " remainder", " at", " the", " farmers", "'", " market", " daily", " for", " $", "2", " per", " fresh", " duck", ".", " egg"], "Noise": ["She", " eats", " three", "out", " breakfast", " every", " morning", " and", " b", "akes", " frame", " muff", "ins", " for", " her", " friends", " every", " day", " with", " Calculation", ".", " She", " sells", " the", " remainder", " at", " the", " farmers", "'", " market", " daily", " for", " $", " door", "2", " per", " fresh", " duck", " egg", "."]}};

  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));

  // Positions in b that are not part of a longest common subsequence with a.
  function changed(a, b) {
    const m = a.length, n = b.length;
    const L = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
    for (let i = m - 1; i >= 0; i--) for (let j = n - 1; j >= 0; j--) {
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    }
    const out = new Set();
    let i = 0, j = 0;
    while (j < n) {
      if (i < m && a[i] === b[j]) { i++; j++; }
      else if (i < m && L[i + 1][j] >= L[i][j + 1]) i++;
      else out.add(j++);
    }
    return out;
  }

  function switcher(root, variants, render) {
    const seg = root.querySelector(".seg");
    const names = Object.keys(variants);
    const buttons = names.map((name, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.textContent = name;
      b.setAttribute("aria-pressed", String(i === 0));
      b.addEventListener("click", () => {
        buttons.forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
        render(name);
      });
      seg.appendChild(b);
      return b;
    });
    render(names[0]);
  }

  const charRoot = document.getElementById("typo-char");
  if (charRoot) {
    const pre = charRoot.querySelector("pre");
    const words = (s) => s.split(/(\s+)/);
    const base = words(EX.char.Original);
    switcher(charRoot, EX.char, (name) => {
      const w = words(EX.char[name]);
      const diff = name === "Original" ? new Set() : changed(base, w);
      pre.innerHTML = w.map((t, i) => (diff.has(i) && t.trim() ? `<mark>${esc(t)}</mark>` : esc(t))).join("");
    });
  }

  const tokRoot = document.getElementById("typo-tok");
  if (tokRoot) {
    const box = tokRoot.querySelector(".toks");
    const base = EX.tok.Original;
    switcher(tokRoot, EX.tok, (name) => {
      const t = EX.tok[name];
      const diff = name === "Original" ? new Set() : changed(base, t);
      const cls = name === "Noise" ? "is-new" : "is-moved";
      box.innerHTML = t.map((s, i) => {
        const c = [diff.has(i) ? cls : "", i > 0 && !s.startsWith(" ") ? "is-cont" : ""].filter(Boolean).join(" ");
        return `<span${c ? ` class="${c}"` : ""}>${esc(s.trimStart())}</span>`;
      }).join("");
      box.setAttribute("aria-label", `${name}: ${t.join("")}`);
    });
  }
})();
