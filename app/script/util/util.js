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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

z.util.checkIndexedDb = () => {
  if (!z.util.Environment.browser.supports.indexedDb) {
    const errorType = z.util.Environment.browser.edge
      ? z.auth.AuthError.TYPE.PRIVATE_MODE
      : z.auth.AuthError.TYPE.INDEXED_DB_UNSUPPORTED;
    return Promise.reject(new z.auth.AuthError(errorType));
  }

  if (z.util.Environment.browser.firefox) {
    let dbOpenRequest;

    try {
      dbOpenRequest = window.indexedDB.open('test');
      dbOpenRequest.onerror = event => {
        if (dbOpenRequest.error) {
          event.preventDefault();
          return Promise.reject(new z.auth.AuthError(z.auth.AuthError.TYPE.PRIVATE_MODE));
        }
      };
    } catch (error) {
      return Promise.reject(new z.auth.AuthError(z.auth.AuthError.TYPE.PRIVATE_MODE));
    }

    return new Promise((resolve, reject) => {
      let currentAttempt = 0;
      const interval = 10;
      const maxRetry = 50;

      const interval_id = window.setInterval(() => {
        currentAttempt += 1;

        if (dbOpenRequest.readyState === 'done' && !dbOpenRequest.result) {
          window.clearInterval(interval_id);
          return reject(new z.auth.AuthError(z.auth.AuthError.TYPE.PRIVATE_MODE));
        }

        const tooManyAttempts = currentAttempt >= maxRetry;
        if (tooManyAttempts) {
          window.clearInterval(interval_id);
          resolve();
        }
      }, interval);
    });
  }

  return Promise.resolve();
};

z.util.isSameLocation = (pastLocation, currentLocation) => {
  return pastLocation !== '' && currentLocation.startsWith(pastLocation);
};

z.util.loadImage = function(blob) {
  return new Promise((resolve, reject) => {
    const object_url = window.URL.createObjectURL(blob);
    const img = new Image();
    img.onload = function() {
      resolve(this);
      window.URL.revokeObjectURL(object_url);
    };
    img.onerror = reject;
    img.src = object_url;
  });
};

z.util.loadDataUrl = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

z.util.loadFileBuffer = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

z.util.loadUrlBuffer = (url, xhrAccessorFunction) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = () => {
      const isStatusOK = xhr.status === 200;
      return isStatusOK
        ? resolve({buffer: xhr.response, mimeType: xhr.getResponseHeader('content-type')})
        : reject(new Error(xhr.status));
    };

    xhr.onerror = reject;

    if (typeof xhrAccessorFunction === 'function') {
      xhrAccessorFunction(xhr);
    }
    xhr.send();
  });
};

z.util.loadUrlBlob = url => {
  return z.util.loadUrlBuffer(url).then(({buffer, mimeType}) => new Blob([new Uint8Array(buffer)], {type: mimeType}));
};

/**
 * Get extension of a filename.
 * @param {string} filename - filename including extension
 * @returns {string} File extension
 */
z.util.getFileExtension = filename => {
  if (!_.isString(filename) || !filename.includes('.')) {
    return '';
  }

  if (filename.endsWith('.tar.gz')) {
    return 'tar.gz';
  }

  return filename.substr(filename.lastIndexOf('.') + 1);
};

/**
 * Remove extension of a filename.
 * @param {string} filename - filename including extension
 * @returns {string} New String without extension
 */
z.util.trimFileExtension = filename => {
  if (_.isString(filename)) {
    if (filename.endsWith('.tar.gz')) {
      filename = filename.replace(/\.tar\.gz$/, '');
    }

    return filename.replace(/\.[^/.]+$/, '');
  }

  return '';
};

/**
 * Format bytes into a human readable string.
 * @param {number} bytes - bytes to format
 * @param {number} [decimals] - Number of decimals to keep
 * @returns {string} Bytes as a human readable string
 */
z.util.formatBytes = (bytes, decimals) => {
  if (bytes === 0) {
    return '0B';
  }

  const kilobytes = 1024;
  decimals = decimals + 1 || 2;
  const unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const index = Math.floor(Math.log(bytes) / Math.log(kilobytes));
  return parseFloat((bytes / Math.pow(kilobytes, index)).toFixed(decimals)) + unit[index];
};

z.util.getContentTypeFromDataUrl = data_url => {
  return data_url
    .split(',')[0]
    .split(':')[1]
    .split(';')[0];
};

