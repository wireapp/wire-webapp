(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define([
      'exports',
      './kotlin-kotlin-stdlib.js',
      './ktor-ktor-utils.js',
      './kotlinx-coroutines-core.js',
      './ktor-ktor-io.js',
    ], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlin-kotlin-stdlib.js'),
      require('./ktor-ktor-utils.js'),
      require('./kotlinx-coroutines-core.js'),
      require('./ktor-ktor-io.js'),
    );
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-websockets'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'ktor-ktor-websockets'.",
      );
    }
    if (typeof this['ktor-ktor-utils'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-websockets'. Its dependency 'ktor-ktor-utils' was not found. Please, check whether 'ktor-ktor-utils' is loaded prior to 'ktor-ktor-websockets'.",
      );
    }
    if (typeof this['kotlinx-coroutines-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-websockets'. Its dependency 'kotlinx-coroutines-core' was not found. Please, check whether 'kotlinx-coroutines-core' is loaded prior to 'ktor-ktor-websockets'.",
      );
    }
    if (typeof this['ktor-ktor-io'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-websockets'. Its dependency 'ktor-ktor-io' was not found. Please, check whether 'ktor-ktor-io' is loaded prior to 'ktor-ktor-websockets'.",
      );
    }
    root['ktor-ktor-websockets'] = factory(
      typeof this['ktor-ktor-websockets'] === 'undefined' ? {} : this['ktor-ktor-websockets'],
      this['kotlin-kotlin-stdlib'],
      this['ktor-ktor-utils'],
      this['kotlinx-coroutines-core'],
      this['ktor-ktor-io'],
    );
  }
})(
  this,
  function (
    _,
    kotlin_kotlin,
    kotlin_io_ktor_ktor_utils,
    kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core,
    kotlin_io_ktor_ktor_io,
  ) {
    'use strict';
    //region block: imports
    var imul = Math.imul;
    var mapCapacity = kotlin_kotlin.$_$.h8;
    var coerceAtLeast = kotlin_kotlin.$_$.lc;
    var LinkedHashMap_init_$Create$ = kotlin_kotlin.$_$.u;
    var protoOf = kotlin_kotlin.$_$.dc;
    var objectMeta = kotlin_kotlin.$_$.cc;
    var setMetadataFor = kotlin_kotlin.$_$.ec;
    var THROW_IAE = kotlin_kotlin.$_$.rg;
    var Unit_getInstance = kotlin_kotlin.$_$.k5;
    var objectCreate = kotlin_kotlin.$_$.bc;
    var Enum = kotlin_kotlin.$_$.eg;
    var classMeta = kotlin_kotlin.$_$.ta;
    var toString = kotlin_kotlin.$_$.ic;
    var VOID = kotlin_kotlin.$_$.f;
    var getStringHashCode = kotlin_kotlin.$_$.eb;
    var THROW_CCE = kotlin_kotlin.$_$.qg;
    var KtorSimpleLogger = kotlin_io_ktor_ktor_utils.$_$.f;
    var CoroutineName = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.m;
    var DisposableHandle = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.o;
    var get_lastIndex = kotlin_kotlin.$_$.c8;
    var compareTo = kotlin_kotlin.$_$.ua;
    var ensureNotNull = kotlin_kotlin.$_$.hh;
    var fillArrayVal = kotlin_kotlin.$_$.za;
    var interfaceMeta = kotlin_kotlin.$_$.gb;
    var joinToString = kotlin_kotlin.$_$.x7;
    var _Char___init__impl__6a9atx = kotlin_kotlin.$_$.t2;
    var indexOf = kotlin_kotlin.$_$.vd;
    var to = kotlin_kotlin.$_$.xh;
    var until = kotlin_kotlin.$_$.sc;
    var substring = kotlin_kotlin.$_$.ze;
    var asSequence = kotlin_kotlin.$_$.l6;
    var map = kotlin_kotlin.$_$.cd;
    var readBytes = kotlin_io_ktor_ktor_io.$_$.u;
    var Charsets_getInstance = kotlin_io_ktor_ktor_io.$_$.f;
    var encodeToByteArray = kotlin_kotlin.$_$.od;
    var encodeToByteArray_0 = kotlin_io_ktor_ktor_io.$_$.j;
    var BytePacketBuilder = kotlin_io_ktor_ktor_io.$_$.p;
    var writeShort = kotlin_io_ktor_ktor_io.$_$.w;
    var writeText = kotlin_io_ktor_ktor_io.$_$.x;
    var noWhenBranchMatchedException = kotlin_kotlin.$_$.oh;
    //endregion
    //region block: pre-declaration
    setMetadataFor(Companion, 'Companion', objectMeta);
    setMetadataFor(Codes, 'Codes', classMeta, Enum);
    setMetadataFor(CloseReason, 'CloseReason', classMeta);
    setMetadataFor(NonDisposableHandle, 'NonDisposableHandle', objectMeta, VOID, [DisposableHandle]);
    setMetadataFor(Companion_0, 'Companion', objectMeta);
    setMetadataFor(FrameType, 'FrameType', classMeta, Enum);
    setMetadataFor(WebSocketExtension, 'WebSocketExtension', interfaceMeta);
    setMetadataFor(WebSocketExtensionFactory, 'WebSocketExtensionFactory', interfaceMeta);
    setMetadataFor(WebSocketExtensionHeader, 'WebSocketExtensionHeader', classMeta);
    setMetadataFor(Frame, 'Frame', classMeta);
    setMetadataFor(Binary, 'Binary', classMeta, Frame);
    setMetadataFor(Text, 'Text', classMeta, Frame);
    setMetadataFor(Close, 'Close', classMeta, Frame, VOID, Close_init_$Create$_1);
    setMetadataFor(Ping, 'Ping', classMeta, Frame);
    setMetadataFor(Pong, 'Pong', classMeta, Frame);
    setMetadataFor(Companion_1, 'Companion', objectMeta);
    //endregion
    function _get_byCodeMap__7duph5($this) {
      return $this.byCodeMap_1;
    }
    var Codes_NORMAL_instance;
    var Codes_GOING_AWAY_instance;
    var Codes_PROTOCOL_ERROR_instance;
    var Codes_CANNOT_ACCEPT_instance;
    var Codes_CLOSED_ABNORMALLY_instance;
    var Codes_NOT_CONSISTENT_instance;
    var Codes_VIOLATED_POLICY_instance;
    var Codes_TOO_BIG_instance;
    var Codes_NO_EXTENSION_instance;
    var Codes_INTERNAL_ERROR_instance;
    var Codes_SERVICE_RESTART_instance;
    var Codes_TRY_AGAIN_LATER_instance;
    function Companion() {
      Companion_instance = this;
      var tmp = this;
      // Inline function 'kotlin.collections.associateBy' call
      var this_0 = values();
      var capacity = coerceAtLeast(mapCapacity(this_0.length), 16);
      // Inline function 'kotlin.collections.associateByTo' call
      var destination = LinkedHashMap_init_$Create$(capacity);
      var inductionVariable = 0;
      var last = this_0.length;
      while (inductionVariable < last) {
        var element = this_0[inductionVariable];
        inductionVariable = (inductionVariable + 1) | 0;
        // Inline function 'io.ktor.websocket.Companion.byCodeMap.<anonymous>' call
        var tmp$ret$0 = element.code_1;
        destination.put_4fpzoq_k$(tmp$ret$0, element);
      }
      tmp.byCodeMap_1 = destination;
      this.UNEXPECTED_CONDITION_1 = Codes_INTERNAL_ERROR_getInstance();
    }
    protoOf(Companion).get_UNEXPECTED_CONDITION_rk0i52_k$ = function () {
      return this.UNEXPECTED_CONDITION_1;
    };
    protoOf(Companion).byCode_d9s8a4_k$ = function (code) {
      return this.byCodeMap_1.get_wei43m_k$(code);
    };
    var Companion_instance;
    function Companion_getInstance() {
      Codes_initEntries();
      if (Companion_instance == null) new Companion();
      return Companion_instance;
    }
    function values() {
      return [
        Codes_NORMAL_getInstance(),
        Codes_GOING_AWAY_getInstance(),
        Codes_PROTOCOL_ERROR_getInstance(),
        Codes_CANNOT_ACCEPT_getInstance(),
        Codes_CLOSED_ABNORMALLY_getInstance(),
        Codes_NOT_CONSISTENT_getInstance(),
        Codes_VIOLATED_POLICY_getInstance(),
        Codes_TOO_BIG_getInstance(),
        Codes_NO_EXTENSION_getInstance(),
        Codes_INTERNAL_ERROR_getInstance(),
        Codes_SERVICE_RESTART_getInstance(),
        Codes_TRY_AGAIN_LATER_getInstance(),
      ];
    }
    function valueOf(value) {
      switch (value) {
        case 'NORMAL':
          return Codes_NORMAL_getInstance();
        case 'GOING_AWAY':
          return Codes_GOING_AWAY_getInstance();
        case 'PROTOCOL_ERROR':
          return Codes_PROTOCOL_ERROR_getInstance();
        case 'CANNOT_ACCEPT':
          return Codes_CANNOT_ACCEPT_getInstance();
        case 'CLOSED_ABNORMALLY':
          return Codes_CLOSED_ABNORMALLY_getInstance();
        case 'NOT_CONSISTENT':
          return Codes_NOT_CONSISTENT_getInstance();
        case 'VIOLATED_POLICY':
          return Codes_VIOLATED_POLICY_getInstance();
        case 'TOO_BIG':
          return Codes_TOO_BIG_getInstance();
        case 'NO_EXTENSION':
          return Codes_NO_EXTENSION_getInstance();
        case 'INTERNAL_ERROR':
          return Codes_INTERNAL_ERROR_getInstance();
        case 'SERVICE_RESTART':
          return Codes_SERVICE_RESTART_getInstance();
        case 'TRY_AGAIN_LATER':
          return Codes_TRY_AGAIN_LATER_getInstance();
        default:
          Codes_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    var Codes_entriesInitialized;
    function Codes_initEntries() {
      if (Codes_entriesInitialized) return Unit_getInstance();
      Codes_entriesInitialized = true;
      Codes_NORMAL_instance = new Codes('NORMAL', 0, 1000);
      Codes_GOING_AWAY_instance = new Codes('GOING_AWAY', 1, 1001);
      Codes_PROTOCOL_ERROR_instance = new Codes('PROTOCOL_ERROR', 2, 1002);
      Codes_CANNOT_ACCEPT_instance = new Codes('CANNOT_ACCEPT', 3, 1003);
      Codes_CLOSED_ABNORMALLY_instance = new Codes('CLOSED_ABNORMALLY', 4, 1006);
      Codes_NOT_CONSISTENT_instance = new Codes('NOT_CONSISTENT', 5, 1007);
      Codes_VIOLATED_POLICY_instance = new Codes('VIOLATED_POLICY', 6, 1008);
      Codes_TOO_BIG_instance = new Codes('TOO_BIG', 7, 1009);
      Codes_NO_EXTENSION_instance = new Codes('NO_EXTENSION', 8, 1010);
      Codes_INTERNAL_ERROR_instance = new Codes('INTERNAL_ERROR', 9, 1011);
      Codes_SERVICE_RESTART_instance = new Codes('SERVICE_RESTART', 10, 1012);
      Codes_TRY_AGAIN_LATER_instance = new Codes('TRY_AGAIN_LATER', 11, 1013);
      Companion_getInstance();
    }
    function CloseReason_init_$Init$(code, message, $this) {
      CloseReason.call($this, code.code_1, message);
      return $this;
    }
    function CloseReason_init_$Create$(code, message) {
      return CloseReason_init_$Init$(code, message, objectCreate(protoOf(CloseReason)));
    }
    function Codes(name, ordinal, code) {
      Enum.call(this, name, ordinal);
      this.code_1 = code;
    }
    protoOf(Codes).get_code_wok7xy_k$ = function () {
      return this.code_1;
    };
    function Codes_NORMAL_getInstance() {
      Codes_initEntries();
      return Codes_NORMAL_instance;
    }
    function Codes_GOING_AWAY_getInstance() {
      Codes_initEntries();
      return Codes_GOING_AWAY_instance;
    }
    function Codes_PROTOCOL_ERROR_getInstance() {
      Codes_initEntries();
      return Codes_PROTOCOL_ERROR_instance;
    }
    function Codes_CANNOT_ACCEPT_getInstance() {
      Codes_initEntries();
      return Codes_CANNOT_ACCEPT_instance;
    }
    function Codes_CLOSED_ABNORMALLY_getInstance() {
      Codes_initEntries();
      return Codes_CLOSED_ABNORMALLY_instance;
    }
    function Codes_NOT_CONSISTENT_getInstance() {
      Codes_initEntries();
      return Codes_NOT_CONSISTENT_instance;
    }
    function Codes_VIOLATED_POLICY_getInstance() {
      Codes_initEntries();
      return Codes_VIOLATED_POLICY_instance;
    }
    function Codes_TOO_BIG_getInstance() {
      Codes_initEntries();
      return Codes_TOO_BIG_instance;
    }
    function Codes_NO_EXTENSION_getInstance() {
      Codes_initEntries();
      return Codes_NO_EXTENSION_instance;
    }
    function Codes_INTERNAL_ERROR_getInstance() {
      Codes_initEntries();
      return Codes_INTERNAL_ERROR_instance;
    }
    function Codes_SERVICE_RESTART_getInstance() {
      Codes_initEntries();
      return Codes_SERVICE_RESTART_instance;
    }
    function Codes_TRY_AGAIN_LATER_getInstance() {
      Codes_initEntries();
      return Codes_TRY_AGAIN_LATER_instance;
    }
    function CloseReason(code, message) {
      this.code_1 = code;
      this.message_1 = message;
    }
    protoOf(CloseReason).get_code_wok7xy_k$ = function () {
      return this.code_1;
    };
    protoOf(CloseReason).get_message_h23axq_k$ = function () {
      return this.message_1;
    };
    protoOf(CloseReason).get_knownReason_j6teda_k$ = function () {
      return Companion_getInstance().byCode_d9s8a4_k$(this.code_1);
    };
    protoOf(CloseReason).toString = function () {
      var tmp0_elvis_lhs = this.get_knownReason_j6teda_k$();
      return (
        'CloseReason(reason=' +
        toString(tmp0_elvis_lhs == null ? this.code_1 : tmp0_elvis_lhs) +
        ', message=' +
        this.message_1 +
        ')'
      );
    };
    protoOf(CloseReason).component1_7eebsc_k$ = function () {
      return this.code_1;
    };
    protoOf(CloseReason).component2_7eebsb_k$ = function () {
      return this.message_1;
    };
    protoOf(CloseReason).copy_xg59vt_k$ = function (code, message) {
      return new CloseReason(code, message);
    };
    protoOf(CloseReason).copy$default_v2sa2r_k$ = function (code, message, $super) {
      code = code === VOID ? this.code_1 : code;
      message = message === VOID ? this.message_1 : message;
      return $super === VOID ? this.copy_xg59vt_k$(code, message) : $super.copy_xg59vt_k$.call(this, code, message);
    };
    protoOf(CloseReason).hashCode = function () {
      var result = this.code_1;
      result = (imul(result, 31) + getStringHashCode(this.message_1)) | 0;
      return result;
    };
    protoOf(CloseReason).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof CloseReason)) return false;
      var tmp0_other_with_cast = other instanceof CloseReason ? other : THROW_CCE();
      if (!(this.code_1 === tmp0_other_with_cast.code_1)) return false;
      if (!(this.message_1 === tmp0_other_with_cast.message_1)) return false;
      return true;
    };
    function get_LOGGER() {
      _init_properties_DefaultWebSocketSession_kt__469s0y();
      return LOGGER;
    }
    var LOGGER;
    function get_IncomingProcessorCoroutineName() {
      _init_properties_DefaultWebSocketSession_kt__469s0y();
      return IncomingProcessorCoroutineName;
    }
    var IncomingProcessorCoroutineName;
    function get_OutgoingProcessorCoroutineName() {
      _init_properties_DefaultWebSocketSession_kt__469s0y();
      return OutgoingProcessorCoroutineName;
    }
    var OutgoingProcessorCoroutineName;
    function get_NORMAL_CLOSE() {
      _init_properties_DefaultWebSocketSession_kt__469s0y();
      return NORMAL_CLOSE;
    }
    var NORMAL_CLOSE;
    var properties_initialized_DefaultWebSocketSession_kt_6cjlhc;
    function _init_properties_DefaultWebSocketSession_kt__469s0y() {
      if (!properties_initialized_DefaultWebSocketSession_kt_6cjlhc) {
        properties_initialized_DefaultWebSocketSession_kt_6cjlhc = true;
        LOGGER = KtorSimpleLogger('io.ktor.websocket.WebSocket');
        IncomingProcessorCoroutineName = new CoroutineName('ws-incoming-processor');
        OutgoingProcessorCoroutineName = new CoroutineName('ws-outgoing-processor');
        NORMAL_CLOSE = CloseReason_init_$Create$(Codes_NORMAL_getInstance(), 'OK');
      }
    }
    function NonDisposableHandle() {
      NonDisposableHandle_instance = this;
    }
    protoOf(NonDisposableHandle).dispose_3nnxhr_k$ = function () {};
    protoOf(NonDisposableHandle).toString = function () {
      return 'NonDisposableHandle';
    };
    var NonDisposableHandle_instance;
    function NonDisposableHandle_getInstance() {
      if (NonDisposableHandle_instance == null) new NonDisposableHandle();
      return NonDisposableHandle_instance;
    }
    function _get_maxOpcode__n4u3i9($this) {
      return $this.maxOpcode_1;
    }
    function _get_byOpcodeArray__zfogar($this) {
      return $this.byOpcodeArray_1;
    }
    var FrameType_TEXT_instance;
    var FrameType_BINARY_instance;
    var FrameType_CLOSE_instance;
    var FrameType_PING_instance;
    var FrameType_PONG_instance;
    function Companion_0() {
      Companion_instance_0 = this;
      var tmp = this;
      var tmp$ret$1;
      $l$block_0: {
        // Inline function 'kotlin.collections.maxByOrNull' call
        var this_0 = values_0();
        // Inline function 'kotlin.collections.isEmpty' call
        if (this_0.length === 0) {
          tmp$ret$1 = null;
          break $l$block_0;
        }
        var maxElem = this_0[0];
        var lastIndex = get_lastIndex(this_0);
        if (lastIndex === 0) {
          tmp$ret$1 = maxElem;
          break $l$block_0;
        }
        // Inline function 'io.ktor.websocket.Companion.maxOpcode.<anonymous>' call
        var maxValue = maxElem.opcode_1;
        var inductionVariable = 1;
        if (inductionVariable <= lastIndex)
          do {
            var i = inductionVariable;
            inductionVariable = (inductionVariable + 1) | 0;
            var e = this_0[i];
            // Inline function 'io.ktor.websocket.Companion.maxOpcode.<anonymous>' call
            var v = e.opcode_1;
            if (compareTo(maxValue, v) < 0) {
              maxElem = e;
              maxValue = v;
            }
          } while (!(i === lastIndex));
        tmp$ret$1 = maxElem;
      }
      tmp.maxOpcode_1 = ensureNotNull(tmp$ret$1).opcode_1;
      var tmp_0 = this;
      var tmp_1 = 0;
      var tmp_2 = (this.maxOpcode_1 + 1) | 0;
      // Inline function 'kotlin.arrayOfNulls' call
      var tmp_3 = fillArrayVal(Array(tmp_2), null);
      while (tmp_1 < tmp_2) {
        var tmp_4 = tmp_1;
        var tmp$ret$6;
        $l$block_2: {
          // Inline function 'kotlin.collections.singleOrNull' call
          var single = null;
          var found = false;
          var indexedObject = values_0();
          var inductionVariable_0 = 0;
          var last = indexedObject.length;
          while (inductionVariable_0 < last) {
            var element = indexedObject[inductionVariable_0];
            inductionVariable_0 = (inductionVariable_0 + 1) | 0;
            // Inline function 'io.ktor.websocket.Companion.byOpcodeArray.<anonymous>' call
            if (element.opcode_1 === tmp_4) {
              if (found) {
                tmp$ret$6 = null;
                break $l$block_2;
              }
              single = element;
              found = true;
            }
          }
          if (!found) {
            tmp$ret$6 = null;
            break $l$block_2;
          }
          tmp$ret$6 = single;
        }
        tmp_3[tmp_4] = tmp$ret$6;
        tmp_1 = (tmp_1 + 1) | 0;
      }
      tmp_0.byOpcodeArray_1 = tmp_3;
    }
    protoOf(Companion_0).get_c1px32_k$ = function (opcode) {
      return (0 <= opcode ? opcode <= this.maxOpcode_1 : false) ? this.byOpcodeArray_1[opcode] : null;
    };
    var Companion_instance_0;
    function Companion_getInstance_0() {
      FrameType_initEntries();
      if (Companion_instance_0 == null) new Companion_0();
      return Companion_instance_0;
    }
    function values_0() {
      return [
        FrameType_TEXT_getInstance(),
        FrameType_BINARY_getInstance(),
        FrameType_CLOSE_getInstance(),
        FrameType_PING_getInstance(),
        FrameType_PONG_getInstance(),
      ];
    }
    function valueOf_0(value) {
      switch (value) {
        case 'TEXT':
          return FrameType_TEXT_getInstance();
        case 'BINARY':
          return FrameType_BINARY_getInstance();
        case 'CLOSE':
          return FrameType_CLOSE_getInstance();
        case 'PING':
          return FrameType_PING_getInstance();
        case 'PONG':
          return FrameType_PONG_getInstance();
        default:
          FrameType_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    var FrameType_entriesInitialized;
    function FrameType_initEntries() {
      if (FrameType_entriesInitialized) return Unit_getInstance();
      FrameType_entriesInitialized = true;
      FrameType_TEXT_instance = new FrameType('TEXT', 0, false, 1);
      FrameType_BINARY_instance = new FrameType('BINARY', 1, false, 2);
      FrameType_CLOSE_instance = new FrameType('CLOSE', 2, true, 8);
      FrameType_PING_instance = new FrameType('PING', 3, true, 9);
      FrameType_PONG_instance = new FrameType('PONG', 4, true, 10);
      Companion_getInstance_0();
    }
    function FrameType(name, ordinal, controlFrame, opcode) {
      Enum.call(this, name, ordinal);
      this.controlFrame_1 = controlFrame;
      this.opcode_1 = opcode;
    }
    protoOf(FrameType).get_controlFrame_mohuav_k$ = function () {
      return this.controlFrame_1;
    };
    protoOf(FrameType).get_opcode_hp2o9j_k$ = function () {
      return this.opcode_1;
    };
    function FrameType_TEXT_getInstance() {
      FrameType_initEntries();
      return FrameType_TEXT_instance;
    }
    function FrameType_BINARY_getInstance() {
      FrameType_initEntries();
      return FrameType_BINARY_instance;
    }
    function FrameType_CLOSE_getInstance() {
      FrameType_initEntries();
      return FrameType_CLOSE_instance;
    }
    function FrameType_PING_getInstance() {
      FrameType_initEntries();
      return FrameType_PING_instance;
    }
    function FrameType_PONG_getInstance() {
      FrameType_initEntries();
      return FrameType_PONG_instance;
    }
    function get_PongerCoroutineName() {
      _init_properties_PingPong_kt__9aqxey();
      return PongerCoroutineName;
    }
    var PongerCoroutineName;
    function get_PingerCoroutineName() {
      _init_properties_PingPong_kt__9aqxey();
      return PingerCoroutineName;
    }
    var PingerCoroutineName;
    var properties_initialized_PingPong_kt_fbfhmc;
    function _init_properties_PingPong_kt__9aqxey() {
      if (!properties_initialized_PingPong_kt_fbfhmc) {
        properties_initialized_PingPong_kt_fbfhmc = true;
        PongerCoroutineName = new CoroutineName('ws-ponger');
        PingerCoroutineName = new CoroutineName('ws-pinger');
      }
    }
    function WebSocketExtension() {}
    function WebSocketExtensionFactory() {}
    function parametersToString($this) {
      return $this.parameters_1.isEmpty_y1axqb_k$() ? '' : ', ' + joinToString($this.parameters_1, ',');
    }
    function WebSocketExtensionHeader$parseParameters$lambda(it) {
      var equalsIndex = indexOf(it, _Char___init__impl__6a9atx(61));
      if (equalsIndex < 0) return to(it, '');
      var key = substring(it, until(0, equalsIndex));
      var tmp;
      if (((equalsIndex + 1) | 0) < it.length) {
        // Inline function 'kotlin.text.substring' call
        var startIndex = (equalsIndex + 1) | 0;
        // Inline function 'kotlin.js.asDynamic' call
        tmp = it.substring(startIndex);
      } else {
        tmp = '';
      }
      var value = tmp;
      return to(key, value);
    }
    function WebSocketExtensionHeader(name, parameters) {
      this.name_1 = name;
      this.parameters_1 = parameters;
    }
    protoOf(WebSocketExtensionHeader).get_name_woqyms_k$ = function () {
      return this.name_1;
    };
    protoOf(WebSocketExtensionHeader).get_parameters_cl4rkd_k$ = function () {
      return this.parameters_1;
    };
    protoOf(WebSocketExtensionHeader).parseParameters_8pxmv7_k$ = function () {
      var tmp = asSequence(this.parameters_1);
      return map(tmp, WebSocketExtensionHeader$parseParameters$lambda);
    };
    protoOf(WebSocketExtensionHeader).toString = function () {
      return this.name_1 + ' ' + parametersToString(this);
    };
    function Binary_init_$Init$(fin, data, $this) {
      Binary.call($this, fin, data, false, false, false);
      return $this;
    }
    function Binary_init_$Create$(fin, data) {
      return Binary_init_$Init$(fin, data, objectCreate(protoOf(Binary)));
    }
    function Binary_init_$Init$_0(fin, packet, $this) {
      Binary_init_$Init$(fin, readBytes(packet), $this);
      return $this;
    }
    function Binary_init_$Create$_0(fin, packet) {
      return Binary_init_$Init$_0(fin, packet, objectCreate(protoOf(Binary)));
    }
    function Text_init_$Init$(fin, data, $this) {
      Text.call($this, fin, data, false, false, false);
      return $this;
    }
    function Text_init_$Create$(fin, data) {
      return Text_init_$Init$(fin, data, objectCreate(protoOf(Text)));
    }
    function Text_init_$Init$_0(text, $this) {
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.toByteArray' call
        var charset = Charsets_getInstance().get_UTF_8_ihn39z_k$();
        if (charset.equals(Charsets_getInstance().get_UTF_8_ihn39z_k$())) {
          tmp$ret$0 = encodeToByteArray(text);
          break $l$block;
        }
        tmp$ret$0 = encodeToByteArray_0(charset.newEncoder_gqwcdg_k$(), text, 0, text.length);
      }
      Text_init_$Init$(true, tmp$ret$0, $this);
      return $this;
    }
    function Text_init_$Create$_0(text) {
      return Text_init_$Init$_0(text, objectCreate(protoOf(Text)));
    }
    function Text_init_$Init$_1(fin, packet, $this) {
      Text_init_$Init$(fin, readBytes(packet), $this);
      return $this;
    }
    function Text_init_$Create$_1(fin, packet) {
      return Text_init_$Init$_1(fin, packet, objectCreate(protoOf(Text)));
    }
    function Close_init_$Init$(reason, $this) {
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.buildPacket' call
        // Inline function 'kotlin.contracts.contract' call
        var builder = new BytePacketBuilder();
        try {
          // Inline function 'io.ktor.websocket.Close.<init>.<anonymous>' call
          writeShort(builder, reason.get_code_wok7xy_k$());
          writeText(builder, reason.get_message_h23axq_k$());
          tmp$ret$0 = builder.build_1k0s4u_k$();
          break $l$block;
        } catch ($p) {
          if ($p instanceof Error) {
            var t = $p;
            builder.release_wu5yyf_k$();
            throw t;
          } else {
            throw $p;
          }
        }
      }
      Close_init_$Init$_0(tmp$ret$0, $this);
      return $this;
    }
    function Close_init_$Create$(reason) {
      return Close_init_$Init$(reason, objectCreate(protoOf(Close)));
    }
    function Close_init_$Init$_0(packet, $this) {
      Close.call($this, readBytes(packet));
      return $this;
    }
    function Close_init_$Create$_0(packet) {
      return Close_init_$Init$_0(packet, objectCreate(protoOf(Close)));
    }
    function Close_init_$Init$_1($this) {
      Close.call($this, Companion_getInstance_1().Empty_1);
      return $this;
    }
    function Close_init_$Create$_1() {
      return Close_init_$Init$_1(objectCreate(protoOf(Close)));
    }
    function Ping_init_$Init$(packet, $this) {
      Ping.call($this, readBytes(packet));
      return $this;
    }
    function Ping_init_$Create$(packet) {
      return Ping_init_$Init$(packet, objectCreate(protoOf(Ping)));
    }
    function Pong_init_$Init$(packet, $this) {
      Pong.call($this, readBytes(packet), NonDisposableHandle_getInstance());
      return $this;
    }
    function Pong_init_$Create$(packet) {
      return Pong_init_$Init$(packet, objectCreate(protoOf(Pong)));
    }
    function _get_Empty__x4mxmk($this) {
      return $this.Empty_1;
    }
    function Binary(fin, data, rsv1, rsv2, rsv3) {
      rsv1 = rsv1 === VOID ? false : rsv1;
      rsv2 = rsv2 === VOID ? false : rsv2;
      rsv3 = rsv3 === VOID ? false : rsv3;
      Frame.call(this, fin, FrameType_BINARY_getInstance(), data, NonDisposableHandle_getInstance(), rsv1, rsv2, rsv3);
    }
    function Text(fin, data, rsv1, rsv2, rsv3) {
      rsv1 = rsv1 === VOID ? false : rsv1;
      rsv2 = rsv2 === VOID ? false : rsv2;
      rsv3 = rsv3 === VOID ? false : rsv3;
      Frame.call(this, fin, FrameType_TEXT_getInstance(), data, NonDisposableHandle_getInstance(), rsv1, rsv2, rsv3);
    }
    function Close(data) {
      Frame.call(
        this,
        true,
        FrameType_CLOSE_getInstance(),
        data,
        NonDisposableHandle_getInstance(),
        false,
        false,
        false,
      );
    }
    function Ping(data) {
      Frame.call(
        this,
        true,
        FrameType_PING_getInstance(),
        data,
        NonDisposableHandle_getInstance(),
        false,
        false,
        false,
      );
    }
    function Pong(data, disposableHandle) {
      disposableHandle = disposableHandle === VOID ? NonDisposableHandle_getInstance() : disposableHandle;
      Frame.call(this, true, FrameType_PONG_getInstance(), data, disposableHandle, false, false, false);
    }
    function Companion_1() {
      Companion_instance_1 = this;
      this.Empty_1 = new Int8Array(0);
    }
    protoOf(Companion_1).byType_90xas5_k$ = function (fin, frameType, data, rsv1, rsv2, rsv3) {
      var tmp;
      switch (frameType.get_ordinal_ip24qg_k$()) {
        case 1:
          tmp = new Binary(fin, data, rsv1, rsv2, rsv3);
          break;
        case 0:
          tmp = new Text(fin, data, rsv1, rsv2, rsv3);
          break;
        case 2:
          tmp = new Close(data);
          break;
        case 3:
          tmp = new Ping(data);
          break;
        case 4:
          tmp = new Pong(data, NonDisposableHandle_getInstance());
          break;
        default:
          noWhenBranchMatchedException();
          break;
      }
      return tmp;
    };
    var Companion_instance_1;
    function Companion_getInstance_1() {
      if (Companion_instance_1 == null) new Companion_1();
      return Companion_instance_1;
    }
    function Frame(fin, frameType, data, disposableHandle, rsv1, rsv2, rsv3) {
      Companion_getInstance_1();
      disposableHandle = disposableHandle === VOID ? NonDisposableHandle_getInstance() : disposableHandle;
      rsv1 = rsv1 === VOID ? false : rsv1;
      rsv2 = rsv2 === VOID ? false : rsv2;
      rsv3 = rsv3 === VOID ? false : rsv3;
      this.fin_1 = fin;
      this.frameType_1 = frameType;
      this.data_1 = data;
      this.disposableHandle_1 = disposableHandle;
      this.rsv1__1 = rsv1;
      this.rsv2__1 = rsv2;
      this.rsv3__1 = rsv3;
    }
    protoOf(Frame).get_fin_18j5um_k$ = function () {
      return this.fin_1;
    };
    protoOf(Frame).get_frameType_hj325a_k$ = function () {
      return this.frameType_1;
    };
    protoOf(Frame).get_data_wokkxf_k$ = function () {
      return this.data_1;
    };
    protoOf(Frame).get_disposableHandle_9vd6rz_k$ = function () {
      return this.disposableHandle_1;
    };
    protoOf(Frame).get_rsv1_wotw3p_k$ = function () {
      return this.rsv1__1;
    };
    protoOf(Frame).get_rsv2_wotw3q_k$ = function () {
      return this.rsv2__1;
    };
    protoOf(Frame).get_rsv3_wotw3r_k$ = function () {
      return this.rsv3__1;
    };
    protoOf(Frame).toString = function () {
      return 'Frame ' + this.frameType_1 + ' (fin=' + this.fin_1 + ', buffer len = ' + this.data_1.length + ')';
    };
    protoOf(Frame).copy_1tks5_k$ = function () {
      var tmp = Companion_getInstance_1();
      // Inline function 'kotlin.collections.copyOf' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$1 = this.data_1.slice();
      return tmp.byType_90xas5_k$(this.fin_1, this.frameType_1, tmp$ret$1, this.rsv1__1, this.rsv2__1, this.rsv3__1);
    };
    return _;
  },
);

//# sourceMappingURL=ktor-ktor-websockets.js.map
