(function () {
  const g = window;

  function pickUTMsFromReferrer() {
    try {
      const url = new URL(document.referrer || '');
      const allow = new Set(['utm_source','utm_medium','utm_campaign','utm_term','utm_content','gclid','fbclid']);
      const out = {};
      for (const [k, v] of url.searchParams.entries()) {
        if (allow.has(k)) out[k] = v;
      }
      return out;
    } catch {
      return {};
    }
  }

  const SYBridge = {
    getParentUtms() {
      return pickUTMsFromReferrer();
    },
    navigate(path, data) {
      try { parent.postMessage({ type: 'navigate', path, data }, '*'); } catch {}
      try {
        if (typeof path === 'string') window.location.href = path;
      } catch {}
    },
    gtm(event, payload) {
      try { parent.postMessage({ type: 'gtm', event, payload }, '*'); } catch {}
      try {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event, ...payload });
      } catch {}
    }
  };

  g.SYBridge = SYBridge;
})();
