/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

const isBrowserSupported = () => {
  return (
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
    (1.23456789).toFixed(2) === '1.23' &&
    'RTCPeerConnection' in window
  );
};

if (!isBrowserSupported()) {
  location.href = '/unsupported/';
}
