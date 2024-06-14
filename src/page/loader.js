const loadingMessage = document.getElementById('loading-message');
const HALF_MINUTE_IN_MS = 30000;

setTimeout(() => {
  if (loadingMessage) {
    loadingMessage.classList.add('visible');
  }
}, HALF_MINUTE_IN_MS);
