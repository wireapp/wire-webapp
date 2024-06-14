const loadingMessage = document.getElementById('loading-message');
const HALF_MINUTE_IN_MS = 30000;

const userLang = navigator.language;

setTimeout(() => {
  if (loadingMessage) {
    if (userLang.startsWith('de')) {
      loadingMessage.innerHTML = `<p>Laden von Wire dauert länger als erwartet.</p><p>Bitte überprüfen Sie Ihre Internetverbindung.</p>`;
    }

    loadingMessage.classList.add('visible');
  }
}, HALF_MINUTE_IN_MS);
