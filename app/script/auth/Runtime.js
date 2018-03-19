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

export const BROWSER = {
  CHROME: 'chrome',
  EDGE: 'edge',
  ELECTRON: 'electron',
  FIREFOX: 'firefox',
  IE: 'ie',
  OPERA: 'opera',
  SAFARI: 'safari',
};

export const OS = {
  DESKTOP: {
    LINUX: ['linux', 'ubuntu', 'fedora', 'gentoo', 'debian', 'suse', 'centos', 'red hat', 'freebsd', 'openbsd'],
    MAC: ['os x', 'mac os'],
    WINDOWS: ['windows'],
  },
  MOBILE: {
    ANDROID: ['android'],
    IOS: ['ios'],
  },
};

export const SUPPORTED_BROWSERS = {
  [BROWSER.CHROME]: {major: 56, minor: 0},
  [BROWSER.FIREFOX]: {major: 52, minor: 0},
  [BROWSER.EDGE]: {major: 14, minor: 0},
  [BROWSER.ELECTRON]: {major: 1, minor: 6},
  [BROWSER.OPERA]: {major: 43, minor: 0},
};

export default class Runtime {
  getPlatform = () => platform;
  getOS = () => this.getPlatform().os;

  getOSFamily = () => this.getOS().family.toLowerCase();
  getBrowserName = () => this.getPlatform().name.toLowerCase();
  getBrowserVersion = () => {
    const [majorVersion, minorVersion] = this.getPlatform().version.split('.');
    return {major: parseInt(majorVersion, 10), minor: parseInt(minorVersion, 10)};
  };

  isSupportedBrowser = () => {
    const isFranz = this.isElectron() && this.getPlatform().ua.includes('Franz');
    if (isFranz) {
      return false;
    }

    return Object.entries(SUPPORTED_BROWSERS).some(([browser, supportedVersion]) => {
      const isSupportedBrowser = this.getBrowserName() === browser;
      const currentVersion = this.getBrowserVersion();
      const isSupportedMajorVersion = currentVersion.major >= supportedVersion.major;
      const isSupportedMinorVersion = currentVersion.minor >= supportedVersion.minor;
      return isSupportedBrowser && isSupportedMajorVersion && isSupportedMinorVersion;
    });
  };

  isChrome = () => this.getBrowserName() === BROWSER.CHROME;
  isEdge = () => this.getBrowserName() === BROWSER.EDGE;
  isElectron = () => this.getBrowserName() === BROWSER.ELECTRON;
  isFirefox = () => this.getBrowserName() === BROWSER.FIREFOX;
  isInternetExplorer = () => this.getBrowserName() === BROWSER.IE;
  isOpera = () => this.getBrowserName() === BROWSER.OPERA;
  isSafari = () => this.getBrowserName() === BROWSER.SAFARI;

  isDesktopOs = () => this.isMacOS() || this.isWindows() || this.isLinux();
  isMacOS = () => OS.DESKTOP.MAC.includes(this.getOSFamily());
  isWindows = () => OS.DESKTOP.WINDOWS.includes(this.getOSFamily());
  isLinux = () => OS.DESKTOP.LINUX.includes(this.getOSFamily());

  isMobileOs = () => this.isAndroid() || this.isIOS();
  isAndroid = () => OS.MOBILE.ANDROID.includes(this.getOSFamily());
  isIOS = () => OS.MOBILE.IOS.includes(this.getOSFamily());
}
