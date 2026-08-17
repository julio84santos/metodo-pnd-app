/* ---------------- Instalar como app (Android + iPhone) ---------------- */
(function () {
  const ua = navigator.userAgent || '';
  window.PWA_INSTALL = {
    deferredPrompt: null,
    isIOS: /iphone|ipad|ipod/i.test(ua) && !window.MSStream,
    isStandalone: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.PWA_INSTALL.deferredPrompt = e;
    if (window.render) window.render();
  });

  window.addEventListener('appinstalled', () => {
    window.PWA_INSTALL.deferredPrompt = null;
    window.PWA_INSTALL.isStandalone = true;
    if (window.render) window.render();
  });
})();
