(function() {
  var to_array,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  if (window.z == null) {
    window.z = {};
  }

  if (z.util == null) {
    z.util = {};
  }

  to_array = function(args) {
    return Array.prototype.slice.call(args);
  };

  z.util.Logger = (function() {
    Logger.prototype.LOG_ON_DEBUG = 'z.util.Logger::LOG_ON_DEBUG';


    /*
    @param name [String] the name that will be written in the beginning of each log message
    @param options [Object] the logger options
    @option options [Integer] color the log message color (ex. 'Orange')
    @option options [Array<String>, Object<String, LogLevel>] domains an array of domains where logging should be turned on or an object defining log levels for domains
    @option options [Boolean] high_precision weather log messages should show milliseconds or not
    @option options [Function] level a function which returns the number of the log level
    @option options [Boolean] log_time weather the time should appear in log messages or not
    @option options [Integer] name_length the minimum length of the logger's name (will be filled up with spaces)
    @option options [Integer] steps_length the minimum length of the log count (ex. 3 for '003')
     */

    function Logger(name, options) {
      this.name = name;
      this.options = options != null ? options : {};
      this.set_log_on = bind(this.set_log_on, this);
      this.set_domains = bind(this.set_domains, this);
      this.color = this.options.color || void 0;
      this.domain = window.location.hostname;
      this.domains = this.options.domains || void 0;
      this.high_precision = this.options.high_precision || true;
      this.level = this.options.level || this.levels.LEVEL_1;
      this.log_time = this.options.log_time || true;
      this.logging_name = this.name || arguments.callee.caller.name;
      this.name_length = this.options.name_length || void 0;
      this.steps_length = this.options.steps_length || 3;
      this._pad_number = function(number, width) {
        width -= number.toString().length - /\./.test(number);
        if (width > 0) {
          return new Array(width + 1).join('0') + number;
        }
        return number + '';
      };
      this._pad_string = function(string, length) {
        var padding;
        if (length === void 0) {
          return string;
        } else {
          padding = new Array(Math.max(length - string.length + 1, 0)).join(' ');
          return string + padding;
        }
      };
      this._check_log_permission = (function(_this) {
        return function() {
          var domain, domain_log_level, i, len, ref, ref1;
          if (_this.domains === void 0) {
            return true;
          }
          if (_this.domains.constructor === Array) {
            ref = _this.domains;
            for (i = 0, len = ref.length; i < len; i++) {
              domain = ref[i];
              if (window.location.hostname.indexOf(domain) > -1) {
                return true;
              }
            }
          } else if (typeof _this.domains === 'object') {
            ref1 = _this.domains;
            for (domain in ref1) {
              domain_log_level = ref1[domain];
              if (window.location.hostname.indexOf(domain) > -1) {
                _this.level = domain_log_level;
                return true;
              }
            }
          }
          return false;
        };
      })(this);
      this.log_on = this._check_log_permission();
      this.logging_name = this._pad_string(this.name, this.name_length);
      this.steps = 0;
      this._reset();
      amplify.subscribe(this.LOG_ON_DEBUG, this, this.set_log_on);
    }

    Logger.prototype.levels = {
      OFF: function() {
        return 0;
      },
      LEVEL_1: function() {
        return 300;
      },
      LEVEL_2: function() {
        return 400;
      },
      LEVEL_3: function() {
        return 500;
      },
      DEBUG: function() {
        return 700;
      },
      INFO: function() {
        return 800;
      },
      WARN: function() {
        return 900;
      },
      ERROR: function() {
        return 1000;
      }
    };

    Logger.prototype.debug = function() {
      return this.log.apply(this, [this.levels.DEBUG].concat(to_array(arguments)));
    };

    Logger.prototype.error = function() {
      return this.log.apply(this, [this.levels.ERROR].concat(to_array(arguments)));
    };

    Logger.prototype.info = function() {
      return this.log.apply(this, [this.levels.INFO].concat(to_array(arguments)));
    };

    Logger.prototype.warn = function() {
      return this.log.apply(this, [this.levels.WARN].concat(to_array(arguments)));
    };

    Logger.prototype.log = function() {
      if (this.log_on === false) {
        return -3;
      }
      if (typeof console !== 'object') {
        return -2;
      }
      if (this.level() === this.levels.OFF()) {
        return -1;
      }
      return this._print_log(to_array(arguments));
    };

    Logger.prototype.force_log = function() {
      return this._print_log(to_array(arguments));
    };

    Logger.prototype.set_domains = function(domain_options) {
      this.domains = domain_options;
      return this.log_on = this._check_log_permission();
    };


    /*
    @param is_enabled [Boolean] True, if logging should be enabled
    @return [Integer] The new log level as number
     */

    Logger.prototype.set_log_on = function(is_enabled) {
      this.log_on = is_enabled;
      if (is_enabled && this.level() === this.levels.OFF()) {
        this.level = this.levels.LEVEL_1;
      }
      return this.level();
    };

    Logger.prototype._parse_info = function(arguments_array) {
      var i, len, results, value;
      results = [];
      for (i = 0, len = arguments_array.length; i < len; i++) {
        value = arguments_array[i];
        if (typeof value === 'string') {
          results.push(this.log_message = value);
        } else if (typeof value === 'function') {
          results.push(this.log_level = value());
        } else {
          results.push(this.log_objects.push(value));
        }
      }
      return results;
    };

    Logger.prototype._print_log = function(args) {
      var dashes, log, log_method, ref, ref1, time;
      if (args.length === 1) {
        if (typeof args[0] === 'string') {
          this.log_message = args[0];
        } else {
          this.log_objects.push(args[0]);
        }
        this.log_level = this.levels.LEVEL_1();
      } else {
        this._parse_info(args);
      }
      if (this.log_level === void 0) {
        this.log_level = this.levels.LEVEL_1();
      }
      if (this.log_level < this.level()) {
        this._reset();
        return 0;
      }
      if (this.log_message !== void 0) {
        this.log_layout = 1;
        if (this.log_time) {
          time = moment().format('HH:mm:ss.SSS');
          dashes = '';
          if (this.log_level === this.levels.LEVEL_2()) {
            dashes = '-- ';
          }
          if (this.log_level === this.levels.LEVEL_3()) {
            dashes = '--- ';
          }
          this.log_message = this.logging_name + " | " + time + " | " + dashes + this.log_message;
        }
        if (this.log_objects.length > 0) {
          this.log_layout = 2;
        }
        if (this.color) {
          this.log_layout = 3;
        }
      }
      log = window.console.log;
      log_method = window.winston != null ? 'info' : 'log';
      switch (this.log_level) {
        case this.levels.DEBUG():
          log_method = 'debug';
          break;
        case this.levels.INFO():
          log_method = 'info';
          break;
        case this.levels.WARN():
          log_method = 'warn';
          break;
        case this.levels.ERROR():
          log_method = 'error';
      }
      if (this.log_layout === 1) {
        window.console[log_method].call(window.console, this.log_message);
        if ((ref = window.winston) != null) {
          ref[log_method].call(window.winston, this.log_message);
        }
      } else if (this.log_layout === 2) {
        window.console[log_method].call(window.console, this.log_message, this.log_objects);
        if ((ref1 = window.winston) != null) {
          ref1[log_method].call(window.winston, this.log_message);
        }
      } else if (this.log_layout === 3) {
        if (this.log_objects.length > 0) {
          log.call(window.console, "%c" + this.log_message, "color: " + this.color, this.log_objects);
        } else {
          log.call(window.console, "%c" + this.log_message, "color: " + this.color);
        }
      }
      this._reset();
      return 0;
    };

    Logger.prototype._reset = function() {
      this.log_layout = -1;
      this.log_level = void 0;
      this.log_message = '';
      this.log_objects = [];
      return this.steps += 1;
    };

    return Logger;

  })();

}).call(this);
