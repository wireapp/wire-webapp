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

import is from '@sindresorhus/is';

import {EventListenerService} from './eventListenerService';

type ListenerEntry = {
  readonly listener: EventListenerOrEventListenerObject;
  readonly capture: boolean;
  readonly once: boolean;
};

export type DeterministicEventListenerService = EventListenerService & {
  dispatch(type: string, event: Event): void;
};

function normalizeCapture(options?: boolean | AddEventListenerOptions | EventListenerOptions): boolean {
  if (is.boolean(options)) {
    return options;
  }

  return options?.capture ?? false;
}

function normalizeOnce(options?: boolean | AddEventListenerOptions): boolean {
  if (is.boolean(options)) {
    return false;
  }

  return options?.once ?? false;
}

export function createDeterministicEventListenerService(): DeterministicEventListenerService {
  const listenerMap = new Map<string, ListenerEntry[]>();

  return {
    addEventListener(type, listener, options) {
      if (is.nullOrUndefined(listener)) {
        return;
      }

      const entries = listenerMap.get(type) ?? [];

      if (!listenerMap.has(type)) {
        listenerMap.set(type, entries);
      }

      entries.push({
        capture: normalizeCapture(options),
        listener,
        once: normalizeOnce(options),
      });
    },

    removeEventListener(type, listener, options) {
      if (is.nullOrUndefined(listener)) {
        return;
      }

      const capture = normalizeCapture(options);
      const entries = listenerMap.get(type);

      if (is.undefined(entries)) {
        return;
      }

      const index = entries.findIndex(entry => entry.listener === listener && entry.capture === capture);

      if (index !== -1) {
        entries.splice(index, 1);
      }
    },

    dispatch(type, event) {
      const entries = listenerMap.get(type);

      if (is.undefined(entries)) {
        return;
      }

      for (const entry of entries) {
        if (entry.once) {
          const current = listenerMap.get(type);

          if (!is.undefined(current)) {
            const index = current.indexOf(entry);

            if (index !== -1) {
              current.splice(index, 1);
            }
          }
        }

        if (is.function_(entry.listener)) {
          entry.listener(event);
        } else {
          entry.listener.handleEvent(event);
        }
      }
    },
  };
}
