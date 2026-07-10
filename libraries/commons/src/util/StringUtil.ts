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

import is from '@sindresorhus/is';

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function pluralize(text: string, times: number, options?: {postfix: string}) {
  const postfix = is.nonEmptyString(options?.postfix) ? options.postfix : 's';
  return `${text}${times === 1 ? '' : postfix}`;
}

export function uuidToBytes(uuid: string): Buffer {
  return Buffer.from(uuid.replace(/-/g, ''), 'hex');
}

export function bytesToUUID(uuid: Buffer | Uint8Array): string {
  const str = uuid.toString('hex');
  return `${str.slice(0, 8)}-${str.slice(8, 12)}-${str.slice(12, 16)}-${str.slice(16, 20)}-${str.slice(20)}`;
}

const maxSize = 10_000;
const maximumSafeLogMessageLength = 200;
const maximumSafeErrorNameLength = 100;
const redactedValue = '[REDACTED]';
const loggableUrlPattern = /\b(?:wss?|https?):\/\/[^\s"'<>]+/giu;
const sensitiveQueryParameterPattern =
  /\b(access_token|sync_marker|marker_token|token|client|client_id)=([^&\s"']*)/giu;
const bearerCredentialPattern = /\b(authorization\s*:\s*)?bearer\s+[^\s,;]+/giu;
const cookieHeaderPattern = /\b(?:set-cookie|cookie)\s*:\s*[^;\s]*(?:;[^\r\n]*)?/giu;
const jsonWebTokenPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu;
const safeErrorNamePattern = /^[A-Za-z0-9_.:-]+$/u;
const newlinePattern = /[\r\n]+/gu;

export function serializeArgs(args: any[]): any[] {
  return args.map(arg => {
    let result: any;

    if (typeof arg === 'string') {
      result = arg.length > maxSize ? `${arg.slice(0, maxSize - 15)}... [truncated]` : arg;
    } else if (typeof arg === 'object' && arg !== null) {
      try {
        result = safeJsonStringify(arg);
      } catch (e) {
        result = '[Unserializable Object]';
      }
    } else {
      result = arg;
    }

    return redactSensitiveData(result);
  });
}

// Helper function to prevent circular references
function getCircularReplacer() {
  const seen = new WeakSet();
  return (_key: string, value: any) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    return value;
  };
}

function safeJsonStringify(obj: any): string {
  try {
    const json = JSON.stringify(obj, getCircularReplacer());

    if (json.length > maxSize) {
      return `${json.slice(0, maxSize - 15)}... [truncated]`;
    }

    return json;
  } catch {
    return '[Unserializable Object]';
  }
}

export function redactSensitiveData(input: any): any {
  if (typeof input === 'string') {
    return redactSensitiveString(input);
  }

  if (typeof input === 'object' && input !== null) {
    const clone = JSON.parse(JSON.stringify(input));
    if (typeof clone.headers?.Authorization === 'string') {
      clone.headers.Authorization = redactSensitiveString(clone.headers.Authorization);
    }
    return clone;
  }

  return input;
}

export type SafeErrorDetails = {
  readonly errorName: string;
  readonly errorMessage: string;
};

function sanitizeUrlForLog(urlValue: string): string {
  try {
    const url = new URL(urlValue);
    return url.search.length > 0 ? `${url.origin}${url.pathname}?${redactedValue}` : `${url.origin}${url.pathname}`;
  } catch {
    return urlValue;
  }
}

function redactSensitiveString(value: string): string {
  const valueWithSanitizedUrls = value.replace(loggableUrlPattern, sanitizeUrlForLog);
  const valueWithSanitizedQueryParameters = valueWithSanitizedUrls.replace(
    sensitiveQueryParameterPattern,
    `$1=${redactedValue}`,
  );
  const valueWithSanitizedHeaders = valueWithSanitizedQueryParameters
    .replace(
      bearerCredentialPattern,
      (_matchedValue, authorizationPrefix: string | undefined) => `${authorizationPrefix ?? ''}Bearer ${redactedValue}`,
    )
    .replace(cookieHeaderPattern, `Cookie: ${redactedValue}`);

  return valueWithSanitizedHeaders.replace(jsonWebTokenPattern, redactedValue);
}

export function sanitizeLogMessage(message: string): string {
  return redactSensitiveString(message.replace(newlinePattern, ' ')).slice(0, maximumSafeLogMessageLength);
}

export function formatSafeLogValue(value: string): string {
  return JSON.stringify(sanitizeLogMessage(value));
}

function sanitizeErrorName(errorName: string): string {
  const isSafeErrorName = errorName.length <= maximumSafeErrorNameLength && safeErrorNamePattern.test(errorName);

  return isSafeErrorName ? errorName : 'UnknownError';
}

export function getSafeErrorDetails(error: unknown): SafeErrorDetails {
  if (is.error(error)) {
    return {
      errorMessage: formatSafeLogValue(error.message),
      errorName: sanitizeErrorName(error.name),
    };
  }

  if (is.string(error)) {
    return {
      errorMessage: formatSafeLogValue(error),
      errorName: 'UnknownError',
    };
  }

  return {
    errorMessage: formatSafeLogValue('Unknown error'),
    errorName: 'UnknownError',
  };
}
