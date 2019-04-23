import {isObject, isString} from 'underscore';
import CryptoJS from 'crypto-js';
import sdpTransform from 'sdp-transform';
import Logger from 'utils/Logger';

export class CallLogger {
  static get CONFIG() {
    return {
      MESSAGE_LOG_LENGTH: 10000,
      OBFUSCATION_TRUNCATE_TO: 4,
    };
  }

  static get OBFUSCATED() {
    return {
      FINGERPRINT: 'XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX',
      ICE_PASSWORD: 'XXXXXXXXXXXXXXXXXXXXXXXX',
      IPV4: 'XXX',
      IPV6: 'XXXX:XXXX:XXXX:XXXX',
      KASE_PUBLIC_KEY: 'x-KASEv1:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    };
  }

  static get OBFUSCATION_MODE() {
    return {
      HARD: 'CallLogger.OBFUSCATION_MODE.HARD',
      SOFT: 'CallLogger.OBFUSCATION_MODE.SOFT',
    };
  }

  static get REGEXES() {
    return {
      // From https://github.com/sindresorhus/ip-regex/blob/master/index.js
      IPV4: /(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}/gm,
      IPV6: /((?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(:[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(:[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(:[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(:[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,6}|:)|(?::((?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(%[0-9a-zA-Z]{1,})?/gm,
      UUID: /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gm,
    };
  }

  constructor(name, id, messageLog) {
    name = id ? this._createName(name, id) : name;

    this.logger = Logger(name);

    this.messageLog = messageLog;
    this.name = name;

    this.obfuscationMode = CallLogger.OBFUSCATION_MODE.SOFT;
  }

  obfuscate(string) {
    if (string) {
      if (this._isHardObfuscationMode()) {
        return CryptoJS.SHA256(string)
          .toString()
          .substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
      }

      return string.substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
    }
  }

  obfuscateSdp(sdpMessage) {
    if (!sdpMessage) {
      return '[Unknown]';
    }

    const decodedSdpMessage = sdpTransform.parse(sdpMessage);

    decodedSdpMessage.media.forEach(({fingerprint, icePwd, invalid}, index) => {
      // Remove fingerprints
      const hasFingerprintHash = fingerprint && fingerprint.hash;
      if (hasFingerprintHash) {
        decodedSdpMessage.media[index].fingerprint.hash = CallLogger.OBFUSCATED.FINGERPRINT;
      }

      // Remove ice password
      const hasIcePassword = !!icePwd;
      if (hasIcePassword) {
        decodedSdpMessage.media[index].icePwd = CallLogger.OBFUSCATED.ICE_PASSWORD;
      }

      // Remove KASE public key (for receiving side)
      const hasInvalid = !!invalid;
      if (hasInvalid) {
        invalid.forEach(({value}, invalidIndex) => {
          if (value.startsWith('x-KASEv1')) {
            decodedSdpMessage.media[index].invalid[invalidIndex].value = CallLogger.OBFUSCATED.KASE_PUBLIC_KEY;
          }
        });
      }
    });

    return sdpTransform.write(decodedSdpMessage);
  }

  logToMemory(obfuscatedMessage) {
    while (this.messageLog.length >= CallLogger.CONFIG.MESSAGE_LOG_LENGTH) {
      this.messageLog.shift();
    }

    let logMessage = `[${new Date().toISOString()}] [${this.name}] ${obfuscatedMessage}`;
    logMessage = this.safeGuard(logMessage);
    this.messageLog.push(logMessage);
  }

  _createName(name, id) {
    return `${name} - ${this.obfuscate(id)} (${new Date().getMilliseconds()})`;
  }

  _isHardObfuscationMode() {
    return this.obfuscationMode === CallLogger.OBFUSCATION_MODE.HARD;
  }

  debug() {
    this._log('debug', arguments);
  }

  error() {
    this._log('error', arguments);
  }

  info() {
    this._log('info', arguments);
  }

  warn() {
    this._log('warn', arguments);
  }

  log() {
    this._log('log', arguments);
  }

  _log(logFunctionName, args) {
    const [messageData, ...extraArgs] = args;
    const {message, data} = messageData;

    let loggerMessage = messageData;
    let inMemoryMessage = messageData;
    if (isString(message) && isObject(data)) {
      loggerMessage = z.util.StringUtil.format(message, ...data.default);
      inMemoryMessage = z.util.StringUtil.format(message, ...data.obfuscated);
    }
    this.logToMemory(inMemoryMessage);
    this.logger[logFunctionName](loggerMessage, ...extraArgs);
  }

  safeGuard(message) {
    // Ensure UUID are properly obfuscated
    message = message.replace(CallLogger.REGEXES.UUID, match => this.obfuscate(match));

    // Obfuscate IP addresses
    message = message.replace(CallLogger.REGEXES.IPV4, ip => {
      ip = ip.split('.');
      ip[ip.length - 1] = CallLogger.OBFUSCATED.IPV4;
      ip[ip.length - 2] = CallLogger.OBFUSCATED.IPV4;
      return ip.join('.');
    });
    message = message.replace(CallLogger.REGEXES.IPV6, ip => {
      ip = ip.split(':').slice(0, 3);
      return [...ip, CallLogger.OBFUSCATED.IPV6].join(':');
    });

    return message;
  }
}
