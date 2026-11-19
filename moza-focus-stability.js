/* Moza Studio V14.2.1 — Properties focus and scroll stability patch.
 *
 * Root cause addressed:
 * - renderRight() replaces the Properties panel contents with innerHTML.
 *   This destroys the active input/select and can reset focus or scroll.
 * - renderCanvas() recreates the contextual V28.3 text toolbar. A font-size
 *   change in that toolbar therefore destroys the control that fired change.
 *
 * This patch preserves the active control, text selection, panel scroll,
 * expanded Properties groups, and canvas viewport position when the same
 * object remains selected. It does not restore focus after changing selection.
 */
(function () {
  'use strict';

  if (window.__mozaFocusStability?.installed) return;

  const CONTROL_SELECTOR = 'input:not([type="hidden"]), select, textarea';
  const IDENTITY_ATTRS = [
    'data-o', 'data-p', 'data-t', 'data-a', 'data-v',
    'data-group-typography', 'data-v283-tx',
    'data-at21-edit', 'data-at321-prop', 'data-at322-edit',
    'data-at322-change', 'data-at32-hex', 'id', 'name', 'aria-label'
  ];

  function selectionKey() {
    try {
      const selected = typeof S !== 'undefined' ? S.sel : null;
      const multi = typeof S !== 'undefined' && Array.isArray(S.multi)
        ? S.multi.map(item => typeof item === 'string' ? item : item?.id || '').sort().join(',')
        : '';
      return [
        typeof S !== 'undefined' ? S.mode || '' : '',
        typeof S !== 'undefined' ? S.pageId || '' : '',
        typeof S !== 'undefined' ? S.bp || '' : '',
        selected?.k || '', selected?.id || '', multi
      ].join('|');
    } catch (_) {
      return '';
    }
  }

  function getScope(node) {
    if (!node?.closest) return null;
    if (node.closest('#right')) return document.getElementById('right');
    if (node.closest('#v283-textbar')) return document.getElementById('v283-textbar');
    return null;
  }

  function controlsIn(root) {
    return root ? Array.from(root.querySelectorAll(CONTROL_SELECTOR)) : [];
  }

  function fingerprint(node) {
    return {
      tag: node.tagName,
      type: node.getAttribute('type') || '',
      attrs: IDENTITY_ATTRS
        .map(name => [name, node.getAttribute(name)])
        .filter(([, value]) => value !== null)
    };
  }

  function matchesFingerprint(node, saved) {
    if (!node || node.tagName !== saved.tag) return false;
    if ((node.getAttribute('type') || '') !== saved.type) return false;
    return saved.attrs.every(([name, value]) => node.getAttribute(name) === value);
  }

  function captureControl(node) {
    const root = getScope(node);
    if (!root || !node.matches?.(CONTROL_SELECTOR)) return null;
    const fp = fingerprint(node);
    const matches = controlsIn(root).filter(item => matchesFingerprint(item, fp));
    let start = null, end = null, direction = null;
    try {
      start = node.selectionStart;
      end = node.selectionEnd;
      direction = node.selectionDirection;
    } catch (_) {
      // Number, color and select controls do not expose text selection ranges.
    }
    return {
      rootId: root.id,
      fp,
      ordinal: Math.max(0, matches.indexOf(node)),
      selectionStart: start,
      selectionEnd: end,
      selectionDirection: direction,
      scrollTop: root.scrollTop,
      scrollLeft: root.scrollLeft
    };
  }

  function restoreControl(saved) {
    if (!saved) return false;
    const root = document.getElementById(saved.rootId);
    if (!root) return false;
    const matches = controlsIn(root).filter(item => matchesFingerprint(item, saved.fp));
    const target = matches[saved.ordinal] || matches[0];
    if (!target) return false;

    if (document.activeElement !== target) {
      try { target.focus({ preventScroll: true }); }
      catch (_) { try { target.focus(); } catch (__) {} }
    }

    if (saved.selectionStart !== null && saved.selectionStart !== undefined &&
        saved.selectionEnd !== null && saved.selectionEnd !== undefined &&
        typeof target.setSelectionRange === 'function') {
      try { target.setSelectionRange(saved.selectionStart, saved.selectionEnd, saved.selectionDirection || 'none'); }
      catch (_) {}
    }

    root.scrollTop = saved.scrollTop;
    root.scrollLeft = saved.scrollLeft;
    return true;
  }

  function captureGroups(root) {
    if (!root) return [];
    const counts = new Map();
    return Array.from(root.querySelectorAll('details.grp')).map(node => {
      const base = node.getAttribute('data-g') || node.querySelector('summary')?.textContent?.trim() || 'group';
      const ordinal = counts.get(base) || 0;
      counts.set(base, ordinal + 1);
      return { base, ordinal, open: node.open };
    });
  }

  function restoreGroups(root, saved) {
    if (!root || !saved?.length) return;
    const counts = new Map();
    const nodes = Array.from(root.querySelectorAll('details.grp'));
    nodes.forEach(node => {
      const base = node.getAttribute('data-g') || node.querySelector('summary')?.textContent?.trim() || 'group';
      const ordinal = counts.get(base) || 0;
      counts.set(base, ordinal + 1);
      const state = saved.find(item => item.base === base && item.ordinal === ordinal);
      if (state) node.open = state.open;
    });
  }

  // Stamp the currently rendered selection so a click on a different canvas
  // object cannot accidentally restore focus into the previous object's panel.
  function markCurrentScopes() {
    const key = selectionKey();
    const panel = document.getElementById('right');
    const toolbar = document.getElementById('v283-textbar');
    if (panel) panel.dataset.mzFocusSelection = key;
    if (toolbar) toolbar.dataset.mzFocusSelection = key;
  }

  function captureCanvasScroll() {
    const viewport = document.getElementById('viewport');
    return viewport ? { left: viewport.scrollLeft, top: viewport.scrollTop } : null;
  }

  function restoreCanvasScroll(saved) {
    if (!saved) return;
    const viewport = document.getElementById('viewport');
    if (!viewport) return;
    viewport.scrollLeft = saved.left;
    viewport.scrollTop = saved.top;
  }

  markCurrentScopes();

  // Keep the focused Properties field alive when a renderRight() call rebuilds
  // the panel. Only restore when the panel still represents the same selection.
  if (typeof renderRight === 'function') {
    const previousRenderRight = renderRight;
    let renderingRight = false;
    renderRight = function (...args) {
      if (renderingRight) return previousRenderRight.apply(this, args);

      const before = selectionKey();
      const active = document.activeElement;
      const savedFocus = captureControl(active);
      const panel = document.getElementById('right');
      const priorPanelSelection = panel?.dataset.mzFocusSelection;
      const panelStillMatchesSelection = !priorPanelSelection || priorPanelSelection === before;
      const savedGroups = panel ? captureGroups(panel) : [];
      const savedScroll = panel
        ? { top: panel.scrollTop, left: panel.scrollLeft }
        : null;

      let result;
      renderingRight = true;
      try {
        result = previousRenderRight.apply(this, args);
      } finally {
        renderingRight = false;
      }

      const after = selectionKey();
      const nextPanel = document.getElementById('right');
      if (before === after && panelStillMatchesSelection) {
        restoreGroups(nextPanel, savedGroups);
        if (savedFocus?.rootId === 'right') restoreControl(savedFocus);
        if (nextPanel && savedScroll) {
          nextPanel.scrollTop = savedScroll.top;
          nextPanel.scrollLeft = savedScroll.left;
        }
      }
      if (nextPanel) nextPanel.dataset.mzFocusSelection = after;
      return result;
    };
  }

  // The contextual text toolbar is recreated by renderCanvas(). Preserve its
  // active control when a font, alignment or color change redraws the canvas.
  if (typeof renderCanvas === 'function') {
    const previousRenderCanvas = renderCanvas;
    let renderingCanvas = false;
    renderCanvas = function (...args) {
      if (renderingCanvas) return previousRenderCanvas.apply(this, args);

      const before = selectionKey();
      const savedFocus = captureControl(document.activeElement);
      const focusRoot = savedFocus ? document.getElementById(savedFocus.rootId) : null;
      const priorScopeSelection = focusRoot?.dataset.mzFocusSelection;
      const scopeStillMatchesSelection = !priorScopeSelection || priorScopeSelection === before;
      const savedCanvasScroll = savedFocus ? captureCanvasScroll() : null;
      const panel = document.getElementById('right');
      const savedPanelScroll = savedFocus?.rootId === 'right' && panel
        ? { top: panel.scrollTop, left: panel.scrollLeft }
        : null;

      let result;
      renderingCanvas = true;
      try {
        result = previousRenderCanvas.apply(this, args);
      } finally {
        renderingCanvas = false;
      }

      const after = selectionKey();
      if (before === after && scopeStillMatchesSelection && savedFocus) {
        restoreControl(savedFocus);
        restoreCanvasScroll(savedCanvasScroll);
        const nextPanel = document.getElementById('right');
        if (nextPanel && savedPanelScroll) {
          nextPanel.scrollTop = savedPanelScroll.top;
          nextPanel.scrollLeft = savedPanelScroll.left;
        }
      }
      const nextToolbar = document.getElementById('v283-textbar');
      if (nextToolbar) nextToolbar.dataset.mzFocusSelection = after;
      return result;
    };
  }

  window.__mozaFocusStability = {
    installed: true,
    version: '14.2.1',
    description: 'Preserves Properties focus, text caret, expanded groups and scroll while the same object remains selected.'
  };
})();
