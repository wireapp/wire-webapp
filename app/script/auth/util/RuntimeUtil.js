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

import platform from 'platform';

export default class RuntimeUtil {
  static BROWSER_NAME = {
    CHROME: 'Chrome',
    EDGE: 'Microsoft Edge',
    ELECTRON: 'Electron',
    FIREFOX: 'Firefox',
    OPERA: 'Opera',
    WIRE: 'Wire',
  };

  static PLATFORM_NAME = {
    MACINTOSH: 'Mac',
    WINDOWS: 'Win',
  };

  static PLATFORM_TYPE = {
    BROWSER_APP: 'web',
    DESKTOP_LINUX: 'linux',
    DESKTOP_MACOS: 'mac',
    DESKTOP_WINDOWS: 'windows',
  };

  static isElectron() {
    return platform.name === RuntimeUtil.BROWSER_NAME.ELECTRON;
  }

  static isDesktop() {
    return RuntimeUtil.isElectron() && platform.ua.includes(RuntimeUtil.BROWSER_NAME.WIRE);
  }

  static getPlatform() {
    if (RuntimeUtil.isDesktop()) {
      if (platform.os.family.includes(RuntimeUtil.PLATFORM_NAME.WINDOWS)) {
        return RuntimeUtil.PLATFORM_TYPE.DESKTOP_WINDOWS;
      }
      if (platform.ua.includes(RuntimeUtil.PLATFORM_NAME.MACINTOSH)) {
        return RuntimeUtil.PLATFORM_TYPE.DESKTOP_MACOS;
      }
      return RuntimeUtil.PLATFORM_TYPE.DESKTOP_LINUX;
    }
    return RuntimeUtil.PLATFORM_TYPE.BROWSER_APP;
  }

  static hasCookieSupport() {}

  static hasIndexDbSupport() {}
}
