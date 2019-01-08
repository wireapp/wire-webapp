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

window.z = window.z || {};
window.z.util = z.util || {};

z.util.Environment = (() => {
  const APP_ENV = {
    LOCALHOST: 'localhost',
    PRODUCTION: 'wire.com',
    VIRTUAL_HOST: 'wire.ms', // The domain "wire.ms" is our virtual host for testing contact uploads
  };

  const BROWSER_NAME = {
    CHROME: 'Chrome',
    EDGE: 'Microsoft Edge',
    ELECTRON: 'Electron',
    FIREFOX: 'Firefox',
    OPERA: 'Opera',
    WIRE: 'Wire',
  };

  const PLATFORM_NAME = {
    MACINTOSH: 'Mac',
    WINDOWS: 'Win',
  };

  const _getAppVersion = () => {
    const versionElement = document.head.querySelector("[property='wire:version']");
    const hasVersion = versionElement && versionElement.hasAttribute('version');
    return hasVersion ? versionElement.getAttribute('version').trim() : '';
  };

  const _getElectronVersion = userAgent => {
    // [match, app, version]
    const [, , electronVersion] = /(Wire|WireInternal)\/(\S+)/.exec(userAgent) || [];
    return electronVersion;
  };

  const _getFormattedAppVersion = () => {
    const [year, month, day, hour, minute] = _getAppVersion().split('-');
    return `${year}.${month}.${day}.${hour}${minute}`;
  };

  const _getVersion = () => {
    const browserVersion = platform.version || '';
    const [majorVersion] = browserVersion.split('.');
    return window.parseInt(majorVersion, 10);
  };

  const _isChrome = () => platform.name === BROWSER_NAME.CHROME || _isElectron();
  const _isDesktop = () => _isElectron() && platform.ua.includes(BROWSER_NAME.WIRE);
  const _isEdge = () => platform.name === BROWSER_NAME.EDGE;
  const _isElectron = () => platform.name === BROWSER_NAME.ELECTRON;
  const _isFirefox = () => platform.name === BROWSER_NAME.FIREFOX;
  const _isOpera = () => platform.name === BROWSER_NAME.OPERA;

  const _isMac = () => platform.ua.includes(PLATFORM_NAME.MACINTOSH);
  const _isWindows = () => platform.os.family && platform.os.family.includes(PLATFORM_NAME.WINDOWS);

  const isLocalhost = () => [APP_ENV.LOCALHOST, APP_ENV.VIRTUAL_HOST].includes(window.location.hostname);
  const isProduction = () => {
    const isProductionHost = window.wire.env.ENVIRONMENT === z.service.BackendEnvironment.PRODUCTION;
    return isProductionHost;
  };

  const _supportsAudioOutputSelection = () => _isChrome();
  const _supportsCalling = () => {
    if (!_supportsMediaDevices()) {
      return false;
    }

    if (window.WebSocket === undefined) {
      return false;
    }

    return _isEdge() ? false : _isChrome() || _isFirefox() || _isOpera();
  };

  const _supportsClipboard = () => !!navigator.clipboard;
  const _supportsIndexedDb = () => {
    try {
      return !!window.indexedDB;
    } catch (error) {
      return false;
    }
  };
  const _supportsMediaDevices = () => !!navigator.mediaDevices && !!navigator.mediaDevices.getUserMedia;

  const _supportsPermissions = () => !!navigator.permissions;
  const _supportsMediaPermissions = () => _supportsPermissions() && _isChrome() && _getVersion() >= 64;

  const _supportsNotifications = () => {
    const notificationNotSupported = window.Notification === undefined;
    if (notificationNotSupported) {
      return false;
    }

    const requestPermissionNotSupported = window.Notification.requestPermission === undefined;
    return requestPermissionNotSupported ? false : document.visibilityState !== undefined;
  };
  const _supportsScreenSharing = () => (window.desktopCapturer ? true : _isFirefox());

  // add body information
  const _osCssClass = _isMac() ? 'os-mac' : 'os-pc';
  const _platformCssClass = _isElectron() ? 'platform-electron' : 'platform-web';
  document.body.classList.add(_osCssClass, _platformCssClass);

  return {
    backend: {
      current: undefined,
    },
    browser: {
      chrome: _isChrome(),
      edge: _isEdge(),
      firefox: _isFirefox(),
      name: platform.name,
      opera: _isOpera(),
      supports: {
        audioOutputSelection: _supportsAudioOutputSelection(),
        calling: _supportsCalling(),
        clipboard: _supportsClipboard(),
        indexedDb: _supportsIndexedDb(),
        mediaDevices: _supportsMediaDevices(),
        mediaPermissions: _supportsMediaPermissions(),
        notifications: _supportsNotifications(),
        permissions: _supportsPermissions(),
        screenSharing: _supportsScreenSharing(),
      },
      version: _getVersion(),
    },
    desktop: _isDesktop(),
    electron: _isElectron(),
    electronVersion: _getElectronVersion,
    frontend: {
      isLocalhost,
      isProduction,
    },
    os: {
      linux: !_isMac() && !_isWindows(),
      mac: _isMac(),
      win: _isWindows(),
    },
    version(showWrapperVersion = true, doNotFormat = false) {
      if (z.util.Environment.frontend.isLocalhost()) {
        return 'dev';
      }

      if (doNotFormat) {
        return _getAppVersion();
      }

      const electronVersion = _getElectronVersion(platform.ua);
      const showElectronVersion = electronVersion && showWrapperVersion;
      return showElectronVersion ? electronVersion : _getFormattedAppVersion();
    },
  };
})();
