/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

(function() {
  const APP_ENV = {
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
  };

  const PLATFORM_NAME = {
    MACINTOSH: 'Mac',
    WINDOWS: 'Win',
  };

  const _check = {
    get_version: function() {
      if (platform.version) {
        return window.parseInt(platform.version.split('.')[0], 10);
      }
    },
    is_chrome: function() {
      return platform.name === BROWSER_NAME.CHROME;
    },
    is_edge: function() {
      return platform.name === BROWSER_NAME.EDGE;
    },
    is_electron: function() {
      return navigator.userAgent.includes(BROWSER_NAME.ELECTRON);
    },
    is_firefox: function() {
      return platform.name === BROWSER_NAME.FIREFOX;
    },
    is_opera: function() {
      return platform.name === BROWSER_NAME.OPERA;
    },
    supports_audio_output_selection: function() {
      return this.is_chrome();
    },
    supports_calling: function() {
      if (!this.supports_media_devices()) {
        return false;
      }
      if (window.WebSocket === undefined) {
        return false;
      }
      if (this.is_edge()) {
        return false;
      }
      return this.is_chrome() || this.is_firefox() || this.is_opera();
    },
    supports_indexed_db: function() {
      return !!window.indexedDB;
    },
    supports_media_devices: function() {
      return navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    },
    supports_notifications: function() {
      if (window.Notification === undefined) {
        return false;
      }
      if (window.Notification.requestPermission === undefined) {
        return false;
      }
      return document.visibilityState !== undefined;
    },
    supports_screen_sharing: function() {
      if (window.desktopCapturer) {
        return true;
      }
      return this.is_firefox();
    },
  };

  const os = {
    is_mac() {
      return navigator.platform.includes(PLATFORM_NAME.MACINTOSH);
    },
    is_windows() {
      return navigator.platform.includes(PLATFORM_NAME.WINDOWS);
    },
  };

  // add body information
  const os_css_class = os.is_mac() ? 'os-mac' : 'os-pc';
  const platform_css_class = _check.is_electron() ? 'platform-electron' : 'platform-web';
  $(document.body).addClass(`${os_css_class} ${platform_css_class}`);

  const app_version = function() {
    if ($("[property='wire:version']").attr('version')) {
      return $("[property='wire:version']")
        .attr('version')
        .trim();
    }
    return '';
  };

  const formatted_app_version = function() {
    const version = app_version().split('-');
    return `${version[0]}.${version[1]}.${version[2]}.${version[3]}${version[4]}`;
  };

  z.util.Environment = {
    backend: {
      account_url: function() {
        if (z.util.Environment.backend.current === z.service.BackendEnvironment.PRODUCTION) {
          return z.config.ACCOUNT_PRODUCTION_URL;
        }
        return z.config.ACCOUNT_STAGING_URL;
      },
      current: undefined,
      website_url: function() {
        if (z.util.Environment.backend.current === z.service.BackendEnvironment.PRODUCTION) {
          return z.config.WEBSITE_PRODUCTION_URL;
        }
        return z.config.WEBSITE_STAGING_URL;
      },
    },
    browser: {
      chrome: _check.is_chrome(),
      edge: _check.is_edge(),
      firefox: _check.is_firefox(),
      name: platform.name,
      opera: _check.is_opera(),
      supports: {
        audio_output_selection: _check.supports_audio_output_selection(),
        calling: _check.supports_calling(),
        indexed_db: _check.supports_indexed_db(),
        media_devices: _check.supports_media_devices(),
        notifications: _check.supports_notifications(),
        screen_sharing: _check.supports_screen_sharing(),
      },
      version: _check.get_version(),
    },
    electron: _check.is_electron(),
    frontend: {
      is_localhost() {
        return [APP_ENV.LOCALHOST, APP_ENV.VIRTUAL_HOST].includes(window.location.hostname);
      },
      is_production() {
        return [APP_ENV.PRODUCTION, APP_ENV.PROD_NEXT].includes(window.location.hostname);
      },
    },
    os: {
      linux: !os.is_mac() && !os.is_windows(),
      mac: os.is_mac(),
      win: os.is_windows(),
    },
    version: function(show_wrapper_version = true, do_not_format = false) {
      if (z.util.Environment.frontend.is_localhost()) {
        return 'dev';
      }

      if (do_not_format) {
        return app_version();
      }

      if (window.electron_version && show_wrapper_version) {
        return window.electron_version;
      }

      return formatted_app_version();
    },
  };
})();
