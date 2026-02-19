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

import {singleton} from 'tsyringe';

@singleton()
export class WindowService {
  onResize(callback: (event: UIEvent) => void) {
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
  }
  onOnline(callback: (event: Event) => void) {
    window.addEventListener('online', callback);
    return () => window.removeEventListener('online', callback);
  }
  onOffline(callback: (event: Event) => void) {
    window.addEventListener('offline', callback);
    return () => window.removeEventListener('offline', callback);
  }
  onVisibilityChange(callback: (event: Event) => void) {
    window.addEventListener('visibilitychange', callback);
    return () => window.removeEventListener('visibilitychange', callback);
  }
  onFocus(callback: (event: Event) => void) {
    window.addEventListener('focus', callback);
    return () => window.removeEventListener('focus', callback);
  }
}