z.util.stripDataUri = string => string.replace(/^data:.*,/, '');

/**
 * Convert base64 string to UInt8Array.
 * @note Function will remove "data-uri" attribute if present.
 * @param {string} base64 - base64 encoded string
 * @returns {UInt8Array} Typed array
 */
z.util.base64ToArray = base64 => bazinga64.Decoder.fromBase64(z.util.stripDataUri(base64)).asBytes;

/**
 * Convert ArrayBuffer or UInt8Array to base64 string
 * @param {ArrayBuffer|UInt8Array} array - raw binary data or bytes
 * @returns {string} Base64-encoded string
 */
z.util.arrayToBase64 = array => bazinga64.Encoder.toBase64(new Uint8Array(array), true).asString;

/**
 * Returns base64 encoded md5 of the the given array.
 * @param {Uint8Array} array - Input array
 * @returns {string} MD5 hash
 */
z.util.arrayToMd5Base64 = array => {
  const wordArray = CryptoJS.lib.WordArray.create(array);
  return CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Base64);
};

/**
 * Convert base64 dataURI to Blob
 * @param {string} base64 - base64 encoded data uri
 * @returns {Blob} Binary output
 */

z.util.base64ToBlob = base64 => {
  const mimeType = z.util.getContentTypeFromDataUrl(base64);
  const bytes = z.util.base64ToArray(base64);
  return new Blob([bytes], {type: mimeType});
};

/**
 * Downloads blob using a hidden link element.
 * @param {Blob} blob - Blob to store
 * @param {string} filename - Data will be saved under this name
 * @returns {number} Timeout identifier
 */

z.util.downloadBlob = (blob, filename, mimeType) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  // firefox needs the element to be in the DOM for the download to start
  // see https://stackoverflow.com/a/32226068
  document.body.appendChild(link);
  link.href = url;
  link.download = filename;
  link.style = 'display: none';
  if (mimeType) {
    link.type = mimeType;
  }
  link.click();

  // Wait before removing resource and link. Needed in FF
  return window.setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

z.util.phoneNumberToE164 = (phoneNumber, countryCode) => {
  return window.PhoneFormat.formatE164(`${countryCode}`.toUpperCase(), `${phoneNumber}`);
};

z.util.createRandomUuid = () => UUID.genV4().hexString;

z.util.encodeBase64 = text => window.btoa(text);

z.util.encodeSha256Base64 = text => CryptoJS.SHA256(text).toString(CryptoJS.enc.Base64);

z.util.escapeHtml = html => _.escape(html);

z.util.escapeRegex = string => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Note IE10 listens to "transitionend" instead of "animationend"
z.util.alias = {
  animationend: 'transitionend animationend oAnimationEnd MSAnimationEnd mozAnimationEnd webkitAnimationEnd',
};

/**
 * Opens a new browser tab (target="_blank") with a given URL in a safe environment.
 * @see https://mathiasbynens.github.io/rel-noopener/
 * @param {string} url - URL you want to open in a new browser tab
 * @param {boolean} focus - True, if the new windows should get browser focus
 * @returns {Object} New window handle
 */
z.util.safeWindowOpen = (url, focus = true) => {
  const newWindow = window.open(z.util.URLUtil.prependProtocol(url));

  if (newWindow) {
    newWindow.opener = null;
    if (focus) {
      newWindow.focus();
    }
  }

  return newWindow;
};

z.util.safeMailtoOpen = (event, email) => {
  event.preventDefault();
  event.stopPropagation();

  if (!z.util.isValidEmail(email)) {
    return;
  }

  const newWindow = window.open(`mailto:${email}`);
  if (newWindow) {
    window.setTimeout(() => newWindow.close(), 10);
  }
};

// Note: We are using "Underscore.js" to escape HTML in the original message
z.util.renderMessage = message => {
  message = marked(message, {
    highlight: function(code) {
      return hljs.highlightAuto(code).value;
    },
    sanitize: true,
  });

  // Remove this when this is merged: https://github.com/SoapBox/linkifyjs/pull/189
  message = message.replace(/\n/g, '<br />');

  // Remove <br /> if it is the last thing in a message
  if (z.util.StringUtil.getLastChars(message, '<br />'.length) === '<br />') {
    message = z.util.StringUtil.cutLastChars(message, '<br />'.length);
  }

  return message;
};

