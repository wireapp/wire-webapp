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
  [BROWSER.EDGE]: {major: 15, minor: 0},
  [BROWSER.ELECTRON]: {major: 1, minor: 6},
  [BROWSER.OPERA]: {major: 43, minor: 0},
};

getPlatform = () => platform;
getOS = () => getPlatform().os;
getUserAgent = () => getPlatform().ua.toLowerCase();

getOSFamily = () => getOS().family.toLowerCase();
getBrowserName = () => getPlatform().name.toLowerCase();
getBrowserVersion = () => {
  const [majorVersion, minorVersion] = getPlatform().version.split('.');
  return {major: parseInt(majorVersion, 10), minor: parseInt(minorVersion, 10)};
};

isSupportedBrowser = () => {
  if (isFranz()) {
    return false;
  }

  return Object.entries(SUPPORTED_BROWSERS).some(([browser, supportedVersion]) => {
    const isSupportedBrowser = getBrowserName() === browser;
    const currentVersion = getBrowserVersion();
    const isSupportedMajorVersion = currentVersion.major >= supportedVersion.major;
    const isHigherMajorVersion = currentVersion.major > supportedVersion.major;
    const isSupportedMinorVersion = isHigherMajorVersion || currentVersion.minor >= supportedVersion.minor;
    return isSupportedBrowser && isSupportedMajorVersion && isSupportedMinorVersion;
  });
};

isChrome = () => getBrowserName() === BROWSER.CHROME;
isEdge = () => getBrowserName() === BROWSER.EDGE;
isFirefox = () => getBrowserName() === BROWSER.FIREFOX;
isInternetExplorer = () => getBrowserName() === BROWSER.IE;
isOpera = () => getBrowserName() === BROWSER.OPERA;
isSafari = () => getBrowserName() === BROWSER.SAFARI;

isDesktopOs = () => isMacOS() || isWindows() || isLinux();
isElectron = () => getBrowserName() === BROWSER.ELECTRON;
isDesktopApp = () => isElectron() && getUserAgent().includes(ELECTRON_APP.WIRE);
isFranz = () => isElectron() && getUserAgent().includes(ELECTRON_APP.FRANZ);

isMacOS = () => OS.DESKTOP.MAC.includes(getOSFamily());
isWindows = () => OS.DESKTOP.WINDOWS.includes(getOSFamily());
isLinux = () => OS.DESKTOP.LINUX.includes(getOSFamily());

isMobileOs = () => isAndroid() || isIOS();
isAndroid = () => OS.MOBILE.ANDROID.includes(getOSFamily());
isIOS = () => OS.MOBILE.IOS.includes(getOSFamily());

export {
  isFirefox,
  isDesktopOs,
  isElectron,
  isDesktopApp,
  isFranz,
  isMacOS,
  isWindows,
  isLinux,
  isMobileOs,
  isAndroid,
  isIOS,
  isSupportedBrowser,
};
