(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['exports', './kotlin-kotlin-stdlib.js'], factory);
  else if (typeof exports === 'object') factory(module.exports, require('./kotlin-kotlin-stdlib.js'));
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'Kermit-kermit-core'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'Kermit-kermit-core'.",
      );
    }
    root['Kermit-kermit-core'] = factory(
      typeof this['Kermit-kermit-core'] === 'undefined' ? {} : this['Kermit-kermit-core'],
      this['kotlin-kotlin-stdlib'],
    );
  }
})(this, function (_, kotlin_kotlin) {
  'use strict';
  //region block: imports
  var protoOf = kotlin_kotlin.$_$.dc;
  var IllegalStateException_init_$Create$ = kotlin_kotlin.$_$.w1;
  var isInterface = kotlin_kotlin.$_$.pb;
  var classMeta = kotlin_kotlin.$_$.ta;
  var setMetadataFor = kotlin_kotlin.$_$.ec;
  var VOID = kotlin_kotlin.$_$.f;
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var interfaceMeta = kotlin_kotlin.$_$.gb;
  var StringBuilder_init_$Create$ = kotlin_kotlin.$_$.f1;
  var charSequenceLength = kotlin_kotlin.$_$.ra;
  var objectMeta = kotlin_kotlin.$_$.cc;
  var getStringHashCode = kotlin_kotlin.$_$.eb;
  var THROW_CCE = kotlin_kotlin.$_$.qg;
  var THROW_IAE = kotlin_kotlin.$_$.rg;
  var enumEntries = kotlin_kotlin.$_$.ia;
  var Enum = kotlin_kotlin.$_$.eg;
  var objectCreate = kotlin_kotlin.$_$.bc;
  var stackTraceToString = kotlin_kotlin.$_$.rh;
  //endregion
  //region block: pre-declaration
  setMetadataFor(BaseLogger, 'BaseLogger', classMeta);
  setMetadataFor(LogWriter, 'LogWriter', classMeta);
  setMetadataFor(LoggerConfig, 'LoggerConfig', interfaceMeta);
  function formatSeverity(severity) {
    return '' + severity + ':';
  }
  function formatTag(tag) {
    return '(' + _Tag___get_tag__impl__7z9hd6(tag) + ')';
  }
  function formatMessage(severity, tag, message) {
    var tmp;
    if (severity == null) {
      var tmp_0 = tag;
      tmp = (tmp_0 == null ? null : new Tag(tmp_0)) == null;
    } else {
      tmp = false;
    }
    if (tmp) return _Message___get_message__impl__3t69n4(message);
    var sb = StringBuilder_init_$Create$();
    if (!(severity == null)) {
      sb.append_22ad7x_k$(this.formatSeverity_3tiyki_k$(severity)).append_22ad7x_k$(' ');
    }
    var tmp_1;
    var tmp_2 = tag;
    if (!((tmp_2 == null ? null : new Tag(tmp_2)) == null)) {
      // Inline function 'kotlin.text.isNotEmpty' call
      var this_0 = _Tag___get_tag__impl__7z9hd6(tag);
      tmp_1 = charSequenceLength(this_0) > 0;
    } else {
      tmp_1 = false;
    }
    if (tmp_1) {
      sb.append_22ad7x_k$(this.formatTag_4dp3uq_k$(tag)).append_22ad7x_k$(' ');
    }
    sb.append_22ad7x_k$(_Message___get_message__impl__3t69n4(message));
    return sb.toString();
  }
  setMetadataFor(MessageStringFormatter, 'MessageStringFormatter', interfaceMeta);
  setMetadataFor(DefaultFormatter, 'DefaultFormatter', objectMeta, VOID, [MessageStringFormatter]);
  setMetadataFor(Tag, 'Tag', classMeta);
  setMetadataFor(Message, 'Message', classMeta);
  setMetadataFor(MutableLoggerConfig, 'MutableLoggerConfig', interfaceMeta, VOID, [LoggerConfig]);
  setMetadataFor(Severity, 'Severity', classMeta, Enum);
  setMetadataFor(ConsoleWriter, 'ConsoleWriter', classMeta, LogWriter, VOID, ConsoleWriter_init_$Create$);
  setMetadataFor(ConsoleIntf, 'ConsoleIntf', interfaceMeta);
  setMetadataFor(JsMutableLoggerConfig, 'JsMutableLoggerConfig', classMeta, VOID, [MutableLoggerConfig]);
  setMetadataFor(ConsoleActual, 'ConsoleActual', objectMeta, VOID, [ConsoleIntf]);
  //endregion
  function get_DEFAULT_MIN_SEVERITY() {
    _init_properties_BaseLogger_kt__lobnq7();
    return DEFAULT_MIN_SEVERITY;
  }
  var DEFAULT_MIN_SEVERITY;
  function BaseLogger(config) {
    this.config_1 = config;
  }
  protoOf(BaseLogger).get_config_c0698r_k$ = function () {
    return this.config_1;
  };
  protoOf(BaseLogger).get_mutableConfig_h7u1r_k$ = function () {
    // Inline function 'kotlin.let' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'co.touchlab.kermit.BaseLogger.<get-mutableConfig>.<anonymous>' call
    var it = this.get_config_c0698r_k$();
    if (!isInterface(it, MutableLoggerConfig)) {
      throw IllegalStateException_init_$Create$('Logger config is not mutable');
    }
    return it;
  };
  protoOf(BaseLogger).logBlock_z3pnk1_k$ = function (severity, tag, throwable, message) {
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message());
    }
  };
  protoOf(BaseLogger).log_f5ftk0_k$ = function (severity, tag, throwable, message) {
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message);
    }
  };
  protoOf(BaseLogger).processLog_byo4oh_k$ = function (severity, tag, throwable, message) {
    // Inline function 'kotlin.collections.forEach' call
    var tmp0_iterator = this.get_config_c0698r_k$().get_logWriterList_bvp2p8_k$().iterator_jk1svi_k$();
    while (tmp0_iterator.hasNext_bitz1p_k$()) {
      var element = tmp0_iterator.next_20eer_k$();
      // Inline function 'co.touchlab.kermit.BaseLogger.processLog.<anonymous>' call
      if (element.isLoggable_y7plcx_k$(tag, severity)) {
        element.log_j0z6zc_k$(severity, message, tag, throwable);
      }
    }
  };
  var properties_initialized_BaseLogger_kt_e6qv19;
  function _init_properties_BaseLogger_kt__lobnq7() {
    if (!properties_initialized_BaseLogger_kt_e6qv19) {
      properties_initialized_BaseLogger_kt_e6qv19 = true;
      DEFAULT_MIN_SEVERITY = Severity_Verbose_getInstance();
    }
  }
  function LogWriter() {}
  protoOf(LogWriter).isLoggable_y7plcx_k$ = function (tag, severity) {
    return true;
  };
  protoOf(LogWriter).log$default_bjnzkv_k$ = function (severity, message, tag, throwable, $super) {
    throwable = throwable === VOID ? null : throwable;
    var tmp;
    if ($super === VOID) {
      this.log_j0z6zc_k$(severity, message, tag, throwable);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.log_j0z6zc_k$.call(this, severity, message, tag, throwable);
    }
    return tmp;
  };
  function LoggerConfig() {}
  function MessageStringFormatter() {}
  function DefaultFormatter() {
    DefaultFormatter_instance = this;
  }
  var DefaultFormatter_instance;
  function DefaultFormatter_getInstance() {
    if (DefaultFormatter_instance == null) new DefaultFormatter();
    return DefaultFormatter_instance;
  }
  function _Tag___init__impl__opaqzl(tag) {
    return tag;
  }
  function _Tag___get_tag__impl__7z9hd6($this) {
    return $this;
  }
  function Tag__toString_impl_tvevk7($this) {
    return 'Tag(tag=' + $this + ')';
  }
  function Tag__hashCode_impl_848yrc($this) {
    return getStringHashCode($this);
  }
  function Tag__equals_impl_6ocp5g($this, other) {
    if (!(other instanceof Tag)) return false;
    if (!($this === (other instanceof Tag ? other.tag_1 : THROW_CCE()))) return false;
    return true;
  }
  function Tag(tag) {
    this.tag_1 = tag;
  }
  protoOf(Tag).toString = function () {
    return Tag__toString_impl_tvevk7(this.tag_1);
  };
  protoOf(Tag).hashCode = function () {
    return Tag__hashCode_impl_848yrc(this.tag_1);
  };
  protoOf(Tag).equals = function (other) {
    return Tag__equals_impl_6ocp5g(this.tag_1, other);
  };
  function _Message___init__impl__p3e8y6(message) {
    return message;
  }
  function _Message___get_message__impl__3t69n4($this) {
    return $this;
  }
  function Message__toString_impl_ss1sfu($this) {
    return 'Message(message=' + $this + ')';
  }
  function Message__hashCode_impl_70vvmz($this) {
    return getStringHashCode($this);
  }
  function Message__equals_impl_h3hvyf($this, other) {
    if (!(other instanceof Message)) return false;
    if (!($this === (other instanceof Message ? other.message_1 : THROW_CCE()))) return false;
    return true;
  }
  function Message(message) {
    this.message_1 = message;
  }
  protoOf(Message).toString = function () {
    return Message__toString_impl_ss1sfu(this.message_1);
  };
  protoOf(Message).hashCode = function () {
    return Message__hashCode_impl_70vvmz(this.message_1);
  };
  protoOf(Message).equals = function (other) {
    return Message__equals_impl_h3hvyf(this.message_1, other);
  };
  function MutableLoggerConfig() {}
  var Severity_Verbose_instance;
  var Severity_Debug_instance;
  var Severity_Info_instance;
  var Severity_Warn_instance;
  var Severity_Error_instance;
  var Severity_Assert_instance;
  function values() {
    return [
      Severity_Verbose_getInstance(),
      Severity_Debug_getInstance(),
      Severity_Info_getInstance(),
      Severity_Warn_getInstance(),
      Severity_Error_getInstance(),
      Severity_Assert_getInstance(),
    ];
  }
  function valueOf(value) {
    switch (value) {
      case 'Verbose':
        return Severity_Verbose_getInstance();
      case 'Debug':
        return Severity_Debug_getInstance();
      case 'Info':
        return Severity_Info_getInstance();
      case 'Warn':
        return Severity_Warn_getInstance();
      case 'Error':
        return Severity_Error_getInstance();
      case 'Assert':
        return Severity_Assert_getInstance();
      default:
        Severity_initEntries();
        THROW_IAE('No enum constant value.');
        break;
    }
  }
  function get_entries() {
    if ($ENTRIES == null) $ENTRIES = enumEntries(values());
    return $ENTRIES;
  }
  var Severity_entriesInitialized;
  function Severity_initEntries() {
    if (Severity_entriesInitialized) return Unit_getInstance();
    Severity_entriesInitialized = true;
    Severity_Verbose_instance = new Severity('Verbose', 0);
    Severity_Debug_instance = new Severity('Debug', 1);
    Severity_Info_instance = new Severity('Info', 2);
    Severity_Warn_instance = new Severity('Warn', 3);
    Severity_Error_instance = new Severity('Error', 4);
    Severity_Assert_instance = new Severity('Assert', 5);
  }
  var $ENTRIES;
  function Severity(name, ordinal) {
    Enum.call(this, name, ordinal);
  }
  function Severity_Verbose_getInstance() {
    Severity_initEntries();
    return Severity_Verbose_instance;
  }
  function Severity_Debug_getInstance() {
    Severity_initEntries();
    return Severity_Debug_instance;
  }
  function Severity_Info_getInstance() {
    Severity_initEntries();
    return Severity_Info_instance;
  }
  function Severity_Warn_getInstance() {
    Severity_initEntries();
    return Severity_Warn_instance;
  }
  function Severity_Error_getInstance() {
    Severity_initEntries();
    return Severity_Error_instance;
  }
  function Severity_Assert_getInstance() {
    Severity_initEntries();
    return Severity_Assert_instance;
  }
  function _get_messageStringFormatter__ogu4br($this) {
    return $this.messageStringFormatter_1;
  }
  function _get_console__prmnq2($this) {
    return $this.console_1;
  }
  function ConsoleWriter_init_$Init$(messageStringFormatter, $this) {
    messageStringFormatter = messageStringFormatter === VOID ? DefaultFormatter_getInstance() : messageStringFormatter;
    ConsoleWriter.call($this, messageStringFormatter, ConsoleActual_getInstance());
    return $this;
  }
  function ConsoleWriter_init_$Create$(messageStringFormatter) {
    return ConsoleWriter_init_$Init$(messageStringFormatter, objectCreate(protoOf(ConsoleWriter)));
  }
  function ConsoleWriter(messageStringFormatter, console) {
    LogWriter.call(this);
    this.messageStringFormatter_1 = messageStringFormatter;
    this.console_1 = console;
  }
  protoOf(ConsoleWriter).log_j0z6zc_k$ = function (severity, message, tag, throwable) {
    var output = this.messageStringFormatter_1.formatMessage_ychzlz_k$(
      null,
      _Tag___init__impl__opaqzl(tag),
      _Message___init__impl__p3e8y6(message),
    );
    if (throwable == null) null;
    else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      output = output + (' ' + stackTraceToString(throwable));
    }
    switch (severity.get_ordinal_ip24qg_k$()) {
      case 5:
      case 4:
        this.console_1.error_5zor4u_k$(output);
        break;
      case 3:
        this.console_1.warn_mz9voc_k$(output);
        break;
      case 2:
        this.console_1.info_c8jb2c_k$(output);
        break;
      case 1:
      case 0:
        this.console_1.log_bt7sva_k$(output);
        break;
    }
  };
  function ConsoleIntf() {}
  function JsMutableLoggerConfig(logWriters) {
    this.minSeverity_1 = get_DEFAULT_MIN_SEVERITY();
    this.logWriterList_1 = logWriters;
  }
  protoOf(JsMutableLoggerConfig).set_minSeverity_ogutg0_k$ = function (_set____db54di) {
    this.minSeverity_1 = _set____db54di;
  };
  protoOf(JsMutableLoggerConfig).get_minSeverity_aa48vu_k$ = function () {
    return this.minSeverity_1;
  };
  protoOf(JsMutableLoggerConfig).set_logWriterList_wxbs3s_k$ = function (_set____db54di) {
    this.logWriterList_1 = _set____db54di;
  };
  protoOf(JsMutableLoggerConfig).get_logWriterList_bvp2p8_k$ = function () {
    return this.logWriterList_1;
  };
  function mutableLoggerConfigInit(logWriters) {
    return new JsMutableLoggerConfig(logWriters);
  }
  function platformLogWriter(messageStringFormatter) {
    messageStringFormatter = messageStringFormatter === VOID ? DefaultFormatter_getInstance() : messageStringFormatter;
    return ConsoleWriter_init_$Create$();
  }
  function ConsoleActual() {
    ConsoleActual_instance = this;
  }
  protoOf(ConsoleActual).error_5zor4u_k$ = function (output) {
    console.error(output);
  };
  protoOf(ConsoleActual).warn_mz9voc_k$ = function (output) {
    console.warn(output);
  };
  protoOf(ConsoleActual).info_c8jb2c_k$ = function (output) {
    console.info(output);
  };
  protoOf(ConsoleActual).log_bt7sva_k$ = function (output) {
    console.log(output);
  };
  var ConsoleActual_instance;
  function ConsoleActual_getInstance() {
    if (ConsoleActual_instance == null) new ConsoleActual();
    return ConsoleActual_instance;
  }
  //region block: post-declaration
  protoOf(DefaultFormatter).formatSeverity_3tiyki_k$ = formatSeverity;
  protoOf(DefaultFormatter).formatTag_4dp3uq_k$ = formatTag;
  protoOf(DefaultFormatter).formatMessage_ychzlz_k$ = formatMessage;
  //endregion
  //region block: exports
  _.$_$ = _.$_$ || {};
  _.$_$.a = BaseLogger;
  _.$_$.b = MutableLoggerConfig;
  _.$_$.c = mutableLoggerConfigInit;
  _.$_$.d = platformLogWriter;
  _.$_$.e = Severity_Assert_getInstance;
  _.$_$.f = Severity_Debug_getInstance;
  _.$_$.g = Severity_Error_getInstance;
  _.$_$.h = Severity_Info_getInstance;
  _.$_$.i = Severity_Verbose_getInstance;
  _.$_$.j = Severity_Warn_getInstance;
  //endregion
  return _;
});

//# sourceMappingURL=Kermit-kermit-core.js.map
