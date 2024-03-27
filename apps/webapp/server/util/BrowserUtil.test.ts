/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import * as BrowserUtil from './BrowserUtil';

describe('BrowserUtil', () => {
  it('allows MS Edge 18', () => {
    const userAgent =
      'Edge 18 (User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763)';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });

  it('disallows MS Edge 14', () => {
    const userAgent =
      'Edge 14 (User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/14.17763)';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });

  it('allows Chromium 70', () => {
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/70.0.3538.77 Chrome/70.0.3538.77 Safari/537.36';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });

  it('disallows Chromium 55', () => {
    const userAgent =
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/55.0.3538.77 Chrome/55.0.3538.77 Safari/537.36';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });

  it('allows Chrome 70', () => {
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });

  it('disallows Chrome 55', () => {
    const userAgent =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.3538.110 Safari/537.36';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });

  it('allows Firefox 63', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:63.0) Gecko/20100101 Firefox/63.0';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });

  it('disallows Firefox 33', () => {
    const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0';

    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });

  it('detects iPhone', () => {
    const userAgent =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 10_0_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14A403 Safari/602.1';

    expect(BrowserUtil.parseUserAgent(userAgent).is.ios).toBe(true);
    expect(BrowserUtil.parseUserAgent(userAgent).is.mobile).toBe(true);
  });

  it('detects iPad', () => {
    const userAgent =
      'Mozilla/5.0 (iPad; CPU OS 11_0 like Mac OS X) AppleWebKit/604.1.34 (KHTML, like Gecko) Version/11.0 Mobile/15A5341f Safari/604.1';

    expect(BrowserUtil.parseUserAgent(userAgent).is.ios).toBe(true);
    expect(BrowserUtil.parseUserAgent(userAgent).is.mobile).toBe(true);
  });

  it('detects Android', () => {
    const userAgent =
      'Mozilla/5.0 (Linux; Android 8.0; Pixel 2 Build/OPD3.170816.012) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Mobile Safari/537.36';

    expect(BrowserUtil.parseUserAgent(userAgent).is.android).toBe(true);
    expect(BrowserUtil.parseUserAgent(userAgent).is.mobile).toBe(true);
  });

  it('detects Android tablet', () => {
    const userAgent =
      'Mozilla/5.0 (Linux; Android 7.1; vivo 1716 Build/N2G47H) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.98 Mobile Safari/537.36';

    expect(BrowserUtil.parseUserAgent(userAgent).is.android).toBe(true);
    expect(BrowserUtil.parseUserAgent(userAgent).is.mobile).toBe(true);
  });
});
