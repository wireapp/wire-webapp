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

'use strict';

window.z = window.z || {};
window.z.util = z.util || {};

(() => {
  const APP_ENV = {
    INTERNAL: 'wire-webapp-staging.wire.com',
    LOCALHOST: 'localhost',
    PROD_NEXT: 'wire-webapp-prod-next.wire.com',
    PRODUCTION: 'app.wire.com',
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

  const _check = {
    getVersion: () => (window.platform.version ? window.parseInt(window.platform.version.split('.')[0], 10) : null),
    isChrome: () => window.platform.name === BROWSER_NAME.CHROME || this.isElectron(),
    isDesktop: () => this.isElectron() && window.platform.ua.includes(BROWSER_NAME.WIRE),
    isEdge: () => window.platform.name === BROWSER_NAME.EDGE,
    isElectron: () => window.platform.name === BROWSER_NAME.ELECTRON,
    isFirefox: () => window.platform.name === BROWSER_NAME.FIREFOX,
    isOpera: () => window.platform.name === BROWSER_NAME.OPERA,
    supportsAudioOutputSelection() {
      return this.isChrome();
    },
    supportsCalling() {
      if (!this.supportsMediaDevices()) {
        return false;
      }
      if (window.WebSocket === undefined) {
        return false;
      }
      if (this.isEdge()) {
        return false;
      }
      return this.isChrome() || this.isFirefox() || this.isOpera();
    },
    supportsIndexedDb: () => !!window.indexedDB,
    supportsMediaDevices: () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    supportsNotifications: () => {
      if (window.Notification === undefined) {
        return false;
      }
      if (window.Notification.requestPermission === undefined) {
        return false;
      }
      return document.visibilityState !== undefined;
    },
    supportsScreenSharing() {
      if (window.desktopCapturer) {
        return true;
      }
      return this.isFirefox();
    },
  };

  const os = {
    isMac: () => window.platform.ua.includes(PLATFORM_NAME.MACINTOSH),
    isWindows: () => window.platform.os.family.includes(PLATFORM_NAME.WINDOWS),
  };

  // add body information
  const osCssClass = os.isMac() ? 'os-mac' : 'os-pc';
  const platformCssClass = _check.isElectron() ? 'platform-electron' : 'platform-web';
  document.body.classList.add(osCssClass, platformCssClass);

  const appVersion = () => {
    const versionElement = document.head.querySelector("[property='wire:version']");
    if (versionElement && versionElement.hasAttribute('version')) {
      return versionElement.getAttribute('version').trim();
    }
    return '';
  };

  const formattedAppVersion = () => {
    const [year, month, day, hour, minute] = appVersion().split('-');
    return `${year}.${month}.${day}.${hour}${minute}`;
  };

  z.util.Environment = {
    _electronVersion: user_agent => {
      const result = /(Wire|WireInternal)\/(\S+)/.exec(user_agent);
      // [match, app, version]
      return result ? result[2] : undefined;
    },
    backend: {
      current: undefined,
    },
    browser: {
      chrome: _check.isChrome(),
      edge: _check.isEdge(),
      firefox: _check.isFirefox(),
      name: window.platform.name,
      opera: _check.isOpera(),
      supports: {
        audioOutputSelection: _check.supportsAudioOutputSelection(),
        calling: _check.supportsCalling(),
        indexedDb: _check.supportsIndexedDb(),
        mediaDevices: _check.supportsMediaDevices(),
        notifications: _check.supportsNotifications(),
        screenSharing: _check.supportsScreenSharing(),
      },
      version: _check.getVersion(),
    },
    desktop: _check.isDesktop(),
    electron: _check.isElectron(),
    frontend: {
      isInternal: () => window.location.hostname === APP_ENV.INTERNAL,
      isLocalhost: () => [APP_ENV.LOCALHOST, APP_ENV.VIRTUAL_HOST].includes(window.location.hostname),
      isProduction: () => [APP_ENV.PRODUCTION, APP_ENV.PROD_NEXT].includes(window.location.hostname),
    },
    os: {
      linux: !os.isMac() && !os.isWindows(),
      mac: os.isMac(),
      win: os.isWindows(),
    },
    version(showWrapperVersion = true, doNotFormat = false) {
      if (z.util.Environment.frontend.isLocalhost()) {
        return 'dev';
      }

      if (doNotFormat) {
        return appVersion();
      }

      const electronVersion = this._electronVersion(window.platform.ua);
      if (electronVersion && showWrapperVersion) {
        return electronVersion;
      }

      return formattedAppVersion();
    },
  };
})();
