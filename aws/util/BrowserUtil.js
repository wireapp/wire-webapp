"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const useragent = require("express-useragent");
function parseUserAgent(userAgent) {
    if (!userAgent) {
        return null;
    }
    const agent = useragent.parse(userAgent);
    userAgent = userAgent.toLowerCase();
    const getVersion = (app) => (userAgent.match(new RegExp(`${app}/(.*)`, 'i')) || [])[0];
    const electronVersion = getVersion('Electron');
    const wireVersion = getVersion('Wire');
    const franzVersion = getVersion('Franz');
    const isBingBot = userAgent.includes('bingbot');
    const isBingbot = userAgent.includes('bingbot');
    const isBlackberryTablet = agent.isBlackberry && userAgent.includes('tablet');
    const isElectron = !!electronVersion;
    const isFranz = !!franzVersion;
    const isGoogleBot = userAgent.includes('googlebot');
    const isIOS = agent.platform.toLowerCase().includes('ios');
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
exports.parseUserAgent = parseUserAgent;
//# sourceMappingURL=BrowserUtil.js.map