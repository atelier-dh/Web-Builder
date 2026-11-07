/* Moza Studio V14.6 — native canvas table editing.
   Cells are edited in place on the design canvas. Formatting and table operations
   live in the existing Properties sidebar. No table-editing modal is opened. */
(function () {
  'use strict';
  if (window.__MOZA_V146_CANVAS_TABLE__) return;
  window.__MOZA_V146_CANVAS_TABLE__ = true;

  const bridge = window.__mz13TableBridge;
  if (!bridge) {
    console.warn('[Moza V14.6] Table bridge is unavailable.');
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const clone = value => JSON.parse(JSON.stringify(value ?? {}));
  const clamp = (value, min, max, fallback = min) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
  const fonts = ['Arial', 'Georgia', 'Verdana', 'Tahoma', 'Times New Roman', 'Courier New'];
  const aligns = ['left', 'center', 'right'];
  const verticals = ['top', 'middle', 'bottom'];
  const borderStyles = ['solid', 'dashed', 'dotted', 'double', 'none'];

  let activeTableId = null;
  let selectedCells = [{ r: 0, c: 0 }];
  let rangeMode = false;
  let rangeAnchor = null;
  let focusSession = '';

  function notify(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else console.info('[Moza V14.6]', message);
  }
  function getElement(id) {
    try {
      const found = typeof window.findEl === 'function' ? window.findEl(id) : null;
      return found?.el || null;
    } catch (_) { return null; }
  }
  function currentTable() {
    if (typeof window.T === 'function') {
      const selected = window.T('el');
      if (selected?.tableData) return selected;
    }
    if (activeTableId) {
      const selected = getElement(activeTableId);
      if (selected?.tableData) return selected;
    }
    return null;
  }
  function normalize(data) {
    if (!data || typeof data !== 'object') data = {};
    if (!Array.isArray(data.cells) || !data.cells.length) data.cells = [['']];
    data.cells = data.cells.slice(0, 24).map(row =>
      (Array.isArray(row) ? row : []).slice(0, 12).map(value => String(value ?? ''))
    );
    const cols = Math.max(1, ...data.cells.map(row => row.length));
    data.cells = data.cells.map(row => [...row, ...Array.from({ length: cols - row.length }, () => '')]);
    data.rows = data.cells.length;
    data.cols = cols;
    data.header = data.header !== false;
    data.font = fonts.includes(data.font) ? data.font : 'Arial';
    data.fontSize = clamp(data.fontSize ?? 14, 8, 48, 14);
    data.cellPadding = clamp(data.cellPadding ?? 10, 0, 40, 10);
    data.border = validColor(data.border, '#d9deea');
    data.headerBg = validColor(data.headerBg, '#f1f4fb');
    data.headerColor = validColor(data.headerColor, '#26334d');
    data.cellBg = validColor(data.cellBg, '#ffffff');
    data.textColor = validColor(data.textColor, '#30394b');
    data.borderWidth = clamp(data.borderWidth ?? 1, 0, 8, 1);
    data.borderStyle = borderStyles.includes(data.borderStyle) ? data.borderStyle : 'solid';
    data.align = aligns.includes(data.align) ? data.align : 'left';
    data.verticalAlign = verticals.includes(data.verticalAlign) ? data.verticalAlign : 'middle';
    data.minRowHeight = clamp(data.minRowHeight ?? 0, 0, 300, 0);
    data.tableLayout = data.tableLayout === 'auto' || data.equalColumns === false ? 'auto' : 'fixed';
    data.equalColumns = data.tableLayout === 'fixed';
    if (!data.cellStyles || typeof data.cellStyles !== 'object' || Array.isArray(data.cellStyles)) data.cellStyles = {};

    const cleanMerges = [];
    const occupied = new Set();
    (Array.isArray(data.merges) ? data.merges : []).forEach(item => {
      const r = Math.round(Number(item?.r));
      const c = Math.round(Number(item?.c));
      const rs = Math.round(Number(item?.rs ?? item?.rowspan ?? 1));
      const cs = Math.round(Number(item?.cs ?? item?.colspan ?? 1));
      if (![r, c, rs, cs].every(Number.isFinite) || r < 0 || c < 0 || rs < 1 || cs < 1) return;
      if (r + rs > data.rows || c + cs > data.cols || rs * cs < 2) return;
      let overlap = false;
      for (let rr = r; rr < r + rs; rr++) for (let cc = c; cc < c + cs; cc++) {
        if (occupied.has(`${rr},${cc}`)) overlap = true;
      }
      if (overlap) return;
      for (let rr = r; rr < r + rs; rr++) for (let cc = c; cc < c + cs; cc++) {
        if (rr !== r || cc !== c) occupied.add(`${rr},${cc}`);
      }
      cleanMerges.push({ r, c, rs, cs });
    });
    data.merges = cleanMerges;
    return data;
  }
  const keyOf = (r, c) => `${r},${c}`;
  function cellName(r, c) {
    let n = c + 1, label = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      label = String.fromCharCode(65 + rem) + label;
      n = Math.floor((n - 1) / 26);
    }
    return `${label}${r + 1}`;
  }
  function cellStyle(data, r, c) {
    const own = data.cellStyles?.[keyOf(r, c)] || {};
    const header = data.header && r === 0;
    return {
      font: fonts.includes(own.font) ? own.font : data.font,
      fontSize: clamp(own.fontSize ?? data.fontSize, 8, 48, data.fontSize),
      color: validColor(own.color, header ? data.headerColor : data.textColor),
      bg: validColor(own.bg, header ? data.headerBg : data.cellBg),
      align: aligns.includes(own.align) ? own.align : data.align,
      verticalAlign: verticals.includes(own.verticalAlign) ? own.verticalAlign : data.verticalAlign,
      bold: own.bold == null ? header : !!own.bold,
      italic: !!own.italic,
      underline: !!own.underline,
      padding: clamp(own.padding ?? data.cellPadding, 0, 40, data.cellPadding),
      borderColor: validColor(own.borderColor, data.border),
      borderWidth: clamp(own.borderWidth ?? data.borderWidth, 0, 8, data.borderWidth)
    };
  }
  function cellCss(data, r, c) {
    const s = cellStyle(data, r, c);
    const border = data.borderStyle === 'none' || s.borderWidth === 0
      ? 'none'
      : `${s.borderWidth}px ${data.borderStyle} ${s.borderColor}`;
    return [
      `font-family:${JSON.stringify(s.font)},sans-serif`,
      `font-size:${s.fontSize}px`,
      `color:${s.color}`,
      `background:${s.bg}`,
      `text-align:${s.align}`,
      `vertical-align:${s.verticalAlign}`,
      `font-weight:${s.bold ? 700 : 400}`,
      `font-style:${s.italic ? 'italic' : 'normal'}`,
      `text-decoration:${s.underline ? 'underline' : 'none'}`,
      `padding:${s.padding}px`,
      `border:${border}`,
      'white-space:pre-wrap',
      'overflow-wrap:anywhere',
      'min-height:32px',
      'outline:none'
    ].join(';');
  }
  function mergeMaps(data) {
    const anchors = new Map(), covered = new Set();
    data.merges.forEach(m => {
      anchors.set(keyOf(m.r, m.c), m);
      for (let r = m.r; r < m.r + m.rs; r++) for (let c = m.c; c < m.c + m.cs; c++) {
        if (r !== m.r || c !== m.c) covered.add(keyOf(r, c));
      }
    });
    return { anchors, covered };
  }
  function renderCanvasTable(el) {
    const data = normalize(clone(el.tableData));
    const { anchors, covered } = mergeMaps(data);
    const rows = data.cells.map((row, r) => '<tr>' + row.map((value, c) => {
      if (covered.has(keyOf(r, c))) return '';
      const merge = anchors.get(keyOf(r, c));
      const tag = data.header && r === 0 ? 'th' : 'td';
      const spans = merge ? ` rowspan="${merge.rs}" colspan="${merge.cs}"` : '';
      const content = esc(value).replace(/\r?\n/g, '<br>') || '<br>';
      return `<${tag}${spans} contenteditable="true" tabindex="0" role="textbox" aria-multiline="true" aria-label="Cell ${cellName(r, c)}" data-mz146-cell="${r},${c}" data-mz146-table-id="${esc(el.id)}" style="${esc(cellCss(data, r, c))}">${content}</${tag}>`;
    }).join('') + '</tr>').join('');
    const layout = data.tableLayout === 'auto' ? 'auto' : 'fixed';
    return `<div class="mz146-table-canvas" data-mz146-table-canvas="${esc(el.id)}" style="width:100%;height:100%;overflow:auto;">
      <table class="mz146-table" aria-label="Editable table" style="width:100%;height:100%;border-collapse:collapse;table-layout:${layout};font-family:${JSON.stringify(data.font)},sans-serif;">
        <tbody>${rows}</tbody>
      </table></div>`;
  }
  function getData(el) { return normalize(clone(el?.tableData || {})); }
  function syncEmbed(el, data) {
    el.tableData = data;
    try {
      const serializer = bridge.getDoc();
      if (typeof serializer === 'function') el.embedCode = serializer(data);
    } catch (error) { console.warn('[Moza V14.6] Could not regenerate table HTML', error); }
  }
  function beginUndo() {
    try {
      if (typeof commit === 'function' && typeof discrete === 'function') commit(discrete());
      else if (typeof window.commit === 'function' && typeof window.discrete === 'function') window.commit(window.discrete());
    } catch (_) { /* history adapter not available */ }
  }
  function saveSoon() {
    try { if (typeof window.scheduleSave === 'function') window.scheduleSave(); else scheduleSave(); }
    catch (_) { /* save adapter not available */ }
  }
  function refreshRight() {
    try { if (typeof window.renderRight === 'function') window.renderRight(); else renderRight(); }
    catch (_) { /* panel may not be ready during initial load */ }
  }
  function refreshCanvas() {
    try { if (typeof window.renderCanvas === 'function') window.renderCanvas(); else renderCanvas(); }
    catch (_) { /* canvas may not be ready during initial load */ }
  }
  function markCanvasSelection(id) {
    const frame = $('#frame');
    if (!frame) return;
    $$('.el.selected', frame).forEach(node => {
      node.classList.remove('selected');
      $$('.h', node).forEach(handle => handle.remove());
    });
    const node = $(`.el[data-id="${CSS.escape(String(id))}"]`, frame);
    if (!node) return;
    node.classList.add('selected');
    const el = getElement(id);
    if (el && !el.locked && !$('.h', node)) {
      ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(dir => {
        const handle = document.createElement('i');
        handle.className = `h ${dir}`;
        handle.dataset.h = dir;
        node.appendChild(handle);
      });
      const rotate = document.createElement('i');
      rotate.className = 'h rot';
      rotate.dataset.h = 'rot';
      node.appendChild(rotate);
    }
  }
  function focusTable(id, announce = false) {
    const el = getElement(id);
    if (!el?.tableData) return false;
    activeTableId = id;
    if (typeof S !== 'undefined') {
      S.multi = [];
      S.sel = { k: 'el', id };
      S.lastDown = null;
    }
    if (!selectedCells.length) selectedCells = [{ r: 0, c: 0 }];
    markCanvasSelection(id);
    updateCanvasSelection();
    refreshRight();
    if (announce) notify('Tabel siap diedit langsung di canvas.');
    return true;
  }
  function selectedRect(cells) {
    if (!cells?.length) return null;
    const rs = cells.map(cell => cell.r), cs = cells.map(cell => cell.c);
    const r1 = Math.min(...rs), r2 = Math.max(...rs), c1 = Math.min(...cs), c2 = Math.max(...cs);
    if ((r2 - r1 + 1) * (c2 - c1 + 1) !== cells.length) return null;
    const set = new Set(cells.map(cell => keyOf(cell.r, cell.c)));
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (!set.has(keyOf(r, c))) return null;
    return { r: r1, c: c1, rs: r2 - r1 + 1, cs: c2 - c1 + 1 };
  }
  function rectangleCells(a, b) {
    const cells = [];
    for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++)
      for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) cells.push({ r, c });
    return cells;
  }
  function intersects(a, b) {
    return !(a.r + a.rs <= b.r || b.r + b.rs <= a.r || a.c + a.cs <= b.c || b.c + b.cs <= a.c);
  }
  function selectedMerges(data) {
    return data.merges.filter(m => selectedCells.some(cell =>
      cell.r >= m.r && cell.r < m.r + m.rs && cell.c >= m.c && cell.c < m.c + m.cs
    ));
  }
  function selectionLabel() {
    if (!selectedCells.length) return 'Belum ada sel dipilih';
    const rect = selectedRect(selectedCells);
    if (rect && selectedCells.length > 1) {
      return `${cellName(rect.r, rect.c)}:${cellName(rect.r + rect.rs - 1, rect.c + rect.cs - 1)} · ${selectedCells.length} sel`;
    }
    const first = selectedCells[0];
    return `${cellName(first.r, first.c)} · ${first.r + 1}.${first.c + 1}`;
  }
  function updateCanvasSelection() {
    const frame = $('#frame');
    if (!frame || !activeTableId) return;
    const root = $(`[data-mz146-table-canvas="${CSS.escape(String(activeTableId))}"]`, frame);
    if (!root) return;
    $$('.mz146-cell-selected', root).forEach(node => node.classList.remove('mz146-cell-selected'));
    selectedCells.forEach(({ r, c }) => {
      $(`[data-mz146-cell="${r},${c}"]`, root)?.classList.add('mz146-cell-selected');
    });
  }
  function currentCellStyle(data) {
    const cell = selectedCells[0] || { r: 0, c: 0 };
    return cellStyle(data, cell.r, cell.c);
  }
  function options(values, selected) {
    return values.map(([value, label]) => `<option value="${esc(value)}" ${String(selected) === String(value) ? 'selected' : ''}>${esc(label)}</option>`).join('');
  }
  function field(label, html) { return `<label class="mz146-field"><span>${esc(label)}</span>${html}</label>`; }
  function panelHTML(el) {
    const data = getData(el);
    const style = currentCellStyle(data);
    const rect = selectedRect(selectedCells);
    const canMerge = !!rect && rect.rs * rect.cs > 1 && !data.merges.some(m => intersects(rect, m));
    const canSplit = selectedMerges(data).length > 0;
    const status = rangeMode
      ? (rangeAnchor ? `Titik awal ${cellName(rangeAnchor.r, rangeAnchor.c)} dipilih. Sekarang tap sel akhir.` : 'Tap sel pertama, lalu tap sel terakhir.')
      : `Sel aktif: ${selectionLabel()}`;
    return `<section class="mz146-table-properties" data-mz146-panel>
      <div class="mz146-head"><b>▦ Table · Canvas Editor</b><span>LIVE</span></div>
      <p class="mz146-help">Klik teks pada tabel di canvas untuk mengetik langsung. Pilih satu sel untuk mengatur formatnya. Seret bingkai atau handle untuk memindahkan dan mengubah ukuran tabel.</p>
      <div class="mz146-selection" data-mz146-selection>${esc(status)}</div>
      <div class="mz146-actions">
        <button type="button" data-mz146-action="range" class="${rangeMode ? 'on' : ''}">${rangeMode ? 'Batalkan pilih rentang' : 'Pilih rentang sel'}</button>
        <button type="button" data-mz146-action="merge" ${canMerge ? '' : 'disabled'}>Merge</button>
        <button type="button" data-mz146-action="split" ${canSplit ? '' : 'disabled'}>Split</button>
      </div>
      <details open class="mz146-details"><summary>Format sel terpilih</summary>
        <small>Perubahan hanya berlaku untuk ${selectedCells.length || 1} sel yang dipilih.</small>
        <div class="mz146-fields">
          ${field('Font', `<select data-mz146-cell-prop="font">${options(fonts.map(v => [v, v]), style.font)}</select>`)}
          ${field('Ukuran font', `<input type="number" min="8" max="48" data-mz146-cell-prop="fontSize" value="${style.fontSize}">`)}
          ${field('Warna teks', `<input type="color" data-mz146-cell-prop="color" value="${style.color}">`)}
          ${field('Background sel', `<input type="color" data-mz146-cell-prop="bg" value="${style.bg}">`)}
          ${field('Alignment horizontal', `<select data-mz146-cell-prop="align">${options([['left','Kiri'],['center','Tengah'],['right','Kanan']], style.align)}</select>`)}
          ${field('Alignment vertikal', `<select data-mz146-cell-prop="verticalAlign">${options([['top','Atas'],['middle','Tengah'],['bottom','Bawah']], style.verticalAlign)}</select>`)}
          ${field('Padding (px)', `<input type="number" min="0" max="40" data-mz146-cell-prop="padding" value="${style.padding}">`)}
          ${field('Warna border', `<input type="color" data-mz146-cell-prop="borderColor" value="${style.borderColor}">`)}
          ${field('Lebar border', `<input type="number" min="0" max="8" data-mz146-cell-prop="borderWidth" value="${style.borderWidth}">`)}
        </div>
        <div class="mz146-toggles">
          <label><input type="checkbox" data-mz146-cell-prop="bold" ${style.bold ? 'checked' : ''}> Bold</label>
          <label><input type="checkbox" data-mz146-cell-prop="italic" ${style.italic ? 'checked' : ''}> Italic</label>
          <label><input type="checkbox" data-mz146-cell-prop="underline" ${style.underline ? 'checked' : ''}> Underline</label>
          <button type="button" data-mz146-action="reset-style">Reset format sel</button>
        </div>
      </details>
      <details class="mz146-details"><summary>Baris dan kolom</summary>
        <div class="mz146-structural">
          <button type="button" data-mz146-action="row-before">＋ Baris di atas</button>
          <button type="button" data-mz146-action="row-after">＋ Baris di bawah</button>
          <button type="button" data-mz146-action="col-before">＋ Kolom di kiri</button>
          <button type="button" data-mz146-action="col-after">＋ Kolom di kanan</button>
          <button type="button" data-mz146-action="delete-row">Hapus baris terpilih</button>
          <button type="button" data-mz146-action="delete-col">Hapus kolom terpilih</button>
          <button type="button" data-mz146-action="add-row-end">＋ Baris terakhir</button>
          <button type="button" data-mz146-action="add-col-end">＋ Kolom terakhir</button>
        </div>
      </details>
      <details class="mz146-details"><summary>Tampilan seluruh tabel</summary>
        <div class="mz146-fields">
          ${field('Baris pertama sebagai header', `<input type="checkbox" data-mz146-table-prop="header" ${data.header ? 'checked' : ''}>`)}
          ${field('Font default', `<select data-mz146-table-prop="font">${options(fonts.map(v => [v, v]), data.font)}</select>`)}
          ${field('Ukuran font default', `<input type="number" min="8" max="48" data-mz146-table-prop="fontSize" value="${data.fontSize}">`)}
          ${field('Background header', `<input type="color" data-mz146-table-prop="headerBg" value="${data.headerBg}">`)}
          ${field('Warna teks header', `<input type="color" data-mz146-table-prop="headerColor" value="${data.headerColor}">`)}
          ${field('Background sel default', `<input type="color" data-mz146-table-prop="cellBg" value="${data.cellBg}">`)}
          ${field('Warna teks default', `<input type="color" data-mz146-table-prop="textColor" value="${data.textColor}">`)}
          ${field('Alignment default', `<select data-mz146-table-prop="align">${options([['left','Kiri'],['center','Tengah'],['right','Kanan']], data.align)}</select>`)}
          ${field('Vertical alignment default', `<select data-mz146-table-prop="verticalAlign">${options([['top','Atas'],['middle','Tengah'],['bottom','Bawah']], data.verticalAlign)}</select>`)}
          ${field('Padding default', `<input type="number" min="0" max="40" data-mz146-table-prop="cellPadding" value="${data.cellPadding}">`)}
          ${field('Warna border default', `<input type="color" data-mz146-table-prop="border" value="${data.border}">`)}
          ${field('Lebar border default', `<input type="number" min="0" max="8" data-mz146-table-prop="borderWidth" value="${data.borderWidth}">`)}
          ${field('Gaya border', `<select data-mz146-table-prop="borderStyle">${options(borderStyles.map(v => [v, v]), data.borderStyle)}</select>`)}
          ${field('Lebar kolom', `<select data-mz146-table-prop="tableLayout">${options([['fixed','Sama rata'],['auto','Sesuai isi']], data.tableLayout)}</select>`)}
          ${field('Tinggi baris minimum', `<input type="number" min="0" max="300" data-mz146-table-prop="minRowHeight" value="${data.minRowHeight}">`)}
        </div>
      </details>
      <div class="mz146-footnote">Isi sel tersimpan otomatis ke project. Preview dan hasil publish memakai data tabel yang sama.</div>
    </section>`;
  }

  const styleTag = document.createElement('style');
  styleTag.id = 'moza-v146-canvas-table-css';
  styleTag.textContent = `
    #frame .mz146-table-canvas{display:block;position:relative;width:100%;height:100%;max-width:100%;overflow:auto;overscroll-behavior:contain;background:transparent;isolation:isolate}
    #frame .mz146-table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed;max-width:100%;}
    #frame .mz146-table td,#frame .mz146-table th{box-sizing:border-box;min-width:24px;cursor:text;user-select:text;-webkit-user-select:text;touch-action:manipulation;outline:none;}
    #frame .mz146-table td:focus,#frame .mz146-table th:focus{outline:2px solid #6854e8!important;outline-offset:-2px;}
    #frame .mz146-table .mz146-cell-selected{box-shadow:inset 0 0 0 2px #6854e8!important;}
    #right .mz146-table-properties{margin:10px 0 14px;padding:12px;border:1px solid #d8e1f4;border-radius:12px;background:#f8faff;color:#2d3b58;font:12px/1.45 system-ui,sans-serif;min-width:0;}
    #right .mz146-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
    #right .mz146-head b{font-size:13px;color:#2d3b58;}
    #right .mz146-head span{font-size:9px;font-weight:800;letter-spacing:.5px;border-radius:20px;background:#e9f8ef;color:#167447;padding:4px 7px;}
    #right .mz146-help{margin:6px 0 9px;color:#66738d;font-size:11px;}
    #right .mz146-selection{padding:8px 9px;margin:7px 0;background:#eef2ff;border:1px solid #dce3ff;border-radius:8px;color:#4b58a5;font-size:11px;font-weight:650;}
    #right .mz146-actions{display:grid;grid-template-columns:1.35fr .8fr .8fr;gap:5px;margin:8px 0 10px;}
    #right .mz146-table-properties button{min-width:0;max-width:100%;padding:7px 6px;border:1px solid #d4dced;border-radius:7px;background:#fff;color:#34435f;font-size:10px;line-height:1.25;cursor:pointer;white-space:normal;}
    #right .mz146-table-properties button.on{background:#eeeaff;border-color:#9283ef;color:#5142bd;}
    #right .mz146-table-properties button:disabled{opacity:.38;cursor:not-allowed;}
    #right .mz146-details{margin:8px 0;border:1px solid #e0e6f1;border-radius:9px;padding:8px;background:#fff;}
    #right .mz146-details summary{font-size:11px;font-weight:750;color:#3d4b68;cursor:pointer;}
    #right .mz146-details>small{display:block;margin:6px 0;color:#78859a;font-size:10px;}
    #right .mz146-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:9px;}
    #right .mz146-field{display:grid;gap:4px;min-width:0;font-size:10px;color:#697790;}
    #right .mz146-field>span{line-height:1.25;}
    #right .mz146-field input:not([type=checkbox]),#right .mz146-field select{width:100%;min-width:0;max-width:100%;box-sizing:border-box;padding:6px;border:1px solid #dce3ef;border-radius:6px;background:#fff;color:#34415a;font:11px system-ui,sans-serif;}
    #right .mz146-field input[type=color]{height:30px;padding:3px;}
    #right .mz146-field input[type=checkbox]{width:15px;height:15px;accent-color:#6250df;}
    #right .mz146-toggles{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-top:9px;}
    #right .mz146-toggles label{display:flex;align-items:center;gap:4px;font-size:10px;color:#56647d;}
    #right .mz146-toggles input{accent-color:#6250df;}
    #right .mz146-structural{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:9px;}
    #right .mz146-footnote{margin-top:8px;color:#8390a5;font-size:9px;line-height:1.4;}
    @media(max-width:360px){#right .mz146-fields{grid-template-columns:minmax(0,1fr)}#right .mz146-actions{grid-template-columns:1fr 1fr 1fr}}
    /* Advanced menu closes on outside interaction; keep it bounded to the viewport. */
    #top .mz13-overflow-list{max-height:min(52vh,420px)!important;max-height:min(52dvh,420px)!important;overscroll-behavior:contain!important;}
  `;
  document.head.appendChild(styleTag);

  // In the design editor, render a native HTML table instead of a non-interactive sandbox iframe.
  const oldEmbedRenderer = window.a319RenderEmbed;
  if (typeof oldEmbedRenderer === 'function') {
    const wrappedEmbedRenderer = function (el, edit) {
      if (edit && el?.tableData && Array.isArray(el.tableData.cells)) return renderCanvasTable(el);
      return oldEmbedRenderer.apply(this, arguments);
    };
    window.a319RenderEmbed = wrappedEmbedRenderer;
    try { a319RenderEmbed = wrappedEmbedRenderer; } catch (_) { /* global binding may be immutable in a future build */ }
  }

  // Replace the modal entry points. The V14.5 bridge and serialization remain in use.
  bridge.editTable = function (el) {
    if (!el?.id) return false;
    return focusTable(el.id, true);
  };
  try {
    if (typeof ACT !== 'undefined') {
      ACT['at321-edit-table'] = () => {
        const el = typeof T === 'function' ? T('el') : null;
        if (el?.tableData) focusTable(el.id, true);
      };
    }
  } catch (_) { /* command registry may not be ready */ }
  $('#at321-table-modal')?.remove();

  // Add a contextual inspector to the existing Properties sidebar, never a floating modal.
  const previousRenderRight = window.renderRight;
  if (typeof previousRenderRight === 'function' && !previousRenderRight.__mz146) {
    const wrappedRenderRight = function () {
      const result = previousRenderRight.apply(this, arguments);
      const pane = $('#right');
      if (!pane) return result;
      $('.at321-table-properties', pane)?.remove();
      $('.mz145-table-properties', pane)?.remove();
      $('.mz146-table-properties', pane)?.remove();
      const el = typeof window.T === 'function' ? window.T('el') : null;
      if (el?.tableData) {
        if (activeTableId !== el.id) {
          activeTableId = el.id;
          selectedCells = [{ r: 0, c: 0 }];
          rangeMode = false;
          rangeAnchor = null;
          updateCanvasSelection();
        }
        const section = document.createElement('div');
        section.innerHTML = panelHTML(el);
        const panel = section.firstElementChild;
        if (panel) pane.appendChild(panel);
      }
      return result;
    };
    wrappedRenderRight.__mz146 = true;
    window.renderRight = wrappedRenderRight;
    try { renderRight = wrappedRenderRight; } catch (_) { /* global binding may be immutable */ }
  }

  function applyStyleToCanvas(el, data) {
    const root = $(`[data-mz146-table-canvas="${CSS.escape(String(el.id))}"]`, $('#frame') || document);
    if (!root) return;
    $$('.mz146-table [data-mz146-cell]', root).forEach(cell => {
      const [r, c] = cell.dataset.mz146Cell.split(',').map(Number);
      cell.style.cssText = cellCss(data, r, c);
    });
    const table = $('.mz146-table', root);
    if (table) {
      table.style.tableLayout = data.tableLayout === 'auto' ? 'auto' : 'fixed';
      table.style.fontFamily = `${JSON.stringify(data.font)},sans-serif`;
    }
    updateCanvasSelection();
  }
  function mutateCurrent(mutator, rerender = false) {
    const el = currentTable();
    if (!el?.tableData) return false;
    const data = getData(el);
    beginUndo();
    mutator(data, el);
    normalize(data);
    syncEmbed(el, data);
    if (rerender) {
      refreshCanvas();
      markCanvasSelection(el.id);
      applyStyleToCanvas(el, data);
      refreshRight();
    } else {
      applyStyleToCanvas(el, data);
    }
    saveSoon();
    return true;
  }
  function shiftStylesRows(data, index, direction) {
    const next = {};
    Object.entries(data.cellStyles || {}).forEach(([key, value]) => {
      const [r, c] = key.split(',').map(Number);
      if (direction === 'insert') next[keyOf(r >= index ? r + 1 : r, c)] = value;
      else if (r !== index) next[keyOf(r > index ? r - 1 : r, c)] = value;
    });
    data.cellStyles = next;
  }
  function shiftStylesCols(data, index, direction) {
    const next = {};
    Object.entries(data.cellStyles || {}).forEach(([key, value]) => {
      const [r, c] = key.split(',').map(Number);
      if (direction === 'insert') next[keyOf(r, c >= index ? c + 1 : c)] = value;
      else if (c !== index) next[keyOf(r, c > index ? c - 1 : c)] = value;
    });
    data.cellStyles = next;
  }
  function adjustMergesRows(data, index, direction) {
    data.merges = data.merges.map(m => {
      const item = { ...m };
      if (direction === 'insert') {
        if (index <= item.r) item.r++;
        else if (index < item.r + item.rs) item.rs++;
      } else {
        if (index < item.r) item.r--;
        else if (index >= item.r && index < item.r + item.rs) item.rs--;
      }
      return item;
    }).filter(m => m.rs > 0 && m.cs > 0 && m.rs * m.cs > 1);
  }
  function adjustMergesCols(data, index, direction) {
    data.merges = data.merges.map(m => {
      const item = { ...m };
      if (direction === 'insert') {
        if (index <= item.c) item.c++;
        else if (index < item.c + item.cs) item.cs++;
      } else {
        if (index < item.c) item.c--;
        else if (index >= item.c && index < item.c + item.cs) item.cs--;
      }
      return item;
    }).filter(m => m.rs > 0 && m.cs > 0 && m.rs * m.cs > 1);
  }
  function afterStructure(nextCell) {
    selectedCells = [nextCell];
    rangeMode = false;
    rangeAnchor = null;
  }
  function performAction(action) {
    const el = currentTable();
    if (!el?.tableData) return;
    const first = selectedCells[0] || { r: 0, c: 0 };
    if (action === 'range') {
      rangeMode = !rangeMode;
      rangeAnchor = null;
      if (rangeMode) selectedCells = [];
      else if (!selectedCells.length) selectedCells = [{ r: 0, c: 0 }];
      updateCanvasSelection();
      refreshRight();
      if (rangeMode) notify('Tap sel pertama di canvas, kemudian tap sel terakhir.');
      return;
    }
    if (action === 'merge') {
      const rect = selectedRect(selectedCells);
      if (!rect || rect.rs * rect.cs < 2) return notify('Pilih minimal dua sel dalam satu area persegi panjang.');
      const data = getData(el);
      if (data.merges.some(m => intersects(rect, m))) return notify('Rentang bersinggungan dengan merge lain. Split merge lama terlebih dahulu.');
      mutateCurrent(d => { d.merges.push(rect); }, true);
      selectedCells = [{ r: rect.r, c: rect.c }];
      updateCanvasSelection();
      refreshRight();
      notify('Sel berhasil digabung. Isi sel yang tertutup tetap disimpan dan dapat dipulihkan dengan Split.');
      return;
    }
    if (action === 'split') {
      const data = getData(el);
      const targets = selectedMerges(data);
      if (!targets.length) return notify('Pilih sel yang sedang berada di dalam area merge.');
      mutateCurrent(d => {
        const targetSet = new Set(targets.map(m => keyOf(m.r, m.c)));
        d.merges = d.merges.filter(m => !targetSet.has(keyOf(m.r, m.c)));
      }, true);
      updateCanvasSelection();
      refreshRight();
      notify('Merge dipisahkan. Isi sel sebelumnya dipulihkan.');
      return;
    }
    if (action === 'reset-style') {
      mutateCurrent(d => selectedCells.forEach(cell => { delete d.cellStyles[keyOf(cell.r, cell.c)]; }), false);
      refreshRight();
      return;
    }
    const r = clamp(first.r, 0, 23, 0), c = clamp(first.c, 0, 11, 0);
    if (action === 'row-before' || action === 'row-after' || action === 'add-row-end') {
      if (el.tableData.cells.length >= 24) return notify('Maksimum 24 baris.');
      const index = action === 'add-row-end' ? el.tableData.cells.length : r + (action === 'row-after' ? 1 : 0);
      mutateCurrent(d => {
        d.cells.splice(index, 0, Array.from({ length: d.cols }, () => ''));
        shiftStylesRows(d, index, 'insert');
        adjustMergesRows(d, index, 'insert');
      }, true);
      afterStructure({ r: index, c: Math.min(c, el.tableData.cols - 1) });
      updateCanvasSelection(); refreshRight(); return;
    }
    if (action === 'col-before' || action === 'col-after' || action === 'add-col-end') {
      if (el.tableData.cols >= 12) return notify('Maksimum 12 kolom.');
      const index = action === 'add-col-end' ? el.tableData.cols : c + (action === 'col-after' ? 1 : 0);
      mutateCurrent(d => {
        d.cells.forEach(row => row.splice(index, 0, ''));
        shiftStylesCols(d, index, 'insert');
        adjustMergesCols(d, index, 'insert');
      }, true);
      afterStructure({ r: Math.min(r, el.tableData.rows - 1), c: index });
      updateCanvasSelection(); refreshRight(); return;
    }
    if (action === 'delete-row') {
      if (el.tableData.rows <= 1) return notify('Tabel harus memiliki minimal satu baris.');
      mutateCurrent(d => {
        d.cells.splice(r, 1);
        shiftStylesRows(d, r, 'delete');
        adjustMergesRows(d, r, 'delete');
      }, true);
      afterStructure({ r: Math.min(r, el.tableData.rows - 1), c: Math.min(c, el.tableData.cols - 1) });
      updateCanvasSelection(); refreshRight(); return;
    }
    if (action === 'delete-col') {
      if (el.tableData.cols <= 1) return notify('Tabel harus memiliki minimal satu kolom.');
      mutateCurrent(d => {
        d.cells.forEach(row => row.splice(c, 1));
        shiftStylesCols(d, c, 'delete');
        adjustMergesCols(d, c, 'delete');
      }, true);
      afterStructure({ r: Math.min(r, el.tableData.rows - 1), c: Math.min(c, el.tableData.cols - 1) });
      updateCanvasSelection(); refreshRight(); return;
    }
  }

  function applyCellProperty(input) {
    const prop = input.dataset.mz146CellProp;
    const value = input.type === 'checkbox' ? input.checked
      : input.type === 'number' ? clamp(input.value, prop === 'fontSize' ? 8 : 0, prop === 'fontSize' ? 48 : prop === 'borderWidth' ? 8 : 40, prop === 'fontSize' ? 14 : 0)
      : input.value;
    mutateCurrent(data => {
      selectedCells.forEach(cell => {
        const key = keyOf(cell.r, cell.c);
        if (!data.cellStyles[key]) data.cellStyles[key] = {};
        data.cellStyles[key][prop] = value;
      });
    }, false);
  }
  function applyTableProperty(input) {
    const prop = input.dataset.mz146TableProp;
    const value = input.type === 'checkbox' ? input.checked
      : input.type === 'number' ? Number(input.value)
      : input.value;
    const needsRerender = prop === 'header';
    mutateCurrent(data => {
      data[prop] = value;
      if (prop === 'tableLayout') data.equalColumns = value !== 'auto';
      normalize(data);
    }, needsRerender);
    if (!needsRerender) refreshRight();
  }

  function setCaretAtPoint(cell, x, y) {
    try {
      let range = document.caretRangeFromPoint?.(x, y);
      if (!range && document.caretPositionFromPoint) {
        const pos = document.caretPositionFromPoint(x, y);
        if (pos) { range = document.createRange(); range.setStart(pos.offsetNode, pos.offset); range.collapse(true); }
      }
      if (range && cell.contains(range.startContainer)) {
        const selection = window.getSelection();
        selection.removeAllRanges(); selection.addRange(range);
      }
    } catch (_) { /* Safari may not expose caret geometry in every context */ }
  }
  function handleCanvasCellPointer(event) {
    const cell = event.target.closest?.('#frame [data-mz146-cell][data-mz146-table-id]');
    if (!cell) return;
    if (typeof S !== 'undefined' && S.mode !== 'design') return;
    const id = cell.dataset.mz146TableId;
    const [r, c] = cell.dataset.mz146Cell.split(',').map(Number);
    const el = getElement(id);
    if (!el?.tableData) return;
    if (activeTableId !== id) {
      activeTableId = id;
      selectedCells = [{ r, c }];
      rangeMode = false;
      rangeAnchor = null;
    }
    focusTable(id, false);

    if (rangeMode) {
      event.preventDefault();
      event.stopPropagation();
      if (!rangeAnchor) {
        rangeAnchor = { r, c };
        selectedCells = [{ r, c }];
      } else {
        selectedCells = rectangleCells(rangeAnchor, { r, c });
        rangeMode = false;
        rangeAnchor = null;
        notify(`Rentang ${selectionLabel()} dipilih.`);
      }
      updateCanvasSelection();
      refreshRight();
      return;
    }

    selectedCells = [{ r, c }];
    updateCanvasSelection();
    refreshRight();
    // Stop the canvas drag handler. Focus synchronously inside the user gesture
    // so Safari on iPad can open its virtual keyboard on the first tap.
    event.stopPropagation();
    try { cell.focus({ preventScroll: true }); } catch (_) { cell.focus(); }
    setCaretAtPoint(cell, event.clientX, event.clientY);
  }

  const frame = $('#frame');
  if (frame) frame.addEventListener('pointerdown', handleCanvasCellPointer, true);

  document.addEventListener('focusin', event => {
    const cell = event.target.closest?.('#frame [data-mz146-cell][data-mz146-table-id]');
    if (!cell) return;
    const key = `${cell.dataset.mz146TableId}:${cell.dataset.mz146Cell}`;
    if (focusSession !== key) { beginUndo(); focusSession = key; }
  }, true);
  document.addEventListener('focusout', event => {
    if (event.target.closest?.('#frame [data-mz146-cell][data-mz146-table-id]')) focusSession = '';
  }, true);
  document.addEventListener('input', event => {
    const cell = event.target.closest?.('#frame [data-mz146-cell][data-mz146-table-id]');
    if (!cell) return;
    const el = getElement(cell.dataset.mz146TableId);
    if (!el?.tableData) return;
    const [r, c] = cell.dataset.mz146Cell.split(',').map(Number);
    const data = getData(el);
    if (!data.cells[r]) return;
    let value = typeof cell.innerText === 'string' ? cell.innerText : cell.textContent || '';
    value = value.replace(/\r\n?/g, '\n').replace(/\u00a0/g, ' ').replace(/\n$/, '');
    data.cells[r][c] = value;
    syncEmbed(el, data);
    saveSoon();
  }, true);
  document.addEventListener('paste', event => {
    const cell = event.target.closest?.('#frame [data-mz146-cell][data-mz146-table-id]');
    if (!cell) return;
    const text = event.clipboardData?.getData('text/plain');
    if (text == null) return;
    event.preventDefault();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    const node = document.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range);
    cell.dispatchEvent(new Event('input', { bubbles: true }));
  }, true);
  document.addEventListener('keydown', event => {
    if (!event.target.closest?.('#frame [data-mz146-cell][data-mz146-table-id]')) return;
    if (event.key === 'Escape') { event.preventDefault(); event.target.blur(); }
    // Keep Delete, arrows and shortcuts inside the editable table cell.
    event.stopPropagation();
  }, true);

  document.addEventListener('click', event => {
    const button = event.target.closest?.('#right [data-mz146-action]');
    if (!button) return;
    event.preventDefault();
    performAction(button.dataset.mz146Action);
  }, true);
  document.addEventListener('change', event => {
    const cellInput = event.target.closest?.('#right [data-mz146-cell-prop]');
    if (cellInput) { applyCellProperty(cellInput); return; }
    const tableInput = event.target.closest?.('#right [data-mz146-table-prop]');
    if (tableInput) applyTableProperty(tableInput);
  }, true);

  // Close the Advanced overflow when the user moves to the canvas or another panel.
  function closeAdvancedOutside(event) {
    const menu = $('#top .mz13-overflow');
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  }
  document.addEventListener('pointerdown', closeAdvancedOutside, true);
  document.addEventListener('touchstart', closeAdvancedOutside, { capture: true, passive: true });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = $('#top .mz13-overflow');
    if (menu?.open) { menu.open = false; }
  }, true);
  document.addEventListener('scroll', event => {
    const menu = $('#top .mz13-overflow');
    if (menu?.open && !menu.contains(event.target)) menu.open = false;
  }, true);
  window.addEventListener('resize', () => {
    const menu = $('#top .mz13-overflow');
    if (menu?.open) menu.open = false;
  }, { passive: true });

  // If a table was already selected when the page reloaded, restore its inspector.
  try {
    const selected = typeof window.T === 'function' ? window.T('el') : null;
    if (selected?.tableData) {
      activeTableId = selected.id;
      selectedCells = [{ r: 0, c: 0 }];
      window.setTimeout(() => { markCanvasSelection(selected.id); updateCanvasSelection(); refreshRight(); }, 0);
    }
  } catch (_) { /* editor may still be booting */ }

  window.MozaCanvasTableEditor = {
    version: '14.6.0',
    focusTable,
    getSelection: () => ({ tableId: activeTableId, cells: clone(selectedCells), rangeMode }),
    renderCanvasTable
  };
  console.info('[Moza V14.6] Direct canvas table editing installed.');
})();
