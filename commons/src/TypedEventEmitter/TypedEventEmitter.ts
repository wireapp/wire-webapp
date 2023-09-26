/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {EventEmitter} from 'events';

export class TypedEventEmitter<T extends Record<string | symbol, any>> extends EventEmitter {
  emit<K extends keyof T>(eventName: K, ...args: T[K][]): boolean {
    return super.emit(eventName as string, ...args);
  }

  on<K extends keyof T>(eventName: K, listener: (...args: T[K][]) => void): this {
    return super.on(eventName as string, listener);
  }

  once<K extends keyof T>(eventName: K, listener: (...args: T[K][]) => void): this {
    return super.once(eventName as string, listener);
  }

  off<K extends keyof T>(eventName: K, listener: (...args: T[K][]) => void): this {
    return super.off(eventName as string, listener);
  }
}
