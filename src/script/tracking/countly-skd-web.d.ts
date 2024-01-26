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

declare module 'countly-sdk-web' {
  export interface UserData {
    set_once: (keyValues: {[key: string]: any}) => void;
    set: (key: string, value: any) => void;
    increment: (key: string) => void;
    incrementBy: (key: string, value: number) => void;
    save: () => void;
  }

  export interface Countly {
    q: any[];
    app_key: string;
    url: string;
    init(conf?: {app_key?: string; [key: string]: any}): Countly;
    end_session(): void;
    begin_session(): void;
    change_id(newId: string, merge: boolean): void;
    userData: UserData;
    add_event: (eventData: EventData) => void;
  }

  const Countly: Countly;
  // eslint-disable-next-line import/no-default-export
  export default Countly;
}
