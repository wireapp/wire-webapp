(function (root, factory) {
  if (typeof define === 'function' && define.amd)
    define(['exports', './kotlin-kotlin-stdlib.js', './kotlinx-atomicfu.js', './kotlinx-coroutines-core.js'], factory);
  else if (typeof exports === 'object')
    factory(
      module.exports,
      require('./kotlin-kotlin-stdlib.js'),
      require('./kotlinx-atomicfu.js'),
      require('./kotlinx-coroutines-core.js'),
    );
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-io'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'ktor-ktor-io'.",
      );
    }
    if (typeof this['kotlinx-atomicfu'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-io'. Its dependency 'kotlinx-atomicfu' was not found. Please, check whether 'kotlinx-atomicfu' is loaded prior to 'ktor-ktor-io'.",
      );
    }
    if (typeof this['kotlinx-coroutines-core'] === 'undefined') {
      throw new Error(
        "Error loading module 'ktor-ktor-io'. Its dependency 'kotlinx-coroutines-core' was not found. Please, check whether 'kotlinx-coroutines-core' is loaded prior to 'ktor-ktor-io'.",
      );
    }
    root['ktor-ktor-io'] = factory(
      typeof this['ktor-ktor-io'] === 'undefined' ? {} : this['ktor-ktor-io'],
      this['kotlin-kotlin-stdlib'],
      this['kotlinx-atomicfu'],
      this['kotlinx-coroutines-core'],
    );
  }
})(
  this,
  function (
    _,
    kotlin_kotlin,
    kotlin_org_jetbrains_kotlinx_atomicfu,
    kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core,
  ) {
    'use strict';
    //region block: imports
    var imul = Math.imul;
    var protoOf = kotlin_kotlin.$_$.dc;
    var interfaceMeta = kotlin_kotlin.$_$.gb;
    var setMetadataFor = kotlin_kotlin.$_$.ec;
    var VOID = kotlin_kotlin.$_$.f;
    var CoroutineImpl = kotlin_kotlin.$_$.ea;
    var get_COROUTINE_SUSPENDED = kotlin_kotlin.$_$.p9;
    var Unit_getInstance = kotlin_kotlin.$_$.k5;
    var classMeta = kotlin_kotlin.$_$.ta;
    var ensureNotNull = kotlin_kotlin.$_$.hh;
    var toString = kotlin_kotlin.$_$.ic;
    var IllegalArgumentException_init_$Create$ = kotlin_kotlin.$_$.r1;
    var toLong = kotlin_kotlin.$_$.gc;
    var IllegalStateException_init_$Create$ = kotlin_kotlin.$_$.w1;
    var THROW_CCE = kotlin_kotlin.$_$.qg;
    var isInterface = kotlin_kotlin.$_$.pb;
    var Long = kotlin_kotlin.$_$.kg;
    var coerceAtMost = kotlin_kotlin.$_$.mc;
    var StringBuilder_init_$Create$ = kotlin_kotlin.$_$.f1;
    var atomic$ref$1 = kotlin_org_jetbrains_kotlinx_atomicfu.$_$.d;
    var atomic$long$1 = kotlin_org_jetbrains_kotlinx_atomicfu.$_$.c;
    var atomic$int$1 = kotlin_org_jetbrains_kotlinx_atomicfu.$_$.e;
    var CancellationException_init_$Create$ = kotlin_kotlin.$_$.a1;
    var KMutableProperty1 = kotlin_kotlin.$_$.uc;
    var getPropertyCallableRef = kotlin_kotlin.$_$.db;
    var SuspendFunction1 = kotlin_kotlin.$_$.fa;
    var Companion_getInstance = kotlin_kotlin.$_$.e5;
    var CancellationException = kotlin_kotlin.$_$.o9;
    var CancellationException_init_$Init$ = kotlin_kotlin.$_$.z;
    var captureStack = kotlin_kotlin.$_$.na;
    var Job = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.q;
    var EmptyCoroutineContext_getInstance = kotlin_kotlin.$_$.r4;
    var CoroutineScope = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.n;
    var cancel$default = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.b;
    var cancel$default_0 = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.c;
    var invokeOnCompletion$default = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.d;
    var Key_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.e;
    var launch = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.x;
    var Key_getInstance_0 = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.h;
    var Dispatchers_getInstance = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.f;
    var equals = kotlin_kotlin.$_$.xa;
    var toByte = kotlin_kotlin.$_$.fc;
    var toShort = kotlin_kotlin.$_$.hc;
    var IntCompanionObject_getInstance = kotlin_kotlin.$_$.w4;
    var StringBuilder_init_$Create$_0 = kotlin_kotlin.$_$.e1;
    var charSequenceLength = kotlin_kotlin.$_$.ra;
    var objectMeta = kotlin_kotlin.$_$.cc;
    var hashCode = kotlin_kotlin.$_$.fb;
    var toString_0 = kotlin_kotlin.$_$.kf;
    var objectCreate = kotlin_kotlin.$_$.bc;
    var Exception = kotlin_kotlin.$_$.gg;
    var Exception_init_$Init$ = kotlin_kotlin.$_$.l1;
    var numberToLong = kotlin_kotlin.$_$.ac;
    var numberToChar = kotlin_kotlin.$_$.yb;
    var charSequenceGet = kotlin_kotlin.$_$.qa;
    var UnsupportedOperationException_init_$Create$ = kotlin_kotlin.$_$.l2;
    var Appendable = kotlin_kotlin.$_$.hd;
    var coerceAtLeast = kotlin_kotlin.$_$.lc;
    var coerceAtMost_0 = kotlin_kotlin.$_$.nc;
    var Char__toInt_impl_vasixd = kotlin_kotlin.$_$.z2;
    var toRawBits = kotlin_kotlin.$_$.uh;
    var toRawBits_0 = kotlin_kotlin.$_$.vh;
    var encodeToByteArray = kotlin_kotlin.$_$.od;
    var _UShort___get_data__impl__g0245 = kotlin_kotlin.$_$.i4;
    var IndexOutOfBoundsException_init_$Create$ = kotlin_kotlin.$_$.b2;
    var CharSequence = kotlin_kotlin.$_$.yf;
    var UnsupportedOperationException_init_$Create$_0 = kotlin_kotlin.$_$.m2;
    var _UShort___init__impl__jigrne = kotlin_kotlin.$_$.h4;
    var Char = kotlin_kotlin.$_$.zf;
    var Companion_getInstance_0 = kotlin_kotlin.$_$.j5;
    var isLowSurrogate = kotlin_kotlin.$_$.zd;
    var isHighSurrogate = kotlin_kotlin.$_$.xd;
    var _Char___init__impl__6a9atx = kotlin_kotlin.$_$.t2;
    var Job_0 = kotlin_org_jetbrains_kotlinx_kotlinx_coroutines_core.$_$.p;
    var lazy = kotlin_kotlin.$_$.nh;
    var KProperty1 = kotlin_kotlin.$_$.wc;
    var replace = kotlin_kotlin.$_$.ne;
    var getStringHashCode = kotlin_kotlin.$_$.eb;
    var extendThrowable = kotlin_kotlin.$_$.ya;
    var charSequenceSubSequence = kotlin_kotlin.$_$.sa;
    var THROW_IAE = kotlin_kotlin.$_$.rg;
    var Enum = kotlin_kotlin.$_$.eg;
    var IndexOutOfBoundsException_init_$Create$_0 = kotlin_kotlin.$_$.z1;
    var Exception_init_$Init$_0 = kotlin_kotlin.$_$.m1;
    var isCharSequence = kotlin_kotlin.$_$.lb;
    var trim = kotlin_kotlin.$_$.tf;
    var decodeToString = kotlin_kotlin.$_$.nd;
    var setOf = kotlin_kotlin.$_$.w8;
    var fillArrayVal = kotlin_kotlin.$_$.za;
    //endregion
    //region block: pre-declaration
    function readRemaining$default(limit, $completion, $super) {
      limit = limit === VOID ? Companion_getInstance().get_MAX_VALUE_54a9lf_k$() : limit;
      return $super === VOID
        ? this.readRemaining_nblam0_k$(limit, $completion)
        : $super.readRemaining_nblam0_k$.call(this, limit, $completion);
    }
    function peekTo$default(destination, destinationOffset, offset, min, max, $completion, $super) {
      offset = offset === VOID ? new Long(0, 0) : offset;
      min = min === VOID ? new Long(1, 0) : min;
      max = max === VOID ? Companion_getInstance().get_MAX_VALUE_54a9lf_k$() : max;
      return $super === VOID
        ? this.peekTo_ypcho2_k$(destination, destinationOffset, offset, min, max, $completion)
        : $super.peekTo_ypcho2_k$.call(this, destination, destinationOffset, offset, min, max, $completion);
    }
    setMetadataFor(ByteReadChannel_1, 'ByteReadChannel', interfaceMeta, VOID, VOID, VOID, VOID, VOID, [3, 1, 2, 0, 5]);
    setMetadataFor(ByteWriteChannel, 'ByteWriteChannel', interfaceMeta, VOID, VOID, VOID, VOID, VOID, [3, 1, 0]);
    setMetadataFor(
      ByteChannel,
      'ByteChannel',
      interfaceMeta,
      VOID,
      [ByteReadChannel_1, ByteWriteChannel],
      VOID,
      VOID,
      VOID,
      [3, 1, 2, 0, 5],
    );
    setMetadataFor($tryAwaitCOROUTINE$49, '$tryAwaitCOROUTINE$49', classMeta, CoroutineImpl);
    setMetadataFor(WriterSession, 'WriterSession', interfaceMeta);
    setMetadataFor(
      WriterSuspendSession,
      'WriterSuspendSession',
      interfaceMeta,
      VOID,
      [WriterSession],
      VOID,
      VOID,
      VOID,
      [1],
    );
    setMetadataFor(
      ByteChannelSequentialBase$beginWriteSession$1,
      VOID,
      classMeta,
      VOID,
      [WriterSuspendSession],
      VOID,
      VOID,
      VOID,
      [1],
    );
    setMetadataFor(
      ByteChannelSequentialBase$readUTF8LineTo$slambda,
      'ByteChannelSequentialBase$readUTF8LineTo$slambda',
      classMeta,
      CoroutineImpl,
      [CoroutineImpl],
      VOID,
      VOID,
      VOID,
      [1],
    );
    setMetadataFor(
      ByteChannelSequentialBase$peekTo$slambda,
      'ByteChannelSequentialBase$peekTo$slambda',
      classMeta,
      CoroutineImpl,
      [CoroutineImpl],
      VOID,
      VOID,
      VOID,
      [1],
    );
    setMetadataFor(
      $awaitAtLeastNBytesAvailableForWriteCOROUTINE$0,
      '$awaitAtLeastNBytesAvailableForWriteCOROUTINE$0',
      classMeta,
      CoroutineImpl,
    );
    setMetadataFor(
      $awaitAtLeastNBytesAvailableForReadCOROUTINE$1,
      '$awaitAtLeastNBytesAvailableForReadCOROUTINE$1',
      classMeta,
      CoroutineImpl,
    );
    setMetadataFor($writeByteCOROUTINE$2, '$writeByteCOROUTINE$2', classMeta, CoroutineImpl);
    setMetadataFor($writeShortCOROUTINE$3, '$writeShortCOROUTINE$3', classMeta, CoroutineImpl);
    setMetadataFor($writeIntCOROUTINE$4, '$writeIntCOROUTINE$4', classMeta, CoroutineImpl);
    setMetadataFor($writeLongCOROUTINE$5, '$writeLongCOROUTINE$5', classMeta, CoroutineImpl);
    setMetadataFor($writeFloatCOROUTINE$6, '$writeFloatCOROUTINE$6', classMeta, CoroutineImpl);
    setMetadataFor($writeDoubleCOROUTINE$7, '$writeDoubleCOROUTINE$7', classMeta, CoroutineImpl);
    setMetadataFor($writePacketCOROUTINE$8, '$writePacketCOROUTINE$8', classMeta, CoroutineImpl);
    setMetadataFor($writeFullyCOROUTINE$9, '$writeFullyCOROUTINE$9', classMeta, CoroutineImpl);
    setMetadataFor($writeFullyCOROUTINE$10, '$writeFullyCOROUTINE$10', classMeta, CoroutineImpl);
    setMetadataFor($writeFullyCOROUTINE$11, '$writeFullyCOROUTINE$11', classMeta, CoroutineImpl);
    setMetadataFor($writeAvailableCOROUTINE$12, '$writeAvailableCOROUTINE$12', classMeta, CoroutineImpl);
    setMetadataFor($writeAvailableCOROUTINE$13, '$writeAvailableCOROUTINE$13', classMeta, CoroutineImpl);
    setMetadataFor($readByteCOROUTINE$14, '$readByteCOROUTINE$14', classMeta, CoroutineImpl);
    setMetadataFor($readByteSlowCOROUTINE$15, '$readByteSlowCOROUTINE$15', classMeta, CoroutineImpl);
    setMetadataFor($readShortCOROUTINE$16, '$readShortCOROUTINE$16', classMeta, CoroutineImpl);
    setMetadataFor($readShortSlowCOROUTINE$17, '$readShortSlowCOROUTINE$17', classMeta, CoroutineImpl);
    setMetadataFor($readIntCOROUTINE$18, '$readIntCOROUTINE$18', classMeta, CoroutineImpl);
    setMetadataFor($readIntSlowCOROUTINE$19, '$readIntSlowCOROUTINE$19', classMeta, CoroutineImpl);
    setMetadataFor($readLongCOROUTINE$20, '$readLongCOROUTINE$20', classMeta, CoroutineImpl);
    setMetadataFor($readLongSlowCOROUTINE$21, '$readLongSlowCOROUTINE$21', classMeta, CoroutineImpl);
    setMetadataFor($readFloatCOROUTINE$22, '$readFloatCOROUTINE$22', classMeta, CoroutineImpl);
    setMetadataFor($readFloatSlowCOROUTINE$23, '$readFloatSlowCOROUTINE$23', classMeta, CoroutineImpl);
    setMetadataFor($readDoubleCOROUTINE$24, '$readDoubleCOROUTINE$24', classMeta, CoroutineImpl);
    setMetadataFor($readDoubleSlowCOROUTINE$25, '$readDoubleSlowCOROUTINE$25', classMeta, CoroutineImpl);
    setMetadataFor($readRemainingCOROUTINE$26, '$readRemainingCOROUTINE$26', classMeta, CoroutineImpl);
    setMetadataFor($readRemainingSuspendCOROUTINE$27, '$readRemainingSuspendCOROUTINE$27', classMeta, CoroutineImpl);
    setMetadataFor($readPacketCOROUTINE$28, '$readPacketCOROUTINE$28', classMeta, CoroutineImpl);
    setMetadataFor($readPacketSuspendCOROUTINE$29, '$readPacketSuspendCOROUTINE$29', classMeta, CoroutineImpl);
    setMetadataFor($readAvailableCOROUTINE$30, '$readAvailableCOROUTINE$30', classMeta, CoroutineImpl);
    setMetadataFor($readFullyCOROUTINE$31, '$readFullyCOROUTINE$31', classMeta, CoroutineImpl);
    setMetadataFor($readFullySuspendCOROUTINE$32, '$readFullySuspendCOROUTINE$32', classMeta, CoroutineImpl);
    setMetadataFor($readAvailableCOROUTINE$33, '$readAvailableCOROUTINE$33', classMeta, CoroutineImpl);
    setMetadataFor($readFullyCOROUTINE$34, '$readFullyCOROUTINE$34', classMeta, CoroutineImpl);
    setMetadataFor($readFullySuspendCOROUTINE$35, '$readFullySuspendCOROUTINE$35', classMeta, CoroutineImpl);
    setMetadataFor($readBooleanCOROUTINE$36, '$readBooleanCOROUTINE$36', classMeta, CoroutineImpl);
    setMetadataFor($readBooleanSlowCOROUTINE$37, '$readBooleanSlowCOROUTINE$37', classMeta, CoroutineImpl);
    setMetadataFor($awaitInternalAtLeast1COROUTINE$38, '$awaitInternalAtLeast1COROUTINE$38', classMeta, CoroutineImpl);
    setMetadataFor($awaitSuspendCOROUTINE$39, '$awaitSuspendCOROUTINE$39', classMeta, CoroutineImpl);
    setMetadataFor($discardCOROUTINE$40, '$discardCOROUTINE$40', classMeta, CoroutineImpl);
    setMetadataFor($discardSuspendCOROUTINE$41, '$discardSuspendCOROUTINE$41', classMeta, CoroutineImpl);
    setMetadataFor(
      $readSuspendableSessionCOROUTINE$42,
      '$readSuspendableSessionCOROUTINE$42',
      classMeta,
      CoroutineImpl,
    );
    setMetadataFor($readUTF8LineCOROUTINE$43, '$readUTF8LineCOROUTINE$43', classMeta, CoroutineImpl);
    setMetadataFor($writeAvailableSuspendCOROUTINE$44, '$writeAvailableSuspendCOROUTINE$44', classMeta, CoroutineImpl);
    setMetadataFor($writeAvailableSuspendCOROUTINE$45, '$writeAvailableSuspendCOROUTINE$45', classMeta, CoroutineImpl);
    setMetadataFor($awaitFreeSpaceCOROUTINE$46, '$awaitFreeSpaceCOROUTINE$46', classMeta, CoroutineImpl);
    setMetadataFor($awaitContentCOROUTINE$47, '$awaitContentCOROUTINE$47', classMeta, CoroutineImpl);
    setMetadataFor($peekToCOROUTINE$48, '$peekToCOROUTINE$48', classMeta, CoroutineImpl);
    function request$default(atLeast, $super) {
      atLeast = atLeast === VOID ? 1 : atLeast;
      return $super === VOID ? this.request_oh1f6f_k$(atLeast) : $super.request_oh1f6f_k$.call(this, atLeast);
    }
    setMetadataFor(ReadSession, 'ReadSession', interfaceMeta);
    function await$default(atLeast, $completion, $super) {
      atLeast = atLeast === VOID ? 1 : atLeast;
      return $super === VOID
        ? this.await_wm3xku_k$(atLeast, $completion)
        : $super.await_wm3xku_k$.call(this, atLeast, $completion);
    }
    setMetadataFor(
      SuspendableReadSession,
      'SuspendableReadSession',
      interfaceMeta,
      VOID,
      [ReadSession],
      VOID,
      VOID,
      VOID,
      [1],
    );
    setMetadataFor(HasReadSession, 'HasReadSession', interfaceMeta);
    setMetadataFor(HasWriteSession, 'HasWriteSession', interfaceMeta);
    setMetadataFor(
      ByteChannelSequentialBase,
      'ByteChannelSequentialBase',
      classMeta,
      VOID,
      [ByteChannel, ByteReadChannel_1, ByteWriteChannel, SuspendableReadSession, HasReadSession, HasWriteSession],
      VOID,
      VOID,
      VOID,
      [1, 3, 0, 2, 5],
    );
    setMetadataFor($copyAndCloseCOROUTINE$50, '$copyAndCloseCOROUTINE$50', classMeta, CoroutineImpl);
    setMetadataFor(ClosedWriteChannelException, 'ClosedWriteChannelException', classMeta, CancellationException);
    setMetadataFor(CloseElement, 'CloseElement', classMeta);
    setMetadataFor(WriterJob, 'WriterJob', interfaceMeta, VOID, [Job], VOID, VOID, VOID, [0]);
    setMetadataFor(WriterScope, 'WriterScope', interfaceMeta, VOID, [CoroutineScope]);
    setMetadataFor(ReaderJob, 'ReaderJob', interfaceMeta, VOID, [Job], VOID, VOID, VOID, [0]);
    setMetadataFor(ChannelJob, 'ChannelJob', classMeta, VOID, [ReaderJob, WriterJob, Job], VOID, VOID, VOID, [0]);
    setMetadataFor(ReaderScope, 'ReaderScope', interfaceMeta, VOID, [CoroutineScope]);
    setMetadataFor(ChannelScope, 'ChannelScope', classMeta, VOID, [ReaderScope, WriterScope, CoroutineScope]);
    setMetadataFor(
      launchChannel$slambda,
      'launchChannel$slambda',
      classMeta,
      CoroutineImpl,
      [CoroutineImpl],
      VOID,
      VOID,
      VOID,
      [1],
    );
    setMetadataFor(Allocator, 'Allocator', interfaceMeta);
    setMetadataFor(MalformedInputException, 'MalformedInputException', classMeta, Error);
    setMetadataFor(TooLongLineException, 'TooLongLineException', classMeta, MalformedInputException);
    setMetadataFor(Companion, 'Companion', objectMeta);
    setMetadataFor(Buffer, 'Buffer', classMeta);
    setMetadataFor(
      InsufficientSpaceException,
      'InsufficientSpaceException',
      classMeta,
      Exception,
      VOID,
      InsufficientSpaceException,
    );
    setMetadataFor(Closeable, 'Closeable', interfaceMeta);
    function close() {
      this.dispose_3nnxhr_k$();
    }
    setMetadataFor(ObjectPool, 'ObjectPool', interfaceMeta, VOID, [Closeable]);
    setMetadataFor(DefaultPool, 'DefaultPool', classMeta, VOID, [ObjectPool]);
    setMetadataFor(DefaultBufferPool, 'DefaultBufferPool', classMeta, DefaultPool, VOID, DefaultBufferPool);
    setMetadataFor(Output, 'Output', classMeta, VOID, [Appendable, Closeable]);
    setMetadataFor(BytePacketBuilder, 'BytePacketBuilder', classMeta, Output, VOID, BytePacketBuilder);
    setMetadataFor(Companion_0, 'Companion', objectMeta);
    setMetadataFor(Input, 'Input', classMeta, VOID, [Closeable]);
    setMetadataFor(ByteReadPacket, 'ByteReadPacket', classMeta, Input);
    setMetadataFor(Companion_1, 'Companion', objectMeta);
    setMetadataFor(Input$readAvailableCharacters$out$1, VOID, classMeta, VOID, [Appendable]);
    setMetadataFor(CharArraySequence, 'CharArraySequence', classMeta, VOID, [CharSequence]);
    setMetadataFor(ChunkBuffer$Companion$EmptyPool$1, VOID, classMeta, VOID, [ObjectPool]);
    setMetadataFor(NoPoolImpl, 'NoPoolImpl', classMeta, VOID, [ObjectPool]);
    setMetadataFor(ChunkBuffer$Companion$NoPool$1, VOID, classMeta, NoPoolImpl);
    setMetadataFor(ChunkBuffer$Companion$NoPoolManuallyManaged$1, VOID, classMeta, NoPoolImpl);
    setMetadataFor(Companion_2, 'Companion', objectMeta);
    setMetadataFor(ChunkBuffer, 'ChunkBuffer', classMeta, Buffer);
    setMetadataFor(EncodeResult, 'EncodeResult', classMeta);
    setMetadataFor(MalformedUTF8InputException, 'MalformedUTF8InputException', classMeta, Exception);
    setMetadataFor(
      $decodeUTF8LineLoopSuspendCOROUTINE$51,
      '$decodeUTF8LineLoopSuspendCOROUTINE$51',
      classMeta,
      CoroutineImpl,
    );
    setMetadataFor($sleepCOROUTINE$52, '$sleepCOROUTINE$52', classMeta, CoroutineImpl);
    setMetadataFor($trySuspendCOROUTINE$53, '$trySuspendCOROUTINE$53', classMeta, CoroutineImpl);
    setMetadataFor(AwaitingSlot, 'AwaitingSlot', classMeta, VOID, VOID, AwaitingSlot, VOID, VOID, [1]);
    setMetadataFor($copyToSequentialImplCOROUTINE$54, '$copyToSequentialImplCOROUTINE$54', classMeta, CoroutineImpl);
    setMetadataFor($copyToTailCOROUTINE$55, '$copyToTailCOROUTINE$55', classMeta, CoroutineImpl);
    setMetadataFor(ByteArrayPool$1, VOID, classMeta, DefaultPool);
    setMetadataFor($readAvailableCOROUTINE$56, '$readAvailableCOROUTINE$56', classMeta, CoroutineImpl);
    setMetadataFor($readAvailableSuspendCOROUTINE$57, '$readAvailableSuspendCOROUTINE$57', classMeta, CoroutineImpl);
    setMetadataFor($readFullySuspendCOROUTINE$58, '$readFullySuspendCOROUTINE$58', classMeta, CoroutineImpl);
    setMetadataFor(
      ByteChannelJS,
      'ByteChannelJS',
      classMeta,
      ByteChannelSequentialBase,
      VOID,
      VOID,
      VOID,
      VOID,
      [3, 1, 0, 2, 5],
    );
    setMetadataFor(Companion_3, 'Companion', objectMeta);
    setMetadataFor(DefaultAllocator, 'DefaultAllocator', objectMeta, VOID, [Allocator]);
    setMetadataFor(Companion_4, 'Companion', objectMeta);
    setMetadataFor(Memory, 'Memory', classMeta);
    setMetadataFor(Companion_5, 'Companion', objectMeta);
    setMetadataFor(Charset, 'Charset', classMeta);
    setMetadataFor(Charsets, 'Charsets', objectMeta);
    setMetadataFor(CharsetDecoder, 'CharsetDecoder', classMeta);
    setMetadataFor(CharsetEncoder, 'CharsetEncoder', classMeta);
    setMetadataFor(CharsetImpl, 'CharsetImpl', classMeta, Charset);
    setMetadataFor(CharsetEncoderImpl, 'CharsetEncoderImpl', classMeta, CharsetEncoder);
    setMetadataFor(CharsetDecoderImpl, 'CharsetDecoderImpl', classMeta, CharsetDecoder);
    setMetadataFor(DecodeBufferResult, 'DecodeBufferResult', classMeta);
    setMetadataFor(Companion_6, 'Companion', objectMeta);
    setMetadataFor(ByteOrder, 'ByteOrder', classMeta, Enum);
    setMetadataFor(IOException, 'IOException', classMeta, Exception);
    setMetadataFor(EOFException, 'EOFException', classMeta, IOException);
    setMetadataFor(Decoder, 'Decoder', interfaceMeta);
    setMetadataFor(toKtor$1, VOID, classMeta, VOID, [Decoder]);
    setMetadataFor(TextDecoderFallback, 'TextDecoderFallback', classMeta, VOID, [Decoder]);
    //endregion
    function ByteChannel() {}
    function ByteReadChannel(content) {
      return ByteReadChannel_0(content, 0, content.length);
    }
    function $tryAwaitCOROUTINE$49(_this__u8e3s4, n, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.n_1 = n;
    }
    protoOf($tryAwaitCOROUTINE$49).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.this$0__1.get_availableForWrite_22rgeu_k$() < this.n_1) {
                this.set_state_rjd8d0_k$(1);
                suspendResult = this._this__u8e3s4__1.this$0__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(
                  this.n_1,
                  this,
                );
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return Unit_getInstance();
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function _get__lastReadView__ij231d($this) {
      return $this._lastReadView_1;
    }
    function _get__totalBytesRead__ypqfud($this) {
      return $this._totalBytesRead_1;
    }
    function _get__totalBytesWritten__yty2ze($this) {
      return $this._totalBytesWritten_1;
    }
    function _get__availableForRead__1rfsys($this) {
      return $this._availableForRead_1;
    }
    function _get_channelSize__ptruy5($this) {
      return $this.channelSize_1;
    }
    function _get__closed__hglk9y($this) {
      return $this._closed_1;
    }
    function _get_isCancelled__nhbn6y($this) {
      var tmp0_safe_receiver = $this._closed_1.get_kotlinx$atomicfu$value_vi2am5_k$();
      return !((tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_cause_iplhs0_k$()) == null);
    }
    function _set_lastReadAvailable__98ukjs($this, _set____db54di) {
      var this_0 = $this.lastReadAvailable$delegate_1;
      lastReadAvailable$factory();
      this_0.set_kotlinx$atomicfu$value_nm6d3_k$(_set____db54di);
      return Unit_getInstance();
    }
    function _get_lastReadAvailable__cgybqk($this) {
      // Inline function 'kotlinx.atomicfu.AtomicInt.getValue' call
      var this_0 = $this.lastReadAvailable$delegate_1;
      lastReadAvailable$factory_0();
      return this_0.get_kotlinx$atomicfu$value_vi2am5_k$();
    }
    function _set_lastReadView__2y3peu($this, _set____db54di) {
      var this_0 = $this.lastReadView$delegate_1;
      lastReadView$factory();
      this_0.set_kotlinx$atomicfu$value_508e3y_k$(_set____db54di);
      return Unit_getInstance();
    }
    function _get_lastReadView__ihufyy($this) {
      // Inline function 'kotlinx.atomicfu.AtomicRef.getValue' call
      var this_0 = $this.lastReadView$delegate_1;
      lastReadView$factory_0();
      return this_0.get_kotlinx$atomicfu$value_vi2am5_k$();
    }
    function _get_slot__ddq6fh($this) {
      return $this.slot_1;
    }
    function _get_flushMutex__shnjf4($this) {
      return $this.flushMutex_1;
    }
    function _get_flushBuffer__b837ot($this) {
      return $this.flushBuffer_1;
    }
    function flushImpl($this) {
      if ($this.writable_1.get_isEmpty_zauvru_k$()) {
        $this.slot_1.resume_2o15jx_k$();
        return false;
      }
      flushWrittenBytes($this);
      $this.slot_1.resume_2o15jx_k$();
      return true;
    }
    function flushWrittenBytes($this) {
      // Inline function 'kotlinx.atomicfu.locks.synchronized' call
      $this.flushMutex_1;
      // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.flushWrittenBytes.<anonymous>' call
      var size = $this.writable_1.get_size_woubt6_k$();
      var buffer = ensureNotNull($this.writable_1.stealAll_nensgi_k$());
      $this.flushBuffer_1.writeChunkBuffer_f0a6fc_k$(buffer);
      $this._availableForRead_1.atomicfu$addAndGet(size);
    }
    function ensureNotClosed($this) {
      if ($this.get_closed_byjrzp_k$()) {
        var tmp0_elvis_lhs = $this.get_closedCause_o1qcj8_k$();
        throw tmp0_elvis_lhs == null
          ? new ClosedWriteChannelException('Channel ' + $this + ' is already closed')
          : tmp0_elvis_lhs;
      }
    }
    function ensureNotFailed($this) {
      var tmp0_safe_receiver = $this.get_closedCause_o1qcj8_k$();
      if (tmp0_safe_receiver == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        throw tmp0_safe_receiver;
      }
    }
    function ensureNotFailed_0($this, closeable) {
      var tmp0_safe_receiver = $this.get_closedCause_o1qcj8_k$();
      if (tmp0_safe_receiver == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        closeable.release_wu5yyf_k$();
        throw tmp0_safe_receiver;
      }
    }
    function checkClosed($this, remaining, closeable) {
      var tmp0_safe_receiver = $this.get_closedCause_o1qcj8_k$();
      if (tmp0_safe_receiver == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        if (closeable == null) null;
        else {
          closeable.close_yn9xrc_k$();
        }
        throw tmp0_safe_receiver;
      }
      if ($this.get_closed_byjrzp_k$() ? $this.get_availableForRead_tq0sox_k$() < remaining : false) {
        if (closeable == null) null;
        else {
          closeable.close_yn9xrc_k$();
        }
        throw new EOFException('' + remaining + ' bytes required but EOF reached');
      }
    }
    function checkClosed$default($this, remaining, closeable, $super) {
      closeable = closeable === VOID ? null : closeable;
      return checkClosed($this, remaining, closeable);
    }
    function readByteSlow($this, $completion) {
      var tmp = new $readByteSlowCOROUTINE$15($this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readShortSlow($this, $completion) {
      var tmp = new $readShortSlowCOROUTINE$17($this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readIntSlow($this, $completion) {
      var tmp = new $readIntSlowCOROUTINE$19($this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readLongSlow($this, $completion) {
      var tmp = new $readLongSlowCOROUTINE$21($this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readFloatSlow($this, $completion) {
      var tmp = new $readFloatSlowCOROUTINE$23($this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readDoubleSlow($this, $completion) {
      var tmp = new $readDoubleSlowCOROUTINE$25($this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readRemainingSuspend($this, builder, limit, $completion) {
      var tmp = new $readRemainingSuspendCOROUTINE$27($this, builder, limit, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readPacketSuspend($this, builder, size, $completion) {
      var tmp = new $readPacketSuspendCOROUTINE$29($this, builder, size, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readFully($this, dst, n, $completion) {
      var tmp = new $readFullyCOROUTINE$31($this, dst, n, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readFullySuspend($this, dst, n, $completion) {
      var tmp = new $readFullySuspendCOROUTINE$32($this, dst, n, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readFullySuspend_0($this, dst, offset, length, $completion) {
      var tmp = new $readFullySuspendCOROUTINE$35($this, dst, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readBooleanSlow($this, $completion) {
      var tmp = new $readBooleanSlowCOROUTINE$37($this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function completeReading($this) {
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var this_0 = _get_lastReadView__ihufyy($this);
      var remaining = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
      var delta = (_get_lastReadAvailable__cgybqk($this) - remaining) | 0;
      if (!(_get_lastReadView__ihufyy($this) === Companion_getInstance_1().get_Empty_i9b85g_k$())) {
        completeReadHead($this.readable_1, _get_lastReadView__ihufyy($this));
      }
      if (delta > 0) {
        $this.afterRead_biie6i_k$(delta);
      }
      _set_lastReadAvailable__98ukjs($this, 0);
      _set_lastReadView__2y3peu($this, Companion_getInstance_4().get_Empty_i9b85g_k$());
    }
    function requestNextView($this, atLeast) {
      // Inline function 'io.ktor.utils.io.core.isEmpty' call
      if ($this.readable_1.get_endOfInput_skegkh_k$()) {
        $this.prepareFlushedBytes_jiu201_k$();
      }
      var view = $this.readable_1.prepareReadHead_dk94or_k$(atLeast);
      if (view == null) {
        _set_lastReadView__2y3peu($this, Companion_getInstance_4().get_Empty_i9b85g_k$());
        _set_lastReadAvailable__98ukjs($this, 0);
      } else {
        _set_lastReadView__2y3peu($this, view);
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var tmp$ret$1 = (view.get_writePosition_jdt81t_k$() - view.get_readPosition_70qxnc_k$()) | 0;
        _set_lastReadAvailable__98ukjs($this, tmp$ret$1);
      }
      return view;
    }
    function discardSuspend($this, max, discarded0, $completion) {
      var tmp = new $discardSuspendCOROUTINE$41($this, max, discarded0, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function writeAvailableSuspend($this, src, $completion) {
      var tmp = new $writeAvailableSuspendCOROUTINE$44($this, src, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function writeAvailableSuspend_0($this, src, offset, length, $completion) {
      var tmp = new $writeAvailableSuspendCOROUTINE$45($this, src, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function addBytesRead($this, count) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(count >= 0)) {
        // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.addBytesRead.<anonymous>' call
        var message = "Can't read negative amount of bytes: " + count;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlinx.atomicfu.AtomicInt.minusAssign' call
      $this.channelSize_1.atomicfu$getAndAdd(-count | 0);
      $this._totalBytesRead_1.atomicfu$addAndGet$long(toLong(count));
      // Inline function 'kotlinx.atomicfu.AtomicInt.minusAssign' call
      $this._availableForRead_1.atomicfu$getAndAdd(-count | 0);
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!($this.channelSize_1.get_kotlinx$atomicfu$value_vi2am5_k$() >= 0)) {
        // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.addBytesRead.<anonymous>' call
        var message_0 =
          'Readable bytes count is negative: ' + $this.get_availableForRead_tq0sox_k$() + ', ' + count + ' in ' + $this;
        throw IllegalStateException_init_$Create$(toString(message_0));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!($this.get_availableForRead_tq0sox_k$() >= 0)) {
        // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.addBytesRead.<anonymous>' call
        var message_1 =
          'Readable bytes count is negative: ' + $this.get_availableForRead_tq0sox_k$() + ', ' + count + ' in ' + $this;
        throw IllegalStateException_init_$Create$(toString(message_1));
      }
    }
    function addBytesWritten($this, count) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(count >= 0)) {
        // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.addBytesWritten.<anonymous>' call
        var message = "Can't write negative amount of bytes: " + count;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlinx.atomicfu.AtomicInt.plusAssign' call
      $this.channelSize_1.atomicfu$getAndAdd(count);
      $this._totalBytesWritten_1.atomicfu$addAndGet$long(toLong(count));
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!($this.channelSize_1.get_kotlinx$atomicfu$value_vi2am5_k$() >= 0)) {
        // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.addBytesWritten.<anonymous>' call
        var message_0 =
          'Readable bytes count is negative: ' +
          $this.channelSize_1.get_kotlinx$atomicfu$value_vi2am5_k$() +
          ', ' +
          count +
          ' in ' +
          $this;
        throw IllegalStateException_init_$Create$(toString(message_0));
      }
    }
    function ByteChannelSequentialBase$awaitAtLeastNBytesAvailableForWrite$lambda(this$0, $count) {
      return function () {
        return this$0.get_availableForWrite_22rgeu_k$() < $count ? !this$0.get_closed_byjrzp_k$() : false;
      };
    }
    function ByteChannelSequentialBase$awaitAtLeastNBytesAvailableForRead$lambda(this$0, $count) {
      return function () {
        return this$0.get_availableForRead_tq0sox_k$() < $count ? !this$0.get_isClosedForRead_ajcc1s_k$() : false;
      };
    }
    function ByteChannelSequentialBase$beginWriteSession$1(this$0) {
      this.this$0__1 = this$0;
    }
    protoOf(ByteChannelSequentialBase$beginWriteSession$1).request_oh1f6f_k$ = function (min) {
      if (this.this$0__1.get_availableForWrite_22rgeu_k$() === 0) return null;
      return this.this$0__1.writable_1.prepareWriteHead_ugmxj4_k$(min);
    };
    protoOf(ByteChannelSequentialBase$beginWriteSession$1).written_ytagz3_k$ = function (n) {
      this.this$0__1.writable_1.afterHeadWrite_dl47zh_k$();
      this.this$0__1.afterWrite_qybsg5_k$(n);
    };
    protoOf(ByteChannelSequentialBase$beginWriteSession$1).flush_shahbo_k$ = function () {
      this.this$0__1.flush_shahbo_k$();
    };
    protoOf(ByteChannelSequentialBase$beginWriteSession$1).tryAwait_wnywx2_k$ = function (n, $completion) {
      var tmp = new $tryAwaitCOROUTINE$49(this, n, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    function ByteChannelSequentialBase$readUTF8LineTo$slambda(this$0, resultContinuation) {
      this.this$0__1 = this$0;
      CoroutineImpl.call(this, resultContinuation);
    }
    protoOf(ByteChannelSequentialBase$readUTF8LineTo$slambda).invoke_yv7ll_k$ = function (size, $completion) {
      var tmp = this.create_t6fi7n_k$(size, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase$readUTF8LineTo$slambda).invoke_qns8j1_k$ = function (p1, $completion) {
      return this.invoke_yv7ll_k$((!(p1 == null) ? typeof p1 === 'number' : false) ? p1 : THROW_CCE(), $completion);
    };
    protoOf(ByteChannelSequentialBase$readUTF8LineTo$slambda).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this.this$0__1.await_wm3xku_k$(this.size_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              if (suspendResult) {
                var tmp_0 = this;
                tmp_0.WHEN_RESULT0__1 = this.this$0__1.readable_1;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                var tmp_1 = this;
                tmp_1.WHEN_RESULT0__1 = null;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    protoOf(ByteChannelSequentialBase$readUTF8LineTo$slambda).create_t6fi7n_k$ = function (size, completion) {
      var i = new ByteChannelSequentialBase$readUTF8LineTo$slambda(this.this$0__1, completion);
      i.size_1 = size;
      return i;
    };
    protoOf(ByteChannelSequentialBase$readUTF8LineTo$slambda).create_wyq9v6_k$ = function (value, completion) {
      return this.create_t6fi7n_k$(
        (!(value == null) ? typeof value === 'number' : false) ? value : THROW_CCE(),
        completion,
      );
    };
    function ByteChannelSequentialBase$readUTF8LineTo$slambda_0(this$0, resultContinuation) {
      var i = new ByteChannelSequentialBase$readUTF8LineTo$slambda(this$0, resultContinuation);
      var l = function (size, $completion) {
        return i.invoke_yv7ll_k$(size, $completion);
      };
      l.$arity = 1;
      return l;
    }
    function ByteChannelSequentialBase$readUTF8LineTo$lambda(this$0) {
      return function (it) {
        this$0.afterRead_biie6i_k$(it);
        return Unit_getInstance();
      };
    }
    function ByteChannelSequentialBase$peekTo$slambda(
      $min,
      $offset,
      $bytesCopied,
      $max,
      $destination,
      $destinationOffset,
      resultContinuation,
    ) {
      this.$min_1 = $min;
      this.$offset_1 = $offset;
      this.$bytesCopied_1 = $bytesCopied;
      this.$max_1 = $max;
      this.$destination_1 = $destination;
      this.$destinationOffset_1 = $destinationOffset;
      CoroutineImpl.call(this, resultContinuation);
    }
    protoOf(ByteChannelSequentialBase$peekTo$slambda).invoke_878vrs_k$ = function (
      $this$readSuspendableSession,
      $completion,
    ) {
      var tmp = this.create_8rvjfw_k$($this$readSuspendableSession, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase$peekTo$slambda).invoke_qns8j1_k$ = function (p1, $completion) {
      return this.invoke_878vrs_k$(
        (!(p1 == null) ? isInterface(p1, SuspendableReadSession) : false) ? p1 : THROW_CCE(),
        $completion,
      );
    };
    protoOf(ByteChannelSequentialBase$peekTo$slambda).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.desiredSize0__1 = coerceAtMost(
                this.$min_1.plus_r93sks_k$(this.$offset_1),
                new Long(4088, 0),
              ).toInt_1tsl84_k$();
              this.set_state_rjd8d0_k$(1);
              suspendResult = this.$this$readSuspendableSession_1.await_wm3xku_k$(this.desiredSize0__1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var tmp0_elvis_lhs = this.$this$readSuspendableSession_1.request_oh1f6f_k$(1);
              var buffer = tmp0_elvis_lhs == null ? Companion_getInstance_4().get_Empty_i9b85g_k$() : tmp0_elvis_lhs;
              if (
                toLong(
                  (buffer.get_writePosition_jdt81t_k$() - buffer.get_readPosition_70qxnc_k$()) | 0,
                ).compareTo_9jj042_k$(this.$offset_1) > 0
              ) {
                var a = toLong(
                  (buffer.get_writePosition_jdt81t_k$() - buffer.get_readPosition_70qxnc_k$()) | 0,
                ).minus_mfbszm_k$(this.$offset_1);
                var b = this.$max_1;
                var this_0 = this.$destination_1;
                var b_0 = toLong(this_0.get_view_wow8a6_k$().byteLength).minus_mfbszm_k$(this.$destinationOffset_1);
                var b_1 = b.compareTo_9jj042_k$(b_0) <= 0 ? b : b_0;
                this.$bytesCopied_1._v = a.compareTo_9jj042_k$(b_1) <= 0 ? a : b_1;
                buffer
                  .get_memory_gl4362_k$()
                  .copyTo_ug0rjx_k$(
                    this.$destination_1,
                    this.$offset_1,
                    this.$bytesCopied_1._v,
                    this.$destinationOffset_1,
                  );
              }

              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    protoOf(ByteChannelSequentialBase$peekTo$slambda).create_8rvjfw_k$ = function (
      $this$readSuspendableSession,
      completion,
    ) {
      var i = new ByteChannelSequentialBase$peekTo$slambda(
        this.$min_1,
        this.$offset_1,
        this.$bytesCopied_1,
        this.$max_1,
        this.$destination_1,
        this.$destinationOffset_1,
        completion,
      );
      i.$this$readSuspendableSession_1 = $this$readSuspendableSession;
      return i;
    };
    protoOf(ByteChannelSequentialBase$peekTo$slambda).create_wyq9v6_k$ = function (value, completion) {
      return this.create_8rvjfw_k$(
        (!(value == null) ? isInterface(value, SuspendableReadSession) : false) ? value : THROW_CCE(),
        completion,
      );
    };
    function ByteChannelSequentialBase$peekTo$slambda_0(
      $min,
      $offset,
      $bytesCopied,
      $max,
      $destination,
      $destinationOffset,
      resultContinuation,
    ) {
      var i = new ByteChannelSequentialBase$peekTo$slambda(
        $min,
        $offset,
        $bytesCopied,
        $max,
        $destination,
        $destinationOffset,
        resultContinuation,
      );
      var l = function ($this$readSuspendableSession, $completion) {
        return i.invoke_878vrs_k$($this$readSuspendableSession, $completion);
      };
      l.$arity = 1;
      return l;
    }
    function $awaitAtLeastNBytesAvailableForWriteCOROUTINE$0(_this__u8e3s4, count, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.count_1 = count;
    }
    protoOf($awaitAtLeastNBytesAvailableForWriteCOROUTINE$0).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (
                !(this._this__u8e3s4__1.get_availableForWrite_22rgeu_k$() < this.count_1
                  ? !this._this__u8e3s4__1.get_closed_byjrzp_k$()
                  : false)
              ) {
                this.set_state_rjd8d0_k$(5);
                continue $sm;
              }

              if (!flushImpl(this._this__u8e3s4__1)) {
                this.set_state_rjd8d0_k$(2);
                suspendResult = this._this__u8e3s4__1.slot_1.sleep_nce3pz_k$(
                  ByteChannelSequentialBase$awaitAtLeastNBytesAvailableForWrite$lambda(
                    this._this__u8e3s4__1,
                    this.count_1,
                  ),
                  this,
                );
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

            case 2:
              this.set_state_rjd8d0_k$(3);
              continue $sm;
            case 3:
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 4:
              throw this.get_exception_x0n6w6_k$();
            case 5:
              return Unit_getInstance();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $awaitAtLeastNBytesAvailableForReadCOROUTINE$1(_this__u8e3s4, count, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.count_1 = count;
    }
    protoOf($awaitAtLeastNBytesAvailableForReadCOROUTINE$1).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (
                !(this._this__u8e3s4__1.get_availableForRead_tq0sox_k$() < this.count_1
                  ? !this._this__u8e3s4__1.get_isClosedForRead_ajcc1s_k$()
                  : false)
              ) {
                this.set_state_rjd8d0_k$(4);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.slot_1.sleep_nce3pz_k$(
                ByteChannelSequentialBase$awaitAtLeastNBytesAvailableForRead$lambda(
                  this._this__u8e3s4__1,
                  this.count_1,
                ),
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 3:
              throw this.get_exception_x0n6w6_k$();
            case 4:
              return Unit_getInstance();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeByteCOROUTINE$2(_this__u8e3s4, b, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.b_1 = b;
    }
    protoOf($writeByteCOROUTINE$2).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this._this__u8e3s4__1.writable_1.writeByte_9ih3z3_k$(this.b_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(1);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeShortCOROUTINE$3(_this__u8e3s4, s, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.s_1 = s;
    }
    protoOf($writeShortCOROUTINE$3).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(2, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              writeShort_0(this._this__u8e3s4__1.writable_1, this.s_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(2);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeIntCOROUTINE$4(_this__u8e3s4, i, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.i_1 = i;
    }
    protoOf($writeIntCOROUTINE$4).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(4, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              writeInt_0(this._this__u8e3s4__1.writable_1, this.i_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(4);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeLongCOROUTINE$5(_this__u8e3s4, l, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.l_1 = l;
    }
    protoOf($writeLongCOROUTINE$5).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(8, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              writeLong_0(this._this__u8e3s4__1.writable_1, this.l_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(8);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeFloatCOROUTINE$6(_this__u8e3s4, f, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.f_1 = f;
    }
    protoOf($writeFloatCOROUTINE$6).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(4, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              writeFloat(this._this__u8e3s4__1.writable_1, this.f_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(4);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeDoubleCOROUTINE$7(_this__u8e3s4, d, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.d_1 = d;
    }
    protoOf($writeDoubleCOROUTINE$7).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(8, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              writeDouble(this._this__u8e3s4__1.writable_1, this.d_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(8);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writePacketCOROUTINE$8(_this__u8e3s4, packet, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.packet_1 = packet;
    }
    protoOf($writePacketCOROUTINE$8).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var size = this.packet_1.get_remaining_mwegr1_k$().toInt_1tsl84_k$();
              this._this__u8e3s4__1.writable_1.writePacket_e1h3qk_k$(this.packet_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(size);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeFullyCOROUTINE$9(_this__u8e3s4, src, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.src_1 = src;
    }
    protoOf($writeFullyCOROUTINE$9).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var this_0 = this.src_1;
              var count = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
              writeFully_1(this._this__u8e3s4__1.writable_1, this.src_1);
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(count);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeFullyCOROUTINE$10(_this__u8e3s4, src, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.src_1 = src;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($writeFullyCOROUTINE$10).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.currentIndex0__1 = this.offset_1;
              this.endIndex1__1 = (this.offset_1 + this.length_1) | 0;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(this.currentIndex0__1 < this.endIndex1__1)) {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              var a = this._this__u8e3s4__1.get_availableForWrite_22rgeu_k$();
              var b = (this.endIndex1__1 - this.currentIndex0__1) | 0;
              var bytesCount = Math.min(a, b);
              writeFully_2(this._this__u8e3s4__1.writable_1, this.src_1, this.currentIndex0__1, bytesCount);
              this.currentIndex0__1 = (this.currentIndex0__1 + bytesCount) | 0;
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(bytesCount);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 3:
              return Unit_getInstance();
            case 4:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeFullyCOROUTINE$11(_this__u8e3s4, memory, startIndex, endIndex, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.memory_1 = memory;
      this.startIndex_1 = startIndex;
      this.endIndex_1 = endIndex;
    }
    protoOf($writeFullyCOROUTINE$11).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.currentIndex0__1 = this.startIndex_1;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(this.currentIndex0__1 < this.endIndex_1)) {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              var a = this._this__u8e3s4__1.get_availableForWrite_22rgeu_k$();
              var b = (this.endIndex_1 - this.currentIndex0__1) | 0;
              var bytesCount = Math.min(a, b);
              writeFully_3(this._this__u8e3s4__1.writable_1, this.memory_1, this.currentIndex0__1, bytesCount);
              this.currentIndex0__1 = (this.currentIndex0__1 + bytesCount) | 0;
              this._this__u8e3s4__1.afterWrite_qybsg5_k$(bytesCount);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 3:
              return Unit_getInstance();
            case 4:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeAvailableCOROUTINE$12(_this__u8e3s4, src, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.src_1 = src;
    }
    protoOf($writeAvailableCOROUTINE$12).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              var tmp_0 = this;
              var this_0 = this.src_1;
              tmp_0.srcRemaining0__1 = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
              if (this.srcRemaining0__1 === 0) return 0;
              var tmp_1 = this;
              var a = this.srcRemaining0__1;
              var b = this._this__u8e3s4__1.get_availableForWrite_22rgeu_k$();
              tmp_1.size1__1 = Math.min(a, b);
              if (this.size1__1 === 0) {
                this.set_state_rjd8d0_k$(1);
                suspendResult = writeAvailableSuspend(this._this__u8e3s4__1, this.src_1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                var tmp_2 = this;
                writeFully_1(this._this__u8e3s4__1.writable_1, this.src_1, this.size1__1);
                this._this__u8e3s4__1.afterWrite_qybsg5_k$(this.size1__1);
                tmp_2.WHEN_RESULT2__1 = this.size1__1;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT2__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT2__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeAvailableCOROUTINE$13(_this__u8e3s4, src, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.src_1 = src;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($writeAvailableCOROUTINE$13).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this.length_1 === 0) return 0;
              var tmp_0 = this;
              var a = this.length_1;
              var b = this._this__u8e3s4__1.get_availableForWrite_22rgeu_k$();
              tmp_0.size0__1 = Math.min(a, b);
              if (this.size0__1 === 0) {
                this.set_state_rjd8d0_k$(1);
                suspendResult = writeAvailableSuspend_0(
                  this._this__u8e3s4__1,
                  this.src_1,
                  this.offset_1,
                  this.length_1,
                  this,
                );
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                var tmp_1 = this;
                writeFully_2(this._this__u8e3s4__1.writable_1, this.src_1, this.offset_1, this.size0__1);
                this._this__u8e3s4__1.afterWrite_qybsg5_k$(this.size0__1);
                tmp_1.WHEN_RESULT1__1 = this.size0__1;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT1__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT1__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readByteCOROUTINE$14(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readByteCOROUTINE$14).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              if (!this._this__u8e3s4__1.readable_1.get_endOfInput_skegkh_k$()) {
                var tmp_0 = this;
                var this_0 = this._this__u8e3s4__1.readable_1.readByte_ectjk2_k$();
                this._this__u8e3s4__1.afterRead_biie6i_k$(1);
                tmp_0.WHEN_RESULT0__1 = this_0;
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readByteSlow(this._this__u8e3s4__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(3);
              continue $sm;
            case 2:
              throw this.get_exception_x0n6w6_k$();
            case 3:
              return this.WHEN_RESULT0__1;
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readByteSlowCOROUTINE$15(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readByteSlowCOROUTINE$15).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              if (!this._this__u8e3s4__1.readable_1.get_endOfInput_skegkh_k$()) {
                var this_0 = this._this__u8e3s4__1.readable_1.readByte_ectjk2_k$();
                this._this__u8e3s4__1.afterRead_biie6i_k$(1);
                return this_0;
              }

              checkClosed$default(this._this__u8e3s4__1, 1);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 3:
              return Unit_getInstance();
            case 4:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readShortCOROUTINE$16(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readShortCOROUTINE$16).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.readable_1.hasBytes_ly98p3_k$(2)) {
                var tmp_0 = this;
                var this_0 = readShort_0(this._this__u8e3s4__1.readable_1);
                this._this__u8e3s4__1.afterRead_biie6i_k$(2);
                tmp_0.WHEN_RESULT0__1 = this_0;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readShortSlow(this._this__u8e3s4__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readShortSlowCOROUTINE$17(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readShortSlowCOROUTINE$17).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(2, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var result = readShort_0(this._this__u8e3s4__1.readable_1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(2);
              return result;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readIntCOROUTINE$18(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readIntCOROUTINE$18).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.readable_1.hasBytes_ly98p3_k$(4)) {
                var tmp_0 = this;
                var this_0 = readInt_0(this._this__u8e3s4__1.readable_1);
                this._this__u8e3s4__1.afterRead_biie6i_k$(4);
                tmp_0.WHEN_RESULT0__1 = this_0;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readIntSlow(this._this__u8e3s4__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readIntSlowCOROUTINE$19(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readIntSlowCOROUTINE$19).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(4, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var result = readInt_0(this._this__u8e3s4__1.readable_1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(4);
              return result;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readLongCOROUTINE$20(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readLongCOROUTINE$20).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.readable_1.hasBytes_ly98p3_k$(8)) {
                var tmp_0 = this;
                var this_0 = readLong_0(this._this__u8e3s4__1.readable_1);
                this._this__u8e3s4__1.afterRead_biie6i_k$(8);
                tmp_0.WHEN_RESULT0__1 = this_0;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readLongSlow(this._this__u8e3s4__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readLongSlowCOROUTINE$21(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readLongSlowCOROUTINE$21).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(8, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var result = readLong_0(this._this__u8e3s4__1.readable_1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(8);
              return result;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readFloatCOROUTINE$22(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readFloatCOROUTINE$22).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.readable_1.hasBytes_ly98p3_k$(4)) {
                var tmp_0 = this;
                var this_0 = readFloat_0(this._this__u8e3s4__1.readable_1);
                this._this__u8e3s4__1.afterRead_biie6i_k$(4);
                tmp_0.WHEN_RESULT0__1 = this_0;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readFloatSlow(this._this__u8e3s4__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readFloatSlowCOROUTINE$23(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readFloatSlowCOROUTINE$23).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(4, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var result = readFloat_0(this._this__u8e3s4__1.readable_1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(4);
              return result;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readDoubleCOROUTINE$24(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readDoubleCOROUTINE$24).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.readable_1.hasBytes_ly98p3_k$(8)) {
                var tmp_0 = this;
                var this_0 = readDouble_0(this._this__u8e3s4__1.readable_1);
                this._this__u8e3s4__1.afterRead_biie6i_k$(8);
                tmp_0.WHEN_RESULT0__1 = this_0;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readDoubleSlow(this._this__u8e3s4__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readDoubleSlowCOROUTINE$25(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readDoubleSlowCOROUTINE$25).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(8, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var result = readDouble_0(this._this__u8e3s4__1.readable_1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(8);
              return result;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readRemainingCOROUTINE$26(_this__u8e3s4, limit, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.limit_1 = limit;
    }
    protoOf($readRemainingCOROUTINE$26).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              ensureNotFailed(this._this__u8e3s4__1);
              this.builder0__1 = new BytePacketBuilder();
              var tmp_0 = this;
              var a = this.limit_1;
              var b = this._this__u8e3s4__1.readable_1.get_remaining_mwegr1_k$();
              tmp_0.size1__1 = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
              this.builder0__1.writePacket_9o18u2_k$(this._this__u8e3s4__1.readable_1, this.size1__1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(this.size1__1.toInt_1tsl84_k$());
              var tmp_1 = this;
              var this_0 = this.limit_1;
              var other = this.builder0__1.get_size_woubt6_k$();
              tmp_1.newLimit2__1 = this_0.minus_mfbszm_k$(toLong(other));
              if (
                this.newLimit2__1.equals(new Long(0, 0)) ? true : this._this__u8e3s4__1.get_isClosedForRead_ajcc1s_k$()
              ) {
                var tmp_2 = this;
                ensureNotFailed_0(this._this__u8e3s4__1, this.builder0__1);
                tmp_2.WHEN_RESULT3__1 = this.builder0__1.build_1k0s4u_k$();
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readRemainingSuspend(this._this__u8e3s4__1, this.builder0__1, this.limit_1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT3__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT3__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readRemainingSuspendCOROUTINE$27(_this__u8e3s4, builder, limit, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.builder_1 = builder;
      this.limit_1 = limit;
    }
    protoOf($readRemainingSuspendCOROUTINE$27).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(5);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(toLong(this.builder_1.get_size_woubt6_k$()).compareTo_9jj042_k$(this.limit_1) < 0)) {
                this.set_state_rjd8d0_k$(4);
                continue $sm;
              }

              var tmp_0 = this;
              var this_0 = this.limit_1;
              var other = this.builder_1.get_size_woubt6_k$();
              var a = this_0.minus_mfbszm_k$(toLong(other));
              var b = this._this__u8e3s4__1.readable_1.get_remaining_mwegr1_k$();
              tmp_0.partLimit0__1 = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
              this.builder_1.writePacket_9o18u2_k$(this._this__u8e3s4__1.readable_1, this.partLimit0__1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(this.partLimit0__1.toInt_1tsl84_k$());
              ensureNotFailed_0(this._this__u8e3s4__1, this.builder_1);
              if (
                this._this__u8e3s4__1.get_isClosedForRead_ajcc1s_k$()
                  ? true
                  : this.builder_1.get_size_woubt6_k$() === this.limit_1.toInt_1tsl84_k$()
              ) {
                this.set_state_rjd8d0_k$(4);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 2:
              this.set_state_rjd8d0_k$(3);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 3:
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 4:
              ensureNotFailed_0(this._this__u8e3s4__1, this.builder_1);
              return this.builder_1.build_1k0s4u_k$();
            case 5:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 5) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readPacketCOROUTINE$28(_this__u8e3s4, size, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.size_1 = size;
    }
    protoOf($readPacketCOROUTINE$28).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              checkClosed$default(this._this__u8e3s4__1, this.size_1);
              this.builder0__1 = new BytePacketBuilder();
              this.remaining1__1 = this.size_1;
              var tmp_0 = this;
              var a = toLong(this.remaining1__1);
              var b = this._this__u8e3s4__1.readable_1.get_remaining_mwegr1_k$();
              tmp_0.partSize2__1 = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
              this.remaining1__1 = (this.remaining1__1 - this.partSize2__1) | 0;
              this.builder0__1.writePacket_3jtwmc_k$(this._this__u8e3s4__1.readable_1, this.partSize2__1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(this.partSize2__1);
              checkClosed(this._this__u8e3s4__1, this.remaining1__1, this.builder0__1);
              if (this.remaining1__1 > 0) {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readPacketSuspend(this._this__u8e3s4__1, this.builder0__1, this.remaining1__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                this.WHEN_RESULT3__1 = this.builder0__1.build_1k0s4u_k$();
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT3__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT3__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readPacketSuspendCOROUTINE$29(_this__u8e3s4, builder, size, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.builder_1 = builder;
      this.size_1 = size;
    }
    protoOf($readPacketSuspendCOROUTINE$29).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(5);
              this.remaining0__1 = this.size_1;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(this.remaining0__1 > 0)) {
                this.set_state_rjd8d0_k$(4);
                continue $sm;
              }

              var tmp_0 = this;
              var a = toLong(this.remaining0__1);
              var b = this._this__u8e3s4__1.readable_1.get_remaining_mwegr1_k$();
              tmp_0.partSize1__1 = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
              this.remaining0__1 = (this.remaining0__1 - this.partSize1__1) | 0;
              this.builder_1.writePacket_3jtwmc_k$(this._this__u8e3s4__1.readable_1, this.partSize1__1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(this.partSize1__1);
              checkClosed(this._this__u8e3s4__1, this.remaining0__1, this.builder_1);
              if (this.remaining0__1 > 0) {
                this.set_state_rjd8d0_k$(2);
                suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

            case 2:
              this.set_state_rjd8d0_k$(3);
              continue $sm;
            case 3:
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 4:
              checkClosed(this._this__u8e3s4__1, this.remaining0__1, this.builder_1);
              return this.builder_1.build_1k0s4u_k$();
            case 5:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 5) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readAvailableCOROUTINE$30(_this__u8e3s4, dst, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
    }
    protoOf($readAvailableCOROUTINE$30).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              var tmp0_safe_receiver = this._this__u8e3s4__1.get_closedCause_o1qcj8_k$();
              if (tmp0_safe_receiver == null) null;
              else {
                throw tmp0_safe_receiver;
              }

              if (
                this._this__u8e3s4__1.get_closed_byjrzp_k$()
                  ? this._this__u8e3s4__1.get_availableForRead_tq0sox_k$() === 0
                  : false
              )
                return -1;
              var this_0 = this.dst_1;
              if (((this_0.get_limit_iuokuq_k$() - this_0.get_writePosition_jdt81t_k$()) | 0) === 0) return 0;
              if (this._this__u8e3s4__1.get_availableForRead_tq0sox_k$() === 0) {
                this.set_state_rjd8d0_k$(1);
                suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              if (!this._this__u8e3s4__1.readable_1.canRead_93a6bq_k$()) {
                this._this__u8e3s4__1.prepareFlushedBytes_jiu201_k$();
              }

              var this_1 = this.dst_1;
              var a = toLong((this_1.get_limit_iuokuq_k$() - this_1.get_writePosition_jdt81t_k$()) | 0);
              var b = this._this__u8e3s4__1.readable_1.get_remaining_mwegr1_k$();
              var size = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
              readFully_4(this._this__u8e3s4__1.readable_1, this.dst_1, size);
              this._this__u8e3s4__1.afterRead_biie6i_k$(size);
              return size;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readFullyCOROUTINE$31(_this__u8e3s4, dst, n, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.n_1 = n;
    }
    protoOf($readFullyCOROUTINE$31).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              var this_0 = this.dst_1;
              if (!(this.n_1 <= ((this_0.get_limit_iuokuq_k$() - this_0.get_writePosition_jdt81t_k$()) | 0))) {
                var message = 'Not enough space in the destination buffer to write ' + this.n_1 + ' bytes';
                throw IllegalArgumentException_init_$Create$(toString(message));
              }

              if (!(this.n_1 >= 0)) {
                var message_0 = "n shouldn't be negative";
                throw IllegalArgumentException_init_$Create$(toString(message_0));
              }

              if (!(this._this__u8e3s4__1.get_closedCause_o1qcj8_k$() == null)) {
                throw ensureNotNull(this._this__u8e3s4__1.get_closedCause_o1qcj8_k$());
              } else {
                if (
                  this._this__u8e3s4__1.readable_1.get_remaining_mwegr1_k$().compareTo_9jj042_k$(toLong(this.n_1)) >= 0
                ) {
                  readFully_4(this._this__u8e3s4__1.readable_1, this.dst_1, this.n_1);
                  this._this__u8e3s4__1.afterRead_biie6i_k$(this.n_1);
                  this.set_state_rjd8d0_k$(2);
                  continue $sm;
                } else {
                  if (this._this__u8e3s4__1.get_closed_byjrzp_k$()) {
                    throw new EOFException(
                      'Channel is closed and not enough bytes available: required ' +
                        this.n_1 +
                        ' but ' +
                        this._this__u8e3s4__1.get_availableForRead_tq0sox_k$() +
                        ' available',
                    );
                  } else {
                    this.set_state_rjd8d0_k$(1);
                    suspendResult = readFullySuspend(this._this__u8e3s4__1, this.dst_1, this.n_1, this);
                    if (suspendResult === get_COROUTINE_SUSPENDED()) {
                      return suspendResult;
                    }
                    continue $sm;
                  }
                }
              }

            case 1:
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return Unit_getInstance();
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readFullySuspendCOROUTINE$32(_this__u8e3s4, dst, n, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.n_1 = n;
    }
    protoOf($readFullySuspendCOROUTINE$32).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(this.n_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this.set_state_rjd8d0_k$(2);
              suspendResult = readFully(this._this__u8e3s4__1, this.dst_1, this.n_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              return Unit_getInstance();
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readAvailableCOROUTINE$33(_this__u8e3s4, dst, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($readAvailableCOROUTINE$33).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              var tmp0_safe_receiver = this._this__u8e3s4__1.get_closedCause_o1qcj8_k$();
              if (tmp0_safe_receiver == null) null;
              else {
                throw tmp0_safe_receiver;
              }

              if (
                this._this__u8e3s4__1.get_closed_byjrzp_k$()
                  ? this._this__u8e3s4__1.get_availableForRead_tq0sox_k$() === 0
                  : false
              )
                return -1;
              if (this.length_1 === 0) return 0;
              if (this._this__u8e3s4__1.get_availableForRead_tq0sox_k$() === 0) {
                this.set_state_rjd8d0_k$(1);
                suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              if (!this._this__u8e3s4__1.readable_1.canRead_93a6bq_k$()) {
                this._this__u8e3s4__1.prepareFlushedBytes_jiu201_k$();
              }

              var a = toLong(this.length_1);
              var b = this._this__u8e3s4__1.readable_1.get_remaining_mwegr1_k$();
              var size = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
              readFully_3(this._this__u8e3s4__1.readable_1, this.dst_1, this.offset_1, size);
              this._this__u8e3s4__1.afterRead_biie6i_k$(size);
              return size;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readFullyCOROUTINE$34(_this__u8e3s4, dst, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($readFullyCOROUTINE$34).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.readAvailable_xlipkq_k$(
                this.dst_1,
                this.offset_1,
                this.length_1,
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this.rc0__1 = suspendResult;
              if (this.rc0__1 === this.length_1) return Unit_getInstance();
              if (this.rc0__1 === -1) throw new EOFException('Unexpected end of stream');
              this.set_state_rjd8d0_k$(2);
              suspendResult = readFullySuspend_0(
                this._this__u8e3s4__1,
                this.dst_1,
                (this.offset_1 + this.rc0__1) | 0,
                (this.length_1 - this.rc0__1) | 0,
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              return Unit_getInstance();
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readFullySuspendCOROUTINE$35(_this__u8e3s4, dst, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($readFullySuspendCOROUTINE$35).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.written0__1 = 0;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(this.written0__1 < this.length_1)) {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.readAvailable_xlipkq_k$(
                this.dst_1,
                (this.offset_1 + this.written0__1) | 0,
                (this.length_1 - this.written0__1) | 0,
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              var rc = suspendResult;
              if (rc === -1) throw new EOFException('Unexpected end of stream');
              this.written0__1 = (this.written0__1 + rc) | 0;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 3:
              return Unit_getInstance();
            case 4:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readBooleanCOROUTINE$36(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readBooleanCOROUTINE$36).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.readable_1.canRead_93a6bq_k$()) {
                var tmp_0 = this;
                var this_0 = this._this__u8e3s4__1.readable_1.readByte_ectjk2_k$() === 1;
                this._this__u8e3s4__1.afterRead_biie6i_k$(1);
                tmp_0.WHEN_RESULT0__1 = this_0;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readBooleanSlow(this._this__u8e3s4__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readBooleanSlowCOROUTINE$37(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($readBooleanSlowCOROUTINE$37).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              checkClosed$default(this._this__u8e3s4__1, 1);
              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.readBoolean_si96by_k$(this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              return suspendResult;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $awaitInternalAtLeast1COROUTINE$38(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($awaitInternalAtLeast1COROUTINE$38).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              if (!this._this__u8e3s4__1.readable_1.get_endOfInput_skegkh_k$()) {
                var tmp_0 = this;
                tmp_0.WHEN_RESULT0__1 = true;
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = this._this__u8e3s4__1.awaitSuspend_e9hvgy_k$(1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(3);
              continue $sm;
            case 2:
              throw this.get_exception_x0n6w6_k$();
            case 3:
              return this.WHEN_RESULT0__1;
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $awaitSuspendCOROUTINE$39(_this__u8e3s4, atLeast, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.atLeast_1 = atLeast;
    }
    protoOf($awaitSuspendCOROUTINE$39).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              if (!(this.atLeast_1 >= 0)) {
                var message = 'Failed requirement.';
                throw IllegalArgumentException_init_$Create$(toString(message));
              }

              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForRead_qvdw4u_k$(this.atLeast_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this._this__u8e3s4__1.prepareFlushedBytes_jiu201_k$();
              var tmp0_safe_receiver = this._this__u8e3s4__1.get_closedCause_o1qcj8_k$();
              if (tmp0_safe_receiver == null) null;
              else {
                throw tmp0_safe_receiver;
              }

              return !this._this__u8e3s4__1.get_isClosedForRead_ajcc1s_k$()
                ? this._this__u8e3s4__1.get_availableForRead_tq0sox_k$() >= this.atLeast_1
                : false;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $discardCOROUTINE$40(_this__u8e3s4, max, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.max_1 = max;
    }
    protoOf($discardCOROUTINE$40).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.discarded0__1 = this._this__u8e3s4__1.readable_1.discard_kxfhu8_k$(this.max_1);
              this._this__u8e3s4__1.afterRead_biie6i_k$(this.discarded0__1.toInt_1tsl84_k$());
              if (
                this.discarded0__1.equals(this.max_1) ? true : this._this__u8e3s4__1.get_isClosedForRead_ajcc1s_k$()
              ) {
                var tmp_0 = this;
                ensureNotFailed(this._this__u8e3s4__1);
                return this.discarded0__1;
              } else {
                this.set_state_rjd8d0_k$(1);
                suspendResult = discardSuspend(this._this__u8e3s4__1, this.max_1, this.discarded0__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT1__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT1__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $discardSuspendCOROUTINE$41(_this__u8e3s4, max, discarded0, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.max_1 = max;
      this.discarded0__1 = discarded0;
    }
    protoOf($discardSuspendCOROUTINE$41).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(5);
              this.discarded0__2 = this.discarded0__1;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.await_wm3xku_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              var ARGUMENT = suspendResult;
              if (!ARGUMENT) {
                this.set_state_rjd8d0_k$(4);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

            case 3:
              var count = this._this__u8e3s4__1.readable_1.discard_kxfhu8_k$(
                this.max_1.minus_mfbszm_k$(this.discarded0__2),
              );
              this._this__u8e3s4__1.afterRead_biie6i_k$(count.toInt_1tsl84_k$());
              this.discarded0__2 = this.discarded0__2.plus_r93sks_k$(count);
              if (
                this.discarded0__2.compareTo_9jj042_k$(this.max_1) < 0
                  ? !this._this__u8e3s4__1.get_isClosedForRead_ajcc1s_k$()
                  : false
              ) {
                this.set_state_rjd8d0_k$(1);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(4);
              continue $sm;
            case 4:
              ensureNotFailed(this._this__u8e3s4__1);
              return this.discarded0__2;
            case 5:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 5) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readSuspendableSessionCOROUTINE$42(_this__u8e3s4, consumer, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.consumer_1 = consumer;
    }
    protoOf($readSuspendableSessionCOROUTINE$42).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(5);
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              this.set_exceptionState_fex74n_k$(4);
              this.set_state_rjd8d0_k$(2);
              suspendResult = this.consumer_1(this._this__u8e3s4__1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              this.tmp$ret$00__1 = suspendResult;
              this.set_exceptionState_fex74n_k$(5);
              this.set_state_rjd8d0_k$(3);
              continue $sm;
            case 3:
              this.set_exceptionState_fex74n_k$(5);
              completeReading(this._this__u8e3s4__1);
              return Unit_getInstance();
            case 4:
              this.set_exceptionState_fex74n_k$(5);
              var t = this.get_exception_x0n6w6_k$();
              completeReading(this._this__u8e3s4__1);
              throw t;
            case 5:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 5) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readUTF8LineCOROUTINE$43(_this__u8e3s4, limit, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.limit_1 = limit;
    }
    protoOf($readUTF8LineCOROUTINE$43).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.builder0__1 = StringBuilder_init_$Create$();
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.readUTF8LineTo_ve1u75_k$(this.builder0__1, this.limit_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var ARGUMENT = suspendResult;
              if (!ARGUMENT) {
                return null;
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 2:
              return this.builder0__1.toString();
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeAvailableSuspendCOROUTINE$44(_this__u8e3s4, src, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.src_1 = src;
    }
    protoOf($writeAvailableSuspendCOROUTINE$44).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.writeAvailable_uozx97_k$(this.src_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              return suspendResult;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $writeAvailableSuspendCOROUTINE$45(_this__u8e3s4, src, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.src_1 = src;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($writeAvailableSuspendCOROUTINE$45).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.writeAvailable_ly4hch_k$(
                this.src_1,
                this.offset_1,
                this.length_1,
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              return suspendResult;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $awaitFreeSpaceCOROUTINE$46(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($awaitFreeSpaceCOROUTINE$46).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this._this__u8e3s4__1.flush_shahbo_k$();
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              ensureNotClosed(this._this__u8e3s4__1);
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $awaitContentCOROUTINE$47(_this__u8e3s4, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
    }
    protoOf($awaitContentCOROUTINE$47).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.await_wm3xku_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              return Unit_getInstance();
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $peekToCOROUTINE$48(_this__u8e3s4, destination, destinationOffset, offset, min, max, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.destination_1 = destination;
      this.destinationOffset_1 = destinationOffset;
      this.offset_1 = offset;
      this.min_1 = min;
      this.max_1 = max;
    }
    protoOf($peekToCOROUTINE$48).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.bytesCopied0__1 = {_v: new Long(0, 0)};
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.readSuspendableSession_59oqw3_k$(
                ByteChannelSequentialBase$peekTo$slambda_0(
                  this.min_1,
                  this.offset_1,
                  this.bytesCopied0__1,
                  this.max_1,
                  this.destination_1,
                  this.destinationOffset_1,
                  null,
                ),
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              return this.bytesCopied0__1._v;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function ByteChannelSequentialBase(initial, autoFlush, pool) {
      pool = pool === VOID ? Companion_getInstance_4().get_Pool_wo83gl_k$() : pool;
      this.autoFlush_1 = autoFlush;
      this._lastReadView_1 = atomic$ref$1(Companion_getInstance_4().get_Empty_i9b85g_k$());
      this._totalBytesRead_1 = atomic$long$1(new Long(0, 0));
      this._totalBytesWritten_1 = atomic$long$1(new Long(0, 0));
      this._availableForRead_1 = atomic$int$1(0);
      this.channelSize_1 = atomic$int$1(0);
      this._closed_1 = atomic$ref$1(null);
      this.writable_1 = new BytePacketBuilder(pool);
      this.readable_1 = ByteReadPacket_init_$Create$(initial, pool);
      this.lastReadAvailable$delegate_1 = atomic$int$1(0);
      this.lastReadView$delegate_1 = atomic$ref$1(Companion_getInstance_4().get_Empty_i9b85g_k$());
      this.slot_1 = new AwaitingSlot();
      this.flushMutex_1 = new Object();
      this.flushBuffer_1 = new BytePacketBuilder();
      var count = remainingAll(initial).toInt_1tsl84_k$();
      this.afterWrite_qybsg5_k$(count);
      this._availableForRead_1.atomicfu$addAndGet(count);
    }
    protoOf(ByteChannelSequentialBase).get_autoFlush_zfdl3o_k$ = function () {
      return this.autoFlush_1;
    };
    protoOf(ByteChannelSequentialBase).set_closed_z8zuoc_k$ = function (_anonymous_parameter_0__qggqh8) {
      // Inline function 'kotlin.error' call
      var message = 'Setting is not allowed for closed';
      throw IllegalStateException_init_$Create$(toString(message));
    };
    protoOf(ByteChannelSequentialBase).get_closed_byjrzp_k$ = function () {
      return !(this._closed_1.get_kotlinx$atomicfu$value_vi2am5_k$() == null);
    };
    protoOf(ByteChannelSequentialBase).get_writable_8ork2x_k$ = function () {
      return this.writable_1;
    };
    protoOf(ByteChannelSequentialBase).get_readable_ovw33t_k$ = function () {
      return this.readable_1;
    };
    protoOf(ByteChannelSequentialBase).get_availableForRead_tq0sox_k$ = function () {
      return this._availableForRead_1.get_kotlinx$atomicfu$value_vi2am5_k$();
    };
    protoOf(ByteChannelSequentialBase).get_availableForWrite_22rgeu_k$ = function () {
      // Inline function 'kotlin.comparisons.maxOf' call
      var b = (4088 - this.channelSize_1.get_kotlinx$atomicfu$value_vi2am5_k$()) | 0;
      return Math.max(0, b);
    };
    protoOf(ByteChannelSequentialBase).get_isClosedForRead_ajcc1s_k$ = function () {
      return _get_isCancelled__nhbn6y(this)
        ? true
        : this.get_closed_byjrzp_k$()
          ? this.channelSize_1.get_kotlinx$atomicfu$value_vi2am5_k$() === 0
          : false;
    };
    protoOf(ByteChannelSequentialBase).get_isClosedForWrite_seyg5n_k$ = function () {
      return this.get_closed_byjrzp_k$();
    };
    protoOf(ByteChannelSequentialBase).get_totalBytesRead_dai8jq_k$ = function () {
      return this._totalBytesRead_1.get_kotlinx$atomicfu$value_vi2am5_k$();
    };
    protoOf(ByteChannelSequentialBase).get_totalBytesWritten_b5quc9_k$ = function () {
      return this._totalBytesWritten_1.get_kotlinx$atomicfu$value_vi2am5_k$();
    };
    protoOf(ByteChannelSequentialBase).set_closedCause_q9zp46_k$ = function (_anonymous_parameter_0__qggqh8) {
      // Inline function 'kotlin.error' call
      var message = "Closed cause shouldn't be changed directly";
      throw IllegalStateException_init_$Create$(toString(message));
    };
    protoOf(ByteChannelSequentialBase).get_closedCause_o1qcj8_k$ = function () {
      var tmp0_safe_receiver = this._closed_1.get_kotlinx$atomicfu$value_vi2am5_k$();
      return tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_cause_iplhs0_k$();
    };
    protoOf(ByteChannelSequentialBase).awaitAtLeastNBytesAvailableForWrite_cfus3l_k$ = function (count, $completion) {
      var tmp = new $awaitAtLeastNBytesAvailableForWriteCOROUTINE$0(this, count, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).awaitAtLeastNBytesAvailableForRead_qvdw4u_k$ = function (count, $completion) {
      var tmp = new $awaitAtLeastNBytesAvailableForReadCOROUTINE$1(this, count, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).flush_shahbo_k$ = function () {
      flushImpl(this);
    };
    protoOf(ByteChannelSequentialBase).prepareFlushedBytes_jiu201_k$ = function () {
      // Inline function 'kotlinx.atomicfu.locks.synchronized' call
      this.flushMutex_1;
      // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.prepareFlushedBytes.<anonymous>' call
      unsafeAppend(this.readable_1, this.flushBuffer_1);
    };
    protoOf(ByteChannelSequentialBase).writeByte_9xy8oq_k$ = function (b, $completion) {
      var tmp = new $writeByteCOROUTINE$2(this, b, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeShort_zcdxvo_k$ = function (s, $completion) {
      var tmp = new $writeShortCOROUTINE$3(this, s, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeInt_ft1dn3_k$ = function (i, $completion) {
      var tmp = new $writeIntCOROUTINE$4(this, i, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeLong_xdmqak_k$ = function (l, $completion) {
      var tmp = new $writeLongCOROUTINE$5(this, l, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeFloat_2bveak_k$ = function (f, $completion) {
      var tmp = new $writeFloatCOROUTINE$6(this, f, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeDouble_cydqap_k$ = function (d, $completion) {
      var tmp = new $writeDoubleCOROUTINE$7(this, d, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writePacket_9x2akt_k$ = function (packet, $completion) {
      var tmp = new $writePacketCOROUTINE$8(this, packet, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeFully_hz8k55_k$ = function (src, $completion) {
      var tmp = new $writeFullyCOROUTINE$9(this, src, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeFully_c7wsd0_k$ = function (src, offset, length, $completion) {
      var tmp = new $writeFullyCOROUTINE$10(this, src, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeFully_q2upa9_k$ = function (memory, startIndex, endIndex, $completion) {
      var tmp = new $writeFullyCOROUTINE$11(this, memory, startIndex, endIndex, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeAvailable_uozx97_k$ = function (src, $completion) {
      var tmp = new $writeAvailableCOROUTINE$12(this, src, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeAvailable_ly4hch_k$ = function (src, offset, length, $completion) {
      var tmp = new $writeAvailableCOROUTINE$13(this, src, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).writeSuspendSession_95tk3h_k$ = function (visitor, $completion) {
      var session = this.beginWriteSession_k7m9kw_k$();
      return visitor(session, $completion);
    };
    protoOf(ByteChannelSequentialBase).beginWriteSession_k7m9kw_k$ = function () {
      return new ByteChannelSequentialBase$beginWriteSession$1(this);
    };
    protoOf(ByteChannelSequentialBase).endWriteSession_g3xxii_k$ = function (written) {
      this.writable_1.afterHeadWrite_dl47zh_k$();
      this.afterWrite_qybsg5_k$(written);
    };
    protoOf(ByteChannelSequentialBase).readByte_rqxxpg_k$ = function ($completion) {
      var tmp = new $readByteCOROUTINE$14(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readShort_l1xcq_k$ = function ($completion) {
      var tmp = new $readShortCOROUTINE$16(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).afterRead_biie6i_k$ = function (count) {
      addBytesRead(this, count);
      this.slot_1.resume_2o15jx_k$();
    };
    protoOf(ByteChannelSequentialBase).readInt_494lj4_k$ = function ($completion) {
      var tmp = new $readIntCOROUTINE$18(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readLong_53tz8d_k$ = function ($completion) {
      var tmp = new $readLongCOROUTINE$20(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readFloat_kzegx2_k$ = function ($completion) {
      var tmp = new $readFloatCOROUTINE$22(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readDouble_xgmyys_k$ = function ($completion) {
      var tmp = new $readDoubleCOROUTINE$24(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readRemaining_nblam0_k$ = function (limit, $completion) {
      var tmp = new $readRemainingCOROUTINE$26(this, limit, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readPacket_kk8dng_k$ = function (size, $completion) {
      var tmp = new $readPacketCOROUTINE$28(this, size, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readAvailableClosed_uidty9_k$ = function () {
      var tmp0_safe_receiver = this.get_closedCause_o1qcj8_k$();
      if (tmp0_safe_receiver == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        throw tmp0_safe_receiver;
      }
      if (this.get_availableForRead_tq0sox_k$() > 0) {
        this.prepareFlushedBytes_jiu201_k$();
      }
      return -1;
    };
    protoOf(ByteChannelSequentialBase).readAvailable_wzcy2k_k$ = function (dst, $completion) {
      return this.readAvailable_jtpslb_k$(dst instanceof Buffer ? dst : THROW_CCE(), $completion);
    };
    protoOf(ByteChannelSequentialBase).readAvailable_jtpslb_k$ = function (dst, $completion) {
      var tmp = new $readAvailableCOROUTINE$30(this, dst, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readFully_wl4e2l_k$ = function (dst, n, $completion) {
      return readFully(this, dst instanceof Buffer ? dst : THROW_CCE(), n, $completion);
    };
    protoOf(ByteChannelSequentialBase).readAvailable_xlipkq_k$ = function (dst, offset, length, $completion) {
      var tmp = new $readAvailableCOROUTINE$33(this, dst, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readFully_sgvmxv_k$ = function (dst, offset, length, $completion) {
      var tmp = new $readFullyCOROUTINE$34(this, dst, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readBoolean_si96by_k$ = function ($completion) {
      var tmp = new $readBooleanCOROUTINE$36(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).await_wm3xku_k$ = function (atLeast, $completion) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(atLeast >= 0)) {
        // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.await.<anonymous>' call
        var message = "atLeast parameter shouldn't be negative: " + atLeast;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(toLong(atLeast).compareTo_9jj042_k$(new Long(4088, 0)) <= 0)) {
        // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.await.<anonymous>' call
        var message_0 = "atLeast parameter shouldn't be larger than max buffer size of 4088: " + atLeast;
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      completeReading(this);
      if (atLeast === 0) return !this.get_isClosedForRead_ajcc1s_k$();
      if (this.readable_1.get_remaining_mwegr1_k$().compareTo_9jj042_k$(toLong(atLeast)) >= 0) return true;
      return this.awaitSuspend_e9hvgy_k$(atLeast, $completion);
    };
    protoOf(ByteChannelSequentialBase).awaitInternalAtLeast1_fno9ji_k$ = function ($completion) {
      var tmp = new $awaitInternalAtLeast1COROUTINE$38(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).awaitSuspend_e9hvgy_k$ = function (atLeast, $completion) {
      var tmp = new $awaitSuspendCOROUTINE$39(this, atLeast, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).discard_6fulfq_k$ = function (n) {
      var tmp0_safe_receiver = this.get_closedCause_o1qcj8_k$();
      if (tmp0_safe_receiver == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        throw tmp0_safe_receiver;
      }
      if (n === 0) {
        return 0;
      }
      // Inline function 'kotlin.also' call
      var this_0 = this.readable_1.discard_6fulfq_k$(n);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.ByteChannelSequentialBase.discard.<anonymous>' call
      this.afterRead_biie6i_k$(n);
      requestNextView(this, 1);
      return this_0;
    };
    protoOf(ByteChannelSequentialBase).request_oh1f6f_k$ = function (atLeast) {
      var tmp0_safe_receiver = this.get_closedCause_o1qcj8_k$();
      if (tmp0_safe_receiver == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        throw tmp0_safe_receiver;
      }
      completeReading(this);
      return requestNextView(this, atLeast);
    };
    protoOf(ByteChannelSequentialBase).discard_tkcvlt_k$ = function (max, $completion) {
      var tmp = new $discardCOROUTINE$40(this, max, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readSession_9fsihs_k$ = function (consumer) {
      try {
        consumer(this);
      } finally {
        completeReading(this);
      }
    };
    protoOf(ByteChannelSequentialBase).startReadSession_et8im_k$ = function () {
      return this;
    };
    protoOf(ByteChannelSequentialBase).endReadSession_r81zlh_k$ = function () {
      completeReading(this);
    };
    protoOf(ByteChannelSequentialBase).readSuspendableSession_59oqw3_k$ = function (consumer, $completion) {
      var tmp = new $readSuspendableSessionCOROUTINE$42(this, consumer, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).readUTF8LineTo_ve1u75_k$ = function (out, limit, $completion) {
      if (this.get_isClosedForRead_ajcc1s_k$()) {
        var cause = this.get_closedCause_o1qcj8_k$();
        if (!(cause == null)) {
          throw cause;
        }
        return false;
      }
      var tmp = ByteChannelSequentialBase$readUTF8LineTo$slambda_0(this, null);
      return decodeUTF8LineLoopSuspend(
        out,
        limit,
        tmp,
        ByteChannelSequentialBase$readUTF8LineTo$lambda(this),
        $completion,
      );
    };
    protoOf(ByteChannelSequentialBase).readUTF8Line_vxfv4t_k$ = function (limit, $completion) {
      var tmp = new $readUTF8LineCOROUTINE$43(this, limit, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).cancel_e74who_k$ = function (cause) {
      if (!(this.get_closedCause_o1qcj8_k$() == null) ? true : this.get_closed_byjrzp_k$()) {
        return false;
      }
      return this.close_ukldxa_k$(cause == null ? CancellationException_init_$Create$('Channel cancelled') : cause);
    };
    protoOf(ByteChannelSequentialBase).close_ukldxa_k$ = function (cause) {
      var closeElement = cause == null ? get_CLOSED_SUCCESS() : new CloseElement(cause);
      if (!this._closed_1.atomicfu$compareAndSet(null, closeElement)) return false;
      if (!(cause == null)) {
        this.readable_1.release_wu5yyf_k$();
        this.writable_1.release_wu5yyf_k$();
        this.flushBuffer_1.release_wu5yyf_k$();
      } else {
        this.flush_shahbo_k$();
        this.writable_1.release_wu5yyf_k$();
      }
      this.slot_1.cancel_9i2dv0_k$(cause);
      return true;
    };
    protoOf(ByteChannelSequentialBase).transferTo_rz8sl2_k$ = function (dst, limit) {
      var size = this.readable_1.get_remaining_mwegr1_k$();
      var tmp;
      if (size.compareTo_9jj042_k$(limit) <= 0) {
        dst.writable_1.writePacket_e1h3qk_k$(this.readable_1);
        dst.afterWrite_qybsg5_k$(size.toInt_1tsl84_k$());
        this.afterRead_biie6i_k$(size.toInt_1tsl84_k$());
        tmp = size;
      } else {
        tmp = new Long(0, 0);
      }
      return tmp;
    };
    protoOf(ByteChannelSequentialBase).afterWrite_qybsg5_k$ = function (count) {
      addBytesWritten(this, count);
      if (this.get_closed_byjrzp_k$()) {
        this.writable_1.release_wu5yyf_k$();
        ensureNotClosed(this);
      }
      if (this.get_autoFlush_zfdl3o_k$() ? true : this.get_availableForWrite_22rgeu_k$() === 0) {
        this.flush_shahbo_k$();
      }
    };
    protoOf(ByteChannelSequentialBase).awaitFreeSpace_pdr1rh_k$ = function ($completion) {
      var tmp = new $awaitFreeSpaceCOROUTINE$46(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).awaitContent_64bnuc_k$ = function ($completion) {
      var tmp = new $awaitContentCOROUTINE$47(this, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelSequentialBase).peekTo_ypcho2_k$ = function (
      destination,
      destinationOffset,
      offset,
      min,
      max,
      $completion,
    ) {
      var tmp = new $peekToCOROUTINE$48(this, destination, destinationOffset, offset, min, max, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    function get_EXPECTED_CAPACITY() {
      return EXPECTED_CAPACITY;
    }
    var EXPECTED_CAPACITY;
    function lastReadAvailable$factory() {
      return getPropertyCallableRef(
        'lastReadAvailable',
        1,
        KMutableProperty1,
        function (receiver) {
          return _get_lastReadAvailable__cgybqk(receiver);
        },
        function (receiver, value) {
          return _set_lastReadAvailable__98ukjs(receiver, value);
        },
      );
    }
    function lastReadAvailable$factory_0() {
      return getPropertyCallableRef(
        'lastReadAvailable',
        1,
        KMutableProperty1,
        function (receiver) {
          return _get_lastReadAvailable__cgybqk(receiver);
        },
        function (receiver, value) {
          return _set_lastReadAvailable__98ukjs(receiver, value);
        },
      );
    }
    function lastReadView$factory() {
      return getPropertyCallableRef(
        'lastReadView',
        1,
        KMutableProperty1,
        function (receiver) {
          return _get_lastReadView__ihufyy(receiver);
        },
        function (receiver, value) {
          return _set_lastReadView__2y3peu(receiver, value);
        },
      );
    }
    function lastReadView$factory_0() {
      return getPropertyCallableRef(
        'lastReadView',
        1,
        KMutableProperty1,
        function (receiver) {
          return _get_lastReadView__ihufyy(receiver);
        },
        function (receiver, value) {
          return _set_lastReadView__2y3peu(receiver, value);
        },
      );
    }
    function copyAndClose(_this__u8e3s4, dst, limit, $completion) {
      limit = limit === VOID ? Companion_getInstance().get_MAX_VALUE_54a9lf_k$() : limit;
      var tmp = new $copyAndCloseCOROUTINE$50(_this__u8e3s4, dst, limit, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function cancel(_this__u8e3s4) {
      return _this__u8e3s4.cancel_e74who_k$(null);
    }
    function readAvailable(_this__u8e3s4, dst, $completion) {
      return _this__u8e3s4.readAvailable_xlipkq_k$(dst, 0, dst.length, $completion);
    }
    function $copyAndCloseCOROUTINE$50(_this__u8e3s4, dst, limit, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.limit_1 = limit;
    }
    protoOf($copyAndCloseCOROUTINE$50).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = copyTo(this._this__u8e3s4__1, this.dst_1, this.limit_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              var count = suspendResult;
              close_0(this.dst_1);
              return count;
            case 2:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 2) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function close_0(_this__u8e3s4) {
      return _this__u8e3s4.close_ukldxa_k$(null);
    }
    function ClosedWriteChannelException(message) {
      CancellationException_init_$Init$(message, this);
      captureStack(this, ClosedWriteChannelException);
    }
    function get_CLOSED_SUCCESS() {
      _init_properties_CloseElement_kt__5e72ik();
      return CLOSED_SUCCESS;
    }
    var CLOSED_SUCCESS;
    function CloseElement(cause) {
      this.cause_1 = cause;
    }
    protoOf(CloseElement).get_cause_iplhs0_k$ = function () {
      return this.cause_1;
    };
    var properties_initialized_CloseElement_kt_clkism;
    function _init_properties_CloseElement_kt__5e72ik() {
      if (!properties_initialized_CloseElement_kt_clkism) {
        properties_initialized_CloseElement_kt_clkism = true;
        CLOSED_SUCCESS = new CloseElement(null);
      }
    }
    function WriterJob() {}
    function writer(_this__u8e3s4, coroutineContext, autoFlush, block) {
      coroutineContext = coroutineContext === VOID ? EmptyCoroutineContext_getInstance() : coroutineContext;
      autoFlush = autoFlush === VOID ? false : autoFlush;
      return launchChannel(_this__u8e3s4, coroutineContext, ByteChannel_0(autoFlush), true, block);
    }
    function WriterScope() {}
    function _get_delegate__idh0py($this) {
      return $this.delegate_1;
    }
    function ChannelJob(delegate, channel) {
      this.delegate_1 = delegate;
      this.channel_1 = channel;
    }
    protoOf(ChannelJob).get_channel_dhi7tm_k$ = function () {
      return this.channel_1;
    };
    protoOf(ChannelJob).get_children_4cwbp4_k$ = function () {
      return this.delegate_1.get_children_4cwbp4_k$();
    };
    protoOf(ChannelJob).get_isActive_quafmh_k$ = function () {
      return this.delegate_1.get_isActive_quafmh_k$();
    };
    protoOf(ChannelJob).get_isCancelled_trk8pu_k$ = function () {
      return this.delegate_1.get_isCancelled_trk8pu_k$();
    };
    protoOf(ChannelJob).get_isCompleted_a6j6c8_k$ = function () {
      return this.delegate_1.get_isCompleted_a6j6c8_k$();
    };
    protoOf(ChannelJob).get_key_18j28a_k$ = function () {
      return this.delegate_1.get_key_18j28a_k$();
    };
    protoOf(ChannelJob).get_onJoin_hnj4j6_k$ = function () {
      return this.delegate_1.get_onJoin_hnj4j6_k$();
    };
    protoOf(ChannelJob).get_parent_hy4reb_k$ = function () {
      return this.delegate_1.get_parent_hy4reb_k$();
    };
    protoOf(ChannelJob).attachChild_314ws0_k$ = function (child) {
      return this.delegate_1.attachChild_314ws0_k$(child);
    };
    protoOf(ChannelJob).cancel_2l89ey_k$ = function () {
      this.delegate_1.cancel_2l89ey_k$();
    };
    protoOf(ChannelJob).cancel_e74who_k$ = function (cause) {
      return this.delegate_1.cancel_e74who_k$(cause);
    };
    protoOf(ChannelJob).cancel_hkmm2i_k$ = function (cause) {
      this.delegate_1.cancel_hkmm2i_k$(cause);
    };
    protoOf(ChannelJob).fold_j2vaxd_k$ = function (initial, operation) {
      return this.delegate_1.fold_j2vaxd_k$(initial, operation);
    };
    protoOf(ChannelJob).get_y2st91_k$ = function (key) {
      return this.delegate_1.get_y2st91_k$(key);
    };
    protoOf(ChannelJob).getCancellationException_8i1q6u_k$ = function () {
      return this.delegate_1.getCancellationException_8i1q6u_k$();
    };
    protoOf(ChannelJob).invokeOnCompletion_sct3wq_k$ = function (onCancelling, invokeImmediately, handler) {
      return this.delegate_1.invokeOnCompletion_sct3wq_k$(onCancelling, invokeImmediately, handler);
    };
    protoOf(ChannelJob).invokeOnCompletion_n6cffu_k$ = function (handler) {
      return this.delegate_1.invokeOnCompletion_n6cffu_k$(handler);
    };
    protoOf(ChannelJob).join_o20dar_k$ = function ($completion) {
      return this.delegate_1.join_o20dar_k$($completion);
    };
    protoOf(ChannelJob).minusKey_9i5ggf_k$ = function (key) {
      return this.delegate_1.minusKey_9i5ggf_k$(key);
    };
    protoOf(ChannelJob).plus_s13ygv_k$ = function (context) {
      return this.delegate_1.plus_s13ygv_k$(context);
    };
    protoOf(ChannelJob).plus_x16axj_k$ = function (other) {
      return this.delegate_1.plus_x16axj_k$(other);
    };
    protoOf(ChannelJob).start_1tchgi_k$ = function () {
      return this.delegate_1.start_1tchgi_k$();
    };
    protoOf(ChannelJob).toString = function () {
      return 'ChannelJob[' + this.delegate_1 + ']';
    };
    function launchChannel(_this__u8e3s4, context, channel, attachJob, block) {
      var dispatcher = _this__u8e3s4.get_coroutineContext_115oqo_k$().get_y2st91_k$(Key_getInstance());
      var job = launch(
        _this__u8e3s4,
        context,
        VOID,
        launchChannel$slambda_0(attachJob, channel, block, dispatcher, null),
      );
      job.invokeOnCompletion_n6cffu_k$(launchChannel$lambda(channel));
      return new ChannelJob(job, channel);
    }
    function ReaderJob() {}
    function ChannelScope(delegate, channel) {
      this.channel_1 = channel;
      this.$$delegate_0__1 = delegate;
    }
    protoOf(ChannelScope).get_channel_dhi7tm_k$ = function () {
      return this.channel_1;
    };
    protoOf(ChannelScope).get_coroutineContext_115oqo_k$ = function () {
      return this.$$delegate_0__1.get_coroutineContext_115oqo_k$();
    };
    function ReaderScope() {}
    function launchChannel$slambda($attachJob, $channel, $block, $dispatcher, resultContinuation) {
      this.$attachJob_1 = $attachJob;
      this.$channel_1 = $channel;
      this.$block_1 = $block;
      this.$dispatcher_1 = $dispatcher;
      CoroutineImpl.call(this, resultContinuation);
    }
    protoOf(launchChannel$slambda).invoke_d9fzmj_k$ = function ($this$launch, $completion) {
      var tmp = this.create_rcuf4x_k$($this$launch, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(launchChannel$slambda).invoke_qns8j1_k$ = function (p1, $completion) {
      return this.invoke_d9fzmj_k$(
        (!(p1 == null) ? isInterface(p1, CoroutineScope) : false) ? p1 : THROW_CCE(),
        $completion,
      );
    };
    protoOf(launchChannel$slambda).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this.$attachJob_1) {
                this.$channel_1.attachJob_s2t2tl_k$(
                  ensureNotNull(
                    this.$this$launch_1.get_coroutineContext_115oqo_k$().get_y2st91_k$(Key_getInstance_0()),
                  ),
                );
              }

              var tmp_0 = this;
              var tmp_1 = new ChannelScope(this.$this$launch_1, this.$channel_1);
              tmp_0.scope0__1 = isInterface(tmp_1, CoroutineScope) ? tmp_1 : THROW_CCE();
              this.set_exceptionState_fex74n_k$(2);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this.$block_1(this.scope0__1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(4);
              continue $sm;
            case 2:
              this.set_exceptionState_fex74n_k$(3);
              var tmp_2 = this.get_exception_x0n6w6_k$();
              if (tmp_2 instanceof Error) {
                var cause = this.get_exception_x0n6w6_k$();
                if (
                  !equals(this.$dispatcher_1, Dispatchers_getInstance().get_Unconfined_sfvx0q_k$())
                    ? !(this.$dispatcher_1 == null)
                    : false
                ) {
                  throw cause;
                }
                this.$channel_1.cancel_e74who_k$(cause);
                this.set_state_rjd8d0_k$(4);
                continue $sm;
              } else {
                throw this.get_exception_x0n6w6_k$();
              }

            case 3:
              throw this.get_exception_x0n6w6_k$();
            case 4:
              this.set_exceptionState_fex74n_k$(3);
              return Unit_getInstance();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    protoOf(launchChannel$slambda).create_rcuf4x_k$ = function ($this$launch, completion) {
      var i = new launchChannel$slambda(
        this.$attachJob_1,
        this.$channel_1,
        this.$block_1,
        this.$dispatcher_1,
        completion,
      );
      i.$this$launch_1 = $this$launch;
      return i;
    };
    protoOf(launchChannel$slambda).create_wyq9v6_k$ = function (value, completion) {
      return this.create_rcuf4x_k$(
        (!(value == null) ? isInterface(value, CoroutineScope) : false) ? value : THROW_CCE(),
        completion,
      );
    };
    function launchChannel$slambda_0($attachJob, $channel, $block, $dispatcher, resultContinuation) {
      var i = new launchChannel$slambda($attachJob, $channel, $block, $dispatcher, resultContinuation);
      var l = function ($this$launch, $completion) {
        return i.invoke_d9fzmj_k$($this$launch, $completion);
      };
      l.$arity = 1;
      return l;
    }
    function launchChannel$lambda($channel) {
      return function (cause) {
        $channel.close_ukldxa_k$(cause);
        return Unit_getInstance();
      };
    }
    function unwrapCancellationException(_this__u8e3s4) {
      var exception = _this__u8e3s4;
      $l$loop: while (exception instanceof CancellationException) {
        if (equals(exception, exception.cause)) {
          return _this__u8e3s4;
        }
        var tmp0_elvis_lhs = exception.cause;
        var tmp;
        if (tmp0_elvis_lhs == null) {
          return exception;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        exception = tmp;
      }
      return exception;
    }
    function ReadSession() {}
    function SuspendableReadSession() {}
    function HasReadSession() {}
    function WriterSuspendSession() {}
    function HasWriteSession() {}
    function WriterSession() {}
    function get_highByte(_this__u8e3s4) {
      return toByte((_this__u8e3s4 >>> 8) | 0);
    }
    function get_lowByte(_this__u8e3s4) {
      return toByte(_this__u8e3s4 & 255);
    }
    function get_highInt(_this__u8e3s4) {
      return _this__u8e3s4.ushr_z7nmq8_k$(32).toInt_1tsl84_k$();
    }
    function get_lowInt(_this__u8e3s4) {
      return _this__u8e3s4.and_4spn93_k$(new Long(-1, 0)).toInt_1tsl84_k$();
    }
    function get_highShort(_this__u8e3s4) {
      return toShort((_this__u8e3s4 >>> 16) | 0);
    }
    function get_lowShort(_this__u8e3s4) {
      return toShort(_this__u8e3s4 & 65535);
    }
    function get(_this__u8e3s4, index) {
      // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
      return _this__u8e3s4.get_view_wow8a6_k$().getInt8(index);
    }
    function set(_this__u8e3s4, index, value) {
      _this__u8e3s4.get_view_wow8a6_k$().setInt8(index, value);
      return Unit_getInstance();
    }
    function Allocator() {}
    function storeByteArray(_this__u8e3s4, offset, source, sourceOffset, count) {
      sourceOffset = sourceOffset === VOID ? 0 : sourceOffset;
      count = count === VOID ? (source.length - sourceOffset) | 0 : count;
      // Inline function 'io.ktor.utils.io.bits.useMemory' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      of(Companion_getInstance_6(), source, sourceOffset, count).copyTo_fgxuoj_k$(_this__u8e3s4, 0, count, offset);
    }
    function loadByteArray(_this__u8e3s4, offset, destination, destinationOffset, count) {
      destinationOffset = destinationOffset === VOID ? 0 : destinationOffset;
      count = count === VOID ? (destination.length - destinationOffset) | 0 : count;
      copyTo_2(_this__u8e3s4, destination, offset, count, destinationOffset);
    }
    function decode(_this__u8e3s4, input, max) {
      max = max === VOID ? IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$() : max;
      // Inline function 'kotlin.text.buildString' call
      // Inline function 'kotlin.comparisons.minOf' call
      var a = toLong(max);
      var b = sizeEstimate(input);
      var capacity = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.apply' call
      var this_0 = StringBuilder_init_$Create$_0(capacity);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.charsets.decode.<anonymous>' call
      decode_0(_this__u8e3s4, input, this_0, max);
      return this_0.toString();
    }
    function encodeToImpl(_this__u8e3s4, destination, input, fromIndex, toIndex) {
      var start = fromIndex;
      if (start >= toIndex) return 0;
      var bytesWritten = 0;
      // Inline function 'io.ktor.utils.io.core.writeWhileSize' call
      var tail = prepareWriteHead(destination, 1, null);
      try {
        var size;
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.charsets.encodeToImpl.<anonymous>' call
          var view = tail;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          var before = (view.get_limit_iuokuq_k$() - view.get_writePosition_jdt81t_k$()) | 0;
          var rc = encodeImpl(_this__u8e3s4, input, start, toIndex, view);
          // Inline function 'kotlin.check' call
          // Inline function 'kotlin.contracts.contract' call
          // Inline function 'kotlin.check' call
          // Inline function 'kotlin.contracts.contract' call
          if (!(rc >= 0)) {
            // Inline function 'kotlin.check.<anonymous>' call
            var message = 'Check failed.';
            throw IllegalStateException_init_$Create$(toString(message));
          }
          start = (start + rc) | 0;
          var tmp = bytesWritten;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          bytesWritten =
            (tmp + ((before - ((view.get_limit_iuokuq_k$() - view.get_writePosition_jdt81t_k$()) | 0)) | 0)) | 0;
          size = start >= toIndex ? 0 : rc === 0 ? 8 : 1;
          if (size <= 0) break $l$loop;
          tail = prepareWriteHead(destination, size, tail);
        }
      } finally {
        destination.afterHeadWrite_dl47zh_k$();
      }
      bytesWritten = (bytesWritten + encodeCompleteImpl(_this__u8e3s4, destination)) | 0;
      return bytesWritten;
    }
    function sizeEstimate(_this__u8e3s4) {
      var tmp;
      if (_this__u8e3s4 instanceof ByteReadPacket) {
        tmp = _this__u8e3s4.get_remaining_mwegr1_k$();
      } else {
        // Inline function 'kotlin.comparisons.maxOf' call
        var a = _this__u8e3s4.get_remaining_mwegr1_k$();
        var b = new Long(16, 0);
        tmp = a.compareTo_9jj042_k$(b) >= 0 ? a : b;
      }
      return tmp;
    }
    function encodeCompleteImpl(_this__u8e3s4, dst) {
      var size = 1;
      var bytesWritten = 0;
      // Inline function 'io.ktor.utils.io.core.writeWhile' call
      var tail = prepareWriteHead(dst, 1, null);
      try {
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.charsets.encodeCompleteImpl.<anonymous>' call
          var view = tail;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          var before = (view.get_limit_iuokuq_k$() - view.get_writePosition_jdt81t_k$()) | 0;
          if (encodeComplete(_this__u8e3s4, view)) {
            size = 0;
          } else {
            size = (size + 1) | 0;
          }
          var tmp = bytesWritten;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          bytesWritten =
            (tmp + ((before - ((view.get_limit_iuokuq_k$() - view.get_writePosition_jdt81t_k$()) | 0)) | 0)) | 0;
          if (!(size > 0)) break $l$loop;
          tail = prepareWriteHead(dst, 1, tail);
        }
      } finally {
        dst.afterHeadWrite_dl47zh_k$();
      }
      return bytesWritten;
    }
    function TooLongLineException(message) {
      MalformedInputException.call(this, message);
      captureStack(this, TooLongLineException);
    }
    function encode(_this__u8e3s4, input, fromIndex, toIndex, dst) {
      var start = fromIndex;
      if (start >= toIndex) return Unit_getInstance();
      // Inline function 'io.ktor.utils.io.core.writeWhileSize' call
      var tail = prepareWriteHead(dst, 1, null);
      try {
        var size;
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.charsets.encode.<anonymous>' call
          var view = tail;
          var rc = encodeArrayImpl(_this__u8e3s4, input, start, toIndex, view);
          // Inline function 'kotlin.check' call
          // Inline function 'kotlin.contracts.contract' call
          // Inline function 'kotlin.check' call
          // Inline function 'kotlin.contracts.contract' call
          if (!(rc >= 0)) {
            // Inline function 'kotlin.check.<anonymous>' call
            var message = 'Check failed.';
            throw IllegalStateException_init_$Create$(toString(message));
          }
          start = (start + rc) | 0;
          size = start >= toIndex ? 0 : rc === 0 ? 8 : 1;
          if (size <= 0) break $l$loop;
          tail = prepareWriteHead(dst, size, tail);
        }
      } finally {
        dst.afterHeadWrite_dl47zh_k$();
      }
      encodeCompleteImpl(_this__u8e3s4, dst);
    }
    function encodeArrayImpl(_this__u8e3s4, input, fromIndex, toIndex, dst) {
      var length = (toIndex - fromIndex) | 0;
      return encodeImpl(_this__u8e3s4, new CharArraySequence(input, fromIndex, length), 0, length, dst);
    }
    function encode_0(_this__u8e3s4, input, fromIndex, toIndex) {
      fromIndex = fromIndex === VOID ? 0 : fromIndex;
      toIndex = toIndex === VOID ? charSequenceLength(input) : toIndex;
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.buildPacket' call
        // Inline function 'kotlin.contracts.contract' call
        var builder = new BytePacketBuilder();
        try {
          // Inline function 'io.ktor.utils.io.charsets.encode.<anonymous>' call
          encodeToImpl(_this__u8e3s4, builder, input, fromIndex, toIndex);
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
      return tmp$ret$0;
    }
    function _set_readPosition__n6qkdk($this, _set____db54di) {
      $this.readPosition_1 = _set____db54di;
    }
    function _set_writePosition__sxej31($this, _set____db54di) {
      $this.writePosition_1 = _set____db54di;
    }
    function _set_startGap__236j43($this, _set____db54di) {
      $this.startGap_1 = _set____db54di;
    }
    function _set_limit__hazgmi($this, _set____db54di) {
      $this.limit_1 = _set____db54di;
    }
    function Companion() {
      Companion_instance = this;
      this.ReservedSize_1 = 8;
    }
    protoOf(Companion).get_ReservedSize_b4jt5a_k$ = function () {
      return this.ReservedSize_1;
    };
    protoOf(Companion).get_Empty_i9b85g_k$ = function () {
      return Companion_getInstance_4().get_Empty_i9b85g_k$();
    };
    var Companion_instance;
    function Companion_getInstance_1() {
      if (Companion_instance == null) new Companion();
      return Companion_instance;
    }
    function Buffer(memory) {
      Companion_getInstance_1();
      this.memory_1 = memory;
      this.readPosition_1 = 0;
      this.writePosition_1 = 0;
      this.startGap_1 = 0;
      var tmp = this;
      // Inline function 'io.ktor.utils.io.bits.Memory.size32' call
      tmp.limit_1 = this.memory_1.get_view_wow8a6_k$().byteLength;
      var tmp_0 = this;
      // Inline function 'io.ktor.utils.io.bits.Memory.size32' call
      tmp_0.capacity_1 = this.memory_1.get_view_wow8a6_k$().byteLength;
    }
    protoOf(Buffer).get_memory_gl4362_k$ = function () {
      return this.memory_1;
    };
    protoOf(Buffer).get_readPosition_70qxnc_k$ = function () {
      return this.readPosition_1;
    };
    protoOf(Buffer).get_writePosition_jdt81t_k$ = function () {
      return this.writePosition_1;
    };
    protoOf(Buffer).get_startGap_a0yplv_k$ = function () {
      return this.startGap_1;
    };
    protoOf(Buffer).get_limit_iuokuq_k$ = function () {
      return this.limit_1;
    };
    protoOf(Buffer).get_endGap_cxioec_k$ = function () {
      return (this.capacity_1 - this.limit_1) | 0;
    };
    protoOf(Buffer).get_capacity_wxbgcd_k$ = function () {
      return this.capacity_1;
    };
    protoOf(Buffer).get_readRemaining_ieclyh_k$ = function () {
      return (this.writePosition_1 - this.readPosition_1) | 0;
    };
    protoOf(Buffer).get_writeRemaining_ojcrfk_k$ = function () {
      return (this.limit_1 - this.writePosition_1) | 0;
    };
    protoOf(Buffer).discardExact_11sae1_k$ = function (count) {
      if (count === 0) return Unit_getInstance();
      var newReadPosition = (this.readPosition_1 + count) | 0;
      if (count < 0 ? true : newReadPosition > this.writePosition_1) {
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var tmp$ret$1 = (this.writePosition_1 - this.readPosition_1) | 0;
        discardFailed(count, tmp$ret$1);
      }
      this.readPosition_1 = newReadPosition;
    };
    protoOf(Buffer).discardExact$default_ilucj7_k$ = function (count, $super) {
      var tmp;
      if (count === VOID) {
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        tmp = (this.writePosition_1 - this.readPosition_1) | 0;
      } else {
        tmp = count;
      }
      count = tmp;
      var tmp_0;
      if ($super === VOID) {
        this.discardExact_11sae1_k$(count);
        tmp_0 = Unit_getInstance();
      } else {
        tmp_0 = $super.discardExact_11sae1_k$.call(this, count);
      }
      return tmp_0;
    };
    protoOf(Buffer).commitWritten_tkztjs_k$ = function (count) {
      var newWritePosition = (this.writePosition_1 + count) | 0;
      if (count < 0 ? true : newWritePosition > this.limit_1) {
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        var tmp$ret$0 = (this.limit_1 - this.writePosition_1) | 0;
        commitWrittenFailed(count, tmp$ret$0);
      }
      this.writePosition_1 = newWritePosition;
    };
    protoOf(Buffer).commitWrittenUntilIndex_umptfg_k$ = function (position) {
      var limit = this.limit_1;
      if (position < this.writePosition_1) {
        var tmp = (position - this.writePosition_1) | 0;
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        var tmp$ret$0 = (this.limit_1 - this.writePosition_1) | 0;
        commitWrittenFailed(tmp, tmp$ret$0);
      }
      if (position >= limit) {
        if (position === limit) {
          this.writePosition_1 = position;
          return false;
        }
        var tmp_0 = (position - this.writePosition_1) | 0;
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        var tmp$ret$1 = (this.limit_1 - this.writePosition_1) | 0;
        commitWrittenFailed(tmp_0, tmp$ret$1);
      }
      this.writePosition_1 = position;
      return true;
    };
    protoOf(Buffer).discardUntilIndex_z86prq_k$ = function (position) {
      if (position < 0 ? true : position > this.writePosition_1) {
        var tmp = (position - this.readPosition_1) | 0;
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var tmp$ret$0 = (this.writePosition_1 - this.readPosition_1) | 0;
        discardFailed(tmp, tmp$ret$0);
      }
      if (!(this.readPosition_1 === position)) {
        this.readPosition_1 = position;
      }
    };
    protoOf(Buffer).rewind_gfqr1p_k$ = function (count) {
      var newReadPosition = (this.readPosition_1 - count) | 0;
      if (newReadPosition < this.startGap_1) {
        rewindFailed(count, (this.readPosition_1 - this.startGap_1) | 0);
      }
      this.readPosition_1 = newReadPosition;
    };
    protoOf(Buffer).rewind$default_x2qhrh_k$ = function (count, $super) {
      count = count === VOID ? (this.readPosition_1 - this.startGap_1) | 0 : count;
      var tmp;
      if ($super === VOID) {
        this.rewind_gfqr1p_k$(count);
        tmp = Unit_getInstance();
      } else {
        tmp = $super.rewind_gfqr1p_k$.call(this, count);
      }
      return tmp;
    };
    protoOf(Buffer).reserveStartGap_819mco_k$ = function (startGap) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(startGap >= 0)) {
        // Inline function 'io.ktor.utils.io.core.Buffer.reserveStartGap.<anonymous>' call
        var message = "startGap shouldn't be negative: " + startGap;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      if (this.readPosition_1 >= startGap) {
        this.startGap_1 = startGap;
        return Unit_getInstance();
      }
      if (this.readPosition_1 === this.writePosition_1) {
        if (startGap > this.limit_1) {
          startGapReservationFailedDueToLimit(this, startGap);
        }
        this.writePosition_1 = startGap;
        this.readPosition_1 = startGap;
        this.startGap_1 = startGap;
        return Unit_getInstance();
      }
      startGapReservationFailed(this, startGap);
    };
    protoOf(Buffer).reserveEndGap_i4z3fz_k$ = function (endGap) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(endGap >= 0)) {
        // Inline function 'io.ktor.utils.io.core.Buffer.reserveEndGap.<anonymous>' call
        var message = "endGap shouldn't be negative: " + endGap;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      var newLimit = (this.capacity_1 - endGap) | 0;
      if (newLimit >= this.writePosition_1) {
        this.limit_1 = newLimit;
        return Unit_getInstance();
      }
      if (newLimit < 0) {
        endGapReservationFailedDueToCapacity(this, endGap);
      }
      if (newLimit < this.startGap_1) {
        endGapReservationFailedDueToStartGap(this, endGap);
      }
      if (this.readPosition_1 === this.writePosition_1) {
        this.limit_1 = newLimit;
        this.readPosition_1 = newLimit;
        this.writePosition_1 = newLimit;
        return Unit_getInstance();
      }
      endGapReservationFailedDueToContent(this, endGap);
    };
    protoOf(Buffer).resetForRead_c5oulc_k$ = function () {
      this.startGap_1 = 0;
      this.readPosition_1 = 0;
      var capacity = this.capacity_1;
      this.writePosition_1 = capacity;
    };
    protoOf(Buffer).resetForWrite_2oalv9_k$ = function () {
      this.resetForWrite_c461wd_k$((this.capacity_1 - this.startGap_1) | 0);
    };
    protoOf(Buffer).resetForWrite_c461wd_k$ = function (limit) {
      var startGap = this.startGap_1;
      this.readPosition_1 = startGap;
      this.writePosition_1 = startGap;
      this.limit_1 = limit;
    };
    protoOf(Buffer).releaseGaps_35izt8_k$ = function () {
      this.releaseStartGap_da07al_k$(0);
      this.releaseEndGap_v6rgnm_k$();
    };
    protoOf(Buffer).releaseEndGap_v6rgnm_k$ = function () {
      this.limit_1 = this.capacity_1;
    };
    protoOf(Buffer).releaseStartGap_da07al_k$ = function (newReadPosition) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(newReadPosition >= 0)) {
        // Inline function 'io.ktor.utils.io.core.Buffer.releaseStartGap.<anonymous>' call
        var message = "newReadPosition shouldn't be negative: " + newReadPosition;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(newReadPosition <= this.readPosition_1)) {
        // Inline function 'io.ktor.utils.io.core.Buffer.releaseStartGap.<anonymous>' call
        var message_0 =
          "newReadPosition shouldn't be ahead of the read position: " + newReadPosition + ' > ' + this.readPosition_1;
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      this.readPosition_1 = newReadPosition;
      if (this.startGap_1 > newReadPosition) {
        this.startGap_1 = newReadPosition;
      }
    };
    protoOf(Buffer).duplicateTo_5gqm85_k$ = function (copy) {
      copy.limit_1 = this.limit_1;
      copy.startGap_1 = this.startGap_1;
      copy.readPosition_1 = this.readPosition_1;
      copy.writePosition_1 = this.writePosition_1;
    };
    protoOf(Buffer).duplicate_jvgc97_k$ = function () {
      // Inline function 'kotlin.apply' call
      var this_0 = new Buffer(this.memory_1);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.Buffer.duplicate.<anonymous>' call
      this_0.duplicateTo_5gqm85_k$(this_0);
      return this_0;
    };
    protoOf(Buffer).tryPeekByte_ple8ke_k$ = function () {
      var readPosition = this.readPosition_1;
      if (readPosition === this.writePosition_1) return -1;
      // Inline function 'io.ktor.utils.io.bits.get' call
      // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
      return this.memory_1.get_view_wow8a6_k$().getInt8(readPosition) & 255;
    };
    protoOf(Buffer).tryReadByte_a7i2zd_k$ = function () {
      var readPosition = this.readPosition_1;
      if (readPosition === this.writePosition_1) return -1;
      this.readPosition_1 = (readPosition + 1) | 0;
      // Inline function 'io.ktor.utils.io.bits.get' call
      // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
      return this.memory_1.get_view_wow8a6_k$().getInt8(readPosition) & 255;
    };
    protoOf(Buffer).readByte_ectjk2_k$ = function () {
      var readPosition = this.readPosition_1;
      if (readPosition === this.writePosition_1) {
        throw new EOFException('No readable bytes available.');
      }
      this.readPosition_1 = (readPosition + 1) | 0;
      // Inline function 'io.ktor.utils.io.bits.get' call
      // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
      return this.memory_1.get_view_wow8a6_k$().getInt8(readPosition);
    };
    protoOf(Buffer).writeByte_9ih3z3_k$ = function (value) {
      var writePosition = this.writePosition_1;
      if (writePosition === this.limit_1) {
        throw new InsufficientSpaceException('No free space in the buffer to write a byte');
      }
      // Inline function 'io.ktor.utils.io.bits.set' call
      this.memory_1.get_view_wow8a6_k$().setInt8(writePosition, value);
      this.writePosition_1 = (writePosition + 1) | 0;
    };
    protoOf(Buffer).reset_5u6xz3_k$ = function () {
      this.releaseGaps_35izt8_k$();
      this.resetForWrite_2oalv9_k$();
    };
    protoOf(Buffer).toString = function () {
      var tmp = 'Buffer[0x' + toString_0(hashCode(this), 16) + ']';
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var tmp_0 = (this.writePosition_1 - this.readPosition_1) | 0;
      // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
      var tmp_1 = (this.limit_1 - this.writePosition_1) | 0;
      var tmp_2 = this.startGap_1;
      // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
      return (
        tmp +
        ('(' +
          tmp_0 +
          ' used, ' +
          tmp_1 +
          ' free, ' +
          ((tmp_2 + ((this.capacity_1 - this.limit_1) | 0)) | 0) +
          ' reserved of ' +
          this.capacity_1 +
          ')')
      );
    };
    function discardFailed(count, readRemaining) {
      throw new EOFException('Unable to discard ' + count + ' bytes: only ' + readRemaining + ' available for reading');
    }
    function commitWrittenFailed(count, writeRemaining) {
      throw new EOFException(
        'Unable to discard ' + count + ' bytes: only ' + writeRemaining + ' available for writing',
      );
    }
    function rewindFailed(count, rewindRemaining) {
      throw IllegalArgumentException_init_$Create$(
        'Unable to rewind ' + count + ' bytes: only ' + rewindRemaining + ' could be rewinded',
      );
    }
    function startGapReservationFailedDueToLimit(_this__u8e3s4, startGap) {
      if (startGap > _this__u8e3s4.capacity_1) {
        throw IllegalArgumentException_init_$Create$(
          'Start gap ' + startGap + ' is bigger than the capacity ' + _this__u8e3s4.capacity_1,
        );
      }
      // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
      var tmp$ret$0 = (_this__u8e3s4.capacity_1 - _this__u8e3s4.limit_1) | 0;
      throw IllegalStateException_init_$Create$(
        'Unable to reserve ' + startGap + ' start gap: there are already ' + tmp$ret$0 + ' bytes reserved in the end',
      );
    }
    function startGapReservationFailed(_this__u8e3s4, startGap) {
      var tmp = 'Unable to reserve ' + startGap + ' start gap: ';
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var tmp$ret$0 = (_this__u8e3s4.writePosition_1 - _this__u8e3s4.readPosition_1) | 0;
      throw IllegalStateException_init_$Create$(
        tmp + ('there are already ' + tmp$ret$0 + ' content bytes starting at offset ' + _this__u8e3s4.readPosition_1),
      );
    }
    function endGapReservationFailedDueToCapacity(_this__u8e3s4, endGap) {
      throw IllegalArgumentException_init_$Create$(
        'End gap ' + endGap + ' is too big: capacity is ' + _this__u8e3s4.capacity_1,
      );
    }
    function endGapReservationFailedDueToStartGap(_this__u8e3s4, endGap) {
      throw IllegalArgumentException_init_$Create$(
        'End gap ' +
          endGap +
          ' is too big: there are already ' +
          _this__u8e3s4.startGap_1 +
          ' bytes reserved in the beginning',
      );
    }
    function endGapReservationFailedDueToContent(_this__u8e3s4, endGap) {
      var tmp = 'Unable to reserve end gap ' + endGap + ':';
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var tmp$ret$0 = (_this__u8e3s4.writePosition_1 - _this__u8e3s4.readPosition_1) | 0;
      throw IllegalArgumentException_init_$Create$(
        tmp + (' there are already ' + tmp$ret$0 + ' content bytes at offset ' + _this__u8e3s4.readPosition_1),
      );
    }
    function InsufficientSpaceException_init_$Init$(size, availableSpace, $this) {
      InsufficientSpaceException.call(
        $this,
        'Not enough free space to write ' + size + ' bytes, available ' + availableSpace + ' bytes.',
      );
      return $this;
    }
    function InsufficientSpaceException_init_$Create$(size, availableSpace) {
      var tmp = InsufficientSpaceException_init_$Init$(
        size,
        availableSpace,
        objectCreate(protoOf(InsufficientSpaceException)),
      );
      captureStack(tmp, InsufficientSpaceException_init_$Create$);
      return tmp;
    }
    function InsufficientSpaceException_init_$Init$_0(name, size, availableSpace, $this) {
      InsufficientSpaceException.call(
        $this,
        'Not enough free space to write ' + name + ' of ' + size + ' bytes, available ' + availableSpace + ' bytes.',
      );
      return $this;
    }
    function InsufficientSpaceException_init_$Create$_0(name, size, availableSpace) {
      var tmp = InsufficientSpaceException_init_$Init$_0(
        name,
        size,
        availableSpace,
        objectCreate(protoOf(InsufficientSpaceException)),
      );
      captureStack(tmp, InsufficientSpaceException_init_$Create$_0);
      return tmp;
    }
    function InsufficientSpaceException_init_$Init$_1(size, availableSpace, $this) {
      InsufficientSpaceException.call(
        $this,
        'Not enough free space to write ' +
          size.toString() +
          ' bytes, available ' +
          availableSpace.toString() +
          ' bytes.',
      );
      return $this;
    }
    function InsufficientSpaceException_init_$Create$_1(size, availableSpace) {
      var tmp = InsufficientSpaceException_init_$Init$_1(
        size,
        availableSpace,
        objectCreate(protoOf(InsufficientSpaceException)),
      );
      captureStack(tmp, InsufficientSpaceException_init_$Create$_1);
      return tmp;
    }
    function InsufficientSpaceException(message) {
      message = message === VOID ? 'Not enough free space' : message;
      Exception_init_$Init$(message, this);
      captureStack(this, InsufficientSpaceException);
    }
    function restoreStartGap(_this__u8e3s4, size) {
      _this__u8e3s4.releaseStartGap_da07al_k$((_this__u8e3s4.readPosition_1 - size) | 0);
    }
    function canRead(_this__u8e3s4) {
      return _this__u8e3s4.writePosition_1 > _this__u8e3s4.readPosition_1;
    }
    function write(_this__u8e3s4, block) {
      // Inline function 'kotlin.contracts.contract' call
      var rc = block(_this__u8e3s4.memory_1, _this__u8e3s4.writePosition_1, _this__u8e3s4.limit_1);
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
      return rc;
    }
    function read(_this__u8e3s4, block) {
      // Inline function 'kotlin.contracts.contract' call
      var rc = block(_this__u8e3s4.memory_1, _this__u8e3s4.readPosition_1, _this__u8e3s4.writePosition_1);
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return rc;
    }
    function writeBufferAppend(_this__u8e3s4, other, maxSize) {
      // Inline function 'kotlin.comparisons.minOf' call
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var a = (other.get_writePosition_jdt81t_k$() - other.get_readPosition_70qxnc_k$()) | 0;
      var size = Math.min(a, maxSize);
      // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
      if (((_this__u8e3s4.get_limit_iuokuq_k$() - _this__u8e3s4.get_writePosition_jdt81t_k$()) | 0) <= size) {
        writeBufferAppendUnreserve(_this__u8e3s4, size);
      }
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeBufferAppend.<anonymous>' call
      var dst = _this__u8e3s4.get_memory_gl4362_k$();
      var dstOffset = _this__u8e3s4.get_writePosition_jdt81t_k$();
      _this__u8e3s4.get_limit_iuokuq_k$();
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeBufferAppend.<anonymous>.<anonymous>' call
      var src = other.get_memory_gl4362_k$();
      var srcOffset = other.get_readPosition_70qxnc_k$();
      other.get_writePosition_jdt81t_k$();
      src.copyTo_fgxuoj_k$(dst, srcOffset, size, dstOffset);
      var rc = size;
      other.discardExact_11sae1_k$(rc);
      var rc_0 = rc;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc_0);
      return rc_0;
    }
    function writeBufferAppendUnreserve(_this__u8e3s4, writeSize) {
      // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
      var tmp = (_this__u8e3s4.get_limit_iuokuq_k$() - _this__u8e3s4.get_writePosition_jdt81t_k$()) | 0;
      // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
      if (
        ((tmp + ((_this__u8e3s4.get_capacity_wxbgcd_k$() - _this__u8e3s4.get_limit_iuokuq_k$()) | 0)) | 0) <
        writeSize
      ) {
        throw IllegalArgumentException_init_$Create$("Can't append buffer: not enough free space at the end");
      }
      var newWritePosition = (_this__u8e3s4.get_writePosition_jdt81t_k$() + writeSize) | 0;
      var overrunSize = (newWritePosition - _this__u8e3s4.get_limit_iuokuq_k$()) | 0;
      if (overrunSize > 0) {
        _this__u8e3s4.releaseEndGap_v6rgnm_k$();
      }
    }
    function writeBufferPrepend(_this__u8e3s4, other) {
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var size = (other.get_writePosition_jdt81t_k$() - other.get_readPosition_70qxnc_k$()) | 0;
      var readPosition = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (readPosition < size) {
        throw IllegalArgumentException_init_$Create$('Not enough space in the beginning to prepend bytes');
      }
      var newReadPosition = (readPosition - size) | 0;
      other
        .get_memory_gl4362_k$()
        .copyTo_fgxuoj_k$(
          _this__u8e3s4.get_memory_gl4362_k$(),
          other.get_readPosition_70qxnc_k$(),
          size,
          newReadPosition,
        );
      other.discardExact_11sae1_k$(size);
      _this__u8e3s4.releaseStartGap_da07al_k$(newReadPosition);
      return size;
    }
    function get_DefaultChunkedBufferPool() {
      _init_properties_BufferFactory_kt__uj6b48();
      return DefaultChunkedBufferPool;
    }
    var DefaultChunkedBufferPool;
    function _get_bufferSize__mp12kq($this) {
      return $this.bufferSize_1;
    }
    function _get_allocator__hrvkpy($this) {
      return $this.allocator_1;
    }
    function DefaultBufferPool(bufferSize, capacity, allocator) {
      bufferSize = bufferSize === VOID ? 4096 : bufferSize;
      capacity = capacity === VOID ? 1000 : capacity;
      allocator = allocator === VOID ? DefaultAllocator_getInstance() : allocator;
      DefaultPool.call(this, capacity);
      this.bufferSize_1 = bufferSize;
      this.allocator_1 = allocator;
    }
    protoOf(DefaultBufferPool).produceInstance_xswihh_k$ = function () {
      return new ChunkBuffer(this.allocator_1.alloc_l8bx4z_k$(this.bufferSize_1), null, this);
    };
    protoOf(DefaultBufferPool).disposeInstance_w21bki_k$ = function (instance) {
      this.allocator_1.free_r48ke1_k$(instance.get_memory_gl4362_k$());
      protoOf(DefaultPool).disposeInstance_6ek0a2_k$.call(this, instance);
      instance.unlink_ie9ubh_k$();
    };
    protoOf(DefaultBufferPool).disposeInstance_6ek0a2_k$ = function (instance) {
      return this.disposeInstance_w21bki_k$(instance instanceof ChunkBuffer ? instance : THROW_CCE());
    };
    protoOf(DefaultBufferPool).validateInstance_bdsdgl_k$ = function (instance) {
      protoOf(DefaultPool).validateInstance_6mwbhp_k$.call(this, instance);
      // Inline function 'kotlin.check' call
      // Inline function 'io.ktor.utils.io.bits.Memory.size' call
      var this_0 = instance.get_memory_gl4362_k$();
      // Inline function 'kotlin.contracts.contract' call
      if (!toLong(this_0.get_view_wow8a6_k$().byteLength).equals(toLong(this.bufferSize_1))) {
        // Inline function 'io.ktor.utils.io.core.DefaultBufferPool.validateInstance.<anonymous>' call
        // Inline function 'io.ktor.utils.io.bits.Memory.size' call
        var this_1 = instance.get_memory_gl4362_k$();
        var tmp$ret$1 = toLong(this_1.get_view_wow8a6_k$().byteLength);
        var message = 'Buffer size mismatch. Expected: ' + this.bufferSize_1 + ', actual: ' + tmp$ret$1.toString();
        throw IllegalStateException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!(instance === Companion_getInstance_4().get_Empty_i9b85g_k$())) {
        // Inline function 'io.ktor.utils.io.core.DefaultBufferPool.validateInstance.<anonymous>' call
        var message_0 = "ChunkBuffer.Empty couldn't be recycled";
        throw IllegalStateException_init_$Create$(toString(message_0));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!(instance === Companion_getInstance_1().get_Empty_i9b85g_k$())) {
        // Inline function 'io.ktor.utils.io.core.DefaultBufferPool.validateInstance.<anonymous>' call
        var message_1 = "Empty instance couldn't be recycled";
        throw IllegalStateException_init_$Create$(toString(message_1));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(instance.get_referenceCount_1ialcd_k$() === 0)) {
        // Inline function 'io.ktor.utils.io.core.DefaultBufferPool.validateInstance.<anonymous>' call
        var message_2 = 'Unable to clear buffer: it is still in use.';
        throw IllegalStateException_init_$Create$(toString(message_2));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(instance.get_next_wor1vg_k$() == null)) {
        // Inline function 'io.ktor.utils.io.core.DefaultBufferPool.validateInstance.<anonymous>' call
        var message_3 = "Recycled instance shouldn't be a part of a chain.";
        throw IllegalStateException_init_$Create$(toString(message_3));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(instance.get_origin_hq9xkf_k$() == null)) {
        // Inline function 'io.ktor.utils.io.core.DefaultBufferPool.validateInstance.<anonymous>' call
        var message_4 = "Recycled instance shouldn't be a view or another buffer.";
        throw IllegalStateException_init_$Create$(toString(message_4));
      }
    };
    protoOf(DefaultBufferPool).validateInstance_6mwbhp_k$ = function (instance) {
      return this.validateInstance_bdsdgl_k$(instance instanceof ChunkBuffer ? instance : THROW_CCE());
    };
    protoOf(DefaultBufferPool).clearInstance_c8rk5w_k$ = function (instance) {
      // Inline function 'kotlin.apply' call
      var this_0 = protoOf(DefaultPool).clearInstance_nfz4jw_k$.call(this, instance);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.DefaultBufferPool.clearInstance.<anonymous>' call
      this_0.unpark_bsw1f_k$();
      this_0.reset_5u6xz3_k$();
      return this_0;
    };
    protoOf(DefaultBufferPool).clearInstance_nfz4jw_k$ = function (instance) {
      return this.clearInstance_c8rk5w_k$(instance instanceof ChunkBuffer ? instance : THROW_CCE());
    };
    function get_DEFAULT_BUFFER_SIZE() {
      return DEFAULT_BUFFER_SIZE;
    }
    var DEFAULT_BUFFER_SIZE;
    var properties_initialized_BufferFactory_kt_q9tgbq;
    function _init_properties_BufferFactory_kt__uj6b48() {
      if (!properties_initialized_BufferFactory_kt_q9tgbq) {
        properties_initialized_BufferFactory_kt_q9tgbq = true;
        DefaultChunkedBufferPool = new DefaultBufferPool();
      }
    }
    function writeFully(_this__u8e3s4, source, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (source.length - offset) | 0 : length;
      // Inline function 'io.ktor.utils.io.core.writeExact' call
      var name = 'byte array';
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var writeRemaining = (_this__u8e3s4.get_limit_iuokuq_k$() - start) | 0;
      if (writeRemaining < length) {
        throw InsufficientSpaceException_init_$Create$_0(name, length, writeRemaining);
      }
      // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.storeByteArray' call
      // Inline function 'io.ktor.utils.io.bits.useMemory' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      of(Companion_getInstance_6(), source, offset, length).copyTo_fgxuoj_k$(memory, 0, length, start);
      var rc = length;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
    }
    function writeFully_0(_this__u8e3s4, src, length) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(length >= 0)) {
        // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
        var message = "length shouldn't be negative: " + length;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(length <= ((src.get_writePosition_jdt81t_k$() - src.get_readPosition_70qxnc_k$()) | 0))) {
        // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var message_0 =
          "length shouldn't be greater than the source read remaining: " +
          length +
          ' > ' +
          ((src.get_writePosition_jdt81t_k$() - src.get_readPosition_70qxnc_k$()) | 0);
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(length <= ((_this__u8e3s4.get_limit_iuokuq_k$() - _this__u8e3s4.get_writePosition_jdt81t_k$()) | 0))) {
        // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        var message_1 =
          "length shouldn't be greater than the destination write remaining space: " +
          length +
          ' > ' +
          ((_this__u8e3s4.get_limit_iuokuq_k$() - _this__u8e3s4.get_writePosition_jdt81t_k$()) | 0);
        throw IllegalArgumentException_init_$Create$(toString(message_1));
      }
      // Inline function 'io.ktor.utils.io.core.writeExact' call
      var name = 'buffer readable content';
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var writeRemaining = (_this__u8e3s4.get_limit_iuokuq_k$() - start) | 0;
      if (writeRemaining < length) {
        throw InsufficientSpaceException_init_$Create$_0(name, length, writeRemaining);
      }
      // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
      src.get_memory_gl4362_k$().copyTo_fgxuoj_k$(memory, src.get_readPosition_70qxnc_k$(), length, start);
      src.discardExact_11sae1_k$(length);
      var rc = length;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
    }
    function readFully_0(_this__u8e3s4, destination, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (destination.length - offset) | 0 : length;
      readFully_1(_this__u8e3s4 instanceof Buffer ? _this__u8e3s4 : THROW_CCE(), destination, offset, length);
    }
    function writeExact(_this__u8e3s4, size, name, block) {
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var writeRemaining = (_this__u8e3s4.get_limit_iuokuq_k$() - start) | 0;
      if (writeRemaining < size) {
        throw InsufficientSpaceException_init_$Create$_0(name, size, writeRemaining);
      }
      block(memory, start);
      var rc = size;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
    }
    function readFully_1(_this__u8e3s4, destination, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (destination.length - offset) | 0 : length;
      // Inline function 'io.ktor.utils.io.core.readExact' call
      var name = 'byte array';
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < length) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + length + '.');
      }
      copyTo_2(memory, destination, start, length, offset);
      value = Unit_getInstance();
      var rc = length;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
    }
    function readExact(_this__u8e3s4, size, name, block) {
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < size) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + size + '.');
      }
      value = block(memory, start);
      var rc = size;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return value;
    }
    function readFully_2(_this__u8e3s4, dst, length) {
      var tmp;
      if (length === VOID) {
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        tmp = (dst.get_limit_iuokuq_k$() - dst.get_writePosition_jdt81t_k$()) | 0;
      } else {
        tmp = length;
      }
      length = tmp;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(length >= 0)) {
        // Inline function 'kotlin.require.<anonymous>' call
        var message = 'Failed requirement.';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(length <= ((dst.get_limit_iuokuq_k$() - dst.get_writePosition_jdt81t_k$()) | 0))) {
        // Inline function 'kotlin.require.<anonymous>' call
        var message_0 = 'Failed requirement.';
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      // Inline function 'io.ktor.utils.io.core.readExact' call
      var name = 'buffer content';
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < length) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + length + '.');
      }
      memory.copyTo_fgxuoj_k$(dst.get_memory_gl4362_k$(), start, length, dst.get_writePosition_jdt81t_k$());
      dst.commitWritten_tkztjs_k$(length);
      value = Unit_getInstance();
      var rc = length;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return length;
    }
    function writeShort(_this__u8e3s4, value) {
      var name = 'short integer';
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var writeRemaining = (_this__u8e3s4.get_limit_iuokuq_k$() - start) | 0;
      if (writeRemaining < 2) {
        throw InsufficientSpaceException_init_$Create$_0(name, 2, writeRemaining);
      }
      // Inline function 'io.ktor.utils.io.core.writeShort.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.storeShortAt' call
      memory.get_view_wow8a6_k$().setInt16(start, value, false);
      var rc = 2;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
      return Unit_getInstance();
    }
    function writeInt(_this__u8e3s4, value) {
      var name = 'regular integer';
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var writeRemaining = (_this__u8e3s4.get_limit_iuokuq_k$() - start) | 0;
      if (writeRemaining < 4) {
        throw InsufficientSpaceException_init_$Create$_0(name, 4, writeRemaining);
      }
      // Inline function 'io.ktor.utils.io.core.writeInt.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.storeIntAt' call
      memory.get_view_wow8a6_k$().setInt32(start, value, false);
      var rc = 4;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
      return Unit_getInstance();
    }
    function writeLong(_this__u8e3s4, value) {
      var name = 'long integer';
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var writeRemaining = (_this__u8e3s4.get_limit_iuokuq_k$() - start) | 0;
      if (writeRemaining < 8) {
        throw InsufficientSpaceException_init_$Create$_0(name, 8, writeRemaining);
      }
      // Inline function 'io.ktor.utils.io.core.writeLong.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.storeLongAt' call
      memory.get_view_wow8a6_k$().setInt32(start, value.shr_9fl3wl_k$(32).toInt_1tsl84_k$(), false);
      memory
        .get_view_wow8a6_k$()
        .setInt32((start + 4) | 0, value.and_4spn93_k$(new Long(-1, 0)).toInt_1tsl84_k$(), false);
      var rc = 8;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
      return Unit_getInstance();
    }
    function readShort(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readExact' call
      var name = 'short integer';
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < 2) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + 2 + '.');
      }
      // Inline function 'io.ktor.utils.io.core.readShort.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.loadShortAt' call
      value = memory.get_view_wow8a6_k$().getInt16(start, false);
      var rc = 2;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return value;
    }
    function readInt(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readExact' call
      var name = 'regular integer';
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < 4) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + 4 + '.');
      }
      // Inline function 'io.ktor.utils.io.core.readInt.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.loadIntAt' call
      value = memory.get_view_wow8a6_k$().getInt32(start, false);
      var rc = 4;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return value;
    }
    function readLong(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readExact' call
      var name = 'long integer';
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < 8) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + 8 + '.');
      }
      // Inline function 'io.ktor.utils.io.core.readLong.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.loadLongAt' call
      value = toLong(memory.get_view_wow8a6_k$().getUint32(start, false))
        .shl_bg8if3_k$(32)
        .or_v7fvkl_k$(toLong(memory.get_view_wow8a6_k$().getUint32((start + 4) | 0, false)));
      var rc = 8;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return value;
    }
    function readFloat(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readExact' call
      var name = 'floating point number';
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < 4) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + 4 + '.');
      }
      // Inline function 'io.ktor.utils.io.core.readFloat.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.loadFloatAt' call
      value = memory.get_view_wow8a6_k$().getFloat32(start, false);
      var rc = 4;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return value;
    }
    function readDouble(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readExact' call
      var name = 'long floating point number';
      // Inline function 'kotlin.contracts.contract' call
      var value;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readExact.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < 8) {
        throw new EOFException('Not enough bytes to read a ' + name + ' of size ' + 8 + '.');
      }
      // Inline function 'io.ktor.utils.io.core.readDouble.<anonymous>' call
      // Inline function 'io.ktor.utils.io.bits.loadDoubleAt' call
      value = memory.get_view_wow8a6_k$().getFloat64(start, false);
      var rc = 8;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return value;
    }
    function coerceAtMostMaxIntOrFail(_this__u8e3s4, message) {
      if (_this__u8e3s4.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) > 0)
        throw IllegalArgumentException_init_$Create$(message);
      return _this__u8e3s4.toInt_1tsl84_k$();
    }
    function remainingAll(_this__u8e3s4) {
      return remainingAll_0(_this__u8e3s4, new Long(0, 0));
    }
    function copyAll(_this__u8e3s4) {
      var copied = _this__u8e3s4.duplicate_jvgc97_k$();
      var tmp0_elvis_lhs = _this__u8e3s4.get_next_wor1vg_k$();
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return copied;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var next = tmp;
      return copyAll_0(next, copied, copied);
    }
    function findTail(_this__u8e3s4) {
      var $this = _this__u8e3s4;
      $l$1: do {
        $l$0: do {
          var tmp0_elvis_lhs = $this.get_next_wor1vg_k$();
          var tmp;
          if (tmp0_elvis_lhs == null) {
            return $this;
          } else {
            tmp = tmp0_elvis_lhs;
          }
          var next = tmp;
          $this = next;
          continue $l$0;
        } while (false);
      } while (true);
    }
    function releaseAll(_this__u8e3s4, pool) {
      var current = _this__u8e3s4;
      while (!(current == null)) {
        var next = current.cleanNext_l2yy3o_k$();
        current.release_vbevvg_k$(pool);
        current = next;
      }
    }
    function remainingAll_0(_this__u8e3s4, n) {
      var $this = _this__u8e3s4;
      var n_0 = n;
      $l$1: do {
        $l$0: do {
          // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
          var this_0 = $this;
          var tmp$ret$0 = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
          var rem = toLong(tmp$ret$0).plus_r93sks_k$(n_0);
          var tmp0_elvis_lhs = $this.get_next_wor1vg_k$();
          var tmp;
          if (tmp0_elvis_lhs == null) {
            return rem;
          } else {
            tmp = tmp0_elvis_lhs;
          }
          var next = tmp;
          $this = next;
          n_0 = rem;
          continue $l$0;
        } while (false);
      } while (true);
    }
    function copyAll_0(_this__u8e3s4, head, prev) {
      var $this = _this__u8e3s4;
      var head_0 = head;
      var prev_0 = prev;
      $l$1: do {
        $l$0: do {
          var copied = $this.duplicate_jvgc97_k$();
          prev_0.set_next_v483mr_k$(copied);
          var tmp0_elvis_lhs = $this.get_next_wor1vg_k$();
          var tmp;
          if (tmp0_elvis_lhs == null) {
            return head_0;
          } else {
            tmp = tmp0_elvis_lhs;
          }
          var next = tmp;
          $this = next;
          head_0 = head_0;
          prev_0 = copied;
          continue $l$0;
        } while (false);
      } while (true);
    }
    function forEachChunk(_this__u8e3s4, block) {
      // Inline function 'kotlin.contracts.contract' call
      var current = _this__u8e3s4;
      $l$loop: do {
        block(current);
        var tmp0_elvis_lhs = current.get_next_wor1vg_k$();
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$loop;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        current = tmp;
      } while (true);
    }
    function buildPacket(block) {
      // Inline function 'kotlin.contracts.contract' call
      var builder = new BytePacketBuilder();
      try {
        block(builder);
        return builder.build_1k0s4u_k$();
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
    function BytePacketBuilder(pool) {
      pool = pool === VOID ? Companion_getInstance_4().get_Pool_wo83gl_k$() : pool;
      Output.call(this, pool);
    }
    protoOf(BytePacketBuilder).get_size_woubt6_k$ = function () {
      return this.get__size_inpkfr_k$();
    };
    protoOf(BytePacketBuilder).get_isEmpty_zauvru_k$ = function () {
      return this.get__size_inpkfr_k$() === 0;
    };
    protoOf(BytePacketBuilder).get_isNotEmpty_7mbqpf_k$ = function () {
      return this.get__size_inpkfr_k$() > 0;
    };
    protoOf(BytePacketBuilder).get__pool_innro2_k$ = function () {
      return this.get_pool_wosj1h_k$();
    };
    protoOf(BytePacketBuilder).closeDestination_mr1i3e_k$ = function () {};
    protoOf(BytePacketBuilder).flush_sux9un_k$ = function (source, offset, length) {};
    protoOf(BytePacketBuilder).append_am5a4z_k$ = function (value) {
      var tmp = protoOf(Output).append_am5a4z_k$.call(this, value);
      return tmp instanceof BytePacketBuilder ? tmp : THROW_CCE();
    };
    protoOf(BytePacketBuilder).append_jgojdo_k$ = function (value) {
      var tmp = protoOf(Output).append_jgojdo_k$.call(this, value);
      return tmp instanceof BytePacketBuilder ? tmp : THROW_CCE();
    };
    protoOf(BytePacketBuilder).append_xdc1zw_k$ = function (value, startIndex, endIndex) {
      var tmp = protoOf(Output).append_xdc1zw_k$.call(this, value, startIndex, endIndex);
      return tmp instanceof BytePacketBuilder ? tmp : THROW_CCE();
    };
    protoOf(BytePacketBuilder).build_1k0s4u_k$ = function () {
      var size = this.get_size_woubt6_k$();
      var head = this.stealAll_nensgi_k$();
      return head == null
        ? Companion_getInstance_2().get_Empty_i9b85g_k$()
        : new ByteReadPacket(head, toLong(size), this.get_pool_wosj1h_k$());
    };
    protoOf(BytePacketBuilder).toString = function () {
      return 'BytePacketBuilder[0x' + hashCode(this) + ']';
    };
    function ByteReadPacket_init_$Init$(head, pool, $this) {
      ByteReadPacket.call($this, head, remainingAll(head), pool);
      return $this;
    }
    function ByteReadPacket_init_$Create$(head, pool) {
      return ByteReadPacket_init_$Init$(head, pool, objectCreate(protoOf(ByteReadPacket)));
    }
    function Companion_0() {
      Companion_instance_0 = this;
      this.Empty_1 = new ByteReadPacket(
        Companion_getInstance_4().get_Empty_i9b85g_k$(),
        new Long(0, 0),
        Companion_getInstance_4().get_EmptyPool_i65buo_k$(),
      );
    }
    protoOf(Companion_0).get_Empty_i9b85g_k$ = function () {
      return this.Empty_1;
    };
    var Companion_instance_0;
    function Companion_getInstance_2() {
      if (Companion_instance_0 == null) new Companion_0();
      return Companion_instance_0;
    }
    function ByteReadPacket(head, remaining, pool) {
      Companion_getInstance_2();
      Input.call(this, head, remaining, pool);
      this.markNoMoreChunksAvailable_j25xf4_k$();
    }
    protoOf(ByteReadPacket).copy_1tks5_k$ = function () {
      return new ByteReadPacket(
        copyAll(this.get_head_won7e1_k$()),
        this.get_remaining_mwegr1_k$(),
        this.get_pool_wosj1h_k$(),
      );
    };
    protoOf(ByteReadPacket).fill_1vd6r_k$ = function () {
      return null;
    };
    protoOf(ByteReadPacket).fill_3bipm6_k$ = function (destination, offset, length) {
      return 0;
    };
    protoOf(ByteReadPacket).closeSource_lb1mzh_k$ = function () {};
    protoOf(ByteReadPacket).toString = function () {
      return 'ByteReadPacket[' + hashCode(this) + ']';
    };
    function _set_idx__4w7ld4($this, _set____db54di) {
      $this.idx_1 = _set____db54di;
    }
    function _get_idx__e6a6ic($this) {
      return $this.idx_1;
    }
    function _set__head__b4pap2($this, newHead) {
      $this._head_1 = newHead;
      $this.headMemory_1 = newHead.get_memory_gl4362_k$();
      $this.headPosition_1 = newHead.get_readPosition_70qxnc_k$();
      $this.headEndExclusive_1 = newHead.get_writePosition_jdt81t_k$();
    }
    function _get__head__kwf5se($this) {
      return $this._head_1;
    }
    function doPrefetch($this, min) {
      var tail = findTail($this._head_1);
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      var tmp$ret$0 = ($this.headEndExclusive_1 - $this.headPosition_1) | 0;
      var available = numberToLong(tmp$ret$0).plus_r93sks_k$($this.tailRemaining_1);
      do {
        var next = $this.fill_1vd6r_k$();
        if (next == null) {
          $this.noMoreChunksAvailable_1 = true;
          return false;
        }
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var chunkSize = (next.get_writePosition_jdt81t_k$() - next.get_readPosition_70qxnc_k$()) | 0;
        if (tail === Companion_getInstance_4().get_Empty_i9b85g_k$()) {
          _set__head__b4pap2($this, next);
          tail = next;
        } else {
          tail.set_next_v483mr_k$(next);
          // Inline function 'kotlin.Long.plus' call
          var tmp$ret$2 = $this.tailRemaining_1.plus_r93sks_k$(toLong(chunkSize));
          $this.set_tailRemaining_frnwob_k$(tmp$ret$2);
        }
        // Inline function 'kotlin.Long.plus' call
        available = available.plus_r93sks_k$(toLong(chunkSize));
      } while (available.compareTo_9jj042_k$(min) < 0);
      return true;
    }
    function _set_noMoreChunksAvailable__phi5hk($this, _set____db54di) {
      $this.noMoreChunksAvailable_1 = _set____db54di;
    }
    function _get_noMoreChunksAvailable__vn4hx8($this) {
      return $this.noMoreChunksAvailable_1;
    }
    function readByteSlow_0($this) {
      var index = $this.headPosition_1;
      if (index < $this.headEndExclusive_1) {
        // Inline function 'io.ktor.utils.io.bits.get' call
        // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
        var value = $this.headMemory_1.get_view_wow8a6_k$().getInt8(index);
        $this.headPosition_1 = index;
        var head = $this._head_1;
        head.discardUntilIndex_z86prq_k$(index);
        $this.ensureNext_39ripn_k$(head);
        return value;
      }
      var tmp0_elvis_lhs = $this.prepareRead_yxo41n_k$(1);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(1);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head_0 = tmp;
      var byte = head_0.readByte_ectjk2_k$();
      completeReadHead($this, head_0);
      return byte;
    }
    function readASCII($this, out, min, max) {
      if (max === 0 ? min === 0 : false) return 0;
      else if ($this.get_endOfInput_skegkh_k$())
        if (min === 0) return 0;
        else {
          atLeastMinCharactersRequire($this, min);
        }
      else if (max < min) {
        minShouldBeLess($this, min, max);
      }
      var copied = 0;
      var utf8 = false;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.takeWhile' call
        var release = true;
        var tmp0_elvis_lhs = prepareReadFirstHead($this, 1);
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$block;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var current = tmp;
        try {
          $l$loop_0: do {
            // Inline function 'io.ktor.utils.io.core.Input.readASCII.<anonymous>' call
            var buffer = current;
            var tmp$ret$4;
            $l$block_0: {
              // Inline function 'io.ktor.utils.io.core.internal.decodeASCII' call
              // Inline function 'io.ktor.utils.io.core.read' call
              // Inline function 'kotlin.contracts.contract' call
              // Inline function 'io.ktor.utils.io.core.internal.decodeASCII.<anonymous>' call
              var memory = buffer.get_memory_gl4362_k$();
              var start = buffer.get_readPosition_70qxnc_k$();
              var endExclusive = buffer.get_writePosition_jdt81t_k$();
              var inductionVariable = start;
              if (inductionVariable < endExclusive)
                do {
                  var index = inductionVariable;
                  inductionVariable = (inductionVariable + 1) | 0;
                  // Inline function 'io.ktor.utils.io.bits.get' call
                  // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
                  var codepoint = memory.get_view_wow8a6_k$().getInt8(index) & 255;
                  var tmp_0;
                  if ((codepoint & 128) === 128) {
                    tmp_0 = true;
                  } else {
                    // Inline function 'io.ktor.utils.io.core.Input.readASCII.<anonymous>.<anonymous>' call
                    var it = numberToChar(codepoint);
                    var tmp_1;
                    if (copied === max) {
                      tmp_1 = false;
                    } else {
                      out.append_am5a4z_k$(it);
                      copied = (copied + 1) | 0;
                      tmp_1 = true;
                    }
                    tmp_0 = !tmp_1;
                  }
                  if (tmp_0) {
                    buffer.discardExact_11sae1_k$((index - start) | 0);
                    tmp$ret$4 = false;
                    break $l$block_0;
                  }
                } while (inductionVariable < endExclusive);
              var rc = (endExclusive - start) | 0;
              buffer.discardExact_11sae1_k$(rc);
              tmp$ret$4 = true;
            }
            var rc_0 = tmp$ret$4;
            var tmp_2;
            if (rc_0) {
              tmp_2 = true;
            } else if (copied === max) {
              tmp_2 = false;
            } else {
              utf8 = true;
              tmp_2 = false;
            }
            if (!tmp_2) {
              break $l$loop_0;
            }
            release = false;
            var tmp1_elvis_lhs = prepareReadNextHead($this, current);
            var tmp_3;
            if (tmp1_elvis_lhs == null) {
              break $l$loop_0;
            } else {
              tmp_3 = tmp1_elvis_lhs;
            }
            var next = tmp_3;
            current = next;
            release = true;
          } while (true);
        } finally {
          if (release) {
            completeReadHead($this, current);
          }
        }
      }
      if (utf8) {
        return (copied + readUtf8($this, out, (min - copied) | 0, (max - copied) | 0)) | 0;
      }
      if (copied < min) {
        prematureEndOfStreamChars($this, min, copied);
      }
      return copied;
    }
    function atLeastMinCharactersRequire($this, min) {
      throw new EOFException('at least ' + min + ' characters required but no bytes available');
    }
    function minShouldBeLess($this, min, max) {
      throw IllegalArgumentException_init_$Create$(
        'min should be less or equal to max but min = ' + min + ', max = ' + max,
      );
    }
    function prematureEndOfStreamChars($this, min, copied) {
      throw new MalformedUTF8InputException(
        'Premature end of stream: expected at least ' + min + ' chars but had only ' + copied,
      );
    }
    function readUtf8($this, out, min, max) {
      var copied = 0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.takeWhileSize' call
        var release = true;
        var tmp0_elvis_lhs = prepareReadFirstHead($this, 1);
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$block;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var current = tmp;
        var size = 1;
        try {
          $l$loop_0: do {
            // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
            var this_0 = current;
            var before = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
            var after;
            if (before >= size) {
              try {
                // Inline function 'io.ktor.utils.io.core.Input.readUtf8.<anonymous>' call
                var buffer = current;
                var tmp$ret$5;
                $l$block_3: {
                  // Inline function 'io.ktor.utils.io.core.internal.decodeUTF8' call
                  var byteCount = 0;
                  var value = 0;
                  var lastByteCount = 0;
                  // Inline function 'io.ktor.utils.io.core.read' call
                  // Inline function 'kotlin.contracts.contract' call
                  // Inline function 'io.ktor.utils.io.core.internal.decodeUTF8.<anonymous>' call
                  var memory = buffer.get_memory_gl4362_k$();
                  var start = buffer.get_readPosition_70qxnc_k$();
                  var endExclusive = buffer.get_writePosition_jdt81t_k$();
                  var inductionVariable = start;
                  if (inductionVariable < endExclusive)
                    do {
                      var index = inductionVariable;
                      inductionVariable = (inductionVariable + 1) | 0;
                      // Inline function 'io.ktor.utils.io.bits.get' call
                      // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
                      var v = memory.get_view_wow8a6_k$().getInt8(index) & 255;
                      if ((v & 128) === 0) {
                        if (!(byteCount === 0)) {
                          malformedByteCount(byteCount);
                        }
                        // Inline function 'io.ktor.utils.io.core.Input.readUtf8.<anonymous>.<anonymous>' call
                        var it = numberToChar(v);
                        var tmp_0;
                        if (copied === max) {
                          tmp_0 = false;
                        } else {
                          out.append_am5a4z_k$(it);
                          copied = (copied + 1) | 0;
                          tmp_0 = true;
                        }
                        if (!tmp_0) {
                          buffer.discardExact_11sae1_k$((index - start) | 0);
                          tmp$ret$5 = -1;
                          break $l$block_3;
                        }
                      } else if (byteCount === 0) {
                        var mask = 128;
                        value = v;
                        var inductionVariable_0 = 1;
                        if (inductionVariable_0 <= 6)
                          $l$loop: do {
                            var i = inductionVariable_0;
                            inductionVariable_0 = (inductionVariable_0 + 1) | 0;
                            if (!((value & mask) === 0)) {
                              value = value & ~mask;
                              mask = mask >> 1;
                              byteCount = (byteCount + 1) | 0;
                            } else {
                              break $l$loop;
                            }
                          } while (inductionVariable_0 <= 6);
                        lastByteCount = byteCount;
                        byteCount = (byteCount - 1) | 0;
                        if (lastByteCount > ((endExclusive - index) | 0)) {
                          buffer.discardExact_11sae1_k$((index - start) | 0);
                          tmp$ret$5 = lastByteCount;
                          break $l$block_3;
                        }
                      } else {
                        value = (value << 6) | (v & 127);
                        byteCount = (byteCount - 1) | 0;
                        if (byteCount === 0) {
                          if (isBmpCodePoint(value)) {
                            // Inline function 'io.ktor.utils.io.core.Input.readUtf8.<anonymous>.<anonymous>' call
                            var it_0 = numberToChar(value);
                            var tmp_1;
                            if (copied === max) {
                              tmp_1 = false;
                            } else {
                              out.append_am5a4z_k$(it_0);
                              copied = (copied + 1) | 0;
                              tmp_1 = true;
                            }
                            if (!tmp_1) {
                              buffer.discardExact_11sae1_k$((((((index - start) | 0) - lastByteCount) | 0) + 1) | 0);
                              tmp$ret$5 = -1;
                              break $l$block_3;
                            }
                          } else if (!isValidCodePoint(value)) {
                            malformedCodePoint(value);
                          } else {
                            var tmp_2;
                            // Inline function 'io.ktor.utils.io.core.Input.readUtf8.<anonymous>.<anonymous>' call
                            var it_1 = numberToChar(highSurrogate(value));
                            var tmp_3;
                            if (copied === max) {
                              tmp_3 = false;
                            } else {
                              out.append_am5a4z_k$(it_1);
                              copied = (copied + 1) | 0;
                              tmp_3 = true;
                            }
                            if (!tmp_3) {
                              tmp_2 = true;
                            } else {
                              // Inline function 'io.ktor.utils.io.core.Input.readUtf8.<anonymous>.<anonymous>' call
                              var it_2 = numberToChar(lowSurrogate(value));
                              var tmp_4;
                              if (copied === max) {
                                tmp_4 = false;
                              } else {
                                out.append_am5a4z_k$(it_2);
                                copied = (copied + 1) | 0;
                                tmp_4 = true;
                              }
                              tmp_2 = !tmp_4;
                            }
                            if (tmp_2) {
                              buffer.discardExact_11sae1_k$((((((index - start) | 0) - lastByteCount) | 0) + 1) | 0);
                              tmp$ret$5 = -1;
                              break $l$block_3;
                            }
                          }
                          value = 0;
                        }
                      }
                    } while (inductionVariable < endExclusive);
                  var rc = (endExclusive - start) | 0;
                  buffer.discardExact_11sae1_k$(rc);
                  tmp$ret$5 = 0;
                }
                var size_0 = tmp$ret$5;
                size = size_0 === 0 ? 1 : size_0 > 0 ? size_0 : 0;
              } finally {
                // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                var this_1 = current;
                after = (this_1.get_writePosition_jdt81t_k$() - this_1.get_readPosition_70qxnc_k$()) | 0;
              }
            } else {
              after = before;
            }
            release = false;
            var tmp_5;
            if (after === 0) {
              tmp_5 = prepareReadNextHead($this, current);
            } else {
              var tmp_6;
              if (after < size) {
                tmp_6 = true;
              } else {
                // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
                var this_2 = current;
                tmp_6 =
                  ((this_2.get_capacity_wxbgcd_k$() - this_2.get_limit_iuokuq_k$()) | 0) <
                  Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
              }
              if (tmp_6) {
                completeReadHead($this, current);
                tmp_5 = prepareReadFirstHead($this, size);
              } else {
                tmp_5 = current;
              }
            }
            var tmp1_elvis_lhs = tmp_5;
            var tmp_7;
            if (tmp1_elvis_lhs == null) {
              break $l$loop_0;
            } else {
              tmp_7 = tmp1_elvis_lhs;
            }
            var next = tmp_7;
            current = next;
            release = true;
          } while (size > 0);
        } finally {
          if (release) {
            completeReadHead($this, current);
          }
        }
      }
      if (copied < min) {
        prematureEndOfStreamChars($this, min, copied);
      }
      return copied;
    }
    function discardAsMuchAsPossible($this, n, skipped) {
      var $this_0 = $this;
      var n_0 = n;
      var skipped_0 = skipped;
      $l$1: do {
        $l$0: do {
          if (n_0.equals(new Long(0, 0))) return skipped_0;
          var tmp0_elvis_lhs = $this_0.prepareRead_yxo41n_k$(1);
          var tmp;
          if (tmp0_elvis_lhs == null) {
            return skipped_0;
          } else {
            tmp = tmp0_elvis_lhs;
          }
          var current = tmp;
          // Inline function 'kotlin.comparisons.minOf' call
          // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
          var tmp$ret$0 = (current.get_writePosition_jdt81t_k$() - current.get_readPosition_70qxnc_k$()) | 0;
          var a = toLong(tmp$ret$0);
          var b = n_0;
          var size = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
          current.discardExact_11sae1_k$(size);
          var tmp1_this = $this_0;
          tmp1_this.headPosition_1 = (tmp1_this.headPosition_1 + size) | 0;
          afterRead($this_0, current);
          // Inline function 'kotlin.Long.minus' call
          // Inline function 'kotlin.Long.plus' call
          $this_0 = $this_0;
          n_0 = n_0.minus_mfbszm_k$(toLong(size));
          skipped_0 = skipped_0.plus_r93sks_k$(toLong(size));
          continue $l$0;
        } while (false);
      } while (true);
    }
    function discardAsMuchAsPossible_0($this, n, skipped) {
      var currentCount = n;
      var currentSkipped = skipped;
      while (true) {
        if (currentCount === 0) {
          return currentSkipped;
        }
        var tmp0_elvis_lhs = $this.prepareRead_yxo41n_k$(1);
        var tmp;
        if (tmp0_elvis_lhs == null) {
          return currentSkipped;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var current = tmp;
        // Inline function 'kotlin.comparisons.minOf' call
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var a = (current.get_writePosition_jdt81t_k$() - current.get_readPosition_70qxnc_k$()) | 0;
        var b = currentCount;
        var size = Math.min(a, b);
        current.discardExact_11sae1_k$(size);
        $this.headPosition_1 = ($this.headPosition_1 + size) | 0;
        afterRead($this, current);
        currentCount = (currentCount - size) | 0;
        currentSkipped = (currentSkipped + size) | 0;
      }
    }
    function readAsMuchAsPossible($this, array, offset, length, copied) {
      var $this_0 = $this;
      var array_0 = array;
      var offset_0 = offset;
      var length_0 = length;
      var copied_0 = copied;
      $l$1: do {
        $l$0: do {
          if (length_0 === 0) return copied_0;
          var tmp0_elvis_lhs = $this_0.prepareRead_yxo41n_k$(1);
          var tmp;
          if (tmp0_elvis_lhs == null) {
            return copied_0;
          } else {
            tmp = tmp0_elvis_lhs;
          }
          var current = tmp;
          // Inline function 'kotlin.comparisons.minOf' call
          var a = length_0;
          // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
          var b = (current.get_writePosition_jdt81t_k$() - current.get_readPosition_70qxnc_k$()) | 0;
          var size = Math.min(a, b);
          // Inline function 'io.ktor.utils.io.core.readFully' call
          var destination = array_0;
          var offset_1 = offset_0;
          readFully_1(current instanceof Buffer ? current : THROW_CCE(), destination, offset_1, size);
          $this_0.headPosition_1 = current.get_readPosition_70qxnc_k$();
          var tmp_0;
          var tmp_1;
          if (!(size === length_0)) {
            tmp_1 = true;
          } else {
            // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
            tmp_1 = ((current.get_writePosition_jdt81t_k$() - current.get_readPosition_70qxnc_k$()) | 0) === 0;
          }
          if (tmp_1) {
            afterRead($this_0, current);
            $this_0 = $this_0;
            array_0 = array_0;
            offset_0 = (offset_0 + size) | 0;
            length_0 = (length_0 - size) | 0;
            copied_0 = (copied_0 + size) | 0;
            continue $l$0;
          } else {
            tmp_0 = (copied_0 + size) | 0;
          }
          return tmp_0;
        } while (false);
      } while (true);
    }
    function notEnoughBytesAvailable($this, n) {
      throw new EOFException(
        'Not enough data in packet (' + $this.get_remaining_mwegr1_k$().toString() + ') to read ' + n + ' byte(s)',
      );
    }
    function fixGapAfterReadFallback($this, current) {
      if ($this.noMoreChunksAvailable_1 ? current.get_next_wor1vg_k$() == null : false) {
        $this.headPosition_1 = current.get_readPosition_70qxnc_k$();
        $this.headEndExclusive_1 = current.get_writePosition_jdt81t_k$();
        $this.set_tailRemaining_frnwob_k$(new Long(0, 0));
        return Unit_getInstance();
      }
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var size = (current.get_writePosition_jdt81t_k$() - current.get_readPosition_70qxnc_k$()) | 0;
      // Inline function 'kotlin.comparisons.minOf' call
      var tmp = Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
      // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
      var b = (tmp - ((current.get_capacity_wxbgcd_k$() - current.get_limit_iuokuq_k$()) | 0)) | 0;
      var overrun = Math.min(size, b);
      if (size > overrun) {
        fixGapAfterReadFallbackUnreserved($this, current, size, overrun);
      } else {
        var new_0 = $this.pool_1.borrow_mvkpor_k$();
        new_0.reserveEndGap_i4z3fz_k$(Companion_getInstance_1().get_ReservedSize_b4jt5a_k$());
        new_0.set_next_v483mr_k$(current.cleanNext_l2yy3o_k$());
        writeBufferAppend(new_0, current, size);
        _set__head__b4pap2($this, new_0);
      }
      current.release_vbevvg_k$($this.pool_1);
    }
    function fixGapAfterReadFallbackUnreserved($this, current, size, overrun) {
      var chunk1 = $this.pool_1.borrow_mvkpor_k$();
      var chunk2 = $this.pool_1.borrow_mvkpor_k$();
      chunk1.reserveEndGap_i4z3fz_k$(Companion_getInstance_1().get_ReservedSize_b4jt5a_k$());
      chunk2.reserveEndGap_i4z3fz_k$(Companion_getInstance_1().get_ReservedSize_b4jt5a_k$());
      chunk1.set_next_v483mr_k$(chunk2);
      chunk2.set_next_v483mr_k$(current.cleanNext_l2yy3o_k$());
      writeBufferAppend(chunk1, current, (size - overrun) | 0);
      writeBufferAppend(chunk2, current, overrun);
      _set__head__b4pap2($this, chunk1);
      $this.set_tailRemaining_frnwob_k$(remainingAll(chunk2));
    }
    function ensureNext($this, current, empty) {
      var $this_0 = $this;
      var current_0 = current;
      var empty_0 = empty;
      $l$1: do {
        $l$0: do {
          if (current_0 === empty_0) {
            return doFill($this_0);
          }
          var next = current_0.cleanNext_l2yy3o_k$();
          current_0.release_vbevvg_k$($this_0.pool_1);
          var tmp;
          if (next == null) {
            _set__head__b4pap2($this_0, empty_0);
            $this_0.set_tailRemaining_frnwob_k$(new Long(0, 0));
            $this_0 = $this_0;
            current_0 = empty_0;
            empty_0 = empty_0;
            continue $l$0;
          } else {
            // Inline function 'io.ktor.utils.io.core.canRead' call
            if (next.get_writePosition_jdt81t_k$() > next.get_readPosition_70qxnc_k$()) {
              _set__head__b4pap2($this_0, next);
              var tmp0_this = $this_0;
              // Inline function 'kotlin.Long.minus' call
              var this_0 = tmp0_this.tailRemaining_1;
              // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
              var other = (next.get_writePosition_jdt81t_k$() - next.get_readPosition_70qxnc_k$()) | 0;
              var tmp$ret$2 = this_0.minus_mfbszm_k$(toLong(other));
              tmp0_this.set_tailRemaining_frnwob_k$(tmp$ret$2);
              tmp = next;
            } else {
              $this_0 = $this_0;
              current_0 = next;
              empty_0 = empty_0;
              continue $l$0;
            }
          }
          return tmp;
        } while (false);
      } while (true);
    }
    function doFill($this) {
      if ($this.noMoreChunksAvailable_1) return null;
      var chunk = $this.fill_1vd6r_k$();
      if (chunk == null) {
        $this.noMoreChunksAvailable_1 = true;
        return null;
      }
      appendView($this, chunk);
      return chunk;
    }
    function appendView($this, chunk) {
      var tail = findTail($this._head_1);
      if (tail === Companion_getInstance_4().get_Empty_i9b85g_k$()) {
        _set__head__b4pap2($this, chunk);
        // Inline function 'kotlin.require' call
        // Inline function 'kotlin.contracts.contract' call
        if (!$this.tailRemaining_1.equals(new Long(0, 0))) {
          throw IllegalStateException_init_$Create$(
            'It should be no tail remaining bytes if current tail is EmptyBuffer',
          );
        }
        var tmp0_safe_receiver = chunk.get_next_wor1vg_k$();
        var tmp1_elvis_lhs = tmp0_safe_receiver == null ? null : remainingAll(tmp0_safe_receiver);
        $this.set_tailRemaining_frnwob_k$(tmp1_elvis_lhs == null ? new Long(0, 0) : tmp1_elvis_lhs);
      } else {
        tail.set_next_v483mr_k$(chunk);
        $this.set_tailRemaining_frnwob_k$($this.tailRemaining_1.plus_r93sks_k$(remainingAll(chunk)));
      }
    }
    function prepareReadLoop($this, minSize, head) {
      var $this_0 = $this;
      var minSize_0 = minSize;
      var head_0 = head;
      $l$1: do {
        $l$0: do {
          // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
          var this_0 = $this_0;
          var headSize = (this_0.headEndExclusive_1 - this_0.headPosition_1) | 0;
          if (headSize >= minSize_0) return head_0;
          var tmp0_elvis_lhs = head_0.get_next_wor1vg_k$();
          var tmp1_elvis_lhs = tmp0_elvis_lhs == null ? doFill($this_0) : tmp0_elvis_lhs;
          var tmp;
          if (tmp1_elvis_lhs == null) {
            return null;
          } else {
            tmp = tmp1_elvis_lhs;
          }
          var next = tmp;
          if (headSize === 0) {
            if (!(head_0 === Companion_getInstance_4().get_Empty_i9b85g_k$())) {
              $this_0.releaseHead_6d62j3_k$(head_0);
            }
            $this_0 = $this_0;
            minSize_0 = minSize_0;
            head_0 = next;
            continue $l$0;
          } else {
            var desiredExtraBytes = (minSize_0 - headSize) | 0;
            var copied = writeBufferAppend(head_0, next, desiredExtraBytes);
            $this_0.headEndExclusive_1 = head_0.get_writePosition_jdt81t_k$();
            var tmp2_this = $this_0;
            // Inline function 'kotlin.Long.minus' call
            var tmp$ret$1 = tmp2_this.tailRemaining_1.minus_mfbszm_k$(toLong(copied));
            tmp2_this.set_tailRemaining_frnwob_k$(tmp$ret$1);
            // Inline function 'io.ktor.utils.io.core.canRead' call
            if (!(next.get_writePosition_jdt81t_k$() > next.get_readPosition_70qxnc_k$())) {
              head_0.set_next_v483mr_k$(null);
              head_0.set_next_v483mr_k$(next.cleanNext_l2yy3o_k$());
              next.release_vbevvg_k$($this_0.pool_1);
            } else {
              next.reserveStartGap_819mco_k$(copied);
            }
          }
          // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
          var this_1 = head_0;
          if (((this_1.get_writePosition_jdt81t_k$() - this_1.get_readPosition_70qxnc_k$()) | 0) >= minSize_0)
            return head_0;
          if (minSize_0 > Companion_getInstance_1().get_ReservedSize_b4jt5a_k$()) {
            minSizeIsTooBig($this_0, minSize_0);
          }
          $this_0 = $this_0;
          minSize_0 = minSize_0;
          head_0 = head_0;
          continue $l$0;
        } while (false);
      } while (true);
    }
    function minSizeIsTooBig($this, minSize) {
      throw IllegalStateException_init_$Create$(
        'minSize of ' +
          minSize +
          ' is too big (should be less than ' +
          Companion_getInstance_1().get_ReservedSize_b4jt5a_k$() +
          ')',
      );
    }
    function afterRead($this, head) {
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      if (((head.get_writePosition_jdt81t_k$() - head.get_readPosition_70qxnc_k$()) | 0) === 0) {
        $this.releaseHead_6d62j3_k$(head);
      }
    }
    function Companion_1() {
      Companion_instance_1 = this;
    }
    var Companion_instance_1;
    function Companion_getInstance_3() {
      if (Companion_instance_1 == null) new Companion_1();
      return Companion_instance_1;
    }
    function Input$readAvailableCharacters$out$1($off, $destination) {
      this.$destination_1 = $destination;
      this.idx_1 = $off;
    }
    protoOf(Input$readAvailableCharacters$out$1).append_am5a4z_k$ = function (value) {
      var tmp1 = this.idx_1;
      this.idx_1 = (tmp1 + 1) | 0;
      this.$destination_1[tmp1] = value;
      return this;
    };
    protoOf(Input$readAvailableCharacters$out$1).append_jgojdo_k$ = function (value) {
      if (!(value == null) ? typeof value === 'string' : false) {
        getCharsInternal(value, this.$destination_1, this.idx_1);
        this.idx_1 = (this.idx_1 + charSequenceLength(value)) | 0;
      } else {
        if (!(value == null)) {
          var inductionVariable = 0;
          var last = charSequenceLength(value);
          if (inductionVariable < last)
            do {
              var i = inductionVariable;
              inductionVariable = (inductionVariable + 1) | 0;
              var tmp3 = this.idx_1;
              this.idx_1 = (tmp3 + 1) | 0;
              this.$destination_1[tmp3] = charSequenceGet(value, i);
            } while (inductionVariable < last);
        }
      }
      return this;
    };
    protoOf(Input$readAvailableCharacters$out$1).append_xdc1zw_k$ = function (value, startIndex, endIndex) {
      throw UnsupportedOperationException_init_$Create$();
    };
    function Input(head, remaining, pool) {
      Companion_getInstance_3();
      head = head === VOID ? Companion_getInstance_4().get_Empty_i9b85g_k$() : head;
      remaining = remaining === VOID ? remainingAll(head) : remaining;
      pool = pool === VOID ? Companion_getInstance_4().get_Pool_wo83gl_k$() : pool;
      this.pool_1 = pool;
      this._head_1 = head;
      this.headMemory_1 = head.get_memory_gl4362_k$();
      this.headPosition_1 = head.get_readPosition_70qxnc_k$();
      this.headEndExclusive_1 = head.get_writePosition_jdt81t_k$();
      var tmp = this;
      // Inline function 'kotlin.Long.minus' call
      var other = (this.headEndExclusive_1 - this.headPosition_1) | 0;
      tmp.tailRemaining_1 = remaining.minus_mfbszm_k$(toLong(other));
      this.noMoreChunksAvailable_1 = false;
    }
    protoOf(Input).get_pool_wosj1h_k$ = function () {
      return this.pool_1;
    };
    protoOf(Input).get_endOfInput_skegkh_k$ = function () {
      var tmp;
      var tmp_0;
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      if (((this.headEndExclusive_1 - this.headPosition_1) | 0) === 0) {
        tmp_0 = this.tailRemaining_1.equals(new Long(0, 0));
      } else {
        tmp_0 = false;
      }
      if (tmp_0) {
        tmp = this.noMoreChunksAvailable_1 ? true : doFill(this) == null;
      } else {
        tmp = false;
      }
      return tmp;
    };
    protoOf(Input).get_head_won7e1_k$ = function () {
      // Inline function 'kotlin.also' call
      var this_0 = this._head_1;
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.Input.<get-head>.<anonymous>' call
      this_0.discardUntilIndex_z86prq_k$(this.headPosition_1);
      return this_0;
    };
    protoOf(Input).set_headMemory_9wgvc7_k$ = function (_set____db54di) {
      this.headMemory_1 = _set____db54di;
    };
    protoOf(Input).get_headMemory_zbxxm_k$ = function () {
      return this.headMemory_1;
    };
    protoOf(Input).set_headPosition_cd3vm_k$ = function (_set____db54di) {
      this.headPosition_1 = _set____db54di;
    };
    protoOf(Input).get_headPosition_sd9ua6_k$ = function () {
      return this.headPosition_1;
    };
    protoOf(Input).set_headEndExclusive_qglm4o_k$ = function (_set____db54di) {
      this.headEndExclusive_1 = _set____db54di;
    };
    protoOf(Input).get_headEndExclusive_yba4hg_k$ = function () {
      return this.headEndExclusive_1;
    };
    protoOf(Input).set_tailRemaining_frnwob_k$ = function (newValue) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(newValue.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'io.ktor.utils.io.core.Input.<set-tailRemaining>.<anonymous>' call
        var message = "tailRemaining shouldn't be negative: " + newValue.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      this.tailRemaining_1 = newValue;
    };
    protoOf(Input).get_tailRemaining_g9jelf_k$ = function () {
      return this.tailRemaining_1;
    };
    protoOf(Input).get_headRemaining_u4hu4t_k$ = function () {
      return (this.headEndExclusive_1 - this.headPosition_1) | 0;
    };
    protoOf(Input).prefetch_xde53_k$ = function (min) {
      if (min.compareTo_9jj042_k$(new Long(0, 0)) <= 0) return true;
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      var headRemaining = (this.headEndExclusive_1 - this.headPosition_1) | 0;
      if (
        toLong(headRemaining).compareTo_9jj042_k$(min) >= 0
          ? true
          : numberToLong(headRemaining).plus_r93sks_k$(this.tailRemaining_1).compareTo_9jj042_k$(min) >= 0
      )
        return true;
      return doPrefetch(this, min);
    };
    protoOf(Input).peekTo_gzft5t_k$ = function (destination, destinationOffset, offset, min, max) {
      this.prefetch_xde53_k$(min.plus_r93sks_k$(offset));
      var current = this.get_head_won7e1_k$();
      var copied = new Long(0, 0);
      var skip = offset;
      var writePosition = destinationOffset;
      // Inline function 'kotlin.comparisons.minOf' call
      // Inline function 'io.ktor.utils.io.bits.Memory.size' call
      var b = toLong(destination.get_view_wow8a6_k$().byteLength).minus_mfbszm_k$(destinationOffset);
      var maxCopySize = max.compareTo_9jj042_k$(b) <= 0 ? max : b;
      $l$loop: while (copied.compareTo_9jj042_k$(min) < 0 ? copied.compareTo_9jj042_k$(maxCopySize) < 0 : false) {
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var this_0 = current;
        var chunkSize = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
        if (toLong(chunkSize).compareTo_9jj042_k$(skip) > 0) {
          // Inline function 'kotlin.comparisons.minOf' call
          var a = numberToLong(chunkSize).minus_mfbszm_k$(skip);
          var b_0 = maxCopySize.minus_mfbszm_k$(copied);
          var size = a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0;
          current
            .get_memory_gl4362_k$()
            .copyTo_ug0rjx_k$(
              destination,
              numberToLong(current.get_readPosition_70qxnc_k$()).plus_r93sks_k$(skip),
              size,
              writePosition,
            );
          skip = new Long(0, 0);
          copied = copied.plus_r93sks_k$(size);
          writePosition = writePosition.plus_r93sks_k$(size);
        } else {
          // Inline function 'kotlin.Long.minus' call
          skip = skip.minus_mfbszm_k$(toLong(chunkSize));
        }
        var tmp0_elvis_lhs = current.get_next_wor1vg_k$();
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$loop;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        current = tmp;
      }
      return copied;
    };
    protoOf(Input).peekTo$default_b22lr3_k$ = function (destination, destinationOffset, offset, min, max, $super) {
      offset = offset === VOID ? new Long(0, 0) : offset;
      min = min === VOID ? new Long(1, 0) : min;
      max = max === VOID ? Companion_getInstance().get_MAX_VALUE_54a9lf_k$() : max;
      return $super === VOID
        ? this.peekTo_gzft5t_k$(destination, destinationOffset, offset, min, max)
        : $super.peekTo_gzft5t_k$.call(this, destination, destinationOffset, offset, min, max);
    };
    protoOf(Input).get_remaining_mwegr1_k$ = function () {
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      var tmp$ret$0 = (this.headEndExclusive_1 - this.headPosition_1) | 0;
      return toLong(tmp$ret$0).plus_r93sks_k$(this.tailRemaining_1);
    };
    protoOf(Input).canRead_93a6bq_k$ = function () {
      return !(this.headPosition_1 === this.headEndExclusive_1) ? true : !this.tailRemaining_1.equals(new Long(0, 0));
    };
    protoOf(Input).hasBytes_ly98p3_k$ = function (n) {
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      var tmp$ret$0 = (this.headEndExclusive_1 - this.headPosition_1) | 0;
      return numberToLong(tmp$ret$0).plus_r93sks_k$(this.tailRemaining_1).compareTo_9jj042_k$(toLong(n)) >= 0;
    };
    protoOf(Input).release_wu5yyf_k$ = function () {
      var head = this.get_head_won7e1_k$();
      var empty = Companion_getInstance_4().get_Empty_i9b85g_k$();
      if (!(head === empty)) {
        _set__head__b4pap2(this, empty);
        this.set_tailRemaining_frnwob_k$(new Long(0, 0));
        releaseAll(head, this.pool_1);
      }
    };
    protoOf(Input).close_yn9xrc_k$ = function () {
      this.release_wu5yyf_k$();
      if (!this.noMoreChunksAvailable_1) {
        this.noMoreChunksAvailable_1 = true;
      }
      this.closeSource_lb1mzh_k$();
    };
    protoOf(Input).stealAll_nensgi_k$ = function () {
      var head = this.get_head_won7e1_k$();
      var empty = Companion_getInstance_4().get_Empty_i9b85g_k$();
      if (head === empty) return null;
      _set__head__b4pap2(this, empty);
      this.set_tailRemaining_frnwob_k$(new Long(0, 0));
      return head;
    };
    protoOf(Input).steal_1tck0f_k$ = function () {
      var head = this.get_head_won7e1_k$();
      var next = head.get_next_wor1vg_k$();
      var empty = Companion_getInstance_4().get_Empty_i9b85g_k$();
      if (head === empty) return null;
      if (next == null) {
        _set__head__b4pap2(this, empty);
        this.set_tailRemaining_frnwob_k$(new Long(0, 0));
      } else {
        _set__head__b4pap2(this, next);
        // Inline function 'kotlin.Long.minus' call
        var this_0 = this.tailRemaining_1;
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var other = (next.get_writePosition_jdt81t_k$() - next.get_readPosition_70qxnc_k$()) | 0;
        var tmp$ret$1 = this_0.minus_mfbszm_k$(toLong(other));
        this.set_tailRemaining_frnwob_k$(tmp$ret$1);
      }
      head.set_next_v483mr_k$(null);
      return head;
    };
    protoOf(Input).append_qgrwjw_k$ = function (chain) {
      if (chain === Companion_getInstance_4().get_Empty_i9b85g_k$()) return Unit_getInstance();
      var size = remainingAll(chain);
      if (this._head_1 === Companion_getInstance_4().get_Empty_i9b85g_k$()) {
        _set__head__b4pap2(this, chain);
        // Inline function 'kotlin.Long.minus' call
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        var other = (this.headEndExclusive_1 - this.headPosition_1) | 0;
        var tmp$ret$1 = size.minus_mfbszm_k$(toLong(other));
        this.set_tailRemaining_frnwob_k$(tmp$ret$1);
      } else {
        findTail(this._head_1).set_next_v483mr_k$(chain);
        this.set_tailRemaining_frnwob_k$(this.tailRemaining_1.plus_r93sks_k$(size));
      }
    };
    protoOf(Input).tryWriteAppend_szyatk_k$ = function (chain) {
      var tail = findTail(this.get_head_won7e1_k$());
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var size = (chain.get_writePosition_jdt81t_k$() - chain.get_readPosition_70qxnc_k$()) | 0;
      var tmp;
      if (size === 0) {
        tmp = true;
      } else {
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        tmp = ((tail.get_limit_iuokuq_k$() - tail.get_writePosition_jdt81t_k$()) | 0) < size;
      }
      if (tmp) return false;
      writeBufferAppend(tail, chain, size);
      if (this.get_head_won7e1_k$() === tail) {
        this.headEndExclusive_1 = tail.get_writePosition_jdt81t_k$();
      } else {
        // Inline function 'kotlin.Long.plus' call
        var tmp$ret$2 = this.tailRemaining_1.plus_r93sks_k$(toLong(size));
        this.set_tailRemaining_frnwob_k$(tmp$ret$2);
      }
      return true;
    };
    protoOf(Input).readByte_ectjk2_k$ = function () {
      var index = this.headPosition_1;
      var nextIndex = (index + 1) | 0;
      if (nextIndex < this.headEndExclusive_1) {
        this.headPosition_1 = nextIndex;
        // Inline function 'io.ktor.utils.io.bits.get' call
        // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
        return this.headMemory_1.get_view_wow8a6_k$().getInt8(index);
      }
      return readByteSlow_0(this);
    };
    protoOf(Input).discard_6fulfq_k$ = function (n) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(n >= 0)) {
        // Inline function 'io.ktor.utils.io.core.Input.discard.<anonymous>' call
        var message = 'Negative discard is not allowed: ' + n;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      return discardAsMuchAsPossible_0(this, n, 0);
    };
    protoOf(Input).discardExact_11sae1_k$ = function (n) {
      if (!(this.discard_6fulfq_k$(n) === n))
        throw new EOFException('Unable to discard ' + n + ' bytes due to end of packet');
    };
    protoOf(Input).tryPeek_han6fe_k$ = function () {
      var head = this.get_head_won7e1_k$();
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      if (((this.headEndExclusive_1 - this.headPosition_1) | 0) > 0) {
        return head.tryPeekByte_ple8ke_k$();
      }
      if (this.tailRemaining_1.equals(new Long(0, 0)) ? this.noMoreChunksAvailable_1 : false) return -1;
      var tmp0_safe_receiver = prepareReadLoop(this, 1, head);
      var tmp1_elvis_lhs = tmp0_safe_receiver == null ? null : tmp0_safe_receiver.tryPeekByte_ple8ke_k$();
      return tmp1_elvis_lhs == null ? -1 : tmp1_elvis_lhs;
    };
    protoOf(Input).peekTo_wjzs0w_k$ = function (buffer) {
      var tmp0_elvis_lhs = this.prepareReadHead_dk94or_k$(1);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return -1;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'kotlin.comparisons.minOf' call
      // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
      var a = (buffer.get_limit_iuokuq_k$() - buffer.get_writePosition_jdt81t_k$()) | 0;
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var b = (head.get_writePosition_jdt81t_k$() - head.get_readPosition_70qxnc_k$()) | 0;
      var size = Math.min(a, b);
      writeFully_0(buffer instanceof Buffer ? buffer : THROW_CCE(), head, size);
      return size;
    };
    protoOf(Input).discard_kxfhu8_k$ = function (n) {
      if (n.compareTo_9jj042_k$(new Long(0, 0)) <= 0) return new Long(0, 0);
      return discardAsMuchAsPossible(this, n, new Long(0, 0));
    };
    protoOf(Input).readAvailableCharacters_f5kb2j_k$ = function (destination, off, len) {
      if (this.get_endOfInput_skegkh_k$()) return -1;
      var out = new Input$readAvailableCharacters$out$1(off, destination);
      return this.readText_4d4a81_k$(out, 0, len);
    };
    protoOf(Input).readText_4d4a81_k$ = function (out, min, max) {
      if (toLong(max).compareTo_9jj042_k$(this.get_remaining_mwegr1_k$()) >= 0) {
        var s = readTextExactBytes(this, this.get_remaining_mwegr1_k$().toInt_1tsl84_k$());
        out.append_jgojdo_k$(s);
        return s.length;
      }
      return readASCII(this, out, min, max);
    };
    protoOf(Input).readText$default_9behzc_k$ = function (out, min, max, $super) {
      min = min === VOID ? 0 : min;
      max = max === VOID ? IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$() : max;
      return $super === VOID
        ? this.readText_4d4a81_k$(out, min, max)
        : $super.readText_4d4a81_k$.call(this, out, min, max);
    };
    protoOf(Input).readTextExact_6e10eo_k$ = function (out, exactCharacters) {
      this.readText_4d4a81_k$(out, exactCharacters, exactCharacters);
    };
    protoOf(Input).readText_rdpd43_k$ = function (min, max) {
      if (min === 0 ? (max === 0 ? true : this.get_endOfInput_skegkh_k$()) : false) return '';
      var remaining = this.get_remaining_mwegr1_k$();
      if (remaining.compareTo_9jj042_k$(new Long(0, 0)) > 0 ? toLong(max).compareTo_9jj042_k$(remaining) >= 0 : false)
        return readTextExactBytes(this, remaining.toInt_1tsl84_k$());
      // Inline function 'kotlin.text.buildString' call
      var capacity = coerceAtMost_0(coerceAtLeast(min, 16), max);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.apply' call
      var this_0 = StringBuilder_init_$Create$_0(capacity);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.Input.readText.<anonymous>' call
      readASCII(this, this_0, min, max);
      return this_0.toString();
    };
    protoOf(Input).readText$default_grxas_k$ = function (min, max, $super) {
      min = min === VOID ? 0 : min;
      max = max === VOID ? IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$() : max;
      return $super === VOID ? this.readText_rdpd43_k$(min, max) : $super.readText_rdpd43_k$.call(this, min, max);
    };
    protoOf(Input).readTextExact_dnvzzw_k$ = function (exactCharacters) {
      return this.readText_rdpd43_k$(exactCharacters, exactCharacters);
    };
    protoOf(Input).prepareReadHead_dk94or_k$ = function (minSize) {
      return prepareReadLoop(this, minSize, this.get_head_won7e1_k$());
    };
    protoOf(Input).ensureNextHead_oerbph_k$ = function (current) {
      return this.ensureNext_39ripn_k$(current);
    };
    protoOf(Input).ensureNext_39ripn_k$ = function (current) {
      return ensureNext(this, current, Companion_getInstance_4().get_Empty_i9b85g_k$());
    };
    protoOf(Input).fixGapAfterRead_yrc9kb_k$ = function (current) {
      var tmp0_elvis_lhs = current.get_next_wor1vg_k$();
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return fixGapAfterReadFallback(this, current);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var next = tmp;
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var remaining = (current.get_writePosition_jdt81t_k$() - current.get_readPosition_70qxnc_k$()) | 0;
      // Inline function 'kotlin.comparisons.minOf' call
      var tmp_0 = Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
      // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
      var b = (tmp_0 - ((current.get_capacity_wxbgcd_k$() - current.get_limit_iuokuq_k$()) | 0)) | 0;
      var overrunSize = Math.min(remaining, b);
      if (next.get_startGap_a0yplv_k$() < overrunSize) {
        return fixGapAfterReadFallback(this, current);
      }
      restoreStartGap(next, overrunSize);
      if (remaining > overrunSize) {
        current.releaseEndGap_v6rgnm_k$();
        this.headEndExclusive_1 = current.get_writePosition_jdt81t_k$();
        // Inline function 'kotlin.Long.plus' call
        var tmp$ret$3 = this.tailRemaining_1.plus_r93sks_k$(toLong(overrunSize));
        this.set_tailRemaining_frnwob_k$(tmp$ret$3);
      } else {
        _set__head__b4pap2(this, next);
        // Inline function 'kotlin.Long.minus' call
        var this_0 = this.tailRemaining_1;
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        var other = (((next.get_writePosition_jdt81t_k$() - next.get_readPosition_70qxnc_k$()) | 0) - overrunSize) | 0;
        var tmp$ret$5 = this_0.minus_mfbszm_k$(toLong(other));
        this.set_tailRemaining_frnwob_k$(tmp$ret$5);
        current.cleanNext_l2yy3o_k$();
        current.release_vbevvg_k$(this.pool_1);
      }
    };
    protoOf(Input).fill_1vd6r_k$ = function () {
      var buffer = this.pool_1.borrow_mvkpor_k$();
      try {
        buffer.reserveEndGap_i4z3fz_k$(Companion_getInstance_1().get_ReservedSize_b4jt5a_k$());
        var tmp = buffer.get_memory_gl4362_k$();
        var tmp_0 = buffer.get_writePosition_jdt81t_k$();
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        var tmp$ret$0 = (buffer.get_limit_iuokuq_k$() - buffer.get_writePosition_jdt81t_k$()) | 0;
        var copied = this.fill_3bipm6_k$(tmp, tmp_0, tmp$ret$0);
        if (copied === 0) {
          this.noMoreChunksAvailable_1 = true;
          // Inline function 'io.ktor.utils.io.core.canRead' call
          if (!(buffer.get_writePosition_jdt81t_k$() > buffer.get_readPosition_70qxnc_k$())) {
            buffer.release_vbevvg_k$(this.pool_1);
            return null;
          }
        }
        buffer.commitWritten_tkztjs_k$(copied);
        return buffer;
      } catch ($p) {
        if ($p instanceof Error) {
          var t = $p;
          buffer.release_vbevvg_k$(this.pool_1);
          throw t;
        } else {
          throw $p;
        }
      }
    };
    protoOf(Input).markNoMoreChunksAvailable_j25xf4_k$ = function () {
      if (!this.noMoreChunksAvailable_1) {
        this.noMoreChunksAvailable_1 = true;
      }
    };
    protoOf(Input).prepareRead_yxo41n_k$ = function (minSize) {
      var head = this.get_head_won7e1_k$();
      if (((this.headEndExclusive_1 - this.headPosition_1) | 0) >= minSize) return head;
      return prepareReadLoop(this, minSize, head);
    };
    protoOf(Input).prepareRead_tus4v9_k$ = function (minSize, head) {
      if (((this.headEndExclusive_1 - this.headPosition_1) | 0) >= minSize) return head;
      return prepareReadLoop(this, minSize, head);
    };
    protoOf(Input).releaseHead_6d62j3_k$ = function (head) {
      var tmp0_elvis_lhs = head.cleanNext_l2yy3o_k$();
      var next = tmp0_elvis_lhs == null ? Companion_getInstance_4().get_Empty_i9b85g_k$() : tmp0_elvis_lhs;
      _set__head__b4pap2(this, next);
      // Inline function 'kotlin.Long.minus' call
      var this_0 = this.tailRemaining_1;
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var other = (next.get_writePosition_jdt81t_k$() - next.get_readPosition_70qxnc_k$()) | 0;
      var tmp$ret$1 = this_0.minus_mfbszm_k$(toLong(other));
      this.set_tailRemaining_frnwob_k$(tmp$ret$1);
      head.release_vbevvg_k$(this.pool_1);
      return next;
    };
    function takeWhile(_this__u8e3s4, block) {
      var release = true;
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 1);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return Unit_getInstance();
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var current = tmp;
      try {
        $l$loop_0: do {
          release = false;
          var tmp1_elvis_lhs = prepareReadNextHead(_this__u8e3s4, current);
          var tmp_0;
          if (tmp1_elvis_lhs == null) {
            break $l$loop_0;
          } else {
            tmp_0 = tmp1_elvis_lhs;
          }
          var next = tmp_0;
          current = next;
          release = true;
        } while (block(current));
      } finally {
        if (release) {
          completeReadHead(_this__u8e3s4, current);
        }
      }
    }
    function takeWhileSize(_this__u8e3s4, initialSize, block) {
      initialSize = initialSize === VOID ? 1 : initialSize;
      var release = true;
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, initialSize);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return Unit_getInstance();
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var current = tmp;
      var size = initialSize;
      try {
        $l$loop: do {
          // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
          var this_0 = current;
          var before = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
          var after;
          if (before >= size) {
            try {
              size = block(current);
            } finally {
              // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
              var this_1 = current;
              after = (this_1.get_writePosition_jdt81t_k$() - this_1.get_readPosition_70qxnc_k$()) | 0;
            }
          } else {
            after = before;
          }
          release = false;
          var tmp_0;
          if (after === 0) {
            tmp_0 = prepareReadNextHead(_this__u8e3s4, current);
          } else {
            var tmp_1;
            if (after < size) {
              tmp_1 = true;
            } else {
              // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
              var this_2 = current;
              tmp_1 =
                ((this_2.get_capacity_wxbgcd_k$() - this_2.get_limit_iuokuq_k$()) | 0) <
                Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
            }
            if (tmp_1) {
              completeReadHead(_this__u8e3s4, current);
              tmp_0 = prepareReadFirstHead(_this__u8e3s4, size);
            } else {
              tmp_0 = current;
            }
          }
          var tmp1_elvis_lhs = tmp_0;
          var tmp_2;
          if (tmp1_elvis_lhs == null) {
            break $l$loop;
          } else {
            tmp_2 = tmp1_elvis_lhs;
          }
          var next = tmp_2;
          current = next;
          release = true;
        } while (size > 0);
      } finally {
        if (release) {
          completeReadHead(_this__u8e3s4, current);
        }
      }
    }
    function readFully_3(_this__u8e3s4, dst, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (dst.length - offset) | 0 : length;
      // Inline function 'io.ktor.utils.io.core.requireNoRemaining' call
      // Inline function 'io.ktor.utils.io.core.readFullyBytesTemplate' call
      var remaining = length;
      var dstOffset = offset;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.takeWhile' call
        var release = true;
        var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 1);
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$block;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var current = tmp;
        try {
          $l$loop_0: do {
            // Inline function 'io.ktor.utils.io.core.readFullyBytesTemplate.<anonymous>' call
            var buffer = current;
            // Inline function 'kotlin.comparisons.minOf' call
            var a = remaining;
            // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
            var b = (buffer.get_writePosition_jdt81t_k$() - buffer.get_readPosition_70qxnc_k$()) | 0;
            var count = Math.min(a, b);
            // Inline function 'io.ktor.utils.io.core.readFully.<anonymous>' call
            var dstOffset_0 = dstOffset;
            readFully_1(buffer, dst, dstOffset_0, count);
            remaining = (remaining - count) | 0;
            dstOffset = (dstOffset + count) | 0;
            if (!(remaining > 0)) {
              break $l$loop_0;
            }
            release = false;
            var tmp1_elvis_lhs = prepareReadNextHead(_this__u8e3s4, current);
            var tmp_0;
            if (tmp1_elvis_lhs == null) {
              break $l$loop_0;
            } else {
              tmp_0 = tmp1_elvis_lhs;
            }
            var next = tmp_0;
            current = next;
            release = true;
          } while (true);
        } finally {
          if (release) {
            completeReadHead(_this__u8e3s4, current);
          }
        }
      }
      var this_0 = remaining;
      if (this_0 > 0) {
        prematureEndOfStream(this_0);
      }
    }
    function readFully_4(_this__u8e3s4, dst, length) {
      var tmp;
      if (length === VOID) {
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        tmp = (dst.get_limit_iuokuq_k$() - dst.get_writePosition_jdt81t_k$()) | 0;
      } else {
        tmp = length;
      }
      length = tmp;
      // Inline function 'io.ktor.utils.io.core.requireNoRemaining' call
      // Inline function 'io.ktor.utils.io.core.readFullyBytesTemplate' call
      var remaining = length;
      var dstOffset = 0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.takeWhile' call
        var release = true;
        var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 1);
        var tmp_0;
        if (tmp0_elvis_lhs == null) {
          break $l$block;
        } else {
          tmp_0 = tmp0_elvis_lhs;
        }
        var current = tmp_0;
        try {
          $l$loop_0: do {
            // Inline function 'io.ktor.utils.io.core.readFullyBytesTemplate.<anonymous>' call
            var buffer = current;
            // Inline function 'kotlin.comparisons.minOf' call
            var a = remaining;
            // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
            var b = (buffer.get_writePosition_jdt81t_k$() - buffer.get_readPosition_70qxnc_k$()) | 0;
            var count = Math.min(a, b);
            // Inline function 'io.ktor.utils.io.core.readFully.<anonymous>' call
            readFully_2(buffer, dst, count);
            remaining = (remaining - count) | 0;
            dstOffset = (dstOffset + count) | 0;
            if (!(remaining > 0)) {
              break $l$loop_0;
            }
            release = false;
            var tmp1_elvis_lhs = prepareReadNextHead(_this__u8e3s4, current);
            var tmp_1;
            if (tmp1_elvis_lhs == null) {
              break $l$loop_0;
            } else {
              tmp_1 = tmp1_elvis_lhs;
            }
            var next = tmp_1;
            current = next;
            release = true;
          } while (true);
        } finally {
          if (release) {
            completeReadHead(_this__u8e3s4, current);
          }
        }
      }
      var this_0 = remaining;
      if (this_0 > 0) {
        prematureEndOfStream(this_0);
      }
    }
    function requireNoRemaining(_this__u8e3s4) {
      if (_this__u8e3s4 > 0) {
        prematureEndOfStream(_this__u8e3s4);
      }
    }
    function readFullyBytesTemplate(_this__u8e3s4, initialDstOffset, length, readBlock) {
      var remaining = length;
      var dstOffset = initialDstOffset;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.takeWhile' call
        var release = true;
        var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 1);
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$block;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var current = tmp;
        try {
          $l$loop_0: do {
            // Inline function 'io.ktor.utils.io.core.readFullyBytesTemplate.<anonymous>' call
            var buffer = current;
            // Inline function 'kotlin.comparisons.minOf' call
            var a = remaining;
            // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
            var b = (buffer.get_writePosition_jdt81t_k$() - buffer.get_readPosition_70qxnc_k$()) | 0;
            var count = Math.min(a, b);
            readBlock(buffer, dstOffset, count);
            remaining = (remaining - count) | 0;
            dstOffset = (dstOffset + count) | 0;
            if (!(remaining > 0)) {
              break $l$loop_0;
            }
            release = false;
            var tmp1_elvis_lhs = prepareReadNextHead(_this__u8e3s4, current);
            var tmp_0;
            if (tmp1_elvis_lhs == null) {
              break $l$loop_0;
            } else {
              tmp_0 = tmp1_elvis_lhs;
            }
            var next = tmp_0;
            current = next;
            release = true;
          } while (true);
        } finally {
          if (release) {
            completeReadHead(_this__u8e3s4, current);
          }
        }
      }
      return remaining;
    }
    function readShort_0(_this__u8e3s4) {
      var tmp$ret$3;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.readPrimitive' call
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        if (((_this__u8e3s4.get_headEndExclusive_yba4hg_k$() - _this__u8e3s4.get_headPosition_sd9ua6_k$()) | 0) > 2) {
          var index = _this__u8e3s4.get_headPosition_sd9ua6_k$();
          _this__u8e3s4.set_headPosition_cd3vm_k$((index + 2) | 0);
          // Inline function 'io.ktor.utils.io.core.readShort.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.loadShortAt' call
          tmp$ret$3 = _this__u8e3s4.get_headMemory_zbxxm_k$().get_view_wow8a6_k$().getInt16(index, false);
          break $l$block;
        }
        // Inline function 'io.ktor.utils.io.core.readShort.<anonymous>' call
        tmp$ret$3 = readShortFallback(_this__u8e3s4);
      }
      return tmp$ret$3;
    }
    function readInt_0(_this__u8e3s4) {
      var tmp$ret$3;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.readPrimitive' call
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        if (((_this__u8e3s4.get_headEndExclusive_yba4hg_k$() - _this__u8e3s4.get_headPosition_sd9ua6_k$()) | 0) > 4) {
          var index = _this__u8e3s4.get_headPosition_sd9ua6_k$();
          _this__u8e3s4.set_headPosition_cd3vm_k$((index + 4) | 0);
          // Inline function 'io.ktor.utils.io.core.readInt.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.loadIntAt' call
          tmp$ret$3 = _this__u8e3s4.get_headMemory_zbxxm_k$().get_view_wow8a6_k$().getInt32(index, false);
          break $l$block;
        }
        // Inline function 'io.ktor.utils.io.core.readInt.<anonymous>' call
        tmp$ret$3 = readIntFallback(_this__u8e3s4);
      }
      return tmp$ret$3;
    }
    function readLong_0(_this__u8e3s4) {
      var tmp$ret$3;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.readPrimitive' call
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        if (((_this__u8e3s4.get_headEndExclusive_yba4hg_k$() - _this__u8e3s4.get_headPosition_sd9ua6_k$()) | 0) > 8) {
          var index = _this__u8e3s4.get_headPosition_sd9ua6_k$();
          _this__u8e3s4.set_headPosition_cd3vm_k$((index + 8) | 0);
          // Inline function 'io.ktor.utils.io.core.readLong.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.loadLongAt' call
          var this_0 = _this__u8e3s4.get_headMemory_zbxxm_k$();
          tmp$ret$3 = toLong(this_0.get_view_wow8a6_k$().getUint32(index, false))
            .shl_bg8if3_k$(32)
            .or_v7fvkl_k$(toLong(this_0.get_view_wow8a6_k$().getUint32((index + 4) | 0, false)));
          break $l$block;
        }
        // Inline function 'io.ktor.utils.io.core.readLong.<anonymous>' call
        tmp$ret$3 = readLongFallback(_this__u8e3s4);
      }
      return tmp$ret$3;
    }
    function readFloat_0(_this__u8e3s4) {
      var tmp$ret$3;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.readPrimitive' call
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        if (((_this__u8e3s4.get_headEndExclusive_yba4hg_k$() - _this__u8e3s4.get_headPosition_sd9ua6_k$()) | 0) > 4) {
          var index = _this__u8e3s4.get_headPosition_sd9ua6_k$();
          _this__u8e3s4.set_headPosition_cd3vm_k$((index + 4) | 0);
          // Inline function 'io.ktor.utils.io.core.readFloat.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.loadFloatAt' call
          tmp$ret$3 = _this__u8e3s4.get_headMemory_zbxxm_k$().get_view_wow8a6_k$().getFloat32(index, false);
          break $l$block;
        }
        // Inline function 'io.ktor.utils.io.core.readFloat.<anonymous>' call
        tmp$ret$3 = readFloatFallback(_this__u8e3s4);
      }
      return tmp$ret$3;
    }
    function readDouble_0(_this__u8e3s4) {
      var tmp$ret$3;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.readPrimitive' call
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        if (((_this__u8e3s4.get_headEndExclusive_yba4hg_k$() - _this__u8e3s4.get_headPosition_sd9ua6_k$()) | 0) > 8) {
          var index = _this__u8e3s4.get_headPosition_sd9ua6_k$();
          _this__u8e3s4.set_headPosition_cd3vm_k$((index + 8) | 0);
          // Inline function 'io.ktor.utils.io.core.readDouble.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.loadDoubleAt' call
          tmp$ret$3 = _this__u8e3s4.get_headMemory_zbxxm_k$().get_view_wow8a6_k$().getFloat64(index, false);
          break $l$block;
        }
        // Inline function 'io.ktor.utils.io.core.readDouble.<anonymous>' call
        tmp$ret$3 = readDoubleFallback(_this__u8e3s4);
      }
      return tmp$ret$3;
    }
    function readPrimitive(_this__u8e3s4, size, main, fallback) {
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      if (((_this__u8e3s4.get_headEndExclusive_yba4hg_k$() - _this__u8e3s4.get_headPosition_sd9ua6_k$()) | 0) > size) {
        var index = _this__u8e3s4.get_headPosition_sd9ua6_k$();
        _this__u8e3s4.set_headPosition_cd3vm_k$((index + size) | 0);
        return main(_this__u8e3s4.get_headMemory_zbxxm_k$(), index);
      }
      return fallback();
    }
    function readShortFallback(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readPrimitiveFallback' call
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 2);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(2);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'io.ktor.utils.io.core.readShortFallback.<anonymous>' call
      var value = readShort(head);
      completeReadHead(_this__u8e3s4, head);
      return value;
    }
    function readIntFallback(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readPrimitiveFallback' call
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 4);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(4);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'io.ktor.utils.io.core.readIntFallback.<anonymous>' call
      var value = readInt(head);
      completeReadHead(_this__u8e3s4, head);
      return value;
    }
    function readLongFallback(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readPrimitiveFallback' call
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 8);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(8);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'io.ktor.utils.io.core.readLongFallback.<anonymous>' call
      var value = readLong(head);
      completeReadHead(_this__u8e3s4, head);
      return value;
    }
    function readFloatFallback(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readPrimitiveFallback' call
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 4);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(4);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'io.ktor.utils.io.core.readFloatFallback.<anonymous>' call
      var value = readFloat(head);
      completeReadHead(_this__u8e3s4, head);
      return value;
    }
    function readDoubleFallback(_this__u8e3s4) {
      // Inline function 'io.ktor.utils.io.core.readPrimitiveFallback' call
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 8);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(8);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'io.ktor.utils.io.core.readDoubleFallback.<anonymous>' call
      var value = readDouble(head);
      completeReadHead(_this__u8e3s4, head);
      return value;
    }
    function readPrimitiveFallback(_this__u8e3s4, size, read) {
      var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, size);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(size);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      var value = read(head);
      completeReadHead(_this__u8e3s4, head);
      return value;
    }
    function Output_init_$Init$($this) {
      Output.call($this, Companion_getInstance_4().get_Pool_wo83gl_k$());
      return $this;
    }
    function Output_init_$Create$() {
      return Output_init_$Init$(objectCreate(protoOf(Output)));
    }
    function _set__head__b4pap2_0($this, _set____db54di) {
      $this._head_1 = _set____db54di;
    }
    function _get__head__kwf5se_0($this) {
      return $this._head_1;
    }
    function _set__tail__bb8fzq($this, _set____db54di) {
      $this._tail_1 = _set____db54di;
    }
    function _get__tail__kpw0hq($this) {
      return $this._tail_1;
    }
    function _set_tailInitialPosition__matoco($this, _set____db54di) {
      $this.tailInitialPosition_1 = _set____db54di;
    }
    function _get_tailInitialPosition__zfk4q4($this) {
      return $this.tailInitialPosition_1;
    }
    function _set_chainedSize__unajg($this, _set____db54di) {
      $this.chainedSize_1 = _set____db54di;
    }
    function _get_chainedSize__tfqvsg($this) {
      return $this.chainedSize_1;
    }
    function flushChain($this) {
      var tmp0_elvis_lhs = $this.stealAll_nensgi_k$();
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return Unit_getInstance();
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var oldTail = tmp;
      try {
        // Inline function 'io.ktor.utils.io.core.forEachChunk' call
        // Inline function 'kotlin.contracts.contract' call
        var current = oldTail;
        $l$loop: do {
          // Inline function 'io.ktor.utils.io.core.Output.flushChain.<anonymous>' call
          var chunk = current;
          var tmp_0 = chunk.get_memory_gl4362_k$();
          var tmp_1 = chunk.get_readPosition_70qxnc_k$();
          // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
          var tmp$ret$0 = (chunk.get_writePosition_jdt81t_k$() - chunk.get_readPosition_70qxnc_k$()) | 0;
          $this.flush_sux9un_k$(tmp_0, tmp_1, tmp$ret$0);
          var tmp0_elvis_lhs_0 = current.get_next_wor1vg_k$();
          var tmp_2;
          if (tmp0_elvis_lhs_0 == null) {
            break $l$loop;
          } else {
            tmp_2 = tmp0_elvis_lhs_0;
          }
          current = tmp_2;
        } while (true);
      } finally {
        releaseAll(oldTail, $this.pool_1);
      }
    }
    function appendNewChunk($this) {
      var new_0 = $this.pool_1.borrow_mvkpor_k$();
      new_0.reserveEndGap_i4z3fz_k$(Companion_getInstance_1().get_ReservedSize_b4jt5a_k$());
      $this.appendSingleChunk_7rbwf9_k$(new_0);
      return new_0;
    }
    function appendChainImpl($this, head, newTail, chainedSizeDelta) {
      var _tail = $this._tail_1;
      if (_tail == null) {
        $this._head_1 = head;
        $this.chainedSize_1 = 0;
      } else {
        _tail.set_next_v483mr_k$(head);
        var tailPosition = $this.tailPosition_1;
        _tail.commitWrittenUntilIndex_umptfg_k$(tailPosition);
        $this.chainedSize_1 = ($this.chainedSize_1 + ((tailPosition - $this.tailInitialPosition_1) | 0)) | 0;
      }
      $this._tail_1 = newTail;
      $this.chainedSize_1 = ($this.chainedSize_1 + chainedSizeDelta) | 0;
      $this.tailMemory_1 = newTail.get_memory_gl4362_k$();
      $this.tailPosition_1 = newTail.get_writePosition_jdt81t_k$();
      $this.tailInitialPosition_1 = newTail.get_readPosition_70qxnc_k$();
      $this.tailEndExclusive_1 = newTail.get_limit_iuokuq_k$();
    }
    function writeByteFallback($this, v) {
      appendNewChunk($this).writeByte_9ih3z3_k$(v);
      $this.tailPosition_1 = ($this.tailPosition_1 + 1) | 0;
    }
    function appendCharFallback($this, c) {
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.Output.write' call
        var buffer = $this.prepareWriteHead_ugmxj4_k$(3);
        try {
          // Inline function 'io.ktor.utils.io.core.Output.appendCharFallback.<anonymous>' call
          // Inline function 'io.ktor.utils.io.core.internal.putUtf8Char' call
          var this_0 = buffer.get_memory_gl4362_k$();
          var offset = buffer.get_writePosition_jdt81t_k$();
          // Inline function 'kotlin.code' call
          var v = Char__toInt_impl_vasixd(c);
          var tmp;
          if (0 <= v ? v <= 127 : false) {
            // Inline function 'io.ktor.utils.io.bits.Memory.storeAt' call
            var value = toByte(v);
            this_0.get_view_wow8a6_k$().setInt8(offset, value);
            tmp = 1;
          } else if (128 <= v ? v <= 2047 : false) {
            // Inline function 'io.ktor.utils.io.bits.set' call
            var value_0 = toByte(192 | ((v >> 6) & 31));
            this_0.get_view_wow8a6_k$().setInt8(offset, value_0);
            // Inline function 'io.ktor.utils.io.bits.set' call
            var index = (offset + 1) | 0;
            var value_1 = toByte(128 | (v & 63));
            this_0.get_view_wow8a6_k$().setInt8(index, value_1);
            tmp = 2;
          } else if (2048 <= v ? v <= 65535 : false) {
            // Inline function 'io.ktor.utils.io.bits.set' call
            var value_2 = toByte(224 | ((v >> 12) & 15));
            this_0.get_view_wow8a6_k$().setInt8(offset, value_2);
            // Inline function 'io.ktor.utils.io.bits.set' call
            var index_0 = (offset + 1) | 0;
            var value_3 = toByte(128 | ((v >> 6) & 63));
            this_0.get_view_wow8a6_k$().setInt8(index_0, value_3);
            // Inline function 'io.ktor.utils.io.bits.set' call
            var index_1 = (offset + 2) | 0;
            var value_4 = toByte(128 | (v & 63));
            this_0.get_view_wow8a6_k$().setInt8(index_1, value_4);
            tmp = 3;
          } else if (65536 <= v ? v <= 1114111 : false) {
            // Inline function 'io.ktor.utils.io.bits.set' call
            var value_5 = toByte(240 | ((v >> 18) & 7));
            this_0.get_view_wow8a6_k$().setInt8(offset, value_5);
            // Inline function 'io.ktor.utils.io.bits.set' call
            var index_2 = (offset + 1) | 0;
            var value_6 = toByte(128 | ((v >> 12) & 63));
            this_0.get_view_wow8a6_k$().setInt8(index_2, value_6);
            // Inline function 'io.ktor.utils.io.bits.set' call
            var index_3 = (offset + 2) | 0;
            var value_7 = toByte(128 | ((v >> 6) & 63));
            this_0.get_view_wow8a6_k$().setInt8(index_3, value_7);
            // Inline function 'io.ktor.utils.io.bits.set' call
            var index_4 = (offset + 3) | 0;
            var value_8 = toByte(128 | (v & 63));
            this_0.get_view_wow8a6_k$().setInt8(index_4, value_8);
            tmp = 4;
          } else {
            malformedCodePoint(v);
          }
          var size = tmp;
          buffer.commitWritten_tkztjs_k$(size);
          var result = size;
          // Inline function 'kotlin.check' call
          // Inline function 'kotlin.contracts.contract' call
          if (!(result >= 0)) {
            // Inline function 'io.ktor.utils.io.core.Output.write.<anonymous>' call
            var message = "The returned value shouldn't be negative";
            throw IllegalStateException_init_$Create$(toString(message));
          }
          break $l$block;
        } finally {
          $this.afterHeadWrite_dl47zh_k$();
        }
      }
    }
    function writePacketMerging($this, tail, foreignStolen, pool) {
      tail.commitWrittenUntilIndex_umptfg_k$($this.tailPosition_1);
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var lastSize = (tail.get_writePosition_jdt81t_k$() - tail.get_readPosition_70qxnc_k$()) | 0;
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var nextSize = (foreignStolen.get_writePosition_jdt81t_k$() - foreignStolen.get_readPosition_70qxnc_k$()) | 0;
      var maxCopySize = get_PACKET_MAX_COPY_SIZE();
      var tmp;
      var tmp_0;
      if (nextSize < maxCopySize) {
        // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
        var tmp_1 = (tail.get_capacity_wxbgcd_k$() - tail.get_limit_iuokuq_k$()) | 0;
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        tmp_0 = nextSize <= ((tmp_1 + ((tail.get_limit_iuokuq_k$() - tail.get_writePosition_jdt81t_k$()) | 0)) | 0);
      } else {
        tmp_0 = false;
      }
      if (tmp_0) {
        tmp = nextSize;
      } else {
        tmp = -1;
      }
      var appendSize = tmp;
      var tmp_2;
      if (
        (lastSize < maxCopySize ? lastSize <= foreignStolen.get_startGap_a0yplv_k$() : false)
          ? isExclusivelyOwned(foreignStolen)
          : false
      ) {
        tmp_2 = lastSize;
      } else {
        tmp_2 = -1;
      }
      var prependSize = tmp_2;
      if (appendSize === -1 ? prependSize === -1 : false) {
        $this.appendChain_ca5xr5_k$(foreignStolen);
      } else if (prependSize === -1 ? true : appendSize <= prependSize) {
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        var tmp_3 = (tail.get_limit_iuokuq_k$() - tail.get_writePosition_jdt81t_k$()) | 0;
        // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
        var tmp$ret$5 = (tail.get_capacity_wxbgcd_k$() - tail.get_limit_iuokuq_k$()) | 0;
        writeBufferAppend(tail, foreignStolen, (tmp_3 + tmp$ret$5) | 0);
        $this.afterHeadWrite_dl47zh_k$();
        var tmp0_safe_receiver = foreignStolen.cleanNext_l2yy3o_k$();
        if (tmp0_safe_receiver == null) null;
        else {
          // Inline function 'kotlin.let' call
          // Inline function 'kotlin.contracts.contract' call
          $this.appendChain_ca5xr5_k$(tmp0_safe_receiver);
        }
        foreignStolen.release_vbevvg_k$(pool);
      } else if (appendSize === -1 ? true : prependSize < appendSize) {
        writePacketSlowPrepend($this, foreignStolen, tail);
      } else {
        throw IllegalStateException_init_$Create$('prep = ' + prependSize + ', app = ' + appendSize);
      }
    }
    function writePacketSlowPrepend($this, foreignStolen, tail) {
      writeBufferPrepend(foreignStolen, tail);
      var tmp0_elvis_lhs = $this._head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        var message = "head should't be null since it is already handled in the fast-path";
        throw IllegalStateException_init_$Create$(toString(message));
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var _head = tmp;
      if (_head === tail) {
        $this._head_1 = foreignStolen;
      } else {
        var pre = _head;
        $l$loop: while (true) {
          var next = ensureNotNull(pre.get_next_wor1vg_k$());
          if (next === tail) break $l$loop;
          pre = next;
        }
        pre.set_next_v483mr_k$(foreignStolen);
      }
      tail.release_vbevvg_k$($this.pool_1);
      $this._tail_1 = findTail(foreignStolen);
    }
    function Output(pool) {
      this.pool_1 = pool;
      this._head_1 = null;
      this._tail_1 = null;
      this.tailMemory_1 = Companion_getInstance_6().get_Empty_i9b85g_k$();
      this.tailPosition_1 = 0;
      this.tailEndExclusive_1 = 0;
      this.tailInitialPosition_1 = 0;
      this.chainedSize_1 = 0;
    }
    protoOf(Output).get_pool_wosj1h_k$ = function () {
      return this.pool_1;
    };
    protoOf(Output).get__size_inpkfr_k$ = function () {
      return (this.chainedSize_1 + ((this.tailPosition_1 - this.tailInitialPosition_1) | 0)) | 0;
    };
    protoOf(Output).get_head_won7e1_k$ = function () {
      var tmp0_elvis_lhs = this._head_1;
      return tmp0_elvis_lhs == null ? Companion_getInstance_4().get_Empty_i9b85g_k$() : tmp0_elvis_lhs;
    };
    protoOf(Output).set_tailMemory_d24lhl_k$ = function (_set____db54di) {
      this.tailMemory_1 = _set____db54di;
    };
    protoOf(Output).get_tailMemory_3da60q_k$ = function () {
      return this.tailMemory_1;
    };
    protoOf(Output).set_tailPosition_5ggwhe_k$ = function (_set____db54di) {
      this.tailPosition_1 = _set____db54di;
    };
    protoOf(Output).get_tailPosition_6y9qfy_k$ = function () {
      return this.tailPosition_1;
    };
    protoOf(Output).set_tailEndExclusive_ww532w_k$ = function (_set____db54di) {
      this.tailEndExclusive_1 = _set____db54di;
    };
    protoOf(Output).get_tailEndExclusive_e33hh8_k$ = function () {
      return this.tailEndExclusive_1;
    };
    protoOf(Output).get_tailRemaining_g9jelf_k$ = function () {
      return (this.tailEndExclusive_1 - this.tailPosition_1) | 0;
    };
    protoOf(Output).flush_shahbo_k$ = function () {
      flushChain(this);
    };
    protoOf(Output).stealAll_nensgi_k$ = function () {
      var tmp0_elvis_lhs = this._head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return null;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      var tmp1_safe_receiver = this._tail_1;
      if (tmp1_safe_receiver == null) null;
      else tmp1_safe_receiver.commitWrittenUntilIndex_umptfg_k$(this.tailPosition_1);
      this._head_1 = null;
      this._tail_1 = null;
      this.tailPosition_1 = 0;
      this.tailEndExclusive_1 = 0;
      this.tailInitialPosition_1 = 0;
      this.chainedSize_1 = 0;
      this.tailMemory_1 = Companion_getInstance_6().get_Empty_i9b85g_k$();
      return head;
    };
    protoOf(Output).appendSingleChunk_7rbwf9_k$ = function (buffer) {
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(buffer.get_next_wor1vg_k$() == null)) {
        // Inline function 'io.ktor.utils.io.core.Output.appendSingleChunk.<anonymous>' call
        var message = 'It should be a single buffer chunk.';
        throw IllegalStateException_init_$Create$(toString(message));
      }
      appendChainImpl(this, buffer, buffer, 0);
    };
    protoOf(Output).appendChain_ca5xr5_k$ = function (head) {
      var tail = findTail(head);
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      // Inline function 'kotlin.Long.minus' call
      var this_0 = remainingAll(head);
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var other = (tail.get_writePosition_jdt81t_k$() - tail.get_readPosition_70qxnc_k$()) | 0;
      var this_1 = this_0.minus_mfbszm_k$(toLong(other));
      var name = 'total size increase';
      if (this_1.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(this_1, name);
      }
      var chainedSizeDelta = this_1.toInt_1tsl84_k$();
      appendChainImpl(this, head, tail, chainedSizeDelta);
    };
    protoOf(Output).writeByte_9ih3z3_k$ = function (v) {
      var index = this.tailPosition_1;
      if (index < this.tailEndExclusive_1) {
        this.tailPosition_1 = (index + 1) | 0;
        // Inline function 'io.ktor.utils.io.bits.set' call
        this.tailMemory_1.get_view_wow8a6_k$().setInt8(index, v);
        return Unit_getInstance();
      }
      return writeByteFallback(this, v);
    };
    protoOf(Output).close_yn9xrc_k$ = function () {
      try {
        this.flush_shahbo_k$();
      } finally {
        this.closeDestination_mr1i3e_k$();
      }
    };
    protoOf(Output).append_am5a4z_k$ = function (value) {
      var tailPosition = this.tailPosition_1;
      if (((this.tailEndExclusive_1 - tailPosition) | 0) >= 3) {
        // Inline function 'io.ktor.utils.io.core.internal.putUtf8Char' call
        var this_0 = this.tailMemory_1;
        // Inline function 'kotlin.code' call
        var v = Char__toInt_impl_vasixd(value);
        var tmp;
        if (0 <= v ? v <= 127 : false) {
          // Inline function 'io.ktor.utils.io.bits.Memory.storeAt' call
          var value_0 = toByte(v);
          this_0.get_view_wow8a6_k$().setInt8(tailPosition, value_0);
          tmp = 1;
        } else if (128 <= v ? v <= 2047 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_1 = toByte(192 | ((v >> 6) & 31));
          this_0.get_view_wow8a6_k$().setInt8(tailPosition, value_1);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index = (tailPosition + 1) | 0;
          var value_2 = toByte(128 | (v & 63));
          this_0.get_view_wow8a6_k$().setInt8(index, value_2);
          tmp = 2;
        } else if (2048 <= v ? v <= 65535 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_3 = toByte(224 | ((v >> 12) & 15));
          this_0.get_view_wow8a6_k$().setInt8(tailPosition, value_3);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_0 = (tailPosition + 1) | 0;
          var value_4 = toByte(128 | ((v >> 6) & 63));
          this_0.get_view_wow8a6_k$().setInt8(index_0, value_4);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_1 = (tailPosition + 2) | 0;
          var value_5 = toByte(128 | (v & 63));
          this_0.get_view_wow8a6_k$().setInt8(index_1, value_5);
          tmp = 3;
        } else if (65536 <= v ? v <= 1114111 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_6 = toByte(240 | ((v >> 18) & 7));
          this_0.get_view_wow8a6_k$().setInt8(tailPosition, value_6);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_2 = (tailPosition + 1) | 0;
          var value_7 = toByte(128 | ((v >> 12) & 63));
          this_0.get_view_wow8a6_k$().setInt8(index_2, value_7);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_3 = (tailPosition + 2) | 0;
          var value_8 = toByte(128 | ((v >> 6) & 63));
          this_0.get_view_wow8a6_k$().setInt8(index_3, value_8);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_4 = (tailPosition + 3) | 0;
          var value_9 = toByte(128 | (v & 63));
          this_0.get_view_wow8a6_k$().setInt8(index_4, value_9);
          tmp = 4;
        } else {
          malformedCodePoint(v);
        }
        var size = tmp;
        this.tailPosition_1 = (tailPosition + size) | 0;
        return this;
      }
      appendCharFallback(this, value);
      return this;
    };
    protoOf(Output).append_jgojdo_k$ = function (value) {
      if (value == null) {
        this.append_xdc1zw_k$('null', 0, 4);
      } else {
        this.append_xdc1zw_k$(value, 0, charSequenceLength(value));
      }
      return this;
    };
    protoOf(Output).append_xdc1zw_k$ = function (value, startIndex, endIndex) {
      if (value == null) {
        return this.append_xdc1zw_k$('null', startIndex, endIndex);
      }
      writeText(this, value, startIndex, endIndex, Charsets_getInstance().get_UTF_8_ihn39z_k$());
      return this;
    };
    protoOf(Output).writePacket_e1h3qk_k$ = function (packet) {
      var foreignStolen = packet.stealAll_nensgi_k$();
      if (foreignStolen == null) {
        packet.release_wu5yyf_k$();
        return Unit_getInstance();
      }
      var tail = this._tail_1;
      if (tail == null) {
        this.appendChain_ca5xr5_k$(foreignStolen);
        return Unit_getInstance();
      }
      writePacketMerging(this, tail, foreignStolen, packet.get_pool_wosj1h_k$());
    };
    protoOf(Output).writeChunkBuffer_f0a6fc_k$ = function (chunkBuffer) {
      var _tail = this._tail_1;
      if (_tail == null) {
        this.appendChain_ca5xr5_k$(chunkBuffer);
        return Unit_getInstance();
      }
      writePacketMerging(this, _tail, chunkBuffer, this.pool_1);
    };
    protoOf(Output).writePacket_3jtwmc_k$ = function (p, n) {
      var remaining = n;
      $l$loop: while (remaining > 0) {
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        var headRemaining = (p.get_headEndExclusive_yba4hg_k$() - p.get_headPosition_sd9ua6_k$()) | 0;
        if (headRemaining <= remaining) {
          remaining = (remaining - headRemaining) | 0;
          var tmp0_elvis_lhs = p.steal_1tck0f_k$();
          var tmp;
          if (tmp0_elvis_lhs == null) {
            throw new EOFException('Unexpected end of packet');
          } else {
            tmp = tmp0_elvis_lhs;
          }
          this.appendSingleChunk_7rbwf9_k$(tmp);
        } else {
          // Inline function 'io.ktor.utils.io.core.read' call
          // Inline function 'kotlin.contracts.contract' call
          var tmp0_elvis_lhs_0 = p.prepareRead_yxo41n_k$(1);
          var tmp_0;
          if (tmp0_elvis_lhs_0 == null) {
            prematureEndOfStream(1);
          } else {
            tmp_0 = tmp0_elvis_lhs_0;
          }
          var buffer = tmp_0;
          var positionBefore = buffer.get_readPosition_70qxnc_k$();
          try {
            // Inline function 'io.ktor.utils.io.core.Output.writePacket.<anonymous>' call
            writeFully_1(this, buffer, remaining);
          } finally {
            var positionAfter = buffer.get_readPosition_70qxnc_k$();
            if (positionAfter < positionBefore) {
              throw IllegalStateException_init_$Create$("Buffer's position shouldn't be rewinded");
            }
            if (positionAfter === buffer.get_writePosition_jdt81t_k$()) {
              p.ensureNext_39ripn_k$(buffer);
            } else {
              p.set_headPosition_cd3vm_k$(positionAfter);
            }
          }
          break $l$loop;
        }
      }
    };
    protoOf(Output).writePacket_9o18u2_k$ = function (p, n) {
      var remaining = n;
      $l$loop: while (remaining.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
        var tmp$ret$0 = (p.get_headEndExclusive_yba4hg_k$() - p.get_headPosition_sd9ua6_k$()) | 0;
        var headRemaining = toLong(tmp$ret$0);
        if (headRemaining.compareTo_9jj042_k$(remaining) <= 0) {
          remaining = remaining.minus_mfbszm_k$(headRemaining);
          var tmp0_elvis_lhs = p.steal_1tck0f_k$();
          var tmp;
          if (tmp0_elvis_lhs == null) {
            throw new EOFException('Unexpected end of packet');
          } else {
            tmp = tmp0_elvis_lhs;
          }
          this.appendSingleChunk_7rbwf9_k$(tmp);
        } else {
          // Inline function 'io.ktor.utils.io.core.read' call
          // Inline function 'kotlin.contracts.contract' call
          var tmp0_elvis_lhs_0 = p.prepareRead_yxo41n_k$(1);
          var tmp_0;
          if (tmp0_elvis_lhs_0 == null) {
            prematureEndOfStream(1);
          } else {
            tmp_0 = tmp0_elvis_lhs_0;
          }
          var buffer = tmp_0;
          var positionBefore = buffer.get_readPosition_70qxnc_k$();
          try {
            // Inline function 'io.ktor.utils.io.core.Output.writePacket.<anonymous>' call
            writeFully_1(this, buffer, remaining.toInt_1tsl84_k$());
          } finally {
            var positionAfter = buffer.get_readPosition_70qxnc_k$();
            if (positionAfter < positionBefore) {
              throw IllegalStateException_init_$Create$("Buffer's position shouldn't be rewinded");
            }
            if (positionAfter === buffer.get_writePosition_jdt81t_k$()) {
              p.ensureNext_39ripn_k$(buffer);
            } else {
              p.set_headPosition_cd3vm_k$(positionAfter);
            }
          }
          break $l$loop;
        }
      }
    };
    protoOf(Output).append_nldnbc_k$ = function (csq, start, end) {
      writeText_0(this, csq, start, end, Charsets_getInstance().get_UTF_8_ihn39z_k$());
      return this;
    };
    protoOf(Output).release_wu5yyf_k$ = function () {
      this.close_yn9xrc_k$();
    };
    protoOf(Output).prepareWriteHead_ugmxj4_k$ = function (n) {
      // Inline function 'io.ktor.utils.io.core.Output.tailRemaining' call
      if (((this.tailEndExclusive_1 - this.tailPosition_1) | 0) >= n) {
        var tmp0_safe_receiver = this._tail_1;
        if (tmp0_safe_receiver == null) null;
        else {
          // Inline function 'kotlin.let' call
          // Inline function 'kotlin.contracts.contract' call
          tmp0_safe_receiver.commitWrittenUntilIndex_umptfg_k$(this.tailPosition_1);
          return tmp0_safe_receiver;
        }
      }
      return appendNewChunk(this);
    };
    protoOf(Output).afterHeadWrite_dl47zh_k$ = function () {
      var tmp0_safe_receiver = this._tail_1;
      if (tmp0_safe_receiver == null) null;
      else {
        // Inline function 'kotlin.let' call
        // Inline function 'kotlin.contracts.contract' call
        this.tailPosition_1 = tmp0_safe_receiver.get_writePosition_jdt81t_k$();
      }
    };
    protoOf(Output).write_foiksz_k$ = function (size, block) {
      var buffer = this.prepareWriteHead_ugmxj4_k$(size);
      try {
        var result = block(buffer);
        // Inline function 'kotlin.check' call
        // Inline function 'kotlin.contracts.contract' call
        if (!(result >= 0)) {
          // Inline function 'io.ktor.utils.io.core.Output.write.<anonymous>' call
          var message = "The returned value shouldn't be negative";
          throw IllegalStateException_init_$Create$(toString(message));
        }
        return result;
      } finally {
        this.afterHeadWrite_dl47zh_k$();
      }
    };
    protoOf(Output).last_7ebqo_k$ = function (buffer) {
      this.appendSingleChunk_7rbwf9_k$(buffer);
    };
    protoOf(Output).afterBytesStolen_t0d06e_k$ = function () {
      var head = this.get_head_won7e1_k$();
      if (!(head === Companion_getInstance_4().get_Empty_i9b85g_k$())) {
        // Inline function 'kotlin.check' call
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'kotlin.check' call
        // Inline function 'kotlin.contracts.contract' call
        if (!(head.get_next_wor1vg_k$() == null)) {
          // Inline function 'kotlin.check.<anonymous>' call
          var message = 'Check failed.';
          throw IllegalStateException_init_$Create$(toString(message));
        }
        head.resetForWrite_2oalv9_k$();
        head.reserveEndGap_i4z3fz_k$(Companion_getInstance_1().get_ReservedSize_b4jt5a_k$());
        this.tailPosition_1 = head.get_writePosition_jdt81t_k$();
        this.tailInitialPosition_1 = this.tailPosition_1;
        this.tailEndExclusive_1 = head.get_limit_iuokuq_k$();
      }
    };
    function writeWhileSize(_this__u8e3s4, initialSize, block) {
      initialSize = initialSize === VOID ? 1 : initialSize;
      var tail = prepareWriteHead(_this__u8e3s4, initialSize, null);
      try {
        var size;
        $l$loop: while (true) {
          size = block(tail);
          if (size <= 0) break $l$loop;
          tail = prepareWriteHead(_this__u8e3s4, size, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function writeWhile(_this__u8e3s4, block) {
      var tail = prepareWriteHead(_this__u8e3s4, 1, null);
      try {
        $l$loop: while (block(tail)) {
          tail = prepareWriteHead(_this__u8e3s4, 1, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function writeFully_1(_this__u8e3s4, src, length) {
      var tmp;
      if (length === VOID) {
        // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
        tmp = (src.get_writePosition_jdt81t_k$() - src.get_readPosition_70qxnc_k$()) | 0;
      } else {
        tmp = length;
      }
      length = tmp;
      // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate' call
      var currentOffset = 0;
      var remaining = length;
      // Inline function 'io.ktor.utils.io.core.writeWhile' call
      var tail = prepareWriteHead(_this__u8e3s4, 1, null);
      try {
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate.<anonymous>' call
          var buffer = tail;
          // Inline function 'kotlin.comparisons.minOf' call
          var a = remaining;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          var b = (buffer.get_limit_iuokuq_k$() - buffer.get_writePosition_jdt81t_k$()) | 0;
          var size = Math.min(a, b);
          // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
          writeFully_0(buffer, src, size);
          currentOffset = (currentOffset + size) | 0;
          remaining = (remaining - size) | 0;
          if (!(remaining > 0)) break $l$loop;
          tail = prepareWriteHead(_this__u8e3s4, 1, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function writeFully_2(_this__u8e3s4, src, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (src.length - offset) | 0 : length;
      // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate' call
      var currentOffset = offset;
      var remaining = length;
      // Inline function 'io.ktor.utils.io.core.writeWhile' call
      var tail = prepareWriteHead(_this__u8e3s4, 1, null);
      try {
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate.<anonymous>' call
          var buffer = tail;
          // Inline function 'kotlin.comparisons.minOf' call
          var a = remaining;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          var b = (buffer.get_limit_iuokuq_k$() - buffer.get_writePosition_jdt81t_k$()) | 0;
          var size = Math.min(a, b);
          // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
          var currentOffset_0 = currentOffset;
          writeFully(buffer, src, currentOffset_0, size);
          currentOffset = (currentOffset + size) | 0;
          remaining = (remaining - size) | 0;
          if (!(remaining > 0)) break $l$loop;
          tail = prepareWriteHead(_this__u8e3s4, 1, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function writeFully_3(_this__u8e3s4, src, offset, length) {
      writeFully_4(_this__u8e3s4, src, toLong(offset), toLong(length));
    }
    function writeFullyBytesTemplate(_this__u8e3s4, offset, length, block) {
      var currentOffset = offset;
      var remaining = length;
      // Inline function 'io.ktor.utils.io.core.writeWhile' call
      var tail = prepareWriteHead(_this__u8e3s4, 1, null);
      try {
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate.<anonymous>' call
          var buffer = tail;
          // Inline function 'kotlin.comparisons.minOf' call
          var a = remaining;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          var b = (buffer.get_limit_iuokuq_k$() - buffer.get_writePosition_jdt81t_k$()) | 0;
          var size = Math.min(a, b);
          block(buffer, currentOffset, size);
          currentOffset = (currentOffset + size) | 0;
          remaining = (remaining - size) | 0;
          if (!(remaining > 0)) break $l$loop;
          tail = prepareWriteHead(_this__u8e3s4, 1, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function writeFully_4(_this__u8e3s4, src, offset, length) {
      // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate' call
      var currentOffset = offset;
      var remaining = length;
      // Inline function 'io.ktor.utils.io.core.writeWhile' call
      var tail = prepareWriteHead(_this__u8e3s4, 1, null);
      try {
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate.<anonymous>' call
          var buffer = tail;
          // Inline function 'kotlin.comparisons.minOf' call
          var a = remaining;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          var tmp$ret$0 = (buffer.get_limit_iuokuq_k$() - buffer.get_writePosition_jdt81t_k$()) | 0;
          var b = toLong(tmp$ret$0);
          var size = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
          // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
          var memory = buffer.get_memory_gl4362_k$();
          var destinationOffset = toLong(buffer.get_writePosition_jdt81t_k$());
          var sourceOffset = currentOffset;
          src.copyTo_ug0rjx_k$(memory, sourceOffset, size, destinationOffset);
          buffer.commitWritten_tkztjs_k$(size.toInt_1tsl84_k$());
          currentOffset = currentOffset.plus_r93sks_k$(size);
          remaining = remaining.minus_mfbszm_k$(size);
          if (!(remaining.compareTo_9jj042_k$(new Long(0, 0)) > 0)) break $l$loop;
          tail = prepareWriteHead(_this__u8e3s4, 1, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function writeFullyBytesTemplate_0(_this__u8e3s4, initialOffset, length, block) {
      var currentOffset = initialOffset;
      var remaining = length;
      // Inline function 'io.ktor.utils.io.core.writeWhile' call
      var tail = prepareWriteHead(_this__u8e3s4, 1, null);
      try {
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.core.writeFullyBytesTemplate.<anonymous>' call
          var buffer = tail;
          // Inline function 'kotlin.comparisons.minOf' call
          var a = remaining;
          // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
          var tmp$ret$0 = (buffer.get_limit_iuokuq_k$() - buffer.get_writePosition_jdt81t_k$()) | 0;
          var b = toLong(tmp$ret$0);
          var size = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
          block(buffer.get_memory_gl4362_k$(), toLong(buffer.get_writePosition_jdt81t_k$()), currentOffset, size);
          buffer.commitWritten_tkztjs_k$(size.toInt_1tsl84_k$());
          currentOffset = currentOffset.plus_r93sks_k$(size);
          remaining = remaining.minus_mfbszm_k$(size);
          if (!(remaining.compareTo_9jj042_k$(new Long(0, 0)) > 0)) break $l$loop;
          tail = prepareWriteHead(_this__u8e3s4, 1, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function writeShort_0(_this__u8e3s4, value) {
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.writePrimitiveTemplate' call
        var index = _this__u8e3s4.get_tailPosition_6y9qfy_k$();
        if (((_this__u8e3s4.get_tailEndExclusive_e33hh8_k$() - index) | 0) > 2) {
          _this__u8e3s4.set_tailPosition_5ggwhe_k$((index + 2) | 0);
          // Inline function 'io.ktor.utils.io.core.writeShort.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.storeShortAt' call
          _this__u8e3s4.get_tailMemory_3da60q_k$().get_view_wow8a6_k$().setInt16(index, value, false);
          tmp$ret$0 = true;
          break $l$block;
        }
        tmp$ret$0 = false;
      }
      if (!tmp$ret$0) {
        writeShortFallback(_this__u8e3s4, value);
      }
    }
    function writeInt_0(_this__u8e3s4, value) {
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.writePrimitiveTemplate' call
        var index = _this__u8e3s4.get_tailPosition_6y9qfy_k$();
        if (((_this__u8e3s4.get_tailEndExclusive_e33hh8_k$() - index) | 0) > 4) {
          _this__u8e3s4.set_tailPosition_5ggwhe_k$((index + 4) | 0);
          // Inline function 'io.ktor.utils.io.core.writeInt.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.storeIntAt' call
          _this__u8e3s4.get_tailMemory_3da60q_k$().get_view_wow8a6_k$().setInt32(index, value, false);
          tmp$ret$0 = true;
          break $l$block;
        }
        tmp$ret$0 = false;
      }
      if (!tmp$ret$0) {
        writeIntFallback(_this__u8e3s4, value);
      }
    }
    function writeLong_0(_this__u8e3s4, value) {
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.writePrimitiveTemplate' call
        var index = _this__u8e3s4.get_tailPosition_6y9qfy_k$();
        if (((_this__u8e3s4.get_tailEndExclusive_e33hh8_k$() - index) | 0) > 8) {
          _this__u8e3s4.set_tailPosition_5ggwhe_k$((index + 8) | 0);
          // Inline function 'io.ktor.utils.io.core.writeLong.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.storeLongAt' call
          var this_0 = _this__u8e3s4.get_tailMemory_3da60q_k$();
          this_0.get_view_wow8a6_k$().setInt32(index, value.shr_9fl3wl_k$(32).toInt_1tsl84_k$(), false);
          this_0
            .get_view_wow8a6_k$()
            .setInt32((index + 4) | 0, value.and_4spn93_k$(new Long(-1, 0)).toInt_1tsl84_k$(), false);
          tmp$ret$0 = true;
          break $l$block;
        }
        tmp$ret$0 = false;
      }
      if (!tmp$ret$0) {
        writeLongFallback(_this__u8e3s4, value);
      }
    }
    function writeFloat(_this__u8e3s4, value) {
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.writePrimitiveTemplate' call
        var index = _this__u8e3s4.get_tailPosition_6y9qfy_k$();
        if (((_this__u8e3s4.get_tailEndExclusive_e33hh8_k$() - index) | 0) > 4) {
          _this__u8e3s4.set_tailPosition_5ggwhe_k$((index + 4) | 0);
          // Inline function 'io.ktor.utils.io.core.writeFloat.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.storeFloatAt' call
          _this__u8e3s4.get_tailMemory_3da60q_k$().get_view_wow8a6_k$().setFloat32(index, value, false);
          tmp$ret$0 = true;
          break $l$block;
        }
        tmp$ret$0 = false;
      }
      if (!tmp$ret$0) {
        writeIntFallback(_this__u8e3s4, toRawBits(value));
      }
    }
    function writeDouble(_this__u8e3s4, value) {
      var tmp$ret$0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.writePrimitiveTemplate' call
        var index = _this__u8e3s4.get_tailPosition_6y9qfy_k$();
        if (((_this__u8e3s4.get_tailEndExclusive_e33hh8_k$() - index) | 0) > 8) {
          _this__u8e3s4.set_tailPosition_5ggwhe_k$((index + 8) | 0);
          // Inline function 'io.ktor.utils.io.core.writeDouble.<anonymous>' call
          // Inline function 'io.ktor.utils.io.bits.storeDoubleAt' call
          _this__u8e3s4.get_tailMemory_3da60q_k$().get_view_wow8a6_k$().setFloat64(index, value, false);
          tmp$ret$0 = true;
          break $l$block;
        }
        tmp$ret$0 = false;
      }
      if (!tmp$ret$0) {
        writeLongFallback(_this__u8e3s4, toRawBits_0(value));
      }
    }
    function writePrimitiveTemplate(_this__u8e3s4, componentSize, block) {
      var index = _this__u8e3s4.get_tailPosition_6y9qfy_k$();
      if (((_this__u8e3s4.get_tailEndExclusive_e33hh8_k$() - index) | 0) > componentSize) {
        _this__u8e3s4.set_tailPosition_5ggwhe_k$((index + componentSize) | 0);
        block(_this__u8e3s4.get_tailMemory_3da60q_k$(), index);
        return true;
      }
      return false;
    }
    function writeShortFallback(_this__u8e3s4, value) {
      // Inline function 'io.ktor.utils.io.core.writePrimitiveFallbackTemplate' call
      var tail = _this__u8e3s4.prepareWriteHead_ugmxj4_k$(2);
      // Inline function 'io.ktor.utils.io.core.writeShortFallback.<anonymous>' call
      writeShort(tail, value);
      _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      if (!true) {
        // Inline function 'io.ktor.utils.io.bits.highByte' call
        var tmp$ret$1 = toByte((value >>> 8) | 0);
        _this__u8e3s4.writeByte_9ih3z3_k$(tmp$ret$1);
        // Inline function 'io.ktor.utils.io.bits.lowByte' call
        var tmp$ret$2 = toByte(value & 255);
        _this__u8e3s4.writeByte_9ih3z3_k$(tmp$ret$2);
      }
    }
    function writeIntFallback(_this__u8e3s4, value) {
      // Inline function 'io.ktor.utils.io.core.writePrimitiveFallbackTemplate' call
      var tail = _this__u8e3s4.prepareWriteHead_ugmxj4_k$(4);
      // Inline function 'io.ktor.utils.io.core.writeIntFallback.<anonymous>' call
      writeInt(tail, value);
      _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      if (!true) {
        writeIntByteByByte(_this__u8e3s4, value);
      }
    }
    function writeLongFallback(_this__u8e3s4, value) {
      // Inline function 'io.ktor.utils.io.core.writePrimitiveFallbackTemplate' call
      var tail = _this__u8e3s4.prepareWriteHead_ugmxj4_k$(8);
      // Inline function 'io.ktor.utils.io.core.writeLongFallback.<anonymous>' call
      writeLong(tail, value);
      _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      if (!true) {
        // Inline function 'io.ktor.utils.io.bits.highInt' call
        var tmp$ret$1 = value.ushr_z7nmq8_k$(32).toInt_1tsl84_k$();
        writeIntByteByByte(_this__u8e3s4, tmp$ret$1);
        // Inline function 'io.ktor.utils.io.bits.lowInt' call
        var tmp$ret$2 = value.and_4spn93_k$(new Long(-1, 0)).toInt_1tsl84_k$();
        writeIntByteByByte(_this__u8e3s4, tmp$ret$2);
      }
    }
    function writePrimitiveFallbackTemplate(_this__u8e3s4, componentSize, writeOperation) {
      var tail = _this__u8e3s4.prepareWriteHead_ugmxj4_k$(componentSize);
      writeOperation(tail);
      _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      return true;
    }
    function writeIntByteByByte(_this__u8e3s4, value) {
      // Inline function 'kotlin.let' call
      // Inline function 'io.ktor.utils.io.bits.highShort' call
      // Inline function 'kotlin.contracts.contract' call
      var it = toShort((value >>> 16) | 0);
      // Inline function 'io.ktor.utils.io.bits.highByte' call
      var tmp$ret$1 = toByte((it >>> 8) | 0);
      _this__u8e3s4.writeByte_9ih3z3_k$(tmp$ret$1);
      // Inline function 'io.ktor.utils.io.bits.lowByte' call
      var tmp$ret$2 = toByte(it & 255);
      _this__u8e3s4.writeByte_9ih3z3_k$(tmp$ret$2);
      // Inline function 'kotlin.let' call
      // Inline function 'io.ktor.utils.io.bits.lowShort' call
      // Inline function 'kotlin.contracts.contract' call
      var it_0 = toShort(value & 65535);
      // Inline function 'io.ktor.utils.io.bits.highByte' call
      var tmp$ret$5 = toByte((it_0 >>> 8) | 0);
      _this__u8e3s4.writeByte_9ih3z3_k$(tmp$ret$5);
      // Inline function 'io.ktor.utils.io.bits.lowByte' call
      var tmp$ret$6 = toByte(it_0 & 255);
      _this__u8e3s4.writeByte_9ih3z3_k$(tmp$ret$6);
    }
    function get_isEmpty(_this__u8e3s4) {
      return _this__u8e3s4.get_endOfInput_skegkh_k$();
    }
    function get_isNotEmpty(_this__u8e3s4) {
      return !_this__u8e3s4.get_endOfInput_skegkh_k$();
    }
    function read_0(_this__u8e3s4, n, block) {
      n = n === VOID ? 1 : n;
      // Inline function 'kotlin.contracts.contract' call
      var tmp0_elvis_lhs = _this__u8e3s4.prepareRead_yxo41n_k$(n);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        prematureEndOfStream(n);
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var buffer = tmp;
      var positionBefore = buffer.get_readPosition_70qxnc_k$();
      try {
        block(buffer);
      } finally {
        var positionAfter = buffer.get_readPosition_70qxnc_k$();
        if (positionAfter < positionBefore) {
          throw IllegalStateException_init_$Create$("Buffer's position shouldn't be rewinded");
        }
        if (positionAfter === buffer.get_writePosition_jdt81t_k$()) {
          _this__u8e3s4.ensureNext_39ripn_k$(buffer);
        } else {
          _this__u8e3s4.set_headPosition_cd3vm_k$(positionAfter);
        }
      }
    }
    function toByteArray(_this__u8e3s4, charset) {
      charset = charset === VOID ? Charsets_getInstance().get_UTF_8_ihn39z_k$() : charset;
      if (charset.equals(Charsets_getInstance().get_UTF_8_ihn39z_k$())) return encodeToByteArray(_this__u8e3s4);
      return encodeToByteArray_0(charset.newEncoder_gqwcdg_k$(), _this__u8e3s4, 0, _this__u8e3s4.length);
    }
    function readText(_this__u8e3s4, charset, max) {
      charset = charset === VOID ? Charsets_getInstance().get_UTF_8_ihn39z_k$() : charset;
      max = max === VOID ? IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$() : max;
      return decode(charset.newDecoder_zcettw_k$(), _this__u8e3s4, max);
    }
    function readBytes(_this__u8e3s4, n) {
      var tmp;
      if (n === VOID) {
        // Inline function 'io.ktor.utils.io.core.coerceAtMostMaxIntOrFail' call
        var this_0 = _this__u8e3s4.get_remaining_mwegr1_k$();
        var message = 'Unable to convert to a ByteArray: packet is too big';
        if (this_0.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) > 0)
          throw IllegalArgumentException_init_$Create$(message);
        tmp = this_0.toInt_1tsl84_k$();
      } else {
        tmp = n;
      }
      n = tmp;
      var tmp_0;
      if (!(n === 0)) {
        // Inline function 'kotlin.also' call
        var this_1 = new Int8Array(n);
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'io.ktor.utils.io.core.readBytes.<anonymous>' call
        readFully_3(_this__u8e3s4, this_1, 0, n);
        tmp_0 = this_1;
      } else {
        tmp_0 = get_EmptyByteArray();
      }
      return tmp_0;
    }
    function prematureEndOfStream(size) {
      throw new EOFException('Premature end of stream: expected ' + size + ' bytes');
    }
    function readTextExactBytes(_this__u8e3s4, bytesCount, charset) {
      charset = charset === VOID ? Charsets_getInstance().get_UTF_8_ihn39z_k$() : charset;
      return decodeExactBytes(charset.newDecoder_zcettw_k$(), _this__u8e3s4, bytesCount);
    }
    function writeText(_this__u8e3s4, text, fromIndex, toIndex, charset) {
      fromIndex = fromIndex === VOID ? 0 : fromIndex;
      toIndex = toIndex === VOID ? charSequenceLength(text) : toIndex;
      charset = charset === VOID ? Charsets_getInstance().get_UTF_8_ihn39z_k$() : charset;
      if (charset === Charsets_getInstance().get_UTF_8_ihn39z_k$()) {
        return writeTextUtf8(_this__u8e3s4, text, fromIndex, toIndex);
      }
      encodeToImpl(charset.newEncoder_gqwcdg_k$(), _this__u8e3s4, text, fromIndex, toIndex);
    }
    function writeText_0(_this__u8e3s4, text, fromIndex, toIndex, charset) {
      fromIndex = fromIndex === VOID ? 0 : fromIndex;
      toIndex = toIndex === VOID ? text.length : toIndex;
      charset = charset === VOID ? Charsets_getInstance().get_UTF_8_ihn39z_k$() : charset;
      if (charset === Charsets_getInstance().get_UTF_8_ihn39z_k$()) {
        return writeTextUtf8(_this__u8e3s4, new CharArraySequence(text, 0, text.length), fromIndex, toIndex);
      }
      encode(charset.newEncoder_gqwcdg_k$(), text, fromIndex, toIndex, _this__u8e3s4);
    }
    function writeTextUtf8(_this__u8e3s4, text, fromIndex, toIndex) {
      var index = fromIndex;
      // Inline function 'io.ktor.utils.io.core.writeWhileSize' call
      var tail = prepareWriteHead(_this__u8e3s4, 1, null);
      try {
        var size;
        $l$loop: while (true) {
          // Inline function 'io.ktor.utils.io.core.writeTextUtf8.<anonymous>' call
          var buffer = tail;
          var memory = buffer.get_memory_gl4362_k$();
          var dstOffset = buffer.get_writePosition_jdt81t_k$();
          var dstLimit = buffer.get_limit_iuokuq_k$();
          var tmp0_container = encodeUTF8(memory, text, index, toIndex, dstOffset, dstLimit);
          var characters = EncodeResult__component1_impl_36tlhi(tmp0_container);
          var bytes = EncodeResult__component2_impl_3nv7vp(tmp0_container);
          var tmp = index;
          // Inline function 'kotlin.UShort.toInt' call
          index = (tmp + (_UShort___get_data__impl__g0245(characters) & 65535)) | 0;
          // Inline function 'kotlin.UShort.toInt' call
          var tmp$ret$1 = _UShort___get_data__impl__g0245(bytes) & 65535;
          buffer.commitWritten_tkztjs_k$(tmp$ret$1);
          var tmp_0;
          var tmp_1;
          // Inline function 'kotlin.UShort.toInt' call
          if ((_UShort___get_data__impl__g0245(characters) & 65535) === 0) {
            tmp_1 = index < toIndex;
          } else {
            tmp_1 = false;
          }
          if (tmp_1) {
            tmp_0 = 8;
          } else {
            if (index < toIndex) {
              tmp_0 = 1;
            } else {
              tmp_0 = 0;
            }
          }
          size = tmp_0;
          if (size <= 0) break $l$loop;
          tail = prepareWriteHead(_this__u8e3s4, size, tail);
        }
      } finally {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
    }
    function _get_array__jslnqg($this) {
      return $this.array_1;
    }
    function _get_offset__c6qzmg($this) {
      return $this.offset_1;
    }
    function indexOutOfBounds($this, index) {
      throw IndexOutOfBoundsException_init_$Create$('String index out of bounds: ' + index + ' > ' + $this.length_1);
    }
    function CharArraySequence(array, offset, length) {
      this.array_1 = array;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf(CharArraySequence).get_length_g42xv3_k$ = function () {
      return this.length_1;
    };
    protoOf(CharArraySequence).get_kdzpvg_k$ = function (index) {
      if (index >= this.length_1) {
        indexOutOfBounds(this, index);
      }
      return this.array_1[(index + this.offset_1) | 0];
    };
    protoOf(CharArraySequence).subSequence_hm5hnj_k$ = function (startIndex, endIndex) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(startIndex >= 0)) {
        // Inline function 'io.ktor.utils.io.core.internal.CharArraySequence.subSequence.<anonymous>' call
        var message = "startIndex shouldn't be negative: " + startIndex;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(startIndex <= this.length_1)) {
        // Inline function 'io.ktor.utils.io.core.internal.CharArraySequence.subSequence.<anonymous>' call
        var message_0 = 'startIndex is too large: ' + startIndex + ' > ' + this.length_1;
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(((startIndex + endIndex) | 0) <= this.length_1)) {
        // Inline function 'io.ktor.utils.io.core.internal.CharArraySequence.subSequence.<anonymous>' call
        var message_1 = 'endIndex is too large: ' + endIndex + ' > ' + this.length_1;
        throw IllegalArgumentException_init_$Create$(toString(message_1));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(endIndex >= startIndex)) {
        // Inline function 'io.ktor.utils.io.core.internal.CharArraySequence.subSequence.<anonymous>' call
        var message_2 = 'endIndex should be greater or equal to startIndex: ' + startIndex + ' > ' + endIndex;
        throw IllegalArgumentException_init_$Create$(toString(message_2));
      }
      return new CharArraySequence(this.array_1, (this.offset_1 + startIndex) | 0, (endIndex - startIndex) | 0);
    };
    function ChunkBuffer$Companion$EmptyPool$1() {}
    protoOf(ChunkBuffer$Companion$EmptyPool$1).get_capacity_wxbgcd_k$ = function () {
      return 1;
    };
    protoOf(ChunkBuffer$Companion$EmptyPool$1).borrow_mvkpor_k$ = function () {
      return Companion_getInstance_4().Empty_1;
    };
    protoOf(ChunkBuffer$Companion$EmptyPool$1).recycle_2vlm99_k$ = function (instance) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(instance === Companion_getInstance_4().Empty_1)) {
        // Inline function 'io.ktor.utils.io.core.internal.<no name provided>.recycle.<anonymous>' call
        var message = 'Only ChunkBuffer.Empty instance could be recycled.';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
    };
    protoOf(ChunkBuffer$Companion$EmptyPool$1).recycle_d2xv5h_k$ = function (instance) {
      return this.recycle_2vlm99_k$(instance instanceof ChunkBuffer ? instance : THROW_CCE());
    };
    protoOf(ChunkBuffer$Companion$EmptyPool$1).dispose_3nnxhr_k$ = function () {};
    function ChunkBuffer$Companion$NoPool$1() {
      NoPoolImpl.call(this);
    }
    protoOf(ChunkBuffer$Companion$NoPool$1).borrow_mvkpor_k$ = function () {
      return new ChunkBuffer(DefaultAllocator_getInstance().alloc_l8bx4z_k$(get_DEFAULT_BUFFER_SIZE()), null, this);
    };
    protoOf(ChunkBuffer$Companion$NoPool$1).recycle_2vlm99_k$ = function (instance) {
      DefaultAllocator_getInstance().free_r48ke1_k$(instance.get_memory_gl4362_k$());
    };
    protoOf(ChunkBuffer$Companion$NoPool$1).recycle_d2xv5h_k$ = function (instance) {
      return this.recycle_2vlm99_k$(instance instanceof ChunkBuffer ? instance : THROW_CCE());
    };
    function ChunkBuffer$Companion$NoPoolManuallyManaged$1() {
      NoPoolImpl.call(this);
    }
    protoOf(ChunkBuffer$Companion$NoPoolManuallyManaged$1).borrow_mvkpor_k$ = function () {
      throw UnsupportedOperationException_init_$Create$_0("This pool doesn't support borrow");
    };
    protoOf(ChunkBuffer$Companion$NoPoolManuallyManaged$1).recycle_2vlm99_k$ = function (instance) {};
    protoOf(ChunkBuffer$Companion$NoPoolManuallyManaged$1).recycle_d2xv5h_k$ = function (instance) {
      return this.recycle_2vlm99_k$(instance instanceof ChunkBuffer ? instance : THROW_CCE());
    };
    function _get_nextRef__cbbs0f($this) {
      return $this.nextRef_1;
    }
    function _get_refCount__6xgqup($this) {
      return $this.refCount_1;
    }
    function _set_origin__gfzohd($this, _set____db54di) {
      $this.origin_1 = _set____db54di;
    }
    function appendNext($this, chunk) {
      if (!$this.nextRef_1.atomicfu$compareAndSet(null, chunk)) {
        throw IllegalStateException_init_$Create$('This chunk has already a next chunk.');
      }
    }
    function Companion_2() {
      Companion_instance_2 = this;
      var tmp = this;
      tmp.EmptyPool_1 = new ChunkBuffer$Companion$EmptyPool$1();
      this.Empty_1 = new ChunkBuffer(Companion_getInstance_6().get_Empty_i9b85g_k$(), null, this.EmptyPool_1);
      var tmp_0 = this;
      tmp_0.NoPool_1 = new ChunkBuffer$Companion$NoPool$1();
      var tmp_1 = this;
      tmp_1.NoPoolManuallyManaged_1 = new ChunkBuffer$Companion$NoPoolManuallyManaged$1();
    }
    protoOf(Companion_2).get_Pool_wo83gl_k$ = function () {
      return get_DefaultChunkedBufferPool();
    };
    protoOf(Companion_2).get_EmptyPool_i65buo_k$ = function () {
      return this.EmptyPool_1;
    };
    protoOf(Companion_2).get_Empty_i9b85g_k$ = function () {
      return this.Empty_1;
    };
    protoOf(Companion_2).get_NoPool_21p86e_k$ = function () {
      return this.NoPool_1;
    };
    protoOf(Companion_2).get_NoPoolManuallyManaged_qxqaiu_k$ = function () {
      return this.NoPoolManuallyManaged_1;
    };
    var Companion_instance_2;
    function Companion_getInstance_4() {
      if (Companion_instance_2 == null) new Companion_2();
      return Companion_instance_2;
    }
    function ChunkBuffer(memory, origin, parentPool) {
      Companion_getInstance_4();
      Buffer.call(this, memory);
      this.parentPool_1 = parentPool;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!(origin === this)) {
        // Inline function 'io.ktor.utils.io.core.internal.ChunkBuffer.<anonymous>' call
        var message = "A chunk couldn't be a view of itself.";
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      this.nextRef_1 = atomic$ref$1(null);
      this.refCount_1 = atomic$int$1(1);
      this.origin_1 = origin;
    }
    protoOf(ChunkBuffer).get_parentPool_o7zxjl_k$ = function () {
      return this.parentPool_1;
    };
    protoOf(ChunkBuffer).get_origin_hq9xkf_k$ = function () {
      return this.origin_1;
    };
    protoOf(ChunkBuffer).set_next_v483mr_k$ = function (newValue) {
      if (newValue == null) {
        this.cleanNext_l2yy3o_k$();
      } else {
        appendNext(this, newValue);
      }
    };
    protoOf(ChunkBuffer).get_next_wor1vg_k$ = function () {
      return this.nextRef_1.get_kotlinx$atomicfu$value_vi2am5_k$();
    };
    protoOf(ChunkBuffer).get_referenceCount_1ialcd_k$ = function () {
      return this.refCount_1.get_kotlinx$atomicfu$value_vi2am5_k$();
    };
    protoOf(ChunkBuffer).cleanNext_l2yy3o_k$ = function () {
      return this.nextRef_1.atomicfu$getAndSet(null);
    };
    protoOf(ChunkBuffer).duplicate_jvgc97_k$ = function () {
      // Inline function 'kotlin.let' call
      var tmp0_elvis_lhs = this.origin_1;
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.internal.ChunkBuffer.duplicate.<anonymous>' call
      var newOrigin = tmp0_elvis_lhs == null ? this : tmp0_elvis_lhs;
      newOrigin.acquire_9gxgqi_k$();
      // Inline function 'kotlin.also' call
      var this_0 = new ChunkBuffer(this.get_memory_gl4362_k$(), newOrigin, this.parentPool_1);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.internal.ChunkBuffer.duplicate.<anonymous>.<anonymous>' call
      this.duplicateTo_5gqm85_k$(this_0);
      return this_0;
    };
    protoOf(ChunkBuffer).release_vbevvg_k$ = function (pool) {
      if (this.release_i1b8cn_k$()) {
        var origin = this.origin_1;
        if (!(origin == null)) {
          this.unlink_ie9ubh_k$();
          origin.release_vbevvg_k$(pool);
        } else {
          var tmp0_elvis_lhs = this.parentPool_1;
          var poolToUse = tmp0_elvis_lhs == null ? pool : tmp0_elvis_lhs;
          poolToUse.recycle_d2xv5h_k$(this);
        }
      }
    };
    protoOf(ChunkBuffer).unlink_ie9ubh_k$ = function () {
      if (!this.refCount_1.atomicfu$compareAndSet(0, -1)) {
        throw IllegalStateException_init_$Create$('Unable to unlink: buffer is in use.');
      }
      this.cleanNext_l2yy3o_k$();
      this.origin_1 = null;
    };
    protoOf(ChunkBuffer).acquire_9gxgqi_k$ = function () {
      $l$block: {
        // Inline function 'kotlinx.atomicfu.update' call
        var this_0 = this.refCount_1;
        while (true) {
          var cur = this_0.get_kotlinx$atomicfu$value_vi2am5_k$();
          // Inline function 'io.ktor.utils.io.core.internal.ChunkBuffer.acquire.<anonymous>' call
          if (cur <= 0) throw IllegalStateException_init_$Create$('Unable to acquire chunk: it is already released.');
          var upd = (cur + 1) | 0;
          if (this_0.atomicfu$compareAndSet(cur, upd)) {
            break $l$block;
          }
        }
      }
    };
    protoOf(ChunkBuffer).unpark_bsw1f_k$ = function () {
      $l$block: {
        // Inline function 'kotlinx.atomicfu.update' call
        var this_0 = this.refCount_1;
        while (true) {
          var cur = this_0.get_kotlinx$atomicfu$value_vi2am5_k$();
          // Inline function 'io.ktor.utils.io.core.internal.ChunkBuffer.unpark.<anonymous>' call
          if (cur < 0) {
            throw IllegalStateException_init_$Create$("This instance is already disposed and couldn't be borrowed.");
          }
          if (cur > 0) {
            throw IllegalStateException_init_$Create$(
              'This instance is already in use but somehow appeared in the pool.',
            );
          }
          var upd = 1;
          if (this_0.atomicfu$compareAndSet(cur, upd)) {
            break $l$block;
          }
        }
      }
    };
    protoOf(ChunkBuffer).release_i1b8cn_k$ = function () {
      var tmp$ret$1;
      $l$block: {
        // Inline function 'kotlinx.atomicfu.updateAndGet' call
        var this_0 = this.refCount_1;
        while (true) {
          var cur = this_0.get_kotlinx$atomicfu$value_vi2am5_k$();
          // Inline function 'io.ktor.utils.io.core.internal.ChunkBuffer.release.<anonymous>' call
          if (cur <= 0) throw IllegalStateException_init_$Create$('Unable to release: it is already released.');
          var upd = (cur - 1) | 0;
          if (this_0.atomicfu$compareAndSet(cur, upd)) {
            tmp$ret$1 = upd;
            break $l$block;
          }
        }
      }
      return tmp$ret$1 === 0;
    };
    protoOf(ChunkBuffer).reset_5u6xz3_k$ = function () {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(this.origin_1 == null)) {
        // Inline function 'io.ktor.utils.io.core.internal.ChunkBuffer.reset.<anonymous>' call
        var message = 'Unable to reset buffer with origin';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      protoOf(Buffer).reset_5u6xz3_k$.call(this);
      this.nextRef_1.set_kotlinx$atomicfu$value_508e3y_k$(null);
    };
    function isExclusivelyOwned(_this__u8e3s4) {
      return _this__u8e3s4.get_referenceCount_1ialcd_k$() === 1;
    }
    function _EncodeResult___init__impl__vkc0cy(value) {
      return value;
    }
    function _EncodeResult___get_value__impl__h0r466($this) {
      return $this;
    }
    function _EncodeResult___init__impl__vkc0cy_0(characters, bytes) {
      // Inline function 'kotlin.UShort.toInt' call
      var tmp = (_UShort___get_data__impl__g0245(characters) & 65535) << 16;
      // Inline function 'kotlin.UShort.toInt' call
      var tmp$ret$1 = _UShort___get_data__impl__g0245(bytes) & 65535;
      return _EncodeResult___init__impl__vkc0cy(tmp | tmp$ret$1);
    }
    function _EncodeResult___get_characters__impl__rrxzcv($this) {
      // Inline function 'kotlin.toUShort' call
      // Inline function 'io.ktor.utils.io.bits.highShort' call
      var this_0 = _EncodeResult___get_value__impl__h0r466($this);
      var this_1 = toShort((this_0 >>> 16) | 0);
      return _UShort___init__impl__jigrne(this_1);
    }
    function _EncodeResult___get_bytes__impl__bt0kq0($this) {
      // Inline function 'kotlin.toUShort' call
      // Inline function 'io.ktor.utils.io.bits.lowShort' call
      var this_0 = _EncodeResult___get_value__impl__h0r466($this);
      var this_1 = toShort(this_0 & 65535);
      return _UShort___init__impl__jigrne(this_1);
    }
    function EncodeResult__component1_impl_36tlhi($this) {
      return _EncodeResult___get_characters__impl__rrxzcv($this);
    }
    function EncodeResult__component2_impl_3nv7vp($this) {
      return _EncodeResult___get_bytes__impl__bt0kq0($this);
    }
    function EncodeResult__toString_impl_ck9qjy($this) {
      return 'EncodeResult(value=' + $this + ')';
    }
    function EncodeResult__hashCode_impl_96w68x($this) {
      return $this;
    }
    function EncodeResult__equals_impl_szairf($this, other) {
      if (!(other instanceof EncodeResult)) return false;
      if (!($this === (other instanceof EncodeResult ? other.value_1 : THROW_CCE()))) return false;
      return true;
    }
    function EncodeResult(value) {
      this.value_1 = value;
    }
    protoOf(EncodeResult).toString = function () {
      return EncodeResult__toString_impl_ck9qjy(this.value_1);
    };
    protoOf(EncodeResult).hashCode = function () {
      return EncodeResult__hashCode_impl_96w68x(this.value_1);
    };
    protoOf(EncodeResult).equals = function (other) {
      return EncodeResult__equals_impl_szairf(this.value_1, other);
    };
    function toIntOrFail(_this__u8e3s4, name) {
      if (_this__u8e3s4.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(_this__u8e3s4, name);
      }
      return _this__u8e3s4.toInt_1tsl84_k$();
    }
    function failLongToIntConversion(value, name) {
      throw IllegalArgumentException_init_$Create$(
        'Long value ' + value.toString() + ' of ' + name + " doesn't fit into 32-bit integer",
      );
    }
    function decodeASCII(_this__u8e3s4, consumer) {
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.internal.decodeASCII.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      var endExclusive = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var inductionVariable = start;
      if (inductionVariable < endExclusive)
        do {
          var index = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          // Inline function 'io.ktor.utils.io.bits.get' call
          // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
          var codepoint = memory.get_view_wow8a6_k$().getInt8(index) & 255;
          if ((codepoint & 128) === 128 ? true : !consumer(new Char(numberToChar(codepoint)))) {
            _this__u8e3s4.discardExact_11sae1_k$((index - start) | 0);
            return false;
          }
        } while (inductionVariable < endExclusive);
      var rc = (endExclusive - start) | 0;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return true;
    }
    function MalformedUTF8InputException(message) {
      Exception_init_$Init$(message, this);
      captureStack(this, MalformedUTF8InputException);
    }
    function decodeUTF8(_this__u8e3s4, consumer) {
      var byteCount = 0;
      var value = 0;
      var lastByteCount = 0;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.internal.decodeUTF8.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      var endExclusive = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var inductionVariable = start;
      if (inductionVariable < endExclusive)
        do {
          var index = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          // Inline function 'io.ktor.utils.io.bits.get' call
          // Inline function 'io.ktor.utils.io.bits.Memory.loadAt' call
          var v = memory.get_view_wow8a6_k$().getInt8(index) & 255;
          if ((v & 128) === 0) {
            if (!(byteCount === 0)) {
              malformedByteCount(byteCount);
            }
            if (!consumer(new Char(numberToChar(v)))) {
              _this__u8e3s4.discardExact_11sae1_k$((index - start) | 0);
              return -1;
            }
          } else if (byteCount === 0) {
            var mask = 128;
            value = v;
            var inductionVariable_0 = 1;
            if (inductionVariable_0 <= 6)
              $l$loop: do {
                var i = inductionVariable_0;
                inductionVariable_0 = (inductionVariable_0 + 1) | 0;
                if (!((value & mask) === 0)) {
                  value = value & ~mask;
                  mask = mask >> 1;
                  byteCount = (byteCount + 1) | 0;
                } else {
                  break $l$loop;
                }
              } while (inductionVariable_0 <= 6);
            lastByteCount = byteCount;
            byteCount = (byteCount - 1) | 0;
            if (lastByteCount > ((endExclusive - index) | 0)) {
              _this__u8e3s4.discardExact_11sae1_k$((index - start) | 0);
              return lastByteCount;
            }
          } else {
            value = (value << 6) | (v & 127);
            byteCount = (byteCount - 1) | 0;
            if (byteCount === 0) {
              if (isBmpCodePoint(value)) {
                if (!consumer(new Char(numberToChar(value)))) {
                  _this__u8e3s4.discardExact_11sae1_k$((((((index - start) | 0) - lastByteCount) | 0) + 1) | 0);
                  return -1;
                }
              } else if (!isValidCodePoint(value)) {
                malformedCodePoint(value);
              } else {
                if (
                  !consumer(new Char(numberToChar(highSurrogate(value))))
                    ? true
                    : !consumer(new Char(numberToChar(lowSurrogate(value))))
                ) {
                  _this__u8e3s4.discardExact_11sae1_k$((((((index - start) | 0) - lastByteCount) | 0) + 1) | 0);
                  return -1;
                }
              }
              value = 0;
            }
          }
        } while (inductionVariable < endExclusive);
      var rc = (endExclusive - start) | 0;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return 0;
    }
    function decodeUTF8LineLoopSuspend(out, limit, nextChunk, afterRead, $completion) {
      var tmp = new $decodeUTF8LineLoopSuspendCOROUTINE$51(out, limit, nextChunk, afterRead, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function malformedByteCount(byteCount) {
      throw new MalformedUTF8InputException('Expected ' + byteCount + ' more character bytes');
    }
    function isBmpCodePoint(cp) {
      return ((cp >>> 16) | 0) === 0;
    }
    function isValidCodePoint(codePoint) {
      return codePoint <= 1114111;
    }
    function malformedCodePoint(value) {
      throw IllegalArgumentException_init_$Create$('Malformed code-point ' + value + ' found');
    }
    function highSurrogate(cp) {
      return (((cp >>> 10) | 0) + 55232) | 0;
    }
    function lowSurrogate(cp) {
      return ((cp & 1023) + 56320) | 0;
    }
    function prematureEndOfStreamUtf(size) {
      throw new EOFException('Premature end of stream: expected ' + size + ' bytes to decode UTF-8 char');
    }
    function get_MaxCodePoint() {
      return MaxCodePoint;
    }
    var MaxCodePoint;
    function get_HighSurrogateMagic() {
      return HighSurrogateMagic;
    }
    var HighSurrogateMagic;
    function get_MinLowSurrogate() {
      return MinLowSurrogate;
    }
    var MinLowSurrogate;
    function putUtf8Char(_this__u8e3s4, offset, v) {
      var tmp;
      if (0 <= v ? v <= 127 : false) {
        // Inline function 'io.ktor.utils.io.bits.Memory.storeAt' call
        var value = toByte(v);
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value);
        tmp = 1;
      } else if (128 <= v ? v <= 2047 : false) {
        // Inline function 'io.ktor.utils.io.bits.set' call
        var value_0 = toByte(192 | ((v >> 6) & 31));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_0);
        // Inline function 'io.ktor.utils.io.bits.set' call
        var index = (offset + 1) | 0;
        var value_1 = toByte(128 | (v & 63));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(index, value_1);
        tmp = 2;
      } else if (2048 <= v ? v <= 65535 : false) {
        // Inline function 'io.ktor.utils.io.bits.set' call
        var value_2 = toByte(224 | ((v >> 12) & 15));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_2);
        // Inline function 'io.ktor.utils.io.bits.set' call
        var index_0 = (offset + 1) | 0;
        var value_3 = toByte(128 | ((v >> 6) & 63));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_0, value_3);
        // Inline function 'io.ktor.utils.io.bits.set' call
        var index_1 = (offset + 2) | 0;
        var value_4 = toByte(128 | (v & 63));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_1, value_4);
        tmp = 3;
      } else if (65536 <= v ? v <= 1114111 : false) {
        // Inline function 'io.ktor.utils.io.bits.set' call
        var value_5 = toByte(240 | ((v >> 18) & 7));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_5);
        // Inline function 'io.ktor.utils.io.bits.set' call
        var index_2 = (offset + 1) | 0;
        var value_6 = toByte(128 | ((v >> 12) & 63));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_2, value_6);
        // Inline function 'io.ktor.utils.io.bits.set' call
        var index_3 = (offset + 2) | 0;
        var value_7 = toByte(128 | ((v >> 6) & 63));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_3, value_7);
        // Inline function 'io.ktor.utils.io.bits.set' call
        var index_4 = (offset + 3) | 0;
        var value_8 = toByte(128 | (v & 63));
        _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_4, value_8);
        tmp = 4;
      } else {
        malformedCodePoint(v);
      }
      return tmp;
    }
    function encodeUTF8(_this__u8e3s4, text, from, to, dstOffset, dstLimit) {
      // Inline function 'kotlin.comparisons.minOf' call
      // Inline function 'kotlin.UShort.toInt' call
      var this_0 = Companion_getInstance_0().get_MAX_VALUE_gfkyu8_k$();
      var b = (from + (_UShort___get_data__impl__g0245(this_0) & 65535)) | 0;
      var lastCharIndex = Math.min(to, b);
      // Inline function 'kotlin.UShort.toInt' call
      var this_1 = Companion_getInstance_0().get_MAX_VALUE_gfkyu8_k$();
      var tmp$ret$2 = _UShort___get_data__impl__g0245(this_1) & 65535;
      var resultLimit = coerceAtMost_0(dstLimit, tmp$ret$2);
      var resultPosition = dstOffset;
      var index = from;
      $l$loop: do {
        if (resultPosition >= resultLimit ? true : index >= lastCharIndex) {
          // Inline function 'kotlin.toUShort' call
          var this_2 = (index - from) | 0;
          var tmp = _UShort___init__impl__jigrne(toShort(this_2));
          // Inline function 'kotlin.toUShort' call
          var this_3 = (resultPosition - dstOffset) | 0;
          var tmp$ret$4 = _UShort___init__impl__jigrne(toShort(this_3));
          return _EncodeResult___init__impl__vkc0cy_0(tmp, tmp$ret$4);
        }
        // Inline function 'kotlin.code' call
        var tmp0 = index;
        index = (tmp0 + 1) | 0;
        var this_4 = charSequenceGet(text, tmp0);
        var character = Char__toInt_impl_vasixd(this_4) & 65535;
        if ((character & 65408) === 0) {
          // Inline function 'io.ktor.utils.io.bits.Memory.storeAt' call
          var tmp1 = resultPosition;
          resultPosition = (tmp1 + 1) | 0;
          var value = toByte(character);
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(tmp1, value);
        } else {
          break $l$loop;
        }
      } while (true);
      index = (index - 1) | 0;
      return encodeUTF8Stage1(_this__u8e3s4, text, index, lastCharIndex, from, resultPosition, resultLimit, dstOffset);
    }
    function encodeUTF8Stage1(
      _this__u8e3s4,
      text,
      index1,
      lastCharIndex,
      from,
      resultPosition1,
      resultLimit,
      dstOffset,
    ) {
      var index = index1;
      var resultPosition = resultPosition1;
      var stage1Limit = (resultLimit - 3) | 0;
      $l$loop: do {
        var freeSpace = (stage1Limit - resultPosition) | 0;
        if (freeSpace <= 0 ? true : index >= lastCharIndex) {
          break $l$loop;
        }
        var tmp0 = index;
        index = (tmp0 + 1) | 0;
        var character = charSequenceGet(text, tmp0);
        var tmp;
        if (isHighSurrogate(character)) {
          var tmp_0;
          if (index === lastCharIndex ? true : !isLowSurrogate(charSequenceGet(text, index))) {
            tmp_0 = 63;
          } else {
            var tmp1 = index;
            index = (tmp1 + 1) | 0;
            tmp_0 = codePoint(character, charSequenceGet(text, tmp1));
          }
          tmp = tmp_0;
        } else {
          // Inline function 'kotlin.code' call
          tmp = Char__toInt_impl_vasixd(character);
        }
        var codepoint = tmp;
        // Inline function 'io.ktor.utils.io.core.internal.putUtf8Char' call
        var offset = resultPosition;
        var tmp_1;
        if (0 <= codepoint ? codepoint <= 127 : false) {
          // Inline function 'io.ktor.utils.io.bits.Memory.storeAt' call
          var value = toByte(codepoint);
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value);
          tmp_1 = 1;
        } else if (128 <= codepoint ? codepoint <= 2047 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_0 = toByte(192 | ((codepoint >> 6) & 31));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_0);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_0 = (offset + 1) | 0;
          var value_1 = toByte(128 | (codepoint & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_0, value_1);
          tmp_1 = 2;
        } else if (2048 <= codepoint ? codepoint <= 65535 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_2 = toByte(224 | ((codepoint >> 12) & 15));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_2);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_1 = (offset + 1) | 0;
          var value_3 = toByte(128 | ((codepoint >> 6) & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_1, value_3);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_2 = (offset + 2) | 0;
          var value_4 = toByte(128 | (codepoint & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_2, value_4);
          tmp_1 = 3;
        } else if (65536 <= codepoint ? codepoint <= 1114111 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_5 = toByte(240 | ((codepoint >> 18) & 7));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_5);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_3 = (offset + 1) | 0;
          var value_6 = toByte(128 | ((codepoint >> 12) & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_3, value_6);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_4 = (offset + 2) | 0;
          var value_7 = toByte(128 | ((codepoint >> 6) & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_4, value_7);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_5 = (offset + 3) | 0;
          var value_8 = toByte(128 | (codepoint & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_5, value_8);
          tmp_1 = 4;
        } else {
          malformedCodePoint(codepoint);
        }
        var size = tmp_1;
        resultPosition = (resultPosition + size) | 0;
      } while (true);
      if (resultPosition === stage1Limit) {
        return encodeUTF8Stage2(
          _this__u8e3s4,
          text,
          index,
          lastCharIndex,
          from,
          resultPosition,
          resultLimit,
          dstOffset,
        );
      }
      // Inline function 'kotlin.toUShort' call
      var this_0 = (index - from) | 0;
      var tmp_2 = _UShort___init__impl__jigrne(toShort(this_0));
      // Inline function 'kotlin.toUShort' call
      var this_1 = (resultPosition - dstOffset) | 0;
      var tmp$ret$12 = _UShort___init__impl__jigrne(toShort(this_1));
      return _EncodeResult___init__impl__vkc0cy_0(tmp_2, tmp$ret$12);
    }
    function codePoint(high, low) {
      // Inline function 'kotlin.code' call
      var highValue = (Char__toInt_impl_vasixd(high) - 55232) | 0;
      // Inline function 'kotlin.code' call
      var lowValue = (Char__toInt_impl_vasixd(low) - 56320) | 0;
      return (highValue << 10) | lowValue;
    }
    function encodeUTF8Stage2(
      _this__u8e3s4,
      text,
      index1,
      lastCharIndex,
      from,
      resultPosition1,
      resultLimit,
      dstOffset,
    ) {
      var index = index1;
      var resultPosition = resultPosition1;
      $l$loop_0: do {
        var freeSpace = (resultLimit - resultPosition) | 0;
        if (freeSpace <= 0 ? true : index >= lastCharIndex) {
          break $l$loop_0;
        }
        var tmp0 = index;
        index = (tmp0 + 1) | 0;
        var character = charSequenceGet(text, tmp0);
        var tmp;
        if (!isHighSurrogate(character)) {
          // Inline function 'kotlin.code' call
          tmp = Char__toInt_impl_vasixd(character);
        } else {
          var tmp_0;
          if (index === lastCharIndex ? true : !isLowSurrogate(charSequenceGet(text, index))) {
            tmp_0 = 63;
          } else {
            var tmp1 = index;
            index = (tmp1 + 1) | 0;
            tmp_0 = codePoint(character, charSequenceGet(text, tmp1));
          }
          tmp = tmp_0;
        }
        var codepoint = tmp;
        // Inline function 'io.ktor.utils.io.core.internal.charactersSize' call
        var tmp_1;
        if (1 <= codepoint ? codepoint <= 127 : false) {
          tmp_1 = 1;
        } else if (128 <= codepoint ? codepoint <= 2047 : false) {
          tmp_1 = 2;
        } else if (2048 <= codepoint ? codepoint <= 65535 : false) {
          tmp_1 = 3;
        } else if (65536 <= codepoint ? codepoint <= 1114111 : false) {
          tmp_1 = 4;
        } else {
          malformedCodePoint(codepoint);
        }
        if (tmp_1 > freeSpace) {
          index = (index - 1) | 0;
          break $l$loop_0;
        }
        // Inline function 'io.ktor.utils.io.core.internal.putUtf8Char' call
        var offset = resultPosition;
        var tmp_2;
        if (0 <= codepoint ? codepoint <= 127 : false) {
          // Inline function 'io.ktor.utils.io.bits.Memory.storeAt' call
          var value = toByte(codepoint);
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value);
          tmp_2 = 1;
        } else if (128 <= codepoint ? codepoint <= 2047 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_0 = toByte(192 | ((codepoint >> 6) & 31));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_0);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_0 = (offset + 1) | 0;
          var value_1 = toByte(128 | (codepoint & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_0, value_1);
          tmp_2 = 2;
        } else if (2048 <= codepoint ? codepoint <= 65535 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_2 = toByte(224 | ((codepoint >> 12) & 15));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_2);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_1 = (offset + 1) | 0;
          var value_3 = toByte(128 | ((codepoint >> 6) & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_1, value_3);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_2 = (offset + 2) | 0;
          var value_4 = toByte(128 | (codepoint & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_2, value_4);
          tmp_2 = 3;
        } else if (65536 <= codepoint ? codepoint <= 1114111 : false) {
          // Inline function 'io.ktor.utils.io.bits.set' call
          var value_5 = toByte(240 | ((codepoint >> 18) & 7));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(offset, value_5);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_3 = (offset + 1) | 0;
          var value_6 = toByte(128 | ((codepoint >> 12) & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_3, value_6);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_4 = (offset + 2) | 0;
          var value_7 = toByte(128 | ((codepoint >> 6) & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_4, value_7);
          // Inline function 'io.ktor.utils.io.bits.set' call
          var index_5 = (offset + 3) | 0;
          var value_8 = toByte(128 | (codepoint & 63));
          _this__u8e3s4.get_view_wow8a6_k$().setInt8(index_5, value_8);
          tmp_2 = 4;
        } else {
          malformedCodePoint(codepoint);
        }
        var size = tmp_2;
        resultPosition = (resultPosition + size) | 0;
      } while (true);
      // Inline function 'kotlin.toUShort' call
      var this_0 = (index - from) | 0;
      var tmp_3 = _UShort___init__impl__jigrne(toShort(this_0));
      // Inline function 'kotlin.toUShort' call
      var this_1 = (resultPosition - dstOffset) | 0;
      var tmp$ret$13 = _UShort___init__impl__jigrne(toShort(this_1));
      return _EncodeResult___init__impl__vkc0cy_0(tmp_3, tmp$ret$13);
    }
    function charactersSize(v) {
      var tmp;
      if (1 <= v ? v <= 127 : false) {
        tmp = 1;
      } else if (128 <= v ? v <= 2047 : false) {
        tmp = 2;
      } else if (2048 <= v ? v <= 65535 : false) {
        tmp = 3;
      } else if (65536 <= v ? v <= 1114111 : false) {
        tmp = 4;
      } else {
        malformedCodePoint(v);
      }
      return tmp;
    }
    function $decodeUTF8LineLoopSuspendCOROUTINE$51(out, limit, nextChunk, afterRead, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this.out_1 = out;
      this.limit_1 = limit;
      this.nextChunk_1 = nextChunk;
      this.afterRead_1 = afterRead;
    }
    protoOf($decodeUTF8LineLoopSuspendCOROUTINE$51).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.decoded0__1 = 0;
              this.size1__1 = 1;
              this.cr2__1 = false;
              this.end3__1 = false;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(!this.end3__1 ? !(this.size1__1 === 0) : false)) {
                this.set_state_rjd8d0_k$(5);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(2);
              suspendResult = this.nextChunk_1(this.size1__1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              var tmp0_elvis_lhs = suspendResult;
              var WHEN_RESULT;
              if (tmp0_elvis_lhs == null) {
                this.set_state_rjd8d0_k$(5);
                continue $sm;
              } else {
                WHEN_RESULT = tmp0_elvis_lhs;
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

            case 3:
              var chunk = WHEN_RESULT;
              var totalBytes = chunk.get_remaining_mwegr1_k$();
              l$ret$1: do {
                var release = true;
                var tmp0_elvis_lhs_0 = prepareReadFirstHead(chunk, 1);
                var tmp_0;
                if (tmp0_elvis_lhs_0 == null) {
                  break l$ret$1;
                } else {
                  tmp_0 = tmp0_elvis_lhs_0;
                }
                var current = tmp_0;
                var size = 1;
                l$ret$15: do {
                  try {
                    $l$loop_0: do {
                      var this_0 = current;
                      var before = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
                      var after;
                      if (before >= size) {
                        l$ret$13: do {
                          try {
                            var buffer = current;
                            var skip = 0;
                            var tmp_1 = this;
                            var tmp$ret$4;
                            l$ret$5: do {
                              var byteCount = 0;
                              var value = 0;
                              var lastByteCount = 0;
                              var memory = buffer.get_memory_gl4362_k$();
                              var start = buffer.get_readPosition_70qxnc_k$();
                              var endExclusive = buffer.get_writePosition_jdt81t_k$();
                              var inductionVariable = start;
                              if (inductionVariable < endExclusive)
                                do {
                                  var index = inductionVariable;
                                  inductionVariable = (inductionVariable + 1) | 0;
                                  var v = memory.get_view_wow8a6_k$().getInt8(index) & 255;
                                  if ((v & 128) === 0) {
                                    if (!(byteCount === 0)) {
                                      malformedByteCount(byteCount);
                                    }
                                    var tmp$ret$2;
                                    l$ret$3: do {
                                      var ch = numberToChar(v);
                                      var tmp_2;
                                      if (ch === _Char___init__impl__6a9atx(13)) {
                                        if (this.cr2__1) {
                                          this.end3__1 = true;
                                          tmp$ret$2 = false;
                                          break l$ret$3;
                                        }
                                        this.cr2__1 = true;
                                        tmp_2 = true;
                                      } else if (ch === _Char___init__impl__6a9atx(10)) {
                                        this.end3__1 = true;
                                        skip = 1;
                                        tmp_2 = false;
                                      } else {
                                        if (this.cr2__1) {
                                          this.end3__1 = true;
                                          tmp$ret$2 = false;
                                          break l$ret$3;
                                        }
                                        if (this.decoded0__1 === this.limit_1) {
                                          throw new TooLongLineException(
                                            'Too many characters in line: limit ' + this.limit_1 + ' exceeded',
                                          );
                                        }
                                        this.decoded0__1 = (this.decoded0__1 + 1) | 0;
                                        this.out_1.append_am5a4z_k$(ch);
                                        tmp_2 = true;
                                      }
                                      tmp$ret$2 = tmp_2;
                                    } while (false);
                                    if (!tmp$ret$2) {
                                      buffer.discardExact_11sae1_k$((index - start) | 0);
                                      tmp$ret$4 = -1;
                                      break l$ret$5;
                                    }
                                  } else if (byteCount === 0) {
                                    var mask = 128;
                                    value = v;
                                    var inductionVariable_0 = 1;
                                    if (inductionVariable_0 <= 6)
                                      $l$loop: do {
                                        var i = inductionVariable_0;
                                        inductionVariable_0 = (inductionVariable_0 + 1) | 0;
                                        if (!((value & mask) === 0)) {
                                          value = value & ~mask;
                                          mask = mask >> 1;
                                          byteCount = (byteCount + 1) | 0;
                                        } else {
                                          break $l$loop;
                                        }
                                      } while (inductionVariable_0 <= 6);
                                    lastByteCount = byteCount;
                                    byteCount = (byteCount - 1) | 0;
                                    if (lastByteCount > ((endExclusive - index) | 0)) {
                                      buffer.discardExact_11sae1_k$((index - start) | 0);
                                      tmp$ret$4 = lastByteCount;
                                      break l$ret$5;
                                    }
                                  } else {
                                    value = (value << 6) | (v & 127);
                                    byteCount = (byteCount - 1) | 0;
                                    if (byteCount === 0) {
                                      if (isBmpCodePoint(value)) {
                                        var tmp$ret$6;
                                        l$ret$7: do {
                                          var ch_0 = numberToChar(value);
                                          var tmp_3;
                                          if (ch_0 === _Char___init__impl__6a9atx(13)) {
                                            if (this.cr2__1) {
                                              this.end3__1 = true;
                                              tmp$ret$6 = false;
                                              break l$ret$7;
                                            }
                                            this.cr2__1 = true;
                                            tmp_3 = true;
                                          } else if (ch_0 === _Char___init__impl__6a9atx(10)) {
                                            this.end3__1 = true;
                                            skip = 1;
                                            tmp_3 = false;
                                          } else {
                                            if (this.cr2__1) {
                                              this.end3__1 = true;
                                              tmp$ret$6 = false;
                                              break l$ret$7;
                                            }
                                            if (this.decoded0__1 === this.limit_1) {
                                              throw new TooLongLineException(
                                                'Too many characters in line: limit ' + this.limit_1 + ' exceeded',
                                              );
                                            }
                                            this.decoded0__1 = (this.decoded0__1 + 1) | 0;
                                            this.out_1.append_am5a4z_k$(ch_0);
                                            tmp_3 = true;
                                          }
                                          tmp$ret$6 = tmp_3;
                                        } while (false);
                                        if (!tmp$ret$6) {
                                          buffer.discardExact_11sae1_k$(
                                            (((((index - start) | 0) - lastByteCount) | 0) + 1) | 0,
                                          );
                                          tmp$ret$4 = -1;
                                          break l$ret$5;
                                        }
                                      } else if (!isValidCodePoint(value)) {
                                        malformedCodePoint(value);
                                      } else {
                                        var tmp_4;
                                        var tmp$ret$8;
                                        l$ret$9: do {
                                          var ch_1 = numberToChar(highSurrogate(value));
                                          var tmp_5;
                                          if (ch_1 === _Char___init__impl__6a9atx(13)) {
                                            if (this.cr2__1) {
                                              this.end3__1 = true;
                                              tmp$ret$8 = false;
                                              break l$ret$9;
                                            }
                                            this.cr2__1 = true;
                                            tmp_5 = true;
                                          } else if (ch_1 === _Char___init__impl__6a9atx(10)) {
                                            this.end3__1 = true;
                                            skip = 1;
                                            tmp_5 = false;
                                          } else {
                                            if (this.cr2__1) {
                                              this.end3__1 = true;
                                              tmp$ret$8 = false;
                                              break l$ret$9;
                                            }
                                            if (this.decoded0__1 === this.limit_1) {
                                              throw new TooLongLineException(
                                                'Too many characters in line: limit ' + this.limit_1 + ' exceeded',
                                              );
                                            }
                                            this.decoded0__1 = (this.decoded0__1 + 1) | 0;
                                            this.out_1.append_am5a4z_k$(ch_1);
                                            tmp_5 = true;
                                          }
                                          tmp$ret$8 = tmp_5;
                                        } while (false);
                                        if (!tmp$ret$8) {
                                          tmp_4 = true;
                                        } else {
                                          var tmp$ret$10;
                                          l$ret$11: do {
                                            var ch_2 = numberToChar(lowSurrogate(value));
                                            var tmp_6;
                                            if (ch_2 === _Char___init__impl__6a9atx(13)) {
                                              if (this.cr2__1) {
                                                this.end3__1 = true;
                                                tmp$ret$10 = false;
                                                break l$ret$11;
                                              }
                                              this.cr2__1 = true;
                                              tmp_6 = true;
                                            } else if (ch_2 === _Char___init__impl__6a9atx(10)) {
                                              this.end3__1 = true;
                                              skip = 1;
                                              tmp_6 = false;
                                            } else {
                                              if (this.cr2__1) {
                                                this.end3__1 = true;
                                                tmp$ret$10 = false;
                                                break l$ret$11;
                                              }
                                              if (this.decoded0__1 === this.limit_1) {
                                                throw new TooLongLineException(
                                                  'Too many characters in line: limit ' + this.limit_1 + ' exceeded',
                                                );
                                              }
                                              this.decoded0__1 = (this.decoded0__1 + 1) | 0;
                                              this.out_1.append_am5a4z_k$(ch_2);
                                              tmp_6 = true;
                                            }
                                            tmp$ret$10 = tmp_6;
                                          } while (false);
                                          tmp_4 = !tmp$ret$10;
                                        }
                                        if (tmp_4) {
                                          buffer.discardExact_11sae1_k$(
                                            (((((index - start) | 0) - lastByteCount) | 0) + 1) | 0,
                                          );
                                          tmp$ret$4 = -1;
                                          break l$ret$5;
                                        }
                                      }
                                      value = 0;
                                    }
                                  }
                                } while (inductionVariable < endExclusive);
                              var rc = (endExclusive - start) | 0;
                              buffer.discardExact_11sae1_k$(rc);
                              tmp$ret$4 = 0;
                            } while (false);
                            tmp_1.size1__1 = tmp$ret$4;
                            if (skip > 0) {
                              buffer.discardExact_11sae1_k$(skip);
                            }
                            this.size1__1 = this.end3__1 ? 0 : coerceAtLeast(this.size1__1, 1);
                            size = this.size1__1;
                            break l$ret$13;
                          } catch ($p) {
                            var t = $p;
                            var this_1 = current;
                            after = (this_1.get_writePosition_jdt81t_k$() - this_1.get_readPosition_70qxnc_k$()) | 0;
                            throw t;
                          }
                        } while (false);
                        var this_2 = current;
                        after = (this_2.get_writePosition_jdt81t_k$() - this_2.get_readPosition_70qxnc_k$()) | 0;
                      } else {
                        after = before;
                      }
                      release = false;
                      var tmp_7;
                      if (after === 0) {
                        tmp_7 = prepareReadNextHead(chunk, current);
                      } else {
                        var tmp_8;
                        if (after < size) {
                          tmp_8 = true;
                        } else {
                          var this_3 = current;
                          tmp_8 =
                            ((this_3.get_capacity_wxbgcd_k$() - this_3.get_limit_iuokuq_k$()) | 0) <
                            Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
                        }
                        if (tmp_8) {
                          completeReadHead(chunk, current);
                          tmp_7 = prepareReadFirstHead(chunk, size);
                        } else {
                          tmp_7 = current;
                        }
                      }
                      var tmp1_elvis_lhs = tmp_7;
                      var tmp_9;
                      if (tmp1_elvis_lhs == null) {
                        break $l$loop_0;
                      } else {
                        tmp_9 = tmp1_elvis_lhs;
                      }
                      var next = tmp_9;
                      current = next;
                      release = true;
                    } while (size > 0);
                    break l$ret$15;
                  } catch ($p) {
                    var t_0 = $p;
                    if (release) {
                      completeReadHead(chunk, current);
                    }
                    throw t_0;
                  }
                } while (false);
                if (release) {
                  completeReadHead(chunk, current);
                }
              } while (false);
              this.afterRead_1(totalBytes.minus_mfbszm_k$(chunk.get_remaining_mwegr1_k$()).toInt_1tsl84_k$());
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 4:
              throw this.get_exception_x0n6w6_k$();
            case 5:
              if (this.size1__1 > 1) {
                prematureEndOfStreamUtf(this.size1__1);
              }

              if (this.cr2__1) {
                this.end3__1 = true;
              }

              return this.decoded0__1 > 0 ? true : this.end3__1;
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function get_EmptyByteArray() {
      _init_properties_Unsafe_kt__orlvcq();
      return EmptyByteArray;
    }
    var EmptyByteArray;
    function completeReadHead(_this__u8e3s4, current) {
      _init_properties_Unsafe_kt__orlvcq();
      if (current === _this__u8e3s4) return Unit_getInstance();
      else {
        // Inline function 'io.ktor.utils.io.core.canRead' call
        if (!(current.get_writePosition_jdt81t_k$() > current.get_readPosition_70qxnc_k$())) {
          _this__u8e3s4.ensureNext_39ripn_k$(current);
        } else {
          // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
          if (
            ((current.get_capacity_wxbgcd_k$() - current.get_limit_iuokuq_k$()) | 0) <
            Companion_getInstance_1().get_ReservedSize_b4jt5a_k$()
          ) {
            _this__u8e3s4.fixGapAfterRead_yrc9kb_k$(current);
          } else {
            _this__u8e3s4.set_headPosition_cd3vm_k$(current.get_readPosition_70qxnc_k$());
          }
        }
      }
    }
    function prepareReadFirstHead(_this__u8e3s4, minSize) {
      _init_properties_Unsafe_kt__orlvcq();
      return _this__u8e3s4.prepareReadHead_dk94or_k$(minSize);
    }
    function prepareReadNextHead(_this__u8e3s4, current) {
      _init_properties_Unsafe_kt__orlvcq();
      if (current === _this__u8e3s4) {
        return _this__u8e3s4.canRead_93a6bq_k$() ? _this__u8e3s4 : null;
      }
      return _this__u8e3s4.ensureNextHead_oerbph_k$(current);
    }
    function unsafeAppend(_this__u8e3s4, builder) {
      _init_properties_Unsafe_kt__orlvcq();
      var builderSize = builder.get_size_woubt6_k$();
      var tmp0_elvis_lhs = builder.stealAll_nensgi_k$();
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return 0;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var builderHead = tmp;
      if (
        (builderSize <= get_PACKET_MAX_COPY_SIZE() ? builderHead.get_next_wor1vg_k$() == null : false)
          ? _this__u8e3s4.tryWriteAppend_szyatk_k$(builderHead)
          : false
      ) {
        builder.afterBytesStolen_t0d06e_k$();
        return builderSize;
      }
      _this__u8e3s4.append_qgrwjw_k$(builderHead);
      return builderSize;
    }
    function prepareWriteHead(_this__u8e3s4, capacity, current) {
      _init_properties_Unsafe_kt__orlvcq();
      if (!(current == null)) {
        _this__u8e3s4.afterHeadWrite_dl47zh_k$();
      }
      return _this__u8e3s4.prepareWriteHead_ugmxj4_k$(capacity);
    }
    var properties_initialized_Unsafe_kt_o5mw48;
    function _init_properties_Unsafe_kt__orlvcq() {
      if (!properties_initialized_Unsafe_kt_o5mw48) {
        properties_initialized_Unsafe_kt_o5mw48 = true;
        EmptyByteArray = new Int8Array(0);
      }
    }
    function _get_suspension__g1gp0y($this) {
      return $this.suspension_1;
    }
    function trySuspend($this, sleepCondition, $completion) {
      var tmp = new $trySuspendCOROUTINE$53($this, sleepCondition, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function $sleepCOROUTINE$52(_this__u8e3s4, sleepCondition, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.sleepCondition_1 = sleepCondition;
    }
    protoOf($sleepCOROUTINE$52).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.set_state_rjd8d0_k$(1);
              suspendResult = trySuspend(this._this__u8e3s4__1, this.sleepCondition_1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              if (suspendResult) {
                return Unit_getInstance();
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 2:
              this._this__u8e3s4__1.resume_2o15jx_k$();
              return Unit_getInstance();
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $trySuspendCOROUTINE$53(_this__u8e3s4, sleepCondition, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.sleepCondition_1 = sleepCondition;
    }
    protoOf($trySuspendCOROUTINE$53).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              this.suspended0__1 = false;
              this.job1__1 = Job_0();
              if (
                this._this__u8e3s4__1.suspension_1.atomicfu$compareAndSet(null, this.job1__1)
                  ? this.sleepCondition_1()
                  : false
              ) {
                this.suspended0__1 = true;
                this.set_state_rjd8d0_k$(1);
                suspendResult = this.job1__1.join_o20dar_k$(this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.suspended0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function AwaitingSlot() {
      this.suspension_1 = atomic$ref$1(null);
    }
    protoOf(AwaitingSlot).sleep_nce3pz_k$ = function (sleepCondition, $completion) {
      var tmp = new $sleepCOROUTINE$52(this, sleepCondition, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(AwaitingSlot).resume_2o15jx_k$ = function () {
      var tmp0_safe_receiver = this.suspension_1.atomicfu$getAndSet(null);
      if (tmp0_safe_receiver == null) null;
      else tmp0_safe_receiver.complete_9ww6vb_k$();
    };
    protoOf(AwaitingSlot).cancel_9i2dv0_k$ = function (cause) {
      var tmp0_elvis_lhs = this.suspension_1.atomicfu$getAndSet(null);
      var tmp;
      if (tmp0_elvis_lhs == null) {
        return Unit_getInstance();
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var continuation = tmp;
      if (!(cause == null)) {
        continuation.completeExceptionally_xyzekf_k$(cause);
      } else {
        continuation.complete_9ww6vb_k$();
      }
    };
    function copyToSequentialImpl(_this__u8e3s4, dst, limit, $completion) {
      var tmp = new $copyToSequentialImplCOROUTINE$54(_this__u8e3s4, dst, limit, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function copyToTail(_this__u8e3s4, dst, limit, $completion) {
      var tmp = new $copyToTailCOROUTINE$55(_this__u8e3s4, dst, limit, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function $copyToSequentialImplCOROUTINE$54(_this__u8e3s4, dst, limit, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.limit_1 = limit;
    }
    protoOf($copyToSequentialImplCOROUTINE$54).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(10);
              if (!!(this._this__u8e3s4__1 === this.dst_1)) {
                var message = 'Failed requirement.';
                throw IllegalArgumentException_init_$Create$(toString(message));
              }

              if (!(this._this__u8e3s4__1.get_closedCause_o1qcj8_k$() == null)) {
                this.dst_1.close_ukldxa_k$(this._this__u8e3s4__1.get_closedCause_o1qcj8_k$());
                return new Long(0, 0);
              }

              this.remainingLimit0__1 = this.limit_1;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(this.remainingLimit0__1.compareTo_9jj042_k$(new Long(0, 0)) > 0)) {
                this.set_state_rjd8d0_k$(9);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.awaitInternalAtLeast1_fno9ji_k$(this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              this.ARGUMENT1__1 = suspendResult;
              if (!this.ARGUMENT1__1) {
                this.set_state_rjd8d0_k$(9);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

            case 3:
              this.transferred2__1 = this._this__u8e3s4__1.transferTo_rz8sl2_k$(this.dst_1, this.remainingLimit0__1);
              if (this.transferred2__1.equals(new Long(0, 0))) {
                this.set_state_rjd8d0_k$(6);
                suspendResult = copyToTail(this._this__u8e3s4__1, this.dst_1, this.remainingLimit0__1, this);
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                if (this.dst_1.get_availableForWrite_22rgeu_k$() === 0) {
                  this.set_state_rjd8d0_k$(4);
                  suspendResult = this.dst_1.awaitAtLeastNBytesAvailableForWrite_cfus3l_k$(1, this);
                  if (suspendResult === get_COROUTINE_SUSPENDED()) {
                    return suspendResult;
                  }
                  continue $sm;
                } else {
                  this.set_state_rjd8d0_k$(5);
                  continue $sm;
                }
              }

            case 4:
              this.set_state_rjd8d0_k$(5);
              continue $sm;
            case 5:
              this.WHEN_RESULT3__1 = this.transferred2__1;
              this.set_state_rjd8d0_k$(8);
              continue $sm;
            case 6:
              var tail = suspendResult;
              if (tail.equals(new Long(0, 0))) {
                this.set_state_rjd8d0_k$(9);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(7);
                continue $sm;
              }

            case 7:
              this.WHEN_RESULT3__1 = tail;
              this.set_state_rjd8d0_k$(8);
              continue $sm;
            case 8:
              var copied = this.WHEN_RESULT3__1;
              this.remainingLimit0__1 = this.remainingLimit0__1.minus_mfbszm_k$(copied);
              if (copied.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
                this.dst_1.flush_shahbo_k$();
              }

              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 9:
              return this.limit_1.minus_mfbszm_k$(this.remainingLimit0__1);
            case 10:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 10) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $copyToTailCOROUTINE$55(_this__u8e3s4, dst, limit, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.limit_1 = limit;
    }
    protoOf($copyToTailCOROUTINE$55).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(9);
              this.lastPiece0__1 = Companion_getInstance_4().get_Pool_wo83gl_k$().borrow_mvkpor_k$();
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              this.set_exceptionState_fex74n_k$(8);
              this.lastPiece0__1.resetForWrite_c461wd_k$(
                coerceAtMost(this.limit_1, toLong(this.lastPiece0__1.get_capacity_wxbgcd_k$())).toInt_1tsl84_k$(),
              );
              this.set_state_rjd8d0_k$(3);
              suspendResult = this._this__u8e3s4__1.readAvailable_wzcy2k_k$(this.lastPiece0__1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 3:
              this.rc3__1 = suspendResult;
              if (this.rc3__1 === -1) {
                this.lastPiece0__1.release_vbevvg_k$(Companion_getInstance_4().get_Pool_wo83gl_k$());
                this.tmp$ret$02__1 = new Long(0, 0);
                this.set_exceptionState_fex74n_k$(9);
                this.set_state_rjd8d0_k$(6);
                continue $sm;
              } else {
                this.set_state_rjd8d0_k$(4);
                continue $sm;
              }

            case 4:
              this.set_state_rjd8d0_k$(5);
              suspendResult = this.dst_1.writeFully_hz8k55_k$(this.lastPiece0__1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 5:
              this.tmp$ret$02__1 = toLong(this.rc3__1);
              this.set_exceptionState_fex74n_k$(9);
              this.set_state_rjd8d0_k$(6);
              var tmp_0 = this;
              continue $sm;
            case 6:
              var tmp_1 = this.tmp$ret$02__1;
              this.set_exceptionState_fex74n_k$(9);
              this.lastPiece0__1.release_vbevvg_k$(Companion_getInstance_4().get_Pool_wo83gl_k$());
              return tmp_1;
            case 7:
              this.set_exceptionState_fex74n_k$(9);
              this.lastPiece0__1.release_vbevvg_k$(Companion_getInstance_4().get_Pool_wo83gl_k$());
              return Unit_getInstance();
            case 8:
              this.set_exceptionState_fex74n_k$(9);
              var t = this.get_exception_x0n6w6_k$();
              this.lastPiece0__1.release_vbevvg_k$(Companion_getInstance_4().get_Pool_wo83gl_k$());
              throw t;
            case 9:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 9) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function get_ByteArrayPool() {
      _init_properties_ByteArrayPool_kt__kfi3uj();
      return ByteArrayPool;
    }
    var ByteArrayPool;
    function ByteArrayPool$1() {
      DefaultPool.call(this, 128);
    }
    protoOf(ByteArrayPool$1).produceInstance_xswihh_k$ = function () {
      return new Int8Array(4096);
    };
    var properties_initialized_ByteArrayPool_kt_td6pfh;
    function _init_properties_ByteArrayPool_kt__kfi3uj() {
      if (!properties_initialized_ByteArrayPool_kt_td6pfh) {
        properties_initialized_ByteArrayPool_kt_td6pfh = true;
        ByteArrayPool = new ByteArrayPool$1();
      }
    }
    function ObjectPool() {}
    function NoPoolImpl() {}
    protoOf(NoPoolImpl).get_capacity_wxbgcd_k$ = function () {
      return 0;
    };
    protoOf(NoPoolImpl).recycle_d2xv5h_k$ = function (instance) {};
    protoOf(NoPoolImpl).dispose_3nnxhr_k$ = function () {};
    function useInstance(_this__u8e3s4, block) {
      var instance = _this__u8e3s4.borrow_mvkpor_k$();
      try {
        return block(instance);
      } finally {
        _this__u8e3s4.recycle_d2xv5h_k$(instance);
      }
    }
    function ByteChannel_0(autoFlush) {
      autoFlush = autoFlush === VOID ? false : autoFlush;
      return new ByteChannelJS(Companion_getInstance_4().get_Empty_i9b85g_k$(), autoFlush);
    }
    function copyTo(_this__u8e3s4, dst, limit, $completion) {
      var tmp = _this__u8e3s4 instanceof ByteChannelSequentialBase ? _this__u8e3s4 : THROW_CCE();
      return copyToSequentialImpl(
        tmp,
        dst instanceof ByteChannelSequentialBase ? dst : THROW_CCE(),
        limit,
        $completion,
      );
    }
    function ByteReadChannel_0(content, offset, length) {
      // Inline function 'kotlin.collections.isEmpty' call
      if (content.length === 0) return Companion_getInstance_5().get_Empty_i9b85g_k$();
      var head = Companion_getInstance_4().get_Pool_wo83gl_k$().borrow_mvkpor_k$();
      var tail = head;
      var start = offset;
      var end = (start + length) | 0;
      $l$loop: while (true) {
        tail.reserveEndGap_i4z3fz_k$(8);
        // Inline function 'kotlin.comparisons.minOf' call
        var a = (end - start) | 0;
        // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
        var this_0 = tail;
        var b = (this_0.get_limit_iuokuq_k$() - this_0.get_writePosition_jdt81t_k$()) | 0;
        var size = Math.min(a, b);
        writeFully(tail instanceof Buffer ? tail : THROW_CCE(), content, start, size);
        start = (start + size) | 0;
        if (start === end) break $l$loop;
        var current = tail;
        tail = Companion_getInstance_4().get_Pool_wo83gl_k$().borrow_mvkpor_k$();
        current.set_next_v483mr_k$(tail);
      }
      // Inline function 'kotlin.apply' call
      var this_1 = new ByteChannelJS(head, false);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.ByteReadChannel.<anonymous>' call
      close_0(this_1);
      return this_1;
    }
    function _set_attachedJob__ugwmz8($this, _set____db54di) {
      $this.attachedJob_1 = _set____db54di;
    }
    function _get_attachedJob__6ignc($this) {
      return $this.attachedJob_1;
    }
    function readAvailableSuspend($this, dst, offset, length, $completion) {
      var tmp = new $readAvailableSuspendCOROUTINE$57($this, dst, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function readFullySuspend_1($this, dst, offset, length, $completion) {
      var tmp = new $readFullySuspendCOROUTINE$58($this, dst, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    }
    function ByteChannelJS$attachJob$lambda(this$0) {
      return function (cause) {
        this$0.attachedJob_1 = null;
        var tmp;
        if (!(cause == null)) {
          this$0.cancel_e74who_k$(unwrapCancellationException(cause));
          tmp = Unit_getInstance();
        }
        return Unit_getInstance();
      };
    }
    function $readAvailableCOROUTINE$56(_this__u8e3s4, dst, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($readAvailableCOROUTINE$56).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(3);
              if (this._this__u8e3s4__1.get_readable_ovw33t_k$().get_endOfInput_skegkh_k$()) {
                this.set_state_rjd8d0_k$(1);
                suspendResult = readAvailableSuspend(
                  this._this__u8e3s4__1,
                  this.dst_1,
                  this.offset_1,
                  this.length_1,
                  this,
                );
                if (suspendResult === get_COROUTINE_SUSPENDED()) {
                  return suspendResult;
                }
                continue $sm;
              } else {
                var tmp_0 = this;
                var tmp0_safe_receiver = this._this__u8e3s4__1.get_closedCause_o1qcj8_k$();
                if (tmp0_safe_receiver == null) null;
                else {
                  throw tmp0_safe_receiver;
                }
                var count = readAvailable_1(
                  this._this__u8e3s4__1.get_readable_ovw33t_k$(),
                  this.dst_1,
                  this.offset_1,
                  this.length_1,
                );
                this._this__u8e3s4__1.afterRead_biie6i_k$(count);
                tmp_0.WHEN_RESULT0__1 = count;
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 1:
              this.WHEN_RESULT0__1 = suspendResult;
              this.set_state_rjd8d0_k$(2);
              continue $sm;
            case 2:
              return this.WHEN_RESULT0__1;
            case 3:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 3) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readAvailableSuspendCOROUTINE$57(_this__u8e3s4, dst, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($readAvailableSuspendCOROUTINE$57).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.set_state_rjd8d0_k$(1);
              suspendResult = this._this__u8e3s4__1.await_wm3xku_k$(1, this);
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 1:
              this.ARGUMENT0__1 = suspendResult;
              if (!this.ARGUMENT0__1) {
                return -1;
              } else {
                this.set_state_rjd8d0_k$(2);
                continue $sm;
              }

            case 2:
              this.set_state_rjd8d0_k$(3);
              suspendResult = this._this__u8e3s4__1.readAvailable_w0u1jn_k$(
                this.dst_1,
                this.offset_1,
                this.length_1,
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 3:
              return suspendResult;
            case 4:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function $readFullySuspendCOROUTINE$58(_this__u8e3s4, dst, offset, length, resultContinuation) {
      CoroutineImpl.call(this, resultContinuation);
      this._this__u8e3s4__1 = _this__u8e3s4;
      this.dst_1 = dst;
      this.offset_1 = offset;
      this.length_1 = length;
    }
    protoOf($readFullySuspendCOROUTINE$58).doResume_5yljmg_k$ = function () {
      var suspendResult = this.get_result_iyg5d2_k$();
      $sm: do
        try {
          var tmp = this.get_state_iypx7s_k$();
          switch (tmp) {
            case 0:
              this.set_exceptionState_fex74n_k$(4);
              this.start0__1 = this.offset_1;
              this.end1__1 = (this.offset_1 + this.length_1) | 0;
              this.remaining2__1 = this.length_1;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 1:
              if (!(this.start0__1 < this.end1__1)) {
                this.set_state_rjd8d0_k$(3);
                continue $sm;
              }

              this.set_state_rjd8d0_k$(2);
              suspendResult = this._this__u8e3s4__1.readAvailable_w0u1jn_k$(
                this.dst_1,
                this.start0__1,
                this.remaining2__1,
                this,
              );
              if (suspendResult === get_COROUTINE_SUSPENDED()) {
                return suspendResult;
              }

              continue $sm;
            case 2:
              var rc = suspendResult;
              if (rc === -1)
                throw new EOFException('Premature end of stream: required ' + this.remaining2__1 + ' more bytes');
              this.start0__1 = (this.start0__1 + rc) | 0;
              this.remaining2__1 = (this.remaining2__1 - rc) | 0;
              this.set_state_rjd8d0_k$(1);
              continue $sm;
            case 3:
              return Unit_getInstance();
            case 4:
              throw this.get_exception_x0n6w6_k$();
          }
        } catch ($p) {
          var e = $p;
          if (this.get_exceptionState_wflpxn_k$() === 4) {
            throw e;
          } else {
            this.set_state_rjd8d0_k$(this.get_exceptionState_wflpxn_k$());
            this.set_exception_px07aa_k$(e);
          }
        }
      while (true);
    };
    function ByteChannelJS(initial, autoFlush) {
      ByteChannelSequentialBase.call(this, initial, autoFlush);
      this.attachedJob_1 = null;
    }
    protoOf(ByteChannelJS).attachJob_s2t2tl_k$ = function (job) {
      var tmp0_safe_receiver = this.attachedJob_1;
      if (tmp0_safe_receiver == null) null;
      else {
        tmp0_safe_receiver.cancel$default_8haxne_k$();
      }
      this.attachedJob_1 = job;
      job.invokeOnCompletion$default_1v3utx_k$(true, VOID, ByteChannelJS$attachJob$lambda(this));
    };
    protoOf(ByteChannelJS).readAvailable_w0u1jn_k$ = function (dst, offset, length, $completion) {
      var tmp = new $readAvailableCOROUTINE$56(this, dst, offset, length, $completion);
      tmp.set_result_xj64lm_k$(Unit_getInstance());
      tmp.set_exception_px07aa_k$(null);
      return tmp.doResume_5yljmg_k$();
    };
    protoOf(ByteChannelJS).readFully_oc61qm_k$ = function (dst, offset, length, $completion) {
      if (this.get_availableForRead_tq0sox_k$() >= length) {
        var tmp0_safe_receiver = this.get_closedCause_o1qcj8_k$();
        if (tmp0_safe_receiver == null) null;
        else {
          // Inline function 'kotlin.let' call
          // Inline function 'kotlin.contracts.contract' call
          throw tmp0_safe_receiver;
        }
        readFully_6(this.get_readable_ovw33t_k$(), dst, offset, length);
        this.afterRead_biie6i_k$((length - offset) | 0);
        return Unit_getInstance();
      }
      return readFullySuspend_1(this, dst, offset, length, $completion);
    };
    protoOf(ByteChannelJS).toString = function () {
      return 'ByteChannel[' + this.attachedJob_1 + ', ' + hashCode(this) + ']';
    };
    function ByteReadChannel$Companion$Empty$delegate$lambda() {
      // Inline function 'kotlin.apply' call
      var this_0 = new ByteChannelJS(Companion_getInstance_4().get_Empty_i9b85g_k$(), false);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.Companion.Empty$delegate.<anonymous>.<anonymous>' call
      this_0.close_ukldxa_k$(null);
      return this_0;
    }
    function Companion_3() {
      Companion_instance_3 = this;
      var tmp = this;
      tmp.Empty$delegate_1 = lazy(ByteReadChannel$Companion$Empty$delegate$lambda);
    }
    protoOf(Companion_3).get_Empty_i9b85g_k$ = function () {
      // Inline function 'kotlin.getValue' call
      var this_0 = this.Empty$delegate_1;
      Empty$factory();
      return this_0.get_value_j01efc_k$();
    };
    var Companion_instance_3;
    function Companion_getInstance_5() {
      if (Companion_instance_3 == null) new Companion_3();
      return Companion_instance_3;
    }
    function ByteReadChannel_1() {}
    function Empty$factory() {
      return getPropertyCallableRef(
        'Empty',
        1,
        KProperty1,
        function (receiver) {
          return receiver.get_Empty_i9b85g_k$();
        },
        null,
      );
    }
    function ByteWriteChannel() {}
    function DefaultAllocator() {
      DefaultAllocator_instance = this;
    }
    protoOf(DefaultAllocator).alloc_l8bx4z_k$ = function (size) {
      return new Memory(new DataView(new ArrayBuffer(size)));
    };
    protoOf(DefaultAllocator).alloc_n5v8h3_k$ = function (size) {
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      if (size.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(size, 'size');
      }
      var tmp$ret$0 = size.toInt_1tsl84_k$();
      return new Memory(new DataView(new ArrayBuffer(tmp$ret$0)));
    };
    protoOf(DefaultAllocator).free_r48ke1_k$ = function (instance) {};
    var DefaultAllocator_instance;
    function DefaultAllocator_getInstance() {
      if (DefaultAllocator_instance == null) new DefaultAllocator();
      return DefaultAllocator_instance;
    }
    function useMemory(_this__u8e3s4, offset, length, block) {
      offset = offset === VOID ? 0 : offset;
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      return block(of(Companion_getInstance_6(), _this__u8e3s4, offset, length));
    }
    function of(_this__u8e3s4, array, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (array.length - offset) | 0 : length;
      // Inline function 'kotlin.js.asDynamic' call
      var typedArray = array;
      return of_0(Companion_getInstance_6(), typedArray, offset, length);
    }
    function of_0(_this__u8e3s4, view, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? view.byteLength : length;
      return of_1(Companion_getInstance_6(), view.buffer, (view.byteOffset + offset) | 0, length);
    }
    function of_1(_this__u8e3s4, buffer, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (buffer.byteLength - offset) | 0 : length;
      return new Memory(new DataView(buffer, offset, length));
    }
    function Companion_4() {
      Companion_instance_4 = this;
      this.Empty_1 = new Memory(new DataView(new ArrayBuffer(0)));
    }
    protoOf(Companion_4).get_Empty_i9b85g_k$ = function () {
      return this.Empty_1;
    };
    var Companion_instance_4;
    function Companion_getInstance_6() {
      if (Companion_instance_4 == null) new Companion_4();
      return Companion_instance_4;
    }
    function Memory(view) {
      Companion_getInstance_6();
      this.view_1 = view;
    }
    protoOf(Memory).get_view_wow8a6_k$ = function () {
      return this.view_1;
    };
    protoOf(Memory).get_size_woubt6_k$ = function () {
      return toLong(this.view_1.byteLength);
    };
    protoOf(Memory).get_size32_jht1rd_k$ = function () {
      return this.view_1.byteLength;
    };
    protoOf(Memory).loadAt_z9xu2n_k$ = function (index) {
      return this.view_1.getInt8(index);
    };
    protoOf(Memory).loadAt_m39h2j_k$ = function (index) {
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      if (index.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(index, 'index');
      }
      var tmp$ret$0 = index.toInt_1tsl84_k$();
      return this.view_1.getInt8(tmp$ret$0);
    };
    protoOf(Memory).storeAt_xwc3rw_k$ = function (index, value) {
      this.view_1.setInt8(index, value);
    };
    protoOf(Memory).storeAt_g4s8oi_k$ = function (index, value) {
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      if (index.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(index, 'index');
      }
      var tmp$ret$0 = index.toInt_1tsl84_k$();
      this.view_1.setInt8(tmp$ret$0, value);
    };
    protoOf(Memory).slice_bze60e_k$ = function (offset, length) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(offset >= 0)) {
        // Inline function 'io.ktor.utils.io.bits.Memory.slice.<anonymous>' call
        var message = "offset shouldn't be negative: " + offset;
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(length >= 0)) {
        // Inline function 'io.ktor.utils.io.bits.Memory.slice.<anonymous>' call
        var message_0 = "length shouldn't be negative: " + length;
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      var tmp = toLong((offset + length) | 0);
      // Inline function 'io.ktor.utils.io.bits.Memory.size' call
      var tmp$ret$2 = toLong(this.view_1.byteLength);
      if (tmp.compareTo_9jj042_k$(tmp$ret$2) > 0) {
        // Inline function 'io.ktor.utils.io.bits.Memory.size' call
        var tmp$ret$3 = toLong(this.view_1.byteLength);
        throw IndexOutOfBoundsException_init_$Create$(
          'offset + length > size: ' + offset + ' + ' + length + ' > ' + tmp$ret$3.toString(),
        );
      }
      return new Memory(new DataView(this.view_1.buffer, (this.view_1.byteOffset + offset) | 0, length));
    };
    protoOf(Memory).slice_4fjajy_k$ = function (offset, length) {
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      if (offset.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(offset, 'offset');
      }
      var tmp = offset.toInt_1tsl84_k$();
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      if (length.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(length, 'length');
      }
      var tmp$ret$1 = length.toInt_1tsl84_k$();
      return this.slice_bze60e_k$(tmp, tmp$ret$1);
    };
    protoOf(Memory).copyTo_fgxuoj_k$ = function (destination, offset, length, destinationOffset) {
      var src = new Int8Array(this.view_1.buffer, (this.view_1.byteOffset + offset) | 0, length);
      var dst = new Int8Array(
        destination.view_1.buffer,
        (destination.view_1.byteOffset + destinationOffset) | 0,
        length,
      );
      dst.set(src);
    };
    protoOf(Memory).copyTo_ug0rjx_k$ = function (destination, offset, length, destinationOffset) {
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      if (offset.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(offset, 'offset');
      }
      var tmp = offset.toInt_1tsl84_k$();
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      if (length.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0) {
        failLongToIntConversion(length, 'length');
      }
      var tmp_0 = length.toInt_1tsl84_k$();
      // Inline function 'io.ktor.utils.io.core.internal.toIntOrFail' call
      var name = 'destinationOffset';
      if (
        destinationOffset.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) >= 0
      ) {
        failLongToIntConversion(destinationOffset, name);
      }
      var tmp$ret$2 = destinationOffset.toInt_1tsl84_k$();
      this.copyTo_fgxuoj_k$(destination, tmp, tmp_0, tmp$ret$2);
    };
    function copyTo_0(_this__u8e3s4, destination, offset, length, destinationOffset) {
      copyTo_3(_this__u8e3s4.buffer, destination, (offset + _this__u8e3s4.byteOffset) | 0, length, destinationOffset);
    }
    function copyTo_1(_this__u8e3s4, destination, offset, length, destinationOffset) {
      var to = new Int8Array(destination, destinationOffset, length);
      var from = new Int8Array(_this__u8e3s4.view_1.buffer, (_this__u8e3s4.view_1.byteOffset + offset) | 0, length);
      to.set(from, 0);
    }
    function copyTo_2(_this__u8e3s4, destination, offset, length, destinationOffset) {
      // Inline function 'kotlin.js.asDynamic' call
      var to = destination;
      var from = new Int8Array(_this__u8e3s4.view_1.buffer, (_this__u8e3s4.view_1.byteOffset + offset) | 0, length);
      to.set(from, destinationOffset);
    }
    function copyTo_3(_this__u8e3s4, destination, offset, length, destinationOffset) {
      var from = new Int8Array(_this__u8e3s4, offset, length);
      var to = new Int8Array(
        destination.view_1.buffer,
        (destination.view_1.byteOffset + destinationOffset) | 0,
        length,
      );
      to.set(from, 0);
    }
    function storeShortAt(_this__u8e3s4, offset, value) {
      _this__u8e3s4.get_view_wow8a6_k$().setInt16(offset, value, false);
    }
    function storeIntAt(_this__u8e3s4, offset, value) {
      _this__u8e3s4.get_view_wow8a6_k$().setInt32(offset, value, false);
    }
    function storeLongAt(_this__u8e3s4, offset, value) {
      _this__u8e3s4.get_view_wow8a6_k$().setInt32(offset, value.shr_9fl3wl_k$(32).toInt_1tsl84_k$(), false);
      _this__u8e3s4
        .get_view_wow8a6_k$()
        .setInt32((offset + 4) | 0, value.and_4spn93_k$(new Long(-1, 0)).toInt_1tsl84_k$(), false);
    }
    function storeFloatAt(_this__u8e3s4, offset, value) {
      _this__u8e3s4.get_view_wow8a6_k$().setFloat32(offset, value, false);
    }
    function storeDoubleAt(_this__u8e3s4, offset, value) {
      _this__u8e3s4.get_view_wow8a6_k$().setFloat64(offset, value, false);
    }
    function loadShortAt(_this__u8e3s4, offset) {
      return _this__u8e3s4.get_view_wow8a6_k$().getInt16(offset, false);
    }
    function loadIntAt(_this__u8e3s4, offset) {
      return _this__u8e3s4.get_view_wow8a6_k$().getInt32(offset, false);
    }
    function loadLongAt(_this__u8e3s4, offset) {
      return toLong(_this__u8e3s4.get_view_wow8a6_k$().getUint32(offset, false))
        .shl_bg8if3_k$(32)
        .or_v7fvkl_k$(toLong(_this__u8e3s4.get_view_wow8a6_k$().getUint32((offset + 4) | 0, false)));
    }
    function loadFloatAt(_this__u8e3s4, offset) {
      return _this__u8e3s4.get_view_wow8a6_k$().getFloat32(offset, false);
    }
    function loadDoubleAt(_this__u8e3s4, offset) {
      return _this__u8e3s4.get_view_wow8a6_k$().getFloat64(offset, false);
    }
    function get_isLittleEndianPlatform() {
      _init_properties_PrimitiveArraysJs_kt__3i7vt4();
      return isLittleEndianPlatform;
    }
    var isLittleEndianPlatform;
    var properties_initialized_PrimitiveArraysJs_kt_2zxjae;
    function _init_properties_PrimitiveArraysJs_kt__3i7vt4() {
      if (!properties_initialized_PrimitiveArraysJs_kt_2zxjae) {
        properties_initialized_PrimitiveArraysJs_kt_2zxjae = true;
        isLittleEndianPlatform =
          Companion_getInstance_8().nativeOrder_spqstz_k$() === ByteOrder_LITTLE_ENDIAN_getInstance();
      }
    }
    function Companion_5() {
      Companion_instance_5 = this;
    }
    protoOf(Companion_5).forName_etcah2_k$ = function (name) {
      switch (name) {
        case 'UTF-8':
        case 'utf-8':
        case 'UTF8':
        case 'utf8':
          return Charsets_getInstance().UTF_8__1;
      }
      var tmp;
      var tmp_0;
      var tmp_1;
      switch (name) {
        case 'ISO-8859-1':
        case 'iso-8859-1':
          tmp_1 = true;
          break;
        default:
          // Inline function 'kotlin.let' call

          // Inline function 'kotlin.contracts.contract' call

          // Inline function 'io.ktor.utils.io.charsets.Companion.forName.<anonymous>' call

          var it = replace(name, _Char___init__impl__6a9atx(95), _Char___init__impl__6a9atx(45));
          var tmp_2;
          if (it === 'iso-8859-1') {
            tmp_2 = true;
          } else {
            // Inline function 'kotlin.text.lowercase' call
            // Inline function 'kotlin.js.asDynamic' call
            tmp_2 = it.toLowerCase() === 'iso-8859-1';
          }

          tmp_1 = tmp_2;
          break;
      }
      if (tmp_1) {
        tmp_0 = true;
      } else {
        tmp_0 = name === 'latin1';
      }
      if (tmp_0) {
        tmp = true;
      } else {
        tmp = name === 'Latin1';
      }
      if (tmp) {
        return Charsets_getInstance().ISO_8859_1__1;
      }
      throw IllegalArgumentException_init_$Create$('Charset ' + name + ' is not supported');
    };
    protoOf(Companion_5).isSupported_c9nas6_k$ = function (charset) {
      var tmp;
      switch (charset) {
        case 'UTF-8':
        case 'utf-8':
        case 'UTF8':
        case 'utf8':
          tmp = true;
          break;
        default:
          var tmp_0;
          var tmp_1;
          switch (charset) {
            case 'ISO-8859-1':
            case 'iso-8859-1':
              tmp_1 = true;
              break;
            default:
              // Inline function 'kotlin.let' call

              // Inline function 'kotlin.contracts.contract' call

              // Inline function 'io.ktor.utils.io.charsets.Companion.isSupported.<anonymous>' call

              var it = replace(charset, _Char___init__impl__6a9atx(95), _Char___init__impl__6a9atx(45));
              var tmp_2;
              if (it === 'iso-8859-1') {
                tmp_2 = true;
              } else {
                // Inline function 'kotlin.text.lowercase' call
                // Inline function 'kotlin.js.asDynamic' call
                tmp_2 = it.toLowerCase() === 'iso-8859-1';
              }

              tmp_1 = tmp_2;
              break;
          }

          if (tmp_1) {
            tmp_0 = true;
          } else {
            tmp_0 = charset === 'latin1';
          }

          if (tmp_0) {
            tmp = true;
          } else {
            tmp = false;
          }

          break;
      }
      return tmp;
    };
    var Companion_instance_5;
    function Companion_getInstance_7() {
      if (Companion_instance_5 == null) new Companion_5();
      return Companion_instance_5;
    }
    function Charset(_name) {
      Companion_getInstance_7();
      this._name_1 = _name;
    }
    protoOf(Charset).get__name_inm79d_k$ = function () {
      return this._name_1;
    };
    protoOf(Charset).equals = function (other) {
      if (this === other) return true;
      if (other == null ? true : !(this.constructor == other.constructor)) return false;
      if (!(other instanceof Charset)) THROW_CCE();
      if (!(this._name_1 === other._name_1)) return false;
      return true;
    };
    protoOf(Charset).hashCode = function () {
      return getStringHashCode(this._name_1);
    };
    protoOf(Charset).toString = function () {
      return this._name_1;
    };
    function get_name(_this__u8e3s4) {
      return _this__u8e3s4._name_1;
    }
    function Charsets() {
      Charsets_instance = this;
      this.UTF_8__1 = new CharsetImpl('UTF-8');
      this.ISO_8859_1__1 = new CharsetImpl('ISO-8859-1');
    }
    protoOf(Charsets).get_UTF_8_ihn39z_k$ = function () {
      return this.UTF_8__1;
    };
    protoOf(Charsets).get_ISO_8859_1_y3qebr_k$ = function () {
      return this.ISO_8859_1__1;
    };
    var Charsets_instance;
    function Charsets_getInstance() {
      if (Charsets_instance == null) new Charsets();
      return Charsets_instance;
    }
    function MalformedInputException(message) {
      extendThrowable(this, message);
      captureStack(this, MalformedInputException);
    }
    function CharsetDecoder(_charset) {
      this._charset_1 = _charset;
    }
    protoOf(CharsetDecoder).get__charset_jf44ie_k$ = function () {
      return this._charset_1;
    };
    function encodeToByteArray_0(_this__u8e3s4, input, fromIndex, toIndex) {
      fromIndex = fromIndex === VOID ? 0 : fromIndex;
      toIndex = toIndex === VOID ? charSequenceLength(input) : toIndex;
      return encodeToByteArrayImpl1(_this__u8e3s4, input, fromIndex, toIndex);
    }
    function CharsetEncoder(_charset) {
      this._charset_1 = _charset;
    }
    protoOf(CharsetEncoder).get__charset_jf44ie_k$ = function () {
      return this._charset_1;
    };
    function CharsetImpl(name) {
      Charset.call(this, name);
      this.name_1 = name;
    }
    protoOf(CharsetImpl).get_name_woqyms_k$ = function () {
      return this.name_1;
    };
    protoOf(CharsetImpl).newEncoder_gqwcdg_k$ = function () {
      return new CharsetEncoderImpl(this);
    };
    protoOf(CharsetImpl).newDecoder_zcettw_k$ = function () {
      return new CharsetDecoderImpl(this);
    };
    protoOf(CharsetImpl).component1_7eebsc_k$ = function () {
      return this.name_1;
    };
    protoOf(CharsetImpl).copy_a35qlh_k$ = function (name) {
      return new CharsetImpl(name);
    };
    protoOf(CharsetImpl).copy$default_l07wt9_k$ = function (name, $super) {
      name = name === VOID ? this.name_1 : name;
      return $super === VOID ? this.copy_a35qlh_k$(name) : $super.copy_a35qlh_k$.call(this, name);
    };
    protoOf(CharsetImpl).toString = function () {
      return 'CharsetImpl(name=' + this.name_1 + ')';
    };
    protoOf(CharsetImpl).hashCode = function () {
      return getStringHashCode(this.name_1);
    };
    protoOf(CharsetImpl).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof CharsetImpl)) return false;
      var tmp0_other_with_cast = other instanceof CharsetImpl ? other : THROW_CCE();
      if (!(this.name_1 === tmp0_other_with_cast.name_1)) return false;
      return true;
    };
    function encodeToByteArrayImpl1(_this__u8e3s4, input, fromIndex, toIndex) {
      fromIndex = fromIndex === VOID ? 0 : fromIndex;
      toIndex = toIndex === VOID ? charSequenceLength(input) : toIndex;
      var start = fromIndex;
      if (start >= toIndex) return get_EmptyByteArray();
      var single = Companion_getInstance_4().get_Pool_wo83gl_k$().borrow_mvkpor_k$();
      try {
        var rc = encodeImpl(_this__u8e3s4, input, start, toIndex, single);
        start = (start + rc) | 0;
        if (start === toIndex) {
          // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
          var tmp$ret$0 = (single.get_writePosition_jdt81t_k$() - single.get_readPosition_70qxnc_k$()) | 0;
          var result = new Int8Array(tmp$ret$0);
          // Inline function 'io.ktor.utils.io.core.readFully' call
          var length = (result.length - 0) | 0;
          readFully_1(single instanceof Buffer ? single : THROW_CCE(), result, 0, length);
          return result;
        }
        var tmp$ret$1;
        $l$block: {
          // Inline function 'io.ktor.utils.io.core.buildPacket' call
          // Inline function 'kotlin.contracts.contract' call
          var builder = new BytePacketBuilder();
          try {
            // Inline function 'io.ktor.utils.io.charsets.encodeToByteArrayImpl1.<anonymous>' call
            builder.appendSingleChunk_7rbwf9_k$(single.duplicate_jvgc97_k$());
            encodeToImpl(_this__u8e3s4, builder, input, start, toIndex);
            tmp$ret$1 = builder.build_1k0s4u_k$();
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
        return readBytes(tmp$ret$1);
      } finally {
        single.release_vbevvg_k$(Companion_getInstance_4().get_Pool_wo83gl_k$());
      }
    }
    function _get_charset__c43qgr($this) {
      return $this.charset_1;
    }
    function component1($this) {
      return $this.charset_1;
    }
    function CharsetEncoderImpl(charset) {
      CharsetEncoder.call(this, charset);
      this.charset_1 = charset;
    }
    protoOf(CharsetEncoderImpl).copy_2crzso_k$ = function (charset) {
      return new CharsetEncoderImpl(charset);
    };
    protoOf(CharsetEncoderImpl).copy$default_73mtqm_k$ = function (charset, $super) {
      charset = charset === VOID ? this.charset_1 : charset;
      return $super === VOID ? this.copy_2crzso_k$(charset) : $super.copy_2crzso_k$.call(this, charset);
    };
    protoOf(CharsetEncoderImpl).toString = function () {
      return 'CharsetEncoderImpl(charset=' + this.charset_1 + ')';
    };
    protoOf(CharsetEncoderImpl).hashCode = function () {
      return this.charset_1.hashCode();
    };
    protoOf(CharsetEncoderImpl).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof CharsetEncoderImpl)) return false;
      var tmp0_other_with_cast = other instanceof CharsetEncoderImpl ? other : THROW_CCE();
      if (!this.charset_1.equals(tmp0_other_with_cast.charset_1)) return false;
      return true;
    };
    function _get_charset__c43qgr_0($this) {
      return $this.charset_1;
    }
    function component1_0($this) {
      return $this.charset_1;
    }
    function CharsetDecoderImpl(charset) {
      CharsetDecoder.call(this, charset);
      this.charset_1 = charset;
    }
    protoOf(CharsetDecoderImpl).copy_2crzso_k$ = function (charset) {
      return new CharsetDecoderImpl(charset);
    };
    protoOf(CharsetDecoderImpl).copy$default_ng4zhe_k$ = function (charset, $super) {
      charset = charset === VOID ? this.charset_1 : charset;
      return $super === VOID ? this.copy_2crzso_k$(charset) : $super.copy_2crzso_k$.call(this, charset);
    };
    protoOf(CharsetDecoderImpl).toString = function () {
      return 'CharsetDecoderImpl(charset=' + this.charset_1 + ')';
    };
    protoOf(CharsetDecoderImpl).hashCode = function () {
      return this.charset_1.hashCode();
    };
    protoOf(CharsetDecoderImpl).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof CharsetDecoderImpl)) return false;
      var tmp0_other_with_cast = other instanceof CharsetDecoderImpl ? other : THROW_CCE();
      if (!this.charset_1.equals(tmp0_other_with_cast.charset_1)) return false;
      return true;
    };
    function encodeImpl(_this__u8e3s4, input, fromIndex, toIndex, dst) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(fromIndex <= toIndex)) {
        // Inline function 'kotlin.require.<anonymous>' call
        var message = 'Failed requirement.';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      if (get_charset(_this__u8e3s4).equals(Charsets_getInstance().ISO_8859_1__1)) {
        return encodeISO88591(input, fromIndex, toIndex, dst);
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(get_charset(_this__u8e3s4) === Charsets_getInstance().UTF_8__1)) {
        // Inline function 'io.ktor.utils.io.charsets.encodeImpl.<anonymous>' call
        var message_0 = 'Only UTF-8 encoding is supported in JS';
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      var encoder = new TextEncoder();
      var start = fromIndex;
      // Inline function 'io.ktor.utils.io.core.Buffer.writeRemaining' call
      var dstRemaining = (dst.get_limit_iuokuq_k$() - dst.get_writePosition_jdt81t_k$()) | 0;
      $l$loop: while (start < toIndex ? dstRemaining > 0 : false) {
        // Inline function 'kotlin.comparisons.minOf' call
        var a = (toIndex - start) | 0;
        var b = (dstRemaining / 6) | 0;
        var tmp$ret$3 = Math.min(a, b);
        var numChars = coerceAtLeast(tmp$ret$3, 1);
        var dropLastChar = isHighSurrogate(charSequenceGet(input, (((start + numChars) | 0) - 1) | 0));
        var endIndexExclusive = (dropLastChar ? numChars === 1 : false)
          ? (start + 2) | 0
          : dropLastChar
            ? (((start + numChars) | 0) - 1) | 0
            : (start + numChars) | 0;
        // Inline function 'kotlin.text.substring' call
        var startIndex = start;
        var tmp$ret$4 = toString(charSequenceSubSequence(input, startIndex, endIndexExclusive));
        var array1 = encoder.encode(tmp$ret$4);
        if (array1.length > dstRemaining) break $l$loop;
        writeFully_5(dst, array1);
        start = endIndexExclusive;
        dstRemaining = (dstRemaining - array1.length) | 0;
      }
      return (start - fromIndex) | 0;
    }
    function get_charset(_this__u8e3s4) {
      return _this__u8e3s4._charset_1;
    }
    function decode_0(_this__u8e3s4, input, dst, max) {
      var decoder = Decoder_0(get_name(get_charset_0(_this__u8e3s4)), true);
      var charactersCopied = 0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.takeWhileSize' call
        var release = true;
        var tmp0_elvis_lhs = prepareReadFirstHead(input, 1);
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$block;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var current = tmp;
        var size = 1;
        try {
          $l$loop: do {
            // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
            var this_0 = current;
            var before = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
            var after;
            if (before >= size) {
              try {
                var tmp$ret$3;
                $l$block_0: {
                  // Inline function 'io.ktor.utils.io.charsets.decode.<anonymous>' call
                  var buffer = current;
                  var rem = (max - charactersCopied) | 0;
                  // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                  var bufferSize = (buffer.get_writePosition_jdt81t_k$() - buffer.get_readPosition_70qxnc_k$()) | 0;
                  if (rem < bufferSize) {
                    tmp$ret$3 = 0;
                    break $l$block_0;
                  }
                  // Inline function 'io.ktor.utils.io.core.readDirectInt8Array' call
                  // Inline function 'kotlin.contracts.contract' call
                  // Inline function 'io.ktor.utils.io.core.read' call
                  // Inline function 'kotlin.contracts.contract' call
                  // Inline function 'io.ktor.utils.io.core.readDirectInt8Array.<anonymous>' call
                  var memory = buffer.get_memory_gl4362_k$();
                  var start = buffer.get_readPosition_70qxnc_k$();
                  var endExclusive = buffer.get_writePosition_jdt81t_k$();
                  // Inline function 'io.ktor.utils.io.charsets.decode.<anonymous>.<anonymous>' call
                  var view = new Int8Array(
                    memory.get_view_wow8a6_k$().buffer,
                    (memory.get_view_wow8a6_k$().byteOffset + start) | 0,
                    (endExclusive - start) | 0,
                  );
                  $l$block_2: {
                    // Inline function 'io.ktor.utils.io.js.decodeWrap' call
                    try {
                      // Inline function 'io.ktor.utils.io.charsets.decode.<anonymous>.<anonymous>.<anonymous>' call
                      var tmp$ret$4;
                      $l$block_1: {
                        // Inline function 'io.ktor.utils.io.js.decodeStream' call
                        // Inline function 'io.ktor.utils.io.js.decodeWrap' call
                        try {
                          tmp$ret$4 = decoder.decode_mvpnei_k$(view, decodeOptions(true));
                          break $l$block_1;
                        } catch ($p) {
                          if ($p instanceof Error) {
                            var t = $p;
                            var tmp0_elvis_lhs_0 = t.message;
                            throw new MalformedInputException(
                              'Failed to decode bytes: ' +
                                (tmp0_elvis_lhs_0 == null ? 'no cause provided' : tmp0_elvis_lhs_0),
                            );
                          } else {
                            throw $p;
                          }
                        }
                      }
                      break $l$block_2;
                    } catch ($p) {
                      if ($p instanceof Error) {
                        var t_0 = $p;
                        var tmp0_elvis_lhs_1 = t_0.message;
                        throw new MalformedInputException(
                          'Failed to decode bytes: ' +
                            (tmp0_elvis_lhs_1 == null ? 'no cause provided' : tmp0_elvis_lhs_1),
                        );
                      } else {
                        throw $p;
                      }
                    }
                  }
                  var decodedText = tmp$ret$4;
                  dst.append_jgojdo_k$(decodedText);
                  charactersCopied = (charactersCopied + decodedText.length) | 0;
                  var rc = view.byteLength;
                  buffer.discardExact_11sae1_k$(rc);
                  var tmp_0;
                  if (charactersCopied === max) {
                    var tmp_1;
                    try {
                      tmp_1 = decoder.decode_m3924y_k$();
                    } catch ($p) {
                      var tmp_2;
                      var _ = $p;
                      tmp_2 = '';
                      tmp_1 = tmp_2;
                    }
                    var tail = tmp_1;
                    // Inline function 'kotlin.text.isNotEmpty' call
                    if (charSequenceLength(tail) > 0) {
                      buffer.rewind_gfqr1p_k$(bufferSize);
                    }
                    tmp_0 = 0;
                  } else if (charactersCopied < max) {
                    tmp_0 = get_MAX_CHARACTERS_SIZE_IN_BYTES();
                  } else {
                    tmp_0 = 0;
                  }
                  tmp$ret$3 = tmp_0;
                }
                size = tmp$ret$3;
              } finally {
                // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                var this_1 = current;
                after = (this_1.get_writePosition_jdt81t_k$() - this_1.get_readPosition_70qxnc_k$()) | 0;
              }
            } else {
              after = before;
            }
            release = false;
            var tmp_3;
            if (after === 0) {
              tmp_3 = prepareReadNextHead(input, current);
            } else {
              var tmp_4;
              if (after < size) {
                tmp_4 = true;
              } else {
                // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
                var this_2 = current;
                tmp_4 =
                  ((this_2.get_capacity_wxbgcd_k$() - this_2.get_limit_iuokuq_k$()) | 0) <
                  Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
              }
              if (tmp_4) {
                completeReadHead(input, current);
                tmp_3 = prepareReadFirstHead(input, size);
              } else {
                tmp_3 = current;
              }
            }
            var tmp1_elvis_lhs = tmp_3;
            var tmp_5;
            if (tmp1_elvis_lhs == null) {
              break $l$loop;
            } else {
              tmp_5 = tmp1_elvis_lhs;
            }
            var next = tmp_5;
            current = next;
            release = true;
          } while (size > 0);
        } finally {
          if (release) {
            completeReadHead(input, current);
          }
        }
      }
      if (charactersCopied < max) {
        var size_0 = 1;
        $l$block_3: {
          // Inline function 'io.ktor.utils.io.core.takeWhileSize' call
          var release_0 = true;
          var tmp0_elvis_lhs_2 = prepareReadFirstHead(input, 1);
          var tmp_6;
          if (tmp0_elvis_lhs_2 == null) {
            break $l$block_3;
          } else {
            tmp_6 = tmp0_elvis_lhs_2;
          }
          var current_0 = tmp_6;
          var size_1 = 1;
          try {
            $l$loop_0: do {
              // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
              var this_3 = current_0;
              var before_0 = (this_3.get_writePosition_jdt81t_k$() - this_3.get_readPosition_70qxnc_k$()) | 0;
              var after_0;
              if (before_0 >= size_1) {
                try {
                  // Inline function 'io.ktor.utils.io.charsets.decode.<anonymous>' call
                  // Inline function 'io.ktor.utils.io.core.readDirectInt8Array' call
                  // Inline function 'kotlin.contracts.contract' call
                  // Inline function 'io.ktor.utils.io.core.read' call
                  var this_4 = current_0;
                  // Inline function 'kotlin.contracts.contract' call
                  // Inline function 'io.ktor.utils.io.core.readDirectInt8Array.<anonymous>' call
                  var memory_0 = this_4.get_memory_gl4362_k$();
                  var start_0 = this_4.get_readPosition_70qxnc_k$();
                  var endExclusive_0 = this_4.get_writePosition_jdt81t_k$();
                  // Inline function 'io.ktor.utils.io.charsets.decode.<anonymous>.<anonymous>' call
                  var view_0 = new Int8Array(
                    memory_0.get_view_wow8a6_k$().buffer,
                    (memory_0.get_view_wow8a6_k$().byteOffset + start_0) | 0,
                    (endExclusive_0 - start_0) | 0,
                  );
                  var result = decodeBufferImpl(view_0, decoder, (max - charactersCopied) | 0);
                  dst.append_jgojdo_k$(result.get_charactersDecoded_mdwn5p_k$());
                  charactersCopied = (charactersCopied + result.get_charactersDecoded_mdwn5p_k$().length) | 0;
                  var rc_0 = result.get_bytesConsumed_ic9jre_k$();
                  this_4.discardExact_11sae1_k$(rc_0);
                  var rc_1 = rc_0;
                  if (rc_1 > 0) size_0 = 1;
                  else if (size_0 === get_MAX_CHARACTERS_SIZE_IN_BYTES()) size_0 = 0;
                  else {
                    size_0 = (size_0 + 1) | 0;
                  }
                  size_1 = size_0;
                } finally {
                  // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                  var this_5 = current_0;
                  after_0 = (this_5.get_writePosition_jdt81t_k$() - this_5.get_readPosition_70qxnc_k$()) | 0;
                }
              } else {
                after_0 = before_0;
              }
              release_0 = false;
              var tmp_7;
              if (after_0 === 0) {
                tmp_7 = prepareReadNextHead(input, current_0);
              } else {
                var tmp_8;
                if (after_0 < size_1) {
                  tmp_8 = true;
                } else {
                  // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
                  var this_6 = current_0;
                  tmp_8 =
                    ((this_6.get_capacity_wxbgcd_k$() - this_6.get_limit_iuokuq_k$()) | 0) <
                    Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
                }
                if (tmp_8) {
                  completeReadHead(input, current_0);
                  tmp_7 = prepareReadFirstHead(input, size_1);
                } else {
                  tmp_7 = current_0;
                }
              }
              var tmp1_elvis_lhs_0 = tmp_7;
              var tmp_9;
              if (tmp1_elvis_lhs_0 == null) {
                break $l$loop_0;
              } else {
                tmp_9 = tmp1_elvis_lhs_0;
              }
              var next_0 = tmp_9;
              current_0 = next_0;
              release_0 = true;
            } while (size_1 > 0);
          } finally {
            if (release_0) {
              completeReadHead(input, current_0);
            }
          }
        }
      }
      return charactersCopied;
    }
    function encodeComplete(_this__u8e3s4, dst) {
      return true;
    }
    function decodeExactBytes(_this__u8e3s4, input, inputLength) {
      if (inputLength === 0) return '';
      // Inline function 'io.ktor.utils.io.core.Input.headRemaining' call
      if (((input.get_headEndExclusive_yba4hg_k$() - input.get_headPosition_sd9ua6_k$()) | 0) >= inputLength) {
        var decoder = Decoder_0(get_charset_0(_this__u8e3s4)._name_1, true);
        var head = input.get_head_won7e1_k$();
        var view = input.get_headMemory_zbxxm_k$().get_view_wow8a6_k$();
        var tmp$ret$2;
        $l$block: {
          // Inline function 'io.ktor.utils.io.js.decodeWrap' call
          try {
            // Inline function 'io.ktor.utils.io.charsets.decodeExactBytes.<anonymous>' call
            var subView = (head.get_readPosition_70qxnc_k$() === 0 ? inputLength === view.byteLength : false)
              ? view
              : new DataView(view.buffer, (view.byteOffset + head.get_readPosition_70qxnc_k$()) | 0, inputLength);
            tmp$ret$2 = decoder.decode_hpap4q_k$(subView);
            break $l$block;
          } catch ($p) {
            if ($p instanceof Error) {
              var t = $p;
              var tmp0_elvis_lhs = t.message;
              throw new MalformedInputException(
                'Failed to decode bytes: ' + (tmp0_elvis_lhs == null ? 'no cause provided' : tmp0_elvis_lhs),
              );
            } else {
              throw $p;
            }
          }
        }
        var text = tmp$ret$2;
        input.discardExact_11sae1_k$(inputLength);
        return text;
      }
      return decodeExactBytesSlow(_this__u8e3s4, input, inputLength);
    }
    function get_charset_0(_this__u8e3s4) {
      return _this__u8e3s4._charset_1;
    }
    function decodeExactBytesSlow(_this__u8e3s4, input, inputLength) {
      var decoder = Decoder_0(get_name(get_charset_0(_this__u8e3s4)), true);
      var inputRemaining = inputLength;
      var sb = StringBuilder_init_$Create$_0(inputLength);
      $l$block_4: {
        // Inline function 'io.ktor.utils.io.js.decodeWrap' call
        try {
          // Inline function 'io.ktor.utils.io.charsets.decodeExactBytesSlow.<anonymous>' call
          $l$block: {
            // Inline function 'io.ktor.utils.io.core.takeWhileSize' call
            var release = true;
            var tmp0_elvis_lhs = prepareReadFirstHead(input, 6);
            var tmp;
            if (tmp0_elvis_lhs == null) {
              break $l$block;
            } else {
              tmp = tmp0_elvis_lhs;
            }
            var current = tmp;
            var size = 6;
            try {
              $l$loop: do {
                // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                var this_0 = current;
                var before = (this_0.get_writePosition_jdt81t_k$() - this_0.get_readPosition_70qxnc_k$()) | 0;
                var after;
                if (before >= size) {
                  try {
                    // Inline function 'io.ktor.utils.io.charsets.decodeExactBytesSlow.<anonymous>.<anonymous>' call
                    var buffer = current;
                    // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                    var chunkSize = (buffer.get_writePosition_jdt81t_k$() - buffer.get_readPosition_70qxnc_k$()) | 0;
                    // Inline function 'kotlin.comparisons.minOf' call
                    var b = inputRemaining;
                    var size_0 = Math.min(chunkSize, b);
                    var tmp_0;
                    if (
                      buffer.get_readPosition_70qxnc_k$() === 0
                        ? buffer.get_memory_gl4362_k$().get_view_wow8a6_k$().byteLength === size_0
                        : false
                    ) {
                      var tmp$ret$4;
                      $l$block_0: {
                        // Inline function 'io.ktor.utils.io.js.decodeStream' call
                        var buffer_0 = buffer.get_memory_gl4362_k$().get_view_wow8a6_k$();
                        // Inline function 'io.ktor.utils.io.js.decodeWrap' call
                        try {
                          tmp$ret$4 = decoder.decode_mvpnei_k$(buffer_0, decodeOptions(true));
                          break $l$block_0;
                        } catch ($p) {
                          if ($p instanceof Error) {
                            var t = $p;
                            var tmp0_elvis_lhs_0 = t.message;
                            throw new MalformedInputException(
                              'Failed to decode bytes: ' +
                                (tmp0_elvis_lhs_0 == null ? 'no cause provided' : tmp0_elvis_lhs_0),
                            );
                          } else {
                            throw $p;
                          }
                        }
                      }
                      tmp_0 = tmp$ret$4;
                    } else {
                      var tmp$ret$6;
                      $l$block_1: {
                        // Inline function 'io.ktor.utils.io.js.decodeStream' call
                        var buffer_1 = new Int8Array(
                          buffer.get_memory_gl4362_k$().get_view_wow8a6_k$().buffer,
                          (buffer.get_memory_gl4362_k$().get_view_wow8a6_k$().byteOffset +
                            buffer.get_readPosition_70qxnc_k$()) |
                            0,
                          size_0,
                        );
                        // Inline function 'io.ktor.utils.io.js.decodeWrap' call
                        try {
                          tmp$ret$6 = decoder.decode_mvpnei_k$(buffer_1, decodeOptions(true));
                          break $l$block_1;
                        } catch ($p) {
                          if ($p instanceof Error) {
                            var t_0 = $p;
                            var tmp0_elvis_lhs_1 = t_0.message;
                            throw new MalformedInputException(
                              'Failed to decode bytes: ' +
                                (tmp0_elvis_lhs_1 == null ? 'no cause provided' : tmp0_elvis_lhs_1),
                            );
                          } else {
                            throw $p;
                          }
                        }
                      }
                      tmp_0 = tmp$ret$6;
                    }
                    var text = tmp_0;
                    sb.append_22ad7x_k$(text);
                    buffer.discardExact_11sae1_k$(size_0);
                    inputRemaining = (inputRemaining - size_0) | 0;
                    size = inputRemaining > 0 ? 6 : 0;
                  } finally {
                    // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                    var this_1 = current;
                    after = (this_1.get_writePosition_jdt81t_k$() - this_1.get_readPosition_70qxnc_k$()) | 0;
                  }
                } else {
                  after = before;
                }
                release = false;
                var tmp_1;
                if (after === 0) {
                  tmp_1 = prepareReadNextHead(input, current);
                } else {
                  var tmp_2;
                  if (after < size) {
                    tmp_2 = true;
                  } else {
                    // Inline function 'io.ktor.utils.io.core.Buffer.endGap' call
                    var this_2 = current;
                    tmp_2 =
                      ((this_2.get_capacity_wxbgcd_k$() - this_2.get_limit_iuokuq_k$()) | 0) <
                      Companion_getInstance_1().get_ReservedSize_b4jt5a_k$();
                  }
                  if (tmp_2) {
                    completeReadHead(input, current);
                    tmp_1 = prepareReadFirstHead(input, size);
                  } else {
                    tmp_1 = current;
                  }
                }
                var tmp1_elvis_lhs = tmp_1;
                var tmp_3;
                if (tmp1_elvis_lhs == null) {
                  break $l$loop;
                } else {
                  tmp_3 = tmp1_elvis_lhs;
                }
                var next = tmp_3;
                current = next;
                release = true;
              } while (size > 0);
            } finally {
              if (release) {
                completeReadHead(input, current);
              }
            }
          }
          if (inputRemaining > 0) {
            $l$block_2: {
              // Inline function 'io.ktor.utils.io.core.takeWhile' call
              var release_0 = true;
              var tmp0_elvis_lhs_2 = prepareReadFirstHead(input, 1);
              var tmp_4;
              if (tmp0_elvis_lhs_2 == null) {
                break $l$block_2;
              } else {
                tmp_4 = tmp0_elvis_lhs_2;
              }
              var current_0 = tmp_4;
              try {
                $l$loop_1: do {
                  // Inline function 'io.ktor.utils.io.charsets.decodeExactBytesSlow.<anonymous>.<anonymous>' call
                  var buffer_2 = current_0;
                  // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
                  var chunkSize_0 =
                    (buffer_2.get_writePosition_jdt81t_k$() - buffer_2.get_readPosition_70qxnc_k$()) | 0;
                  // Inline function 'kotlin.comparisons.minOf' call
                  var b_0 = inputRemaining;
                  var size_1 = Math.min(chunkSize_0, b_0);
                  var tmp_5;
                  if (
                    buffer_2.get_readPosition_70qxnc_k$() === 0
                      ? buffer_2.get_memory_gl4362_k$().get_view_wow8a6_k$().byteLength === size_1
                      : false
                  ) {
                    tmp_5 = decoder.decode_hpap4q_k$(buffer_2.get_memory_gl4362_k$().get_view_wow8a6_k$());
                  } else {
                    var tmp$ret$14;
                    $l$block_3: {
                      // Inline function 'io.ktor.utils.io.js.decodeStream' call
                      var buffer_3 = new Int8Array(
                        buffer_2.get_memory_gl4362_k$().get_view_wow8a6_k$().buffer,
                        (buffer_2.get_memory_gl4362_k$().get_view_wow8a6_k$().byteOffset +
                          buffer_2.get_readPosition_70qxnc_k$()) |
                          0,
                        size_1,
                      );
                      // Inline function 'io.ktor.utils.io.js.decodeWrap' call
                      try {
                        tmp$ret$14 = decoder.decode_mvpnei_k$(buffer_3, decodeOptions(true));
                        break $l$block_3;
                      } catch ($p) {
                        if ($p instanceof Error) {
                          var t_1 = $p;
                          var tmp0_elvis_lhs_3 = t_1.message;
                          throw new MalformedInputException(
                            'Failed to decode bytes: ' +
                              (tmp0_elvis_lhs_3 == null ? 'no cause provided' : tmp0_elvis_lhs_3),
                          );
                        } else {
                          throw $p;
                        }
                      }
                    }
                    tmp_5 = tmp$ret$14;
                  }
                  var text_0 = tmp_5;
                  sb.append_22ad7x_k$(text_0);
                  buffer_2.discardExact_11sae1_k$(size_1);
                  inputRemaining = (inputRemaining - size_1) | 0;
                  if (!true) {
                    break $l$loop_1;
                  }
                  release_0 = false;
                  var tmp1_elvis_lhs_0 = prepareReadNextHead(input, current_0);
                  var tmp_6;
                  if (tmp1_elvis_lhs_0 == null) {
                    break $l$loop_1;
                  } else {
                    tmp_6 = tmp1_elvis_lhs_0;
                  }
                  var next_0 = tmp_6;
                  current_0 = next_0;
                  release_0 = true;
                } while (true);
              } finally {
                if (release_0) {
                  completeReadHead(input, current_0);
                }
              }
            }
          }
          sb.append_22ad7x_k$(decoder.decode_m3924y_k$());
          break $l$block_4;
        } catch ($p) {
          if ($p instanceof Error) {
            var t_2 = $p;
            var tmp0_elvis_lhs_4 = t_2.message;
            throw new MalformedInputException(
              'Failed to decode bytes: ' + (tmp0_elvis_lhs_4 == null ? 'no cause provided' : tmp0_elvis_lhs_4),
            );
          } else {
            throw $p;
          }
        }
      }
      if (inputRemaining > 0) {
        throw new EOFException(
          'Not enough bytes available: had only ' + ((inputLength - inputRemaining) | 0) + ' instead of ' + inputLength,
        );
      }
      return sb.toString();
    }
    function get_MAX_CHARACTERS_SIZE_IN_BYTES() {
      return MAX_CHARACTERS_SIZE_IN_BYTES;
    }
    var MAX_CHARACTERS_SIZE_IN_BYTES;
    function DecodeBufferResult(charactersDecoded, bytesConsumed) {
      this.charactersDecoded_1 = charactersDecoded;
      this.bytesConsumed_1 = bytesConsumed;
    }
    protoOf(DecodeBufferResult).get_charactersDecoded_mdwn5p_k$ = function () {
      return this.charactersDecoded_1;
    };
    protoOf(DecodeBufferResult).get_bytesConsumed_ic9jre_k$ = function () {
      return this.bytesConsumed_1;
    };
    protoOf(DecodeBufferResult).component1_7eebsc_k$ = function () {
      return this.charactersDecoded_1;
    };
    protoOf(DecodeBufferResult).component2_7eebsb_k$ = function () {
      return this.bytesConsumed_1;
    };
    protoOf(DecodeBufferResult).copy_1yzwer_k$ = function (charactersDecoded, bytesConsumed) {
      return new DecodeBufferResult(charactersDecoded, bytesConsumed);
    };
    protoOf(DecodeBufferResult).copy$default_m09cqh_k$ = function (charactersDecoded, bytesConsumed, $super) {
      charactersDecoded = charactersDecoded === VOID ? this.charactersDecoded_1 : charactersDecoded;
      bytesConsumed = bytesConsumed === VOID ? this.bytesConsumed_1 : bytesConsumed;
      return $super === VOID
        ? this.copy_1yzwer_k$(charactersDecoded, bytesConsumed)
        : $super.copy_1yzwer_k$.call(this, charactersDecoded, bytesConsumed);
    };
    protoOf(DecodeBufferResult).toString = function () {
      return (
        'DecodeBufferResult(charactersDecoded=' +
        this.charactersDecoded_1 +
        ', bytesConsumed=' +
        this.bytesConsumed_1 +
        ')'
      );
    };
    protoOf(DecodeBufferResult).hashCode = function () {
      var result = getStringHashCode(this.charactersDecoded_1);
      result = (imul(result, 31) + this.bytesConsumed_1) | 0;
      return result;
    };
    protoOf(DecodeBufferResult).equals = function (other) {
      if (this === other) return true;
      if (!(other instanceof DecodeBufferResult)) return false;
      var tmp0_other_with_cast = other instanceof DecodeBufferResult ? other : THROW_CCE();
      if (!(this.charactersDecoded_1 === tmp0_other_with_cast.charactersDecoded_1)) return false;
      if (!(this.bytesConsumed_1 === tmp0_other_with_cast.bytesConsumed_1)) return false;
      return true;
    };
    function decodeBufferImpl(_this__u8e3s4, nativeDecoder, maxCharacters) {
      if (maxCharacters === 0) {
        return new DecodeBufferResult('', 0);
      }
      try {
        var sizeInBytes = coerceAtMost_0(maxCharacters, _this__u8e3s4.byteLength);
        var text = nativeDecoder.decode_hpap4q_k$(_this__u8e3s4.subarray(0, sizeInBytes));
        if (text.length <= maxCharacters) {
          return new DecodeBufferResult(text, sizeInBytes);
        }
      } catch ($p) {
        var _ = $p;
      }
      return decodeBufferImplSlow(_this__u8e3s4, nativeDecoder, maxCharacters);
    }
    function decodeBufferImplSlow(_this__u8e3s4, nativeDecoder, maxCharacters) {
      var maxBytes = coerceAtMost_0(
        maxCharacters >= 268435455
          ? IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$()
          : imul(maxCharacters, 8),
        _this__u8e3s4.byteLength,
      );
      var sizeInBytes = maxBytes;
      while (sizeInBytes > 8) {
        try {
          var text = nativeDecoder.decode_hpap4q_k$(_this__u8e3s4.subarray(0, sizeInBytes));
          if (text.length <= maxCharacters) {
            return new DecodeBufferResult(text, sizeInBytes);
          }
        } catch ($p) {
          var _ = $p;
        }
        sizeInBytes = (sizeInBytes / 2) | 0;
      }
      sizeInBytes = 8;
      while (sizeInBytes > 0) {
        try {
          var text_0 = nativeDecoder.decode_hpap4q_k$(_this__u8e3s4.subarray(0, sizeInBytes));
          if (text_0.length <= maxCharacters) {
            return new DecodeBufferResult(text_0, sizeInBytes);
          }
        } catch ($p) {
          var __0 = $p;
        }
        sizeInBytes = (sizeInBytes - 1) | 0;
      }
      $l$block: {
        // Inline function 'io.ktor.utils.io.js.decodeWrap' call
        try {
          // Inline function 'io.ktor.utils.io.charsets.decodeBufferImplSlow.<anonymous>' call
          nativeDecoder.decode_hpap4q_k$(_this__u8e3s4);
          break $l$block;
        } catch ($p) {
          if ($p instanceof Error) {
            var t = $p;
            var tmp0_elvis_lhs = t.message;
            throw new MalformedInputException(
              'Failed to decode bytes: ' + (tmp0_elvis_lhs == null ? 'no cause provided' : tmp0_elvis_lhs),
            );
          } else {
            throw $p;
          }
        }
      }
      throw new MalformedInputException('Unable to decode buffer');
    }
    function get_MAX_CHARACTERS_COUNT() {
      return MAX_CHARACTERS_COUNT;
    }
    var MAX_CHARACTERS_COUNT;
    function encodeISO88591(input, fromIndex, toIndex, dst) {
      if (fromIndex >= toIndex) return 0;
      // Inline function 'io.ktor.utils.io.core.writeDirect' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeDirect.<anonymous>' call
      var memory = dst.get_memory_gl4362_k$();
      var start = dst.get_writePosition_jdt81t_k$();
      var endExclusive = dst.get_limit_iuokuq_k$();
      // Inline function 'io.ktor.utils.io.charsets.encodeISO88591.<anonymous>' call
      var view = memory.slice_bze60e_k$(start, (endExclusive - start) | 0).get_view_wow8a6_k$();
      var i8 = new Int8Array(view.buffer, view.byteOffset, view.byteLength);
      var writeIndex = 0;
      var inductionVariable = fromIndex;
      if (inductionVariable < toIndex)
        do {
          var index = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          // Inline function 'kotlin.code' call
          var this_0 = charSequenceGet(input, index);
          var character = Char__toInt_impl_vasixd(this_0);
          if (character > 255) {
            failedToMapError(character);
          }
          // Inline function 'org.khronos.webgl.set' call
          var tmp1 = writeIndex;
          writeIndex = (tmp1 + 1) | 0;
          // Inline function 'kotlin.js.asDynamic' call
          i8[tmp1] = toByte(character);
        } while (inductionVariable < toIndex);
      var rc = writeIndex;
      dst.commitWritten_tkztjs_k$(rc);
      return (toIndex - fromIndex) | 0;
    }
    function failedToMapError(ch) {
      throw new MalformedInputException(
        'The character with unicode point ' + ch + " couldn't be mapped to ISO-8859-1 character",
      );
    }
    function writeFully_5(_this__u8e3s4, src, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (src.byteLength - offset) | 0 : length;
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeFully.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var dstOffset = _this__u8e3s4.get_writePosition_jdt81t_k$();
      if (((_this__u8e3s4.get_limit_iuokuq_k$() - dstOffset) | 0) < length) {
        throw new InsufficientSpaceException('Not enough free space to write ' + length + ' bytes');
      }
      copyTo_0(src, memory, offset, length, dstOffset);
      var rc = length;
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
    }
    function readAvailable_0(_this__u8e3s4, dst, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (dst.byteLength - offset) | 0 : length;
      // Inline function 'io.ktor.utils.io.core.canRead' call
      if (!(_this__u8e3s4.get_writePosition_jdt81t_k$() > _this__u8e3s4.get_readPosition_70qxnc_k$())) return -1;
      // Inline function 'kotlin.comparisons.minOf' call
      // Inline function 'io.ktor.utils.io.core.Buffer.readRemaining' call
      var b = (_this__u8e3s4.get_writePosition_jdt81t_k$() - _this__u8e3s4.get_readPosition_70qxnc_k$()) | 0;
      var readSize = Math.min(length, b);
      readFully_5(_this__u8e3s4, dst, offset, readSize);
      return readSize;
    }
    function writeDirect(_this__u8e3s4, block) {
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.write' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.writeDirect.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var endExclusive = _this__u8e3s4.get_limit_iuokuq_k$();
      var rc = block(memory.slice_bze60e_k$(start, (endExclusive - start) | 0).get_view_wow8a6_k$());
      _this__u8e3s4.commitWritten_tkztjs_k$(rc);
      return rc;
    }
    function readFully_5(_this__u8e3s4, dst, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (dst.byteLength - offset) | 0 : length;
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readFully.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      if (((_this__u8e3s4.get_writePosition_jdt81t_k$() - start) | 0) < length) {
        throw new EOFException('Not enough bytes available to read ' + length + ' bytes');
      }
      copyTo_1(memory, dst, start, length, offset);
      var rc = length;
      _this__u8e3s4.discardExact_11sae1_k$(rc);
    }
    function readDirectInt8Array(_this__u8e3s4, block) {
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.read' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.core.readDirectInt8Array.<anonymous>' call
      var memory = _this__u8e3s4.get_memory_gl4362_k$();
      var start = _this__u8e3s4.get_readPosition_70qxnc_k$();
      var endExclusive = _this__u8e3s4.get_writePosition_jdt81t_k$();
      var rc = block(
        new Int8Array(
          memory.get_view_wow8a6_k$().buffer,
          (memory.get_view_wow8a6_k$().byteOffset + start) | 0,
          (endExclusive - start) | 0,
        ),
      );
      _this__u8e3s4.discardExact_11sae1_k$(rc);
      return rc;
    }
    function _get_native__4ncbvw($this) {
      return $this.native_1;
    }
    var ByteOrder_BIG_ENDIAN_instance;
    var ByteOrder_LITTLE_ENDIAN_instance;
    function Companion_6() {
      Companion_instance_6 = this;
      var buffer = new ArrayBuffer(4);
      var arr = new Int32Array(buffer);
      var view = new DataView(buffer);
      // Inline function 'org.khronos.webgl.set' call
      // Inline function 'kotlin.js.asDynamic' call
      arr[0] = 287454020;
      this.native_1 =
        view.getInt32(0, true) === 287454020
          ? ByteOrder_LITTLE_ENDIAN_getInstance()
          : ByteOrder_BIG_ENDIAN_getInstance();
    }
    protoOf(Companion_6).nativeOrder_spqstz_k$ = function () {
      return this.native_1;
    };
    var Companion_instance_6;
    function Companion_getInstance_8() {
      ByteOrder_initEntries();
      if (Companion_instance_6 == null) new Companion_6();
      return Companion_instance_6;
    }
    function values() {
      return [ByteOrder_BIG_ENDIAN_getInstance(), ByteOrder_LITTLE_ENDIAN_getInstance()];
    }
    function valueOf(value) {
      switch (value) {
        case 'BIG_ENDIAN':
          return ByteOrder_BIG_ENDIAN_getInstance();
        case 'LITTLE_ENDIAN':
          return ByteOrder_LITTLE_ENDIAN_getInstance();
        default:
          ByteOrder_initEntries();
          THROW_IAE('No enum constant value.');
          break;
      }
    }
    var ByteOrder_entriesInitialized;
    function ByteOrder_initEntries() {
      if (ByteOrder_entriesInitialized) return Unit_getInstance();
      ByteOrder_entriesInitialized = true;
      ByteOrder_BIG_ENDIAN_instance = new ByteOrder('BIG_ENDIAN', 0);
      ByteOrder_LITTLE_ENDIAN_instance = new ByteOrder('LITTLE_ENDIAN', 1);
      Companion_getInstance_8();
    }
    function ByteOrder(name, ordinal) {
      Enum.call(this, name, ordinal);
    }
    function ByteOrder_BIG_ENDIAN_getInstance() {
      ByteOrder_initEntries();
      return ByteOrder_BIG_ENDIAN_instance;
    }
    function ByteOrder_LITTLE_ENDIAN_getInstance() {
      ByteOrder_initEntries();
      return ByteOrder_LITTLE_ENDIAN_instance;
    }
    function Closeable() {}
    function readAvailable_1(_this__u8e3s4, dst, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (dst.byteLength - offset) | 0 : length;
      var remaining = _this__u8e3s4.get_remaining_mwegr1_k$();
      if (remaining.equals(new Long(0, 0))) return -1;
      // Inline function 'kotlin.comparisons.minOf' call
      var b = toLong(length);
      var size = (remaining.compareTo_9jj042_k$(b) <= 0 ? remaining : b).toInt_1tsl84_k$();
      readFully_6(_this__u8e3s4, dst, offset, size);
      return size;
    }
    function readFully_6(_this__u8e3s4, dst, offset, length) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? (dst.byteLength - offset) | 0 : length;
      if (_this__u8e3s4.get_remaining_mwegr1_k$().compareTo_9jj042_k$(toLong(length)) < 0) {
        throw IllegalArgumentException_init_$Create$(
          'Not enough bytes available (' +
            _this__u8e3s4.get_remaining_mwegr1_k$().toString() +
            ') to read ' +
            length +
            ' bytes',
        );
      }
      var copied = 0;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.takeWhile' call
        var release = true;
        var tmp0_elvis_lhs = prepareReadFirstHead(_this__u8e3s4, 1);
        var tmp;
        if (tmp0_elvis_lhs == null) {
          break $l$block;
        } else {
          tmp = tmp0_elvis_lhs;
        }
        var current = tmp;
        try {
          $l$loop_0: do {
            // Inline function 'io.ktor.utils.io.core.readFully.<anonymous>' call
            var buffer = current;
            var rc = readAvailable_0(buffer, dst, (offset + copied) | 0, (length - copied) | 0);
            if (rc > 0) copied = (copied + rc) | 0;
            if (!(copied < length)) {
              break $l$loop_0;
            }
            release = false;
            var tmp1_elvis_lhs = prepareReadNextHead(_this__u8e3s4, current);
            var tmp_0;
            if (tmp1_elvis_lhs == null) {
              break $l$loop_0;
            } else {
              tmp_0 = tmp1_elvis_lhs;
            }
            var next = tmp_0;
            current = next;
            release = true;
          } while (true);
        } finally {
          if (release) {
            completeReadHead(_this__u8e3s4, current);
          }
        }
      }
    }
    function get_PACKET_MAX_COPY_SIZE() {
      return PACKET_MAX_COPY_SIZE;
    }
    var PACKET_MAX_COPY_SIZE;
    function getCharsInternal(_this__u8e3s4, dst, dstOffset) {
      var length = _this__u8e3s4.length;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(((dstOffset + length) | 0) <= dst.length)) {
        // Inline function 'kotlin.require.<anonymous>' call
        var message = 'Failed requirement.';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      var dstIndex = dstOffset;
      var inductionVariable = 0;
      if (inductionVariable < length)
        do {
          var srcIndex = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          var tmp1 = dstIndex;
          dstIndex = (tmp1 + 1) | 0;
          dst[tmp1] = charSequenceGet(_this__u8e3s4, srcIndex);
        } while (inductionVariable < length);
    }
    function String_0(bytes, offset, length, charset) {
      offset = offset === VOID ? 0 : offset;
      length = length === VOID ? bytes.length : length;
      charset = charset === VOID ? Charsets_getInstance().get_UTF_8_ihn39z_k$() : charset;
      if ((offset < 0 ? true : length < 0) ? true : ((offset + length) | 0) > bytes.length) {
        checkIndices(offset, length, bytes);
      }
      // Inline function 'kotlin.js.asDynamic' call
      var i8 = bytes;
      var bufferOffset = (i8.byteOffset + offset) | 0;
      var buffer = i8.buffer.slice(bufferOffset, (bufferOffset + length) | 0);
      var view = new ChunkBuffer(
        of_1(Companion_getInstance_6(), buffer),
        null,
        Companion_getInstance_4().get_NoPool_21p86e_k$(),
      );
      view.resetForRead_c5oulc_k$();
      var packet = ByteReadPacket_init_$Create$(view, Companion_getInstance_4().get_NoPoolManuallyManaged_qxqaiu_k$());
      return decode(charset.newDecoder_zcettw_k$(), packet, IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$());
    }
    function checkIndices(offset, length, bytes) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(offset >= 0)) {
        throw IndexOutOfBoundsException_init_$Create$('offset (' + offset + ") shouldn't be negative");
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(length >= 0)) {
        throw IndexOutOfBoundsException_init_$Create$('length (' + length + ") shouldn't be negative");
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(((offset + length) | 0) <= bytes.length)) {
        throw IndexOutOfBoundsException_init_$Create$(
          'offset (' + offset + ') + length (' + length + ') > bytes.size (' + bytes.length + ')',
        );
      }
      throw IndexOutOfBoundsException_init_$Create$_0();
    }
    function EOFException(message) {
      IOException_init_$Init$(message, this);
      captureStack(this, EOFException);
    }
    function IOException_init_$Init$(message, $this) {
      IOException.call($this, message, null);
      return $this;
    }
    function IOException_init_$Create$(message) {
      var tmp = IOException_init_$Init$(message, objectCreate(protoOf(IOException)));
      captureStack(tmp, IOException_init_$Create$);
      return tmp;
    }
    function IOException(message, cause) {
      Exception_init_$Init$_0(message, cause, this);
      captureStack(this, IOException);
    }
    function Decoder() {}
    function Decoder_0(encoding, fatal) {
      fatal = fatal === VOID ? true : fatal;
      var tmp;
      try {
        tmp = toKtor(new TextDecoder(encoding, textDecoderOptions(fatal)));
      } catch ($p) {
        var tmp_0;
        if ($p instanceof Error) {
          var cause = $p;
          tmp_0 = new TextDecoderFallback(encoding, fatal);
        } else {
          throw $p;
        }
        tmp = tmp_0;
      }
      return tmp;
    }
    function decodeStream(_this__u8e3s4, buffer, stream) {
      // Inline function 'io.ktor.utils.io.js.decodeWrap' call
      try {
        return _this__u8e3s4.decode_mvpnei_k$(buffer, decodeOptions(stream));
      } catch ($p) {
        if ($p instanceof Error) {
          var t = $p;
          var tmp0_elvis_lhs = t.message;
          throw new MalformedInputException(
            'Failed to decode bytes: ' + (tmp0_elvis_lhs == null ? 'no cause provided' : tmp0_elvis_lhs),
          );
        } else {
          throw $p;
        }
      }
    }
    function decodeOptions(stream) {
      // Inline function 'kotlin.apply' call
      var this_0 = new Object();
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.js.decodeOptions.<anonymous>' call
      // Inline function 'kotlin.with' call
      // Inline function 'kotlin.js.asDynamic' call
      // Inline function 'kotlin.contracts.contract' call
      this_0.stream = stream;
      return this_0;
    }
    function toKtor(_this__u8e3s4) {
      return new toKtor$1(_this__u8e3s4);
    }
    function textDecoderOptions(fatal) {
      fatal = fatal === VOID ? false : fatal;
      // Inline function 'kotlin.apply' call
      var this_0 = new Object();
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'io.ktor.utils.io.js.textDecoderOptions.<anonymous>' call
      // Inline function 'kotlin.with' call
      // Inline function 'kotlin.js.asDynamic' call
      // Inline function 'kotlin.contracts.contract' call
      this_0.fatal = fatal;
      return this_0;
    }
    function toKtor$1($this_toKtor) {
      this.$this_toKtor_1 = $this_toKtor;
    }
    protoOf(toKtor$1).decode_m3924y_k$ = function () {
      return this.$this_toKtor_1.decode();
    };
    protoOf(toKtor$1).decode_hpap4q_k$ = function (buffer) {
      return this.$this_toKtor_1.decode(buffer);
    };
    protoOf(toKtor$1).decode_mvpnei_k$ = function (buffer, options) {
      return this.$this_toKtor_1.decode(buffer, options);
    };
    function get_ENCODING_ALIASES() {
      _init_properties_TextDecoderFallback_kt__nrrftl();
      return ENCODING_ALIASES;
    }
    var ENCODING_ALIASES;
    function get_REPLACEMENT() {
      _init_properties_TextDecoderFallback_kt__nrrftl();
      return REPLACEMENT;
    }
    var REPLACEMENT;
    function TextDecoderFallback(encoding, fatal) {
      this.fatal_1 = fatal;
      // Inline function 'kotlin.text.lowercase' call
      // Inline function 'kotlin.text.trim' call
      // Inline function 'kotlin.js.asDynamic' call
      var requestedEncoding = toString(trim(isCharSequence(encoding) ? encoding : THROW_CCE())).toLowerCase();
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!get_ENCODING_ALIASES().contains_aljjnj_k$(requestedEncoding)) {
        // Inline function 'io.ktor.utils.io.js.TextDecoderFallback.<anonymous>' call
        var message = encoding + ' is not supported.';
        throw IllegalStateException_init_$Create$(toString(message));
      }
    }
    protoOf(TextDecoderFallback).get_fatal_ir8ue3_k$ = function () {
      return this.fatal_1;
    };
    protoOf(TextDecoderFallback).decode_m3924y_k$ = function () {
      return '';
    };
    protoOf(TextDecoderFallback).decode_hpap4q_k$ = function (buffer) {
      var tmp$ret$3;
      $l$block: {
        // Inline function 'io.ktor.utils.io.core.buildPacket' call
        // Inline function 'kotlin.contracts.contract' call
        var builder = new BytePacketBuilder();
        try {
          // Inline function 'io.ktor.utils.io.js.TextDecoderFallback.decode.<anonymous>' call
          var bytes = buffer instanceof Int8Array ? buffer : THROW_CCE();
          var inductionVariable = 0;
          var last = bytes.length;
          if (inductionVariable < last)
            $l$loop: do {
              var index = inductionVariable;
              inductionVariable = (inductionVariable + 1) | 0;
              // Inline function 'org.khronos.webgl.get' call
              // Inline function 'kotlin.js.asDynamic' call
              var byte = bytes[index];
              var point = toCodePoint(byte);
              if (point < 0) {
                // Inline function 'kotlin.check' call
                // Inline function 'kotlin.contracts.contract' call
                if (!!this.fatal_1) {
                  // Inline function 'io.ktor.utils.io.js.TextDecoderFallback.decode.<anonymous>.<anonymous>' call
                  var message = 'Invalid character: ' + point;
                  throw IllegalStateException_init_$Create$(toString(message));
                }
                writeFully_2(builder, get_REPLACEMENT());
                continue $l$loop;
              }
              if (point > 255) {
                builder.writeByte_9ih3z3_k$(toByte(point >> 8));
              }
              builder.writeByte_9ih3z3_k$(toByte(point & 255));
            } while (inductionVariable < last);
          tmp$ret$3 = builder.build_1k0s4u_k$();
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
      return decodeToString(readBytes(tmp$ret$3));
    };
    protoOf(TextDecoderFallback).decode_mvpnei_k$ = function (buffer, options) {
      return this.decode_hpap4q_k$(buffer);
    };
    function toCodePoint(_this__u8e3s4) {
      _init_properties_TextDecoderFallback_kt__nrrftl();
      var value = _this__u8e3s4 & 255;
      if (isASCII(value)) {
        return value;
      }
      return get_WIN1252_TABLE()[(value - 128) | 0];
    }
    function isASCII(_this__u8e3s4) {
      _init_properties_TextDecoderFallback_kt__nrrftl();
      return 0 <= _this__u8e3s4 ? _this__u8e3s4 <= 127 : false;
    }
    var properties_initialized_TextDecoderFallback_kt_7y92ax;
    function _init_properties_TextDecoderFallback_kt__nrrftl() {
      if (!properties_initialized_TextDecoderFallback_kt_7y92ax) {
        properties_initialized_TextDecoderFallback_kt_7y92ax = true;
        ENCODING_ALIASES = setOf([
          'ansi_x3.4-1968',
          'ascii',
          'cp1252',
          'cp819',
          'csisolatin1',
          'ibm819',
          'iso-8859-1',
          'iso-ir-100',
          'iso8859-1',
          'iso88591',
          'iso_8859-1',
          'iso_8859-1:1987',
          'l1',
          'latin1',
          'us-ascii',
          'windows-1252',
          'x-cp1252',
        ]);
        // Inline function 'kotlin.byteArrayOf' call
        REPLACEMENT = new Int8Array([-17, -65, -67]);
      }
    }
    function decodeWrap(block) {
      try {
        return block();
      } catch ($p) {
        if ($p instanceof Error) {
          var t = $p;
          var tmp0_elvis_lhs = t.message;
          throw new MalformedInputException(
            'Failed to decode bytes: ' + (tmp0_elvis_lhs == null ? 'no cause provided' : tmp0_elvis_lhs),
          );
        } else {
          throw $p;
        }
      }
    }
    function get_WIN1252_TABLE() {
      _init_properties_Win1252Table_kt__tl0v64();
      return WIN1252_TABLE;
    }
    var WIN1252_TABLE;
    var properties_initialized_Win1252Table_kt_pkmjoq;
    function _init_properties_Win1252Table_kt__tl0v64() {
      if (!properties_initialized_Win1252Table_kt_pkmjoq) {
        properties_initialized_Win1252Table_kt_pkmjoq = true;
        // Inline function 'kotlin.intArrayOf' call
        WIN1252_TABLE = new Int32Array([
          8364, -1, 8218, 402, 8222, 8230, 8224, 8225, 710, 8240, 352, 8249, 338, -1, 381, -1, -1, 8216, 8217, 8220,
          8221, 8226, 8211, 8212, 732, 8482, 353, 8250, 339, -1, 382, 376, 160, 161, 162, 163, 164, 165, 166, 167, 168,
          169, 170, 171, 172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183, 184, 185, 186, 187, 188, 189, 190,
          191, 192, 193, 194, 195, 196, 197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212,
          213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223, 224, 225, 226, 227, 228, 229, 230, 231, 232, 233, 234,
          235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247, 248, 249, 250, 251, 252, 253, 254, 255,
        ]);
      }
    }
    function _get_instances__6pklt9($this) {
      return $this.instances_1;
    }
    function _set_size__9twho6($this, _set____db54di) {
      $this.size_1 = _set____db54di;
    }
    function _get_size__ddoh9m($this) {
      return $this.size_1;
    }
    function DefaultPool(capacity) {
      this.capacity_1 = capacity;
      var tmp = this;
      // Inline function 'kotlin.arrayOfNulls' call
      var size = this.capacity_1;
      tmp.instances_1 = fillArrayVal(Array(size), null);
      this.size_1 = 0;
    }
    protoOf(DefaultPool).get_capacity_wxbgcd_k$ = function () {
      return this.capacity_1;
    };
    protoOf(DefaultPool).disposeInstance_6ek0a2_k$ = function (instance) {};
    protoOf(DefaultPool).clearInstance_nfz4jw_k$ = function (instance) {
      return instance;
    };
    protoOf(DefaultPool).validateInstance_6mwbhp_k$ = function (instance) {};
    protoOf(DefaultPool).borrow_mvkpor_k$ = function () {
      if (this.size_1 === 0) return this.produceInstance_xswihh_k$();
      this.size_1 = (this.size_1 - 1) | 0;
      var idx = this.size_1;
      var tmp = this.instances_1[idx];
      var instance = !(tmp == null) ? tmp : THROW_CCE();
      this.instances_1[idx] = null;
      return this.clearInstance_nfz4jw_k$(instance);
    };
    protoOf(DefaultPool).recycle_d2xv5h_k$ = function (instance) {
      this.validateInstance_6mwbhp_k$(instance);
      if (this.size_1 === this.capacity_1) {
        this.disposeInstance_6ek0a2_k$(instance);
      } else {
        var tmp1 = this.size_1;
        this.size_1 = (tmp1 + 1) | 0;
        this.instances_1[tmp1] = instance;
      }
    };
    protoOf(DefaultPool).dispose_3nnxhr_k$ = function () {
      var inductionVariable = 0;
      var last = this.size_1;
      if (inductionVariable < last)
        do {
          var i = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          var tmp = this.instances_1[i];
          var instance = !(tmp == null) ? tmp : THROW_CCE();
          this.instances_1[i] = null;
          this.disposeInstance_6ek0a2_k$(instance);
        } while (inductionVariable < last);
      this.size_1 = 0;
    };
    //region block: post-declaration
    protoOf(ByteChannelSequentialBase).readRemaining$default_g3e7gf_k$ = readRemaining$default;
    protoOf(ByteChannelSequentialBase).await$default_nvzrqu_k$ = await$default;
    protoOf(ByteChannelSequentialBase).request$default_hh99dt_k$ = request$default;
    protoOf(ByteChannelSequentialBase).peekTo$default_lcbot1_k$ = peekTo$default;
    protoOf(ChannelJob).cancel$default_w08z00_k$ = cancel$default;
    protoOf(ChannelJob).cancel$default_8haxne_k$ = cancel$default_0;
    protoOf(ChannelJob).invokeOnCompletion$default_1v3utx_k$ = invokeOnCompletion$default;
    protoOf(DefaultPool).close_yn9xrc_k$ = close;
    protoOf(ChunkBuffer$Companion$EmptyPool$1).close_yn9xrc_k$ = close;
    protoOf(NoPoolImpl).close_yn9xrc_k$ = close;
    //endregion
    //region block: init
    EXPECTED_CAPACITY = new Long(4088, 0);
    DEFAULT_BUFFER_SIZE = 4096;
    MaxCodePoint = 1114111;
    HighSurrogateMagic = 55232;
    MinLowSurrogate = 56320;
    MAX_CHARACTERS_SIZE_IN_BYTES = 8;
    MAX_CHARACTERS_COUNT = 268435455;
    PACKET_MAX_COPY_SIZE = 200;
    //endregion
    //region block: exports
    _.$_$ = _.$_$ || {};
    _.$_$.a = copyAndClose;
    _.$_$.b = copyTo;
    _.$_$.c = readAvailable;
    _.$_$.d = IOException_init_$Init$;
    _.$_$.e = Companion_getInstance_7;
    _.$_$.f = Charsets_getInstance;
    _.$_$.g = Companion_getInstance_5;
    _.$_$.h = MalformedInputException;
    _.$_$.i = decode;
    _.$_$.j = encodeToByteArray_0;
    _.$_$.k = encode_0;
    _.$_$.l = get_name;
    _.$_$.m = completeReadHead;
    _.$_$.n = prepareReadFirstHead;
    _.$_$.o = prepareReadNextHead;
    _.$_$.p = BytePacketBuilder;
    _.$_$.q = ByteReadPacket;
    _.$_$.r = Closeable;
    _.$_$.s = Input;
    _.$_$.t = String_0;
    _.$_$.u = readBytes;
    _.$_$.v = readText;
    _.$_$.w = writeShort_0;
    _.$_$.x = writeText;
    _.$_$.y = IOException;
    _.$_$.z = get_ByteArrayPool;
    _.$_$.a1 = ByteChannel_0;
    _.$_$.b1 = ByteReadChannel;
    _.$_$.c1 = ByteReadChannel_1;
    _.$_$.d1 = WriterScope;
    _.$_$.e1 = cancel;
    _.$_$.f1 = writer;
    //endregion
    return _;
  },
);

//# sourceMappingURL=ktor-ktor-io.js.map
