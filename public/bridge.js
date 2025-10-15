// public/bridge.js
(function () {
  const PARENT_ORIGIN = '*';

  // Auto-resize hacia el padre
  try {
    const ro = new ResizeObserver(() => {
      const h = document.documentElement.scrollHeight || document.body.scrollHeight || 0;
      parent.postMessage({ type: 'resize', height: h }, PARENT_ORIGIN);
    });
    ro.observe(document.documentElement);
  } catch {}

  // UTMs recibidas del padre → guarda espejo (por si el form las ocupa)
  let utmsParent = {};
  window.addEventListener('message', (e) => {
    const msg = e.data || {};
    if (msg.type === 'utms' && msg.utms && typeof msg.utms === 'object') {
      utmsParent = msg.utms || {};
      try { localStorage.setItem('utms_parent', JSON.stringify(utmsParent)); } catch {}
    }
  });

  // Helpers expuestos
  window.SYBridge = {
    gtm(event, data = {}) {
      try { parent.postMessage({ type: 'gtm', event, data }, PARENT_ORIGIN); } catch {}
    },
    navigate(path, payload = null) {
      try { parent.postMessage({ type: 'navigate', path, payload }, PARENT_ORIGIN); } catch {}
    },
    getParentUtms() {
      try {
        return utmsParent && Object.keys(utmsParent).length
          ? utmsParent
          : JSON.parse(localStorage.getItem('utms_parent') || '{}');
      } catch { return {}; }
    }
  };

  // Señal de “ready” (opcional)
  try { parent.postMessage({ type: 'child_ready' }, PARENT_ORIGIN); } catch {}
})();
