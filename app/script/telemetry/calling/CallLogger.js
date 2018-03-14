z.telemetry.calling.CallLog = [];
z.telemetry.calling.CallLogger = class CallLogger extends z.util.Logger {
  constructor(message, options) {
    super(message, options);
    this.message = message;
  }

  static get CONFIG() {
    return {
      MESSAGE_LOG_LENGTH: 10000,
    };
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
