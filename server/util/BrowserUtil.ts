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

import useragent from 'express-useragent';

interface ParsedUserAgent {
  agent: string;
  bot: boolean;
  browser: {
    name: string;
    version: string;
  };
  is: {
    android: boolean;
    android_tablet: boolean;
    bingbot: boolean;
    blackberry: boolean;
    blackberry_tablet: boolean;
    chrome: boolean;
    crawler: boolean;
    desktop: boolean;
    electron: boolean;
    firefox: boolean;
    franz: boolean;
    googlebot: boolean;
    ie: boolean;
    ios: boolean;
    ipad: boolean;
    iphone: boolean;
    linux: boolean;
    mobile: boolean;
    opera: boolean;
    osx: boolean;
    phone: boolean;
    safari: boolean;
    tablet: boolean;
    windows: boolean;
    windows_phone: boolean;
    wire: boolean;
    yahoobot: boolean;
  };
  os: {
    name: string;
  };
  platform: {
    name: string;
    version: string | null;
  };
}

function parseUserAgent(userAgent?: string): ParsedUserAgent | null {
  if (!userAgent) {
    return null;
  }

  const agent = useragent.parse(userAgent);

  userAgent = userAgent.toLowerCase();

  const getVersion = (app: string): string | undefined => (userAgent.match(new RegExp(`${app}/(.*)`, 'i')) || [])[0];

  const electronVersion = getVersion('Electron');
  const wireVersion = getVersion('Wire');
  const franzVersion = getVersion('Franz');

  const isBingBot = userAgent.includes('bingbot');
  const isBingbot = userAgent.includes('bingbot');
  const isBlackberryTablet = agent.isBlackberry && userAgent.includes('tablet');
  const isElectron = !!electronVersion;
  const isFranz = !!franzVersion;
  const isGoogleBot = userAgent.includes('googlebot');
  const isIOS = /ipad|iphone|ipod/i.test(agent.platform);
  const isOSX = agent.platform.toLowerCase().includes('mac');
  const isWire = !!wireVersion;
  const isYahooBot = userAgent.includes('yahoo');

  const isCrawler = isBingBot || isGoogleBot || isYahooBot;
  const isPhone = !agent.isTablet && (isIOS || agent.isAndroid || agent.isWindowsPhone || agent.isBlackberry);

  return {
    agent: userAgent,
    bot: agent.isBot,
    browser: {
      name: agent.browser,
      version: agent.version,
    },
    is: {
      android: agent.isAndroid,
      android_tablet: agent.isAndroidTablet,
      bingbot: isBingbot,
      blackberry: agent.isBlackberry,
      blackberry_tablet: isBlackberryTablet,
      chrome: agent.isChrome,
      crawler: isCrawler,
      desktop: agent.isDesktop,
      electron: isElectron,
      firefox: agent.isFirefox,
      franz: isFranz,
      googlebot: isGoogleBot,
      ie: agent.isIE,
      ios: isIOS,
      ipad: agent.isiPad,
      iphone: agent.isiPhone,
      linux: agent.isLinux,
      mobile: agent.isMobile,
      opera: agent.isOpera,
      osx: isOSX,
      phone: isPhone,
      safari: agent.isSafari,
      tablet: agent.isTablet,
      windows: agent.isWindows,
      windows_phone: agent.isWindowsPhone,
      wire: isWire,
      yahoobot: isYahooBot,
    },
    os: {
      name: agent.platform,
    },
    platform: {
      name: agent.platform,
      version: agent.version,
    },
  };
}

export {parseUserAgent};
