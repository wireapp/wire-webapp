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
import MarkdownIt from 'markdown-it';
import 'phoneformat.js';

import {escapeString} from './SanitizationUtil';
import {replaceInRange} from './StringUtil';
import {loadValue} from './StorageUtil';
import {Environment} from './Environment';

import {Config} from '../auth/config';
import {StorageKey} from '../storage/StorageKey';
import * as URLUtil from '../auth/util/urlUtil';
import {QUERY_KEY} from '../auth/route';

export const isTemporaryClientAndNonPersistent = () => {
  const enableTransientTemporaryClients =
    URLUtil.getURLParameter(QUERY_KEY.PERSIST_TEMPORARY_CLIENTS) === 'false' ||
    (Config.FEATURE && Config.FEATURE.PERSIST_TEMPORARY_CLIENTS === false);
  return loadValue(StorageKey.AUTH.PERSIST) === false && enableTransientTemporaryClients;
};

export const checkIndexedDb = () => {
  if (isTemporaryClientAndNonPersistent()) {
    return Promise.resolve();
  }

  if (!Environment.browser.supports.indexedDb) {
    const errorType = Environment.browser.edge
      ? z.error.AuthError.TYPE.PRIVATE_MODE
      : z.error.AuthError.TYPE.INDEXED_DB_UNSUPPORTED;
    return Promise.reject(new z.error.AuthError(errorType));
  }

  if (Environment.browser.firefox) {
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

export const loadDataUrl = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const loadUrlBuffer = (url, xhrAccessorFunction) => {
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

export const loadImage = function(blob) {
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

export const loadFileBuffer = file => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const loadUrlBlob = url => {
  return loadUrlBuffer(url).then(({buffer, mimeType}) => new Blob([new Uint8Array(buffer)], {type: mimeType}));
};

/**
 * Get extension of a filename.
 * @param {string} filename - filename including extension
 * @returns {string} File extension
 */
export const getFileExtension = filename => {
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
export const trimFileExtension = filename => {
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
export const formatBytes = (bytes, decimals) => {
  if (bytes === 0) {
    return '0B';
  }

  const kilobytes = 1024;
  decimals = decimals + 1 || 2;
  const unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const index = Math.floor(Math.log(bytes) / Math.log(kilobytes));
  return parseFloat((bytes / Math.pow(kilobytes, index)).toFixed(decimals)) + unit[index];
};

export const getContentTypeFromDataUrl = data_url => {
  return data_url
    .split(',')[0]
    .split(':')[1]
    .split(';')[0];
};

export const stripDataUri = string => string.replace(/^data:.*,/, '');

/**
 * Convert base64 string to UInt8Array.
 * @note Function will remove "data-uri" attribute if present.
 * @param {string} base64 - base64 encoded string
 * @returns {UInt8Array} Typed array
 */
export const base64ToArray = base64 => Decoder.fromBase64(stripDataUri(base64)).asBytes;

/**
 * Convert ArrayBuffer or UInt8Array to base64 string
 * @param {ArrayBuffer|UInt8Array} array - raw binary data or bytes
 * @returns {string} Base64-encoded string
 */
export const arrayToBase64 = array => Encoder.toBase64(new Uint8Array(array)).asString;

/**
 * Returns base64 encoded md5 of the the given array.
 * @param {Uint8Array} array - Input array
 * @returns {string} MD5 hash
 */
export const arrayToMd5Base64 = array => {
  const wordArray = CryptoJS.lib.WordArray.create(array);
  return CryptoJS.MD5(wordArray).toString(CryptoJS.enc.Base64);
};

/**
 * Convert base64 dataURI to Blob
 * @param {string} base64 - base64 encoded data uri
 * @returns {Blob} Binary output
 */

export const base64ToBlob = base64 => {
  const mimeType = getContentTypeFromDataUrl(base64);
  const bytes = base64ToArray(base64);
  return new Blob([bytes], {type: mimeType});
};

/**
 * Downloads blob using a hidden link element.
 * @param {Blob} blob - Blob to store
 * @param {string} filename - Data will be saved under this name
 * @param {string} [mimeType] - Mime type of the generated download
 * @returns {number} Timeout identifier
 */

export const downloadBlob = (blob, filename, mimeType) => {
  if (blob) {
    const url = window.URL.createObjectURL(blob);
    return downloadFile(url, filename, mimeType);
  }

  throw new Error('Failed to download blob: Resource not provided');
};

export const downloadFile = (url, fileName, mimeType) => {
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

/**
 * @param {string} phoneNumber - The phone number
 * @param {string} countryCode - The country code
 * @returns {string} The formatted phone number
 */
export const phoneNumberToE164 = (phoneNumber, countryCode) => {
  return window.PhoneFormat.formatE164(`${countryCode}`.toUpperCase(), `${phoneNumber}`);
};

export const createRandomUuid = () => UUID.genV4().hexString;

export const encodeSha256Base64 = text => CryptoJS.SHA256(text).toString(CryptoJS.enc.Base64);

// Note IE10 listens to "transitionend" instead of "animationend"
export const alias = {
  animationend: 'transitionend animationend oAnimationEnd MSAnimationEnd mozAnimationEnd webkitAnimationEnd',
};

// Note: We are using "Underscore.js" to escape HTML in the original message
const markdownit = new MarkdownIt('zero', {
  breaks: true,
  html: false,
  langPrefix: 'lang-',
  linkify: true,
}).enable(['autolink', 'backticks', 'code', 'emphasis', 'fence', 'link', 'linkify', 'newline']);

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

// https://github.com/markdown-it/markdown-it/issues/458#issuecomment-401221267
function fixMarkdownLinks(markdown) {
  const matches = markdownit.linkify.match(markdown);
  if (!matches || matches.length === 0) {
    return markdown;
  }
  const result = [];
  let prevEndIndex = 0;
  for (const match of matches) {
    const startsWithProto = /^https?:\/\//i.test(match.raw);
    const noStartBracket = match.index === 0 || markdown[match.index - 1] !== '<';
    const noEndBracket = match.lastIndex === markdown.length || markdown[match.lastIndex] !== '>';
    const shouldInsertBrackets = startsWithProto && noStartBracket && noEndBracket;

    result.push(markdown.slice(prevEndIndex, match.index));
    result.push(shouldInsertBrackets ? `<${match.raw}>` : match.raw);
    prevEndIndex = match.lastIndex;
  }
  result.push(markdown.slice(prevEndIndex));
  return result.join('');
}

export const renderMessage = (message, selfId, mentionEntities = []) => {
  const createMentionHash = mention => `@@${btoa(JSON.stringify(mention)).replace(/=/g, '')}`;
  const renderMention = mentionData => {
    const elementClasses = mentionData.isSelfMentioned ? ' self-mention' : '';
    const elementAttributes = mentionData.isSelfMentioned
      ? ' data-uie-name="label-self-mention"'
      : ` data-uie-name="label-other-mention" data-user-id="${mentionData.userId}"`;

    const mentionText = mentionData.text.replace(/^@/, '');
    const content = `<span class="mention-at-sign">@</span>${escapeString(mentionText)}`;
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
      return replaceInRange(strippedText, mentionKey, mention.startIndex, mention.startIndex + mention.length);
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

  markdownit.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const cleanString = hashedString =>
      escapeString(
        Object.entries(mentionTexts).reduce(
          (text, [mentionHash, mention]) => text.replace(mentionHash, mention.text),
          hashedString,
        ),
      );
    const link = tokens[idx];
    const href = cleanString(link.attrGet('href'));
    const isEmail = href.startsWith('mailto:');
    const isWireDeepLink = href.toLowerCase().startsWith('wire://');
    const nextToken = tokens[idx + 1];
    const text = nextToken && nextToken.type === 'text' ? nextToken.content : '';

    if (!href || !text.trim()) {
      nextToken.content = '';
      const closeToken = tokens.slice(idx).find(token => token.type === 'link_close');
      closeToken.type = 'text';
      closeToken.content = '';
      return `[${cleanString(text)}](${cleanString(href)})`;
    }
    if (isEmail) {
      link.attrPush(['data-email-link', 'true']);
    } else {
      link.attrPush(['target', '_blank']);
      link.attrPush(['rel', 'nofollow noopener noreferrer']);
    }
    if (!isWireDeepLink && !['autolink', 'linkify'].includes(link.markup)) {
      const title = link.attrGet('title');
      if (title) {
        link.attrSet('title', cleanString(title));
      }
      link.attrSet('href', cleanString(href));
      if (nextToken && nextToken.type === 'text') {
        nextToken.content = text;
      }
      link.attrPush(['data-md-link', 'true']);
      link.attrPush(['data-uie-name', 'markdown-link']);
    }
    if (isWireDeepLink) {
      link.attrPush(['data-uie-name', 'wire-deep-link']);
    }
    if (link.markup === 'linkify') {
      nextToken.content = encodeURI(nextToken.content);
    }
    return self.renderToken(tokens, idx, options);
  };

  mentionlessText = fixMarkdownLinks(mentionlessText);
  mentionlessText = markdownit.render(mentionlessText);
  // Remove <br> and \n if it is the last thing in a message
  mentionlessText = mentionlessText.replace(/(<br>|\n)*$/, '');

  const parsedText = Object.keys(mentionTexts).reduce((text, mentionHash) => {
    const mentionMarkup = renderMention(mentionTexts[mentionHash]);

    return text.replace(mentionHash, mentionMarkup);
  }, mentionlessText);

  return parsedText;
};

export const koArrayPushAll = (koArray, valuesToPush) => {
  // append array to knockout observableArray
  // https://github.com/knockout/knockout/issues/416
  const underlyingArray = koArray();
  koArray.valueWillMutate();
  ko.utils.arrayPushAll(underlyingArray, valuesToPush);
  koArray.valueHasMutated();
};

export const koArrayUnshiftAll = (koArray, valuesToShift) => {
  // prepend array to knockout observableArray
  const underlyingArray = koArray();
  koArray.valueWillMutate();
  Array.prototype.unshift.apply(underlyingArray, valuesToShift);
  koArray.valueHasMutated();
};

export const koPushDeferred = (target, src, number = 100, delay = 300) => {
  // push array deferred to knockout observableArray
  let interval;

  return (interval = window.setInterval(() => {
    const chunk = src.splice(0, number);
    koArrayPushAll(target, chunk);

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
export const zeroPadding = (value, length = 2) => {
  const zerosNeeded = Math.max(0, length - value.toString().length);
  return `${'0'.repeat(zerosNeeded)}${value}`;
};

export const sortGroupsByLastEvent = (groupA, groupB) => groupB.last_event_timestamp() - groupA.last_event_timestamp();

export const sortObjectByKeys = (object, reverse) => {
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
export const stripUrlWrapper = url => url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');

export const validateProfileImageResolution = (file, minWidth, minHeight) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image.width >= minWidth && image.height >= minHeight);
    image.onerror = () => reject(new Error('Failed to load profile picture for size validation'));
    image.src = window.URL.createObjectURL(file);
  });
};

export const murmurhash3 = (key, seed) => {
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

export const printDevicesId = id => {
  if (!id) {
    return '';
  }

  const idWithPadding = zeroPadding(id, 16);
  const parts = idWithPadding.match(/.{1,2}/g) || [];
  const prettifiedId = parts.map(part => `<span class='device-id-part'>${part}</span>`);

  return prettifiedId.join('');
};

// https://developer.mozilla.org/en-US/Firefox/Performance_best_practices_for_Firefox_fe_engineers
export const afterRender = callback => window.requestAnimationFrame(() => window.setTimeout(callback, 0));

/**
 * No operation
 * @returns {void}
 */
export const noop = () => {};