z.util.koArrayPushAll = (koArray, valuesToPush) => {
  // append array to knockout observableArray
  // https://github.com/knockout/knockout/issues/416
  const underlyingArray = koArray();
  koArray.valueWillMutate();
  ko.utils.arrayPushAll(underlyingArray, valuesToPush);
  koArray.valueHasMutated();
};

z.util.koArrayUnshiftAll = (koArray, valuesToShift) => {
  // prepend array to knockout observableArray
  const underlyingArray = koArray();
  koArray.valueWillMutate();
  Array.prototype.unshift.apply(underlyingArray, valuesToShift);
  koArray.valueHasMutated();
};

z.util.koPushDeferred = (target, src, number = 100, delay = 300) => {
  // push array deferred to knockout observableArray
  let interval;

  return (interval = window.setInterval(() => {
    const chunk = src.splice(0, number);
    z.util.koArrayPushAll(target, chunk);

    if (src.length === 0) {
      return window.clearInterval(interval);
    }
  }, delay));
};

/**
 * Add zero padding until limit is reached.
 * @param {string|number} value - Input
 * @param {number} length - Final output length
 * @returns {string} Input value with leading zeros (padding)
 */
z.util.zeroPadding = (value, length = 2) => {
  return value.toString().length < length ? z.util.zeroPadding(`0${value}`, length) : `${value}`;
};

/**
 * Test whether the given string is ISO 8601 format equally to date.toISOString()
 * @param {string} dateString - String with data
 * @returns {boolean} True, if input string follows ISO 8601
 */
z.util.isIsoString = dateString => {
  return /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test(dateString);
};

z.util.sortGroupsByLastEvent = (groupA, groupB) => groupB.last_event_timestamp() - groupA.last_event_timestamp();

z.util.sortObjectByKeys = (object, reverse) => {
  const sortedObject = {};
  const keys = Object.keys(object);
  keys.sort();

  if (reverse) {
    for (let index = keys.length - 1; index >= 0; index--) {
      const key = keys[index];
      const value = object[key];
      sortedObject[key] = value;
    }
  } else {
    for (const key of keys) {
      const value = object[key];
      sortedObject[key] = value;
    }
  }

  // Returns a copy of an object, which is ordered by the keys of the original object.
  return sortedObject;
};

// Removes url(' and url(" from the beginning of the string and also ") and ') from the end
z.util.stripUrlWrapper = url => url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');

z.util.validateProfileImageResolution = (file, minWidth, minHeight) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image.width >= minWidth && image.height >= minHeight);
    image.onerror = () => reject(new Error('Failed to load profile picture for size validation'));
    image.src = window.URL.createObjectURL(file);
  });
};

z.util.isValidEmail = email => {
  const regExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regExp.test(email);
};

/**
 * Checks if input has the format of an international phone number
 * @note Begins with + and contains only numbers
 * @param {string} phoneNumber - Input
 * @returns {boolean} True, if the input a phone number
 */
z.util.isValidPhoneNumber = phoneNumber => {
  const isProductionBackend = z.util.Environment.backend.current === z.service.BackendEnvironment.PRODUCTION;
  const regularExpression = isProductionBackend ? /^\+[1-9]\d{1,14}$/ : /^\+[0-9]\d{1,14}$/;

  return regularExpression.test(phoneNumber);
};

z.util.isValidUsername = username => {
  if (username.startsWith('@')) {
    username = username.substring(1);
  }
  return /^[a-z_0-9]{2,21}$/.test(username);
};

