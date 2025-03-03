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

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function pluralize(text: string, times: number, options?: {postfix: string}) {
  const postfix = options?.postfix || 's';
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
export function serializeArgs(args: any[]): any[] {
  return args.map(arg => {
    if (typeof arg === 'string') {
      return arg.length > maxSize ? `${arg.slice(0, maxSize - 15)}... [truncated]` : arg;
    }

    if (typeof arg === 'object' && arg !== null) {
      try {
        return safeJsonStringify(arg);
      } catch (e) {
        return '[Unserializable Object]';
      }
    }

    return arg;
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
