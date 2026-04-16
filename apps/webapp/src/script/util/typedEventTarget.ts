/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

export class TypedEventTarget<EventDef extends {type: any}> extends EventTarget {
  public dispatch(event: EventDef): boolean {
    return this.dispatchEvent(new Event(event.type));
  }

  public addEventListener<T extends EventDef['type']>(type: T, listener: ((e: Event & EventDef) => void) | null) {
    super.addEventListener(type, listener);
  }

  public removeEventListener(type: EventDef['type'], listener: (e: Event & EventDef) => void) {
    super.removeEventListener(type, listener);
  }
}
