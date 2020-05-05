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

import * as platform from 'platform';

const BROWSER = {
  CHROME: 'chrome',
  EDGE: 'microsoft edge',
  ELECTRON: 'electron',
  FIREFOX: 'firefox',
  IE: 'ie',
  OPERA: 'opera',
  SAFARI: 'safari',
};

const ELECTRON_APP = {
  FRANZ: 'franz',
  WIRE: 'wire',
};

export const OS = {
  DESKTOP: {
    LINUX: ['linux', 'ubuntu', 'fedora', 'gentoo', 'debian', 'suse', 'centos', 'red hat', 'freebsd', 'openbsd'],
    MAC: ['os x', 'mac os'],
    WINDOWS: ['windows', 'windows server 2008 r2 / 7', 'windows server 2008 / vista', 'windows xp'],
  },
  MOBILE: {
    ANDROID: ['android'],
    IOS: ['ios'],
  },
};

export const SUPPORTED_BROWSERS = {
  [BROWSER.CHROME]: {major: 56, minor: 0},
  [BROWSER.FIREFOX]: {major: 60, minor: 0},
  [BROWSER.EDGE]: {major: 15, minor: 0},
  [BROWSER.ELECTRON]: {major: 1, minor: 6},
  [BROWSER.OPERA]: {major: 43, minor: 0},
};

const getPlatform = () => platform;
const getOs = () => getPlatform().os || {};
const getUserAgent = () => (getPlatform().ua || '').toLowerCase();

const getOsFamily = () => (getOs().family || '').toLowerCase();
const getBrowserName = () => (getPlatform().name || '').toLowerCase();
const getBrowserVersion = () => {
  const [majorVersion, minorVersion] = (getPlatform().version || '0.0').split('.');
  return {major: window.parseInt(majorVersion, 10), minor: window.parseInt(minorVersion, 10)};
};

const isSupportedBrowser = () => {
  if (isFranz()) {
    return false;
  }

  return Object.entries(SUPPORTED_BROWSERS).some(([browser, supportedVersion]) => {
    const isBrowserSupported = getBrowserName() === browser;
    const currentVersion = getBrowserVersion();
    const isSupportedMajorVersion = currentVersion.major >= supportedVersion.major;
    const isHigherMajorVersion = currentVersion.major > supportedVersion.major;
    const isSupportedMinorVersion = isHigherMajorVersion || currentVersion.minor >= supportedVersion.minor;
    return isBrowserSupported && isSupportedMajorVersion && isSupportedMinorVersion;
  });
};

const isPwaSupportedBrowser = () => {
  return isMobileOs() || isSafari();
};

const isChrome = () => getBrowserName() === BROWSER.CHROME;
const isEdge = () => getBrowserName() === BROWSER.EDGE;
const isFirefox = () => getBrowserName() === BROWSER.FIREFOX;
const isInternetExplorer = () => getBrowserName() === BROWSER.IE;
const isOpera = () => getBrowserName() === BROWSER.OPERA;
const isSafari = () => getBrowserName() === BROWSER.SAFARI;

const isDesktopOs = () => isMacOS() || isWindows() || isLinux();
const isElectron = () => getBrowserName() === BROWSER.ELECTRON;
const isDesktopApp = () => isElectron() && getUserAgent().includes(ELECTRON_APP.WIRE);
const isFranz = () => isElectron() && getUserAgent().includes(ELECTRON_APP.FRANZ);

const isMacOS = () => OS.DESKTOP.MAC.includes(getOsFamily());
const isWindows = () => OS.DESKTOP.WINDOWS.includes(getOsFamily());
const isLinux = () => OS.DESKTOP.LINUX.includes(getOsFamily());

const isMobileOs = () => isAndroid() || isIOS();
const isAndroid = () => OS.MOBILE.ANDROID.includes(getOsFamily());
const isIOS = () => OS.MOBILE.IOS.includes(getOsFamily());

const isSupportingClipboard = () => !!navigator.clipboard;

export {
  getBrowserName,
  getOs,
  getOsFamily,
  isAndroid,
  isChrome,
  isDesktopApp,
  isDesktopOs,
  isEdge,
  isElectron,
  isFirefox,
  isFranz,
  isInternetExplorer,
  isIOS,
  isLinux,
  isMacOS,
  isMobileOs,
  isOpera,
  isPwaSupportedBrowser,
  isSafari,
  isSupportedBrowser,
  isSupportingClipboard,
  isWindows,
};
