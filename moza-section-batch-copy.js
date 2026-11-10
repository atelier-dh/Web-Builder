/* Moza Studio V14.8.6 — Section multi-copy and complete responsive clipboard.
   Additive editor-only module. Retains the original section/page clipboard actions.
   Copies the complete data model (Desktop base, Tablet/Mobile bp overrides,
   responsive section heights, visibility, nested elements and referenced assets). */
(() => {
  'use strict';
  if (typeof tabPages !== 'function' || typeof getClip !== 'function' || typeof putClip !== 'function') return;
  if (window.MozaSectionBatchCopy?.version === '14.8.6') return;
  const chosen = new Set();
  let chosenPage = '';
  let showAllDevices = true;
  const pageNow = () => typeof curPage === 'function' ? curPage() : null;
  function validSelection(page) {
    if (!page) return [];
    if (chosenPage !== page.id) { chosen.clear(); chosenPage = page.id; }
    const allowed = new Set((page.sections || []).map(s => s.id));
    for (const id of chosen) if (!allowed.has(id)) chosen.delete(id);
    return page.sections.filter(s => chosen.has(s.id));
  }
  const oldPages = tabPages;
  tabPages = function(...args) {
    let html = oldPages(...args);
    const page = pageNow();
    if (!page || !Array.isArray(page.sections)) return html;
    validSelection(page);
    const at = html.indexOf('<section class="at19-section-manager"');
    const end = at < 0 ? -1 : html.indexOf('</section>', at);
    if (end < 0) return html;
    let part = html.slice(at, end + '</section>'.length);
    let idx = 0;
    part = part.replace(/(<div class="at19-section-item[^\"]*">\s*<div class="at19-section-info">)/g, m => {
      const s = page.sections[idx++];
      if (!s) return m;
      return m + `<label class="mz86-tick" title="Ikut salin section ini beserta Desktop, Tablet, Mobile"><input type="checkbox" data-mz86-select="${esc(s.id)}" ${chosen.has(s.id) ? 'checked' : ''} aria-label="Pilih ${esc(s.name || 'section')}"></label>`;
    });
    const count = validSelection(page).length;
    const copy = getClip();
    const pasteCount = copy?.k === 'sections' ? copy.items?.length || 0 : 0;
    const bar = `<div class="mz86-toolbar" role="group" aria-label="Salin beberapa section">
      <label class="mz86-checkall"><input type="checkbox" data-mz86-all ${count === page.sections.length && count > 0 ? 'checked' : ''}> Pilih semua</label>
      <button type="button" data-a="mz86-copy-selected" ${count ? '' : 'disabled'}>⎘ Salin dipilih (<span class="mz86-count">${count}</span>)</button>
      <button type="button" data-a="mz86-copy-all" ${page.sections.length ? '' : 'disabled'}>⎘ Salin semua (${page.sections.length})</button>
      ${pasteCount ? `<button type="button" data-a="mz86-paste-all">⎗ Tempel ${pasteCount} bagian</button>` : ''}
      <label class="mz86-showall"><input type="checkbox" data-mz86-showall ${showAllDevices ? 'checked' : ''}> Hasil tempel tampil di Desktop, Tablet & Mobile</label>
      <small>Salin membawa ketiga layout dan aset. Matikan opsi tampil di semua perangkat jika ingin mempertahankan elemen yang sengaja disembunyikan pada device tertentu.</small>
    </div>`;
    const hintEnd = part.indexOf('</p>', part.indexOf('class="at19-section-help"'));
    if (hintEnd >= 0) part = part.slice(0, hintEnd + 4) + bar + part.slice(hintEnd + 4);
    return html.slice(0, at) + part + html.slice(end + '</section>'.length);
  };
  const style = document.createElement('style');
  style.id = 'mz86-section-batch-copy-style';
  style.textContent = `
    .mz86-tick{display:flex;align-items:center;justify-content:center;min-width:22px;flex:none}
    .mz86-tick input,.mz86-checkall input{width:16px;height:16px;accent-color:#4465e8;cursor:pointer}
    .mz86-toolbar{border:1px solid #c8d3fd;background:#fff;border-radius:10px;padding:8px;display:flex;flex-wrap:wrap;gap:6px;margin:9px 0 12px;align-items:center}
    .mz86-toolbar button{background:#f5f7ff;border:1px solid #c9d4fd;border-radius:8px;padding:8px;color:#3452b8;font-weight:650;min-height:35px;font-size:11px;cursor:pointer}
    .mz86-toolbar button:disabled{opacity:.45;cursor:not-allowed}
    .mz86-toolbar small{width:100%;font-size:10px;line-height:1.5;color:#617092}
    .mz86-checkall,.mz86-showall{display:flex;align-items:center;gap:5px;font-size:11px}
    .mz86-showall{width:100%;white-space:normal}
    .mz86-showall input{width:16px;height:16px;flex:none;accent-color:#4465e8}
  `;
  document.head.appendChild(style);
  function refreshCount() {
    const page = pageNow();
    if (!page) return;
    const count = validSelection(page).length;
    document.querySelectorAll('.mz86-count').forEach(e => e.textContent = String(count));
    document.querySelectorAll('[data-a="mz86-copy-selected"]').forEach(b => b.disabled = !count);
    const all = document.querySelector('[data-mz86-all]');
    if (all) all.checked = count > 0 && count === page.sections.length;
  }
  document.addEventListener('change', e => {
    if (e.target?.hasAttribute?.('data-mz86-showall')) { showAllDevices = e.target.checked; }
    else if (e.target?.hasAttribute?.('data-mz86-select')) {
      const page = pageNow();
      if (!page) return;
      validSelection(page);
      const id = e.target.getAttribute('data-mz86-select');
      if (page.sections.some(s => s.id === id)) {
        if (e.target.checked) chosen.add(id); else chosen.delete(id);
      }
      refreshCount();
    } else if (e.target?.hasAttribute?.('data-mz86-all')) {
      const page = pageNow();
      if (!page) return;
      validSelection(page);
      chosen.clear();
      if (e.target.checked) page.sections.forEach(s => chosen.add(s.id));
      // Repaint the selection checkboxes without re-rendering a giant page.
      document.querySelectorAll('[data-mz86-select]').forEach(cb => cb.checked = chosen.has(cb.getAttribute('data-mz86-select')));
      refreshCount();
    }
  }, true);
  const oldCopy = copySection;
  copySection = function(...args) {
    const result = oldCopy(...args);
    const c = getClip();
    if (c?.k === 'sections') { c.responsive = 'all-three'; c.version = '14.8.6'; putClip(c); }
    return result;
  };
  function copyMany(sections) {
    if (!sections.length) return toast('Pilih section yang ingin disalin dahulu.');
    // Call the existing bridge once for clipboard compatibility (Ctrl+V etc.).
    copySection(sections[0].id);
    const data = clone(sections);
    putClip({k:'sections', items:data, assets:clone(usedAssets(data)), responsive:'all-three', version:'14.8.6'});
    S.lastCopy = 'sec';
    if (typeof MZCL15 !== 'undefined') MZCL15.record = {kind:'sec', sourceBp:S.bp, allDevices:true};
    if (typeof renderLeft === 'function' && (S.tab === 'pages' || S.tab === 'layers')) renderLeft();
    toast(`✓ ${sections.length} section disalin, termasuk Desktop / Tablet / Mobile.`, 3500);
  }
  function pasteMany(afterId) {
    const c = getClip();
    if (c?.k !== 'sections' || !Array.isArray(c.items) || !c.items.length) return toast('Salin section dahulu.');
    const page = pageNow();
    if (!page) return toast('Buka project dan halaman tujuan dahulu.');
    if (typeof finishEdit === 'function' && S.editing) finishEdit();
    const items = clone(c.items);
    // Build one mapping for the entire batch; links between copied sections
    // and nested elements must continue pointing to their copied equivalents.
    const ids = new Map();
    for (let i = 0; i < items.length; i++) {
      ids.set(c.items[i].id, uid('s'));
      const before = [], after = [];
      walkEls(c.items[i].elements || [], e => before.push(e));
      walkEls(items[i].elements || [], e => after.push(e));
      after.forEach((el,j) => { if (before[j]?.id) ids.set(before[j].id, uid('e')); });
    }
    const remap = value => typeof value === 'string' && ids.has(value) ? ids.get(value) : value;
    for (const sec of items) {
      sec.id = remap(sec.id);
      walkEls(sec.elements || [], el => {
        el.id = remap(el.id);
        // Interaction IDs are unique and must be regenerated on paste.
        for (const action of el.ix || []) {
          action.id = uid('x');
          for (const k of ['target','sec','ov','element']) if (action[k]) action[k] = remap(action[k]);
          if (action.link?.t === 'section' || action.link?.t === 'element') action.link.v = remap(action.link.v);
        }
        if (el.link?.t === 'section' || el.link?.t === 'element') el.link.v = remap(el.link.v);
        if (typeof el.protoNav?.to === 'string') el.protoNav.to = remap(el.protoNav.to);
      });
    }
    let at = page.sections.length;
    if (afterId) {
      const index = page.sections.findIndex(s => s.id === afterId);
      if (index >= 0) at = index + 1;
    }
    // Optional visibility reset: new copies may be shown in all three layouts
    // without altering the original sections or their per-device geometry.
    if (showAllDevices) for (const sec of items) {
      const reveal = obj => {
        if (obj.hideOn) for (const device of ['d','t','m']) delete obj.hideOn[device];
        if (obj._modeDeleted) for (const device of ['d','t','m']) delete obj._modeDeleted[device];
      };
      reveal(sec); walkEls(sec.elements || [], reveal);
    }
    // Single Undo for the complete paste operation.
    commit(discrete());
    mergeAssets(clone(c.assets || []));
    page.sections.splice(at, 0, ...items);
    S.pageId = page.id;
    S.sel = {k:'sec',id:items[0].id};
    S.multi = [];
    chosen.clear();
    renderCanvas();renderRight();renderLeft();layoutPanels();scheduleSave();
    toast(`✓ ${items.length} section ditempel; Desktop, Tablet dan Mobile ikut tersalin.`, 3500);
    return items;
  }
  // Preserve the old single-section paste implementation and its hotfixes.
  const oldPaste = pasteSection;
  pasteSection = function(afterId) {
    const c = getClip();
    return c?.k === 'sections' && c.items?.length && (c.items.length > 1 || c.responsive === 'all-three') ? pasteMany(afterId) : oldPaste(afterId);
  };
  ACT['mz86-copy-selected'] = () => copyMany(validSelection(pageNow()));
  ACT['mz86-copy-all'] = () => copyMany((pageNow()?.sections || []).slice());
  ACT['mz86-paste-all'] = () => pasteSection();
  window.MozaSectionBatchCopy = { version:'14.8.6', copyMany, pasteMany, selectedIds:()=>Array.from(chosen) };
})();
