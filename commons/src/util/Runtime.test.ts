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

import {OS, Runtime} from './Runtime';

describe('isAndroid', () => {
  it('knows if running on Android', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'Android'} as OS);
    expect(Runtime.isAndroid()).toBe(true);
    expect(Runtime.isIOS()).toBe(false);
    expect(Runtime.isMobileOS()).toBe(true);
  });
});

describe('getBrowserName', () => {
  it('works if platform fails to load properly', () => {
    jest.spyOn(Runtime, 'getPlatform').mockReturnValue({} as typeof platform);
    expect(Runtime.getBrowserName()).toBe('unknown');
  });
});

describe('isChrome', () => {
  it('knows if running in Chrome', () => {
    const userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36';
    jest.spyOn(Runtime, 'getPlatform').mockReturnValue(platform.parse(userAgent));
    expect(Runtime.isChrome()).toBe(true);
    expect(Runtime.isEdge()).toBe(false);
    expect(Runtime.isFirefox()).toBe(false);
    expect(Runtime.isInternetExplorer()).toBe(false);
    expect(Runtime.isOpera()).toBe(false);
    expect(Runtime.isSafari()).toBe(false);
  });
});

describe('isElectron', () => {
  it('knows if running in Electron', () => {
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.75 Electron/0.37.5 Safari/537.36';
    jest.spyOn(Runtime, 'getPlatform').mockReturnValue(platform.parse(userAgent));
    expect(Runtime.isElectron()).toBe(true);
  });
});

describe('isIOS', () => {
  it('knows if running on iOS', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'iOS'} as OS);
    expect(Runtime.isAndroid()).toBe(false);
    expect(Runtime.isIOS()).toBe(true);
    expect(Runtime.isMobileOS()).toBe(true);
  });
});

describe('isLinux', () => {
  it('detects pure Linux', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'Linux'} as OS);
    expect(Runtime.isLinux()).toBe(true);
    expect(Runtime.isMacOS()).toBe(false);
    expect(Runtime.isWindows()).toBe(false);
  });

  it('detects Debian', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'Debian'} as OS);
    expect(Runtime.isLinux()).toBe(true);
  });

  it('detects Fedora', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'Fedora'} as OS);
    expect(Runtime.isLinux()).toBe(true);
  });

  it('detects Ubuntu', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'Ubuntu'} as OS);
    expect(Runtime.isLinux()).toBe(true);
  });
});

describe('isMacOS', () => {
  it('detects OS X', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'OS X'} as OS);
    expect(Runtime.isLinux()).toBe(false);
    expect(Runtime.isMacOS()).toBe(true);
    expect(Runtime.isWindows()).toBe(false);
  });

  it('detects Mac OS', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'Mac OS'} as OS);
    expect(Runtime.isMacOS()).toBe(true);
  });
});

describe('isWindows', () => {
  it('detects Windows', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'Windows'} as OS);
    expect(Runtime.isLinux()).toBe(false);
    expect(Runtime.isMacOS()).toBe(false);
    expect(Runtime.isWindows()).toBe(true);
  });

  it('detects Windows 7', () => {
    jest.spyOn(Runtime, 'getOS').mockReturnValue({family: 'windows server 2008 r2 / 7'} as OS);
    expect(Runtime.isWindows()).toBe(true);
  });
});
