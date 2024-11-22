(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './kotlinx-coroutines-core.js', './kotlin-kotlin-stdlib.js', './ktor-ktor-utils.js'], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlinx-coroutines-core.js'),
      require('./kotlin-kotlin-stdlib.js'),
      require('./ktor-ktor-utils.js'),
    );
  else {
    if (typeof this['kotlinx-coroutines-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-events'. Its dependency 'kotlinx-coroutines-core' was not found. Please, check whether 'kotlinx-coroutines-core' is loaded prior to 'ktor-ktor-events'.",
      );
    }
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-events'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'ktor-ktor-events'.",
      );
    }
    if (typeof this['ktor-ktor-utils'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-events'. Its dependency 'ktor-ktor-utils' was not found. Please, check whether 'ktor-ktor-utils' is loaded prior to 'ktor-ktor-events'.",
      );
    }
    root['ktor-ktor-events'] = factory(
      typeof this['ktor-ktor-events'] === 'undefined' ? {} : this['ktor-ktor-events'],
      this['kotlinx-coroutines-core'],
      this['kotlin-kotlin-stdlib'],
      this['ktor-ktor-utils'],
    );
  }
})(this, function (_, kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core, kotlin_kotlin, kotlin_io_ktor_ktor_utils) {
  'use strict';
  //region block: imports
  var LinkedListNode = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.j;
  var protoOf = kotlin_kotlin.$_$.dc;
  var DisposableHandle = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.o;
  var classMeta = kotlin_kotlin.$_$.ta;
  var setMetadataFor = kotlin_kotlin.$_$.ec;
  var LinkedListHead = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.i;
  var CopyOnWriteHashMap = kotlin_io_ktor_ktor_utils.$_$.d;
  var equals = kotlin_kotlin.$_$.xa;
  var THROW_CCE = kotlin_kotlin.$_$.qg;
  var addSuppressed = kotlin_kotlin.$_$.dh;
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var VOID = kotlin_kotlin.$_$.f;
  //endregion
  //region block: pre-declaration
  setMetadataFor(HandlerRegistration, 'HandlerRegistration', classMeta, LinkedListNode, [
    LinkedListNode,
    DisposableHandle,
  ]);
  setMetadataFor(Events, 'Events', classMeta, VOID, VOID, Events);
  setMetadataFor(EventDefinition, 'EventDefinition', classMeta, VOID, VOID, EventDefinition);
  //endregion
  function _get_handlers__pkfn2a($this) {
    return $this.handlers_1;
  }
  function HandlerRegistration(handler) {
    LinkedListNode.call(this);
    this.handler_1 = handler;
  }
  protoOf(HandlerRegistration).get_handler_cq14kh_k$ = function () {
    return this.handler_1;
  };
  protoOf(HandlerRegistration).dispose_3nnxhr_k$ = function () {
    this.remove_fgfybg_k$();
  };
  function Events$subscribe$lambda(it) {
    return new LinkedListHead();
  }
  function Events() {
    this.handlers_1 = new CopyOnWriteHashMap();
  }
  protoOf(Events).subscribe_x6ph2e_k$ = function (definition, handler) {
    var registration = new HandlerRegistration(handler);
    this.handlers_1.computeIfAbsent_gq11cy_k$(definition, Events$subscribe$lambda).addLast_dyfyav_k$(registration);
    return registration;
  };
  protoOf(Events).unsubscribe_pdx53x_k$ = function (definition, handler) {
    var tmp0_safe_receiver = this.handlers_1.get_h31hzz_k$(definition);
    if (tmp0_safe_receiver == null) null;
    else {
      // Inline function 'kotlinx.coroutines.internal.LinkedListHead.forEach' call
      var cur = tmp0_safe_receiver.get__next_inmai1_k$();
      while (!equals(cur, tmp0_safe_receiver)) {
        if (cur instanceof HandlerRegistration) {
          // Inline function 'io.ktor.events.Events.unsubscribe.<anonymous>' call
          var it = cur;
          if (equals(it.handler_1, handler)) {
            it.remove_fgfybg_k$();
          }
        }
        cur = cur.get__next_inmai1_k$();
      }
    }
  };
  protoOf(Events).raise_3e7w7u_k$ = function (definition, value) {
    var exception = null;
    var tmp0_safe_receiver = this.handlers_1.get_h31hzz_k$(definition);
    if (tmp0_safe_receiver == null) null;
    else {
      // Inline function 'kotlinx.coroutines.internal.LinkedListHead.forEach' call
      var cur = tmp0_safe_receiver.get__next_inmai1_k$();
      while (!equals(cur, tmp0_safe_receiver)) {
        if (cur instanceof HandlerRegistration) {
          // Inline function 'io.ktor.events.Events.raise.<anonymous>' call
          var registration = cur;
          try {
            var tmp = registration.handler_1;
            (typeof tmp === 'function' ? tmp : THROW_CCE())(value);
          } catch ($p) {
            if ($p instanceof Error) {
              var e = $p;
              var tmp0_safe_receiver_0 = exception;
              var tmp_0;
              if (tmp0_safe_receiver_0 == null) {
                tmp_0 = null;
              } else {
                addSuppressed(tmp0_safe_receiver_0, e);
                tmp_0 = Unit_getInstance();
              }
              if (tmp_0 == null) {
                // Inline function 'kotlin.run' call
                // Inline function 'kotlin.contracts.contract' call
                exception = e;
              }
            } else {
              throw $p;
            }
          }
        }
        cur = cur.get__next_inmai1_k$();
      }
    }
    var tmp1_safe_receiver = exception;
    if (tmp1_safe_receiver == null) null;
    else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      throw tmp1_safe_receiver;
    }
  };
  function EventDefinition() {}
  //region block: exports
  _.$_$ = _.$_$ || {};
  _.$_$.a = EventDefinition;
  _.$_$.b = Events;
  //endregion
  return _;
});

//# sourceMappingURL=ktor-ktor-events.js.map