z.util.murmurhash3 = (key, seed) => {
  const remainder = key.length & 3; // key.length % 4
  const bytes = key.length - remainder;
  let h1 = seed;
  const c1 = 0xcc9e2d51;
  const c2 = 0x1b873593;
  let index = 0;

  while (index < bytes) {
    let k1 =
      (key.charCodeAt(index) & 0xff) |
      ((key.charCodeAt(++index) & 0xff) << 8) |
      ((key.charCodeAt(++index) & 0xff) << 16) |
      ((key.charCodeAt(++index) & 0xff) << 24);
    ++index;

    k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
    k1 = (k1 << 15) | (k1 >>> 17);
    k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;

    h1 ^= k1;
    h1 = (h1 << 13) | (h1 >>> 19);
    const h1b = ((h1 & 0xffff) * 5 + ((((h1 >>> 16) * 5) & 0xffff) << 16)) & 0xffffffff;
    h1 = (h1b & 0xffff) + 0x6b64 + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16);
  }

  let k1 = 0;

  switch (remainder) {
    case 3:
      k1 ^= (key.charCodeAt(index + 2) & 0xff) << 16;
      break;
    case 2:
      k1 ^= (key.charCodeAt(index + 1) & 0xff) << 8;
      break;
    case 1:
      k1 ^= key.charCodeAt(index) & 0xff;

      k1 = ((k1 & 0xffff) * c1 + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
      k1 = (k1 << 15) | (k1 >>> 17);
      k1 = ((k1 & 0xffff) * c2 + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
      h1 ^= k1;
      break;
    default:
      break;
  }

  h1 ^= key.length;

  h1 ^= h1 >>> 16;
  h1 = ((h1 & 0xffff) * 0x85ebca6b + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 13;
  h1 = ((h1 & 0xffff) * 0xc2b2ae35 + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16)) & 0xffffffff;
  h1 ^= h1 >>> 16;

  return h1 >>> 0;
};

z.util.getFirstName = (userEt, declension = z.string.Declension.NOMINATIVE) => {
  if (userEt.is_me) {
    let stringId;

    switch (declension) {
      case z.string.Declension.NOMINATIVE:
        stringId = z.string.conversationYouNominative;
        break;
      case z.string.Declension.DATIVE:
        stringId = z.string.conversationYouDative;
        break;
      case z.string.Declension.ACCUSATIVE:
        stringId = z.string.conversationYouAccusative;
        break;
    }

    return z.l10n.text(stringId);
  }

  return userEt.first_name();
};

z.util.printDevicesId = id => {
  if (!id) {
    return '';
  }

  const idWithPadding = z.util.zeroPadding(id, 16);
  let prettifiedId = '';

  for (const part of idWithPadding.match(/.{1,2}/g)) {
    prettifiedId += `<span class='device-id-part'>${part}</span>`;
  }

  return prettifiedId;
};

/**
 * Returns bucket for given value based on the specified bucket limits
 * @example z.util.bucketValues(13, [0, 5, 10, 15, 20, 25]) will return '11-15')
 * @param {number} value - Numeric value
 * @param {Array<number>} bucketLimits - Array with numeric values that define the upper limit of the bucket
 * @returns {string} Bucket
 */
z.util.bucketValues = (value, bucketLimits) => {
  if (value < bucketLimits[0] + 1) {
    return '0';
  }

  for (let index = 0; index < bucketLimits.length; index++) {
    const limit = bucketLimits[index];
    if (value < limit + 1) {
      const previous_limit = bucketLimits[index - 1];
      return `${previous_limit + 1}-${limit}`;
    }
  }

  const last_limit = bucketLimits[bucketLimits.length - 1];
  return `${last_limit + 1}-`;
};

z.util.formatTimeRemaining = timeRemaining => {
  const momentDuration = moment.duration(timeRemaining);

  let title = '';
  if (momentDuration.asHours() === 1) {
    title += `${momentDuration.hours()} ${z.l10n.text(z.string.ephememalUnitsHour)}, `;
  } else if (momentDuration.asHours() > 1) {
    title += `${momentDuration.hours()} ${z.l10n.text(z.string.ephememalUnitsHours)}, `;
  }

  if (momentDuration.asMinutes() === 1) {
    title += `${momentDuration.minutes()} ${z.l10n.text(z.string.ephememalUnitsMinute)} ${z.l10n.text(z.string.and)} `;
  } else if (momentDuration.asMinutes() > 1) {
    title += `${momentDuration.minutes()} ${z.l10n.text(z.string.ephememalUnitsMinutes)} ${z.l10n.text(z.string.and)} `;
  }

  if (momentDuration.asSeconds() === 1) {
    title += `${momentDuration.seconds()} ${z.l10n.text(z.string.ephememalUnitsSecond)}`;
  } else if (momentDuration.asSeconds() > 1) {
    title += `${momentDuration.seconds()} ${z.l10n.text(z.string.ephememalUnitsSeconds)}`;
  }

  return title || '';
};

// https://developer.mozilla.org/en-US/Firefox/Performance_best_practices_for_Firefox_fe_engineers
z.util.afterRender = callback => window.requestAnimationFrame(() => window.setTimeout(callback, 0));

/**
 * No operation
 * @returns {void}
 */
z.util.noop = () => {};
