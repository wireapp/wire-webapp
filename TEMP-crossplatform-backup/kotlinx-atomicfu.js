(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['exports', './kotlin-kotlin-stdlib.js'], factory);
  else if (typeof exports === 'object') factory(module.exports, require('./kotlin-kotlin-stdlib.js'));
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'kotlinx-atomicfu'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'kotlinx-atomicfu'.",
      );
    }
    root['kotlinx-atomicfu'] = factory(
      typeof this['kotlinx-atomicfu'] === 'undefined' ? {} : this['kotlinx-atomicfu'],
      this['kotlin-kotlin-stdlib'],
    );
  }
})(this, function (_, kotlin_kotlin) {
  'use strict';
  //region block: imports
  var fillArrayVal = kotlin_kotlin.$_$.za;
  var protoOf = kotlin_kotlin.$_$.dc;
  var defineProp = kotlin_kotlin.$_$.va;
  var classMeta = kotlin_kotlin.$_$.ta;
  var setMetadataFor = kotlin_kotlin.$_$.ec;
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var objectMeta = kotlin_kotlin.$_$.cc;
  var toString = kotlin_kotlin.$_$.ic;
  var VOID = kotlin_kotlin.$_$.f;
  var toString_0 = kotlin_kotlin.$_$.wh;
  //endregion
  //region block: pre-declaration
  setMetadataFor(atomicfu$AtomicRefArray$ref, 'AtomicArray', classMeta);
  setMetadataFor(atomicfu$TraceBase, 'TraceBase', classMeta);
  setMetadataFor(None, 'None', objectMeta, atomicfu$TraceBase);
  setMetadataFor(atomicfu$TraceFormat, 'TraceFormat', classMeta, VOID, VOID, atomicfu$TraceFormat);
  setMetadataFor(AtomicRef, 'AtomicRef', classMeta);
  setMetadataFor(AtomicBoolean, 'AtomicBoolean', classMeta);
  setMetadataFor(AtomicInt, 'AtomicInt', classMeta);
  setMetadataFor(AtomicLong, 'AtomicLong', classMeta);
  setMetadataFor(ReentrantLock, 'ReentrantLock', classMeta, VOID, VOID, ReentrantLock);
  //endregion
  function loop(_this__u8e3s4, action) {
    while (true) {
      action(_this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$());
    }
  }
  function _get_array__jslnqg($this) {
    return $this.array_1;
  }
  function atomicfu$AtomicRefArray$ref(size) {
    var tmp = this;
    var tmp_0 = 0;
    // Inline function 'kotlin.arrayOfNulls' call
    var tmp_1 = fillArrayVal(Array(size), null);
    while (tmp_0 < size) {
      tmp_1[tmp_0] = atomic$ref$1(null);
      tmp_0 = (tmp_0 + 1) | 0;
    }
    tmp.array_1 = tmp_1;
  }
  protoOf(atomicfu$AtomicRefArray$ref).get_atomicfu$size_iufoqq_k$ = function () {
    return this.array_1.length;
  };
  protoOf(atomicfu$AtomicRefArray$ref).atomicfu$get = function (index) {
    return this.array_1[index];
  };
  function atomicfu$AtomicRefArray$ofNulls(size) {
    return new atomicfu$AtomicRefArray$ref(size);
  }
  function update(_this__u8e3s4, function_0) {
    while (true) {
      var cur = _this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$();
      var upd = function_0(cur);
      if (_this__u8e3s4.atomicfu$compareAndSet(cur, upd)) return Unit_getInstance();
    }
  }
  function getAndUpdate(_this__u8e3s4, function_0) {
    while (true) {
      var cur = _this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$();
      var upd = function_0(cur);
      if (_this__u8e3s4.atomicfu$compareAndSet(cur, upd)) return cur;
    }
  }
  function loop_0(_this__u8e3s4, action) {
    while (true) {
      action(_this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$());
    }
  }
  function update_0(_this__u8e3s4, function_0) {
    while (true) {
      var cur = _this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$();
      var upd = function_0(cur);
      if (_this__u8e3s4.atomicfu$compareAndSet(cur, upd)) return Unit_getInstance();
    }
  }
  function loop_1(_this__u8e3s4, action) {
    while (true) {
      action(_this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$());
    }
  }
  function update_1(_this__u8e3s4, function_0) {
    while (true) {
      var cur = _this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$();
      var upd = function_0(cur);
      if (_this__u8e3s4.atomicfu$compareAndSet(cur, upd)) return Unit_getInstance();
    }
  }
  function updateAndGet(_this__u8e3s4, function_0) {
    while (true) {
      var cur = _this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$();
      var upd = function_0(cur);
      if (_this__u8e3s4.atomicfu$compareAndSet(cur, upd)) return upd;
    }
  }
  function updateAndGet_0(_this__u8e3s4, function_0) {
    while (true) {
      var cur = _this__u8e3s4.get_kotlinx$atomicfu$value_vi2am5_k$();
      var upd = function_0(cur);
      if (_this__u8e3s4.atomicfu$compareAndSet(cur, upd)) return upd;
    }
  }
  function None() {
    None_instance = this;
    atomicfu$TraceBase.call(this);
  }
  var None_instance;
  function None_getInstance() {
    if (None_instance == null) new None();
    return None_instance;
  }
  function atomicfu$TraceBase() {}
  protoOf(atomicfu$TraceBase).atomicfu$Trace$append$1 = function (event) {};
  protoOf(atomicfu$TraceBase).atomicfu$Trace$append$2 = function (event1, event2) {};
  protoOf(atomicfu$TraceBase).atomicfu$Trace$append$3 = function (event1, event2, event3) {};
  protoOf(atomicfu$TraceBase).atomicfu$Trace$append$4 = function (event1, event2, event3, event4) {};
  protoOf(atomicfu$TraceBase).invoke_wlr0vx_k$ = function (event) {
    this.atomicfu$Trace$append$1(event());
  };
  function atomicfu$TraceFormat() {}
  protoOf(atomicfu$TraceFormat).atomicfu$TraceFormat$format = function (index, event) {
    return '' + index + ': ' + toString(event);
  };
  function AtomicRef(value) {
    this.kotlinx$atomicfu$value = value;
  }
  protoOf(AtomicRef).set_kotlinx$atomicfu$value_508e3y_k$ = function (_set____db54di) {
    this.kotlinx$atomicfu$value = _set____db54di;
  };
  protoOf(AtomicRef).get_kotlinx$atomicfu$value_vi2am5_k$ = function () {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicRef).getValue_fbnwi2_k$ = function (thisRef, property) {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicRef).setValue_ttauxt_k$ = function (thisRef, property, value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicRef).lazySet_57hg9d_k$ = function (value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicRef).atomicfu$compareAndSet = function (expect, update) {
    if (!(this.kotlinx$atomicfu$value === expect)) return false;
    this.kotlinx$atomicfu$value = update;
    return true;
  };
  protoOf(AtomicRef).atomicfu$getAndSet = function (value) {
    var oldValue = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = value;
    return oldValue;
  };
  protoOf(AtomicRef).toString = function () {
    return toString_0(this.kotlinx$atomicfu$value);
  };
  function atomic$ref$1(initial) {
    return atomic$ref$(initial, None_getInstance());
  }
  function AtomicBoolean(value) {
    this.kotlinx$atomicfu$value = value;
  }
  protoOf(AtomicBoolean).set_kotlinx$atomicfu$value_tm3k58_k$ = function (_set____db54di) {
    this.kotlinx$atomicfu$value = _set____db54di;
  };
  protoOf(AtomicBoolean).get_kotlinx$atomicfu$value_vi2am5_k$ = function () {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicBoolean).getValue_fbnwi2_k$ = function (thisRef, property) {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicBoolean).setValue_bb9j9z_k$ = function (thisRef, property, value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicBoolean).lazySet_8bd7if_k$ = function (value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicBoolean).atomicfu$compareAndSet = function (expect, update) {
    if (!(this.kotlinx$atomicfu$value === expect)) return false;
    this.kotlinx$atomicfu$value = update;
    return true;
  };
  protoOf(AtomicBoolean).atomicfu$getAndSet = function (value) {
    var oldValue = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = value;
    return oldValue;
  };
  protoOf(AtomicBoolean).toString = function () {
    return this.kotlinx$atomicfu$value.toString();
  };
  function atomic$boolean$1(initial) {
    return atomic$boolean$(initial, None_getInstance());
  }
  function AtomicInt(value) {
    this.kotlinx$atomicfu$value = value;
  }
  protoOf(AtomicInt).set_kotlinx$atomicfu$value_nm6d3_k$ = function (_set____db54di) {
    this.kotlinx$atomicfu$value = _set____db54di;
  };
  protoOf(AtomicInt).get_kotlinx$atomicfu$value_vi2am5_k$ = function () {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicInt).getValue_fbnwi2_k$ = function (thisRef, property) {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicInt).setValue_mm2ive_k$ = function (thisRef, property, value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicInt).lazySet_u7nu62_k$ = function (value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicInt).atomicfu$compareAndSet = function (expect, update) {
    if (!(this.kotlinx$atomicfu$value === expect)) return false;
    this.kotlinx$atomicfu$value = update;
    return true;
  };
  protoOf(AtomicInt).atomicfu$getAndSet = function (value) {
    var oldValue = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = value;
    return oldValue;
  };
  protoOf(AtomicInt).atomicfu$getAndIncrement = function () {
    var tmp1 = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = (tmp1 + 1) | 0;
    return tmp1;
  };
  protoOf(AtomicInt).atomicfu$getAndDecrement = function () {
    var tmp1 = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = (tmp1 - 1) | 0;
    return tmp1;
  };
  protoOf(AtomicInt).atomicfu$getAndAdd = function (delta) {
    var oldValue = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = (this.kotlinx$atomicfu$value + delta) | 0;
    return oldValue;
  };
  protoOf(AtomicInt).atomicfu$addAndGet = function (delta) {
    this.kotlinx$atomicfu$value = (this.kotlinx$atomicfu$value + delta) | 0;
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicInt).atomicfu$incrementAndGet = function () {
    this.kotlinx$atomicfu$value = (this.kotlinx$atomicfu$value + 1) | 0;
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicInt).atomicfu$decrementAndGet = function () {
    this.kotlinx$atomicfu$value = (this.kotlinx$atomicfu$value - 1) | 0;
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicInt).plusAssign_8mmvnl_k$ = function (delta) {
    this.atomicfu$getAndAdd(delta);
  };
  protoOf(AtomicInt).minusAssign_p980fd_k$ = function (delta) {
    this.atomicfu$getAndAdd(-delta | 0);
  };
  protoOf(AtomicInt).toString = function () {
    return this.kotlinx$atomicfu$value.toString();
  };
  function atomic$int$1(initial) {
    return atomic$int$(initial, None_getInstance());
  }
  function AtomicLong(value) {
    this.kotlinx$atomicfu$value = value;
  }
  protoOf(AtomicLong).set_kotlinx$atomicfu$value_22wj1v_k$ = function (_set____db54di) {
    this.kotlinx$atomicfu$value = _set____db54di;
  };
  protoOf(AtomicLong).get_kotlinx$atomicfu$value_vi2am5_k$ = function () {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicLong).getValue_fbnwi2_k$ = function (thisRef, property) {
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicLong).setValue_2h12xs_k$ = function (thisRef, property, value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicLong).lazySet_abm0s0_k$ = function (value) {
    this.kotlinx$atomicfu$value = value;
  };
  protoOf(AtomicLong).atomicfu$compareAndSet = function (expect, update) {
    if (!this.kotlinx$atomicfu$value.equals(expect)) return false;
    this.kotlinx$atomicfu$value = update;
    return true;
  };
  protoOf(AtomicLong).atomicfu$getAndSet = function (value) {
    var oldValue = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = value;
    return oldValue;
  };
  protoOf(AtomicLong).atomicfu$getAndIncrement$long = function () {
    var tmp1 = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = tmp1.inc_28ke_k$();
    return tmp1;
  };
  protoOf(AtomicLong).atomicfu$getAndDecrement$long = function () {
    var tmp1 = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = tmp1.dec_24n6_k$();
    return tmp1;
  };
  protoOf(AtomicLong).atomicfu$getAndAdd$long = function (delta) {
    var oldValue = this.kotlinx$atomicfu$value;
    this.kotlinx$atomicfu$value = this.kotlinx$atomicfu$value.plus_r93sks_k$(delta);
    return oldValue;
  };
  protoOf(AtomicLong).atomicfu$addAndGet$long = function (delta) {
    this.kotlinx$atomicfu$value = this.kotlinx$atomicfu$value.plus_r93sks_k$(delta);
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicLong).atomicfu$incrementAndGet$long = function () {
    this.kotlinx$atomicfu$value = this.kotlinx$atomicfu$value.inc_28ke_k$();
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicLong).atomicfu$decrementAndGet$long = function () {
    this.kotlinx$atomicfu$value = this.kotlinx$atomicfu$value.dec_24n6_k$();
    return this.kotlinx$atomicfu$value;
  };
  protoOf(AtomicLong).plusAssign_p5ji1h_k$ = function (delta) {
    this.atomicfu$getAndAdd$long(delta);
  };
  protoOf(AtomicLong).minusAssign_elja0x_k$ = function (delta) {
    this.atomicfu$getAndAdd$long(delta.unaryMinus_6uz0qp_k$());
  };
  protoOf(AtomicLong).toString = function () {
    return this.kotlinx$atomicfu$value.toString();
  };
  function atomic$long$1(initial) {
    return atomic$long$(initial, None_getInstance());
  }
  function atomic$ref$(initial, trace) {
    trace = trace === VOID ? None_getInstance() : trace;
    return new AtomicRef(initial);
  }
  function atomic$boolean$(initial, trace) {
    trace = trace === VOID ? None_getInstance() : trace;
    return new AtomicBoolean(initial);
  }
  function atomic$int$(initial, trace) {
    trace = trace === VOID ? None_getInstance() : trace;
    return new AtomicInt(initial);
  }
  function atomic$long$(initial, trace) {
    trace = trace === VOID ? None_getInstance() : trace;
    return new AtomicLong(initial);
  }
  function get_traceFormatDefault() {
    _init_properties_Trace_kt__r970dp();
    return traceFormatDefault;
  }
  var traceFormatDefault;
  var properties_initialized_Trace_kt_s8gvpx;
  function _init_properties_Trace_kt__r970dp() {
    if (!properties_initialized_Trace_kt_s8gvpx) {
      properties_initialized_Trace_kt_s8gvpx = true;
      traceFormatDefault = new atomicfu$TraceFormat();
    }
  }
  function get_atomicfu$reentrantLock() {
    _init_properties_Synchronized_kt__f4zdjg();
    return Lock;
  }
  var Lock;
  function ReentrantLock() {}
  protoOf(ReentrantLock).lock_fp5s9n_k$ = function () {};
  protoOf(ReentrantLock).tryLock_hapj0a_k$ = function () {
    return true;
  };
  protoOf(ReentrantLock).unlock_85w96c_k$ = function () {};
  function synchronized(lock, block) {
    _init_properties_Synchronized_kt__f4zdjg();
    return block();
  }
  var properties_initialized_Synchronized_kt_8bwsba;
  function _init_properties_Synchronized_kt__f4zdjg() {
    if (!properties_initialized_Synchronized_kt_8bwsba) {
      properties_initialized_Synchronized_kt_8bwsba = true;
      Lock = new ReentrantLock();
    }
  }
  //region block: post-declaration
  defineProp(
    protoOf(atomicfu$AtomicRefArray$ref),
    'atomicfu$size',
    protoOf(atomicfu$AtomicRefArray$ref).get_atomicfu$size_iufoqq_k$,
  );
  //endregion
  //region block: exports
  _.$_$ = _.$_$ || {};
  _.$_$.a = atomicfu$AtomicRefArray$ofNulls;
  _.$_$.b = atomic$boolean$1;
  _.$_$.c = atomic$long$1;
  _.$_$.d = atomic$ref$1;
  _.$_$.e = atomic$int$1;
  //endregion
  return _;
});

//# sourceMappingURL=kotlinx-atomicfu.js.map
