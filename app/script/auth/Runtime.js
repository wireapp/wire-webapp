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
  [BROWSER.CHROME]: 56,
  [BROWSER.FIREFOX]: 52,
  [BROWSER.EDGE]: 14,
  [BROWSER.OPERA]: 43,
};

export default class Runtime {
  getPlatform = () => platform;
  getOS = () => this.getPlatform().os;

  getOSFamily = () => this.getOS().family.toLowerCase();
  getBrowserName = () => this.getPlatform().name.toLowerCase();
  getBrowserVersion = () => this.getPlatform().version;
  getMajorBrowserVersion = () => parseInt(this.getPlatform().version.split('.')[0]);

  isSupportedBrowser = () => {
    return Object.entries(SUPPORTED_BROWSERS).some(([browser, version]) => {
      return this.getBrowserName() === browser && this.getMajorBrowserVersion() >= version;
    });
  };

  isChrome = () => this.getBrowserName() === BROWSER.CHROME;
  isEdge = () => this.getBrowserName() === BROWSER.EDGE;
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
