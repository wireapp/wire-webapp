import 'url-search-params-polyfill';

const namespace = new URL(window.location.href).searchParams.get('enableLogging');

if (namespace) {
  localStorage.setItem('debug', namespace);
} else {
  localStorage.removeItem('debug');
}
