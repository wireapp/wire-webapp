const additionalMessage = document.getElementById('additional-message');
const HALF_MINUTE_IN_MS = 30000;

setTimeout(() => {
  if (additionalMessage) {
    additionalMessage.innerHTML = 'It takes longer than expected, please check your internet connection...';
  }
}, HALF_MINUTE_IN_MS);
