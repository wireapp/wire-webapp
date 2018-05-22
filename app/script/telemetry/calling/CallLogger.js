z.telemetry.calling.CallLogger = class CallLogger {
  static get CONFIG() {
    return {
      MESSAGE_LOG_LENGTH: 10000,
      OBFUSCATION_TRUNCATE_TO: 4,
    };
  }

  static get LOG_LEVEL() {
    return {
      DEBUG: 700,
      ERROR: 1000,
      INFO: 800,
      LEVEL_1: 300,
      LEVEL_2: 400,
      LEVEL_3: 500,
      OFF: 0,
      WARNING: 900,
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
      IPV4: /(([0-1]?[0-9]{1,2}\.)|(2[0-4][0-9]\.)|(25[0-5]\.)){3}(([0-1]?[0-9]{1,2})|(2[0-4][0-9])|(25[0-5]))/gm,
      IPV6: /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/gm,
      UUID: /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gm,
    };
  }

  constructor(name, options, messageLog) {
    this.logger = new z.util.Logger(name, options);
    this.levels = this.logger.levels;

    this.messageLog = messageLog;
    this.name = name;
    this.options = options;

    this.obfuscationMode = CallLogger.OBFUSCATION_MODE.SOFT;
  }

  obfuscate(string) {
    if (this._isSoftObfuscationMode()) {
      return string.substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
    }

    if (this._isHardObfuscationMode()) {
      return CryptoJS.SHA256(string)
        .toString()
        .substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
    }
  }

  obfuscateIp(ip) {
    if (this._isSoftObfuscationMode()) {
      // IPv4
      const isIpVersion4 = CallLogger.REGEXES.IPV4.test(ip);
      if (isIpVersion4) {
        ip = ip.split('.');
        ip[ip.length - 1] = CallLogger.OBFUSCATED.IPV4;
        ip[ip.length - 2] = CallLogger.OBFUSCATED.IPV4;
        return ip.join('.');
      }

      // IPv6
      const isIpVersion6 = CallLogger.REGEXES.IPV6.test(ip);
      if (isIpVersion6) {
        ip = ip.split(':').slice(0, 3);
        return [...ip, CallLogger.OBFUSCATED.IPV6].join(':');
      }
    }

    if (this._isHardObfuscationMode()) {
      const isIpVersion4 = CallLogger.REGEXES.IPV4.test(ip);
      if (isIpVersion4) {
        // Extend the 4 bytes seed to 16 bytes using XOR encryption with static keys
        const originalSeedLength = seed.length;
        const keys = [21, 15, 7];
        for (let i = 0; i < originalSeedLength; ++i) {
          for (const key of keys) {
            seed += String.fromCharCode(key ^ seed.charCodeAt(i));
          }
        }

        // Generate a fake IP from that seed
        const fakeIp = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        for (let i = 0; i < seed.length; i++) {
          fakeIp[i % fakeIp.length] += seed.charCodeAt(i);
        }

        return fakeIp
          .map(v => (v % 10).toString(10))
          .join('')
          .match(/.{1,3}/g)
          .join('.');
      }

      const isIpVersion6 = CallLogger.REGEXES.IPV6.test(ip);
      if (isIpVersion6) {
        const fakeIp = CryptoJS.MD5(seed).toString();
        return fakeIp.match(/.{1,4}/g).join(':');
      }
    }

    return '[Unknown]';
  }

  obfuscateSdp(sdpMessage) {
    if (!window.sdpTransform) {
      return '[Unknown]';
    }

    const decodedSdpMessage = window.sdpTransform.parse(sdpMessage);

    for (const index in decodedSdpMessage.media) {
      // Remove fingerprint
      const isFingerprintDefined = !!decodedSdpMessage.media[index].fingerprint;
      if (isFingerprintDefined && !!decodedSdpMessage.media[index].fingerprint.hash) {
        decodedSdpMessage.media[index].fingerprint.hash = CallLogger.OBFUSCATED.FINGERPRINT;
      }

      // Remove ice password
      const isIcePasswordDefined = !!decodedSdpMessage.media[index].icePwd;
      if (isIcePasswordDefined) {
        decodedSdpMessage.media[index].icePwd = CallLogger.OBFUSCATED.ICE_PASSWORD;
      }

      // Remove KASE public key (for receiving side)
      const isPublicKeyDefined = !!decodedSdpMessage.media[index].invalid;
      if (isPublicKeyDefined) {
        for (const indexInvalid in decodedSdpMessage.media[index].invalid) {
          if (decodedSdpMessage.media[index].invalid[indexInvalid].value.startsWith('x-KASEv1')) {
            decodedSdpMessage.media[index].invalid[indexInvalid].value = CallLogger.OBFUSCATED.KASE_PUBLIC_KEY;
          }
        }
      }
    }

    return window.sdpTransform.write(decodedSdpMessage);
  }

  getDebugType(number) {
    switch (number) {
      case CallLogger.LOG_LEVEL.LEVEL_1:
      case CallLogger.LOG_LEVEL.LEVEL_2:
      case CallLogger.LOG_LEVEL.LEVEL_3:
        return 'VERBOSE';
      case CallLogger.LOG_LEVEL.DEBUG:
        return 'DEBUG';
      case CallLogger.LOG_LEVEL.INFO:
        return 'INFO';
      case CallLogger.LOG_LEVEL.WARNING:
        return 'WARNING';
      case CallLogger.LOG_LEVEL.ERROR:
        return 'ERROR';
    }
  }

  logToMemory(logLevel, obfuscatedMessage) {
    while (this.messageLog.length >= CallLogger.CONFIG.MESSAGE_LOG_LENGTH) {
      this.messageLog.shift();
    }

    const shouldLogToMemory = logLevel !== CallLogger.LOG_LEVEL.OFF;
    if (shouldLogToMemory) {
      const logType = this.getDebugType(logLevel);
      const logMessage = this.safeGuard(
        `[${new Date().toISOString()}] [${this.name}] (${logType}) ${obfuscatedMessage}`
      );
      this.messageLog.push(logMessage);
    }
  }

  _isHardObfuscationMode() {
    return this.obfuscationMode === CallLogger.OBFUSCATION_MODE.HARD;
  }

  _isSoftObfuscationMode() {
    return this.obfuscationMode === CallLogger.OBFUSCATION_MODE.SOFT;
  }

  debug() {
    this._log([this.logger.levels.DEBUG].concat(...arguments));
  }

  error() {
    this._log([this.logger.levels.ERROR].concat(...arguments));
  }

  info() {
    this._log([this.logger.levels.INFO].concat(...arguments));
  }

  warn() {
    this._log([this.logger.levels.WARN].concat(...arguments));
  }

  log() {
    this._log([this.logger.levels.INFO].concat(...arguments));
  }

  _log(args) {
    // Use obfuscated format for call logs if possible
    const [firstArgument, secondArgument] = args;
    const isLogMessageObject = typeof secondArgument === 'object';
    if (isLogMessageObject) {
      const {message, data} = secondArgument;

      const isExpectedObjectStructure = typeof message === 'string' && typeof data === 'object';
      if (isExpectedObjectStructure) {
        const defaultMessage = z.util.StringUtil.format(message, ...data.default);
        const obfuscatedMessage = z.util.StringUtil.format(message, ...data.obfuscated);
        args[1] = defaultMessage;

        this.logToMemory(firstArgument(), obfuscatedMessage);
        return this.logger.log(...args);
      }
    }

    const hasMultipleArgs = args.length > 1;
    const logLevel = hasMultipleArgs ? firstArgument() : CallLogger.LOG_LEVEL.INFO;
    const logMessage = hasMultipleArgs ? secondArgument : firstArgument;
    this.logToMemory(logLevel, logMessage);
    this.logger.log(...args);
  }

  safeGuard(message) {
    // Ensure UUID are properly obfuscated
    message = message.replace(CallLogger.REGEXES.UUID, match => {
      return this.obfuscate(match);
    });

    // Ensure IP addresses are obfuscated
    message = message.replace(CallLogger.REGEXES.IPV4, match => {
      return this.obfuscateIp(match);
    });
    message = message.replace(CallLogger.REGEXES.IPV6, match => {
      return this.obfuscateIp(match);
    });

    return message;
  }
};
