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

z.util.checkIndexedDb = function() {
  if (!z.util.Environment.browser.supports.indexedDb) {
    if (z.util.Environment.browser.edge) {
      return Promise.reject(new z.auth.AuthError(z.auth.AuthError.TYPE.PRIVATE_MODE));
    }
    return Promise.reject(new z.auth.AuthError(z.auth.AuthError.TYPE.INDEXED_DB_UNSUPPORTED));
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
        currentAttempt = currentAttempt + 1;

        if (dbOpenRequest.readyState === 'done' && !dbOpenRequest.result) {
          window.clearInterval(interval_id);
          return reject(new z.auth.AuthError(z.auth.AuthError.TYPE.PRIVATE_MODE));
        }

        if (currentAttempt >= maxRetry) {
          window.clearInterval(interval_id);
          resolve();
        }
      }, interval);
    });
  }

  return Promise.resolve();
};

z.util.dummyImage = function(width, height) {
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}' width='${width}' height='${height}'></svg>`;
};

z.util.isSameLocation = function(pastLocation, currentLocation) {
  return pastLocation !== '' && currentLocation.startsWith(pastLocation);
};

z.util.loadImage = function(blob) {
  return new Promise((resolve, reject) => {
    const object_url = window.URL.createObjectURL(blob);
    const img = new Image();
    img.onload = function() {
      resolve(this);
      return window.URL.revokeObjectURL(object_url);
    };
    img.onerror = reject;
    img.src = object_url;
  });
};

