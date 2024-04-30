function isMinimumSupported() {
  return (
    'globalThis' in window &&
    'Promise' in window &&
    'allSettled' in Promise &&
    'Symbol' in window &&
    'replace' in Symbol &&
    'WeakMap' in window &&
    'assign' in Object &&
    'entries' in Object &&
    'values' in Object &&
    'getOwnPropertyDescriptors' in Object &&
    'fromEntries' in Object &&
    'assign' in Object &&
    'URL' in window &&
    'toJSON' in URL.prototype &&
    'URLSearchParams' in window &&
    Array.prototype[Symbol.iterator] &&
    'includes' in Array.prototype &&
    'reduce' in Array.prototype &&
    'sort' in Array.prototype &&
    'flatMap' in Array.prototype &&
    NodeList.prototype[Symbol.iterator] &&
    'forEach' in NodeList.prototype &&
    HTMLCollection.prototype[Symbol.iterator] &&
    DOMTokenList.prototype[Symbol.iterator] &&
    'forEach' in DOMTokenList.prototype &&
    'fill' in Int8Array.prototype &&
    'set' in Int8Array.prototype &&
    'sort' in Int8Array.prototype &&
    'replace' in String.prototype &&
    'search' in String.prototype &&
    'split' in String.prototype &&
    'includes' in String.prototype &&
    'match' in String.prototype &&
    'trim' in String.prototype &&
    'split' in String.prototype &&
    'endsWith' in String.prototype &&
    'replaceAll' in String.prototype &&
    'sticky' in RegExp.prototype &&
    'toString' in RegExp &&
    parseFloat('1.23') === 1.23 &&
    (1.23456789).toFixed(2) === '1.23'
  );
}

if (!isMinimumSupported()) {
  location.href = '/unsupported/';
}
