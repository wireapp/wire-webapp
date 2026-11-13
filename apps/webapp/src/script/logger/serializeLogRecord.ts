/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {isError} from '@sindresorhus/is';

import type {Logger} from './logger';
import {redactSensitiveString} from './redactSensitiveString';
import type {LogRecord} from './structuredLogger';

type JsonValue = string | number | boolean | null | JsonValue[] | JsonProperties;
type JsonProperties = {readonly [key: string]: JsonValue};

type NormalizePropertyOptions = {
  readonly source: object;
  readonly key: string;
  readonly ancestors: WeakSet<object>;
};

const numericLevels: Readonly<Record<keyof Logger, number>> = {debug: 20, info: 30, warn: 40, error: 50};
const reservedKeys = new Set(['level', 'time', 'component', 'msg', 'attributes']);
const maximumStringLength = 10_000;
const truncationMarker = '... [truncated]';
const unserializableValue = '[Unserializable Object]';
const hexadecimalRadix = 16;
const unicodeEscapeDigitCount = 4;

function encodeJson(properties: JsonProperties): string {
  // Desktop still rewrites Logdown styling and access_token= fragments in console text.
  // Use identical JSON escaping in every environment so those rewrites cannot damage a record.
  return JSON.stringify(properties).replace(/%|=|#|font-weight:/gu, sequence => {
    return sequence === 'font-weight:'
      ? '\\u0066ont-weight:'
      : `\\u${sequence.charCodeAt(0).toString(hexadecimalRadix).padStart(unicodeEscapeDigitCount, '0')}`;
  });
}

function normalizeString(value: string): string {
  const redacted = redactSensitiveString(value);

  return redacted.length > maximumStringLength
    ? redacted.slice(0, maximumStringLength - truncationMarker.length) + truncationMarker
    : redacted;
}

function createJsonProperties(entries: readonly (readonly [string, JsonValue])[]): JsonProperties {
  const sanitizedEntries = entries.map(entry => {
    return [normalizeString(entry[0]), entry[1]] as const;
  });
  const distinctKeys = new Set(
    sanitizedEntries.map(entry => {
      return entry[0];
    }),
  );

  // Redaction can collapse distinct URL/credential keys. Retain every value rather than overwrite it.
  return distinctKeys.size === sanitizedEntries.length
    ? Object.fromEntries(sanitizedEntries)
    : {
        entries: sanitizedEntries.map(entry => {
          return [entry[0], entry[1]];
        }),
      };
}

function normalizeProperty(options: NormalizePropertyOptions): JsonValue {
  const {source, key, ancestors} = options;

  try {
    return normalizeValue(Reflect.get(source, key), ancestors);
  } catch {
    return unserializableValue;
  }
}

function normalizeProperties(source: object, ancestors: WeakSet<object>): JsonProperties {
  return createJsonProperties(
    Object.keys(source).map(key => {
      return [key, normalizeProperty({source, key, ancestors})] as const;
    }),
  );
}

function normalizeError(error: Error, ancestors: WeakSet<object>): JsonProperties {
  let properties: JsonProperties;
  try {
    const toJSON: unknown = Reflect.get(error, 'toJSON');
    if (typeof toJSON === 'function') {
      // Honor provider projections which may deliberately exclude private request properties.
      const projected: unknown = Reflect.apply(toJSON, error, []);
      const normalized =
        projected === error ? normalizeProperties(error, ancestors) : normalizeValue(projected, ancestors);
      properties =
        typeof normalized === 'object' && normalized !== null && !Array.isArray(normalized)
          ? normalized
          : {details: normalized};
    } else {
      properties = normalizeProperties(error, ancestors);
    }
  } catch {
    properties = {serializationError: unserializableValue};
  }

  return {
    ...properties,
    name: normalizeProperty({source: error, key: 'name', ancestors}),
    message: normalizeProperty({source: error, key: 'message', ancestors}),
    ...('stack' in error ? {stack: normalizeProperty({source: error, key: 'stack', ancestors})} : {}),
    ...('cause' in error ? {cause: normalizeProperty({source: error, key: 'cause', ancestors})} : {}),
  };
}

function normalizeValue(value: unknown, ancestors: WeakSet<object>): JsonValue {
  try {
    if (typeof value === 'string') {
      return normalizeString(value);
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : String(value);
    }
    if (typeof value === 'boolean' || value === null) {
      return value;
    }
    if (typeof value === 'bigint' || typeof value === 'symbol') {
      return normalizeString(String(value));
    }
    if (typeof value === 'undefined') {
      return '[undefined]';
    }
    if (typeof value === 'function') {
      return '[Function]';
    }
    if (ancestors.has(value)) {
      return '[Circular]';
    }
    ancestors.add(value);

    try {
      if (isError(value)) {
        return normalizeError(value, ancestors);
      }
      if (Array.isArray(value)) {
        return Array.from({length: value.length}, (_value, index) => {
          return normalizeProperty({source: value, key: String(index), ancestors});
        });
      }

      const toJSON: unknown = Reflect.get(value, 'toJSON');
      if (typeof toJSON === 'function') {
        const projected: unknown = Reflect.apply(toJSON, value, []);

        return projected === value ? normalizeProperties(value, ancestors) : normalizeValue(projected, ancestors);
      }
      if (value instanceof Map) {
        return Array.from(value.entries(), entry => {
          return normalizeValue(entry, ancestors);
        });
      }
      if (value instanceof Set) {
        return Array.from(value.values(), entry => {
          return normalizeValue(entry, ancestors);
        });
      }

      return normalizeProperties(value, ancestors);
    } finally {
      ancestors.delete(value);
    }
  } catch {
    return unserializableValue;
  }
}

/**
 * Metadata always wins. Conflicting attributes, including a literal "attributes" key,
 * are retained under "attributes"; other attributes become top-level properties.
 * Normalize and redact values before JSON encoding, never slice encoded JSON.
 */
export function serializeLogRecord(record: LogRecord): string {
  const metadata = {
    level: numericLevels[record.level],
    time: record.timestamp,
    component: record.component,
    msg: normalizeString(record.message),
  };

  try {
    const source = record.attributes.unwrapOr({});
    const ancestors = new WeakSet<object>();
    ancestors.add(source);
    const entries = Object.keys(source).map(key => {
      return [key, normalizeProperty({source, key, ancestors})] as const;
    });
    const attributes = createJsonProperties(
      entries.filter(entry => {
        return !reservedKeys.has(entry[0]);
      }),
    );
    const conflicts = entries.filter(entry => {
      return reservedKeys.has(entry[0]);
    });

    return encodeJson({
      ...attributes,
      ...(conflicts.length > 0 ? {attributes: Object.fromEntries(conflicts)} : {}),
      ...metadata,
    });
  } catch {
    return encodeJson({...metadata, attributes: unserializableValue});
  }
}