z.util.loadDataUrl = function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function() {
      return resolve(this.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

z.util.loadFileBuffer = function(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function() {
      return resolve(this.result);
    };
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
      if (isStatusOK) {
        return resolve({buffer: xhr.response, mimeType: xhr.getResponseHeader('content-type')});
      }
      return reject(new Error(`Requesting arraybuffer failed with status ${xhr.status}`));
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

z.util.appendUrlParameter = function(url, parameter) {
  const separator = z.util.StringUtil.includes(url, '?') ? '&' : '?';
  return `${url}${separator}${parameter}`;
};

z.util.forwardUrlParameter = function(url, parameterName) {
  const parameterValue = z.util.getUrlParameter(parameterName);
  if (parameterValue != null) {
    return z.util.appendUrlParameter(url, `${parameterName}=${parameterValue}`);
  }
  return url;
};

z.util.getUrlParameter = function(name) {
  const params = window.location.search.substring(1).split('&');
  for (const param of params) {
    let value = param.split('=');
    if (value[0] === name) {
      if (value[1]) {
        value = window.decodeURI(value[1]);

        if (value === 'false') {
          return false;
        }

        if (value === 'true') {
          return true;
        }

        return value;
      }
      return true;
    }
  }
  return null;
};

/**
 * Get extension of a filename.
 * @param {string} filename - filename including extension
 * @returns {string} File extension
 */
z.util.getFileExtension = function(filename) {
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
z.util.trimFileExtension = function(filename) {
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
z.util.formatBytes = function(bytes, decimals) {
  if (bytes === 0) {
    return '0B';
  }

  const kilobytes = 1024;
  decimals = decimals + 1 || 2;
  const unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const index = Math.floor(Math.log(bytes) / Math.log(kilobytes));
  return parseFloat((bytes / Math.pow(kilobytes, index)).toFixed(decimals)) + unit[index];
};

/**
 * Format seconds into hh:mm:ss.
 * @param {number} duration - duration to format in seconds
 * @returns {string}
 */

z.util.formatSeconds = function(duration) {
  duration = Math.round(duration || 0);

  const hours = Math.floor(duration / (60 * 60));

  const divisorForMinutes = duration % (60 * 60);
  const minutes = Math.floor(divisorForMinutes / 60);

  const divisor_for_seconds = divisorForMinutes % 60;
  const seconds = Math.ceil(divisor_for_seconds);

  const components = [z.util.zero_padding(minutes), z.util.zero_padding(seconds)];

  if (hours > 0) {
    components.unshift(hours);
  }

  return components.join(':');
};

/**
 * Format seconds into 15s, 2m.
 * @param {number} duration - duration to format in seconds
 * @returns {Array} First index holds the values, second index holds the unit format.
 */
z.util.formatMillisecondsShort = function(duration) {
  const seconds = Math.floor(duration / 1000);
  switch (false) {
    case !(seconds < 60):
      return [seconds, 's'];
    case !(seconds < 60 * 60):
      return [Math.floor(seconds / 60), 'm'];
    case !(seconds < 60 * 60 * 24):
      return [Math.floor(seconds / 60 / 60), 'h'];
    default:
      return [Math.floor(seconds / 60 / 60 / 24), 'd'];
  }
};

z.util.getContentTypeFromDataUrl = function(data_url) {
  return data_url
    .split(',')[0]
    .split(':')[1]
    .split(';')[0];
};

z.util.stripDataUri = function(string) {
  return string.replace(/^data:.*,/, '');
};

/**
 * Convert base64 string to UInt8Array.
 * @note Function will remove "data-uri" attribute if present.
 * @param {string} base64 - base64 encoded string
 * @returns {UInt8Array} Typed array
 */
z.util.base64ToArray = function(base64) {
  return bazinga64.Decoder.fromBase64(z.util.stripDataUri(base64)).asBytes;
};

/**
 * Convert ArrayBuffer or UInt8Array to base64 string
 * @param {ArrayBuffer|UInt8Array} array - raw binary data or bytes
 * @returns {string} Base64-encoded string
 */
z.util.arrayToBase64 = function(array) {
  return bazinga64.Encoder.toBase64(new Uint8Array(array), true).asString;
};

/**
 * Returns base64 encoded md5 of the the given array.
 * @param {Uint8Array} array - Input array
 * @returns {string} MD5 hash
 */
z.util.arrayToMd5Base64 = function(array) {
  const wordArray = CryptoJS.lib.WordArray.create(array);
  return CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Base64);
};

/**
 * Convert base64 dataURI to Blob
 * @param {string} base64 - base64 encoded data uri
 * @returns {Blob} Binary output
 */

z.util.base64ToBlob = function(base64) {
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

z.util.downloadBlob = function(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  document.body.appendChild(link);
  link.href = url;
  link.download = filename;
  link.style = 'display: none';
  link.click();

  // Wait before removing resource and link. Needed in FF
  return window.setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
};

z.util.phoneNumberToE164 = function(phoneNumber, countryCode) {
  return window.PhoneFormat.formatE164(`${countryCode}`.toUpperCase(), `${phoneNumber}`);
};

z.util.createRandomUuid = function() {
  return UUID.genV4().hexString;
};

/**
 * Returns a random integer between min (included) and max (excluded).
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number} Random integer
 */
z.util.getRandomInt = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min);
};

z.util.encodeBase64 = function(text) {
  return window.btoa(text);
};

z.util.encodeSha256Base64 = function(text) {
  return CryptoJS.SHA256(text).toString(CryptoJS.enc.Base64);
};

z.util.escape_html = function(html) {
  return _.escape(html);
};

z.util.escape_regex = function(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Note IE10 listens to "transitionend" instead of "animationend"
z.util.alias = {
  animationend: 'transitionend animationend oAnimationEnd MSAnimationEnd mozAnimationEnd webkitAnimationEnd',
};

z.util.add_blank_targets = function(text_with_anchors) {
  return `${text_with_anchors}`.replace(/rel="nofollow"/gi, 'target="_blank" rel="nofollow noopener noreferrer"');
};

/**
 * Adds http to given url if protocol missing
 * @param {string} url - URL you want to open in a new browser tab
 * @returns {undefined} No return value
 */
z.util.add_http = function(url) {
  if (!url.match(/^http[s]?:\/\//i)) {
    url = `http://${url}`;
  }

  return url;
};

/**
 * Opens a new browser tab (target="_blank") with a given URL in a safe environment.
 * @see https://mathiasbynens.github.io/rel-noopener/
 * @param {string} url - URL you want to open in a new browser tab
 * @param {boolean} focus - True, if the new windows should get browser focus
 * @returns {Object} New window handle
 */
z.util.safe_window_open = function(url, focus = true) {
  const new_window = window.open(z.util.add_http(url));

  if (new_window) {
    new_window.opener = null;
    if (focus) {
      new_window.focus();
    }
  }

  return new_window;
};

z.util.safe_mailto_open = function(event, email) {
  event.preventDefault();
  event.stopPropagation();

  if (!z.util.is_valid_email(email)) {
    return;
  }

  const new_window = window.open(`mailto:${email}`);
  if (new_window) {
    window.setTimeout(() => new_window.close(), 10);
  }
};

z.util.get_last_characters = function(message, amount) {
  if (message.length < amount) {
    return false;
  }

  return message.substring(message.length - amount);
};

z.util.cut_last_characters = function(message, amount) {
  return message.substring(0, message.length - amount);
};

z.util.markup_links = function(message) {
  return message.replace(/<a\s+href=/gi, '<a target="_blank" rel="nofollow noopener noreferrer" href=');
};

// Note: We are using "Underscore.js" to escape HTML in the original message
z.util.render_message = function(message) {
  message = marked(message, {
    highlight: function(code) {
      return hljs.highlightAuto(code).value;
    },
    sanitize: true,
  });

  // Remove this when this is merged: https://github.com/SoapBox/linkifyjs/pull/189
  message = message.replace(/\n/g, '<br />');

  // Remove <br /> if it is the last thing in a message
  if (z.util.get_last_characters(message, '<br />'.length) === '<br />') {
    message = z.util.cut_last_characters(message, '<br />'.length);
  }

  return message;
};

z.util.ko_array_push_all = function(ko_array, values_to_push) {
  // append array to knockout observableArray
  // https://github.com/knockout/knockout/issues/416
  const underlyingArray = ko_array();
  ko_array.valueWillMutate();
  ko.utils.arrayPushAll(underlyingArray, values_to_push);
  return ko_array.valueHasMutated();
};

z.util.ko_array_unshift_all = function(ko_array, values_to_shift) {
  // prepend array to knockout observableArray
  const underlyingArray = ko_array();
  ko_array.valueWillMutate();
  Array.prototype.unshift.apply(underlyingArray, values_to_shift);
  return ko_array.valueHasMutated();
};

z.util.ko_push_deferred = function(target, src, number = 100, delay = 300) {
  // push array deferred to knockout observableArray
  let interval;

  return (interval = window.setInterval(() => {
    const chunk = src.splice(0, number);
    z.util.ko_array_push_all(target, chunk);

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
z.util.zero_padding = function(value, length = 2) {
  if (value.toString().length < length) {
    return z.util.zero_padding(`0${value}`, length);
  }

  return `${value}`;
};

/**
 * Human readable format of a timestamp.
 * @note: Not testable due to timezones :(
 * @param {number} timestamp - Timestamp
 * @param {boolean} long_format - True, if output should have leading numbers
 * @returns {string} Human readable format of a timestamp.
 */
z.util.format_timestamp = function(timestamp, long_format = true) {
  const time = moment(timestamp);
  let format = 'DD.MM.YYYY (HH:mm:ss)';

  if (long_format) {
    format = moment().year() === time.year() ? 'ddd D MMM, HH:mm' : 'ddd D MMM YYYY, HH:mm';
  }

  return time.format(format);
};

/**
 * Test whether the given string is ISO 8601 format equally to date.toISOString()
 * @param {string} date_string - String with data
 * @returns {boolean} True, if input string follows ISO 8601
 */
z.util.is_iso_string = function(date_string) {
  return /\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z)/.test(date_string);
};

z.util.sort_groups_by_last_event = (groupA, groupB) => {
  return groupB.last_event_timestamp() - groupA.last_event_timestamp();
};

z.util.sort_object_by_keys = function(object, reverse) {
  const sorted_object = {};
  const keys = Object.keys(object);
  keys.sort();

  if (reverse) {
    for (let index = keys.length - 1; index >= 0; index--) {
      const key = keys[index];
      const value = object[key];
      sorted_object[key] = value;
    }
  } else {
    for (const key of keys) {
      const value = object[key];
      sorted_object[key] = value;
    }
  }

  // Returns a copy of an object, which is ordered by the keys of the original object.
  return sorted_object;
};

z.util.strip_url_wrapper = function(url) {
  /**
   * This will remove url(' and url(" from the beginning of the string.
   * It will also remove ") and ') from the end if present.
   */
  return url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
};

/**
 * Removes protocol, www and trailing slashes in the given url
 * @param {string} url - URL
 * @returns {string} Plain URL
 */
z.util.naked_url = function(url = '') {
  return url
    .toLowerCase()
    .replace(/.*?:\/\//, '') // remove protocol
    .replace(/\/$/, '') // remove trailing slash
    .replace('www.', '');
};

z.util.valid_profile_image_size = function(file, min_width, min_height, callback) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image.width >= min_width && image.height >= min_height);
    image.onerror = () => reject(new Error('Failed to load profile picture for size validation'));
    image.src = window.URL.createObjectURL(file);
  });
};

z.util.is_valid_email = function(email) {
  const regExp = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regExp.test(email);
};

/**
 * Checks if input has the format of an international phone number
 * @note Begins with + and contains only numbers
 * @param {string} phoneNumber - Input
 * @returns {boolean} True, if the input a phone number
 */
z.util.is_valid_phone_number = function(phoneNumber) {
  let regular_expression;

  if (z.util.Environment.backend.current === z.service.BackendEnvironment.PRODUCTION) {
    regular_expression = /^\+[1-9]\d{1,14}$/;
  } else {
    regular_expression = /^\+[0-9]\d{1,14}$/;
  }

  return regular_expression.test(phoneNumber);
};

z.util.is_valid_username = function(username) {
  if (username.startsWith('@')) {
    username = username.substring(1);
  }
  return /^[a-z_0-9]{2,21}$/.test(username);
};

z.util.murmurhash3 = function(key, seed) {
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

z.util.get_unix_timestamp = function() {
  return Math.floor(Date.now() / 1000);
};

z.util.get_first_name = function(user_et, declension = z.string.Declension.NOMINATIVE) {
  if (user_et.is_me) {
    if (declension === z.string.Declension.NOMINATIVE) {
      return z.l10n.text(z.string.conversationYouNominative);
    } else if (declension === z.string.Declension.DATIVE) {
      return z.l10n.text(z.string.conversationYouDative);
    } else if (declension === z.string.Declension.ACCUSATIVE) {
      return z.l10n.text(z.string.conversationYouAccusative);
    }
  }
  return user_et.first_name();
};

z.util.print_devices_id = function(id) {
  if (!id) {
    return '';
  }

  const id_with_padding = z.util.zero_padding(id, 16);
  let prettified_id = '';

  for (const part of id_with_padding.match(/.{1,2}/g)) {
    prettified_id += `<span class='device-id-part'>${part}</span>`;
  }

  return prettified_id;
};

/**
 * Returns bucket for given value based on the specified bucket limits
 * @example z.util.bucket_values(13, [0, 5, 10, 15, 20, 25]) will return '11-15')
 * @param {number} value - Numeric value
 * @param {Array<number>} bucket_limits - Array with numeric values that define the upper limit of the bucket
 * @returns {string} Bucket
 */
z.util.bucket_values = function(value, bucket_limits) {
  if (value < bucket_limits[0] + 1) {
    return '0';
  }

  for (let index = 0; index < bucket_limits.length; index++) {
    const limit = bucket_limits[index];
    if (value < limit + 1) {
      const previous_limit = bucket_limits[index - 1];
      return `${previous_limit + 1}-${limit}`;
    }
  }

  const last_limit = bucket_limits[bucket_limits.length - 1];
  return `${last_limit + 1}-`;
};

z.util.format_time_remaining = function(time_remaining) {
  const moment_duration = moment.duration(time_remaining);

  let title = '';
  if (moment_duration.asHours() === 1) {
    title += `${moment_duration.hours()} ${z.l10n.text(z.string.ephememalUnitsHour)}, `;
  } else if (moment_duration.asHours() > 1) {
    title += `${moment_duration.hours()} ${z.l10n.text(z.string.ephememalUnitsHours)}, `;
  }

  if (moment_duration.asMinutes() === 1) {
    title += `${moment_duration.minutes()} ${z.l10n.text(z.string.ephememalUnitsMinute)} ${z.l10n.text(z.string.and)} `;
  } else if (moment_duration.asMinutes() > 1) {
    title += `${moment_duration.minutes()} ${z.l10n.text(z.string.ephememalUnitsMinutes)} ${z.l10n.text(
      z.string.and
    )} `;
  }

  if (moment_duration.asSeconds() === 1) {
    title += `${moment_duration.seconds()} ${z.l10n.text(z.string.ephememalUnitsSecond)}`;
  } else if (moment_duration.asSeconds() > 1) {
    title += `${moment_duration.seconds()} ${z.l10n.text(z.string.ephememalUnitsSeconds)}`;
  }

  return title || '';
};

z.util.afterRender = callback => {
  // https://developer.mozilla.org/en-US/Firefox/Performance_best_practices_for_Firefox_fe_engineers
  window.requestAnimationFrame(() => window.setTimeout(callback, 0));
};

/**
 * No operation
 * @returns {undefined}
 */
z.util.noop = function() {};
