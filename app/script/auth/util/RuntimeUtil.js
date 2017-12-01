import '../../util/Environment';

export default class RuntimeUtil {
  static PLATFORM_TYPE = {
    BROWSER_APP: 'web',
    DESKTOP_LINUX: 'linux',
    DESKTOP_MACOS: 'mac',
    DESKTOP_WINDOWS: 'windows',
  };

  static getPlatform() {
    if (z.util.Environment.desktop) {
      if (z.util.Environment.os.win) {
        return RuntimeUtil.PLATFORM_TYPE.DESKTOP_WINDOWS;
      }
      if (z.util.Environment.os.mac) {
        return RuntimeUtil.PLATFORM_TYPE.DESKTOP_MACOS;
      }
      return RuntimeUtil.PLATFORM_TYPE.DESKTOP_LINUX;
    }
    return RuntimeUtil.PLATFORM_TYPE.BROWSER_APP;
  }
}
