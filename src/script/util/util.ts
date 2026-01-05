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
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {Runtime} from '@wireapp/commons';

import type {Conversation} from 'Repositories/entity/Conversation';

import {isTabKey} from './KeyboardUtil';
import {getLogger} from './Logger';

import {AuthError} from '../error/AuthError';

export const checkIndexedDb = (): Promise<void> => {
  if (!Runtime.isSupportingIndexedDb()) {
    const errorType = Runtime.isEdge() ? AuthError.TYPE.PRIVATE_MODE : AuthError.TYPE.INDEXED_DB_UNSUPPORTED;
    const errorMessage = Runtime.isEdge() ? AuthError.MESSAGE.PRIVATE_MODE : AuthError.MESSAGE.INDEXED_DB_UNSUPPORTED;
    return Promise.reject(new AuthError(errorType, errorMessage));
  }

  if (Runtime.isFirefox()) {
    let dbOpenRequest: IDBOpenDBRequest;

    try {
      dbOpenRequest = window.indexedDB.open('test');
      dbOpenRequest.onerror = event => {
        if (dbOpenRequest.error) {
          event.preventDefault();
          return Promise.reject(new AuthError(AuthError.TYPE.PRIVATE_MODE, AuthError.MESSAGE.PRIVATE_MODE));
        }
        return undefined;
      };
    } catch (error) {
      return Promise.reject(new AuthError(AuthError.TYPE.PRIVATE_MODE, AuthError.MESSAGE.PRIVATE_MODE));
    }

    return new Promise((resolve, reject) => {
      let currentAttempt = 0;
      const interval = 10;
      const maxRetry = 50;

      const interval_id = window.setInterval(() => {
        currentAttempt += 1;

        if (dbOpenRequest.readyState === 'done' && !dbOpenRequest.result) {
          window.clearInterval(interval_id);
          return reject(new AuthError(AuthError.TYPE.PRIVATE_MODE, AuthError.MESSAGE.PRIVATE_MODE));
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

export const loadDataUrl = (file: Blob): Promise<string | ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const loadUrlBuffer = (
  url: string,
  xhrAccessorFunction?: (xhr: XMLHttpRequest) => void,
): Promise<{buffer: ArrayBuffer; mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = () => {
      const isStatusOK = xhr.status === HTTP_STATUS.OK;
      return isStatusOK
        ? resolve({buffer: xhr.response, mimeType: xhr.getResponseHeader('content-type')})
        : reject(new Error(xhr.status.toString(10)));
    };

    xhr.onerror = reject;

    if (typeof xhrAccessorFunction === 'function') {
      xhrAccessorFunction(xhr);
    }
    xhr.send();
  });
};

export const loadImage = function (blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const object_url = window.URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      resolve(img);
      window.URL.revokeObjectURL(object_url);
    };
    img.onerror = reject;
    img.src = object_url;
  });
};

export const loadFileBuffer = (file: Blob | File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const loadUrlBlob = (url: string): Promise<Blob> => {
  return loadUrlBuffer(url).then(({buffer, mimeType}) => new Blob([new Uint8Array(buffer)], {type: mimeType}));
};

export const getFileExtension = (filename: string): string => {
  const extensionMatch = filename?.match(/\.(tar\.gz|[^.]*)$/i);
  const foundExtension = extensionMatch?.[1];
  return foundExtension || '';
};

export const getName = (nodePath: string): string => {
  const parts = nodePath.split('/');
  return parts[parts.length - 1];
};

export const getFileExtensionFromUrl = (url: string): string => {
  const cleanUrl = url.split(/[?#]/)[0];
  return getFileExtension(cleanUrl);
};

export const trimFileExtension = (filename?: string): string => {
  if (typeof filename === 'string') {
    if (filename.endsWith('.tar.gz')) {
      filename = filename.replace(/\.tar\.gz$/, '');
    }

    return filename.replace(/\.[^/.]+$/, '');
  }

  return '';
};

export const formatBytes = (bytes: number, decimals: number = 1): string => {
  if (bytes === 0) {
    return '0 B';
  }

  const kilobytes = 1024;
  decimals += 1;
  const unit = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const index = Math.floor(Math.log(bytes) / Math.log(kilobytes));
  return `${parseFloat((bytes / Math.pow(kilobytes, index)).toFixed(decimals))} ${unit[index]}`;
};

export const getContentTypeFromDataUrl = (dataUrl: string): string => {
  return dataUrl.match(/^.*:(.*);.*,/)[1];
};

export const stripDataUri = (string: string): string => string.replace(/^data:.*,/, '');

/**
 * Convert a base64 string to an Uint8Array.
 * @note Function will remove "data-uri" attribute if present.
 */
export const base64ToArray = (base64: string): Uint8Array => {
  return Decoder.fromBase64(stripDataUri(base64)).asBytes;
};

/**
 * Convert an ArrayBuffer or an Uint8Array to a base64 string
 */
export const arrayToBase64 = (array: ArrayBuffer | Uint8Array): string => {
  return Encoder.toBase64(array).asString;
};

/**
 * Convert base64 dataURI to Blob
 */
export const base64ToBlob = (base64: string): Blob => {
  const mimeType = getContentTypeFromDataUrl(base64);
  const bytes = base64ToArray(base64);
  return new Blob([bytes], {type: mimeType});
};

/**
 * Downloads blob using a hidden link element.ƒ
 */
export const downloadBlob = (blob: Blob, filename: string, mimeType?: string): number => {
  if (blob) {
    const url = window.URL.createObjectURL(blob);
    return downloadFile(url, filename, mimeType);
  }

  throw new Error('Failed to download blob: Resource not provided');
};

export const downloadFile = (url: string, fileName: string, mimeType?: string): number => {
  const anchor = document.createElement('a');
  anchor.download = fileName;
  anchor.href = url;
  anchor.style.display = 'none';
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
 * Get the file name with the extension. If the file name already has the extension, it won't be added again.
 * @param name The file name
 * @param extension The file extension
 * @returns The file name with the extension
 */
export const getFileNameWithExtension = (name: string, extension: string): string => {
  const hasExtension = name.toLowerCase().endsWith(`.${extension.toLowerCase()}`);
  return hasExtension ? name : `${name}.${extension}`;
};

/**
 * Forces file download instead of browser "preview".
 * We use fetch + blob because native <a download> doesn't work reliably across browsers and file types (especially PDFs and images).
 */
export const forcedDownloadFile = async ({url, name}: {url: string; name: string}) => {
  const response = await fetch(url);
  const blob = await response.blob();
  const newBlob = new Blob([blob], {type: 'application/octet-stream'});
  const newUrl = window.URL.createObjectURL(newBlob);
  const link = document.createElement('a');
  link.href = newUrl;
  link.setAttribute('download', name);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(newUrl);
};

/**
 * Add zero padding until limit is reached.
 */
export const zeroPadding = (value: string | number, length = 2): string => {
  const zerosNeeded = Math.max(0, length - value.toString().length);
  return `${'0'.repeat(zerosNeeded)}${value}`;
};

export const sortGroupsByLastEvent = (groupA: Conversation, groupB: Conversation): number =>
  groupB.last_event_timestamp() - groupA.last_event_timestamp();

// Removes url(' and url(" from the beginning of the string and also ") and ') from the end
export const stripUrlWrapper = (url: string) => url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');

export const validateProfileImageResolution = (file: File, minWidth: number, minHeight: number): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image.width >= minWidth && image.height >= minHeight);
    image.onerror = () => reject(new Error('Failed to load profile picture for size validation'));
    image.src = window.URL.createObjectURL(file);
  });
};

// https://developer.mozilla.org/en-US/Firefox/Performance_best_practices_for_Firefox_fe_engineers
export const afterRender = (callback: TimerHandler): number =>
  window.requestAnimationFrame(() => window.setTimeout(callback, 0));

/**
 * No operation
 */
export const noop = (): void => {};

const focusableElementsSelector =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const preventFocusOutside = (
  event: KeyboardEvent,
  parentId: string,
  targetDocument: Document = document,
): void => {
  if (!isTabKey(event)) {
    return;
  }
  event.preventDefault();
  const parent = targetDocument.getElementById(parentId);
  const focusableContent = parent ? [...parent.querySelectorAll(focusableElementsSelector)] : [];
  const focusedItemIndex = focusableContent.indexOf(targetDocument.activeElement);
  if (event.shiftKey && focusedItemIndex != 0) {
    (focusableContent[focusedItemIndex - 1] as HTMLElement)?.focus();
    return;
  }
  if (event.shiftKey && focusedItemIndex === 0) {
    (focusableContent[focusableContent.length - 1] as HTMLElement)?.focus();
    return;
  }
  if (!event.shiftKey && focusedItemIndex === focusableContent.length - 1) {
    (focusableContent[0] as HTMLElement)?.focus();
    return;
  }
  (focusableContent[focusedItemIndex + 1] as HTMLElement)?.focus();
};

export const setContextMenuPosition = (event: React.KeyboardEvent) => {
  event.stopPropagation();
  event.preventDefault();

  const {top, left, height} = (event.target as Element).getBoundingClientRect();
  return new MouseEvent('MouseEvent', {
    ...(event as unknown as MouseEvent),
    clientX: left,
    clientY: top + height,
  });
};

const supportsSecretStorage = () => !Runtime.isDesktopApp() || !!window.systemCrypto;

// disables mls for old 'broken' desktop clients, see https://github.com/wireapp/wire-desktop/pull/6094
export const supportsMLS = () => supportsSecretStorage();

export const incomingCssClass = 'content-animation-incoming-horizontal-left';

export const removeAnimationsClass = (element: HTMLElement | null) => {
  if (element) {
    element.addEventListener('animationend', () => {
      if (element.classList.contains(incomingCssClass)) {
        element.classList.remove(incomingCssClass);
      }
    });
  }
};

export class InitializationEventLogger {
  private logger = getLogger('AppInitialization');
  private timestamp: number;

  constructor(private userId: string) {
    this.timestamp = Date.now();
  }

  log(step: string, options = {}) {
    this.logger.info('Performance tracking: ', {
      appInitialization: {
        user_id: this.userId,
        step,
        duration: Date.now() - this.timestamp,
        ...options,
      },
    });
    this.timestamp = Date.now(); // Reset the timestamp after logging
  }
}

export enum AppInitializationStep {
  AppInitialize = 'AppInitialize',
  UserInitialize = 'UserInitialize',
  SetupEventProcessors = 'SetupEventProcessors',
  ValidatedClient = 'ValidatedClient',
  ConversationsLoaded = 'ConversationsLoaded',
  UserDataLoaded = 'UserDataLoaded',
  DecryptionCompleted = 'DecryptionCompleted',
  SetupMLS = 'SetupMls',
  ClientsUpdated = 'ClientsUpdated',
  AppInitCompleted = 'AppInitCompleted',
}
