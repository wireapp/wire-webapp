z.telemetry.calling.CallLog = [];
z.telemetry.calling.CallLogger = class CallLogger extends z.util.Logger {
  constructor(message, options) {
    super(message, options);
    this.message = message;
    this.options = options;
    this.currentWeek = `${moment()
      .startOf('week')
      .toDate()}${moment()
      .endOf('week')
      .toDate()}`;
  }

  static get CONFIG() {
    return {
      MESSAGE_LOG_LENGTH: 10000,
      OBFUSCATION_TRUNCATE_TO: 4,
    };
  }

  obfuscate(string) {
    return CryptoJS.SHA256(`${string}${this.currentWeek}`)
      .toString()
      .substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
  }

  removeBytesFromIp(ip) {
    ip = ip.replace(/[\.\:]/g, '');

    let charactersToKeep;
    if (ip.length > 12) {
      // IPv6 - Without colons the maximum is 32 characters
      charactersToKeep = 12;
    } else {
      // IPv4 - Without dots the maximum is 12 characters
      charactersToKeep = 4;
      if (ip.length > 7) {
        charactersToKeep = 6;
      } else if (ip.length > 6) {
        charactersToKeep = 5;
      }
    }

    const mid = Math.round((ip.length + 1) / 2);
    return ip.slice(mid - charactersToKeep / 2, mid + charactersToKeep / 2);
  }

  obfuscateSdp(sdpMessage, conversationId) {
    const decodedSdpMessage = sdpTransform.parse(sdpMessage);

    for (const index in decodedSdpMessage.media) {
      // Remove fingerprint
      if (
        typeof decodedSdpMessage.media[index].fingerprint !== 'undefined' &&
        typeof decodedSdpMessage.media[index].fingerprint.hash !== 'undefined'
      ) {
        decodedSdpMessage.media[index].fingerprint.hash =
          'XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX';
      }

      // Remove ice password
      if (typeof decodedSdpMessage.media[index].icePwd !== 'undefined') {
        decodedSdpMessage.media[index].icePwd = 'X'.repeat(24);
      }

      // Prevent recovery of original IPs
      // Remove bytes from the IP, concatenate it with the conversation id and the current date of the week
      if (typeof decodedSdpMessage.media[index].candidates !== 'undefined') {
        for (const indexCandidate in decodedSdpMessage.media[index].candidates) {
          decodedSdpMessage.media[index].candidates[indexCandidate].ip = this.obfuscate(
            `${conversationId}${this.removeBytesFromIp(decodedSdpMessage.media[index].candidates[indexCandidate].ip)}`
          );
        }
      }
    }

    return sdpTransform.write(decodedSdpMessage);
  }

  getDebugType(number) {
    switch (number) {
      case 0:
      case 300:
      case 400:
      case 500:
        return 'VERBOSE';
      case 700:
        return 'DEBUG';
      case 800:
        return 'INFO';
      case 900:
        return 'WARNING';
      case 100:
        return 'ERROR';
    }
  }

  logToMemory(args) {
    while (z.telemetry.calling.CallLog.length >= CallLogger.CONFIG.MESSAGE_LOG_LENGTH) {
      z.telemetry.calling.CallLog.shift();
    }

    const logMessage = `[${new Date().toISOString()}] [${this.message}] (${this.getDebugType(args[0]())}) ${args[1]}`;
    z.telemetry.calling.CallLog.push(logMessage);
  }

  _print_log(args) {
    // Use obfuscated format for call logs if possible
    const log = args[1];
    if (typeof log === 'object') {
      const {message, data} = log;
      if (typeof message === 'function' && typeof data === 'object') {
        this.logToMemory([args[0], message(...data.obfuscated)]);
        args[1] = message(...data.default);
      }
    } else {
      this.logToMemory([args[0], log]);
    }
    return super._print_log(args);
  }
};
