import platform from 'platform';

export default class RuntimeUtil {
  static BROWSER_NAME = {
    CHROME: 'Chrome',
    EDGE: 'Microsoft Edge',
    ELECTRON: 'Electron',
    FIREFOX: 'Firefox',
    OPERA: 'Opera',
    WIRE: 'Wire',
  };

  static PLATFORM_NAME = {
    MACINTOSH: 'Mac',
    WINDOWS: 'Win',
  };

  static PLATFORM_TYPE = {
    BROWSER_APP: 'web',
    DESKTOP_LINUX: 'linux',
    DESKTOP_MACOS: 'mac',
    DESKTOP_WINDOWS: 'windows',
  };

  static isElectron() {
    return platform.name === RuntimeUtil.BROWSER_NAME.ELECTRON;
  }

  static isDesktop() {
    return RuntimeUtil.isElectron() && platform.ua.includes(RuntimeUtil.BROWSER_NAME.WIRE);
  }

  static getPlatform() {
    if (isDesktop()) {
      if (platform.os.family.includes(RuntimeUtil.PLATFORM_NAME.WINDOWS)) {
        return RuntimeUtil.PLATFORM_TYPE.DESKTOP_WINDOWS;
      }
      if (platform.ua.includes(RuntimeUtil.PLATFORM_NAME.MACINTOSH)) {
        return RuntimeUtil.PLATFORM_TYPE.DESKTOP_MACOS;
      }
      return RuntimeUtil.PLATFORM_TYPE.DESKTOP_LINUX;
    }
    return RuntimeUtil.PLATFORM_TYPE.BROWSER_APP;
  }
}
