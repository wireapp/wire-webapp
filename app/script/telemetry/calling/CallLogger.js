z.telemetry.calling.CallLog = [];
z.telemetry.calling.CallLogger = class CallLogger extends z.util.Logger {
  constructor(message, options) {
    super(message, options);
    this.message = message;
    this.options = options;
  }

  static get CONFIG() {
    return {
      IPV4: /(([0-1]?[0-9]{1,2}\.)|(2[0-4][0-9]\.)|(25[0-5]\.)){3}(([0-1]?[0-9]{1,2})|(2[0-4][0-9])|(25[0-5]))/,
      IPV6: /(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))/,
      MESSAGE_LOG_LENGTH: 10000,
      OBFUSCATION_TRUNCATE_TO: 2,
    };
  }

  obfuscate(string) {
    //return CryptoJS.SHA256(`${string}${this.currentWeek}`)
    //  .toString()
    return string.substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
  }

  obfuscateIp(ip) {
    if (CallLogger.CONFIG.IPV4.test(ip)) {
      // IPv4
      ip = ip.split('.');
      ip[ip.length - 1] = '0';
      return ip.join('.');
    } else if (CallLogger.CONFIG.IPV6.test(ip)) {
      // IPv6
      ip = ip.split(':').slice(0, 3);
      return [...ip, '0000', '0000', '0000', '0000'].join(':');
    }

    return 'Unknown';
  }

  /*fakeIpGenerator(seed, type) {
    if (type === 4) {
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
        .map(v => {
          return (v % 10).toString(10);
        })
        .join('')
        .match(/.{1,3}/g)
        .join('.');
    } else if (type === 6) {
      const fakeIp = CryptoJS.MD5(seed).toString();
      return fakeIp.match(/.{1,4}/g).join(':');
    }
  }

  removeBytesFromIp(ip) {
    let charactersToKeep;
    let type;

    ip = ip.replace(/[\.\:]/g, '');

    if (ip.length > 12) {
      // IPv6 - Without colons the maximum is 32 characters
      type = 6;
      charactersToKeep = 12;
    } else {
      // IPv4 - Without dots the maximum is 12 characters
      type = 4;
      charactersToKeep = 4;
      if (ip.length > 7) {
        charactersToKeep = 6;
      } else if (ip.length > 6) {
        charactersToKeep = 5;
      }
    }

    const mid = Math.round((ip.length + 1) / 2);

    return {
      slicedIp: ip.slice(mid - charactersToKeep / 2, mid + charactersToKeep / 2),
      type,
    };
  }*/

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

      // Remove KASE public key (for receiving side)
      if (typeof decodedSdpMessage.media[index].invalid !== 'undefined') {
        for (const indexInvalid in decodedSdpMessage.media[index].invalid) {
          if (decodedSdpMessage.media[index].invalid[indexInvalid].value.startsWith('x-KASEv1')) {
            decodedSdpMessage.media[index].invalid[indexInvalid].value = 'x-KASEv1:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
          }
        }
      }

      // Prevent recovery of original IPs
      // Remove bytes from the IP, concatenate it with the conversation id and the current date of the week then hash it
      // and use that hash to derive a deterministic IP from it
      if (typeof decodedSdpMessage.media[index].candidates !== 'undefined') {
        for (const indexCandidate in decodedSdpMessage.media[index].candidates) {
          decodedSdpMessage.media[index].candidates[indexCandidate].ip = this.obfuscateIp(
            decodedSdpMessage.media[index].candidates[indexCandidate].ip
          );

          if (typeof decodedSdpMessage.media[index].candidates[indexCandidate].raddr !== 'undefined') {
            decodedSdpMessage.media[index].candidates[indexCandidate].raddr = this.obfuscateIp(
              decodedSdpMessage.media[index].candidates[indexCandidate].raddr
            );
          }
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
        this.logToMemory([args[0], z.util.StringUtil.format(message, ...data.obfuscated)]);
        args[1] = z.util.StringUtil.format(message, ...data.default);
      }
    } else {
      this.logToMemory([args[0], log]);
    }
    return super._print_log(args);
  }
};
