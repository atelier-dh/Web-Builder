/* Moza Studio V14.5 — spreadsheet-style table editor.
   Fixes merge/split schema compatibility, per-cell formatting, responsive preview,
   and keeps table editing available from the Properties panel. */
(function () {
  'use strict';
  if (window.__MOZA_V145_TABLE_EDITOR__) return;
  window.__MOZA_V145_TABLE_EDITOR__ = true;

  const bridge = window.__mz13TableBridge;
  if (!bridge) {
    console.warn('[Moza V14.5] Table bridge is unavailable.');
    return;
  }

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const clamp = (value, min, max, fallback = min) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  const validColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? value : fallback;
  const fonts = ['Arial', 'Inter', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Courier New', 'Trebuchet MS', 'system-ui'];
  const alignments = ['left', 'center', 'right'];
  const verticals = ['top', 'middle', 'bottom'];
  const borderStyles = ['solid', 'dashed', 'dotted', 'double', 'none'];

  const styleTag = document.createElement('style');
  styleTag.id = 'moza-v145-table-editor-css';
  styleTag.textContent = `
    #at321-table-modal.mz145-modal{
      position:fixed!important;inset:0!important;z-index:2147483000!important;
      display:flex!important;align-items:center!important;justify-content:center!important;
      padding:12px!important;background:rgba(13,20,38,.68)!important;
      -webkit-backdrop-filter:blur(3px);backdrop-filter:blur(3px);
    }
    #at321-table-modal .mz145-dialog{
      width:min(1180px,calc(100vw - 24px))!important;
      max-width:1180px!important;max-height:94vh!important;max-height:calc(100dvh - 24px)!important;
      height:auto!important;min-height:0!important;overflow:hidden!important;
      display:flex!important;flex-direction:column!important;gap:10px!important;
      padding:14px!important;border-radius:16px!important;background:#fff!important;
      color:#26334d!important;box-sizing:border-box!important;
    }
    #at321-table-modal .mz145-header{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:0 0 auto}
    #at321-table-modal .mz145-header b{display:block;font-size:16px;line-height:1.25}
    #at321-table-modal .mz145-header small{display:block;margin-top:4px;color:#75829b;font-size:11px;line-height:1.4}
    #at321-table-modal .mz145-header button{width:36px;height:36px;padding:0;font-size:22px;line-height:1}
    #at321-table-modal .mz145-toolbar{display:grid;gap:6px;flex:0 0 auto}
    #at321-table-modal .mz145-toolbar-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:7px;border:1px solid #e3e8f2;border-radius:9px;background:#f7f9fd}
    #at321-table-modal .mz145-toolbar button{font-size:11px;padding:7px 9px;white-space:normal}
    #at321-table-modal .mz145-toolbar button.active{background:#eeeaff;border-color:#8d7af0;color:#5141b8}
    #at321-table-modal .mz145-toolbar button:disabled{opacity:.38;cursor:not-allowed}
    #at321-table-modal [data-mz145-selection-label]{font-size:11px;color:#586783;margin-left:auto;white-space:normal}
    #at321-table-modal .mz145-content{
      display:grid;grid-template-columns:minmax(0,1.55fr) minmax(270px,.75fr);
      gap:12px;min-height:0;flex:1 1 auto;overflow:auto;align-content:start;padding:1px 2px 5px;
      overscroll-behavior:contain;-webkit-overflow-scrolling:touch;
    }
    #at321-table-modal .mz145-grid-card,
    #at321-table-modal .mz145-inspector,
    #at321-table-modal .mz145-preview{
      min-width:0;border:1px solid #e0e6f1;border-radius:11px;background:#fff;padding:10px;
    }
    #at321-table-modal .mz145-card-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px}
    #at321-table-modal .mz145-card-heading b{display:block;font-size:12px;color:#33415e}
    #at321-table-modal .mz145-card-heading small{display:block;margin-top:3px;font-size:10px;line-height:1.4;color:#7d8aa2}
    #at321-table-modal .mz145-card-heading>span{font-size:9px;font-weight:800;letter-spacing:.6px;color:#5c60d9;background:#f0efff;border-radius:20px;padding:5px 8px}
    #at321-table-modal .mz145-grid-wrap{
      width:100%;max-height:42vh;max-height:min(42dvh,430px);min-height:170px;
      overflow:auto;border:1px solid #e1e7f1;border-radius:8px;
      -webkit-overflow-scrolling:touch;overscroll-behavior:contain;
    }
    #at321-table-modal .mz145-grid{border-collapse:separate;border-spacing:0;table-layout:fixed;width:max-content;min-width:100%;margin:0}
    #at321-table-modal .mz145-grid td{
      width:150px;min-width:150px;max-width:240px;padding:5px;vertical-align:top;
      border-right:1px solid #e0e6f1;border-bottom:1px solid #e0e6f1;background:#fff;
    }
    #at321-table-modal .mz145-grid tr:first-child td{border-top:0}
    #at321-table-modal .mz145-grid td:first-child{border-left:0}
    #at321-table-modal .mz145-cell-selected{box-shadow:inset 0 0 0 2px #6854e8!important;background:#f5f2ff!important}
    #at321-table-modal .mz145-cell-pick{
      display:block;width:100%;text-align:left;border:0!important;border-radius:5px!important;
      padding:3px 5px!important;margin:0 0 4px!important;background:#f2f5fb!important;
      color:#687895!important;font-size:9px!important;font-weight:750!important;
    }
    #at321-table-modal .mz145-cell-pick:focus-visible{outline:2px solid #8b7cf1;outline-offset:1px}
    #at321-table-modal .mz145-cell-input{
      display:block;width:100%;min-width:0;min-height:58px;resize:vertical;box-sizing:border-box;
      margin:0;padding:7px;border:1px solid #dce3ef;border-radius:6px;
      font:12px/1.4 Arial,sans-serif;color:#30394b;background:#fff;overflow-wrap:anywhere;
    }
    #at321-table-modal .mz145-inspector{display:grid;align-content:start;gap:9px}
    #at321-table-modal .mz145-cell-properties,
    #at321-table-modal .mz145-details{
      min-width:0;border:1px solid #e2e7f0;border-radius:9px;padding:9px;background:#fbfcff;
    }
    #at321-table-modal .mz145-panel-title{display:flex;align-items:center;justify-content:space-between;gap:8px}
    #at321-table-modal .mz145-panel-title b{font-size:12px;color:#33415e}
    #at321-table-modal .mz145-panel-title button{padding:5px 8px;font-size:10px}
    #at321-table-modal .mz145-cell-properties>small{display:block;margin:5px 0 9px;color:#77849a;font-size:10px;line-height:1.4}
    #at321-table-modal .mz145-details summary{font-size:11px;font-weight:750;color:#394967;cursor:pointer}
    #at321-table-modal .mz145-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:9px}
    #at321-table-modal .mz145-field{display:grid;gap:4px;min-width:0;font-size:10px;color:#65738b}
    #at321-table-modal .mz145-field>span{line-height:1.25}
    #at321-table-modal .mz145-field input:not([type=checkbox]),
    #at321-table-modal .mz145-field select{
      display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;
      padding:6px;border:1px solid #dce3ef;border-radius:6px;background:#fff;color:#34415a;font-size:11px;
    }
    #at321-table-modal .mz145-field input[type=color]{height:31px;padding:3px}
    #at321-table-modal .mz145-field input[type=checkbox]{width:16px;height:16px;accent-color:#6250df}
    #at321-table-modal .mz145-format-toggles{display:flex;flex-wrap:wrap;gap:12px;margin-top:9px}
    #at321-table-modal .mz145-format-toggles label{display:flex;align-items:center;gap:5px;font-size:10px;color:#56647d}
    #at321-table-modal .mz145-format-toggles input{accent-color:#6250df}
    #at321-table-modal .mz145-preview{grid-column:1/-1}
    #at321-table-modal .mz145-preview-stage{
      width:100%;height:210px;min-height:150px;overflow:auto;background:#fff;
      border:1px solid #e1e7f1;border-radius:8px;
    }
    #at321-table-modal .mz145-preview-frame{display:block;width:100%;height:100%;min-height:150px;border:0;background:#fff}
    #at321-table-modal .mz145-footer{
      display:flex;align-items:center;justify-content:space-between;gap:10px;
      padding-top:8px;border-top:1px solid #e8ecf3;flex:0 0 auto;
    }
    #at321-table-modal .mz145-footer>span{font-size:10px;color:#78859b;line-height:1.4}
    #at321-table-modal .mz145-footer>div{display:flex;gap:7px;justify-content:flex-end}
    #at321-table-modal .mz145-footer button{min-width:78px}
    #at321-table-modal .mz145-footer .primary{background:#435fe0;color:#fff;border-color:#435fe0;font-weight:750}
    #right .mz145-table-properties{margin:10px 0;padding:12px;border:1px solid #dce3f2;border-radius:11px;background:#f8faff;color:#2d3b58;font-size:12px}
    #right .mz145-table-properties b{display:block;font-size:13px}
    #right .mz145-table-properties p{margin:5px 0 9px;color:#66738d;line-height:1.45}
    #right .mz145-table-properties button{width:100%;padding:9px;border:1px solid #cfd8f3;border-radius:8px;background:#fff;color:#435fe0;font-weight:700;cursor:pointer}
    @media(max-width:860px){
      #at321-table-modal .mz145-content{grid-template-columns:minmax(0,1fr)}
      #at321-table-modal .mz145-preview{grid-column:1}
      #at321-table-modal .mz145-grid-wrap{max-height:34vh;max-height:min(34dvh,330px)}
    }
    @media(max-width:600px){
      #at321-table-modal.mz145-modal{padding:6px!important}
      #at321-table-modal .mz145-dialog{width:calc(100vw - 12px)!important;max-height:calc(100dvh - 12px)!important;padding:10px!important;gap:8px!important}
      #at321-table-modal .mz145-toolbar-group{padding:6px;gap:5px}
      #at321-table-modal .mz145-toolbar button{flex:1 1 auto;font-size:10px;padding:7px}
      #at321-table-modal .mz145-grid-wrap{max-height:30vh;max-height:min(30dvh,270px)}
      #at321-table-modal .mz145-grid td{width:132px;min-width:132px}
      #at321-table-modal .mz145-fields{grid-template-columns:repeat(2,minmax(0,1fr))}
      #at321-table-modal .mz145-preview-stage{height:180px}
      #at321-table-modal .mz145-footer{align-items:stretch;flex-direction:column}
      #at321-table-modal .mz145-footer>div{width:100%}
      #at321-table-modal .mz145-footer button{flex:1}
    }
    @media(max-width:360px){
      #at321-table-modal .mz145-fields{grid-template-columns:minmax(0,1fr)}
      #at321-table-modal .mz145-grid td{width:120px;min-width:120px}
    }
  `;
  document.head.appendChild(styleTag);

  let activeDraft = null;
  let selection = { anchor: { r: 0, c: 0 }, cells: [{ r: 0, c: 0 }] };
  let rangeMode = false;

  const draft = () => window.__at321TableDraft;
  const keyOf = (r, c) => `${r},${c}`;
  const cellName = (r, c) => {
    let n = c + 1, label = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      label = String.fromCharCode(65 + rem) + label;
      n = Math.floor((n - 1) / 26);
    }
    return `${label}${r + 1}`;
  };
  const colLabel = c => {
    let n = c + 1, label = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      label = String.fromCharCode(65 + rem) + label;
      n = Math.floor((n - 1) / 26);
    }
    return label;
  };

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
    data.align = alignments.includes(data.align) ? data.align : 'left';
    data.verticalAlign = verticals.includes(data.verticalAlign) ? data.verticalAlign : 'middle';
    data.minRowHeight = clamp(data.minRowHeight ?? 0, 0, 300, 0);
    data.tableLayout = data.tableLayout === 'auto' || data.equalColumns === false ? 'auto' : 'fixed';
    data.equalColumns = data.tableLayout === 'fixed';
    if (!data.cellStyles || typeof data.cellStyles !== 'object' || Array.isArray(data.cellStyles)) data.cellStyles = {};

    const normalizedMerges = [];
    const covered = new Set();
    (Array.isArray(data.merges) ? data.merges : []).forEach(item => {
      const r = Math.round(Number(item?.r));
      const c = Math.round(Number(item?.c));
      const rs = Math.round(Number(item?.rs ?? item?.rowspan ?? 1));
      const cs = Math.round(Number(item?.cs ?? item?.colspan ?? 1));
      if (![r, c, rs, cs].every(Number.isFinite) || r < 0 || c < 0 || rs < 1 || cs < 1) return;
      if (r + rs > data.rows || c + cs > data.cols || rs * cs < 2) return;
      let overlap = false;
      for (let rr = r; rr < r + rs; rr++) {
        for (let cc = c; cc < c + cs; cc++) {
          if (covered.has(keyOf(rr, cc))) overlap = true;
        }
      }
      if (overlap) return;
      for (let rr = r; rr < r + rs; rr++) {
        for (let cc = c; cc < c + cs; cc++) {
          if (rr !== r || cc !== c) covered.add(keyOf(rr, cc));
        }
      }
      normalizedMerges.push({ r, c, rs, cs });
    });
    data.merges = normalizedMerges;
    return data;
  }

  function mergeMaps(data) {
    const anchors = new Map();
    const covered = new Set();
    (data.merges || []).forEach(m => {
      anchors.set(keyOf(m.r, m.c), m);
      for (let r = m.r; r < m.r + m.rs; r++) {
        for (let c = m.c; c < m.c + m.cs; c++) {
          if (r !== m.r || c !== m.c) covered.add(keyOf(r, c));
        }
      }
    });
    return { anchors, covered };
  }

  function cellStyle(data, r, c) {
    const own = data.cellStyles?.[keyOf(r, c)] || {};
    const isHeader = data.header && r === 0;
    return {
      font: fonts.includes(own.font) ? own.font : data.font,
      fontSize: clamp(own.fontSize ?? data.fontSize, 8, 48, data.fontSize),
      color: validColor(own.color, isHeader ? data.headerColor : data.textColor),
      bg: validColor(own.bg, isHeader ? data.headerBg : data.cellBg),
      align: alignments.includes(own.align) ? own.align : data.align,
      verticalAlign: verticals.includes(own.verticalAlign) ? own.verticalAlign : data.verticalAlign,
      bold: own.bold == null ? isHeader : !!own.bold,
      italic: !!own.italic,
      underline: !!own.underline,
      padding: clamp(own.padding ?? data.cellPadding, 0, 40, data.cellPadding),
      borderColor: validColor(own.borderColor, data.border),
      borderWidth: clamp(own.borderWidth ?? data.borderWidth, 0, 8, data.borderWidth)
    };
  }

  function cellCss(data, r, c) {
    const s = cellStyle(data, r, c);
    return [
      `font-family:${s.font},sans-serif`,
      `font-size:${s.fontSize}px`,
      `color:${s.color}`,
      `background:${s.bg}`,
      `text-align:${s.align}`,
      `vertical-align:${s.verticalAlign}`,
      `font-weight:${s.bold ? 700 : 400}`,
      `font-style:${s.italic ? 'italic' : 'normal'}`,
      `text-decoration:${s.underline ? 'underline' : 'none'}`,
      `padding:${s.padding}px`,
      `border:${s.borderWidth}px ${data.borderStyle} ${s.borderColor}`
    ].join(';');
  }

  function tableDocument(rawData) {
    const data = normalize(JSON.parse(JSON.stringify(rawData || {})));
    const { anchors, covered } = mergeMaps(data);
    const rows = data.cells.map((row, r) => '<tr>' + row.map((value, c) => {
      if (covered.has(keyOf(r, c))) return '';
      const merge = anchors.get(keyOf(r, c));
      const tag = data.header && r === 0 ? 'th' : 'td';
      const spans = merge ? ` rowspan="${merge.rs}" colspan="${merge.cs}"` : '';
      return `<${tag}${spans} style="${esc(cellCss(data, r, c))}">${esc(value).replace(/\r?\n/g, '<br>')}</${tag}>`;
    }).join('') + '</tr>').join('');
    const layout = data.tableLayout === 'auto' ? 'auto' : 'fixed';
    const tableFont = fonts.includes(data.font) ? data.font : 'Arial';
    return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
      *{box-sizing:border-box}
      html,body{margin:0;width:100%;min-height:100%;font-family:${tableFont},sans-serif;color:${data.textColor};background:transparent}
      body{padding:1px}
      .mz145-wrap{width:100%;max-width:100%;overflow:auto}
      table{width:100%;min-width:100%;height:auto;border-collapse:collapse;table-layout:${layout};font-family:${tableFont},sans-serif}
      td,th{overflow-wrap:anywhere;word-break:normal;white-space:normal}
      tr{height:${data.minRowHeight ? data.minRowHeight + 'px' : 'auto'}}
      @media(max-width:480px){table{font-size:clamp(8px,2.8vw,${data.fontSize}px)}}
    </style></head><body><div class="mz145-wrap"><table>${rows}</table></div></body></html>`;
  }

  function readGrid(modal) {
    const data = draft();
    if (!data || !modal) return;
    $$('.mz145-cell-input', modal).forEach(input => {
      const r = Number(input.dataset.r), c = Number(input.dataset.c);
      if (data.cells[r]) data.cells[r][c] = input.value;
    });
  }

  function rectFromCells(cells) {
    if (!cells || cells.length < 2) return null;
    const rs = cells.map(cell => cell.r), cs = cells.map(cell => cell.c);
    const r1 = Math.min(...rs), r2 = Math.max(...rs);
    const c1 = Math.min(...cs), c2 = Math.max(...cs);
    if ((r2 - r1 + 1) * (c2 - c1 + 1) !== cells.length) return null;
    const set = new Set(cells.map(cell => keyOf(cell.r, cell.c)));
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) if (!set.has(keyOf(r, c))) return null;
    return { r: r1, c: c1, rs: r2 - r1 + 1, cs: c2 - c1 + 1 };
  }

  function rangeCells(a, b) {
    const cells = [];
    for (let r = Math.min(a.r, b.r); r <= Math.max(a.r, b.r); r++) {
      for (let c = Math.min(a.c, b.c); c <= Math.max(a.c, b.c); c++) cells.push({ r, c });
    }
    return cells;
  }

  function intersects(a, b) {
    return !(a.r + a.rs <= b.r || b.r + b.rs <= a.r || a.c + a.cs <= b.c || b.c + b.cs <= a.c);
  }

  function selectedLabel() {
    if (!selection.cells.length) return 'Belum ada sel dipilih';
    const cells = selection.cells;
    const first = cells[0], last = cells[cells.length - 1];
    const rect = rectFromCells(cells);
    if (cells.length === 1) return `${cellName(first.r, first.c)} (${first.r + 1}.${first.c + 1})`;
    return rect
      ? `${cellName(rect.r, rect.c)}:${cellName(rect.r + rect.rs - 1, rect.c + rect.cs - 1)} (${rect.r + 1}.${rect.c + 1}–${rect.r + rect.rs}.${rect.c + rect.cs})`
      : `${cells.length} sel dipilih`;
  }

  function updateSelection(modal) {
    if (!modal) return;
    $$('.mz145-cell-selected', modal).forEach(node => node.classList.remove('mz145-cell-selected'));
    selection.cells.forEach(({ r, c }) => {
      $(`[data-mz145-cell-container="${r},${c}"]`, modal)?.classList.add('mz145-cell-selected');
    });
    const label = $('[data-mz145-selection-label]', modal);
    if (label) label.textContent = `Dipilih: ${selectedLabel()}`;
    const mergeButton = $('[data-mz145-action="merge"]', modal);
    const splitButton = $('[data-mz145-action="split"]', modal);
    const rect = rectFromCells(selection.cells);
    const data = draft();
    const overlap = rect && data?.merges?.some(m => intersects(rect, m));
    if (mergeButton) mergeButton.disabled = !rect || rect.rs * rect.cs < 2 || !!overlap;
    const canSplit = data?.merges?.some(m => selection.cells.some(cell =>
      cell.r >= m.r && cell.r < m.r + m.rs && cell.c >= m.c && cell.c < m.c + m.cs
    ));
    if (splitButton) splitButton.disabled = !canSplit;
    const rangeButton = $('[data-mz145-action="range"]', modal);
    if (rangeButton) {
      rangeButton.classList.toggle('active', rangeMode);
      rangeButton.setAttribute('aria-pressed', rangeMode ? 'true' : 'false');
      rangeButton.textContent = rangeMode ? 'Pilih sel akhir…' : 'Pilih rentang';
    }
    updateCellInspector(modal);
  }

  function currentCellStyle(data, cell) {
    const base = cellStyle(data, cell.r, cell.c);
    const own = data.cellStyles?.[keyOf(cell.r, cell.c)] || {};
    return { ...base, ...own };
  }

  function updateCellInspector(modal) {
    const data = draft();
    if (!data || !modal) return;
    const first = selection.cells[0] || { r: 0, c: 0 };
    const style = currentCellStyle(data, first);
    const count = $('[data-mz145-selected-count]', modal);
    if (count) count.textContent = selection.cells.length
      ? `${selection.cells.length} sel dipilih. Format berlaku untuk semua sel terpilih.`
      : 'Pilih satu atau beberapa sel pada grid.';
    $$('[data-mz145-cell-prop]', modal).forEach(input => {
      const prop = input.dataset.mz145CellProp;
      const value = style[prop];
      if (input.type === 'checkbox') input.checked = !!value;
      else if (value != null && input.value !== String(value)) input.value = String(value);
    });
  }

  function selectedHasMerge(data) {
    return data.merges.filter(m => selection.cells.some(cell =>
      cell.r >= m.r && cell.r < m.r + m.rs && cell.c >= m.c && cell.c < m.c + m.cs
    ));
  }

  function renderGrid(data) {
    const { anchors, covered } = mergeMaps(data);
    const rows = data.cells.map((row, r) => '<tr>' + row.map((value, c) => {
      if (covered.has(keyOf(r, c))) return '';
      const merge = anchors.get(keyOf(r, c));
      const style = cellStyle(data, r, c);
      const editorStyle = [
        `font-family:${style.font},sans-serif`,
        `font-size:${style.fontSize}px`,
        `color:${style.color}`,
        `background:${style.bg}`,
        `text-align:${style.align}`,
        `font-weight:${style.bold ? 700 : 400}`,
        `font-style:${style.italic ? 'italic' : 'normal'}`,
        `text-decoration:${style.underline ? 'underline' : 'none'}`
      ].join(';');
      const spans = merge ? ` rowspan="${merge.rs}" colspan="${merge.cs}"` : '';
      const coord = cellName(r, c);
      return `<td class="mz145-cell" data-mz145-cell-container="${r},${c}"${spans}>
        <button type="button" class="mz145-cell-pick" data-mz145-pick-cell="${r},${c}" aria-label="Pilih sel ${r + 1}.${c + 1}, ${coord}">${r + 1}.${c + 1} · ${coord}${data.header && r === 0 ? ' · Header' : ''}</button>
        <textarea class="mz145-cell-input" data-at321-cell="${r},${c}" data-r="${r}" data-c="${c}" aria-label="Isi sel ${coord}" style="${esc(editorStyle)}">${esc(value)}</textarea>
      </td>`;
    }).join('') + '</tr>').join('');
    return `<table class="mz145-grid"><tbody>${rows}</tbody></table>`;
  }

  function field(label, html) {
    return `<label class="mz145-field"><span>${label}</span>${html}</label>`;
  }

  function selectOptions(options, selected) {
    return options.map(([value, label]) =>
      `<option value="${esc(value)}" ${String(selected) === String(value) ? 'selected' : ''}>${esc(label)}</option>`
    ).join('');
  }

  function tableProperties(data) {
    const fontOptions = fonts.map(font => [font, font]);
    return `
      <details class="mz145-details">
        <summary>Table-wide appearance · Default</summary>
        <div class="mz145-fields">
          ${field('First row is header', `<input type="checkbox" data-at321-prop="header" ${data.header ? 'checked' : ''}>`)}
          ${field('Default font', `<select data-at321-prop="font">${selectOptions(fontOptions, data.font)}</select>`)}
          ${field('Default font size', `<input type="number" min="8" max="48" data-at321-prop="fontSize" value="${data.fontSize}">`)}
          ${field('Header background', `<input type="color" data-at321-prop="headerBg" value="${data.headerBg}">`)}
          ${field('Header text', `<input type="color" data-at321-prop="headerColor" value="${data.headerColor}">`)}
          ${field('Cell background', `<input type="color" data-at321-prop="cellBg" value="${data.cellBg}">`)}
          ${field('Default text color', `<input type="color" data-at321-prop="textColor" value="${data.textColor}">`)}
          ${field('Default alignment', `<select data-at321-prop="align">${selectOptions([['left','Left'],['center','Center'],['right','Right']], data.align)}</select>`)}
          ${field('Default vertical alignment', `<select data-at321-prop="verticalAlign">${selectOptions([['top','Top'],['middle','Middle'],['bottom','Bottom']], data.verticalAlign)}</select>`)}
          ${field('Cell padding (px)', `<input type="number" min="0" max="40" data-at321-prop="cellPadding" value="${data.cellPadding}">`)}
          ${field('Border color', `<input type="color" data-at321-prop="border" value="${data.border}">`)}
          ${field('Border width (px)', `<input type="number" min="0" max="8" data-at321-prop="borderWidth" value="${data.borderWidth}">`)}
          ${field('Border style', `<select data-at321-prop="borderStyle">${selectOptions([['solid','Solid'],['dashed','Dashed'],['dotted','Dotted'],['double','Double'],['none','None']], data.borderStyle)}</select>`)}
          ${field('Column sizing', `<select data-at321-prop="tableLayout">${selectOptions([['fixed','Equal widths'],['auto','Fit content']], data.tableLayout)}</select>`)}
          ${field('Minimum row height (px)', `<input type="number" min="0" max="300" data-at321-prop="minRowHeight" value="${data.minRowHeight}">`)}
        </div>
      </details>`;
  }

  function cellProperties(data) {
    const first = selection.cells[0] || { r: 0, c: 0 };
    const style = currentCellStyle(data, first);
    const fontOptions = fonts.map(font => [font, font]);
    return `
      <section class="mz145-cell-properties">
        <div class="mz145-panel-title"><b>Cell properties</b><button type="button" data-mz145-action="reset-cell-style">Reset</button></div>
        <small data-mz145-selected-count>${selection.cells.length} sel dipilih. Format berlaku untuk semua sel terpilih.</small>
        <div class="mz145-fields">
          ${field('Font', `<select data-mz145-cell-prop="font">${selectOptions(fontOptions, style.font)}</select>`)}
          ${field('Font size', `<input type="number" min="8" max="48" data-mz145-cell-prop="fontSize" value="${style.fontSize}">`)}
          ${field('Text color', `<input type="color" data-mz145-cell-prop="color" value="${style.color}">`)}
          ${field('Background', `<input type="color" data-mz145-cell-prop="bg" value="${style.bg}">`)}
          ${field('Horizontal alignment', `<select data-mz145-cell-prop="align">${selectOptions([['left','Left'],['center','Center'],['right','Right']], style.align)}</select>`)}
          ${field('Vertical alignment', `<select data-mz145-cell-prop="verticalAlign">${selectOptions([['top','Top'],['middle','Middle'],['bottom','Bottom']], style.verticalAlign)}</select>`)}
          ${field('Cell padding', `<input type="number" min="0" max="40" data-mz145-cell-prop="padding" value="${style.padding}">`)}
          ${field('Border color', `<input type="color" data-mz145-cell-prop="borderColor" value="${style.borderColor}">`)}
          ${field('Border width', `<input type="number" min="0" max="8" data-mz145-cell-prop="borderWidth" value="${style.borderWidth}">`)}
        </div>
        <div class="mz145-format-toggles">
          <label><input type="checkbox" data-mz145-cell-prop="bold" ${style.bold ? 'checked' : ''}> Bold</label>
          <label><input type="checkbox" data-mz145-cell-prop="italic" ${style.italic ? 'checked' : ''}> Italic</label>
          <label><input type="checkbox" data-mz145-cell-prop="underline" ${style.underline ? 'checked' : ''}> Underline</label>
        </div>
      </section>`;
  }

  function renderModal() {
    const data = normalize(draft());
    if (!data) return;
    if (activeDraft !== data) {
      activeDraft = data;
      selection = { anchor: { r: 0, c: 0 }, cells: [{ r: 0, c: 0 }] };
      rangeMode = false;
    }
    document.querySelectorAll('#top details[open], #top .mz13-overflow[open]').forEach(node => { node.open = false; });
    $('#at321-table-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'at321-table-modal';
    overlay.className = 'at321-modal mz145-modal';
    overlay.innerHTML = `
      <div class="at321-dialog mz145-dialog" role="dialog" aria-modal="true" aria-label="Spreadsheet table editor">
        <header class="mz145-header">
          <div><b>▦ Table Editor</b><small>Edit cells like a spreadsheet. Select a range to merge or format multiple cells.</small></div>
          <button type="button" data-at321-close aria-label="Close table editor">×</button>
        </header>
        <div class="mz145-toolbar">
          <div class="mz145-toolbar-group">
            <button type="button" data-mz145-action="range">Pilih rentang</button>
            <button type="button" data-mz145-action="select-header">Pilih header</button>
            <span data-mz145-selection-label>Dipilih: A1</span>
          </div>
          <div class="mz145-toolbar-group">
            <button type="button" data-mz145-action="insert-row">＋ Baris di atas</button>
            <button type="button" data-mz145-action="insert-col">＋ Kolom di kiri</button>
            <button type="button" data-mz145-action="add-row">＋ Baris akhir</button>
            <button type="button" data-mz145-action="add-col">＋ Kolom akhir</button>
            <button type="button" data-mz145-action="delete-row">Hapus baris</button>
            <button type="button" data-mz145-action="delete-col">Hapus kolom</button>
          </div>
          <div class="mz145-toolbar-group">
            <button type="button" data-mz145-action="merge">Merge cells</button>
            <button type="button" data-mz145-action="split">Split cells</button>
            <button type="button" data-mz145-action="equal">Samakan lebar</button>
            <button type="button" data-mz145-action="fit">Ukuran sesuai isi</button>
          </div>
        </div>
        <div class="mz145-content">
          <section class="mz145-grid-card">
            <div class="mz145-card-heading"><b>Grid editor</b><small>Tap label sel untuk memilih. Di iPad, gunakan “Pilih rentang”, lalu tap sel awal dan akhir.</small></div>
            <div class="mz145-grid-wrap">${renderGrid(data)}</div>
          </section>
          <aside class="mz145-inspector">
            ${cellProperties(data)}
            ${tableProperties(data)}
          </aside>
          <section class="mz145-preview">
            <div class="mz145-card-heading"><div><b>Live preview</b><small>Pratinjau mengikuti isi dan format tabel secara responsif.</small></div><span>LIVE</span></div>
            <div class="mz145-preview-stage"><iframe class="mz145-preview-frame" title="Live table preview" sandbox=""></iframe></div>
          </section>
        </div>
        <footer class="mz145-footer">
          <span>Perubahan disimpan setelah menekan Apply table.</span>
          <div><button type="button" data-at321-close>Cancel</button><button type="button" class="primary" data-at321-save>Apply table</button></div>
        </footer>
      </div>`;
    document.body.appendChild(overlay);
    updateSelection(overlay);
    updatePreview(overlay);
  }

  let previewFrameRequest = 0;
  function updatePreview(modal) {
    if (!modal) return;
    if (previewFrameRequest) cancelAnimationFrame(previewFrameRequest);
    previewFrameRequest = requestAnimationFrame(() => {
      previewFrameRequest = 0;
      const data = draft();
      const frame = $('.mz145-preview-frame', modal);
      if (!data || !frame) return;
      readGrid(modal);
      frame.srcdoc = tableDocument(data);
    });
  }

  function setSelection(cells, anchor) {
    selection = { anchor: anchor || cells[0] || null, cells: cells || [] };
    const modal = $('#at321-table-modal');
    if (modal) updateSelection(modal);
  }

  function chooseCell(r, c, event) {
    const cell = { r, c };
    if (rangeMode) {
      if (!selection.anchor || selection.cells.length === 0) {
        selection = { anchor: cell, cells: [cell] };
      } else {
        selection = { anchor: selection.anchor, cells: rangeCells(selection.anchor, cell) };
        rangeMode = false;
      }
    } else if (event?.shiftKey && selection.anchor) {
      selection = { anchor: selection.anchor, cells: rangeCells(selection.anchor, cell) };
    } else if (event?.ctrlKey || event?.metaKey || event?.altKey) {
      const exists = selection.cells.some(item => item.r === r && item.c === c);
      const cells = exists
        ? selection.cells.filter(item => item.r !== r || item.c !== c)
        : [...selection.cells, cell];
      selection = { anchor: selection.anchor || cell, cells };
    } else {
      selection = { anchor: cell, cells: [cell] };
    }
    const modal = $('#at321-table-modal');
    if (modal) updateSelection(modal);
  }

  function shiftCellStylesRows(data, index, direction) {
    const next = {};
    Object.entries(data.cellStyles || {}).forEach(([key, value]) => {
      const [r, c] = key.split(',').map(Number);
      if (direction === 'insert') next[keyOf(r >= index ? r + 1 : r, c)] = value;
      else if (r !== index) next[keyOf(r > index ? r - 1 : r, c)] = value;
    });
    data.cellStyles = next;
  }
  function shiftCellStylesCols(data, index, direction) {
    const next = {};
    Object.entries(data.cellStyles || {}).forEach(([key, value]) => {
      const [r, c] = key.split(',').map(Number);
      if (direction === 'insert') next[keyOf(r, c >= index ? c + 1 : c)] = value;
      else if (c !== index) next[keyOf(r, c > index ? c - 1 : c)] = value;
    });
    data.cellStyles = next;
  }
  function adjustMergesForRow(data, index, direction) {
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
  function adjustMergesForCol(data, index, direction) {
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

  function toast(message) {
    if (typeof window.toast === 'function') window.toast(message);
    else console.info('[Moza table editor]', message);
  }

  function performAction(action) {
    const modal = $('#at321-table-modal');
    const data = normalize(draft());
    if (!modal || !data) return;
    readGrid(modal);
    const first = selection.cells[0] || { r: data.rows - 1, c: data.cols - 1 };
    const r = clamp(first.r, 0, data.rows - 1, 0);
    const c = clamp(first.c, 0, data.cols - 1, 0);

    if (action === 'range') {
      rangeMode = !rangeMode;
      selection = rangeMode
        ? { anchor: null, cells: [] }
        : { anchor: { r, c }, cells: [{ r, c }] };
      updateSelection(modal);
      return;
    }
    if (action === 'select-header') {
      rangeMode = false;
      const cells = Array.from({ length: data.cols }, (_, col) => ({ r: 0, c: col }));
      setSelection(cells, cells[0]);
      return;
    }
    if (action === 'merge') {
      const rect = rectFromCells(selection.cells);
      if (!rect || rect.rs * rect.cs < 2) {
        toast('Pilih sel yang membentuk satu area persegi panjang.');
        return;
      }
      if (data.merges.some(item => intersects(rect, item))) {
        toast('Area pilihan bersinggungan dengan sel gabungan. Split terlebih dahulu.');
        return;
      }
      data.merges.push(rect);
      setSelection([{ r: rect.r, c: rect.c }], { r: rect.r, c: rect.c });
      bridge.getRender()();
      return;
    }
    if (action === 'split') {
      const targets = selectedHasMerge(data);
      if (!targets.length) return;
      const targetSet = new Set(targets);
      data.merges = data.merges.filter(item => !targetSet.has(item));
      bridge.getRender()();
      return;
    }
    if (action === 'equal') {
      data.tableLayout = 'fixed';
      data.equalColumns = true;
      const layout = $('[data-at321-prop="tableLayout"]', modal);
      if (layout) layout.value = 'fixed';
      updatePreview(modal);
      return;
    }
    if (action === 'fit') {
      data.tableLayout = 'auto';
      data.equalColumns = false;
      const layout = $('[data-at321-prop="tableLayout"]', modal);
      if (layout) layout.value = 'auto';
      updatePreview(modal);
      return;
    }

    if (action === 'insert-row' || action === 'add-row') {
      if (data.rows >= 24) return toast('Maksimum 24 baris.');
      const index = action === 'add-row' ? data.rows : r;
      data.cells.splice(index, 0, Array.from({ length: data.cols }, () => ''));
      shiftCellStylesRows(data, index, 'insert');
      adjustMergesForRow(data, index, 'insert');
      const next = { r: index, c };
      setSelection([next], next);
    } else if (action === 'insert-col' || action === 'add-col') {
      if (data.cols >= 12) return toast('Maksimum 12 kolom.');
      const index = action === 'add-col' ? data.cols : c;
      data.cells.forEach(row => row.splice(index, 0, ''));
      shiftCellStylesCols(data, index, 'insert');
      adjustMergesForCol(data, index, 'insert');
      const next = { r, c: index };
      setSelection([next], next);
    } else if (action === 'delete-row') {
      if (data.rows <= 1) return toast('Tabel harus memiliki minimal satu baris.');
      data.cells.splice(r, 1);
      shiftCellStylesRows(data, r, 'delete');
      adjustMergesForRow(data, r, 'delete');
      const next = { r: Math.min(r, data.rows - 2), c };
      setSelection([next], next);
    } else if (action === 'delete-col') {
      if (data.cols <= 1) return toast('Tabel harus memiliki minimal satu kolom.');
      data.cells.forEach(row => row.splice(c, 1));
      shiftCellStylesCols(data, c, 'delete');
      adjustMergesForCol(data, c, 'delete');
      const next = { r, c: Math.min(c, data.cols - 2) };
      setSelection([next], next);
    } else if (action === 'reset-cell-style') {
      selection.cells.forEach(cell => { delete data.cellStyles[keyOf(cell.r, cell.c)]; });
      updatePreview(modal);
      updateCellInspector(modal);
      renderGridInto(modal, data);
      return;
    } else {
      return;
    }

    data.rows = data.cells.length;
    data.cols = data.cells[0]?.length || 0;
    normalize(data);
    bridge.getRender()();
  }

  function renderGridInto(modal, data) {
    const wrap = $('.mz145-grid-wrap', modal);
    if (wrap) wrap.innerHTML = renderGrid(data);
    updateSelection(modal);
  }

  function applyCellProperty(input) {
    const data = normalize(draft());
    if (!data || !selection.cells.length) return;
    const prop = input.dataset.mz145CellProp;
    const value = input.type === 'checkbox' ? input.checked
      : input.type === 'number' ? clamp(input.value, prop === 'fontSize' ? 8 : 0, prop === 'fontSize' ? 48 : prop === 'borderWidth' ? 8 : 40, prop === 'fontSize' ? 14 : 0)
      : input.value;
    selection.cells.forEach(cell => {
      const key = keyOf(cell.r, cell.c);
      if (!data.cellStyles[key]) data.cellStyles[key] = {};
      data.cellStyles[key][prop] = value;
    });
    const modal = $('#at321-table-modal');
    if (modal) {
      renderGridInto(modal, data);
      updatePreview(modal);
    }
  }

  function applyGlobalProperty(input) {
    const data = normalize(draft());
    if (!data) return;
    const prop = input.dataset.at321Prop;
    const value = input.type === 'checkbox' ? input.checked
      : input.type === 'number' ? Number(input.value)
      : input.value;
    data[prop] = value;
    if (prop === 'tableLayout') data.equalColumns = value !== 'auto';
    if (prop === 'equalColumns') data.tableLayout = value ? 'fixed' : 'auto';
    normalize(data);
    const modal = $('#at321-table-modal');
    if (modal) {
      renderGridInto(modal, data);
      updatePreview(modal);
    }
  }

  // Replace the older renderer. The core Save/Cancel handlers remain compatible.
  bridge.setDoc(tableDocument);
  bridge.setRender(renderModal);

  // Add a contextual entry in the existing Properties sidebar for the selected table.
  if (typeof window.renderRight === 'function' && !window.renderRight.__mz145) {
    const originalRenderRight = window.renderRight;
    const wrappedRenderRight = function (...args) {
      const result = originalRenderRight.apply(this, args);
      const pane = $('#right');
      if (pane) {
        $('.at321-table-properties', pane)?.remove();
        $('.mz145-table-properties', pane)?.remove();
        const selected = typeof window.T === 'function' ? window.T('el') : null;
        if (selected?.tableData) {
          const section = document.createElement('section');
          section.className = 'mz145-table-properties';
          section.innerHTML = `<b>▦ Table properties</b>
            <p>Edit table content and cell formatting in the spreadsheet editor. The canvas remains the page preview.</p>
            <button type="button" data-mz145-open-table>Open Table Editor</button>`;
          pane.appendChild(section);
        }
      }
      return result;
    };
    wrappedRenderRight.__mz145 = true;
    window.renderRight = wrappedRenderRight;
  }

  document.addEventListener('click', event => {
    const openButton = event.target.closest('[data-mz145-open-table]');
    if (openButton) {
      const selected = typeof window.T === 'function' ? window.T('el') : null;
      if (selected?.tableData) bridge.editTable(selected);
      return;
    }
    const pick = event.target.closest('#at321-table-modal [data-mz145-pick-cell]');
    if (pick) {
      const [r, c] = pick.dataset.mz145PickCell.split(',').map(Number);
      chooseCell(r, c, event);
      return;
    }
    const action = event.target.closest('#at321-table-modal [data-mz145-action]');
    if (action) {
      event.preventDefault();
      performAction(action.dataset.mz145Action);
    }
  }, true);

  document.addEventListener('input', event => {
    const modal = event.target.closest('#at321-table-modal');
    if (!modal) return;
    if (event.target.matches('[data-mz145-cell-prop]')) {
      if (event.target.type !== 'number') applyCellProperty(event.target);
      return;
    }
    if (event.target.matches('[data-at321-prop]')) {
      if (event.target.type !== 'number') applyGlobalProperty(event.target);
      return;
    }
    if (event.target.matches('[data-at321-cell]')) updatePreview(modal);
  }, true);

  document.addEventListener('change', event => {
    const modal = event.target.closest('#at321-table-modal');
    if (!modal) return;
    if (event.target.matches('[data-mz145-cell-prop]')) {
      applyCellProperty(event.target);
      return;
    }
    if (event.target.matches('[data-at321-prop]')) applyGlobalProperty(event.target);
  }, true);

  // The grid's text fields also select their cell when focused, without forcing
  // a new selection when the user is merely moving the caret within that field.
  document.addEventListener('focusin', event => {
    const input = event.target.closest('#at321-table-modal [data-at321-cell]');
    if (!input) return;
    const r = Number(input.dataset.at321Cell.split(',')[0]);
    const c = Number(input.dataset.at321Cell.split(',')[1]);
    if (!selection.cells.some(cell => cell.r === r && cell.c === c)) {
      selection = { anchor: { r, c }, cells: [{ r, c }] };
      const modal = $('#at321-table-modal');
      if (modal) updateSelection(modal);
    }
  }, true);

  // Keep the selection in sync if the table editor is opened by the legacy
  // contextual button or by the Properties sidebar.
  const refresh = () => {
    if (!draft()) return;
    normalize(draft());
  };
  refresh();
})();
