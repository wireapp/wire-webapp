(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './Kermit-kermit-core.js', './kotlin-kotlin-stdlib.js'], factory);
  else if (typeof exports === 'object')
    factory(module.exports, require('./Kermit-kermit-core.js'), require('./kotlin-kotlin-stdlib.js'));
  else {
    if (typeof this['Kermit-kermit-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'Kermit-kermit'. Its dependency 'Kermit-kermit-core' was not found. Please, check whether 'Kermit-kermit-core' is loaded prior to 'Kermit-kermit'.",
      );
    }
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'Kermit-kermit'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'Kermit-kermit'.",
      );
    }
    root['Kermit-kermit'] = factory(
      typeof this['Kermit-kermit'] === 'undefined' ? {} : this['Kermit-kermit'],
      this['Kermit-kermit-core'],
      this['kotlin-kotlin-stdlib'],
    );
  }
})(this, function (_, kotlin_co_touchlab_kermit_core, kotlin_kotlin) {
  'use strict';
  //region block: imports
  var platformLogWriter = kotlin_co_touchlab_kermit_core.$_$.d;
  var listOf = kotlin_kotlin.$_$.f8;
  var mutableLoggerConfigInit = kotlin_co_touchlab_kermit_core.$_$.c;
  var protoOf = kotlin_kotlin.$_$.dc;
  var toList = kotlin_kotlin.$_$.f9;
  var plus = kotlin_kotlin.$_$.q8;
  var Severity_Verbose_getInstance = kotlin_co_touchlab_kermit_core.$_$.i;
  var VOID = kotlin_kotlin.$_$.f;
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var Severity_Debug_getInstance = kotlin_co_touchlab_kermit_core.$_$.f;
  var Severity_Info_getInstance = kotlin_co_touchlab_kermit_core.$_$.h;
  var Severity_Warn_getInstance = kotlin_co_touchlab_kermit_core.$_$.j;
  var Severity_Error_getInstance = kotlin_co_touchlab_kermit_core.$_$.g;
  var Severity_Assert_getInstance = kotlin_co_touchlab_kermit_core.$_$.e;
  var objectMeta = kotlin_kotlin.$_$.cc;
  var setMetadataFor = kotlin_kotlin.$_$.ec;
  var BaseLogger = kotlin_co_touchlab_kermit_core.$_$.a;
  var classMeta = kotlin_kotlin.$_$.ta;
  //endregion
  //region block: pre-declaration
  setMetadataFor(Logger, 'Logger', classMeta, BaseLogger);
  setMetadataFor(Companion, 'Companion', objectMeta, Logger);
  //endregion
  function Companion() {
    Companion_instance = this;
    Logger.call(this, mutableLoggerConfigInit(listOf(platformLogWriter())), '');
  }
  protoOf(Companion).get_tag_18ivnz_k$ = function () {
    return get_defaultTag();
  };
  protoOf(Companion).setMinSeverity_ritxe3_k$ = function (severity) {
    this.get_mutableConfig_h7u1r_k$().set_minSeverity_ogutg0_k$(severity);
  };
  protoOf(Companion).setLogWriters_vlrute_k$ = function (logWriters) {
    this.get_mutableConfig_h7u1r_k$().set_logWriterList_wxbs3s_k$(logWriters);
  };
  protoOf(Companion).setLogWriters_n2385g_k$ = function (logWriter) {
    this.get_mutableConfig_h7u1r_k$().set_logWriterList_wxbs3s_k$(toList(logWriter));
  };
  protoOf(Companion).addLogWriter_2s0u5w_k$ = function (logWriter) {
    this.get_mutableConfig_h7u1r_k$().set_logWriterList_wxbs3s_k$(
      plus(toList(logWriter), this.get_mutableConfig_h7u1r_k$().get_logWriterList_bvp2p8_k$()),
    );
  };
  protoOf(Companion).setTag_al39w2_k$ = function (tag) {
    set_defaultTag(tag);
  };
  protoOf(Companion).v_s785q_k$ = function (tag, throwable, message) {
    if (
      this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(Severity_Verbose_getInstance()) <= 0
    ) {
      // Inline function 'co.touchlab.kermit.BaseLogger.log' call
      var severity = Severity_Verbose_getInstance();
      var message_0 = message();
      if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
        this.processLog_byo4oh_k$(severity, tag, throwable, message_0);
      }
    }
  };
  protoOf(Companion).v$default_d62kdk_k$ = function (tag, throwable, message, $super) {
    throwable = throwable === VOID ? null : throwable;
    var tmp;
    if ($super === VOID) {
      this.v_s785q_k$(tag, throwable, message);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.v_s785q_k$.call(this, tag, throwable, message);
    }
    return tmp;
  };
  protoOf(Companion).d_s7kddo_k$ = function (tag, throwable, message) {
    if (
      this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(Severity_Debug_getInstance()) <= 0
    ) {
      // Inline function 'co.touchlab.kermit.BaseLogger.log' call
      var severity = Severity_Debug_getInstance();
      var message_0 = message();
      if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
        this.processLog_byo4oh_k$(severity, tag, throwable, message_0);
      }
    }
  };
  protoOf(Companion).d$default_mucxl2_k$ = function (tag, throwable, message, $super) {
    throwable = throwable === VOID ? null : throwable;
    var tmp;
    if ($super === VOID) {
      this.d_s7kddo_k$(tag, throwable, message);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.d_s7kddo_k$.call(this, tag, throwable, message);
    }
    return tmp;
  };
  protoOf(Companion).i_shf65d_k$ = function (tag, throwable, message) {
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(Severity_Info_getInstance()) <= 0) {
      // Inline function 'co.touchlab.kermit.BaseLogger.log' call
      var severity = Severity_Info_getInstance();
      var message_0 = message();
      if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
        this.processLog_byo4oh_k$(severity, tag, throwable, message_0);
      }
    }
  };
  protoOf(Companion).i$default_wkjr57_k$ = function (tag, throwable, message, $super) {
    throwable = throwable === VOID ? null : throwable;
    var tmp;
    if ($super === VOID) {
      this.i_shf65d_k$(tag, throwable, message);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.i_shf65d_k$.call(this, tag, throwable, message);
    }
    return tmp;
  };
  protoOf(Companion).w_f1leb3_k$ = function (tag, throwable, message) {
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(Severity_Warn_getInstance()) <= 0) {
      // Inline function 'co.touchlab.kermit.BaseLogger.log' call
      var severity = Severity_Warn_getInstance();
      var message_0 = message();
      if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
        this.processLog_byo4oh_k$(severity, tag, throwable, message_0);
      }
    }
  };
  protoOf(Companion).w$default_b8179j_k$ = function (tag, throwable, message, $super) {
    throwable = throwable === VOID ? null : throwable;
    var tmp;
    if ($super === VOID) {
      this.w_f1leb3_k$(tag, throwable, message);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.w_f1leb3_k$.call(this, tag, throwable, message);
    }
    return tmp;
  };
  protoOf(Companion).e_sk5ig3_k$ = function (tag, throwable, message) {
    if (
      this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(Severity_Error_getInstance()) <= 0
    ) {
      // Inline function 'co.touchlab.kermit.BaseLogger.log' call
      var severity = Severity_Error_getInstance();
      var message_0 = message();
      if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
        this.processLog_byo4oh_k$(severity, tag, throwable, message_0);
      }
    }
  };
  protoOf(Companion).e$default_oseap3_k$ = function (tag, throwable, message, $super) {
    throwable = throwable === VOID ? null : throwable;
    var tmp;
    if ($super === VOID) {
      this.e_sk5ig3_k$(tag, throwable, message);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.e_sk5ig3_k$.call(this, tag, throwable, message);
    }
    return tmp;
  };
  protoOf(Companion).a_ekm52f_k$ = function (tag, throwable, message) {
    if (
      this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(Severity_Assert_getInstance()) <= 0
    ) {
      // Inline function 'co.touchlab.kermit.BaseLogger.log' call
      var severity = Severity_Assert_getInstance();
      var message_0 = message();
      if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
        this.processLog_byo4oh_k$(severity, tag, throwable, message_0);
      }
    }
  };
  protoOf(Companion).a$default_h08u8z_k$ = function (tag, throwable, message, $super) {
    throwable = throwable === VOID ? null : throwable;
    var tmp;
    if ($super === VOID) {
      this.a_ekm52f_k$(tag, throwable, message);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.a_ekm52f_k$.call(this, tag, throwable, message);
    }
    return tmp;
  };
  var Companion_instance;
  function Companion_getInstance() {
    if (Companion_instance == null) new Companion();
    return Companion_instance;
  }
  function Logger(config, tag) {
    Companion_getInstance();
    tag = tag === VOID ? '' : tag;
    BaseLogger.call(this, config);
    this.tag_1 = tag;
  }
  protoOf(Logger).get_tag_18ivnz_k$ = function () {
    return this.tag_1;
  };
  protoOf(Logger).withTag_t7mk92_k$ = function (tag) {
    return new Logger(this.get_config_c0698r_k$(), tag);
  };
  protoOf(Logger).v_od50nq_k$ = function (throwable, tag, message) {
    // Inline function 'co.touchlab.kermit.BaseLogger.logBlock' call
    var severity = Severity_Verbose_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message());
    }
  };
  protoOf(Logger).d_j8lw3g_k$ = function (throwable, tag, message) {
    // Inline function 'co.touchlab.kermit.BaseLogger.logBlock' call
    var severity = Severity_Debug_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message());
    }
  };
  protoOf(Logger).i_iyr3br_k$ = function (throwable, tag, message) {
    // Inline function 'co.touchlab.kermit.BaseLogger.logBlock' call
    var severity = Severity_Info_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message());
    }
  };
  protoOf(Logger).w_wekv61_k$ = function (throwable, tag, message) {
    // Inline function 'co.touchlab.kermit.BaseLogger.logBlock' call
    var severity = Severity_Warn_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message());
    }
  };
  protoOf(Logger).e_4z7py3_k$ = function (throwable, tag, message) {
    // Inline function 'co.touchlab.kermit.BaseLogger.logBlock' call
    var severity = Severity_Error_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message());
    }
  };
  protoOf(Logger).a_90bnfl_k$ = function (throwable, tag, message) {
    // Inline function 'co.touchlab.kermit.BaseLogger.logBlock' call
    var severity = Severity_Assert_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, message());
    }
  };
  protoOf(Logger).v_8rcltk_k$ = function (messageString, throwable, tag) {
    // Inline function 'co.touchlab.kermit.BaseLogger.log' call
    var severity = Severity_Verbose_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, messageString);
    }
  };
  protoOf(Logger).d_9hhrd6_k$ = function (messageString, throwable, tag) {
    // Inline function 'co.touchlab.kermit.BaseLogger.log' call
    var severity = Severity_Debug_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, messageString);
    }
  };
  protoOf(Logger).i_t0jgdh_k$ = function (messageString, throwable, tag) {
    // Inline function 'co.touchlab.kermit.BaseLogger.log' call
    var severity = Severity_Info_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, messageString);
    }
  };
  protoOf(Logger).w_cnyjmf_k$ = function (messageString, throwable, tag) {
    // Inline function 'co.touchlab.kermit.BaseLogger.log' call
    var severity = Severity_Warn_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, messageString);
    }
  };
  protoOf(Logger).e_de3p61_k$ = function (messageString, throwable, tag) {
    // Inline function 'co.touchlab.kermit.BaseLogger.log' call
    var severity = Severity_Error_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, messageString);
    }
  };
  protoOf(Logger).a_28c21f_k$ = function (messageString, throwable, tag) {
    // Inline function 'co.touchlab.kermit.BaseLogger.log' call
    var severity = Severity_Assert_getInstance();
    if (this.get_config_c0698r_k$().get_minSeverity_aa48vu_k$().compareTo_30rs7w_k$(severity) <= 0) {
      this.processLog_byo4oh_k$(severity, tag, throwable, messageString);
    }
  };
  function set_defaultTag(_set____db54di) {
    defaultTag = _set____db54di;
  }
  function get_defaultTag() {
    return defaultTag;
  }
  var defaultTag;
  //region block: init
  defaultTag = '';
  //endregion
  //region block: exports
  _.$_$ = _.$_$ || {};
  _.$_$.a = Logger;
  _.$_$.b = Companion_getInstance;
  //endregion
  return _;
});

//# sourceMappingURL=Kermit-kermit.js.map
