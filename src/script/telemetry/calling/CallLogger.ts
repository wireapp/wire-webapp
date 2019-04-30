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

import CryptoJS from 'crypto-js';
import sdpTransform from 'sdp-transform';
import {isObject, isString} from 'underscore';

import {Logger, getLogger} from 'Util/Logger';
import {formatString} from 'Util/StringUtil';

export class CallLogger {
  static CONFIG = {
    MESSAGE_LOG_LENGTH: 10000,
    OBFUSCATION_TRUNCATE_TO: 4,
  };

  static OBFUSCATED = {
    FINGERPRINT: 'XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX',
    ICE_PASSWORD: 'XXXXXXXXXXXXXXXXXXXXXXXX',
    IPV4: 'XXX',
    IPV6: 'XXXX:XXXX:XXXX:XXXX',
    KASE_PUBLIC_KEY: 'x-KASEv1:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  };

  static OBFUSCATION_MODE = {
    HARD: 'CallLogger.OBFUSCATION_MODE.HARD',
    SOFT: 'CallLogger.OBFUSCATION_MODE.SOFT',
  };

  static REGEXES = {
    // From https://github.com/sindresorhus/ip-regex/blob/master/index.js
    IPV4: /(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}/gm,
    IPV6: /((?:[a-fA-F\d]{1,4}:){7}(?:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){6}(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|:[a-fA-F\d]{1,4}|:)|(?:[a-fA-F\d]{1,4}:){5}(?::(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,2}|:)|(?:[a-fA-F\d]{1,4}:){4}(?:(:[a-fA-F\d]{1,4}){0,1}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,3}|:)|(?:[a-fA-F\d]{1,4}:){3}(?:(:[a-fA-F\d]{1,4}){0,2}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,4}|:)|(?:[a-fA-F\d]{1,4}:){2}(?:(:[a-fA-F\d]{1,4}){0,3}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,5}|:)|(?:[a-fA-F\d]{1,4}:){1}(?:(:[a-fA-F\d]{1,4}){0,4}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(:[a-fA-F\d]{1,4}){1,6}|:)|(?::((?::[a-fA-F\d]{1,4}){0,5}:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d|\d)){3}|(?::[a-fA-F\d]{1,4}){1,7}|:)))(%[0-9a-zA-Z]{1,})?/gm,
    UUID: /([0-9a-f]{8})-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gm,
  };

  readonly name: string;
  readonly messageLog: string[];
  readonly obfuscationMode: string;
  readonly logger: Logger;

  constructor(name: string, id: string, messageLog: string[]) {
    name = id ? this.createName(name, id) : name;

    this.logger = getLogger(name);

    this.messageLog = messageLog;
    this.name = name;

    this.obfuscationMode = CallLogger.OBFUSCATION_MODE.SOFT;
  }

  obfuscate(): void;
  obfuscate(stringToObfuscate: string): string;
  obfuscate(stringToObfuscate?: string): string | void {
    if (stringToObfuscate) {
      if (this.isHardObfuscationMode()) {
        return CryptoJS.SHA256(stringToObfuscate)
          .toString()
          .substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
      }

      return stringToObfuscate.substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
    }
  }

  obfuscateSdp(sdpMessage?: string): string {
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

  logToMemory(obfuscatedMessage: string): void {
    while (this.messageLog.length >= CallLogger.CONFIG.MESSAGE_LOG_LENGTH) {
      this.messageLog.shift();
    }

    let logMessage = `[${new Date().toISOString()}] [${this.name}] ${obfuscatedMessage}`;
    logMessage = this.safeGuard(logMessage);
    this.messageLog.push(logMessage);
  }

  safeGuard(message: string): string {
    // Ensure UUIDs are properly obfuscated
    message = message.replace(CallLogger.REGEXES.UUID, match => this.obfuscate(match));

    // Obfuscate IP addresses
    message = message.replace(CallLogger.REGEXES.IPV4, ip => {
      const ipArray = ip.split('.');
      ipArray[ipArray.length - 1] = CallLogger.OBFUSCATED.IPV4;
      ipArray[ipArray.length - 2] = CallLogger.OBFUSCATED.IPV4;
      return ipArray.join('.');
    });
    message = message.replace(CallLogger.REGEXES.IPV6, ip => {
      const ipArray = ip.split(':').slice(0, 3);
      return [...ipArray, CallLogger.OBFUSCATED.IPV6].join(':');
    });

    return message;
  }

  debug(): void {
    this._log('debug', arguments);
  }

  error(): void {
    this._log('error', arguments);
  }

  info(): void {
    this._log('info', arguments);
  }

  warn(): void {
    this._log('warn', arguments);
  }

  log(): void {
    this._log('log', arguments);
  }

  private _log(logFunctionName: 'debug' | 'error' | 'info' | 'log' | 'warn', ...args: any[]): void {
    const [messageData, ...extraArgs] = args;
    const {message, data} = messageData;

    let loggerMessage = messageData;
    let inMemoryMessage = messageData;
    if (isString(message) && isObject(data)) {
      loggerMessage = formatString(message, ...data.default);
      inMemoryMessage = formatString(message, ...data.obfuscated);
    }
    this.logToMemory(inMemoryMessage);
    this.logger[logFunctionName](loggerMessage, ...extraArgs);
  }

  private createName(name: string, id: string): string {
    return `${name} - ${this.obfuscate(id)} (${new Date().getMilliseconds()})`;
  }

  private isHardObfuscationMode(): boolean {
    return this.obfuscationMode === CallLogger.OBFUSCATION_MODE.HARD;
  }
}
