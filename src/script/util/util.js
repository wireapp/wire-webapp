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

import {Decoder, Encoder} from 'bazinga64';
import UUID from 'uuidjs';
import hljs from 'highlightjs';
import CryptoJS from 'crypto-js';
import SanitizationUtil from 'utils/SanitizationUtil';

/* eslint-disable no-unused-vars */
import PhoneFormatGlobal from 'phoneformat.js';
import MarkdownIt from 'markdown-it';
import StringUtilGlobal from './StringUtil';
/* eslint-enable no-unused-vars */

window.z = window.z || {};
window.z.util = z.util || {};

z.util.checkIndexedDb = () => {
  if (!z.util.Environment.browser.supports.indexedDb) {
    const errorType = z.util.Environment.browser.edge
      ? z.error.AuthError.TYPE.PRIVATE_MODE
      : z.error.AuthError.TYPE.INDEXED_DB_UNSUPPORTED;
    return Promise.reject(new z.error.AuthError(errorType));
  }

  if (z.util.Environment.browser.firefox) {
    let dbOpenRequest;

    try {
      dbOpenRequest = window.indexedDB.open('test');
      dbOpenRequest.onerror = event => {
        if (dbOpenRequest.error) {
          event.preventDefault();
          return Promise.reject(new z.error.AuthError(z.error.AuthError.TYPE.PRIVATE_MODE));
        }
      };
    } catch (error) {
      return Promise.reject(new z.error.AuthError(z.error.AuthError.TYPE.PRIVATE_MODE));
    }

    return new Promise((resolve, reject) => {
      let currentAttempt = 0;
      const interval = 10;
      const maxRetry = 50;

      const interval_id = window.setInterval(() => {
        currentAttempt += 1;

        if (dbOpenRequest.readyState === 'done' && !dbOpenRequest.result) {
          window.clearInterval(interval_id);
          return reject(new z.error.AuthError(z.error.AuthError.TYPE.PRIVATE_MODE));
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

z.util.loadDataUrl = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
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

z.util.loadFileBuffer = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
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
z.util.base64ToArray = base64 => Decoder.fromBase64(z.util.stripDataUri(base64)).asBytes;

/**
 * Convert ArrayBuffer or UInt8Array to base64 string
 * @param {ArrayBuffer|UInt8Array} array - raw binary data or bytes
 * @returns {string} Base64-encoded string
 */
z.util.arrayToBase64 = array => Encoder.toBase64(new Uint8Array(array)).asString;

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
 * @param {string} [mimeType] - Mime type of the generated download
 * @returns {number} Timeout identifier
 */

z.util.downloadBlob = (blob, filename, mimeType) => {
  if (blob) {
    const url = window.URL.createObjectURL(blob);
    return z.util.downloadFile(url, filename, mimeType);
  }

  throw new Error('Failed to download blob: Resource not provided');
};

z.util.downloadFile = (url, fileName, mimeType) => {
  const anchor = document.createElement('a');
  anchor.download = fileName;
  anchor.href = url;
  anchor.style = 'display: none';
  if (mimeType) {
    anchor.type = mimeType;
  }

  // Firefox needs the element to be in the DOM for the download to start:
  // @see https://stackoverflow.com/a/32226068
  document.body.appendChild(anchor);
  anchor.click();

  // Wait before removing resource and link. Needed in FF.
  return window.setTimeout(() => {
    const objectURL = anchor.href;
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(objectURL);
  }, 100);
};

z.util.phoneNumberToE164 = (phoneNumber, countryCode) => {
  return window.PhoneFormat.formatE164(`${countryCode}`.toUpperCase(), `${phoneNumber}`);
};

z.util.createRandomUuid = () => UUID.genV4().hexString;

z.util.encodeSha256Base64 = text => CryptoJS.SHA256(text).toString(CryptoJS.enc.Base64);

// Note IE10 listens to "transitionend" instead of "animationend"
z.util.alias = {
  animationend: 'transitionend animationend oAnimationEnd MSAnimationEnd mozAnimationEnd webkitAnimationEnd',
};

// Note: We are using "Underscore.js" to escape HTML in the original message
const markdownit = new MarkdownIt('zero', {
  breaks: true,
  html: false,
  langPrefix: 'lang-',
  linkify: true,
}).enable(['backticks', 'code', 'emphasis', 'fence', 'link', 'linkify', 'newline']);

markdownit.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const link = tokens[idx];
  const href = link.attrGet('href');
  const isEmail = href.startsWith('mailto:');
  const nextToken = tokens[idx + 1];
  const text = nextToken && nextToken.type === 'text' ? nextToken.content : '';
  if (!href || !text.trim()) {
    nextToken.content = '';
    const closeToken = tokens.slice(idx).find(token => token.type === 'link_close');
    closeToken.type = 'text';
    closeToken.content = '';
    return `[${SanitizationUtil.escapeString(text)}](${SanitizationUtil.escapeString(href)})`;
  }
  if (isEmail) {
    const email = SanitizationUtil.escapeString(href.replace(/^mailto:/, ''));
    link.attrPush(['onclick', `z.util.SanitizationUtil.safeMailtoOpen(event, '${email}')`]);
  } else {
    link.attrPush(['target', '_blank']);
    link.attrPush(['rel', 'nofollow noopener noreferrer']);
  }
  if (link.markup !== 'linkify') {
    link.attrPush(['data-md-link', 'true']);
    link.attrPush(['data-uie-name', 'markdown-link']);
  }
  return self.renderToken(tokens, idx, options);
};

const originalFenceRule = markdownit.renderer.rules.fence;

markdownit.renderer.rules.fence = (tokens, idx, options, env, self) => {
  const highlighted = originalFenceRule(tokens, idx, options, env, self);
  tokens[idx].map[1] += 1;
  return highlighted.replace(/\n$/, '');
};

markdownit.renderer.rules.softbreak = () => '<br>';
markdownit.renderer.rules.hardbreak = () => '<br>';
markdownit.renderer.rules.paragraph_open = (tokens, idx) => {
  const [position] = tokens[idx].map;
  const previousWithMap = tokens
    .slice(0, idx)
    .reverse()
    .find(({map}) => map && map.length);
  const previousPosition = previousWithMap ? previousWithMap.map[1] - 1 : 0;
  const count = position - previousPosition;
  return '<br>'.repeat(count);
};
markdownit.renderer.rules.paragraph_close = () => '';

z.util.renderMessage = (message, selfId, mentionEntities = []) => {
  const createMentionHash = mention => `@${btoa(JSON.stringify(mention)).replace(/=/g, '')}`;
  const renderMention = mentionData => {
    const elementClasses = mentionData.isSelfMentioned ? ' self-mention' : '';
    const elementAttributes = mentionData.isSelfMentioned
      ? ' data-uie-name="label-self-mention"'
      : ` data-uie-name="label-other-mention" data-user-id="${mentionData.userId}"`;

    const mentionText = mentionData.text.replace(/^@/, '');
    const content = `<span class="mention-at-sign">@</span>${z.util.SanitizationUtil.escapeString(mentionText)}`;
    return `<span class="message-mention${elementClasses}"${elementAttributes}>${content}</span>`;
  };
  const mentionTexts = {};

  let mentionlessText = mentionEntities
    .slice()
    // sort mentions to start with the latest mention first (in order not to have to recompute the index everytime we modify the original text)
    .sort((mention1, mention2) => mention2.startIndex - mention1.startIndex)
    .reduce((strippedText, mention) => {
      const mentionText = message.slice(mention.startIndex, mention.startIndex + mention.length);
      const mentionKey = createMentionHash(mention);
      mentionTexts[mentionKey] = {
        isSelfMentioned: mention.targetsUser(selfId),
        text: mentionText,
        userId: mention.userId,
      };
      return z.util.StringUtil.replaceInRange(
        strippedText,
        mentionKey,
        mention.startIndex,
        mention.startIndex + mention.length
      );
    }, message);

  markdownit.set({
    highlight: function(code) {
      const containsMentions = mentionEntities.some(mention => {
        const hash = createMentionHash(mention);
        return code.includes(hash);
      });
      if (containsMentions) {
        // disable code highlighting if there is a mention in there
        // highlighting will be wrong anyway because this is not valid code
        return code;
      }
      return hljs.highlightAuto(code).value;
    },
  });

  mentionlessText = markdownit.render(mentionlessText);

  // Remove <br> and \n if it is the last thing in a message
  mentionlessText = mentionlessText.replace(/(<br>|\n)*$/, '');

  const parsedText = Object.keys(mentionTexts).reduce((text, mentionHash) => {
    const mentionMarkup = renderMention(mentionTexts[mentionHash]);

    return text.replace(mentionHash, mentionMarkup);
  }, mentionlessText);

  return parsedText;
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
  const zerosNeeded = Math.max(0, length - value.toString().length);
  return `${'0'.repeat(zerosNeeded)}${value}`;
};

z.util.sortGroupsByLastEvent = (groupA, groupB) => groupB.last_event_timestamp() - groupA.last_event_timestamp();

z.util.sortObjectByKeys = (object, reverse) => {
  const keys = Object.keys(object);
  keys.sort();

  if (reverse) {
    keys.reverse();
  }

  // Returns a copy of an object, which is ordered by the keys of the original object.
  return keys.reduce((sortedObject, key) => {
    sortedObject[key] = object[key];
    return sortedObject;
  }, {});
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
  const allowDebugPhoneNumbers = z.config.FEATURE.ENABLE_DEBUG;
  const regularExpression = allowDebugPhoneNumbers ? /^\+[0-9]\d{1,14}$/ : /^\+[1-9]\d{1,14}$/;

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

z.util.printDevicesId = id => {
  if (!id) {
    return '';
  }

  const idWithPadding = z.util.zeroPadding(id, 16);
  const parts = idWithPadding.match(/.{1,2}/g) || [];
  const prettifiedId = parts.map(part => `<span class='device-id-part'>${part}</span>`);

  return prettifiedId.join('');
};

// https://developer.mozilla.org/en-US/Firefox/Performance_best_practices_for_Firefox_fe_engineers
z.util.afterRender = callback => window.requestAnimationFrame(() => window.setTimeout(callback, 0));

/**
 * No operation
 * @returns {void}
 */
z.util.noop = () => {};
