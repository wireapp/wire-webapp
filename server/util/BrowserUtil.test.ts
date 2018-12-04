import * as BrowserUtil from './BrowserUtil';

describe('BrowserUtil', () => {
  it('allows MS Edge 18', () => {
    const userAgent = `Edge 18 (User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/18.17763)`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });
  it('disallows MS Edge 14', () => {
    const userAgent = `Edge 14 (User Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.140 Safari/537.36 Edge/14.17763)`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });
  it('allows Chromium 70', () => {
    const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/70.0.3538.77 Chrome/70.0.3538.77 Safari/537.36`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });
  it('disallows Chromium 55', () => {
    const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Ubuntu Chromium/55.0.3538.77 Chrome/55.0.3538.77 Safari/537.36`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });
  it('allows Chrome 70', () => {
    const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/70.0.3538.110 Safari/537.36`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });
  it('disallows Chrome 55', () => {
    const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.3538.110 Safari/537.36`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });
  it('allows Firefox 63', () => {
    const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10.14; rv:63.0) Gecko/20100101 Firefox/63.0`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(true);
  });
  it('disallows Firefox 33', () => {
    const userAgent = `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10; rv:33.0) Gecko/20100101 Firefox/33.0`;
    expect(BrowserUtil.isSupportedBrowser(userAgent)).toBe(false);
  });
});
