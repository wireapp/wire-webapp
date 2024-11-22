(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define([
      'exports',
      '@js-joda/core',
      './kotlin-kotlin-stdlib.js',
      './kotlinx-serialization-kotlinx-serialization-core.js',
    ], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('@js-joda/core'),
      require('./kotlin-kotlin-stdlib.js'),
      require('./kotlinx-serialization-kotlinx-serialization-core.js'),
    );
  else {
    if (typeof this['@js-joda/core'] === 'undefined') {
      throw new Error(
        "Error loading module 'Kotlin-DateTime-library-kotlinx-datetime'. Its dependency '@js-joda/core' was not found. Please, check whether '@js-joda/core' is loaded prior to 'Kotlin-DateTime-library-kotlinx-datetime'.",
      );
    }
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'Kotlin-DateTime-library-kotlinx-datetime'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'Kotlin-DateTime-library-kotlinx-datetime'.",
      );
    }
    if (typeof this['kotlinx-serialization-kotlinx-serialization-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'Kotlin-DateTime-library-kotlinx-datetime'. Its dependency 'kotlinx-serialization-kotlinx-serialization-core' was not found. Please, check whether 'kotlinx-serialization-kotlinx-serialization-core' is loaded prior to 'Kotlin-DateTime-library-kotlinx-datetime'.",
      );
    }
    root['Kotlin-DateTime-library-kotlinx-datetime'] = factory(
      typeof this['Kotlin-DateTime-library-kotlinx-datetime'] === 'undefined'
        ? {}
        : this['Kotlin-DateTime-library-kotlinx-datetime'],
      this['@js-joda/core'],
      this['kotlin-kotlin-stdlib'],
      this['kotlinx-serialization-kotlinx-serialization-core'],
    );
  }
})(
  this,
  function (_, $module$_js_joda_core_gcv2k, kotlin_kotlin, kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core) {
    'use strict';
    //region block: imports
    var Instant = $module$_js_joda_core_gcv2k.Instant;
    var Clock = $module$_js_joda_core_gcv2k.Clock;
    var OffsetDateTime = $module$_js_joda_core_gcv2k.OffsetDateTime;
    var Duration = $module$_js_joda_core_gcv2k.Duration;
    var protoOf = kotlin_kotlin.$_$.dc;
    var objectMeta = kotlin_kotlin.$_$.cc;
    var setMetadataFor = kotlin_kotlin.$_$.ec;
    var VOID = kotlin_kotlin.$_$.f;
    var interfaceMeta = kotlin_kotlin.$_$.gb;
    var IllegalArgumentException_init_$Init$ = kotlin_kotlin.$_$.o1;
    var objectCreate = kotlin_kotlin.$_$.bc;
    var captureStack = kotlin_kotlin.$_$.na;
    var IllegalArgumentException_init_$Init$_0 = kotlin_kotlin.$_$.q1;
    var IllegalArgumentException_init_$Init$_1 = kotlin_kotlin.$_$.n1;
    var IllegalArgumentException_init_$Init$_2 = kotlin_kotlin.$_$.s1;
    var IllegalArgumentException = kotlin_kotlin.$_$.hg;
    var classMeta = kotlin_kotlin.$_$.ta;
    var Long = kotlin_kotlin.$_$.kg;
    var STRING_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.h;
    var PrimitiveSerialDescriptor = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.e1;
    var THROW_CCE = kotlin_kotlin.$_$.qg;
    var KSerializer = kotlin_org_jetbrains_kotlinx_kotlinx_serialization_core.$_$.s2;
    var _Char___init__impl__6a9atx = kotlin_kotlin.$_$.t2;
    var indexOf = kotlin_kotlin.$_$.vd;
    var charSequenceLength = kotlin_kotlin.$_$.ra;
    var charSequenceGet = kotlin_kotlin.$_$.qa;
    var toLong = kotlin_kotlin.$_$.gc;
    var ArithmeticException = kotlin_kotlin.$_$.xf;
    var numberToLong = kotlin_kotlin.$_$.ac;
    var numberToInt = kotlin_kotlin.$_$.zb;
    var _Duration___get_inWholeSeconds__impl__hpy7b3 = kotlin_kotlin.$_$.n2;
    var _Duration___get_nanosecondsComponent__impl__nh19kq = kotlin_kotlin.$_$.p2;
    var Duration__isPositive_impl_tvkkt2 = kotlin_kotlin.$_$.o2;
    var Duration__unaryMinus_impl_x2k1y0 = kotlin_kotlin.$_$.s2;
    var Companion_getInstance = kotlin_kotlin.$_$.c5;
    var DurationUnit_SECONDS_getInstance = kotlin_kotlin.$_$.h;
    var toDuration = kotlin_kotlin.$_$.vf;
    var DurationUnit_NANOSECONDS_getInstance = kotlin_kotlin.$_$.g;
    var Duration__plus_impl_yu9v8f = kotlin_kotlin.$_$.q2;
    var Comparable = kotlin_kotlin.$_$.ag;
    var ArithmeticException_init_$Create$ = kotlin_kotlin.$_$.g1;
    //endregion
    //region block: pre-declaration
    setMetadataFor(Clock_0, 'Clock', interfaceMeta);
    setMetadataFor(System, 'System', objectMeta, VOID, [Clock_0]);
    setMetadataFor(Companion, 'Companion', objectMeta);
    setMetadataFor(
      DateTimeFormatException,
      'DateTimeFormatException',
      classMeta,
      IllegalArgumentException,
      VOID,
      DateTimeFormatException_init_$Create$,
    );
    setMetadataFor(InstantIso8601Serializer, 'InstantIso8601Serializer', objectMeta, VOID, [KSerializer]);
    setMetadataFor(Companion_0, 'Companion', objectMeta);
    setMetadataFor(Instant_0, 'Instant', classMeta, VOID, [Comparable], VOID, VOID, {
      0: InstantIso8601Serializer_getInstance,
    });
    //endregion
    function System() {
      System_instance = this;
    }
    protoOf(System).now_2cba_k$ = function () {
      return Companion_getInstance_1().now_2cba_k$();
    };
    var System_instance;
    function System_getInstance() {
      if (System_instance == null) new System();
      return System_instance;
    }
    function Companion() {
      Companion_instance = this;
    }
    var Companion_instance;
    function Companion_getInstance_0() {
      if (Companion_instance == null) new Companion();
      return Companion_instance;
    }
    function Clock_0() {}
    function DateTimeFormatException_init_$Init$($this) {
      IllegalArgumentException_init_$Init$($this);
      DateTimeFormatException.call($this);
      return $this;
    }
    function DateTimeFormatException_init_$Create$() {
      var tmp = DateTimeFormatException_init_$Init$(objectCreate(protoOf(DateTimeFormatException)));
      captureStack(tmp, DateTimeFormatException_init_$Create$);
      return tmp;
    }
    function DateTimeFormatException_init_$Init$_0(message, $this) {
      IllegalArgumentException_init_$Init$_0(message, $this);
      DateTimeFormatException.call($this);
      return $this;
    }
    function DateTimeFormatException_init_$Create$_0(message) {
      var tmp = DateTimeFormatException_init_$Init$_0(message, objectCreate(protoOf(DateTimeFormatException)));
      captureStack(tmp, DateTimeFormatException_init_$Create$_0);
      return tmp;
    }
    function DateTimeFormatException_init_$Init$_1(cause, $this) {
      IllegalArgumentException_init_$Init$_1(cause, $this);
      DateTimeFormatException.call($this);
      return $this;
    }
    function DateTimeFormatException_init_$Create$_1(cause) {
      var tmp = DateTimeFormatException_init_$Init$_1(cause, objectCreate(protoOf(DateTimeFormatException)));
      captureStack(tmp, DateTimeFormatException_init_$Create$_1);
      return tmp;
    }
    function DateTimeFormatException_init_$Init$_2(message, cause, $this) {
      IllegalArgumentException_init_$Init$_2(message, cause, $this);
      DateTimeFormatException.call($this);
      return $this;
    }
    function DateTimeFormatException_init_$Create$_2(message, cause) {
      var tmp = DateTimeFormatException_init_$Init$_2(message, cause, objectCreate(protoOf(DateTimeFormatException)));
      captureStack(tmp, DateTimeFormatException_init_$Create$_2);
      return tmp;
    }
    function DateTimeFormatException() {
      captureStack(this, DateTimeFormatException);
    }
    function get_DISTANT_PAST_SECONDS() {
      return DISTANT_PAST_SECONDS;
    }
    var DISTANT_PAST_SECONDS;
    function get_DISTANT_FUTURE_SECONDS() {
      return DISTANT_FUTURE_SECONDS;
    }
    var DISTANT_FUTURE_SECONDS;
    function get_NANOS_PER_MILLI() {
      return NANOS_PER_MILLI;
    }
    var NANOS_PER_MILLI;
    function get_MILLIS_PER_ONE() {
      return MILLIS_PER_ONE;
    }
    var MILLIS_PER_ONE;
    function get_NANOS_PER_ONE() {
      return NANOS_PER_ONE;
    }
    var NANOS_PER_ONE;
    function InstantIso8601Serializer() {
      InstantIso8601Serializer_instance = this;
      this.descriptor_1 = PrimitiveSerialDescriptor('Instant', STRING_getInstance());
    }
    protoOf(InstantIso8601Serializer).get_descriptor_wjt6a0_k$ = function () {
      return this.descriptor_1;
    };
    protoOf(InstantIso8601Serializer).deserialize_sy6x50_k$ = function (decoder) {
      return Companion_getInstance_1().parse_pc1q8p_k$(decoder.decodeString_x3hxsx_k$());
    };
    protoOf(InstantIso8601Serializer).serialize_1cezrs_k$ = function (encoder, value) {
      encoder.encodeString_424b5v_k$(value.toString());
    };
    protoOf(InstantIso8601Serializer).serialize_5ase3y_k$ = function (encoder, value) {
      return this.serialize_1cezrs_k$(encoder, value instanceof Instant_0 ? value : THROW_CCE());
    };
    var InstantIso8601Serializer_instance;
    function InstantIso8601Serializer_getInstance() {
      if (InstantIso8601Serializer_instance == null) new InstantIso8601Serializer();
      return InstantIso8601Serializer_instance;
    }
    function fixOffsetRepresentation($this, isoString) {
      var time = indexOf(isoString, _Char___init__impl__6a9atx(84), VOID, true);
      if (time === -1) return isoString;
      var tmp$ret$1;
      $l$block: {
        // Inline function 'kotlin.text.indexOfLast' call
        var inductionVariable = (charSequenceLength(isoString) - 1) | 0;
        if (0 <= inductionVariable)
          do {
            var index = inductionVariable;
            inductionVariable = (inductionVariable + -1) | 0;
            // Inline function 'kotlinx.datetime.Companion.fixOffsetRepresentation.<anonymous>' call
            var c = charSequenceGet(isoString, index);
            if (c === _Char___init__impl__6a9atx(43) ? true : c === _Char___init__impl__6a9atx(45)) {
              tmp$ret$1 = index;
              break $l$block;
            }
          } while (0 <= inductionVariable);
        tmp$ret$1 = -1;
      }
      var offset = tmp$ret$1;
      if (offset < time) return isoString;
      var separator = indexOf(isoString, _Char___init__impl__6a9atx(58), offset);
      return !(separator === -1) ? isoString : isoString + ':00';
    }
    function Companion_0() {
      Companion_instance_0 = this;
      var tmp = this;
      // Inline function 'kotlinx.datetime.jsTry' call
      // Inline function 'kotlinx.datetime.Companion.DISTANT_PAST.<anonymous>' call
      var tmp$ret$1 = Instant.ofEpochSecond(get_DISTANT_PAST_SECONDS().toDouble_ygsx0s_k$(), 999999999);
      tmp.DISTANT_PAST_1 = new Instant_0(tmp$ret$1);
      var tmp_0 = this;
      // Inline function 'kotlinx.datetime.jsTry' call
      // Inline function 'kotlinx.datetime.Companion.DISTANT_FUTURE.<anonymous>' call
      var tmp$ret$3 = Instant.ofEpochSecond(get_DISTANT_FUTURE_SECONDS().toDouble_ygsx0s_k$(), 0);
      tmp_0.DISTANT_FUTURE_1 = new Instant_0(tmp$ret$3);
      this.MIN_1 = new Instant_0(Instant.MIN);
      this.MAX_1 = new Instant_0(Instant.MAX);
    }
    protoOf(Companion_0).now_2cba_k$ = function () {
      return new Instant_0(Clock.systemUTC().instant());
    };
    protoOf(Companion_0).fromEpochMilliseconds_e2resj_k$ = function (epochMilliseconds) {
      var tmp;
      try {
        // Inline function 'kotlin.Long.div' call
        var other = get_MILLIS_PER_ONE();
        var tmp_0 = epochMilliseconds.div_jun7gj_k$(toLong(other));
        // Inline function 'kotlin.Long.times' call
        // Inline function 'kotlin.Long.rem' call
        var other_0 = get_MILLIS_PER_ONE();
        var this_0 = epochMilliseconds.rem_bsnl9o_k$(toLong(other_0));
        var other_1 = get_NANOS_PER_MILLI();
        var tmp$ret$2 = this_0.times_nfzjiw_k$(toLong(other_1));
        tmp = this.fromEpochSeconds_labkcg_k$(tmp_0, tmp$ret$2);
      } catch ($p) {
        var tmp_1;
        if ($p instanceof Error) {
          var e = $p;
          if (!isJodaDateTimeException(e)) throw e;
          tmp_1 = epochMilliseconds.compareTo_9jj042_k$(new Long(0, 0)) > 0 ? this.MAX_1 : this.MIN_1;
        } else {
          throw $p;
        }
        tmp = tmp_1;
      }
      return tmp;
    };
    protoOf(Companion_0).parse_pc1q8p_k$ = function (isoString) {
      var tmp;
      try {
        // Inline function 'kotlinx.datetime.jsTry' call
        // Inline function 'kotlinx.datetime.Companion.parse.<anonymous>' call
        var tmp$ret$1 = OffsetDateTime.parse(fixOffsetRepresentation(Companion_getInstance_1(), isoString));
        tmp = new Instant_0(tmp$ret$1.toInstant());
      } catch ($p) {
        var tmp_0;
        if ($p instanceof Error) {
          var e = $p;
          if (isJodaDateTimeParseException(e)) throw DateTimeFormatException_init_$Create$_1(e);
          throw e;
        } else {
          throw $p;
        }
      }
      return tmp;
    };
    protoOf(Companion_0).fromEpochSeconds_labkcg_k$ = function (epochSeconds, nanosecondAdjustment) {
      var tmp;
      try {
        // Inline function 'kotlin.floorDiv' call
        var other = toLong(get_NANOS_PER_ONE());
        var q = nanosecondAdjustment.div_jun7gj_k$(other);
        if (
          nanosecondAdjustment.xor_qzz94j_k$(other).compareTo_9jj042_k$(new Long(0, 0)) < 0
            ? !q.times_nfzjiw_k$(other).equals(nanosecondAdjustment)
            : false
        ) {
          q = q.dec_24n6_k$();
        }
        var tmp$ret$0 = q;
        var secs = safeAdd(epochSeconds, tmp$ret$0);
        // Inline function 'kotlin.mod' call
        var other_0 = toLong(get_NANOS_PER_ONE());
        var r = nanosecondAdjustment.rem_bsnl9o_k$(other_0);
        var nos = r
          .plus_r93sks_k$(
            other_0.and_4spn93_k$(
              r.xor_qzz94j_k$(other_0).and_4spn93_k$(r.or_v7fvkl_k$(r.unaryMinus_6uz0qp_k$())).shr_9fl3wl_k$(63),
            ),
          )
          .toInt_1tsl84_k$();
        // Inline function 'kotlinx.datetime.jsTry' call
        // Inline function 'kotlinx.datetime.Companion.fromEpochSeconds.<anonymous>' call
        var tmp$ret$3 = Instant.ofEpochSecond(secs.toDouble_ygsx0s_k$(), nos);
        tmp = new Instant_0(tmp$ret$3);
      } catch ($p) {
        var tmp_0;
        if ($p instanceof Error) {
          var e = $p;
          var tmp_1;
          if (!isJodaDateTimeException(e)) {
            tmp_1 = !(e instanceof ArithmeticException);
          } else {
            tmp_1 = false;
          }
          if (tmp_1) throw e;
          tmp_0 = epochSeconds.compareTo_9jj042_k$(new Long(0, 0)) > 0 ? this.MAX_1 : this.MIN_1;
        } else {
          throw $p;
        }
        tmp = tmp_0;
      }
      return tmp;
    };
    protoOf(Companion_0).fromEpochSeconds$default_ryd2jg_k$ = function (epochSeconds, nanosecondAdjustment, $super) {
      nanosecondAdjustment = nanosecondAdjustment === VOID ? new Long(0, 0) : nanosecondAdjustment;
      return $super === VOID
        ? this.fromEpochSeconds_labkcg_k$(epochSeconds, nanosecondAdjustment)
        : $super.fromEpochSeconds_labkcg_k$.call(this, epochSeconds, nanosecondAdjustment);
    };
    protoOf(Companion_0).fromEpochSeconds_idu11y_k$ = function (epochSeconds, nanosecondAdjustment) {
      var tmp;
      try {
        // Inline function 'kotlinx.datetime.jsTry' call
        // Inline function 'kotlinx.datetime.Companion.fromEpochSeconds.<anonymous>' call
        var tmp$ret$1 = Instant.ofEpochSecond(epochSeconds.toDouble_ygsx0s_k$(), nanosecondAdjustment);
        tmp = new Instant_0(tmp$ret$1);
      } catch ($p) {
        var tmp_0;
        if ($p instanceof Error) {
          var e = $p;
          if (!isJodaDateTimeException(e)) throw e;
          tmp_0 = epochSeconds.compareTo_9jj042_k$(new Long(0, 0)) > 0 ? this.MAX_1 : this.MIN_1;
        } else {
          throw $p;
        }
        tmp = tmp_0;
      }
      return tmp;
    };
    protoOf(Companion_0).get_DISTANT_PAST_yzdqbd_k$ = function () {
      return this.DISTANT_PAST_1;
    };
    protoOf(Companion_0).get_DISTANT_FUTURE_gftwmi_k$ = function () {
      return this.DISTANT_FUTURE_1;
    };
    protoOf(Companion_0).get_MIN_18jp6f_k$ = function () {
      return this.MIN_1;
    };
    protoOf(Companion_0).get_MAX_18jpd1_k$ = function () {
      return this.MAX_1;
    };
    protoOf(Companion_0).serializer_9w0wvi_k$ = function () {
      return InstantIso8601Serializer_getInstance();
    };
    var Companion_instance_0;
    function Companion_getInstance_1() {
      if (Companion_instance_0 == null) new Companion_0();
      return Companion_instance_0;
    }
    function Instant_0(value) {
      Companion_getInstance_1();
      this.value_1 = value;
    }
    protoOf(Instant_0).get_value_j01efc_k$ = function () {
      return this.value_1;
    };
    protoOf(Instant_0).get_epochSeconds_w76ght_k$ = function () {
      return numberToLong(this.value_1.epochSecond());
    };
    protoOf(Instant_0).get_nanosecondsOfSecond_n2ey8j_k$ = function () {
      return numberToInt(this.value_1.nano());
    };
    protoOf(Instant_0).toEpochMilliseconds_82cfls_k$ = function () {
      // Inline function 'kotlin.Long.plus' call
      // Inline function 'kotlin.Long.times' call
      var this_0 = this.get_epochSeconds_w76ght_k$();
      var other = get_MILLIS_PER_ONE();
      var this_1 = this_0.times_nfzjiw_k$(toLong(other));
      var other_0 = (this.get_nanosecondsOfSecond_n2ey8j_k$() / get_NANOS_PER_MILLI()) | 0;
      return this_1.plus_r93sks_k$(toLong(other_0));
    };
    protoOf(Instant_0).plus_oeswd1_k$ = function (duration) {
      // Inline function 'kotlin.time.Duration.toComponents' call
      // Inline function 'kotlin.contracts.contract' call
      var seconds = _Duration___get_inWholeSeconds__impl__hpy7b3(duration);
      var nanoseconds = _Duration___get_nanosecondsComponent__impl__nh19kq(duration);
      var tmp;
      try {
        tmp = new Instant_0(this.plusFix_2a4tar_k$(seconds.toDouble_ygsx0s_k$(), nanoseconds));
      } catch ($p) {
        var tmp_0;
        if ($p instanceof Error) {
          var e = $p;
          if (!isJodaDateTimeException(e)) throw e;
          tmp_0 = Duration__isPositive_impl_tvkkt2(duration)
            ? Companion_getInstance_1().MAX_1
            : Companion_getInstance_1().MIN_1;
        } else {
          throw $p;
        }
        tmp = tmp_0;
      }
      return tmp;
    };
    protoOf(Instant_0).plusFix_2a4tar_k$ = function (seconds, nanos) {
      var newSeconds = this.value_1.epochSecond() + seconds;
      var newNanos = this.value_1.nano() + nanos;
      // Inline function 'kotlinx.datetime.jsTry' call
      // Inline function 'kotlinx.datetime.Instant.plusFix.<anonymous>' call
      return Instant.ofEpochSecond(newSeconds, numberToInt(newNanos));
    };
    protoOf(Instant_0).minus_j7epkb_k$ = function (duration) {
      return this.plus_oeswd1_k$(Duration__unaryMinus_impl_x2k1y0(duration));
    };
    protoOf(Instant_0).minus_mev7kl_k$ = function (other) {
      var diff = Duration.between(other.value_1, this.value_1);
      // Inline function 'kotlin.time.Companion.seconds' call
      Companion_getInstance();
      var this_0 = diff.seconds();
      var tmp = toDuration(this_0, DurationUnit_SECONDS_getInstance());
      // Inline function 'kotlin.time.Companion.nanoseconds' call
      Companion_getInstance();
      var this_1 = diff.nano();
      var tmp$ret$1 = toDuration(this_1, DurationUnit_NANOSECONDS_getInstance());
      return Duration__plus_impl_yu9v8f(tmp, tmp$ret$1);
    };
    protoOf(Instant_0).compareTo_rgp57f_k$ = function (other) {
      return this.value_1.compareTo(other.value_1);
    };
    protoOf(Instant_0).compareTo_hpufkf_k$ = function (other) {
      return this.compareTo_rgp57f_k$(other instanceof Instant_0 ? other : THROW_CCE());
    };
    protoOf(Instant_0).equals = function (other) {
      var tmp;
      if (this === other) {
        tmp = true;
      } else {
        var tmp_0;
        if (other instanceof Instant_0) {
          tmp_0 = this.value_1 === other.value_1 ? true : this.value_1.equals(other.value_1);
        } else {
          tmp_0 = false;
        }
        tmp = tmp_0;
      }
      return tmp;
    };
    protoOf(Instant_0).hashCode = function () {
      return this.value_1.hashCode();
    };
    protoOf(Instant_0).toString = function () {
      return this.value_1.toString();
    };
    function isJodaDateTimeException(_this__u8e3s4) {
      return hasJsExceptionName(_this__u8e3s4, 'DateTimeException');
    }
    function isJodaDateTimeParseException(_this__u8e3s4) {
      return hasJsExceptionName(_this__u8e3s4, 'DateTimeParseException');
    }
    function safeAdd(a, b) {
      var sum = a.plus_r93sks_k$(b);
      if (
        a.xor_qzz94j_k$(sum).compareTo_9jj042_k$(new Long(0, 0)) < 0
          ? a.xor_qzz94j_k$(b).compareTo_9jj042_k$(new Long(0, 0)) >= 0
          : false
      ) {
        throw ArithmeticException_init_$Create$('Addition overflows a long: ' + a.toString() + ' + ' + b.toString());
      }
      return sum;
    }
    function hasJsExceptionName(_this__u8e3s4, name) {
      // Inline function 'kotlin.js.asDynamic' call
      return _this__u8e3s4.name == name;
    }
    //region block: init
    DISTANT_PAST_SECONDS = new Long(-931914497, -750);
    DISTANT_FUTURE_SECONDS = new Long(1151527680, 720);
    NANOS_PER_MILLI = 1000000;
    MILLIS_PER_ONE = 1000;
    NANOS_PER_ONE = 1000000000;
    //endregion
    //region block: exports
    _.$_$ = _.$_$ || {};
    _.$_$.a = InstantIso8601Serializer_getInstance;
    _.$_$.b = System_getInstance;
    //endregion
    return _;
  },
);

//# sourceMappingURL=Kotlin-DateTime-library-kotlinx-datetime.js.map
