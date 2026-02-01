/* script.js — restart version
   - Spec-compliant
   - Színek row #1 is forced visible
   - Torzítás computed from Költségviselő + Klisé vastagság + Henger kerület
*/

document.addEventListener("DOMContentLoaded", () => {
  const qs  = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));

  const form = qs("#orderForm");

  const koltsegviselo = qs("#koltsegviselo");
  const koltsegviseloOther = qs("#koltsegviseloOther");

  const tech = qs("#tech");
  const kliseV = qs("#kliseV");
  const henger = qs("#henger");

  const torzitas = qs("#torzitas");
  const torzitasHint = qs("#torzitasHint");

  // hard anchor for first colors row
  const firstColorRow = qs("#colorsRow1"); // already in HTML


  const ANGLES = {
    flexo: ["7,5°", "37,5°", "67,5°", "82,5°"],
    ofszet: ["15°", "75°", "0°", "45°"],
  };

  const printBtn = document.getElementById("printBtn");
    printBtn?.addEventListener("click", () => {
      window.print();
  });


  const NYULAS = {
    policell: {
      "1,14": 6.06,
      "1,7": 9.9,
      "2,54": 15.16,
      "2,84": 17.06,
    },
    poliferr: {
      "1,14": 7.0,
    },
  };

  // ----- Init -----
  setKoltsegviseloOtherVisibility();

  // ALWAYS show first Színek row, no matter what
  if (firstColorRow) firstColorRow.hidden = false;

  ensureColorRowsUpTo8();
  applyTechToAngleDropdowns(true);
  applyProgressiveColorRows();
  updateTorzitas();

  // ----- Events -----
  koltsegviselo?.addEventListener("change", () => {
    setKoltsegviseloOtherVisibility();
    updateTorzitas();
  });

  tech?.addEventListener("change", () => {
    applyTechToAngleDropdowns(true);
    applyProgressiveColorRows();
  });

  const garnitura = qs("#garnitura");
  garnitura?.addEventListener("input", () => normalizeIntegerField(garnitura, 1));

  [koltsegviselo, kliseV, henger].forEach(el => {
    el?.addEventListener("change", updateTorzitas);
    el?.addEventListener("input", updateTorzitas);
  });

  wireColorRowEvents();

  // Enter reveals next row when current is "complete"
  qsa("[id^='color']").forEach(inp => {
    inp.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      revealNextColorRowIfAllowed(inp);
    });
  });

  form?.addEventListener("submit", (e) => e.preventDefault());

  // ----- Functions -----
  function setKoltsegviseloOtherVisibility() {
    if (!koltsegviselo || !koltsegviseloOther) return;
    const show = koltsegviselo.value === "other";
    koltsegviseloOther.hidden = !show;
    koltsegviseloOther.disabled = !show;
    if (!show) koltsegviseloOther.value = "";
  }

  function ensureColorRowsUpTo8() {
    if (!firstColorRow) return;
    if (qs("#color2")) return;

    let anchor = firstColorRow;
    for (let i = 2; i <= 8; i++) {
      const row = document.createElement("div");
      row.className = "row color-row";
      row.hidden = true;

      row.innerHTML = `
        <div class="field">
          <label class="lbl ghost" aria-hidden="true">&nbsp;</label>
          <input class="ctrl" id="color${i}" type="text" />
          <div class="error"></div>
        </div>

        <div class="field angle-field">
          <label class="lbl ghost" aria-hidden="true">&nbsp;</label>
          <select class="ctrl" id="angle${i}">
            <option value="" selected disabled></option>
          </select>
          <div class="error"></div>
        </div>
      `;

      anchor.insertAdjacentElement("afterend", row);
      anchor = row;
    }
  }

  function wireColorRowEvents() {
    const colors = qsa("[id^='color']");
    const angles = qsa("[id^='angle']");

    colors.forEach(inp => {
      inp.addEventListener("input", applyProgressiveColorRows);
      inp.addEventListener("blur", () => { inp.value = inp.value.trim(); });
    });

    angles.forEach(sel => {
      sel.addEventListener("change", applyProgressiveColorRows);
    });
  }

  function applyTechToAngleDropdowns(clearIfInvalid = false) {
    const mode = tech?.value || "";

    const angleFields = qsa(".angle-field");
    const angleSelects = qsa("[id^='angle']");

    if (mode === "digitalis") {
      angleFields.forEach(f => (f.hidden = true));
      angleSelects.forEach(sel => {
        sel.disabled = true;
        sel.value = "";
      });
      return;
    }

    angleFields.forEach(f => (f.hidden = false));
    angleSelects.forEach(sel => (sel.disabled = false));

    const opts = (mode === "flexo") ? ANGLES.flexo
              : (mode === "ofszet") ? ANGLES.ofszet
              : [];

    angleSelects.forEach(sel => {
      const prev = sel.value;

      sel.innerHTML = "";
      const ph = document.createElement("option");
      ph.value = "";
      ph.textContent = "";
      ph.disabled = true;
      ph.selected = true;
      sel.appendChild(ph);

      opts.forEach(txt => {
        const o = document.createElement("option");
        o.value = txt;
        o.textContent = txt;
        sel.appendChild(o);
      });

      if (prev && opts.includes(prev)) sel.value = prev;
      else sel.value = "";

      if (clearIfInvalid && prev && !opts.includes(prev)) {
        // cleared above
      }
    });
  }

  function applyProgressiveColorRows() {
  const mode = tech?.value || "";

  // IMPORTANT: this already includes the first row, so do NOT prepend firstColorRow
  const rows = qsa(".row.color-row");
  if (rows.length === 0) return;

  // first row always visible
  rows[0].hidden = false;

  for (let i = 0; i < rows.length; i++) {
    const color = qs(`#color${i + 1}`);
    const angle = qs(`#angle${i + 1}`);
    if (!color) continue;

    const colorFilled = color.value.trim().length > 0;
    let complete = colorFilled;

    if ((mode === "flexo" || mode === "ofszet") && colorFilled) {
      complete = complete && !!angle && angle.value.trim() !== "";
    }

    const next = rows[i + 1];
    if (next) next.hidden = !complete;
  }
}


  function revealNextColorRowIfAllowed(currentColorInput) {
    const m = currentColorInput.id.match(/^color(\d+)$/);
    if (!m) return;
    const idx = Number(m[1]);
    if (!Number.isFinite(idx)) return;

    const mode = tech?.value || "";
    const color = qs(`#color${idx}`);
    const angle = qs(`#angle${idx}`);

    const colorFilled = color && color.value.trim().length > 0;
    if (!colorFilled) return;

    if (mode === "flexo" || mode === "ofszet") {
      if (!angle || angle.value.trim() === "") return;
    }

    const nextRow = qs(`#color${idx + 1}`)?.closest(".row");
    if (nextRow) {
      nextRow.hidden = false;
      qs(`#color${idx + 1}`)?.focus();
    }
  }

  function normalizeIntegerField(input, minValue = 1) {
    const raw = String(input.value ?? "");
    const digits = raw.replace(/[^\d]/g, "");
    if (digits === "") { input.value = ""; return; }

    let n = Number(digits);
    if (!Number.isFinite(n)) n = minValue;
    if (n < minValue) n = minValue;

    input.value = String(n);
  }

  function updateTorzitas() {
    if (!torzitas) return;
    if (torzitasHint) torzitasHint.textContent = "";

    const sys = (koltsegviselo?.value || "").trim(); // policell / poliferr / other / ""
    const v = (kliseV?.value || "").trim();          // "1,14" etc
    const hRaw = (henger?.value ?? "").toString().trim();

    // keep blank unless enough info
    if (!sys || !v || !hRaw) { torzitas.value = ""; return; }

    // only compute for known systems
    if (sys !== "policell" && sys !== "poliferr") { torzitas.value = ""; return; }

    const h = Number(hRaw.replace(",", "."));
    if (!Number.isFinite(h) || h <= 0) { torzitas.value = ""; return; }

    const konst = NYULAS[sys]?.[v];
    if (typeof konst !== "number") {
      torzitas.value = "";
      if (torzitasHint) torzitasHint.textContent = "Nincs adat ehhez a kombinációhoz.";
      return;
    }

    const pct = ((h - konst) / h) * 100;
    const out = pct.toFixed(2).replace(".", ",");
    torzitas.value = `${out}%`;
  }
});
