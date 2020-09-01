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

import {Runtime} from '@wireapp/commons';
import {BackendEnvironment} from '../service/BackendEnvironment';

const APP_ENV = {
  LOCALHOST: 'localhost',
  PRODUCTION: 'wire.com',
  VIRTUAL_HOST: 'wire.ms', // The domain "wire.ms" is our virtual host for testing contact uploads
};

const getAppVersion = (): string => {
  const versionElement = document.head.querySelector("[property='wire:version']");
  const hasVersion = versionElement && versionElement.hasAttribute('version');
  return hasVersion ? versionElement.getAttribute('version').trim() : '';
};

const getElectronVersion = (userAgent: string): string => {
  // [match, app, version]
  const [, , electronVersion] = /(Wire|WireInternal)\/(\S+)/.exec(userAgent) || [];
  return electronVersion;
};

const getFormattedAppVersion = (): string => {
  const [year, month, day, hour, minute] = getAppVersion().split('-');
  return `${year}.${month}.${day}.${hour}${minute}`;
};

const isLocalhost = (): boolean => [APP_ENV.LOCALHOST, APP_ENV.VIRTUAL_HOST].includes(window.location.hostname);
const isProduction = (): boolean => {
  const isProductionHost = window.wire.env.ENVIRONMENT === BackendEnvironment.PRODUCTION;
  return isProductionHost;
};

// add body information
const osCssClass = Runtime.isMacOS() ? 'os-mac' : 'os-pc';
const platformCssClass = Runtime.isElectron() ? 'platform-electron' : 'platform-web';
document.body.classList.add(osCssClass, platformCssClass);

export const Environment = {
  backend: {
    current: undefined as any,
  },

  browser: {
    chrome: Runtime.isChrome() || Runtime.isElectron(),
    edge: Runtime.isEdge(),
    firefox: Runtime.isFirefox(),
    name: Runtime.getPlatform(),
    opera: Runtime.isOpera(),
    supports: {
      calling: Runtime.isSupportingLegacyCalling(),
      clipboard: Runtime.isSupportingClipboard(),
      conferenceCalling: Runtime.isSupportingConferenceCalling(),
      indexedDb: Runtime.isSupportingIndexedDb(),
      mediaDevices: Runtime.isSupportingUserMedia(),
      notifications: Runtime.isSupportingNotifications(),
      permissions: Runtime.isSupportingPermissions(),
      screenSharing: Runtime.isSupportingScreensharing(),
    },
    version: Runtime.getBrowserVersion().major,
  },
  desktop: Runtime.isDesktopApp(),
  electron: Runtime.isElectron(),
  electronVersion: getElectronVersion,
  frontend: {
    isLocalhost,
    isProduction,
  },

  os: {
    linux: !Runtime.isMacOS() && !Runtime.isWindows(),
    mac: Runtime.isMacOS(),
    win: Runtime.isWindows(),
  },

  version: (showWrapperVersion = true, doNotFormat = false): string => {
    if (Environment.frontend.isLocalhost()) {
      return 'dev';
    }

    if (doNotFormat) {
      return getAppVersion();
    }

    const electronVersion = getElectronVersion(Runtime.getUserAgent());
    const showElectronVersion = electronVersion && showWrapperVersion;
    return showElectronVersion ? electronVersion : getFormattedAppVersion();
  },
};
