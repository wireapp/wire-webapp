(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['exports', './kotlin-kotlin-stdlib.js'], factory);
  else if (typeof exports === 'object') factory(module.exports, require('./kotlin-kotlin-stdlib.js'));
  else {
    if (typeof this['kotlin-kotlin-stdlib'] === 'undefined') {
      throw new Error(
        "Error loading module 'okio-parent-okio'. Its dependency 'kotlin-kotlin-stdlib' was not found. Please, check whether 'kotlin-kotlin-stdlib' is loaded prior to 'okio-parent-okio'.",
      );
    }
    root['okio-parent-okio'] = factory(
      typeof this['okio-parent-okio'] === 'undefined' ? {} : this['okio-parent-okio'],
      this['kotlin-kotlin-stdlib'],
    );
  }
})(this, function (_, kotlin_kotlin) {
  'use strict';
  //region block: imports
  var imul = Math.imul;
  var VOID = kotlin_kotlin.$_$.f;
  var charSequenceGet = kotlin_kotlin.$_$.qa;
  var _Char___init__impl__6a9atx = kotlin_kotlin.$_$.t2;
  var numberToLong = kotlin_kotlin.$_$.ac;
  var Long = kotlin_kotlin.$_$.kg;
  var Char__toInt_impl_vasixd = kotlin_kotlin.$_$.z2;
  var toByte = kotlin_kotlin.$_$.fc;
  var copyOf = kotlin_kotlin.$_$.c7;
  var toString = kotlin_kotlin.$_$.ic;
  var IllegalArgumentException_init_$Create$ = kotlin_kotlin.$_$.r1;
  var toLong = kotlin_kotlin.$_$.gc;
  var IllegalStateException_init_$Create$ = kotlin_kotlin.$_$.w1;
  var toMutableList = kotlin_kotlin.$_$.i9;
  var sort = kotlin_kotlin.$_$.z8;
  var ArrayList_init_$Create$ = kotlin_kotlin.$_$.l;
  var binarySearch = kotlin_kotlin.$_$.m6;
  var protoOf = kotlin_kotlin.$_$.dc;
  var objectMeta = kotlin_kotlin.$_$.cc;
  var setMetadataFor = kotlin_kotlin.$_$.ec;
  var AbstractList = kotlin_kotlin.$_$.l5;
  var RandomAccess = kotlin_kotlin.$_$.e6;
  var classMeta = kotlin_kotlin.$_$.ta;
  var ensureNotNull = kotlin_kotlin.$_$.hh;
  var objectCreate = kotlin_kotlin.$_$.bc;
  var arrayCopy = kotlin_kotlin.$_$.i6;
  var Unit_getInstance = kotlin_kotlin.$_$.k5;
  var IllegalArgumentException_init_$Create$_0 = kotlin_kotlin.$_$.p1;
  var interfaceMeta = kotlin_kotlin.$_$.gb;
  var toList = kotlin_kotlin.$_$.e9;
  var fillArrayVal = kotlin_kotlin.$_$.za;
  var Char__compareTo_impl_ypi4mb = kotlin_kotlin.$_$.u2;
  var Char = kotlin_kotlin.$_$.zf;
  var numberToChar = kotlin_kotlin.$_$.yb;
  var toShort = kotlin_kotlin.$_$.hc;
  var charArray = kotlin_kotlin.$_$.pa;
  var concatToString = kotlin_kotlin.$_$.jd;
  var concatToString_0 = kotlin_kotlin.$_$.kd;
  var NumberFormatException_init_$Create$ = kotlin_kotlin.$_$.f2;
  var IntCompanionObject_getInstance = kotlin_kotlin.$_$.w4;
  var Companion_getInstance = kotlin_kotlin.$_$.e5;
  var AssertionError_init_$Create$ = kotlin_kotlin.$_$.i1;
  var THROW_CCE = kotlin_kotlin.$_$.qg;
  var isArray = kotlin_kotlin.$_$.hb;
  var copyOfRange = kotlin_kotlin.$_$.x6;
  var contentHashCode = kotlin_kotlin.$_$.s6;
  var replace = kotlin_kotlin.$_$.me;
  var toString_0 = kotlin_kotlin.$_$.a3;
  var Char__minus_impl_a2frrh = kotlin_kotlin.$_$.v2;
  var charArrayOf = kotlin_kotlin.$_$.oa;
  var AssertionError_init_$Create$_0 = kotlin_kotlin.$_$.h1;
  var toString_1 = kotlin_kotlin.$_$.kf;
  var copyOfRange_0 = kotlin_kotlin.$_$.w6;
  var fill = kotlin_kotlin.$_$.o7;
  var fill_0 = kotlin_kotlin.$_$.m7;
  var fill_1 = kotlin_kotlin.$_$.n7;
  var longArrayOf = kotlin_kotlin.$_$.vb;
  var longArray = kotlin_kotlin.$_$.wb;
  var Comparable = kotlin_kotlin.$_$.ag;
  var IndexOutOfBoundsException = kotlin_kotlin.$_$.jg;
  var IndexOutOfBoundsException_init_$Init$ = kotlin_kotlin.$_$.a2;
  var captureStack = kotlin_kotlin.$_$.na;
  var Exception = kotlin_kotlin.$_$.gg;
  var Exception_init_$Init$ = kotlin_kotlin.$_$.m1;
  //endregion
  //region block: pre-declaration
  setMetadataFor(Companion, 'Companion', objectMeta);
  setMetadataFor(Options, 'Options', classMeta, AbstractList, [AbstractList, RandomAccess]);
  setMetadataFor(Closeable, 'Closeable', interfaceMeta);
  setMetadataFor(Source, 'Source', interfaceMeta, VOID, [Closeable]);
  setMetadataFor(PeekSource, 'PeekSource', classMeta, VOID, [Source]);
  setMetadataFor(Companion_0, 'Companion', objectMeta);
  setMetadataFor(Segment, 'Segment', classMeta, VOID, VOID, Segment_init_$Create$);
  setMetadataFor(Companion_1, 'Companion', objectMeta);
  setMetadataFor(TypedOptions, 'TypedOptions', classMeta, AbstractList, [AbstractList, RandomAccess]);
  function update$default(input, offset, byteCount, $super) {
    offset = offset === VOID ? 0 : offset;
    byteCount = byteCount === VOID ? input.length : byteCount;
    var tmp;
    if ($super === VOID) {
      this.update_6igkux_k$(input, offset, byteCount);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.update_6igkux_k$.call(this, input, offset, byteCount);
    }
    return tmp;
  }
  setMetadataFor(HashFunction, 'HashFunction', interfaceMeta);
  setMetadataFor(Companion_2, 'Companion', objectMeta);
  setMetadataFor(Hmac, 'Hmac', classMeta, VOID, [HashFunction]);
  setMetadataFor(Companion_3, 'Companion', objectMeta);
  setMetadataFor(Md5, 'Md5', classMeta, VOID, [HashFunction], Md5);
  setMetadataFor(Sha1, 'Sha1', classMeta, VOID, [HashFunction], Sha1);
  setMetadataFor(Companion_4, 'Companion', objectMeta);
  setMetadataFor(Sha256, 'Sha256', classMeta, VOID, [HashFunction], Sha256);
  setMetadataFor(Companion_5, 'Companion', objectMeta);
  setMetadataFor(Sha512, 'Sha512', classMeta, VOID, [HashFunction], Sha512);
  setMetadataFor(Companion_6, 'Companion', objectMeta);
  setMetadataFor(ByteString, 'ByteString', classMeta, VOID, [Comparable]);
  setMetadataFor(SegmentedByteString, 'SegmentedByteString', classMeta, ByteString);
  setMetadataFor(UnsafeCursor, 'UnsafeCursor', classMeta, VOID, [Closeable], UnsafeCursor);
  setMetadataFor(BufferedSource, 'BufferedSource', interfaceMeta, VOID, [Source]);
  setMetadataFor(Sink, 'Sink', interfaceMeta, VOID, [Closeable]);
  setMetadataFor(BufferedSink, 'BufferedSink', interfaceMeta, VOID, [Sink]);
  setMetadataFor(Buffer, 'Buffer', classMeta, VOID, [BufferedSource, BufferedSink], Buffer);
  setMetadataFor(
    ArrayIndexOutOfBoundsException,
    'ArrayIndexOutOfBoundsException',
    classMeta,
    IndexOutOfBoundsException,
  );
  setMetadataFor(IOException, 'IOException', classMeta, Exception, VOID, IOException_init_$Create$_0);
  setMetadataFor(EOFException, 'EOFException', classMeta, IOException, VOID, EOFException_init_$Create$);
  setMetadataFor(RealBufferedSource, 'RealBufferedSource', classMeta, VOID, [BufferedSource]);
  setMetadataFor(SegmentPool, 'SegmentPool', objectMeta);
  setMetadataFor(Companion_7, 'Companion', objectMeta);
  setMetadataFor(Timeout, 'Timeout', classMeta, VOID, VOID, Timeout);
  //endregion
  function get_BASE64() {
    _init_properties_Base64_kt__ymmsz3();
    return BASE64;
  }
  var BASE64;
  function get_BASE64_URL_SAFE() {
    _init_properties_Base64_kt__ymmsz3();
    return BASE64_URL_SAFE;
  }
  var BASE64_URL_SAFE;
  function encodeBase64(_this__u8e3s4, map) {
    map = map === VOID ? get_BASE64() : map;
    _init_properties_Base64_kt__ymmsz3();
    var length = imul((((_this__u8e3s4.length + 2) | 0) / 3) | 0, 4);
    var out = new Int8Array(length);
    var index = 0;
    var end = (_this__u8e3s4.length - (_this__u8e3s4.length % 3 | 0)) | 0;
    var i = 0;
    while (i < end) {
      var tmp0 = i;
      i = (tmp0 + 1) | 0;
      var b0 = _this__u8e3s4[tmp0];
      var tmp1 = i;
      i = (tmp1 + 1) | 0;
      var b1 = _this__u8e3s4[tmp1];
      var tmp2 = i;
      i = (tmp2 + 1) | 0;
      var b2 = _this__u8e3s4[tmp2];
      var tmp3 = index;
      index = (tmp3 + 1) | 0;
      out[tmp3] = map[(b0 & 255) >> 2];
      var tmp4 = index;
      index = (tmp4 + 1) | 0;
      out[tmp4] = map[((b0 & 3) << 4) | ((b1 & 255) >> 4)];
      var tmp5 = index;
      index = (tmp5 + 1) | 0;
      out[tmp5] = map[((b1 & 15) << 2) | ((b2 & 255) >> 6)];
      var tmp6 = index;
      index = (tmp6 + 1) | 0;
      out[tmp6] = map[b2 & 63];
    }
    var tmp7_subject = (_this__u8e3s4.length - end) | 0;
    if (tmp7_subject === 1) {
      var b0_0 = _this__u8e3s4[i];
      var tmp8 = index;
      index = (tmp8 + 1) | 0;
      out[tmp8] = map[(b0_0 & 255) >> 2];
      var tmp9 = index;
      index = (tmp9 + 1) | 0;
      out[tmp9] = map[(b0_0 & 3) << 4];
      var tmp10 = index;
      index = (tmp10 + 1) | 0;
      out[tmp10] = 61;
      out[index] = 61;
    } else if (tmp7_subject === 2) {
      var tmp11 = i;
      i = (tmp11 + 1) | 0;
      var b0_1 = _this__u8e3s4[tmp11];
      var b1_0 = _this__u8e3s4[i];
      var tmp12 = index;
      index = (tmp12 + 1) | 0;
      out[tmp12] = map[(b0_1 & 255) >> 2];
      var tmp13 = index;
      index = (tmp13 + 1) | 0;
      out[tmp13] = map[((b0_1 & 3) << 4) | ((b1_0 & 255) >> 4)];
      var tmp14 = index;
      index = (tmp14 + 1) | 0;
      out[tmp14] = map[(b1_0 & 15) << 2];
      out[index] = 61;
    }
    return toUtf8String(out);
  }
  function decodeBase64ToArray(_this__u8e3s4) {
    _init_properties_Base64_kt__ymmsz3();
    var limit = _this__u8e3s4.length;
    $l$loop: while (limit > 0) {
      var c = charSequenceGet(_this__u8e3s4, (limit - 1) | 0);
      if (
        (
          (
            (!(c === _Char___init__impl__6a9atx(61)) ? !(c === _Char___init__impl__6a9atx(10)) : false)
              ? !(c === _Char___init__impl__6a9atx(13))
              : false
          )
            ? !(c === _Char___init__impl__6a9atx(32))
            : false
        )
          ? !(c === _Char___init__impl__6a9atx(9))
          : false
      ) {
        break $l$loop;
      }
      limit = (limit - 1) | 0;
    }
    var out = new Int8Array(
      numberToLong(limit).times_nfzjiw_k$(new Long(6, 0)).div_jun7gj_k$(new Long(8, 0)).toInt_1tsl84_k$(),
    );
    var outCount = 0;
    var inCount = 0;
    var word = 0;
    var inductionVariable = 0;
    var last = limit;
    if (inductionVariable < last)
      $l$loop_0: do {
        var pos = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var c_0 = charSequenceGet(_this__u8e3s4, pos);
        var bits;
        if (_Char___init__impl__6a9atx(65) <= c_0 ? c_0 <= _Char___init__impl__6a9atx(90) : false) {
          // Inline function 'kotlin.code' call
          bits = (Char__toInt_impl_vasixd(c_0) - 65) | 0;
        } else if (_Char___init__impl__6a9atx(97) <= c_0 ? c_0 <= _Char___init__impl__6a9atx(122) : false) {
          // Inline function 'kotlin.code' call
          bits = (Char__toInt_impl_vasixd(c_0) - 71) | 0;
        } else if (_Char___init__impl__6a9atx(48) <= c_0 ? c_0 <= _Char___init__impl__6a9atx(57) : false) {
          // Inline function 'kotlin.code' call
          bits = (Char__toInt_impl_vasixd(c_0) + 4) | 0;
        } else if (c_0 === _Char___init__impl__6a9atx(43) ? true : c_0 === _Char___init__impl__6a9atx(45)) {
          bits = 62;
        } else if (c_0 === _Char___init__impl__6a9atx(47) ? true : c_0 === _Char___init__impl__6a9atx(95)) {
          bits = 63;
        } else if (
          (
            (c_0 === _Char___init__impl__6a9atx(10) ? true : c_0 === _Char___init__impl__6a9atx(13))
              ? true
              : c_0 === _Char___init__impl__6a9atx(32)
          )
            ? true
            : c_0 === _Char___init__impl__6a9atx(9)
        ) {
          continue $l$loop_0;
        } else {
          return null;
        }
        word = (word << 6) | bits;
        inCount = (inCount + 1) | 0;
        if ((inCount % 4 | 0) === 0) {
          var tmp3 = outCount;
          outCount = (tmp3 + 1) | 0;
          out[tmp3] = toByte(word >> 16);
          var tmp4 = outCount;
          outCount = (tmp4 + 1) | 0;
          out[tmp4] = toByte(word >> 8);
          var tmp5 = outCount;
          outCount = (tmp5 + 1) | 0;
          out[tmp5] = toByte(word);
        }
      } while (inductionVariable < last);
    var lastWordChars = inCount % 4 | 0;
    switch (lastWordChars) {
      case 1:
        return null;
      case 2:
        word = word << 12;
        var tmp7 = outCount;
        outCount = (tmp7 + 1) | 0;
        out[tmp7] = toByte(word >> 16);
        break;
      case 3:
        word = word << 6;
        var tmp8 = outCount;
        outCount = (tmp8 + 1) | 0;
        out[tmp8] = toByte(word >> 16);
        var tmp9 = outCount;
        outCount = (tmp9 + 1) | 0;
        out[tmp9] = toByte(word >> 8);
        break;
    }
    if (outCount === out.length) return out;
    return copyOf(out, outCount);
  }
  var properties_initialized_Base64_kt_5g824v;
  function _init_properties_Base64_kt__ymmsz3() {
    if (!properties_initialized_Base64_kt_5g824v) {
      properties_initialized_Base64_kt_5g824v = true;
      BASE64 = Companion_getInstance_7()
        .encodeUtf8_5n709n_k$('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/')
        .get_data_wokkxf_k$();
      BASE64_URL_SAFE = Companion_getInstance_7()
        .encodeUtf8_5n709n_k$('ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_')
        .get_data_wokkxf_k$();
    }
  }
  function buffer(_this__u8e3s4) {
    return new RealBufferedSource(_this__u8e3s4);
  }
  function buildTrieRecursive($this, nodeOffset, node, byteStringOffset, byteStrings, fromIndex, toIndex, indexes) {
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(fromIndex < toIndex)) {
      // Inline function 'kotlin.require.<anonymous>' call
      var message = 'Failed requirement.';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    var inductionVariable = fromIndex;
    if (inductionVariable < toIndex)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        // Inline function 'kotlin.require' call
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'kotlin.require' call
        // Inline function 'kotlin.contracts.contract' call
        if (!(byteStrings.get_c1px32_k$(i).get_size_woubt6_k$() >= byteStringOffset)) {
          // Inline function 'kotlin.require.<anonymous>' call
          var message_0 = 'Failed requirement.';
          throw IllegalArgumentException_init_$Create$(toString(message_0));
        }
      } while (inductionVariable < toIndex);
    var fromIndex_0 = fromIndex;
    var from = byteStrings.get_c1px32_k$(fromIndex_0);
    var to = byteStrings.get_c1px32_k$((toIndex - 1) | 0);
    var prefixIndex = -1;
    if (byteStringOffset === from.get_size_woubt6_k$()) {
      prefixIndex = indexes.get_c1px32_k$(fromIndex_0);
      fromIndex_0 = (fromIndex_0 + 1) | 0;
      from = byteStrings.get_c1px32_k$(fromIndex_0);
    }
    if (!(from.get_c1px32_k$(byteStringOffset) === to.get_c1px32_k$(byteStringOffset))) {
      var selectChoiceCount = 1;
      var inductionVariable_0 = (fromIndex_0 + 1) | 0;
      if (inductionVariable_0 < toIndex)
        do {
          var i_0 = inductionVariable_0;
          inductionVariable_0 = (inductionVariable_0 + 1) | 0;
          if (
            !(
              byteStrings.get_c1px32_k$((i_0 - 1) | 0).get_c1px32_k$(byteStringOffset) ===
              byteStrings.get_c1px32_k$(i_0).get_c1px32_k$(byteStringOffset)
            )
          ) {
            selectChoiceCount = (selectChoiceCount + 1) | 0;
          }
        } while (inductionVariable_0 < toIndex);
      // Inline function 'kotlin.Long.plus' call
      // Inline function 'kotlin.Long.plus' call
      var this_0 = nodeOffset.plus_r93sks_k$(_get_intCount__gol563(node, $this)).plus_r93sks_k$(toLong(2));
      var other = imul(selectChoiceCount, 2);
      var childNodesOffset = this_0.plus_r93sks_k$(toLong(other));
      node.writeInt_nsyxiw_k$(selectChoiceCount);
      node.writeInt_nsyxiw_k$(prefixIndex);
      var inductionVariable_1 = fromIndex_0;
      if (inductionVariable_1 < toIndex)
        do {
          var i_1 = inductionVariable_1;
          inductionVariable_1 = (inductionVariable_1 + 1) | 0;
          var rangeByte = byteStrings.get_c1px32_k$(i_1).get_c1px32_k$(byteStringOffset);
          if (
            i_1 === fromIndex_0
              ? true
              : !(rangeByte === byteStrings.get_c1px32_k$((i_1 - 1) | 0).get_c1px32_k$(byteStringOffset))
          ) {
            // Inline function 'okio.and' call
            var tmp$ret$4 = rangeByte & 255;
            node.writeInt_nsyxiw_k$(tmp$ret$4);
          }
        } while (inductionVariable_1 < toIndex);
      var childNodes = new Buffer();
      var rangeStart = fromIndex_0;
      while (rangeStart < toIndex) {
        var rangeByte_0 = byteStrings.get_c1px32_k$(rangeStart).get_c1px32_k$(byteStringOffset);
        var rangeEnd = toIndex;
        var inductionVariable_2 = (rangeStart + 1) | 0;
        if (inductionVariable_2 < toIndex)
          $l$loop: do {
            var i_2 = inductionVariable_2;
            inductionVariable_2 = (inductionVariable_2 + 1) | 0;
            if (!(rangeByte_0 === byteStrings.get_c1px32_k$(i_2).get_c1px32_k$(byteStringOffset))) {
              rangeEnd = i_2;
              break $l$loop;
            }
          } while (inductionVariable_2 < toIndex);
        if (
          ((rangeStart + 1) | 0) === rangeEnd
            ? ((byteStringOffset + 1) | 0) === byteStrings.get_c1px32_k$(rangeStart).get_size_woubt6_k$()
            : false
        ) {
          node.writeInt_nsyxiw_k$(indexes.get_c1px32_k$(rangeStart));
        } else {
          node.writeInt_nsyxiw_k$(
            imul(-1, childNodesOffset.plus_r93sks_k$(_get_intCount__gol563(childNodes, $this)).toInt_1tsl84_k$()),
          );
          buildTrieRecursive(
            $this,
            childNodesOffset,
            childNodes,
            (byteStringOffset + 1) | 0,
            byteStrings,
            rangeStart,
            rangeEnd,
            indexes,
          );
        }
        rangeStart = rangeEnd;
      }
      node.writeAll_goqmgy_k$(childNodes);
    } else {
      var scanByteCount = 0;
      var inductionVariable_3 = byteStringOffset;
      // Inline function 'kotlin.comparisons.minOf' call
      var a = from.get_size_woubt6_k$();
      var b = to.get_size_woubt6_k$();
      var last = Math.min(a, b);
      if (inductionVariable_3 < last)
        $l$loop_0: do {
          var i_3 = inductionVariable_3;
          inductionVariable_3 = (inductionVariable_3 + 1) | 0;
          if (from.get_c1px32_k$(i_3) === to.get_c1px32_k$(i_3)) {
            scanByteCount = (scanByteCount + 1) | 0;
          } else {
            break $l$loop_0;
          }
        } while (inductionVariable_3 < last);
      // Inline function 'kotlin.Long.plus' call
      // Inline function 'kotlin.Long.plus' call
      // Inline function 'kotlin.Long.plus' call
      var this_1 = nodeOffset.plus_r93sks_k$(_get_intCount__gol563(node, $this)).plus_r93sks_k$(toLong(2));
      var other_0 = scanByteCount;
      var childNodesOffset_0 = this_1.plus_r93sks_k$(toLong(other_0)).plus_r93sks_k$(toLong(1));
      node.writeInt_nsyxiw_k$(-scanByteCount | 0);
      node.writeInt_nsyxiw_k$(prefixIndex);
      var inductionVariable_4 = byteStringOffset;
      var last_0 = (byteStringOffset + scanByteCount) | 0;
      if (inductionVariable_4 < last_0)
        do {
          var i_4 = inductionVariable_4;
          inductionVariable_4 = (inductionVariable_4 + 1) | 0;
          // Inline function 'okio.and' call
          var tmp$ret$9 = from.get_c1px32_k$(i_4) & 255;
          node.writeInt_nsyxiw_k$(tmp$ret$9);
        } while (inductionVariable_4 < last_0);
      if (((fromIndex_0 + 1) | 0) === toIndex) {
        // Inline function 'kotlin.check' call
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'kotlin.check' call
        // Inline function 'kotlin.contracts.contract' call
        if (
          !(((byteStringOffset + scanByteCount) | 0) === byteStrings.get_c1px32_k$(fromIndex_0).get_size_woubt6_k$())
        ) {
          // Inline function 'kotlin.check.<anonymous>' call
          var message_1 = 'Check failed.';
          throw IllegalStateException_init_$Create$(toString(message_1));
        }
        node.writeInt_nsyxiw_k$(indexes.get_c1px32_k$(fromIndex_0));
      } else {
        var childNodes_0 = new Buffer();
        node.writeInt_nsyxiw_k$(
          imul(-1, childNodesOffset_0.plus_r93sks_k$(_get_intCount__gol563(childNodes_0, $this)).toInt_1tsl84_k$()),
        );
        buildTrieRecursive(
          $this,
          childNodesOffset_0,
          childNodes_0,
          (byteStringOffset + scanByteCount) | 0,
          byteStrings,
          fromIndex_0,
          toIndex,
          indexes,
        );
        node.writeAll_goqmgy_k$(childNodes_0);
      }
    }
  }
  function buildTrieRecursive$default(
    $this,
    nodeOffset,
    node,
    byteStringOffset,
    byteStrings,
    fromIndex,
    toIndex,
    indexes,
    $super,
  ) {
    nodeOffset = nodeOffset === VOID ? new Long(0, 0) : nodeOffset;
    byteStringOffset = byteStringOffset === VOID ? 0 : byteStringOffset;
    fromIndex = fromIndex === VOID ? 0 : fromIndex;
    toIndex = toIndex === VOID ? byteStrings.get_size_woubt6_k$() : toIndex;
    return buildTrieRecursive($this, nodeOffset, node, byteStringOffset, byteStrings, fromIndex, toIndex, indexes);
  }
  function _get_intCount__gol563(_this__u8e3s4, $this) {
    // Inline function 'kotlin.Long.div' call
    return _this__u8e3s4.get_size_woubt6_k$().div_jun7gj_k$(toLong(4));
  }
  function Companion() {
    Companion_instance = this;
  }
  protoOf(Companion).of_35g6b5_k$ = function (byteStrings) {
    // Inline function 'kotlin.collections.isEmpty' call
    if (byteStrings.length === 0) {
      // Inline function 'kotlin.arrayOf' call
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = [];
      // Inline function 'kotlin.intArrayOf' call
      var tmp$ret$4 = new Int32Array([0, -1]);
      return new Options(tmp, tmp$ret$4);
    }
    var list = toMutableList(byteStrings);
    sort(list);
    // Inline function 'kotlin.collections.MutableList' call
    var size = list.get_size_woubt6_k$();
    var list_0 = ArrayList_init_$Create$(size);
    // Inline function 'kotlin.repeat' call
    // Inline function 'kotlin.contracts.contract' call
    var inductionVariable = 0;
    if (inductionVariable < size)
      do {
        var index = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        // Inline function 'kotlin.collections.MutableList.<anonymous>' call
        // Inline function 'okio.Companion.of.<anonymous>' call
        list_0.add_utx5q5_k$(-1);
      } while (inductionVariable < size);
    var indexes = list_0;
    // Inline function 'kotlin.collections.forEachIndexed' call
    var index_0 = 0;
    var inductionVariable_0 = 0;
    var last = byteStrings.length;
    while (inductionVariable_0 < last) {
      var item = byteStrings[inductionVariable_0];
      inductionVariable_0 = (inductionVariable_0 + 1) | 0;
      // Inline function 'okio.Companion.of.<anonymous>' call
      var tmp1 = index_0;
      index_0 = (tmp1 + 1) | 0;
      var sortedIndex = binarySearch(list, item);
      indexes.set_82063s_k$(sortedIndex, tmp1);
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(list.get_c1px32_k$(0).get_size_woubt6_k$() > 0)) {
      // Inline function 'okio.Companion.of.<anonymous>' call
      var message = 'the empty byte string is not a supported option';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    var a = 0;
    while (a < list.get_size_woubt6_k$()) {
      var prefix = list.get_c1px32_k$(a);
      var b = (a + 1) | 0;
      $l$loop: while (b < list.get_size_woubt6_k$()) {
        var byteString = list.get_c1px32_k$(b);
        if (!byteString.startsWith_w7onu6_k$(prefix)) break $l$loop;
        // Inline function 'kotlin.require' call
        // Inline function 'kotlin.contracts.contract' call
        if (!!(byteString.get_size_woubt6_k$() === prefix.get_size_woubt6_k$())) {
          // Inline function 'okio.Companion.of.<anonymous>' call
          var message_0 = 'duplicate option: ' + byteString;
          throw IllegalArgumentException_init_$Create$(toString(message_0));
        }
        if (indexes.get_c1px32_k$(b) > indexes.get_c1px32_k$(a)) {
          list.removeAt_6niowx_k$(b);
          indexes.removeAt_6niowx_k$(b);
        } else {
          b = (b + 1) | 0;
        }
      }
      a = (a + 1) | 0;
    }
    var trieBytes = new Buffer();
    buildTrieRecursive$default(this, VOID, trieBytes, VOID, list, VOID, VOID, indexes);
    var tmp_0 = 0;
    var tmp_1 = _get_intCount__gol563(trieBytes, this).toInt_1tsl84_k$();
    var tmp_2 = new Int32Array(tmp_1);
    while (tmp_0 < tmp_1) {
      tmp_2[tmp_0] = trieBytes.readInt_hv8cxl_k$();
      tmp_0 = (tmp_0 + 1) | 0;
    }
    var trie = tmp_2;
    // Inline function 'kotlin.collections.copyOf' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$11 = byteStrings.slice();
    return new Options(tmp$ret$11, trie);
  };
  var Companion_instance;
  function Companion_getInstance_0() {
    if (Companion_instance == null) new Companion();
    return Companion_instance;
  }
  function Options(byteStrings, trie) {
    Companion_getInstance_0();
    AbstractList.call(this);
    this.byteStrings_1 = byteStrings;
    this.trie_1 = trie;
  }
  protoOf(Options).get_byteStrings_g0wbnz_k$ = function () {
    return this.byteStrings_1;
  };
  protoOf(Options).get_trie_wov52b_k$ = function () {
    return this.trie_1;
  };
  protoOf(Options).get_size_woubt6_k$ = function () {
    return this.byteStrings_1.length;
  };
  protoOf(Options).get_c1px32_k$ = function (index) {
    return this.byteStrings_1[index];
  };
  function _get_upstream__8b4500($this) {
    return $this.upstream_1;
  }
  function _get_buffer__tgqkad($this) {
    return $this.buffer_1;
  }
  function _set_expectedSegment__ufl0ui($this, _set____db54di) {
    $this.expectedSegment_1 = _set____db54di;
  }
  function _get_expectedSegment__uhstm2($this) {
    return $this.expectedSegment_1;
  }
  function _set_expectedPos__7eepj($this, _set____db54di) {
    $this.expectedPos_1 = _set____db54di;
  }
  function _get_expectedPos__u2zrmd($this) {
    return $this.expectedPos_1;
  }
  function _set_closed__kdb0et($this, _set____db54di) {
    $this.closed_1 = _set____db54di;
  }
  function _get_closed__iwkfs1($this) {
    return $this.closed_1;
  }
  function _set_pos__4wcab5($this, _set____db54di) {
    $this.pos_1 = _set____db54di;
  }
  function _get_pos__e6evgd($this) {
    return $this.pos_1;
  }
  function PeekSource(upstream) {
    this.upstream_1 = upstream;
    this.buffer_1 = this.upstream_1.get_buffer_bmaafd_k$();
    this.expectedSegment_1 = this.buffer_1.get_head_won7e1_k$();
    var tmp = this;
    var tmp0_safe_receiver = this.buffer_1.get_head_won7e1_k$();
    var tmp1_elvis_lhs = tmp0_safe_receiver == null ? null : tmp0_safe_receiver.get_pos_18iyad_k$();
    tmp.expectedPos_1 = tmp1_elvis_lhs == null ? -1 : tmp1_elvis_lhs;
    this.closed_1 = false;
    this.pos_1 = new Long(0, 0);
  }
  protoOf(PeekSource).read_a1wdbo_k$ = function (sink, byteCount) {
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.PeekSource.read.<anonymous>' call
      var message = 'byteCount < 0: ' + byteCount.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!this.closed_1) {
      // Inline function 'okio.PeekSource.read.<anonymous>' call
      var message_0 = 'closed';
      throw IllegalStateException_init_$Create$(toString(message_0));
    }
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(this.expectedSegment_1 == null
        ? true
        : this.expectedSegment_1 === this.buffer_1.get_head_won7e1_k$()
          ? this.expectedPos_1 === ensureNotNull(this.buffer_1.get_head_won7e1_k$()).get_pos_18iyad_k$()
          : false)
    ) {
      // Inline function 'okio.PeekSource.read.<anonymous>' call
      var message_1 = 'Peek source is invalid because upstream source was used';
      throw IllegalStateException_init_$Create$(toString(message_1));
    }
    if (byteCount.equals(new Long(0, 0))) return new Long(0, 0);
    // Inline function 'kotlin.Long.plus' call
    var tmp$ret$3 = this.pos_1.plus_r93sks_k$(toLong(1));
    if (!this.upstream_1.request_mpoy7z_k$(tmp$ret$3)) return new Long(-1, -1);
    if (this.expectedSegment_1 == null ? !(this.buffer_1.get_head_won7e1_k$() == null) : false) {
      this.expectedSegment_1 = this.buffer_1.get_head_won7e1_k$();
      this.expectedPos_1 = ensureNotNull(this.buffer_1.get_head_won7e1_k$()).get_pos_18iyad_k$();
    }
    // Inline function 'kotlin.comparisons.minOf' call
    var b = this.buffer_1.get_size_woubt6_k$().minus_mfbszm_k$(this.pos_1);
    var toCopy = byteCount.compareTo_9jj042_k$(b) <= 0 ? byteCount : b;
    this.buffer_1.copyTo_y7so4c_k$(sink, this.pos_1, toCopy);
    this.pos_1 = this.pos_1.plus_r93sks_k$(toCopy);
    return toCopy;
  };
  protoOf(PeekSource).timeout_lq9okf_k$ = function () {
    return this.upstream_1.timeout_lq9okf_k$();
  };
  protoOf(PeekSource).close_yn9xrc_k$ = function () {
    this.closed_1 = true;
  };
  function Segment_init_$Init$($this) {
    Segment.call($this);
    $this.data_1 = new Int8Array(8192);
    $this.owner_1 = true;
    $this.shared_1 = false;
    return $this;
  }
  function Segment_init_$Create$() {
    return Segment_init_$Init$(objectCreate(protoOf(Segment)));
  }
  function Segment_init_$Init$_0(data, pos, limit, shared, owner, $this) {
    Segment.call($this);
    $this.data_1 = data;
    $this.pos_1 = pos;
    $this.limit_1 = limit;
    $this.shared_1 = shared;
    $this.owner_1 = owner;
    return $this;
  }
  function Segment_init_$Create$_0(data, pos, limit, shared, owner) {
    return Segment_init_$Init$_0(data, pos, limit, shared, owner, objectCreate(protoOf(Segment)));
  }
  function Companion_0() {
    Companion_instance_0 = this;
    this.SIZE_1 = 8192;
    this.SHARE_MINIMUM_1 = 1024;
  }
  protoOf(Companion_0).get_SIZE_wo97pm_k$ = function () {
    return this.SIZE_1;
  };
  protoOf(Companion_0).get_SHARE_MINIMUM_wfrtqd_k$ = function () {
    return this.SHARE_MINIMUM_1;
  };
  var Companion_instance_0;
  function Companion_getInstance_1() {
    if (Companion_instance_0 == null) new Companion_0();
    return Companion_instance_0;
  }
  protoOf(Segment).get_data_wokkxf_k$ = function () {
    return this.data_1;
  };
  protoOf(Segment).set_pos_tfwdvz_k$ = function (_set____db54di) {
    this.pos_1 = _set____db54di;
  };
  protoOf(Segment).get_pos_18iyad_k$ = function () {
    return this.pos_1;
  };
  protoOf(Segment).set_limit_mo5fx2_k$ = function (_set____db54di) {
    this.limit_1 = _set____db54di;
  };
  protoOf(Segment).get_limit_iuokuq_k$ = function () {
    return this.limit_1;
  };
  protoOf(Segment).set_shared_67kjx_k$ = function (_set____db54di) {
    this.shared_1 = _set____db54di;
  };
  protoOf(Segment).get_shared_jgtlda_k$ = function () {
    return this.shared_1;
  };
  protoOf(Segment).set_owner_bh4mbj_k$ = function (_set____db54di) {
    this.owner_1 = _set____db54di;
  };
  protoOf(Segment).get_owner_iwkx3e_k$ = function () {
    return this.owner_1;
  };
  protoOf(Segment).set_next_tohs5l_k$ = function (_set____db54di) {
    this.next_1 = _set____db54di;
  };
  protoOf(Segment).get_next_wor1vg_k$ = function () {
    return this.next_1;
  };
  protoOf(Segment).set_prev_ur3dkn_k$ = function (_set____db54di) {
    this.prev_1 = _set____db54di;
  };
  protoOf(Segment).get_prev_wosl18_k$ = function () {
    return this.prev_1;
  };
  protoOf(Segment).sharedCopy_timhza_k$ = function () {
    this.shared_1 = true;
    return Segment_init_$Create$_0(this.data_1, this.pos_1, this.limit_1, true, false);
  };
  protoOf(Segment).unsharedCopy_5kj8b7_k$ = function () {
    // Inline function 'kotlin.collections.copyOf' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$1 = this.data_1.slice();
    return Segment_init_$Create$_0(tmp$ret$1, this.pos_1, this.limit_1, false, true);
  };
  protoOf(Segment).pop_2dsh_k$ = function () {
    var result = !(this.next_1 === this) ? this.next_1 : null;
    ensureNotNull(this.prev_1).next_1 = this.next_1;
    ensureNotNull(this.next_1).prev_1 = this.prev_1;
    this.next_1 = null;
    this.prev_1 = null;
    return result;
  };
  protoOf(Segment).push_wd62e0_k$ = function (segment) {
    segment.prev_1 = this;
    segment.next_1 = this.next_1;
    ensureNotNull(this.next_1).prev_1 = segment;
    this.next_1 = segment;
    return segment;
  };
  protoOf(Segment).split_cz4av2_k$ = function (byteCount) {
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(byteCount > 0 ? byteCount <= ((this.limit_1 - this.pos_1) | 0) : false)) {
      // Inline function 'okio.Segment.split.<anonymous>' call
      var message = 'byteCount out of range';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    var prefix;
    if (byteCount >= 1024) {
      prefix = this.sharedCopy_timhza_k$();
    } else {
      prefix = SegmentPool_getInstance().take_2451j_k$();
      // Inline function 'kotlin.collections.copyInto' call
      var this_0 = this.data_1;
      var destination = prefix.data_1;
      var startIndex = this.pos_1;
      var endIndex = (this.pos_1 + byteCount) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = this_0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, destination, 0, startIndex, endIndex);
    }
    prefix.limit_1 = (prefix.pos_1 + byteCount) | 0;
    this.pos_1 = (this.pos_1 + byteCount) | 0;
    ensureNotNull(this.prev_1).push_wd62e0_k$(prefix);
    return prefix;
  };
  protoOf(Segment).compact_dawvql_k$ = function () {
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!(this.prev_1 === this)) {
      // Inline function 'okio.Segment.compact.<anonymous>' call
      var message = 'cannot compact';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    if (!ensureNotNull(this.prev_1).owner_1) return Unit_getInstance();
    var byteCount = (this.limit_1 - this.pos_1) | 0;
    var availableByteCount =
      (((8192 - ensureNotNull(this.prev_1).limit_1) | 0) +
        (ensureNotNull(this.prev_1).shared_1 ? 0 : ensureNotNull(this.prev_1).pos_1)) |
      0;
    if (byteCount > availableByteCount) return Unit_getInstance();
    this.writeTo_yxwz0w_k$(ensureNotNull(this.prev_1), byteCount);
    this.pop_2dsh_k$();
    SegmentPool_getInstance().recycle_ipeoxr_k$(this);
  };
  protoOf(Segment).writeTo_yxwz0w_k$ = function (sink, byteCount) {
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!sink.owner_1) {
      // Inline function 'okio.Segment.writeTo.<anonymous>' call
      var message = 'only owner can write';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    if (((sink.limit_1 + byteCount) | 0) > 8192) {
      if (sink.shared_1) throw IllegalArgumentException_init_$Create$_0();
      if (((((sink.limit_1 + byteCount) | 0) - sink.pos_1) | 0) > 8192)
        throw IllegalArgumentException_init_$Create$_0();
      // Inline function 'kotlin.collections.copyInto' call
      var this_0 = sink.data_1;
      var destination = sink.data_1;
      var startIndex = sink.pos_1;
      var endIndex = sink.limit_1;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = this_0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, destination, 0, startIndex, endIndex);
      sink.limit_1 = (sink.limit_1 - sink.pos_1) | 0;
      sink.pos_1 = 0;
    }
    // Inline function 'kotlin.collections.copyInto' call
    var this_1 = this.data_1;
    var destination_0 = sink.data_1;
    var destinationOffset = sink.limit_1;
    var startIndex_0 = this.pos_1;
    var endIndex_0 = (this.pos_1 + byteCount) | 0;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_0 = this_1;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    arrayCopy(tmp_0, destination_0, destinationOffset, startIndex_0, endIndex_0);
    sink.limit_1 = (sink.limit_1 + byteCount) | 0;
    this.pos_1 = (this.pos_1 + byteCount) | 0;
  };
  function Segment() {
    Companion_getInstance_1();
    this.pos_1 = 0;
    this.limit_1 = 0;
    this.shared_1 = false;
    this.owner_1 = false;
    this.next_1 = null;
    this.prev_1 = null;
  }
  function Source() {}
  function Companion_1() {
    Companion_instance_1 = this;
  }
  protoOf(Companion_1).of_khs621_k$ = function (values, encode) {
    var list = toList(values);
    var tmp = Companion_getInstance_0();
    var tmp_0 = 0;
    var tmp_1 = list.get_size_woubt6_k$();
    // Inline function 'kotlin.arrayOfNulls' call
    var tmp_2 = fillArrayVal(Array(tmp_1), null);
    while (tmp_0 < tmp_1) {
      var tmp_3 = tmp_0;
      tmp_2[tmp_3] = encode(list.get_c1px32_k$(tmp_3));
      tmp_0 = (tmp_0 + 1) | 0;
    }
    var options = tmp.of_35g6b5_k$(tmp_2.slice());
    return new TypedOptions(list, options);
  };
  var Companion_instance_1;
  function Companion_getInstance_2() {
    if (Companion_instance_1 == null) new Companion_1();
    return Companion_instance_1;
  }
  function TypedOptions(list, options) {
    Companion_getInstance_2();
    AbstractList.call(this);
    this.options_1 = options;
    this.list_1 = toList(list);
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(this.list_1.get_size_woubt6_k$() === this.options_1.get_size_woubt6_k$())) {
      // Inline function 'kotlin.require.<anonymous>' call
      var message = 'Failed requirement.';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
  }
  protoOf(TypedOptions).get_options_jecmyz_k$ = function () {
    return this.options_1;
  };
  protoOf(TypedOptions).get_list_wopuqv_k$ = function () {
    return this.list_1;
  };
  protoOf(TypedOptions).get_size_woubt6_k$ = function () {
    return this.list_1.get_size_woubt6_k$();
  };
  protoOf(TypedOptions).get_c1px32_k$ = function (index) {
    return this.list_1.get_c1px32_k$(index);
  };
  function processUtf8CodePoints(_this__u8e3s4, beginIndex, endIndex, yield_0) {
    var index = beginIndex;
    while (index < endIndex) {
      var b0 = _this__u8e3s4[index];
      if (b0 >= 0) {
        yield_0(b0);
        index = (index + 1) | 0;
        while (index < endIndex ? _this__u8e3s4[index] >= 0 : false) {
          var tmp1 = index;
          index = (tmp1 + 1) | 0;
          yield_0(_this__u8e3s4[tmp1]);
        }
      } else {
        // Inline function 'okio.shr' call
        if (b0 >> 5 === -2) {
          var tmp = index;
          var tmp$ret$1;
          $l$block_0: {
            // Inline function 'okio.process2Utf8Bytes' call
            var beginIndex_0 = index;
            if (endIndex <= ((beginIndex_0 + 1) | 0)) {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              yield_0(65533);
              tmp$ret$1 = 1;
              break $l$block_0;
            }
            var b0_0 = _this__u8e3s4[beginIndex_0];
            var b1 = _this__u8e3s4[(beginIndex_0 + 1) | 0];
            // Inline function 'okio.isUtf8Continuation' call
            // Inline function 'okio.and' call
            if (!((b1 & 192) === 128)) {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              yield_0(65533);
              tmp$ret$1 = 1;
              break $l$block_0;
            }
            var codePoint = 3968 ^ b1 ^ (b0_0 << 6);
            if (codePoint < 128) {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              yield_0(65533);
            } else {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              yield_0(codePoint);
            }
            tmp$ret$1 = 2;
          }
          index = (tmp + tmp$ret$1) | 0;
        } else {
          // Inline function 'okio.shr' call
          if (b0 >> 4 === -2) {
            var tmp_0 = index;
            var tmp$ret$7;
            $l$block_4: {
              // Inline function 'okio.process3Utf8Bytes' call
              var beginIndex_1 = index;
              if (endIndex <= ((beginIndex_1 + 2) | 0)) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                yield_0(65533);
                var tmp_1;
                if (endIndex <= ((beginIndex_1 + 1) | 0)) {
                  tmp_1 = true;
                } else {
                  // Inline function 'okio.isUtf8Continuation' call
                  // Inline function 'okio.and' call
                  tmp_1 = !((_this__u8e3s4[(beginIndex_1 + 1) | 0] & 192) === 128);
                }
                if (tmp_1) {
                  tmp$ret$7 = 1;
                  break $l$block_4;
                } else {
                  tmp$ret$7 = 2;
                  break $l$block_4;
                }
              }
              var b0_1 = _this__u8e3s4[beginIndex_1];
              var b1_0 = _this__u8e3s4[(beginIndex_1 + 1) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b1_0 & 192) === 128)) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                yield_0(65533);
                tmp$ret$7 = 1;
                break $l$block_4;
              }
              var b2 = _this__u8e3s4[(beginIndex_1 + 2) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b2 & 192) === 128)) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                yield_0(65533);
                tmp$ret$7 = 2;
                break $l$block_4;
              }
              var codePoint_0 = -123008 ^ b2 ^ (b1_0 << 6) ^ (b0_1 << 12);
              if (codePoint_0 < 2048) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                yield_0(65533);
              } else if (55296 <= codePoint_0 ? codePoint_0 <= 57343 : false) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                yield_0(65533);
              } else {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                yield_0(codePoint_0);
              }
              tmp$ret$7 = 3;
            }
            index = (tmp_0 + tmp$ret$7) | 0;
          } else {
            // Inline function 'okio.shr' call
            if (b0 >> 3 === -2) {
              var tmp_2 = index;
              var tmp$ret$15;
              $l$block_10: {
                // Inline function 'okio.process4Utf8Bytes' call
                var beginIndex_2 = index;
                if (endIndex <= ((beginIndex_2 + 3) | 0)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(65533);
                  var tmp_3;
                  if (endIndex <= ((beginIndex_2 + 1) | 0)) {
                    tmp_3 = true;
                  } else {
                    // Inline function 'okio.isUtf8Continuation' call
                    // Inline function 'okio.and' call
                    tmp_3 = !((_this__u8e3s4[(beginIndex_2 + 1) | 0] & 192) === 128);
                  }
                  if (tmp_3) {
                    tmp$ret$15 = 1;
                    break $l$block_10;
                  } else {
                    var tmp_4;
                    if (endIndex <= ((beginIndex_2 + 2) | 0)) {
                      tmp_4 = true;
                    } else {
                      // Inline function 'okio.isUtf8Continuation' call
                      // Inline function 'okio.and' call
                      tmp_4 = !((_this__u8e3s4[(beginIndex_2 + 2) | 0] & 192) === 128);
                    }
                    if (tmp_4) {
                      tmp$ret$15 = 2;
                      break $l$block_10;
                    } else {
                      tmp$ret$15 = 3;
                      break $l$block_10;
                    }
                  }
                }
                var b0_2 = _this__u8e3s4[beginIndex_2];
                var b1_1 = _this__u8e3s4[(beginIndex_2 + 1) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b1_1 & 192) === 128)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(65533);
                  tmp$ret$15 = 1;
                  break $l$block_10;
                }
                var b2_0 = _this__u8e3s4[(beginIndex_2 + 2) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b2_0 & 192) === 128)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(65533);
                  tmp$ret$15 = 2;
                  break $l$block_10;
                }
                var b3 = _this__u8e3s4[(beginIndex_2 + 3) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b3 & 192) === 128)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(65533);
                  tmp$ret$15 = 3;
                  break $l$block_10;
                }
                var codePoint_1 = 3678080 ^ b3 ^ (b2_0 << 6) ^ (b1_1 << 12) ^ (b0_2 << 18);
                if (codePoint_1 > 1114111) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(65533);
                } else if (55296 <= codePoint_1 ? codePoint_1 <= 57343 : false) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(65533);
                } else if (codePoint_1 < 65536) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(65533);
                } else {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  yield_0(codePoint_1);
                }
                tmp$ret$15 = 4;
              }
              index = (tmp_2 + tmp$ret$15) | 0;
            } else {
              yield_0(65533);
              index = (index + 1) | 0;
            }
          }
        }
      }
    }
  }
  function isIsoControl(codePoint) {
    return (0 <= codePoint ? codePoint <= 31 : false) ? true : 127 <= codePoint ? codePoint <= 159 : false;
  }
  function get_REPLACEMENT_CODE_POINT() {
    return REPLACEMENT_CODE_POINT;
  }
  var REPLACEMENT_CODE_POINT;
  function processUtf8Bytes(_this__u8e3s4, beginIndex, endIndex, yield_0) {
    var index = beginIndex;
    while (index < endIndex) {
      var c = charSequenceGet(_this__u8e3s4, index);
      if (Char__compareTo_impl_ypi4mb(c, _Char___init__impl__6a9atx(128)) < 0) {
        // Inline function 'kotlin.code' call
        var tmp$ret$0 = Char__toInt_impl_vasixd(c);
        yield_0(toByte(tmp$ret$0));
        index = (index + 1) | 0;
        while (
          index < endIndex
            ? Char__compareTo_impl_ypi4mb(charSequenceGet(_this__u8e3s4, index), _Char___init__impl__6a9atx(128)) < 0
            : false
        ) {
          // Inline function 'kotlin.code' call
          var tmp1 = index;
          index = (tmp1 + 1) | 0;
          var this_0 = charSequenceGet(_this__u8e3s4, tmp1);
          var tmp$ret$1 = Char__toInt_impl_vasixd(this_0);
          yield_0(toByte(tmp$ret$1));
        }
      } else if (Char__compareTo_impl_ypi4mb(c, _Char___init__impl__6a9atx(2048)) < 0) {
        // Inline function 'kotlin.code' call
        var tmp$ret$2 = Char__toInt_impl_vasixd(c);
        yield_0(toByte((tmp$ret$2 >> 6) | 192));
        // Inline function 'kotlin.code' call
        var tmp$ret$3 = Char__toInt_impl_vasixd(c);
        yield_0(toByte((tmp$ret$3 & 63) | 128));
        index = (index + 1) | 0;
      } else if (!(_Char___init__impl__6a9atx(55296) <= c ? c <= _Char___init__impl__6a9atx(57343) : false)) {
        // Inline function 'kotlin.code' call
        var tmp$ret$4 = Char__toInt_impl_vasixd(c);
        yield_0(toByte((tmp$ret$4 >> 12) | 224));
        // Inline function 'kotlin.code' call
        var tmp$ret$5 = Char__toInt_impl_vasixd(c);
        yield_0(toByte(((tmp$ret$5 >> 6) & 63) | 128));
        // Inline function 'kotlin.code' call
        var tmp$ret$6 = Char__toInt_impl_vasixd(c);
        yield_0(toByte((tmp$ret$6 & 63) | 128));
        index = (index + 1) | 0;
      } else {
        var tmp;
        if (
          Char__compareTo_impl_ypi4mb(c, _Char___init__impl__6a9atx(56319)) > 0 ? true : endIndex <= ((index + 1) | 0)
        ) {
          tmp = true;
        } else {
          var containsArg = charSequenceGet(_this__u8e3s4, (index + 1) | 0);
          tmp = !(_Char___init__impl__6a9atx(56320) <= containsArg
            ? containsArg <= _Char___init__impl__6a9atx(57343)
            : false);
        }
        if (tmp) {
          yield_0(63);
          index = (index + 1) | 0;
        } else {
          // Inline function 'kotlin.code' call
          var tmp_0 = Char__toInt_impl_vasixd(c) << 10;
          // Inline function 'kotlin.code' call
          var this_1 = charSequenceGet(_this__u8e3s4, (index + 1) | 0);
          var codePoint = (((tmp_0 + Char__toInt_impl_vasixd(this_1)) | 0) + -56613888) | 0;
          yield_0(toByte((codePoint >> 18) | 240));
          yield_0(toByte(((codePoint >> 12) & 63) | 128));
          yield_0(toByte(((codePoint >> 6) & 63) | 128));
          yield_0(toByte((codePoint & 63) | 128));
          index = (index + 2) | 0;
        }
      }
    }
  }
  function processUtf16Chars(_this__u8e3s4, beginIndex, endIndex, yield_0) {
    var index = beginIndex;
    while (index < endIndex) {
      var b0 = _this__u8e3s4[index];
      if (b0 >= 0) {
        yield_0(new Char(numberToChar(b0)));
        index = (index + 1) | 0;
        while (index < endIndex ? _this__u8e3s4[index] >= 0 : false) {
          var tmp1 = index;
          index = (tmp1 + 1) | 0;
          yield_0(new Char(numberToChar(_this__u8e3s4[tmp1])));
        }
      } else {
        // Inline function 'okio.shr' call
        if (b0 >> 5 === -2) {
          var tmp = index;
          var tmp$ret$1;
          $l$block_0: {
            // Inline function 'okio.process2Utf8Bytes' call
            var beginIndex_0 = index;
            if (endIndex <= ((beginIndex_0 + 1) | 0)) {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              yield_0(new Char(numberToChar(65533)));
              tmp$ret$1 = 1;
              break $l$block_0;
            }
            var b0_0 = _this__u8e3s4[beginIndex_0];
            var b1 = _this__u8e3s4[(beginIndex_0 + 1) | 0];
            // Inline function 'okio.isUtf8Continuation' call
            // Inline function 'okio.and' call
            if (!((b1 & 192) === 128)) {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              yield_0(new Char(numberToChar(65533)));
              tmp$ret$1 = 1;
              break $l$block_0;
            }
            var codePoint = 3968 ^ b1 ^ (b0_0 << 6);
            if (codePoint < 128) {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              yield_0(new Char(numberToChar(65533)));
            } else {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              yield_0(new Char(numberToChar(codePoint)));
            }
            tmp$ret$1 = 2;
          }
          index = (tmp + tmp$ret$1) | 0;
        } else {
          // Inline function 'okio.shr' call
          if (b0 >> 4 === -2) {
            var tmp_0 = index;
            var tmp$ret$7;
            $l$block_4: {
              // Inline function 'okio.process3Utf8Bytes' call
              var beginIndex_1 = index;
              if (endIndex <= ((beginIndex_1 + 2) | 0)) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                yield_0(new Char(numberToChar(65533)));
                var tmp_1;
                if (endIndex <= ((beginIndex_1 + 1) | 0)) {
                  tmp_1 = true;
                } else {
                  // Inline function 'okio.isUtf8Continuation' call
                  // Inline function 'okio.and' call
                  tmp_1 = !((_this__u8e3s4[(beginIndex_1 + 1) | 0] & 192) === 128);
                }
                if (tmp_1) {
                  tmp$ret$7 = 1;
                  break $l$block_4;
                } else {
                  tmp$ret$7 = 2;
                  break $l$block_4;
                }
              }
              var b0_1 = _this__u8e3s4[beginIndex_1];
              var b1_0 = _this__u8e3s4[(beginIndex_1 + 1) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b1_0 & 192) === 128)) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                yield_0(new Char(numberToChar(65533)));
                tmp$ret$7 = 1;
                break $l$block_4;
              }
              var b2 = _this__u8e3s4[(beginIndex_1 + 2) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b2 & 192) === 128)) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                yield_0(new Char(numberToChar(65533)));
                tmp$ret$7 = 2;
                break $l$block_4;
              }
              var codePoint_0 = -123008 ^ b2 ^ (b1_0 << 6) ^ (b0_1 << 12);
              if (codePoint_0 < 2048) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                yield_0(new Char(numberToChar(65533)));
              } else if (55296 <= codePoint_0 ? codePoint_0 <= 57343 : false) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                yield_0(new Char(numberToChar(65533)));
              } else {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                yield_0(new Char(numberToChar(codePoint_0)));
              }
              tmp$ret$7 = 3;
            }
            index = (tmp_0 + tmp$ret$7) | 0;
          } else {
            // Inline function 'okio.shr' call
            if (b0 >> 3 === -2) {
              var tmp_2 = index;
              var tmp$ret$15;
              $l$block_10: {
                // Inline function 'okio.process4Utf8Bytes' call
                var beginIndex_2 = index;
                if (endIndex <= ((beginIndex_2 + 3) | 0)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(65533 === 65533)) {
                    yield_0(new Char(numberToChar((((65533 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((65533 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                  var tmp_3;
                  if (endIndex <= ((beginIndex_2 + 1) | 0)) {
                    tmp_3 = true;
                  } else {
                    // Inline function 'okio.isUtf8Continuation' call
                    // Inline function 'okio.and' call
                    tmp_3 = !((_this__u8e3s4[(beginIndex_2 + 1) | 0] & 192) === 128);
                  }
                  if (tmp_3) {
                    tmp$ret$15 = 1;
                    break $l$block_10;
                  } else {
                    var tmp_4;
                    if (endIndex <= ((beginIndex_2 + 2) | 0)) {
                      tmp_4 = true;
                    } else {
                      // Inline function 'okio.isUtf8Continuation' call
                      // Inline function 'okio.and' call
                      tmp_4 = !((_this__u8e3s4[(beginIndex_2 + 2) | 0] & 192) === 128);
                    }
                    if (tmp_4) {
                      tmp$ret$15 = 2;
                      break $l$block_10;
                    } else {
                      tmp$ret$15 = 3;
                      break $l$block_10;
                    }
                  }
                }
                var b0_2 = _this__u8e3s4[beginIndex_2];
                var b1_1 = _this__u8e3s4[(beginIndex_2 + 1) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b1_1 & 192) === 128)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(65533 === 65533)) {
                    yield_0(new Char(numberToChar((((65533 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((65533 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                  tmp$ret$15 = 1;
                  break $l$block_10;
                }
                var b2_0 = _this__u8e3s4[(beginIndex_2 + 2) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b2_0 & 192) === 128)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(65533 === 65533)) {
                    yield_0(new Char(numberToChar((((65533 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((65533 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                  tmp$ret$15 = 2;
                  break $l$block_10;
                }
                var b3 = _this__u8e3s4[(beginIndex_2 + 3) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b3 & 192) === 128)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(65533 === 65533)) {
                    yield_0(new Char(numberToChar((((65533 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((65533 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                  tmp$ret$15 = 3;
                  break $l$block_10;
                }
                var codePoint_1 = 3678080 ^ b3 ^ (b2_0 << 6) ^ (b1_1 << 12) ^ (b0_2 << 18);
                if (codePoint_1 > 1114111) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(65533 === 65533)) {
                    yield_0(new Char(numberToChar((((65533 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((65533 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                } else if (55296 <= codePoint_1 ? codePoint_1 <= 57343 : false) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(65533 === 65533)) {
                    yield_0(new Char(numberToChar((((65533 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((65533 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                } else if (codePoint_1 < 65536) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(65533 === 65533)) {
                    yield_0(new Char(numberToChar((((65533 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((65533 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                } else {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(codePoint_1 === 65533)) {
                    yield_0(new Char(numberToChar((((codePoint_1 >>> 10) | 0) + 55232) | 0)));
                    yield_0(new Char(numberToChar(((codePoint_1 & 1023) + 56320) | 0)));
                  } else {
                    yield_0(new Char(_Char___init__impl__6a9atx(65533)));
                  }
                }
                tmp$ret$15 = 4;
              }
              index = (tmp_2 + tmp$ret$15) | 0;
            } else {
              yield_0(new Char(_Char___init__impl__6a9atx(65533)));
              index = (index + 1) | 0;
            }
          }
        }
      }
    }
  }
  function process2Utf8Bytes(_this__u8e3s4, beginIndex, endIndex, yield_0) {
    if (endIndex <= ((beginIndex + 1) | 0)) {
      yield_0(65533);
      return 1;
    }
    var b0 = _this__u8e3s4[beginIndex];
    var b1 = _this__u8e3s4[(beginIndex + 1) | 0];
    // Inline function 'okio.isUtf8Continuation' call
    // Inline function 'okio.and' call
    if (!((b1 & 192) === 128)) {
      yield_0(65533);
      return 1;
    }
    var codePoint = 3968 ^ b1 ^ (b0 << 6);
    if (codePoint < 128) {
      yield_0(65533);
    } else {
      yield_0(codePoint);
    }
    return 2;
  }
  function process3Utf8Bytes(_this__u8e3s4, beginIndex, endIndex, yield_0) {
    if (endIndex <= ((beginIndex + 2) | 0)) {
      yield_0(65533);
      var tmp;
      if (endIndex <= ((beginIndex + 1) | 0)) {
        tmp = true;
      } else {
        // Inline function 'okio.isUtf8Continuation' call
        // Inline function 'okio.and' call
        tmp = !((_this__u8e3s4[(beginIndex + 1) | 0] & 192) === 128);
      }
      if (tmp) {
        return 1;
      } else {
        return 2;
      }
    }
    var b0 = _this__u8e3s4[beginIndex];
    var b1 = _this__u8e3s4[(beginIndex + 1) | 0];
    // Inline function 'okio.isUtf8Continuation' call
    // Inline function 'okio.and' call
    if (!((b1 & 192) === 128)) {
      yield_0(65533);
      return 1;
    }
    var b2 = _this__u8e3s4[(beginIndex + 2) | 0];
    // Inline function 'okio.isUtf8Continuation' call
    // Inline function 'okio.and' call
    if (!((b2 & 192) === 128)) {
      yield_0(65533);
      return 2;
    }
    var codePoint = -123008 ^ b2 ^ (b1 << 6) ^ (b0 << 12);
    if (codePoint < 2048) {
      yield_0(65533);
    } else if (55296 <= codePoint ? codePoint <= 57343 : false) {
      yield_0(65533);
    } else {
      yield_0(codePoint);
    }
    return 3;
  }
  function process4Utf8Bytes(_this__u8e3s4, beginIndex, endIndex, yield_0) {
    if (endIndex <= ((beginIndex + 3) | 0)) {
      yield_0(65533);
      var tmp;
      if (endIndex <= ((beginIndex + 1) | 0)) {
        tmp = true;
      } else {
        // Inline function 'okio.isUtf8Continuation' call
        // Inline function 'okio.and' call
        tmp = !((_this__u8e3s4[(beginIndex + 1) | 0] & 192) === 128);
      }
      if (tmp) {
        return 1;
      } else {
        var tmp_0;
        if (endIndex <= ((beginIndex + 2) | 0)) {
          tmp_0 = true;
        } else {
          // Inline function 'okio.isUtf8Continuation' call
          // Inline function 'okio.and' call
          tmp_0 = !((_this__u8e3s4[(beginIndex + 2) | 0] & 192) === 128);
        }
        if (tmp_0) {
          return 2;
        } else {
          return 3;
        }
      }
    }
    var b0 = _this__u8e3s4[beginIndex];
    var b1 = _this__u8e3s4[(beginIndex + 1) | 0];
    // Inline function 'okio.isUtf8Continuation' call
    // Inline function 'okio.and' call
    if (!((b1 & 192) === 128)) {
      yield_0(65533);
      return 1;
    }
    var b2 = _this__u8e3s4[(beginIndex + 2) | 0];
    // Inline function 'okio.isUtf8Continuation' call
    // Inline function 'okio.and' call
    if (!((b2 & 192) === 128)) {
      yield_0(65533);
      return 2;
    }
    var b3 = _this__u8e3s4[(beginIndex + 3) | 0];
    // Inline function 'okio.isUtf8Continuation' call
    // Inline function 'okio.and' call
    if (!((b3 & 192) === 128)) {
      yield_0(65533);
      return 3;
    }
    var codePoint = 3678080 ^ b3 ^ (b2 << 6) ^ (b1 << 12) ^ (b0 << 18);
    if (codePoint > 1114111) {
      yield_0(65533);
    } else if (55296 <= codePoint ? codePoint <= 57343 : false) {
      yield_0(65533);
    } else if (codePoint < 65536) {
      yield_0(65533);
    } else {
      yield_0(codePoint);
    }
    return 4;
  }
  function get_REPLACEMENT_BYTE() {
    return REPLACEMENT_BYTE;
  }
  var REPLACEMENT_BYTE;
  function get_HIGH_SURROGATE_HEADER() {
    return HIGH_SURROGATE_HEADER;
  }
  var HIGH_SURROGATE_HEADER;
  function get_LOG_SURROGATE_HEADER() {
    return LOG_SURROGATE_HEADER;
  }
  var LOG_SURROGATE_HEADER;
  function get_REPLACEMENT_CHARACTER() {
    return REPLACEMENT_CHARACTER;
  }
  var REPLACEMENT_CHARACTER;
  function isUtf8Continuation(byte) {
    // Inline function 'okio.and' call
    return (byte & 192) === 128;
  }
  function get_MASK_2BYTES() {
    return MASK_2BYTES;
  }
  var MASK_2BYTES;
  function get_MASK_3BYTES() {
    return MASK_3BYTES;
  }
  var MASK_3BYTES;
  function get_MASK_4BYTES() {
    return MASK_4BYTES;
  }
  var MASK_4BYTES;
  function get_DEFAULT__new_UnsafeCursor() {
    _init_properties_Util_kt__laey5a();
    return DEFAULT__new_UnsafeCursor;
  }
  var DEFAULT__new_UnsafeCursor;
  function get_DEFAULT__ByteString_size() {
    _init_properties_Util_kt__laey5a();
    return DEFAULT__ByteString_size;
  }
  var DEFAULT__ByteString_size;
  function reverseBytes(_this__u8e3s4) {
    _init_properties_Util_kt__laey5a();
    var i = _this__u8e3s4 & 65535;
    var reversed = ((i & 65280) >>> 8) | 0 | ((i & 255) << 8);
    return toShort(reversed);
  }
  function reverseBytes_0(_this__u8e3s4) {
    _init_properties_Util_kt__laey5a();
    return (
      ((_this__u8e3s4 & -16777216) >>> 24) |
      0 |
      (((_this__u8e3s4 & 16711680) >>> 8) | 0) |
      ((_this__u8e3s4 & 65280) << 8) |
      ((_this__u8e3s4 & 255) << 24)
    );
  }
  function reverseBytes_1(_this__u8e3s4) {
    _init_properties_Util_kt__laey5a();
    return _this__u8e3s4
      .and_4spn93_k$(new Long(0, -16777216))
      .ushr_z7nmq8_k$(56)
      .or_v7fvkl_k$(_this__u8e3s4.and_4spn93_k$(new Long(0, 16711680)).ushr_z7nmq8_k$(40))
      .or_v7fvkl_k$(_this__u8e3s4.and_4spn93_k$(new Long(0, 65280)).ushr_z7nmq8_k$(24))
      .or_v7fvkl_k$(_this__u8e3s4.and_4spn93_k$(new Long(0, 255)).ushr_z7nmq8_k$(8))
      .or_v7fvkl_k$(_this__u8e3s4.and_4spn93_k$(new Long(-16777216, 0)).shl_bg8if3_k$(8))
      .or_v7fvkl_k$(_this__u8e3s4.and_4spn93_k$(new Long(16711680, 0)).shl_bg8if3_k$(24))
      .or_v7fvkl_k$(_this__u8e3s4.and_4spn93_k$(new Long(65280, 0)).shl_bg8if3_k$(40))
      .or_v7fvkl_k$(_this__u8e3s4.and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(56));
  }
  function shr(_this__u8e3s4, other) {
    _init_properties_Util_kt__laey5a();
    return _this__u8e3s4 >> other;
  }
  function and(_this__u8e3s4, other) {
    _init_properties_Util_kt__laey5a();
    return _this__u8e3s4 & other;
  }
  function resolveDefaultParameter(_this__u8e3s4, position) {
    _init_properties_Util_kt__laey5a();
    if (position === get_DEFAULT__ByteString_size()) return _this__u8e3s4.get_size_woubt6_k$();
    return position;
  }
  function arrayRangeEquals(a, aOffset, b, bOffset, byteCount) {
    _init_properties_Util_kt__laey5a();
    var inductionVariable = 0;
    if (inductionVariable < byteCount)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        if (!(a[(i + aOffset) | 0] === b[(i + bOffset) | 0])) return false;
      } while (inductionVariable < byteCount);
    return true;
  }
  function resolveDefaultParameter_0(_this__u8e3s4, sizeParam) {
    _init_properties_Util_kt__laey5a();
    if (sizeParam === get_DEFAULT__ByteString_size()) return _this__u8e3s4.length;
    return sizeParam;
  }
  function checkOffsetAndCount(size, offset, byteCount) {
    _init_properties_Util_kt__laey5a();
    if (
      (
        offset.or_v7fvkl_k$(byteCount).compareTo_9jj042_k$(new Long(0, 0)) < 0
          ? true
          : offset.compareTo_9jj042_k$(size) > 0
      )
        ? true
        : size.minus_mfbszm_k$(offset).compareTo_9jj042_k$(byteCount) < 0
    ) {
      throw new ArrayIndexOutOfBoundsException(
        'size=' + size.toString() + ' offset=' + offset.toString() + ' byteCount=' + byteCount.toString(),
      );
    }
  }
  function leftRotate(_this__u8e3s4, bitCount) {
    _init_properties_Util_kt__laey5a();
    return (_this__u8e3s4 << bitCount) | ((_this__u8e3s4 >>> ((32 - bitCount) | 0)) | 0);
  }
  function rightRotate(_this__u8e3s4, bitCount) {
    _init_properties_Util_kt__laey5a();
    return _this__u8e3s4.ushr_z7nmq8_k$(bitCount).or_v7fvkl_k$(_this__u8e3s4.shl_bg8if3_k$((64 - bitCount) | 0));
  }
  function xor(_this__u8e3s4, other) {
    _init_properties_Util_kt__laey5a();
    return toByte(_this__u8e3s4 ^ other);
  }
  function and_0(_this__u8e3s4, other) {
    _init_properties_Util_kt__laey5a();
    return toLong(_this__u8e3s4).and_4spn93_k$(other);
  }
  function and_1(_this__u8e3s4, other) {
    _init_properties_Util_kt__laey5a();
    return toLong(_this__u8e3s4).and_4spn93_k$(other);
  }
  function toHexString(_this__u8e3s4) {
    _init_properties_Util_kt__laey5a();
    var result = charArray(2);
    var tmp = get_HEX_DIGIT_CHARS();
    // Inline function 'okio.shr' call
    result[0] = tmp[(_this__u8e3s4 >> 4) & 15];
    var tmp_0 = get_HEX_DIGIT_CHARS();
    // Inline function 'okio.and' call
    result[1] = tmp_0[_this__u8e3s4 & 15];
    return concatToString(result);
  }
  function minOf(a, b) {
    _init_properties_Util_kt__laey5a();
    // Inline function 'kotlin.comparisons.minOf' call
    var a_0 = toLong(a);
    return a_0.compareTo_9jj042_k$(b) <= 0 ? a_0 : b;
  }
  function minOf_0(a, b) {
    _init_properties_Util_kt__laey5a();
    // Inline function 'kotlin.comparisons.minOf' call
    var b_0 = toLong(b);
    return a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0;
  }
  function toHexString_0(_this__u8e3s4) {
    _init_properties_Util_kt__laey5a();
    if (_this__u8e3s4 === 0) return '0';
    var result = charArray(8);
    result[0] = get_HEX_DIGIT_CHARS()[(_this__u8e3s4 >> 28) & 15];
    result[1] = get_HEX_DIGIT_CHARS()[(_this__u8e3s4 >> 24) & 15];
    result[2] = get_HEX_DIGIT_CHARS()[(_this__u8e3s4 >> 20) & 15];
    result[3] = get_HEX_DIGIT_CHARS()[(_this__u8e3s4 >> 16) & 15];
    result[4] = get_HEX_DIGIT_CHARS()[(_this__u8e3s4 >> 12) & 15];
    result[5] = get_HEX_DIGIT_CHARS()[(_this__u8e3s4 >> 8) & 15];
    result[6] = get_HEX_DIGIT_CHARS()[(_this__u8e3s4 >> 4) & 15];
    result[7] = get_HEX_DIGIT_CHARS()[_this__u8e3s4 & 15];
    var i = 0;
    $l$loop: while (i < result.length && result[i] === _Char___init__impl__6a9atx(48)) {
      i = (i + 1) | 0;
    }
    return concatToString_0(result, i, result.length);
  }
  function resolveDefaultParameter_1(unsafeCursor) {
    _init_properties_Util_kt__laey5a();
    if (unsafeCursor === get_DEFAULT__new_UnsafeCursor()) return new UnsafeCursor();
    return unsafeCursor;
  }
  var properties_initialized_Util_kt_13atj0;
  function _init_properties_Util_kt__laey5a() {
    if (!properties_initialized_Util_kt_13atj0) {
      properties_initialized_Util_kt_13atj0 = true;
      DEFAULT__new_UnsafeCursor = new UnsafeCursor();
      DEFAULT__ByteString_size = -1234567890;
    }
  }
  function commonAsUtf8ToByteArray(_this__u8e3s4) {
    var bytes = new Int8Array(imul(4, _this__u8e3s4.length));
    var inductionVariable = 0;
    var last = _this__u8e3s4.length;
    if (inductionVariable < last)
      do {
        var index = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var b0 = charSequenceGet(_this__u8e3s4, index);
        if (Char__compareTo_impl_ypi4mb(b0, _Char___init__impl__6a9atx(128)) >= 0) {
          var size = index;
          // Inline function 'okio.processUtf8Bytes' call
          var endIndex = _this__u8e3s4.length;
          var index_0 = index;
          while (index_0 < endIndex) {
            var c = charSequenceGet(_this__u8e3s4, index_0);
            if (Char__compareTo_impl_ypi4mb(c, _Char___init__impl__6a9atx(128)) < 0) {
              // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
              // Inline function 'kotlin.code' call
              var tmp$ret$0 = Char__toInt_impl_vasixd(c);
              var tmp0 = size;
              size = (tmp0 + 1) | 0;
              bytes[tmp0] = toByte(tmp$ret$0);
              index_0 = (index_0 + 1) | 0;
              while (
                index_0 < endIndex
                  ? Char__compareTo_impl_ypi4mb(
                      charSequenceGet(_this__u8e3s4, index_0),
                      _Char___init__impl__6a9atx(128),
                    ) < 0
                  : false
              ) {
                // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
                // Inline function 'kotlin.code' call
                var tmp1 = index_0;
                index_0 = (tmp1 + 1) | 0;
                var this_0 = charSequenceGet(_this__u8e3s4, tmp1);
                var tmp$ret$1 = Char__toInt_impl_vasixd(this_0);
                var tmp0_0 = size;
                size = (tmp0_0 + 1) | 0;
                bytes[tmp0_0] = toByte(tmp$ret$1);
              }
            } else if (Char__compareTo_impl_ypi4mb(c, _Char___init__impl__6a9atx(2048)) < 0) {
              // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
              // Inline function 'kotlin.code' call
              var tmp$ret$2 = Char__toInt_impl_vasixd(c);
              var tmp0_1 = size;
              size = (tmp0_1 + 1) | 0;
              bytes[tmp0_1] = toByte((tmp$ret$2 >> 6) | 192);
              // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
              // Inline function 'kotlin.code' call
              var tmp$ret$3 = Char__toInt_impl_vasixd(c);
              var tmp0_2 = size;
              size = (tmp0_2 + 1) | 0;
              bytes[tmp0_2] = toByte((tmp$ret$3 & 63) | 128);
              index_0 = (index_0 + 1) | 0;
            } else if (!(_Char___init__impl__6a9atx(55296) <= c ? c <= _Char___init__impl__6a9atx(57343) : false)) {
              // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
              // Inline function 'kotlin.code' call
              var tmp$ret$4 = Char__toInt_impl_vasixd(c);
              var tmp0_3 = size;
              size = (tmp0_3 + 1) | 0;
              bytes[tmp0_3] = toByte((tmp$ret$4 >> 12) | 224);
              // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
              // Inline function 'kotlin.code' call
              var tmp$ret$5 = Char__toInt_impl_vasixd(c);
              var tmp0_4 = size;
              size = (tmp0_4 + 1) | 0;
              bytes[tmp0_4] = toByte(((tmp$ret$5 >> 6) & 63) | 128);
              // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
              // Inline function 'kotlin.code' call
              var tmp$ret$6 = Char__toInt_impl_vasixd(c);
              var tmp0_5 = size;
              size = (tmp0_5 + 1) | 0;
              bytes[tmp0_5] = toByte((tmp$ret$6 & 63) | 128);
              index_0 = (index_0 + 1) | 0;
            } else {
              var tmp;
              if (
                Char__compareTo_impl_ypi4mb(c, _Char___init__impl__6a9atx(56319)) > 0
                  ? true
                  : endIndex <= ((index_0 + 1) | 0)
              ) {
                tmp = true;
              } else {
                var containsArg = charSequenceGet(_this__u8e3s4, (index_0 + 1) | 0);
                tmp = !(_Char___init__impl__6a9atx(56320) <= containsArg
                  ? containsArg <= _Char___init__impl__6a9atx(57343)
                  : false);
              }
              if (tmp) {
                // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
                var tmp0_6 = size;
                size = (tmp0_6 + 1) | 0;
                bytes[tmp0_6] = get_REPLACEMENT_BYTE();
                index_0 = (index_0 + 1) | 0;
              } else {
                // Inline function 'kotlin.code' call
                var tmp_0 = Char__toInt_impl_vasixd(c) << 10;
                // Inline function 'kotlin.code' call
                var this_1 = charSequenceGet(_this__u8e3s4, (index_0 + 1) | 0);
                var codePoint = (((tmp_0 + Char__toInt_impl_vasixd(this_1)) | 0) + -56613888) | 0;
                // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
                var tmp0_7 = size;
                size = (tmp0_7 + 1) | 0;
                bytes[tmp0_7] = toByte((codePoint >> 18) | 240);
                // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
                var tmp0_8 = size;
                size = (tmp0_8 + 1) | 0;
                bytes[tmp0_8] = toByte(((codePoint >> 12) & 63) | 128);
                // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
                var tmp0_9 = size;
                size = (tmp0_9 + 1) | 0;
                bytes[tmp0_9] = toByte(((codePoint >> 6) & 63) | 128);
                // Inline function 'okio.internal.commonAsUtf8ToByteArray.<anonymous>' call
                var tmp0_10 = size;
                size = (tmp0_10 + 1) | 0;
                bytes[tmp0_10] = toByte((codePoint & 63) | 128);
                index_0 = (index_0 + 2) | 0;
              }
            }
          }
          return copyOf(bytes, size);
        }
        // Inline function 'kotlin.code' call
        var tmp$ret$9 = Char__toInt_impl_vasixd(b0);
        bytes[index] = toByte(tmp$ret$9);
      } while (inductionVariable < last);
    return copyOf(bytes, _this__u8e3s4.length);
  }
  function commonToUtf8String(_this__u8e3s4, beginIndex, endIndex) {
    beginIndex = beginIndex === VOID ? 0 : beginIndex;
    endIndex = endIndex === VOID ? _this__u8e3s4.length : endIndex;
    if ((beginIndex < 0 ? true : endIndex > _this__u8e3s4.length) ? true : beginIndex > endIndex) {
      throw new ArrayIndexOutOfBoundsException(
        'size=' + _this__u8e3s4.length + ' beginIndex=' + beginIndex + ' endIndex=' + endIndex,
      );
    }
    var chars = charArray((endIndex - beginIndex) | 0);
    var length = 0;
    // Inline function 'okio.processUtf16Chars' call
    var index = beginIndex;
    while (index < endIndex) {
      var b0 = _this__u8e3s4[index];
      if (b0 >= 0) {
        // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
        var tmp0 = length;
        length = (tmp0 + 1) | 0;
        chars[tmp0] = numberToChar(b0);
        index = (index + 1) | 0;
        while (index < endIndex ? _this__u8e3s4[index] >= 0 : false) {
          // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
          var tmp1 = index;
          index = (tmp1 + 1) | 0;
          var tmp0_0 = length;
          length = (tmp0_0 + 1) | 0;
          chars[tmp0_0] = numberToChar(_this__u8e3s4[tmp1]);
        }
      } else {
        // Inline function 'okio.shr' call
        if (b0 >> 5 === -2) {
          var tmp = index;
          var tmp$ret$1;
          $l$block_0: {
            // Inline function 'okio.process2Utf8Bytes' call
            var beginIndex_0 = index;
            if (endIndex <= ((beginIndex_0 + 1) | 0)) {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              var it = get_REPLACEMENT_CODE_POINT();
              // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
              var tmp0_1 = length;
              length = (tmp0_1 + 1) | 0;
              chars[tmp0_1] = numberToChar(it);
              tmp$ret$1 = 1;
              break $l$block_0;
            }
            var b0_0 = _this__u8e3s4[beginIndex_0];
            var b1 = _this__u8e3s4[(beginIndex_0 + 1) | 0];
            // Inline function 'okio.isUtf8Continuation' call
            // Inline function 'okio.and' call
            if (!((b1 & 192) === 128)) {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              var it_0 = get_REPLACEMENT_CODE_POINT();
              // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
              var tmp0_2 = length;
              length = (tmp0_2 + 1) | 0;
              chars[tmp0_2] = numberToChar(it_0);
              tmp$ret$1 = 1;
              break $l$block_0;
            }
            var codePoint = get_MASK_2BYTES() ^ b1 ^ (b0_0 << 6);
            if (codePoint < 128) {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              var it_1 = get_REPLACEMENT_CODE_POINT();
              // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
              var tmp0_3 = length;
              length = (tmp0_3 + 1) | 0;
              chars[tmp0_3] = numberToChar(it_1);
            } else {
              // Inline function 'okio.processUtf16Chars.<anonymous>' call
              // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
              var tmp0_4 = length;
              length = (tmp0_4 + 1) | 0;
              chars[tmp0_4] = numberToChar(codePoint);
            }
            tmp$ret$1 = 2;
          }
          index = (tmp + tmp$ret$1) | 0;
        } else {
          // Inline function 'okio.shr' call
          if (b0 >> 4 === -2) {
            var tmp_0 = index;
            var tmp$ret$7;
            $l$block_4: {
              // Inline function 'okio.process3Utf8Bytes' call
              var beginIndex_1 = index;
              if (endIndex <= ((beginIndex_1 + 2) | 0)) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                var it_2 = get_REPLACEMENT_CODE_POINT();
                // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                var tmp0_5 = length;
                length = (tmp0_5 + 1) | 0;
                chars[tmp0_5] = numberToChar(it_2);
                var tmp_1;
                if (endIndex <= ((beginIndex_1 + 1) | 0)) {
                  tmp_1 = true;
                } else {
                  // Inline function 'okio.isUtf8Continuation' call
                  // Inline function 'okio.and' call
                  tmp_1 = !((_this__u8e3s4[(beginIndex_1 + 1) | 0] & 192) === 128);
                }
                if (tmp_1) {
                  tmp$ret$7 = 1;
                  break $l$block_4;
                } else {
                  tmp$ret$7 = 2;
                  break $l$block_4;
                }
              }
              var b0_1 = _this__u8e3s4[beginIndex_1];
              var b1_0 = _this__u8e3s4[(beginIndex_1 + 1) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b1_0 & 192) === 128)) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                var it_3 = get_REPLACEMENT_CODE_POINT();
                // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                var tmp0_6 = length;
                length = (tmp0_6 + 1) | 0;
                chars[tmp0_6] = numberToChar(it_3);
                tmp$ret$7 = 1;
                break $l$block_4;
              }
              var b2 = _this__u8e3s4[(beginIndex_1 + 2) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b2 & 192) === 128)) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                var it_4 = get_REPLACEMENT_CODE_POINT();
                // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                var tmp0_7 = length;
                length = (tmp0_7 + 1) | 0;
                chars[tmp0_7] = numberToChar(it_4);
                tmp$ret$7 = 2;
                break $l$block_4;
              }
              var codePoint_0 = get_MASK_3BYTES() ^ b2 ^ (b1_0 << 6) ^ (b0_1 << 12);
              if (codePoint_0 < 2048) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                var it_5 = get_REPLACEMENT_CODE_POINT();
                // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                var tmp0_8 = length;
                length = (tmp0_8 + 1) | 0;
                chars[tmp0_8] = numberToChar(it_5);
              } else if (55296 <= codePoint_0 ? codePoint_0 <= 57343 : false) {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                var it_6 = get_REPLACEMENT_CODE_POINT();
                // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                var tmp0_9 = length;
                length = (tmp0_9 + 1) | 0;
                chars[tmp0_9] = numberToChar(it_6);
              } else {
                // Inline function 'okio.processUtf16Chars.<anonymous>' call
                // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                var tmp0_10 = length;
                length = (tmp0_10 + 1) | 0;
                chars[tmp0_10] = numberToChar(codePoint_0);
              }
              tmp$ret$7 = 3;
            }
            index = (tmp_0 + tmp$ret$7) | 0;
          } else {
            // Inline function 'okio.shr' call
            if (b0 >> 3 === -2) {
              var tmp_2 = index;
              var tmp$ret$15;
              $l$block_10: {
                // Inline function 'okio.process4Utf8Bytes' call
                var beginIndex_2 = index;
                if (endIndex <= ((beginIndex_2 + 3) | 0)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  var codePoint_1 = get_REPLACEMENT_CODE_POINT();
                  if (!(codePoint_1 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_11 = length;
                    length = (tmp0_11 + 1) | 0;
                    chars[tmp0_11] = numberToChar((((codePoint_1 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_12 = length;
                    length = (tmp0_12 + 1) | 0;
                    chars[tmp0_12] = numberToChar(((codePoint_1 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_13 = length;
                    length = (tmp0_13 + 1) | 0;
                    chars[tmp0_13] = get_REPLACEMENT_CHARACTER();
                  }
                  var tmp_3;
                  if (endIndex <= ((beginIndex_2 + 1) | 0)) {
                    tmp_3 = true;
                  } else {
                    // Inline function 'okio.isUtf8Continuation' call
                    // Inline function 'okio.and' call
                    tmp_3 = !((_this__u8e3s4[(beginIndex_2 + 1) | 0] & 192) === 128);
                  }
                  if (tmp_3) {
                    tmp$ret$15 = 1;
                    break $l$block_10;
                  } else {
                    var tmp_4;
                    if (endIndex <= ((beginIndex_2 + 2) | 0)) {
                      tmp_4 = true;
                    } else {
                      // Inline function 'okio.isUtf8Continuation' call
                      // Inline function 'okio.and' call
                      tmp_4 = !((_this__u8e3s4[(beginIndex_2 + 2) | 0] & 192) === 128);
                    }
                    if (tmp_4) {
                      tmp$ret$15 = 2;
                      break $l$block_10;
                    } else {
                      tmp$ret$15 = 3;
                      break $l$block_10;
                    }
                  }
                }
                var b0_2 = _this__u8e3s4[beginIndex_2];
                var b1_1 = _this__u8e3s4[(beginIndex_2 + 1) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b1_1 & 192) === 128)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  var codePoint_2 = get_REPLACEMENT_CODE_POINT();
                  if (!(codePoint_2 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_14 = length;
                    length = (tmp0_14 + 1) | 0;
                    chars[tmp0_14] = numberToChar((((codePoint_2 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_15 = length;
                    length = (tmp0_15 + 1) | 0;
                    chars[tmp0_15] = numberToChar(((codePoint_2 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_16 = length;
                    length = (tmp0_16 + 1) | 0;
                    chars[tmp0_16] = get_REPLACEMENT_CHARACTER();
                  }
                  tmp$ret$15 = 1;
                  break $l$block_10;
                }
                var b2_0 = _this__u8e3s4[(beginIndex_2 + 2) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b2_0 & 192) === 128)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  var codePoint_3 = get_REPLACEMENT_CODE_POINT();
                  if (!(codePoint_3 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_17 = length;
                    length = (tmp0_17 + 1) | 0;
                    chars[tmp0_17] = numberToChar((((codePoint_3 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_18 = length;
                    length = (tmp0_18 + 1) | 0;
                    chars[tmp0_18] = numberToChar(((codePoint_3 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_19 = length;
                    length = (tmp0_19 + 1) | 0;
                    chars[tmp0_19] = get_REPLACEMENT_CHARACTER();
                  }
                  tmp$ret$15 = 2;
                  break $l$block_10;
                }
                var b3 = _this__u8e3s4[(beginIndex_2 + 3) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b3 & 192) === 128)) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  var codePoint_4 = get_REPLACEMENT_CODE_POINT();
                  if (!(codePoint_4 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_20 = length;
                    length = (tmp0_20 + 1) | 0;
                    chars[tmp0_20] = numberToChar((((codePoint_4 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_21 = length;
                    length = (tmp0_21 + 1) | 0;
                    chars[tmp0_21] = numberToChar(((codePoint_4 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_22 = length;
                    length = (tmp0_22 + 1) | 0;
                    chars[tmp0_22] = get_REPLACEMENT_CHARACTER();
                  }
                  tmp$ret$15 = 3;
                  break $l$block_10;
                }
                var codePoint_5 = get_MASK_4BYTES() ^ b3 ^ (b2_0 << 6) ^ (b1_1 << 12) ^ (b0_2 << 18);
                if (codePoint_5 > 1114111) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  var codePoint_6 = get_REPLACEMENT_CODE_POINT();
                  if (!(codePoint_6 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_23 = length;
                    length = (tmp0_23 + 1) | 0;
                    chars[tmp0_23] = numberToChar((((codePoint_6 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_24 = length;
                    length = (tmp0_24 + 1) | 0;
                    chars[tmp0_24] = numberToChar(((codePoint_6 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_25 = length;
                    length = (tmp0_25 + 1) | 0;
                    chars[tmp0_25] = get_REPLACEMENT_CHARACTER();
                  }
                } else if (55296 <= codePoint_5 ? codePoint_5 <= 57343 : false) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  var codePoint_7 = get_REPLACEMENT_CODE_POINT();
                  if (!(codePoint_7 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_26 = length;
                    length = (tmp0_26 + 1) | 0;
                    chars[tmp0_26] = numberToChar((((codePoint_7 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_27 = length;
                    length = (tmp0_27 + 1) | 0;
                    chars[tmp0_27] = numberToChar(((codePoint_7 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_28 = length;
                    length = (tmp0_28 + 1) | 0;
                    chars[tmp0_28] = get_REPLACEMENT_CHARACTER();
                  }
                } else if (codePoint_5 < 65536) {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  var codePoint_8 = get_REPLACEMENT_CODE_POINT();
                  if (!(codePoint_8 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_29 = length;
                    length = (tmp0_29 + 1) | 0;
                    chars[tmp0_29] = numberToChar((((codePoint_8 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_30 = length;
                    length = (tmp0_30 + 1) | 0;
                    chars[tmp0_30] = numberToChar(((codePoint_8 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_31 = length;
                    length = (tmp0_31 + 1) | 0;
                    chars[tmp0_31] = get_REPLACEMENT_CHARACTER();
                  }
                } else {
                  // Inline function 'okio.processUtf16Chars.<anonymous>' call
                  if (!(codePoint_5 === get_REPLACEMENT_CODE_POINT())) {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_32 = length;
                    length = (tmp0_32 + 1) | 0;
                    chars[tmp0_32] = numberToChar((((codePoint_5 >>> 10) | 0) + get_HIGH_SURROGATE_HEADER()) | 0);
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_33 = length;
                    length = (tmp0_33 + 1) | 0;
                    chars[tmp0_33] = numberToChar(((codePoint_5 & 1023) + get_LOG_SURROGATE_HEADER()) | 0);
                  } else {
                    // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
                    var tmp0_34 = length;
                    length = (tmp0_34 + 1) | 0;
                    chars[tmp0_34] = get_REPLACEMENT_CHARACTER();
                  }
                }
                tmp$ret$15 = 4;
              }
              index = (tmp_2 + tmp$ret$15) | 0;
            } else {
              // Inline function 'okio.internal.commonToUtf8String.<anonymous>' call
              var tmp0_35 = length;
              length = (tmp0_35 + 1) | 0;
              chars[tmp0_35] = get_REPLACEMENT_CHARACTER();
              index = (index + 1) | 0;
            }
          }
        }
      }
    }
    return concatToString_0(chars, 0, length);
  }
  function get_HEX_DIGIT_BYTES() {
    _init_properties_Buffer_kt__ndcom8();
    return HEX_DIGIT_BYTES;
  }
  var HEX_DIGIT_BYTES;
  function commonCopyTo(_this__u8e3s4, out, offset, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    var offset_0 = offset;
    var byteCount_0 = byteCount;
    checkOffsetAndCount(_this__u8e3s4.get_size_woubt6_k$(), offset_0, byteCount_0);
    if (byteCount_0.equals(new Long(0, 0))) return _this__u8e3s4;
    out.set_size_9bzqhs_k$(out.get_size_woubt6_k$().plus_r93sks_k$(byteCount_0));
    var s = _this__u8e3s4.get_head_won7e1_k$();
    while (
      offset_0.compareTo_9jj042_k$(toLong((ensureNotNull(s).get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0)) >= 0
    ) {
      offset_0 = offset_0.minus_mfbszm_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
      s = s.get_next_wor1vg_k$();
    }
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      var copy = ensureNotNull(s).sharedCopy_timhza_k$();
      copy.set_pos_tfwdvz_k$((copy.get_pos_18iyad_k$() + offset_0.toInt_1tsl84_k$()) | 0);
      // Inline function 'kotlin.comparisons.minOf' call
      var a = (copy.get_pos_18iyad_k$() + byteCount_0.toInt_1tsl84_k$()) | 0;
      var b = copy.get_limit_iuokuq_k$();
      var tmp$ret$0 = Math.min(a, b);
      copy.set_limit_mo5fx2_k$(tmp$ret$0);
      if (out.get_head_won7e1_k$() == null) {
        copy.set_prev_ur3dkn_k$(copy);
        copy.set_next_tohs5l_k$(copy.get_prev_wosl18_k$());
        out.set_head_iv937o_k$(copy.get_next_wor1vg_k$());
      } else {
        ensureNotNull(ensureNotNull(out.get_head_won7e1_k$()).get_prev_wosl18_k$()).push_wd62e0_k$(copy);
      }
      byteCount_0 = byteCount_0.minus_mfbszm_k$(toLong((copy.get_limit_iuokuq_k$() - copy.get_pos_18iyad_k$()) | 0));
      offset_0 = new Long(0, 0);
      s = s.get_next_wor1vg_k$();
    }
    return _this__u8e3s4;
  }
  function commonGet(_this__u8e3s4, pos) {
    _init_properties_Buffer_kt__ndcom8();
    checkOffsetAndCount(_this__u8e3s4.get_size_woubt6_k$(), pos, new Long(1, 0));
    // Inline function 'okio.internal.seek' call
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      var offset = new Long(-1, -1);
      return ensureNotNull(null).get_data_wokkxf_k$()[
        numberToLong(null.get_pos_18iyad_k$()).plus_r93sks_k$(pos).minus_mfbszm_k$(offset).toInt_1tsl84_k$()
      ];
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var s = tmp;
    if (_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(pos).compareTo_9jj042_k$(pos) < 0) {
      var offset_0 = _this__u8e3s4.get_size_woubt6_k$();
      while (offset_0.compareTo_9jj042_k$(pos) > 0) {
        s = ensureNotNull(s.get_prev_wosl18_k$());
        offset_0 = offset_0.minus_mfbszm_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
      }
      var s_0 = s;
      var offset_1 = offset_0;
      return ensureNotNull(s_0).get_data_wokkxf_k$()[
        numberToLong(s_0.get_pos_18iyad_k$()).plus_r93sks_k$(pos).minus_mfbszm_k$(offset_1).toInt_1tsl84_k$()
      ];
    } else {
      var offset_2 = new Long(0, 0);
      $l$loop: while (true) {
        // Inline function 'kotlin.Long.plus' call
        var this_0 = offset_2;
        var other = (s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0;
        var nextOffset = this_0.plus_r93sks_k$(toLong(other));
        if (nextOffset.compareTo_9jj042_k$(pos) > 0) break $l$loop;
        s = ensureNotNull(s.get_next_wor1vg_k$());
        offset_2 = nextOffset;
      }
      var s_1 = s;
      var offset_3 = offset_2;
      return ensureNotNull(s_1).get_data_wokkxf_k$()[
        numberToLong(s_1.get_pos_18iyad_k$()).plus_r93sks_k$(pos).minus_mfbszm_k$(offset_3).toInt_1tsl84_k$()
      ];
    }
  }
  function commonCompleteSegmentByteCount(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    var result = _this__u8e3s4.get_size_woubt6_k$();
    if (result.equals(new Long(0, 0))) return new Long(0, 0);
    var tail = ensureNotNull(ensureNotNull(_this__u8e3s4.get_head_won7e1_k$()).get_prev_wosl18_k$());
    if (
      tail.get_limit_iuokuq_k$() < Companion_getInstance_1().get_SIZE_wo97pm_k$() ? tail.get_owner_iwkx3e_k$() : false
    ) {
      result = result.minus_mfbszm_k$(toLong((tail.get_limit_iuokuq_k$() - tail.get_pos_18iyad_k$()) | 0));
    }
    return result;
  }
  function commonReadByte(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) throw EOFException_init_$Create$();
    var segment = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
    var pos = segment.get_pos_18iyad_k$();
    var limit = segment.get_limit_iuokuq_k$();
    var data = segment.get_data_wokkxf_k$();
    var tmp0 = pos;
    pos = (tmp0 + 1) | 0;
    var b = data[tmp0];
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(new Long(1, 0)));
    if (pos === limit) {
      _this__u8e3s4.set_head_iv937o_k$(segment.pop_2dsh_k$());
      SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
    } else {
      segment.set_pos_tfwdvz_k$(pos);
    }
    return b;
  }
  function commonReadShort(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(new Long(2, 0)) < 0) throw EOFException_init_$Create$();
    var segment = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
    var pos = segment.get_pos_18iyad_k$();
    var limit = segment.get_limit_iuokuq_k$();
    if (((limit - pos) | 0) < 2) {
      // Inline function 'okio.and' call
      var tmp = (_this__u8e3s4.readByte_ectjk2_k$() & 255) << 8;
      // Inline function 'okio.and' call
      var s = tmp | (_this__u8e3s4.readByte_ectjk2_k$() & 255);
      return toShort(s);
    }
    var data = segment.get_data_wokkxf_k$();
    // Inline function 'okio.and' call
    var tmp1 = pos;
    pos = (tmp1 + 1) | 0;
    var tmp_0 = (data[tmp1] & 255) << 8;
    // Inline function 'okio.and' call
    var tmp0 = pos;
    pos = (tmp0 + 1) | 0;
    var s_0 = tmp_0 | (data[tmp0] & 255);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(new Long(2, 0)));
    if (pos === limit) {
      _this__u8e3s4.set_head_iv937o_k$(segment.pop_2dsh_k$());
      SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
    } else {
      segment.set_pos_tfwdvz_k$(pos);
    }
    return toShort(s_0);
  }
  function commonReadInt(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(new Long(4, 0)) < 0) throw EOFException_init_$Create$();
    var segment = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
    var pos = segment.get_pos_18iyad_k$();
    var limit = segment.get_limit_iuokuq_k$();
    if (toLong((limit - pos) | 0).compareTo_9jj042_k$(new Long(4, 0)) < 0) {
      // Inline function 'okio.and' call
      var tmp = (_this__u8e3s4.readByte_ectjk2_k$() & 255) << 24;
      // Inline function 'okio.and' call
      var tmp_0 = tmp | ((_this__u8e3s4.readByte_ectjk2_k$() & 255) << 16);
      // Inline function 'okio.and' call
      var tmp_1 = tmp_0 | ((_this__u8e3s4.readByte_ectjk2_k$() & 255) << 8);
      // Inline function 'okio.and' call
      return tmp_1 | (_this__u8e3s4.readByte_ectjk2_k$() & 255);
    }
    var data = segment.get_data_wokkxf_k$();
    // Inline function 'okio.and' call
    var tmp3 = pos;
    pos = (tmp3 + 1) | 0;
    var tmp_2 = (data[tmp3] & 255) << 24;
    // Inline function 'okio.and' call
    var tmp2 = pos;
    pos = (tmp2 + 1) | 0;
    var tmp_3 = tmp_2 | ((data[tmp2] & 255) << 16);
    // Inline function 'okio.and' call
    var tmp1 = pos;
    pos = (tmp1 + 1) | 0;
    var tmp_4 = tmp_3 | ((data[tmp1] & 255) << 8);
    // Inline function 'okio.and' call
    var tmp0 = pos;
    pos = (tmp0 + 1) | 0;
    var i = tmp_4 | (data[tmp0] & 255);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(new Long(4, 0)));
    if (pos === limit) {
      _this__u8e3s4.set_head_iv937o_k$(segment.pop_2dsh_k$());
      SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
    } else {
      segment.set_pos_tfwdvz_k$(pos);
    }
    return i;
  }
  function commonReadLong(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(new Long(8, 0)) < 0) throw EOFException_init_$Create$();
    var segment = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
    var pos = segment.get_pos_18iyad_k$();
    var limit = segment.get_limit_iuokuq_k$();
    if (toLong((limit - pos) | 0).compareTo_9jj042_k$(new Long(8, 0)) < 0) {
      // Inline function 'okio.and' call
      var this_0 = _this__u8e3s4.readInt_hv8cxl_k$();
      var other = new Long(-1, 0);
      var tmp = toLong(this_0).and_4spn93_k$(other).shl_bg8if3_k$(32);
      // Inline function 'okio.and' call
      var this_1 = _this__u8e3s4.readInt_hv8cxl_k$();
      var other_0 = new Long(-1, 0);
      var tmp$ret$1 = toLong(this_1).and_4spn93_k$(other_0);
      return tmp.or_v7fvkl_k$(tmp$ret$1);
    }
    var data = segment.get_data_wokkxf_k$();
    // Inline function 'okio.and' call
    var tmp7 = pos;
    pos = (tmp7 + 1) | 0;
    var this_2 = data[tmp7];
    var other_1 = new Long(255, 0);
    var tmp_0 = toLong(this_2).and_4spn93_k$(other_1).shl_bg8if3_k$(56);
    // Inline function 'okio.and' call
    var tmp6 = pos;
    pos = (tmp6 + 1) | 0;
    var this_3 = data[tmp6];
    var other_2 = new Long(255, 0);
    var tmp$ret$3 = toLong(this_3).and_4spn93_k$(other_2);
    var tmp_1 = tmp_0.or_v7fvkl_k$(tmp$ret$3.shl_bg8if3_k$(48));
    // Inline function 'okio.and' call
    var tmp5 = pos;
    pos = (tmp5 + 1) | 0;
    var this_4 = data[tmp5];
    var other_3 = new Long(255, 0);
    var tmp$ret$4 = toLong(this_4).and_4spn93_k$(other_3);
    var tmp_2 = tmp_1.or_v7fvkl_k$(tmp$ret$4.shl_bg8if3_k$(40));
    // Inline function 'okio.and' call
    var tmp4 = pos;
    pos = (tmp4 + 1) | 0;
    var this_5 = data[tmp4];
    var other_4 = new Long(255, 0);
    var tmp$ret$5 = toLong(this_5).and_4spn93_k$(other_4);
    var tmp_3 = tmp_2.or_v7fvkl_k$(tmp$ret$5.shl_bg8if3_k$(32));
    // Inline function 'okio.and' call
    var tmp3 = pos;
    pos = (tmp3 + 1) | 0;
    var this_6 = data[tmp3];
    var other_5 = new Long(255, 0);
    var tmp$ret$6 = toLong(this_6).and_4spn93_k$(other_5);
    var tmp_4 = tmp_3.or_v7fvkl_k$(tmp$ret$6.shl_bg8if3_k$(24));
    // Inline function 'okio.and' call
    var tmp2 = pos;
    pos = (tmp2 + 1) | 0;
    var this_7 = data[tmp2];
    var other_6 = new Long(255, 0);
    var tmp$ret$7 = toLong(this_7).and_4spn93_k$(other_6);
    var tmp_5 = tmp_4.or_v7fvkl_k$(tmp$ret$7.shl_bg8if3_k$(16));
    // Inline function 'okio.and' call
    var tmp1 = pos;
    pos = (tmp1 + 1) | 0;
    var this_8 = data[tmp1];
    var other_7 = new Long(255, 0);
    var tmp$ret$8 = toLong(this_8).and_4spn93_k$(other_7);
    var tmp_6 = tmp_5.or_v7fvkl_k$(tmp$ret$8.shl_bg8if3_k$(8));
    // Inline function 'okio.and' call
    var tmp0 = pos;
    pos = (tmp0 + 1) | 0;
    var this_9 = data[tmp0];
    var other_8 = new Long(255, 0);
    var tmp$ret$9 = toLong(this_9).and_4spn93_k$(other_8);
    var v = tmp_6.or_v7fvkl_k$(tmp$ret$9);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(new Long(8, 0)));
    if (pos === limit) {
      _this__u8e3s4.set_head_iv937o_k$(segment.pop_2dsh_k$());
      SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
    } else {
      segment.set_pos_tfwdvz_k$(pos);
    }
    return v;
  }
  function commonReadDecimalLong(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) throw EOFException_init_$Create$();
    var value = new Long(0, 0);
    var seen = 0;
    var negative = false;
    var done = false;
    var overflowDigit = new Long(-7, -1);
    do {
      var segment = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
      var data = segment.get_data_wokkxf_k$();
      var pos = segment.get_pos_18iyad_k$();
      var limit = segment.get_limit_iuokuq_k$();
      $l$loop: while (pos < limit) {
        var b = data[pos];
        if (b >= 48 ? b <= 57 : false) {
          var digit = 48 - b;
          if (
            value.compareTo_9jj042_k$(new Long(858993460, -214748365)) < 0
              ? true
              : value.equals(new Long(858993460, -214748365))
                ? toLong(digit).compareTo_9jj042_k$(overflowDigit) < 0
                : false
          ) {
            var buffer = new Buffer().writeDecimalLong_3t8cww_k$(value).writeByte_3m2t4h_k$(b);
            if (!negative) {
              buffer.readByte_ectjk2_k$();
            }
            throw NumberFormatException_init_$Create$('Number too large: ' + buffer.readUtf8_echivt_k$());
          }
          value = value.times_nfzjiw_k$(new Long(10, 0));
          value = value.plus_r93sks_k$(toLong(digit));
        } else if (b === 45 ? seen === 0 : false) {
          negative = true;
          // Inline function 'kotlin.Long.minus' call
          overflowDigit = overflowDigit.minus_mfbszm_k$(toLong(1));
        } else {
          done = true;
          break $l$loop;
        }
        pos = (pos + 1) | 0;
        seen = (seen + 1) | 0;
      }
      if (pos === limit) {
        _this__u8e3s4.set_head_iv937o_k$(segment.pop_2dsh_k$());
        SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
      } else {
        segment.set_pos_tfwdvz_k$(pos);
      }
    } while (!done ? !(_this__u8e3s4.get_head_won7e1_k$() == null) : false);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(toLong(seen)));
    var minimumSeen = negative ? 2 : 1;
    if (seen < minimumSeen) {
      if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) throw EOFException_init_$Create$();
      var expected = negative ? 'Expected a digit' : "Expected a digit or '-'";
      throw NumberFormatException_init_$Create$(
        expected + ' but was 0x' + toHexString(_this__u8e3s4.get_ugtq3c_k$(new Long(0, 0))),
      );
    }
    return negative ? value : value.unaryMinus_6uz0qp_k$();
  }
  function commonReadHexadecimalUnsignedLong(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) throw EOFException_init_$Create$();
    var value = new Long(0, 0);
    var seen = 0;
    var done = false;
    do {
      var segment = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
      var data = segment.get_data_wokkxf_k$();
      var pos = segment.get_pos_18iyad_k$();
      var limit = segment.get_limit_iuokuq_k$();
      $l$loop: while (pos < limit) {
        var digit;
        var b = data[pos];
        if (b >= 48 ? b <= 57 : false) {
          digit = b - 48;
        } else if (b >= 97 ? b <= 102 : false) {
          digit = (b - 97 + 10) | 0;
        } else if (b >= 65 ? b <= 70 : false) {
          digit = (b - 65 + 10) | 0;
        } else {
          if (seen === 0) {
            throw NumberFormatException_init_$Create$(
              'Expected leading [0-9a-fA-F] character but was 0x' + toHexString(b),
            );
          }
          done = true;
          break $l$loop;
        }
        if (!value.and_4spn93_k$(new Long(0, -268435456)).equals(new Long(0, 0))) {
          var buffer = new Buffer().writeHexadecimalUnsignedLong_x2e47l_k$(value).writeByte_3m2t4h_k$(b);
          throw NumberFormatException_init_$Create$('Number too large: ' + buffer.readUtf8_echivt_k$());
        }
        value = value.shl_bg8if3_k$(4);
        value = value.or_v7fvkl_k$(toLong(digit));
        pos = (pos + 1) | 0;
        seen = (seen + 1) | 0;
      }
      if (pos === limit) {
        _this__u8e3s4.set_head_iv937o_k$(segment.pop_2dsh_k$());
        SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
      } else {
        segment.set_pos_tfwdvz_k$(pos);
      }
    } while (!done ? !(_this__u8e3s4.get_head_won7e1_k$() == null) : false);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(toLong(seen)));
    return value;
  }
  function commonReadByteString(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    return _this__u8e3s4.readByteString_b9sk0v_k$(_this__u8e3s4.get_size_woubt6_k$());
  }
  function commonReadByteString_0(_this__u8e3s4, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0
        ? byteCount.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0
        : false)
    ) {
      // Inline function 'okio.internal.commonReadByteString.<anonymous>' call
      var message = 'byteCount: ' + byteCount.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(byteCount) < 0) throw EOFException_init_$Create$();
    if (byteCount.compareTo_9jj042_k$(new Long(4096, 0)) >= 0) {
      // Inline function 'kotlin.also' call
      var this_0 = _this__u8e3s4.snapshot_hwfoq4_k$(byteCount.toInt_1tsl84_k$());
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'okio.internal.commonReadByteString.<anonymous>' call
      _this__u8e3s4.skip_bgd4sf_k$(byteCount);
      return this_0;
    } else {
      return new ByteString(_this__u8e3s4.readByteArray_176419_k$(byteCount));
    }
  }
  function commonReadFully(_this__u8e3s4, sink, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(byteCount) < 0) {
      sink.write_f49az7_k$(_this__u8e3s4, _this__u8e3s4.get_size_woubt6_k$());
      throw EOFException_init_$Create$();
    }
    sink.write_f49az7_k$(_this__u8e3s4, byteCount);
  }
  function commonReadAll(_this__u8e3s4, sink) {
    _init_properties_Buffer_kt__ndcom8();
    var byteCount = _this__u8e3s4.get_size_woubt6_k$();
    if (byteCount.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      sink.write_f49az7_k$(_this__u8e3s4, byteCount);
    }
    return byteCount;
  }
  function commonReadUtf8(_this__u8e3s4, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0
        ? byteCount.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0
        : false)
    ) {
      // Inline function 'okio.internal.commonReadUtf8.<anonymous>' call
      var message = 'byteCount: ' + byteCount.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(byteCount) < 0) throw EOFException_init_$Create$();
    if (byteCount.equals(new Long(0, 0))) return '';
    var s = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
    if (
      numberToLong(s.get_pos_18iyad_k$())
        .plus_r93sks_k$(byteCount)
        .compareTo_9jj042_k$(toLong(s.get_limit_iuokuq_k$())) > 0
    ) {
      return commonToUtf8String(_this__u8e3s4.readByteArray_176419_k$(byteCount));
    }
    var result = commonToUtf8String(
      s.get_data_wokkxf_k$(),
      s.get_pos_18iyad_k$(),
      (s.get_pos_18iyad_k$() + byteCount.toInt_1tsl84_k$()) | 0,
    );
    s.set_pos_tfwdvz_k$((s.get_pos_18iyad_k$() + byteCount.toInt_1tsl84_k$()) | 0);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(byteCount));
    if (s.get_pos_18iyad_k$() === s.get_limit_iuokuq_k$()) {
      _this__u8e3s4.set_head_iv937o_k$(s.pop_2dsh_k$());
      SegmentPool_getInstance().recycle_ipeoxr_k$(s);
    }
    return result;
  }
  function commonReadUtf8Line(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    var newline = _this__u8e3s4.indexOf_ji4kj3_k$(10);
    return !newline.equals(new Long(-1, -1))
      ? readUtf8Line(_this__u8e3s4, newline)
      : !_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))
        ? _this__u8e3s4.readUtf8_pe0fc7_k$(_this__u8e3s4.get_size_woubt6_k$())
        : null;
  }
  function commonReadUtf8LineStrict(_this__u8e3s4, limit) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(limit.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.internal.commonReadUtf8LineStrict.<anonymous>' call
      var message = 'limit < 0: ' + limit.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    var scanLength = limit.equals(Companion_getInstance().get_MAX_VALUE_54a9lf_k$())
      ? Companion_getInstance().get_MAX_VALUE_54a9lf_k$()
      : limit.plus_r93sks_k$(new Long(1, 0));
    var newline = _this__u8e3s4.indexOf_nnf9xt_k$(10, new Long(0, 0), scanLength);
    if (!newline.equals(new Long(-1, -1))) return readUtf8Line(_this__u8e3s4, newline);
    var tmp;
    var tmp_0;
    if (scanLength.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
      // Inline function 'kotlin.Long.minus' call
      var tmp$ret$1 = scanLength.minus_mfbszm_k$(toLong(1));
      tmp_0 = _this__u8e3s4.get_ugtq3c_k$(tmp$ret$1) === 13;
    } else {
      tmp_0 = false;
    }
    if (tmp_0) {
      tmp = _this__u8e3s4.get_ugtq3c_k$(scanLength) === 10;
    } else {
      tmp = false;
    }
    if (tmp) {
      return readUtf8Line(_this__u8e3s4, scanLength);
    }
    var data = new Buffer();
    var tmp_1 = new Long(0, 0);
    // Inline function 'okio.minOf' call
    var b = _this__u8e3s4.get_size_woubt6_k$();
    // Inline function 'kotlin.comparisons.minOf' call
    var a = toLong(32);
    var tmp$ret$3 = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
    _this__u8e3s4.copyTo_y7so4c_k$(data, tmp_1, tmp$ret$3);
    // Inline function 'kotlin.comparisons.minOf' call
    var a_0 = _this__u8e3s4.get_size_woubt6_k$();
    var tmp$ret$4 = a_0.compareTo_9jj042_k$(limit) <= 0 ? a_0 : limit;
    throw new EOFException(
      '\\n not found: limit=' +
        tmp$ret$4.toString() +
        ' content=' +
        data.readByteString_nzt46n_k$().hex_27mj_k$() +
        '\u2026',
    );
  }
  function commonReadUtf8CodePoint(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) throw EOFException_init_$Create$();
    var b0 = _this__u8e3s4.get_ugtq3c_k$(new Long(0, 0));
    var codePoint;
    var byteCount;
    var min;
    // Inline function 'okio.and' call
    if ((b0 & 128) === 0) {
      // Inline function 'okio.and' call
      codePoint = b0 & 127;
      byteCount = 1;
      min = 0;
    } else {
      // Inline function 'okio.and' call
      if ((b0 & 224) === 192) {
        // Inline function 'okio.and' call
        codePoint = b0 & 31;
        byteCount = 2;
        min = 128;
      } else {
        // Inline function 'okio.and' call
        if ((b0 & 240) === 224) {
          // Inline function 'okio.and' call
          codePoint = b0 & 15;
          byteCount = 3;
          min = 2048;
        } else {
          // Inline function 'okio.and' call
          if ((b0 & 248) === 240) {
            // Inline function 'okio.and' call
            codePoint = b0 & 7;
            byteCount = 4;
            min = 65536;
          } else {
            _this__u8e3s4.skip_bgd4sf_k$(new Long(1, 0));
            return get_REPLACEMENT_CODE_POINT();
          }
        }
      }
    }
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(toLong(byteCount)) < 0) {
      throw new EOFException(
        'size < ' +
          byteCount +
          ': ' +
          _this__u8e3s4.get_size_woubt6_k$().toString() +
          ' (to read code point prefixed 0x' +
          toHexString(b0) +
          ')',
      );
    }
    var inductionVariable = 1;
    if (inductionVariable < byteCount)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var b = _this__u8e3s4.get_ugtq3c_k$(toLong(i));
        // Inline function 'okio.and' call
        if ((b & 192) === 128) {
          codePoint = codePoint << 6;
          var tmp = codePoint;
          // Inline function 'okio.and' call
          codePoint = tmp | (b & 63);
        } else {
          _this__u8e3s4.skip_bgd4sf_k$(toLong(i));
          return get_REPLACEMENT_CODE_POINT();
        }
      } while (inductionVariable < byteCount);
    _this__u8e3s4.skip_bgd4sf_k$(toLong(byteCount));
    var tmp_0;
    if (codePoint > 1114111) {
      tmp_0 = get_REPLACEMENT_CODE_POINT();
    } else if (55296 <= codePoint ? codePoint <= 57343 : false) {
      tmp_0 = get_REPLACEMENT_CODE_POINT();
    } else if (codePoint < min) {
      tmp_0 = get_REPLACEMENT_CODE_POINT();
    } else {
      tmp_0 = codePoint;
    }
    return tmp_0;
  }
  function commonSelect(_this__u8e3s4, options) {
    _init_properties_Buffer_kt__ndcom8();
    var index = selectPrefix(_this__u8e3s4, options);
    if (index === -1) return -1;
    var selectedSize = options.get_byteStrings_g0wbnz_k$()[index].get_size_woubt6_k$();
    _this__u8e3s4.skip_bgd4sf_k$(toLong(selectedSize));
    return index;
  }
  function commonReadByteArray(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    return _this__u8e3s4.readByteArray_176419_k$(_this__u8e3s4.get_size_woubt6_k$());
  }
  function commonReadByteArray_0(_this__u8e3s4, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0
        ? byteCount.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0
        : false)
    ) {
      // Inline function 'okio.internal.commonReadByteArray.<anonymous>' call
      var message = 'byteCount: ' + byteCount.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    if (_this__u8e3s4.get_size_woubt6_k$().compareTo_9jj042_k$(byteCount) < 0) throw EOFException_init_$Create$();
    var result = new Int8Array(byteCount.toInt_1tsl84_k$());
    _this__u8e3s4.readFully_qophy4_k$(result);
    return result;
  }
  function commonRead(_this__u8e3s4, sink) {
    _init_properties_Buffer_kt__ndcom8();
    return _this__u8e3s4.read_7zpyie_k$(sink, 0, sink.length);
  }
  function commonReadFully_0(_this__u8e3s4, sink) {
    _init_properties_Buffer_kt__ndcom8();
    var offset = 0;
    while (offset < sink.length) {
      var read = _this__u8e3s4.read_7zpyie_k$(sink, offset, (sink.length - offset) | 0);
      if (read === -1) throw EOFException_init_$Create$();
      offset = (offset + read) | 0;
    }
  }
  function commonRead_0(_this__u8e3s4, sink, offset, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    checkOffsetAndCount(toLong(sink.length), toLong(offset), toLong(byteCount));
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      return -1;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var s = tmp;
    // Inline function 'kotlin.comparisons.minOf' call
    var b = (s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0;
    var toCopy = Math.min(byteCount, b);
    // Inline function 'kotlin.collections.copyInto' call
    var this_0 = s.get_data_wokkxf_k$();
    var startIndex = s.get_pos_18iyad_k$();
    var endIndex = (s.get_pos_18iyad_k$() + toCopy) | 0;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp_0 = this_0;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    arrayCopy(tmp_0, sink, offset, startIndex, endIndex);
    s.set_pos_tfwdvz_k$((s.get_pos_18iyad_k$() + toCopy) | 0);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(toLong(toCopy)));
    if (s.get_pos_18iyad_k$() === s.get_limit_iuokuq_k$()) {
      _this__u8e3s4.set_head_iv937o_k$(s.pop_2dsh_k$());
      SegmentPool_getInstance().recycle_ipeoxr_k$(s);
    }
    return toCopy;
  }
  function commonClear(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    return _this__u8e3s4.skip_bgd4sf_k$(_this__u8e3s4.get_size_woubt6_k$());
  }
  function commonSkip(_this__u8e3s4, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    var byteCount_0 = byteCount;
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
      var tmp;
      if (tmp0_elvis_lhs == null) {
        throw EOFException_init_$Create$();
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'okio.minOf' call
      var a = byteCount_0;
      var b = (head.get_limit_iuokuq_k$() - head.get_pos_18iyad_k$()) | 0;
      // Inline function 'kotlin.comparisons.minOf' call
      var b_0 = toLong(b);
      var toSkip = (a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0).toInt_1tsl84_k$();
      _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(toLong(toSkip)));
      byteCount_0 = byteCount_0.minus_mfbszm_k$(toLong(toSkip));
      head.set_pos_tfwdvz_k$((head.get_pos_18iyad_k$() + toSkip) | 0);
      if (head.get_pos_18iyad_k$() === head.get_limit_iuokuq_k$()) {
        _this__u8e3s4.set_head_iv937o_k$(head.pop_2dsh_k$());
        SegmentPool_getInstance().recycle_ipeoxr_k$(head);
      }
    }
  }
  function commonWrite(_this__u8e3s4, byteString, offset, byteCount) {
    offset = offset === VOID ? 0 : offset;
    byteCount = byteCount === VOID ? byteString.get_size_woubt6_k$() : byteCount;
    _init_properties_Buffer_kt__ndcom8();
    byteString.write_7y2kpx_k$(_this__u8e3s4, offset, byteCount);
    return _this__u8e3s4;
  }
  function commonWritableSegment(_this__u8e3s4, minimumCapacity) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(minimumCapacity >= 1 ? minimumCapacity <= Companion_getInstance_1().get_SIZE_wo97pm_k$() : false)) {
      // Inline function 'okio.internal.commonWritableSegment.<anonymous>' call
      var message = 'unexpected capacity';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    if (_this__u8e3s4.get_head_won7e1_k$() == null) {
      var result = SegmentPool_getInstance().take_2451j_k$();
      _this__u8e3s4.set_head_iv937o_k$(result);
      result.set_prev_ur3dkn_k$(result);
      result.set_next_tohs5l_k$(result);
      return result;
    }
    var tail = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$()).get_prev_wosl18_k$();
    if (
      ((ensureNotNull(tail).get_limit_iuokuq_k$() + minimumCapacity) | 0) >
      Companion_getInstance_1().get_SIZE_wo97pm_k$()
        ? true
        : !tail.get_owner_iwkx3e_k$()
    ) {
      tail = tail.push_wd62e0_k$(SegmentPool_getInstance().take_2451j_k$());
    }
    return tail;
  }
  function commonWriteUtf8(_this__u8e3s4, string, beginIndex, endIndex) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(beginIndex >= 0)) {
      // Inline function 'okio.internal.commonWriteUtf8.<anonymous>' call
      var message = 'beginIndex < 0: ' + beginIndex;
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(endIndex >= beginIndex)) {
      // Inline function 'okio.internal.commonWriteUtf8.<anonymous>' call
      var message_0 = 'endIndex < beginIndex: ' + endIndex + ' < ' + beginIndex;
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(endIndex <= string.length)) {
      // Inline function 'okio.internal.commonWriteUtf8.<anonymous>' call
      var message_1 = 'endIndex > string.length: ' + endIndex + ' > ' + string.length;
      throw IllegalArgumentException_init_$Create$(toString(message_1));
    }
    var i = beginIndex;
    while (i < endIndex) {
      // Inline function 'kotlin.code' call
      var this_0 = charSequenceGet(string, i);
      var c = Char__toInt_impl_vasixd(this_0);
      if (c < 128) {
        var tail = _this__u8e3s4.writableSegment_i90lmt_k$(1);
        var data = tail.get_data_wokkxf_k$();
        var segmentOffset = (tail.get_limit_iuokuq_k$() - i) | 0;
        // Inline function 'kotlin.comparisons.minOf' call
        var b = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - segmentOffset) | 0;
        var runLimit = Math.min(endIndex, b);
        var tmp0 = i;
        i = (tmp0 + 1) | 0;
        data[(segmentOffset + tmp0) | 0] = toByte(c);
        $l$loop: while (i < runLimit) {
          // Inline function 'kotlin.code' call
          var this_1 = charSequenceGet(string, i);
          c = Char__toInt_impl_vasixd(this_1);
          if (c >= 128) break $l$loop;
          var tmp1 = i;
          i = (tmp1 + 1) | 0;
          data[(segmentOffset + tmp1) | 0] = toByte(c);
        }
        var runSize = (((i + segmentOffset) | 0) - tail.get_limit_iuokuq_k$()) | 0;
        tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + runSize) | 0);
        _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(toLong(runSize)));
      } else if (c < 2048) {
        var tail_0 = _this__u8e3s4.writableSegment_i90lmt_k$(2);
        tail_0.get_data_wokkxf_k$()[tail_0.get_limit_iuokuq_k$()] = toByte((c >> 6) | 192);
        tail_0.get_data_wokkxf_k$()[(tail_0.get_limit_iuokuq_k$() + 1) | 0] = toByte((c & 63) | 128);
        tail_0.set_limit_mo5fx2_k$((tail_0.get_limit_iuokuq_k$() + 2) | 0);
        _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(2, 0)));
        i = (i + 1) | 0;
      } else if (c < 55296 ? true : c > 57343) {
        var tail_1 = _this__u8e3s4.writableSegment_i90lmt_k$(3);
        tail_1.get_data_wokkxf_k$()[tail_1.get_limit_iuokuq_k$()] = toByte((c >> 12) | 224);
        tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 1) | 0] = toByte(((c >> 6) & 63) | 128);
        tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 2) | 0] = toByte((c & 63) | 128);
        tail_1.set_limit_mo5fx2_k$((tail_1.get_limit_iuokuq_k$() + 3) | 0);
        _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(3, 0)));
        i = (i + 1) | 0;
      } else {
        var tmp;
        if (((i + 1) | 0) < endIndex) {
          // Inline function 'kotlin.code' call
          var this_2 = charSequenceGet(string, (i + 1) | 0);
          tmp = Char__toInt_impl_vasixd(this_2);
        } else {
          tmp = 0;
        }
        var low = tmp;
        if (c > 56319 ? true : !(56320 <= low ? low <= 57343 : false)) {
          // Inline function 'kotlin.code' call
          var this_3 = _Char___init__impl__6a9atx(63);
          var tmp$ret$7 = Char__toInt_impl_vasixd(this_3);
          _this__u8e3s4.writeByte_3m2t4h_k$(tmp$ret$7);
          i = (i + 1) | 0;
        } else {
          var codePoint = (65536 + (((c & 1023) << 10) | (low & 1023))) | 0;
          var tail_2 = _this__u8e3s4.writableSegment_i90lmt_k$(4);
          tail_2.get_data_wokkxf_k$()[tail_2.get_limit_iuokuq_k$()] = toByte((codePoint >> 18) | 240);
          tail_2.get_data_wokkxf_k$()[(tail_2.get_limit_iuokuq_k$() + 1) | 0] = toByte(((codePoint >> 12) & 63) | 128);
          tail_2.get_data_wokkxf_k$()[(tail_2.get_limit_iuokuq_k$() + 2) | 0] = toByte(((codePoint >> 6) & 63) | 128);
          tail_2.get_data_wokkxf_k$()[(tail_2.get_limit_iuokuq_k$() + 3) | 0] = toByte((codePoint & 63) | 128);
          tail_2.set_limit_mo5fx2_k$((tail_2.get_limit_iuokuq_k$() + 4) | 0);
          _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(4, 0)));
          i = (i + 2) | 0;
        }
      }
    }
    return _this__u8e3s4;
  }
  function commonWriteUtf8CodePoint(_this__u8e3s4, codePoint) {
    _init_properties_Buffer_kt__ndcom8();
    if (codePoint < 128) {
      _this__u8e3s4.writeByte_3m2t4h_k$(codePoint);
    } else if (codePoint < 2048) {
      var tail = _this__u8e3s4.writableSegment_i90lmt_k$(2);
      tail.get_data_wokkxf_k$()[tail.get_limit_iuokuq_k$()] = toByte((codePoint >> 6) | 192);
      tail.get_data_wokkxf_k$()[(tail.get_limit_iuokuq_k$() + 1) | 0] = toByte((codePoint & 63) | 128);
      tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + 2) | 0);
      _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(2, 0)));
    } else if (55296 <= codePoint ? codePoint <= 57343 : false) {
      // Inline function 'kotlin.code' call
      var this_0 = _Char___init__impl__6a9atx(63);
      var tmp$ret$0 = Char__toInt_impl_vasixd(this_0);
      _this__u8e3s4.writeByte_3m2t4h_k$(tmp$ret$0);
    } else if (codePoint < 65536) {
      var tail_0 = _this__u8e3s4.writableSegment_i90lmt_k$(3);
      tail_0.get_data_wokkxf_k$()[tail_0.get_limit_iuokuq_k$()] = toByte((codePoint >> 12) | 224);
      tail_0.get_data_wokkxf_k$()[(tail_0.get_limit_iuokuq_k$() + 1) | 0] = toByte(((codePoint >> 6) & 63) | 128);
      tail_0.get_data_wokkxf_k$()[(tail_0.get_limit_iuokuq_k$() + 2) | 0] = toByte((codePoint & 63) | 128);
      tail_0.set_limit_mo5fx2_k$((tail_0.get_limit_iuokuq_k$() + 3) | 0);
      _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(3, 0)));
    } else if (codePoint <= 1114111) {
      var tail_1 = _this__u8e3s4.writableSegment_i90lmt_k$(4);
      tail_1.get_data_wokkxf_k$()[tail_1.get_limit_iuokuq_k$()] = toByte((codePoint >> 18) | 240);
      tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 1) | 0] = toByte(((codePoint >> 12) & 63) | 128);
      tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 2) | 0] = toByte(((codePoint >> 6) & 63) | 128);
      tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 3) | 0] = toByte((codePoint & 63) | 128);
      tail_1.set_limit_mo5fx2_k$((tail_1.get_limit_iuokuq_k$() + 4) | 0);
      _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(4, 0)));
    } else {
      throw IllegalArgumentException_init_$Create$('Unexpected code point: 0x' + toHexString_0(codePoint));
    }
    return _this__u8e3s4;
  }
  function commonWrite_0(_this__u8e3s4, source) {
    _init_properties_Buffer_kt__ndcom8();
    return _this__u8e3s4.write_owzzlt_k$(source, 0, source.length);
  }
  function commonWrite_1(_this__u8e3s4, source, offset, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    var offset_0 = offset;
    checkOffsetAndCount(toLong(source.length), toLong(offset_0), toLong(byteCount));
    var limit = (offset_0 + byteCount) | 0;
    while (offset_0 < limit) {
      var tail = _this__u8e3s4.writableSegment_i90lmt_k$(1);
      // Inline function 'kotlin.comparisons.minOf' call
      var a = (limit - offset_0) | 0;
      var b = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - tail.get_limit_iuokuq_k$()) | 0;
      var toCopy = Math.min(a, b);
      // Inline function 'kotlin.collections.copyInto' call
      var destination = tail.get_data_wokkxf_k$();
      var destinationOffset = tail.get_limit_iuokuq_k$();
      var startIndex = offset_0;
      var endIndex = (offset_0 + toCopy) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = source;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, destination, destinationOffset, startIndex, endIndex);
      offset_0 = (offset_0 + toCopy) | 0;
      tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + toCopy) | 0);
    }
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(toLong(byteCount)));
    return _this__u8e3s4;
  }
  function commonWriteAll(_this__u8e3s4, source) {
    _init_properties_Buffer_kt__ndcom8();
    var totalBytesRead = new Long(0, 0);
    $l$loop: while (true) {
      var readCount = source.read_a1wdbo_k$(_this__u8e3s4, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()));
      if (readCount.equals(new Long(-1, -1))) break $l$loop;
      totalBytesRead = totalBytesRead.plus_r93sks_k$(readCount);
    }
    return totalBytesRead;
  }
  function commonWrite_2(_this__u8e3s4, source, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    var byteCount_0 = byteCount;
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      var read = source.read_a1wdbo_k$(_this__u8e3s4, byteCount_0);
      if (read.equals(new Long(-1, -1))) throw EOFException_init_$Create$();
      byteCount_0 = byteCount_0.minus_mfbszm_k$(read);
    }
    return _this__u8e3s4;
  }
  function commonWriteByte(_this__u8e3s4, b) {
    _init_properties_Buffer_kt__ndcom8();
    var tail = _this__u8e3s4.writableSegment_i90lmt_k$(1);
    var tmp = tail.get_data_wokkxf_k$();
    var tmp1 = tail.get_limit_iuokuq_k$();
    tail.set_limit_mo5fx2_k$((tmp1 + 1) | 0);
    tmp[tmp1] = toByte(b);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(1, 0)));
    return _this__u8e3s4;
  }
  function commonWriteShort(_this__u8e3s4, s) {
    _init_properties_Buffer_kt__ndcom8();
    var tail = _this__u8e3s4.writableSegment_i90lmt_k$(2);
    var data = tail.get_data_wokkxf_k$();
    var limit = tail.get_limit_iuokuq_k$();
    var tmp0 = limit;
    limit = (tmp0 + 1) | 0;
    data[tmp0] = toByte(((s >>> 8) | 0) & 255);
    var tmp1 = limit;
    limit = (tmp1 + 1) | 0;
    data[tmp1] = toByte(s & 255);
    tail.set_limit_mo5fx2_k$(limit);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(2, 0)));
    return _this__u8e3s4;
  }
  function commonWriteInt(_this__u8e3s4, i) {
    _init_properties_Buffer_kt__ndcom8();
    var tail = _this__u8e3s4.writableSegment_i90lmt_k$(4);
    var data = tail.get_data_wokkxf_k$();
    var limit = tail.get_limit_iuokuq_k$();
    var tmp0 = limit;
    limit = (tmp0 + 1) | 0;
    data[tmp0] = toByte(((i >>> 24) | 0) & 255);
    var tmp1 = limit;
    limit = (tmp1 + 1) | 0;
    data[tmp1] = toByte(((i >>> 16) | 0) & 255);
    var tmp2 = limit;
    limit = (tmp2 + 1) | 0;
    data[tmp2] = toByte(((i >>> 8) | 0) & 255);
    var tmp3 = limit;
    limit = (tmp3 + 1) | 0;
    data[tmp3] = toByte(i & 255);
    tail.set_limit_mo5fx2_k$(limit);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(4, 0)));
    return _this__u8e3s4;
  }
  function commonWriteLong(_this__u8e3s4, v) {
    _init_properties_Buffer_kt__ndcom8();
    var tail = _this__u8e3s4.writableSegment_i90lmt_k$(8);
    var data = tail.get_data_wokkxf_k$();
    var limit = tail.get_limit_iuokuq_k$();
    var tmp0 = limit;
    limit = (tmp0 + 1) | 0;
    data[tmp0] = v.ushr_z7nmq8_k$(56).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp1 = limit;
    limit = (tmp1 + 1) | 0;
    data[tmp1] = v.ushr_z7nmq8_k$(48).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp2 = limit;
    limit = (tmp2 + 1) | 0;
    data[tmp2] = v.ushr_z7nmq8_k$(40).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp3 = limit;
    limit = (tmp3 + 1) | 0;
    data[tmp3] = v.ushr_z7nmq8_k$(32).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp4 = limit;
    limit = (tmp4 + 1) | 0;
    data[tmp4] = v.ushr_z7nmq8_k$(24).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp5 = limit;
    limit = (tmp5 + 1) | 0;
    data[tmp5] = v.ushr_z7nmq8_k$(16).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp6 = limit;
    limit = (tmp6 + 1) | 0;
    data[tmp6] = v.ushr_z7nmq8_k$(8).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp7 = limit;
    limit = (tmp7 + 1) | 0;
    data[tmp7] = v.and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    tail.set_limit_mo5fx2_k$(limit);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(new Long(8, 0)));
    return _this__u8e3s4;
  }
  function commonWriteDecimalLong(_this__u8e3s4, v) {
    _init_properties_Buffer_kt__ndcom8();
    var v_0 = v;
    if (v_0.equals(new Long(0, 0))) {
      // Inline function 'kotlin.code' call
      var this_0 = _Char___init__impl__6a9atx(48);
      var tmp$ret$0 = Char__toInt_impl_vasixd(this_0);
      return _this__u8e3s4.writeByte_3m2t4h_k$(tmp$ret$0);
    }
    var negative = false;
    if (v_0.compareTo_9jj042_k$(new Long(0, 0)) < 0) {
      v_0 = v_0.unaryMinus_6uz0qp_k$();
      if (v_0.compareTo_9jj042_k$(new Long(0, 0)) < 0) {
        return _this__u8e3s4.writeUtf8_9rv3au_k$('-9223372036854775808');
      }
      negative = true;
    }
    var tmp;
    if (v_0.compareTo_9jj042_k$(new Long(100000000, 0)) < 0) {
      var tmp_0;
      if (v_0.compareTo_9jj042_k$(new Long(10000, 0)) < 0) {
        var tmp_1;
        if (v_0.compareTo_9jj042_k$(new Long(100, 0)) < 0) {
          var tmp_2;
          if (v_0.compareTo_9jj042_k$(new Long(10, 0)) < 0) {
            tmp_2 = 1;
          } else {
            tmp_2 = 2;
          }
          tmp_1 = tmp_2;
        } else if (v_0.compareTo_9jj042_k$(new Long(1000, 0)) < 0) {
          tmp_1 = 3;
        } else {
          tmp_1 = 4;
        }
        tmp_0 = tmp_1;
      } else if (v_0.compareTo_9jj042_k$(new Long(1000000, 0)) < 0) {
        var tmp_3;
        if (v_0.compareTo_9jj042_k$(new Long(100000, 0)) < 0) {
          tmp_3 = 5;
        } else {
          tmp_3 = 6;
        }
        tmp_0 = tmp_3;
      } else if (v_0.compareTo_9jj042_k$(new Long(10000000, 0)) < 0) {
        tmp_0 = 7;
      } else {
        tmp_0 = 8;
      }
      tmp = tmp_0;
    } else if (v_0.compareTo_9jj042_k$(new Long(-727379968, 232)) < 0) {
      var tmp_4;
      if (v_0.compareTo_9jj042_k$(new Long(1410065408, 2)) < 0) {
        var tmp_5;
        if (v_0.compareTo_9jj042_k$(new Long(1000000000, 0)) < 0) {
          tmp_5 = 9;
        } else {
          tmp_5 = 10;
        }
        tmp_4 = tmp_5;
      } else if (v_0.compareTo_9jj042_k$(new Long(1215752192, 23)) < 0) {
        tmp_4 = 11;
      } else {
        tmp_4 = 12;
      }
      tmp = tmp_4;
    } else if (v_0.compareTo_9jj042_k$(new Long(-1530494976, 232830)) < 0) {
      var tmp_6;
      if (v_0.compareTo_9jj042_k$(new Long(1316134912, 2328)) < 0) {
        tmp_6 = 13;
      } else if (v_0.compareTo_9jj042_k$(new Long(276447232, 23283)) < 0) {
        tmp_6 = 14;
      } else {
        tmp_6 = 15;
      }
      tmp = tmp_6;
    } else if (v_0.compareTo_9jj042_k$(new Long(1569325056, 23283064)) < 0) {
      var tmp_7;
      if (v_0.compareTo_9jj042_k$(new Long(1874919424, 2328306)) < 0) {
        tmp_7 = 16;
      } else {
        tmp_7 = 17;
      }
      tmp = tmp_7;
    } else if (v_0.compareTo_9jj042_k$(new Long(-1486618624, 232830643)) < 0) {
      tmp = 18;
    } else {
      tmp = 19;
    }
    var width = tmp;
    if (negative) {
      width = (width + 1) | 0;
    }
    var tail = _this__u8e3s4.writableSegment_i90lmt_k$(width);
    var data = tail.get_data_wokkxf_k$();
    var pos = (tail.get_limit_iuokuq_k$() + width) | 0;
    while (!v_0.equals(new Long(0, 0))) {
      // Inline function 'kotlin.Long.rem' call
      var digit = v_0.rem_bsnl9o_k$(toLong(10)).toInt_1tsl84_k$();
      pos = (pos - 1) | 0;
      data[pos] = get_HEX_DIGIT_BYTES()[digit];
      // Inline function 'kotlin.Long.div' call
      v_0 = v_0.div_jun7gj_k$(toLong(10));
    }
    if (negative) {
      pos = (pos - 1) | 0;
      data[pos] = 45;
    }
    tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + width) | 0);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(toLong(width)));
    return _this__u8e3s4;
  }
  function commonWriteHexadecimalUnsignedLong(_this__u8e3s4, v) {
    _init_properties_Buffer_kt__ndcom8();
    var v_0 = v;
    if (v_0.equals(new Long(0, 0))) {
      // Inline function 'kotlin.code' call
      var this_0 = _Char___init__impl__6a9atx(48);
      var tmp$ret$0 = Char__toInt_impl_vasixd(this_0);
      return _this__u8e3s4.writeByte_3m2t4h_k$(tmp$ret$0);
    }
    var x = v_0;
    x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(1));
    x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(2));
    x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(4));
    x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(8));
    x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(16));
    x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(32));
    x = x.minus_mfbszm_k$(x.ushr_z7nmq8_k$(1).and_4spn93_k$(new Long(1431655765, 1431655765)));
    x = x
      .ushr_z7nmq8_k$(2)
      .and_4spn93_k$(new Long(858993459, 858993459))
      .plus_r93sks_k$(x.and_4spn93_k$(new Long(858993459, 858993459)));
    x = x.ushr_z7nmq8_k$(4).plus_r93sks_k$(x).and_4spn93_k$(new Long(252645135, 252645135));
    x = x.plus_r93sks_k$(x.ushr_z7nmq8_k$(8));
    x = x.plus_r93sks_k$(x.ushr_z7nmq8_k$(16));
    x = x.and_4spn93_k$(new Long(63, 0)).plus_r93sks_k$(x.ushr_z7nmq8_k$(32).and_4spn93_k$(new Long(63, 0)));
    // Inline function 'kotlin.Long.div' call
    // Inline function 'kotlin.Long.plus' call
    var width = x.plus_r93sks_k$(toLong(3)).div_jun7gj_k$(toLong(4)).toInt_1tsl84_k$();
    var tail = _this__u8e3s4.writableSegment_i90lmt_k$(width);
    var data = tail.get_data_wokkxf_k$();
    var pos = (((tail.get_limit_iuokuq_k$() + width) | 0) - 1) | 0;
    var start = tail.get_limit_iuokuq_k$();
    while (pos >= start) {
      data[pos] = get_HEX_DIGIT_BYTES()[v_0.and_4spn93_k$(new Long(15, 0)).toInt_1tsl84_k$()];
      v_0 = v_0.ushr_z7nmq8_k$(4);
      pos = (pos - 1) | 0;
    }
    tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + width) | 0);
    _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(toLong(width)));
    return _this__u8e3s4;
  }
  function commonWrite_3(_this__u8e3s4, source, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    var byteCount_0 = byteCount;
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!(source === _this__u8e3s4)) {
      // Inline function 'okio.internal.commonWrite.<anonymous>' call
      var message = 'source == this';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    checkOffsetAndCount(source.get_size_woubt6_k$(), new Long(0, 0), byteCount_0);
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      if (
        byteCount_0.compareTo_9jj042_k$(
          toLong(
            (ensureNotNull(source.get_head_won7e1_k$()).get_limit_iuokuq_k$() -
              ensureNotNull(source.get_head_won7e1_k$()).get_pos_18iyad_k$()) |
              0,
          ),
        ) < 0
      ) {
        var tail = !(_this__u8e3s4.get_head_won7e1_k$() == null)
          ? ensureNotNull(_this__u8e3s4.get_head_won7e1_k$()).get_prev_wosl18_k$()
          : null;
        var tmp;
        if (!(tail == null) ? tail.get_owner_iwkx3e_k$() : false) {
          // Inline function 'kotlin.Long.minus' call
          // Inline function 'kotlin.Long.plus' call
          var this_0 = byteCount_0;
          var other = tail.get_limit_iuokuq_k$();
          var this_1 = this_0.plus_r93sks_k$(toLong(other));
          var other_0 = tail.get_shared_jgtlda_k$() ? 0 : tail.get_pos_18iyad_k$();
          tmp =
            this_1
              .minus_mfbszm_k$(toLong(other_0))
              .compareTo_9jj042_k$(toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$())) <= 0;
        } else {
          tmp = false;
        }
        if (tmp) {
          ensureNotNull(source.get_head_won7e1_k$()).writeTo_yxwz0w_k$(tail, byteCount_0.toInt_1tsl84_k$());
          source.set_size_9bzqhs_k$(source.get_size_woubt6_k$().minus_mfbszm_k$(byteCount_0));
          _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(byteCount_0));
          return Unit_getInstance();
        } else {
          source.set_head_iv937o_k$(
            ensureNotNull(source.get_head_won7e1_k$()).split_cz4av2_k$(byteCount_0.toInt_1tsl84_k$()),
          );
        }
      }
      var segmentToMove = source.get_head_won7e1_k$();
      var movedByteCount = toLong(
        (ensureNotNull(segmentToMove).get_limit_iuokuq_k$() - segmentToMove.get_pos_18iyad_k$()) | 0,
      );
      source.set_head_iv937o_k$(segmentToMove.pop_2dsh_k$());
      if (_this__u8e3s4.get_head_won7e1_k$() == null) {
        _this__u8e3s4.set_head_iv937o_k$(segmentToMove);
        segmentToMove.set_prev_ur3dkn_k$(segmentToMove);
        segmentToMove.set_next_tohs5l_k$(segmentToMove.get_prev_wosl18_k$());
      } else {
        var tail_0 = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$()).get_prev_wosl18_k$();
        tail_0 = ensureNotNull(tail_0).push_wd62e0_k$(segmentToMove);
        tail_0.compact_dawvql_k$();
      }
      source.set_size_9bzqhs_k$(source.get_size_woubt6_k$().minus_mfbszm_k$(movedByteCount));
      _this__u8e3s4.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$().plus_r93sks_k$(movedByteCount));
      byteCount_0 = byteCount_0.minus_mfbszm_k$(movedByteCount);
    }
  }
  function commonRead_1(_this__u8e3s4, sink, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    var byteCount_0 = byteCount;
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.internal.commonRead.<anonymous>' call
      var message = 'byteCount < 0: ' + byteCount_0.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) return new Long(-1, -1);
    if (byteCount_0.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) > 0)
      byteCount_0 = _this__u8e3s4.get_size_woubt6_k$();
    sink.write_f49az7_k$(_this__u8e3s4, byteCount_0);
    return byteCount_0;
  }
  function commonIndexOf(_this__u8e3s4, b, fromIndex, toIndex) {
    _init_properties_Buffer_kt__ndcom8();
    var fromIndex_0 = fromIndex;
    var toIndex_0 = toIndex;
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(new Long(0, 0).compareTo_9jj042_k$(fromIndex_0) <= 0 ? fromIndex_0.compareTo_9jj042_k$(toIndex_0) <= 0 : false)
    ) {
      // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
      var message =
        'size=' +
        _this__u8e3s4.get_size_woubt6_k$().toString() +
        ' fromIndex=' +
        fromIndex_0.toString() +
        ' toIndex=' +
        toIndex_0.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    if (toIndex_0.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) > 0)
      toIndex_0 = _this__u8e3s4.get_size_woubt6_k$();
    if (fromIndex_0.equals(toIndex_0)) return new Long(-1, -1);
    // Inline function 'okio.internal.seek' call
    var fromIndex_1 = fromIndex_0;
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      var offset = new Long(-1, -1);
      var tmp_0;
      if (null == null) {
        return new Long(-1, -1);
      } else {
        tmp_0 = null;
      }
      var s = tmp_0;
      var offset_0 = offset;
      while (offset_0.compareTo_9jj042_k$(toIndex_0) < 0) {
        var data = s.get_data_wokkxf_k$();
        // Inline function 'kotlin.comparisons.minOf' call
        var a = toLong(s.get_limit_iuokuq_k$());
        var b_0 = numberToLong(s.get_pos_18iyad_k$()).plus_r93sks_k$(toIndex_0).minus_mfbszm_k$(offset_0);
        var limit = (a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0).toInt_1tsl84_k$();
        var pos = numberToLong(s.get_pos_18iyad_k$())
          .plus_r93sks_k$(fromIndex_0)
          .minus_mfbszm_k$(offset_0)
          .toInt_1tsl84_k$();
        while (pos < limit) {
          if (data[pos] === b) {
            return numberToLong((pos - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
          }
          pos = (pos + 1) | 0;
        }
        offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
        fromIndex_0 = offset_0;
        s = ensureNotNull(s.get_next_wor1vg_k$());
      }
      return new Long(-1, -1);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var s_0 = tmp;
    if (_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(fromIndex_1).compareTo_9jj042_k$(fromIndex_1) < 0) {
      var offset_1 = _this__u8e3s4.get_size_woubt6_k$();
      while (offset_1.compareTo_9jj042_k$(fromIndex_1) > 0) {
        s_0 = ensureNotNull(s_0.get_prev_wosl18_k$());
        offset_1 = offset_1.minus_mfbszm_k$(toLong((s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0));
      }
      var s_1 = s_0;
      var offset_2 = offset_1;
      var tmp_1;
      if (s_1 == null) {
        return new Long(-1, -1);
      } else {
        tmp_1 = s_1;
      }
      var s_2 = tmp_1;
      var offset_3 = offset_2;
      while (offset_3.compareTo_9jj042_k$(toIndex_0) < 0) {
        var data_0 = s_2.get_data_wokkxf_k$();
        // Inline function 'kotlin.comparisons.minOf' call
        var a_0 = toLong(s_2.get_limit_iuokuq_k$());
        var b_1 = numberToLong(s_2.get_pos_18iyad_k$()).plus_r93sks_k$(toIndex_0).minus_mfbszm_k$(offset_3);
        var limit_0 = (a_0.compareTo_9jj042_k$(b_1) <= 0 ? a_0 : b_1).toInt_1tsl84_k$();
        var pos_0 = numberToLong(s_2.get_pos_18iyad_k$())
          .plus_r93sks_k$(fromIndex_0)
          .minus_mfbszm_k$(offset_3)
          .toInt_1tsl84_k$();
        while (pos_0 < limit_0) {
          if (data_0[pos_0] === b) {
            return numberToLong((pos_0 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
          }
          pos_0 = (pos_0 + 1) | 0;
        }
        offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
        fromIndex_0 = offset_3;
        s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
      }
      return new Long(-1, -1);
    } else {
      var offset_4 = new Long(0, 0);
      $l$loop: while (true) {
        // Inline function 'kotlin.Long.plus' call
        var this_0 = offset_4;
        var other = (s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0;
        var nextOffset = this_0.plus_r93sks_k$(toLong(other));
        if (nextOffset.compareTo_9jj042_k$(fromIndex_1) > 0) break $l$loop;
        s_0 = ensureNotNull(s_0.get_next_wor1vg_k$());
        offset_4 = nextOffset;
      }
      var s_3 = s_0;
      var offset_5 = offset_4;
      var tmp_2;
      if (s_3 == null) {
        return new Long(-1, -1);
      } else {
        tmp_2 = s_3;
      }
      var s_4 = tmp_2;
      var offset_6 = offset_5;
      while (offset_6.compareTo_9jj042_k$(toIndex_0) < 0) {
        var data_1 = s_4.get_data_wokkxf_k$();
        // Inline function 'kotlin.comparisons.minOf' call
        var a_1 = toLong(s_4.get_limit_iuokuq_k$());
        var b_2 = numberToLong(s_4.get_pos_18iyad_k$()).plus_r93sks_k$(toIndex_0).minus_mfbszm_k$(offset_6);
        var limit_1 = (a_1.compareTo_9jj042_k$(b_2) <= 0 ? a_1 : b_2).toInt_1tsl84_k$();
        var pos_1 = numberToLong(s_4.get_pos_18iyad_k$())
          .plus_r93sks_k$(fromIndex_0)
          .minus_mfbszm_k$(offset_6)
          .toInt_1tsl84_k$();
        while (pos_1 < limit_1) {
          if (data_1[pos_1] === b) {
            return numberToLong((pos_1 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
          }
          pos_1 = (pos_1 + 1) | 0;
        }
        offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
        fromIndex_0 = offset_6;
        s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
      }
      return new Long(-1, -1);
    }
  }
  function commonIndexOf_0(_this__u8e3s4, bytes, fromIndex) {
    _init_properties_Buffer_kt__ndcom8();
    var fromIndex_0 = fromIndex;
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(bytes.get_size_woubt6_k$() > 0)) {
      // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
      var message = 'bytes is empty';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(fromIndex_0.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
      var message_0 = 'fromIndex < 0: ' + fromIndex_0.toString();
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    // Inline function 'okio.internal.seek' call
    var fromIndex_1 = fromIndex_0;
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      var offset = new Long(-1, -1);
      var tmp_0;
      if (null == null) {
        return new Long(-1, -1);
      } else {
        tmp_0 = null;
      }
      var s = tmp_0;
      var offset_0 = offset;
      var targetByteArray = bytes.internalArray_tr176k_k$();
      var b0 = targetByteArray[0];
      var bytesSize = bytes.get_size_woubt6_k$();
      // Inline function 'kotlin.Long.minus' call
      var resultLimit = _this__u8e3s4
        .get_size_woubt6_k$()
        .minus_mfbszm_k$(toLong(bytesSize))
        .plus_r93sks_k$(new Long(1, 0));
      while (offset_0.compareTo_9jj042_k$(resultLimit) < 0) {
        var data = s.get_data_wokkxf_k$();
        // Inline function 'okio.minOf' call
        var a = s.get_limit_iuokuq_k$();
        var b = numberToLong(s.get_pos_18iyad_k$()).plus_r93sks_k$(resultLimit).minus_mfbszm_k$(offset_0);
        // Inline function 'kotlin.comparisons.minOf' call
        var a_0 = toLong(a);
        var segmentLimit = (a_0.compareTo_9jj042_k$(b) <= 0 ? a_0 : b).toInt_1tsl84_k$();
        var inductionVariable = numberToLong(s.get_pos_18iyad_k$())
          .plus_r93sks_k$(fromIndex_0)
          .minus_mfbszm_k$(offset_0)
          .toInt_1tsl84_k$();
        if (inductionVariable < segmentLimit)
          do {
            var pos = inductionVariable;
            inductionVariable = (inductionVariable + 1) | 0;
            if (data[pos] === b0 ? rangeEquals(s, (pos + 1) | 0, targetByteArray, 1, bytesSize) : false) {
              return numberToLong((pos - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
            }
          } while (inductionVariable < segmentLimit);
        offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
        fromIndex_0 = offset_0;
        s = ensureNotNull(s.get_next_wor1vg_k$());
      }
      return new Long(-1, -1);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var s_0 = tmp;
    if (_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(fromIndex_1).compareTo_9jj042_k$(fromIndex_1) < 0) {
      var offset_1 = _this__u8e3s4.get_size_woubt6_k$();
      while (offset_1.compareTo_9jj042_k$(fromIndex_1) > 0) {
        s_0 = ensureNotNull(s_0.get_prev_wosl18_k$());
        offset_1 = offset_1.minus_mfbszm_k$(toLong((s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0));
      }
      var s_1 = s_0;
      var offset_2 = offset_1;
      var tmp_1;
      if (s_1 == null) {
        return new Long(-1, -1);
      } else {
        tmp_1 = s_1;
      }
      var s_2 = tmp_1;
      var offset_3 = offset_2;
      var targetByteArray_0 = bytes.internalArray_tr176k_k$();
      var b0_0 = targetByteArray_0[0];
      var bytesSize_0 = bytes.get_size_woubt6_k$();
      // Inline function 'kotlin.Long.minus' call
      var resultLimit_0 = _this__u8e3s4
        .get_size_woubt6_k$()
        .minus_mfbszm_k$(toLong(bytesSize_0))
        .plus_r93sks_k$(new Long(1, 0));
      while (offset_3.compareTo_9jj042_k$(resultLimit_0) < 0) {
        var data_0 = s_2.get_data_wokkxf_k$();
        // Inline function 'okio.minOf' call
        var a_1 = s_2.get_limit_iuokuq_k$();
        var b_0 = numberToLong(s_2.get_pos_18iyad_k$()).plus_r93sks_k$(resultLimit_0).minus_mfbszm_k$(offset_3);
        // Inline function 'kotlin.comparisons.minOf' call
        var a_2 = toLong(a_1);
        var segmentLimit_0 = (a_2.compareTo_9jj042_k$(b_0) <= 0 ? a_2 : b_0).toInt_1tsl84_k$();
        var inductionVariable_0 = numberToLong(s_2.get_pos_18iyad_k$())
          .plus_r93sks_k$(fromIndex_0)
          .minus_mfbszm_k$(offset_3)
          .toInt_1tsl84_k$();
        if (inductionVariable_0 < segmentLimit_0)
          do {
            var pos_0 = inductionVariable_0;
            inductionVariable_0 = (inductionVariable_0 + 1) | 0;
            if (data_0[pos_0] === b0_0 ? rangeEquals(s_2, (pos_0 + 1) | 0, targetByteArray_0, 1, bytesSize_0) : false) {
              return numberToLong((pos_0 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
            }
          } while (inductionVariable_0 < segmentLimit_0);
        offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
        fromIndex_0 = offset_3;
        s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
      }
      return new Long(-1, -1);
    } else {
      var offset_4 = new Long(0, 0);
      $l$loop: while (true) {
        // Inline function 'kotlin.Long.plus' call
        var this_0 = offset_4;
        var other = (s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0;
        var nextOffset = this_0.plus_r93sks_k$(toLong(other));
        if (nextOffset.compareTo_9jj042_k$(fromIndex_1) > 0) break $l$loop;
        s_0 = ensureNotNull(s_0.get_next_wor1vg_k$());
        offset_4 = nextOffset;
      }
      var s_3 = s_0;
      var offset_5 = offset_4;
      var tmp_2;
      if (s_3 == null) {
        return new Long(-1, -1);
      } else {
        tmp_2 = s_3;
      }
      var s_4 = tmp_2;
      var offset_6 = offset_5;
      var targetByteArray_1 = bytes.internalArray_tr176k_k$();
      var b0_1 = targetByteArray_1[0];
      var bytesSize_1 = bytes.get_size_woubt6_k$();
      // Inline function 'kotlin.Long.minus' call
      var resultLimit_1 = _this__u8e3s4
        .get_size_woubt6_k$()
        .minus_mfbszm_k$(toLong(bytesSize_1))
        .plus_r93sks_k$(new Long(1, 0));
      while (offset_6.compareTo_9jj042_k$(resultLimit_1) < 0) {
        var data_1 = s_4.get_data_wokkxf_k$();
        // Inline function 'okio.minOf' call
        var a_3 = s_4.get_limit_iuokuq_k$();
        var b_1 = numberToLong(s_4.get_pos_18iyad_k$()).plus_r93sks_k$(resultLimit_1).minus_mfbszm_k$(offset_6);
        // Inline function 'kotlin.comparisons.minOf' call
        var a_4 = toLong(a_3);
        var segmentLimit_1 = (a_4.compareTo_9jj042_k$(b_1) <= 0 ? a_4 : b_1).toInt_1tsl84_k$();
        var inductionVariable_1 = numberToLong(s_4.get_pos_18iyad_k$())
          .plus_r93sks_k$(fromIndex_0)
          .minus_mfbszm_k$(offset_6)
          .toInt_1tsl84_k$();
        if (inductionVariable_1 < segmentLimit_1)
          do {
            var pos_1 = inductionVariable_1;
            inductionVariable_1 = (inductionVariable_1 + 1) | 0;
            if (data_1[pos_1] === b0_1 ? rangeEquals(s_4, (pos_1 + 1) | 0, targetByteArray_1, 1, bytesSize_1) : false) {
              return numberToLong((pos_1 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
            }
          } while (inductionVariable_1 < segmentLimit_1);
        offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
        fromIndex_0 = offset_6;
        s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
      }
      return new Long(-1, -1);
    }
  }
  function commonIndexOfElement(_this__u8e3s4, targetBytes, fromIndex) {
    _init_properties_Buffer_kt__ndcom8();
    var fromIndex_0 = fromIndex;
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(fromIndex_0.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.internal.commonIndexOfElement.<anonymous>' call
      var message = 'fromIndex < 0: ' + fromIndex_0.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'okio.internal.seek' call
    var fromIndex_1 = fromIndex_0;
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      var offset = new Long(-1, -1);
      var tmp_0;
      if (null == null) {
        return new Long(-1, -1);
      } else {
        tmp_0 = null;
      }
      var s = tmp_0;
      var offset_0 = offset;
      if (targetBytes.get_size_woubt6_k$() === 2) {
        var b0 = targetBytes.get_c1px32_k$(0);
        var b1 = targetBytes.get_c1px32_k$(1);
        while (offset_0.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
          var data = s.get_data_wokkxf_k$();
          var pos = numberToLong(s.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_0)
            .toInt_1tsl84_k$();
          var limit = s.get_limit_iuokuq_k$();
          while (pos < limit) {
            var b = data[pos];
            if (b === b0 ? true : b === b1) {
              return numberToLong((pos - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
            }
            pos = (pos + 1) | 0;
          }
          offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_0;
          s = ensureNotNull(s.get_next_wor1vg_k$());
        }
      } else {
        var targetByteArray = targetBytes.internalArray_tr176k_k$();
        while (offset_0.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
          var data_0 = s.get_data_wokkxf_k$();
          var pos_0 = numberToLong(s.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_0)
            .toInt_1tsl84_k$();
          var limit_0 = s.get_limit_iuokuq_k$();
          while (pos_0 < limit_0) {
            var b_0 = data_0[pos_0];
            var inductionVariable = 0;
            var last = targetByteArray.length;
            while (inductionVariable < last) {
              var t = targetByteArray[inductionVariable];
              inductionVariable = (inductionVariable + 1) | 0;
              if (b_0 === t) return numberToLong((pos_0 - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
            }
            pos_0 = (pos_0 + 1) | 0;
          }
          offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_0;
          s = ensureNotNull(s.get_next_wor1vg_k$());
        }
      }
      return new Long(-1, -1);
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var s_0 = tmp;
    if (_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(fromIndex_1).compareTo_9jj042_k$(fromIndex_1) < 0) {
      var offset_1 = _this__u8e3s4.get_size_woubt6_k$();
      while (offset_1.compareTo_9jj042_k$(fromIndex_1) > 0) {
        s_0 = ensureNotNull(s_0.get_prev_wosl18_k$());
        offset_1 = offset_1.minus_mfbszm_k$(toLong((s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0));
      }
      var s_1 = s_0;
      var offset_2 = offset_1;
      var tmp_1;
      if (s_1 == null) {
        return new Long(-1, -1);
      } else {
        tmp_1 = s_1;
      }
      var s_2 = tmp_1;
      var offset_3 = offset_2;
      if (targetBytes.get_size_woubt6_k$() === 2) {
        var b0_0 = targetBytes.get_c1px32_k$(0);
        var b1_0 = targetBytes.get_c1px32_k$(1);
        while (offset_3.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
          var data_1 = s_2.get_data_wokkxf_k$();
          var pos_1 = numberToLong(s_2.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_3)
            .toInt_1tsl84_k$();
          var limit_1 = s_2.get_limit_iuokuq_k$();
          while (pos_1 < limit_1) {
            var b_1 = data_1[pos_1];
            if (b_1 === b0_0 ? true : b_1 === b1_0) {
              return numberToLong((pos_1 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
            }
            pos_1 = (pos_1 + 1) | 0;
          }
          offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_3;
          s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
        }
      } else {
        var targetByteArray_0 = targetBytes.internalArray_tr176k_k$();
        while (offset_3.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
          var data_2 = s_2.get_data_wokkxf_k$();
          var pos_2 = numberToLong(s_2.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_3)
            .toInt_1tsl84_k$();
          var limit_2 = s_2.get_limit_iuokuq_k$();
          while (pos_2 < limit_2) {
            var b_2 = data_2[pos_2];
            var inductionVariable_0 = 0;
            var last_0 = targetByteArray_0.length;
            while (inductionVariable_0 < last_0) {
              var t_0 = targetByteArray_0[inductionVariable_0];
              inductionVariable_0 = (inductionVariable_0 + 1) | 0;
              if (b_2 === t_0) return numberToLong((pos_2 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
            }
            pos_2 = (pos_2 + 1) | 0;
          }
          offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_3;
          s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
        }
      }
      return new Long(-1, -1);
    } else {
      var offset_4 = new Long(0, 0);
      $l$loop: while (true) {
        // Inline function 'kotlin.Long.plus' call
        var this_0 = offset_4;
        var other = (s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0;
        var nextOffset = this_0.plus_r93sks_k$(toLong(other));
        if (nextOffset.compareTo_9jj042_k$(fromIndex_1) > 0) break $l$loop;
        s_0 = ensureNotNull(s_0.get_next_wor1vg_k$());
        offset_4 = nextOffset;
      }
      var s_3 = s_0;
      var offset_5 = offset_4;
      var tmp_2;
      if (s_3 == null) {
        return new Long(-1, -1);
      } else {
        tmp_2 = s_3;
      }
      var s_4 = tmp_2;
      var offset_6 = offset_5;
      if (targetBytes.get_size_woubt6_k$() === 2) {
        var b0_1 = targetBytes.get_c1px32_k$(0);
        var b1_1 = targetBytes.get_c1px32_k$(1);
        while (offset_6.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
          var data_3 = s_4.get_data_wokkxf_k$();
          var pos_3 = numberToLong(s_4.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_6)
            .toInt_1tsl84_k$();
          var limit_3 = s_4.get_limit_iuokuq_k$();
          while (pos_3 < limit_3) {
            var b_3 = data_3[pos_3];
            if (b_3 === b0_1 ? true : b_3 === b1_1) {
              return numberToLong((pos_3 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
            }
            pos_3 = (pos_3 + 1) | 0;
          }
          offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_6;
          s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
        }
      } else {
        var targetByteArray_1 = targetBytes.internalArray_tr176k_k$();
        while (offset_6.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
          var data_4 = s_4.get_data_wokkxf_k$();
          var pos_4 = numberToLong(s_4.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_6)
            .toInt_1tsl84_k$();
          var limit_4 = s_4.get_limit_iuokuq_k$();
          while (pos_4 < limit_4) {
            var b_4 = data_4[pos_4];
            var inductionVariable_1 = 0;
            var last_1 = targetByteArray_1.length;
            while (inductionVariable_1 < last_1) {
              var t_1 = targetByteArray_1[inductionVariable_1];
              inductionVariable_1 = (inductionVariable_1 + 1) | 0;
              if (b_4 === t_1) return numberToLong((pos_4 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
            }
            pos_4 = (pos_4 + 1) | 0;
          }
          offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_6;
          s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
        }
      }
      return new Long(-1, -1);
    }
  }
  function commonRangeEquals(_this__u8e3s4, offset, bytes, bytesOffset, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    if (
      (
        ((offset.compareTo_9jj042_k$(new Long(0, 0)) < 0 ? true : bytesOffset < 0) ? true : byteCount < 0)
          ? true
          : _this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(offset).compareTo_9jj042_k$(toLong(byteCount)) < 0
      )
        ? true
        : ((bytes.get_size_woubt6_k$() - bytesOffset) | 0) < byteCount
    ) {
      return false;
    }
    var inductionVariable = 0;
    if (inductionVariable < byteCount)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        // Inline function 'kotlin.Long.plus' call
        var tmp$ret$0 = offset.plus_r93sks_k$(toLong(i));
        if (!(_this__u8e3s4.get_ugtq3c_k$(tmp$ret$0) === bytes.get_c1px32_k$((bytesOffset + i) | 0))) {
          return false;
        }
      } while (inductionVariable < byteCount);
    return true;
  }
  function commonEquals(_this__u8e3s4, other) {
    _init_properties_Buffer_kt__ndcom8();
    if (_this__u8e3s4 === other) return true;
    if (!(other instanceof Buffer)) return false;
    if (!_this__u8e3s4.get_size_woubt6_k$().equals(other.get_size_woubt6_k$())) return false;
    if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) return true;
    var sa = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
    var sb = ensureNotNull(other.get_head_won7e1_k$());
    var posA = sa.get_pos_18iyad_k$();
    var posB = sb.get_pos_18iyad_k$();
    var pos = new Long(0, 0);
    var count;
    while (pos.compareTo_9jj042_k$(_this__u8e3s4.get_size_woubt6_k$()) < 0) {
      // Inline function 'kotlin.comparisons.minOf' call
      var a = (sa.get_limit_iuokuq_k$() - posA) | 0;
      var b = (sb.get_limit_iuokuq_k$() - posB) | 0;
      var tmp$ret$0 = Math.min(a, b);
      count = toLong(tmp$ret$0);
      var inductionVariable = new Long(0, 0);
      if (inductionVariable.compareTo_9jj042_k$(count) < 0)
        do {
          var i = inductionVariable;
          inductionVariable = inductionVariable.plus_r93sks_k$(new Long(1, 0));
          var tmp = sa.get_data_wokkxf_k$();
          var tmp1 = posA;
          posA = (tmp1 + 1) | 0;
          var tmp_0 = tmp[tmp1];
          var tmp_1 = sb.get_data_wokkxf_k$();
          var tmp2 = posB;
          posB = (tmp2 + 1) | 0;
          if (!(tmp_0 === tmp_1[tmp2])) return false;
        } while (inductionVariable.compareTo_9jj042_k$(count) < 0);
      if (posA === sa.get_limit_iuokuq_k$()) {
        sa = ensureNotNull(sa.get_next_wor1vg_k$());
        posA = sa.get_pos_18iyad_k$();
      }
      if (posB === sb.get_limit_iuokuq_k$()) {
        sb = ensureNotNull(sb.get_next_wor1vg_k$());
        posB = sb.get_pos_18iyad_k$();
      }
      pos = pos.plus_r93sks_k$(count);
    }
    return true;
  }
  function commonHashCode(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      return 0;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var s = tmp;
    var result = 1;
    do {
      var pos = s.get_pos_18iyad_k$();
      var limit = s.get_limit_iuokuq_k$();
      while (pos < limit) {
        result = (imul(31, result) + s.get_data_wokkxf_k$()[pos]) | 0;
        pos = (pos + 1) | 0;
      }
      s = ensureNotNull(s.get_next_wor1vg_k$());
    } while (!(s === _this__u8e3s4.get_head_won7e1_k$()));
    return result;
  }
  function commonCopy(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    var result = new Buffer();
    if (_this__u8e3s4.get_size_woubt6_k$().equals(new Long(0, 0))) return result;
    var head = ensureNotNull(_this__u8e3s4.get_head_won7e1_k$());
    var headCopy = head.sharedCopy_timhza_k$();
    result.set_head_iv937o_k$(headCopy);
    headCopy.set_prev_ur3dkn_k$(result.get_head_won7e1_k$());
    headCopy.set_next_tohs5l_k$(headCopy.get_prev_wosl18_k$());
    var s = head.get_next_wor1vg_k$();
    while (!(s === head)) {
      ensureNotNull(headCopy.get_prev_wosl18_k$()).push_wd62e0_k$(ensureNotNull(s).sharedCopy_timhza_k$());
      s = s.get_next_wor1vg_k$();
    }
    result.set_size_9bzqhs_k$(_this__u8e3s4.get_size_woubt6_k$());
    return result;
  }
  function commonSnapshot(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(
        _this__u8e3s4
          .get_size_woubt6_k$()
          .compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0
      )
    ) {
      // Inline function 'okio.internal.commonSnapshot.<anonymous>' call
      var message = 'size > Int.MAX_VALUE: ' + _this__u8e3s4.get_size_woubt6_k$().toString();
      throw IllegalStateException_init_$Create$(toString(message));
    }
    return _this__u8e3s4.snapshot_hwfoq4_k$(_this__u8e3s4.get_size_woubt6_k$().toInt_1tsl84_k$());
  }
  function commonSnapshot_0(_this__u8e3s4, byteCount) {
    _init_properties_Buffer_kt__ndcom8();
    if (byteCount === 0) return Companion_getInstance_7().get_EMPTY_i8q41w_k$();
    checkOffsetAndCount(_this__u8e3s4.get_size_woubt6_k$(), new Long(0, 0), toLong(byteCount));
    var offset = 0;
    var segmentCount = 0;
    var s = _this__u8e3s4.get_head_won7e1_k$();
    while (offset < byteCount) {
      if (ensureNotNull(s).get_limit_iuokuq_k$() === s.get_pos_18iyad_k$()) {
        throw AssertionError_init_$Create$('s.limit == s.pos');
      }
      offset = (offset + ((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0)) | 0;
      segmentCount = (segmentCount + 1) | 0;
      s = s.get_next_wor1vg_k$();
    }
    // Inline function 'kotlin.arrayOfNulls' call
    var size = segmentCount;
    var segments = fillArrayVal(Array(size), null);
    var directory = new Int32Array(imul(segmentCount, 2));
    offset = 0;
    segmentCount = 0;
    s = _this__u8e3s4.get_head_won7e1_k$();
    while (offset < byteCount) {
      segments[segmentCount] = ensureNotNull(s).get_data_wokkxf_k$();
      offset = (offset + ((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0)) | 0;
      var tmp = segmentCount;
      // Inline function 'kotlin.comparisons.minOf' call
      var a = offset;
      directory[tmp] = Math.min(a, byteCount);
      directory[(segmentCount + segments.length) | 0] = s.get_pos_18iyad_k$();
      s.set_shared_67kjx_k$(true);
      segmentCount = (segmentCount + 1) | 0;
      s = s.get_next_wor1vg_k$();
    }
    return new SegmentedByteString(isArray(segments) ? segments : THROW_CCE(), directory);
  }
  function commonReadUnsafe(_this__u8e3s4, unsafeCursor) {
    _init_properties_Buffer_kt__ndcom8();
    var unsafeCursor_0 = resolveDefaultParameter_1(unsafeCursor);
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(unsafeCursor_0.get_buffer_bmaafd_k$() == null)) {
      // Inline function 'okio.internal.commonReadUnsafe.<anonymous>' call
      var message = 'already attached to a buffer';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    unsafeCursor_0.set_buffer_av52bi_k$(_this__u8e3s4);
    unsafeCursor_0.set_readWrite_85z6rb_k$(false);
    return unsafeCursor_0;
  }
  function commonReadAndWriteUnsafe(_this__u8e3s4, unsafeCursor) {
    _init_properties_Buffer_kt__ndcom8();
    var unsafeCursor_0 = resolveDefaultParameter_1(unsafeCursor);
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(unsafeCursor_0.get_buffer_bmaafd_k$() == null)) {
      // Inline function 'okio.internal.commonReadAndWriteUnsafe.<anonymous>' call
      var message = 'already attached to a buffer';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    unsafeCursor_0.set_buffer_av52bi_k$(_this__u8e3s4);
    unsafeCursor_0.set_readWrite_85z6rb_k$(true);
    return unsafeCursor_0;
  }
  function commonNext(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !!_this__u8e3s4
        .get_offset_hjmqak_k$()
        .equals(ensureNotNull(_this__u8e3s4.get_buffer_bmaafd_k$()).get_size_woubt6_k$())
    ) {
      // Inline function 'okio.internal.commonNext.<anonymous>' call
      var message = 'no more bytes';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    var tmp;
    if (_this__u8e3s4.get_offset_hjmqak_k$().equals(new Long(-1, -1))) {
      tmp = _this__u8e3s4.seek_de9ugm_k$(new Long(0, 0));
    } else {
      // Inline function 'kotlin.Long.plus' call
      var this_0 = _this__u8e3s4.get_offset_hjmqak_k$();
      var other = (_this__u8e3s4.get_end_18j6ha_k$() - _this__u8e3s4.get_start_iypx6h_k$()) | 0;
      var tmp$ret$1 = this_0.plus_r93sks_k$(toLong(other));
      tmp = _this__u8e3s4.seek_de9ugm_k$(tmp$ret$1);
    }
    return tmp;
  }
  function commonSeek(_this__u8e3s4, offset) {
    _init_properties_Buffer_kt__ndcom8();
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.checkNotNull' call
      var value = _this__u8e3s4.get_buffer_bmaafd_k$();
      // Inline function 'kotlin.contracts.contract' call
      if (value == null) {
        // Inline function 'okio.internal.commonSeek.<anonymous>' call
        var message = 'not attached to a buffer';
        throw IllegalStateException_init_$Create$(toString(message));
      } else {
        tmp$ret$1 = value;
        break $l$block;
      }
    }
    var buffer = tmp$ret$1;
    if (
      offset.compareTo_9jj042_k$(new Long(-1, -1)) < 0
        ? true
        : offset.compareTo_9jj042_k$(buffer.get_size_woubt6_k$()) > 0
    ) {
      throw new ArrayIndexOutOfBoundsException(
        'offset=' + offset.toString() + ' > size=' + buffer.get_size_woubt6_k$().toString(),
      );
    }
    if (offset.equals(new Long(-1, -1)) ? true : offset.equals(buffer.get_size_woubt6_k$())) {
      _this__u8e3s4.set_segment_kblzx9_k$(null);
      _this__u8e3s4.set_offset_snb08i_k$(offset);
      _this__u8e3s4.set_data_zi6csw_k$(null);
      _this__u8e3s4.set_start_x5zd0j_k$(-1);
      _this__u8e3s4.set_end_2o0hu2_k$(-1);
      return -1;
    }
    var min = new Long(0, 0);
    var max = buffer.get_size_woubt6_k$();
    var head = buffer.get_head_won7e1_k$();
    var tail = buffer.get_head_won7e1_k$();
    if (!(_this__u8e3s4.get_segment_xwnoei_k$() == null)) {
      // Inline function 'kotlin.Long.minus' call
      var this_0 = _this__u8e3s4.get_offset_hjmqak_k$();
      var other =
        (_this__u8e3s4.get_start_iypx6h_k$() -
          ensureNotNull(_this__u8e3s4.get_segment_xwnoei_k$()).get_pos_18iyad_k$()) |
        0;
      var segmentOffset = this_0.minus_mfbszm_k$(toLong(other));
      if (segmentOffset.compareTo_9jj042_k$(offset) > 0) {
        max = segmentOffset;
        tail = _this__u8e3s4.get_segment_xwnoei_k$();
      } else {
        min = segmentOffset;
        head = _this__u8e3s4.get_segment_xwnoei_k$();
      }
    }
    var next;
    var nextOffset;
    if (max.minus_mfbszm_k$(offset).compareTo_9jj042_k$(offset.minus_mfbszm_k$(min)) > 0) {
      next = head;
      nextOffset = min;
      $l$loop: while (true) {
        // Inline function 'kotlin.Long.plus' call
        var this_1 = nextOffset;
        var other_0 = (ensureNotNull(next).get_limit_iuokuq_k$() - next.get_pos_18iyad_k$()) | 0;
        var tmp$ret$3 = this_1.plus_r93sks_k$(toLong(other_0));
        if (!(offset.compareTo_9jj042_k$(tmp$ret$3) >= 0)) {
          break $l$loop;
        }
        nextOffset = nextOffset.plus_r93sks_k$(toLong((next.get_limit_iuokuq_k$() - next.get_pos_18iyad_k$()) | 0));
        next = next.get_next_wor1vg_k$();
      }
    } else {
      next = tail;
      nextOffset = max;
      while (nextOffset.compareTo_9jj042_k$(offset) > 0) {
        next = ensureNotNull(next).get_prev_wosl18_k$();
        nextOffset = nextOffset.minus_mfbszm_k$(
          toLong((ensureNotNull(next).get_limit_iuokuq_k$() - next.get_pos_18iyad_k$()) | 0),
        );
      }
    }
    if (_this__u8e3s4.get_readWrite_a0tpds_k$() ? ensureNotNull(next).get_shared_jgtlda_k$() : false) {
      var unsharedNext = next.unsharedCopy_5kj8b7_k$();
      if (buffer.get_head_won7e1_k$() === next) {
        buffer.set_head_iv937o_k$(unsharedNext);
      }
      next = next.push_wd62e0_k$(unsharedNext);
      ensureNotNull(next.get_prev_wosl18_k$()).pop_2dsh_k$();
    }
    _this__u8e3s4.set_segment_kblzx9_k$(next);
    _this__u8e3s4.set_offset_snb08i_k$(offset);
    _this__u8e3s4.set_data_zi6csw_k$(ensureNotNull(next).get_data_wokkxf_k$());
    _this__u8e3s4.set_start_x5zd0j_k$(
      (next.get_pos_18iyad_k$() + offset.minus_mfbszm_k$(nextOffset).toInt_1tsl84_k$()) | 0,
    );
    _this__u8e3s4.set_end_2o0hu2_k$(next.get_limit_iuokuq_k$());
    return (_this__u8e3s4.get_end_18j6ha_k$() - _this__u8e3s4.get_start_iypx6h_k$()) | 0;
  }
  function commonResizeBuffer(_this__u8e3s4, newSize) {
    _init_properties_Buffer_kt__ndcom8();
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.checkNotNull' call
      var value = _this__u8e3s4.get_buffer_bmaafd_k$();
      // Inline function 'kotlin.contracts.contract' call
      if (value == null) {
        // Inline function 'okio.internal.commonResizeBuffer.<anonymous>' call
        var message = 'not attached to a buffer';
        throw IllegalStateException_init_$Create$(toString(message));
      } else {
        tmp$ret$1 = value;
        break $l$block;
      }
    }
    var buffer = tmp$ret$1;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!_this__u8e3s4.get_readWrite_a0tpds_k$()) {
      // Inline function 'okio.internal.commonResizeBuffer.<anonymous>' call
      var message_0 = 'resizeBuffer() only permitted for read/write buffers';
      throw IllegalStateException_init_$Create$(toString(message_0));
    }
    var oldSize = buffer.get_size_woubt6_k$();
    if (newSize.compareTo_9jj042_k$(oldSize) <= 0) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(newSize.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonResizeBuffer.<anonymous>' call
        var message_1 = 'newSize < 0: ' + newSize.toString();
        throw IllegalArgumentException_init_$Create$(toString(message_1));
      }
      var bytesToSubtract = oldSize.minus_mfbszm_k$(newSize);
      $l$loop: while (bytesToSubtract.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        var tail = ensureNotNull(buffer.get_head_won7e1_k$()).get_prev_wosl18_k$();
        var tailSize = (ensureNotNull(tail).get_limit_iuokuq_k$() - tail.get_pos_18iyad_k$()) | 0;
        if (toLong(tailSize).compareTo_9jj042_k$(bytesToSubtract) <= 0) {
          buffer.set_head_iv937o_k$(tail.pop_2dsh_k$());
          SegmentPool_getInstance().recycle_ipeoxr_k$(tail);
          bytesToSubtract = bytesToSubtract.minus_mfbszm_k$(toLong(tailSize));
        } else {
          tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() - bytesToSubtract.toInt_1tsl84_k$()) | 0);
          break $l$loop;
        }
      }
      _this__u8e3s4.set_segment_kblzx9_k$(null);
      _this__u8e3s4.set_offset_snb08i_k$(newSize);
      _this__u8e3s4.set_data_zi6csw_k$(null);
      _this__u8e3s4.set_start_x5zd0j_k$(-1);
      _this__u8e3s4.set_end_2o0hu2_k$(-1);
    } else if (newSize.compareTo_9jj042_k$(oldSize) > 0) {
      var needsToSeek = true;
      var bytesToAdd = newSize.minus_mfbszm_k$(oldSize);
      while (bytesToAdd.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        var tail_0 = buffer.writableSegment_i90lmt_k$(1);
        // Inline function 'okio.minOf' call
        var a = bytesToAdd;
        var b = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - tail_0.get_limit_iuokuq_k$()) | 0;
        // Inline function 'kotlin.comparisons.minOf' call
        var b_0 = toLong(b);
        var segmentBytesToAdd = (a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0).toInt_1tsl84_k$();
        tail_0.set_limit_mo5fx2_k$((tail_0.get_limit_iuokuq_k$() + segmentBytesToAdd) | 0);
        bytesToAdd = bytesToAdd.minus_mfbszm_k$(toLong(segmentBytesToAdd));
        if (needsToSeek) {
          _this__u8e3s4.set_segment_kblzx9_k$(tail_0);
          _this__u8e3s4.set_offset_snb08i_k$(oldSize);
          _this__u8e3s4.set_data_zi6csw_k$(tail_0.get_data_wokkxf_k$());
          _this__u8e3s4.set_start_x5zd0j_k$((tail_0.get_limit_iuokuq_k$() - segmentBytesToAdd) | 0);
          _this__u8e3s4.set_end_2o0hu2_k$(tail_0.get_limit_iuokuq_k$());
          needsToSeek = false;
        }
      }
    }
    buffer.set_size_9bzqhs_k$(newSize);
    return oldSize;
  }
  function commonExpandBuffer(_this__u8e3s4, minByteCount) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(minByteCount > 0)) {
      // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
      var message = 'minByteCount <= 0: ' + minByteCount;
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(minByteCount <= Companion_getInstance_1().get_SIZE_wo97pm_k$())) {
      // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
      var message_0 = 'minByteCount > Segment.SIZE: ' + minByteCount;
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    var tmp$ret$3;
    $l$block: {
      // Inline function 'kotlin.checkNotNull' call
      var value = _this__u8e3s4.get_buffer_bmaafd_k$();
      // Inline function 'kotlin.contracts.contract' call
      if (value == null) {
        // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
        var message_1 = 'not attached to a buffer';
        throw IllegalStateException_init_$Create$(toString(message_1));
      } else {
        tmp$ret$3 = value;
        break $l$block;
      }
    }
    var buffer = tmp$ret$3;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!_this__u8e3s4.get_readWrite_a0tpds_k$()) {
      // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
      var message_2 = 'expandBuffer() only permitted for read/write buffers';
      throw IllegalStateException_init_$Create$(toString(message_2));
    }
    var oldSize = buffer.get_size_woubt6_k$();
    var tail = buffer.writableSegment_i90lmt_k$(minByteCount);
    var result = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - tail.get_limit_iuokuq_k$()) | 0;
    tail.set_limit_mo5fx2_k$(Companion_getInstance_1().get_SIZE_wo97pm_k$());
    // Inline function 'kotlin.Long.plus' call
    var tmp$ret$5 = oldSize.plus_r93sks_k$(toLong(result));
    buffer.set_size_9bzqhs_k$(tmp$ret$5);
    _this__u8e3s4.set_segment_kblzx9_k$(tail);
    _this__u8e3s4.set_offset_snb08i_k$(oldSize);
    _this__u8e3s4.set_data_zi6csw_k$(tail.get_data_wokkxf_k$());
    _this__u8e3s4.set_start_x5zd0j_k$((Companion_getInstance_1().get_SIZE_wo97pm_k$() - result) | 0);
    _this__u8e3s4.set_end_2o0hu2_k$(Companion_getInstance_1().get_SIZE_wo97pm_k$());
    return toLong(result);
  }
  function commonClose(_this__u8e3s4) {
    _init_properties_Buffer_kt__ndcom8();
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!(_this__u8e3s4.get_buffer_bmaafd_k$() == null)) {
      // Inline function 'okio.internal.commonClose.<anonymous>' call
      var message = 'not attached to a buffer';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    _this__u8e3s4.set_buffer_av52bi_k$(null);
    _this__u8e3s4.set_segment_kblzx9_k$(null);
    _this__u8e3s4.set_offset_snb08i_k$(new Long(-1, -1));
    _this__u8e3s4.set_data_zi6csw_k$(null);
    _this__u8e3s4.set_start_x5zd0j_k$(-1);
    _this__u8e3s4.set_end_2o0hu2_k$(-1);
  }
  function seek(_this__u8e3s4, fromIndex, lambda) {
    _init_properties_Buffer_kt__ndcom8();
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      return lambda(null, new Long(-1, -1));
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var s = tmp;
    if (_this__u8e3s4.get_size_woubt6_k$().minus_mfbszm_k$(fromIndex).compareTo_9jj042_k$(fromIndex) < 0) {
      var offset = _this__u8e3s4.get_size_woubt6_k$();
      while (offset.compareTo_9jj042_k$(fromIndex) > 0) {
        s = ensureNotNull(s.get_prev_wosl18_k$());
        offset = offset.minus_mfbszm_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
      }
      return lambda(s, offset);
    } else {
      var offset_0 = new Long(0, 0);
      $l$loop: while (true) {
        // Inline function 'kotlin.Long.plus' call
        var this_0 = offset_0;
        var other = (s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0;
        var nextOffset = this_0.plus_r93sks_k$(toLong(other));
        if (nextOffset.compareTo_9jj042_k$(fromIndex) > 0) break $l$loop;
        s = ensureNotNull(s.get_next_wor1vg_k$());
        offset_0 = nextOffset;
      }
      return lambda(s, offset_0);
    }
  }
  function get_OVERFLOW_DIGIT_START() {
    return OVERFLOW_DIGIT_START;
  }
  var OVERFLOW_DIGIT_START;
  function get_OVERFLOW_ZONE() {
    return OVERFLOW_ZONE;
  }
  var OVERFLOW_ZONE;
  function get_SEGMENTING_THRESHOLD() {
    return SEGMENTING_THRESHOLD;
  }
  var SEGMENTING_THRESHOLD;
  function readUtf8Line(_this__u8e3s4, newline) {
    _init_properties_Buffer_kt__ndcom8();
    var tmp;
    var tmp_0;
    if (newline.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      // Inline function 'kotlin.Long.minus' call
      var tmp$ret$0 = newline.minus_mfbszm_k$(toLong(1));
      tmp_0 = _this__u8e3s4.get_ugtq3c_k$(tmp$ret$0) === 13;
    } else {
      tmp_0 = false;
    }
    if (tmp_0) {
      var result = _this__u8e3s4.readUtf8_pe0fc7_k$(newline.minus_mfbszm_k$(new Long(1, 0)));
      _this__u8e3s4.skip_bgd4sf_k$(new Long(2, 0));
      tmp = result;
    } else {
      var result_0 = _this__u8e3s4.readUtf8_pe0fc7_k$(newline);
      _this__u8e3s4.skip_bgd4sf_k$(new Long(1, 0));
      tmp = result_0;
    }
    return tmp;
  }
  function selectPrefix(_this__u8e3s4, options, selectTruncated) {
    selectTruncated = selectTruncated === VOID ? false : selectTruncated;
    _init_properties_Buffer_kt__ndcom8();
    var tmp0_elvis_lhs = _this__u8e3s4.get_head_won7e1_k$();
    var tmp;
    if (tmp0_elvis_lhs == null) {
      return selectTruncated ? -2 : -1;
    } else {
      tmp = tmp0_elvis_lhs;
    }
    var head = tmp;
    var s = head;
    var data = head.get_data_wokkxf_k$();
    var pos = head.get_pos_18iyad_k$();
    var limit = head.get_limit_iuokuq_k$();
    var trie = options.get_trie_wov52b_k$();
    var triePos = 0;
    var prefixIndex = -1;
    navigateTrie: while (true) {
      var tmp1 = triePos;
      triePos = (tmp1 + 1) | 0;
      var scanOrSelect = trie[tmp1];
      var tmp2 = triePos;
      triePos = (tmp2 + 1) | 0;
      var possiblePrefixIndex = trie[tmp2];
      if (!(possiblePrefixIndex === -1)) {
        prefixIndex = possiblePrefixIndex;
      }
      var nextStep;
      if (s == null) {
        break navigateTrie;
      } else if (scanOrSelect < 0) {
        var scanByteCount = imul(-1, scanOrSelect);
        var trieLimit = (triePos + scanByteCount) | 0;
        $l$loop: while (true) {
          // Inline function 'okio.and' call
          var tmp_0 = data;
          var tmp3 = pos;
          pos = (tmp3 + 1) | 0;
          var byte = tmp_0[tmp3] & 255;
          var tmp4 = triePos;
          triePos = (tmp4 + 1) | 0;
          if (!(byte === trie[tmp4])) return prefixIndex;
          var scanComplete = triePos === trieLimit;
          if (pos === limit) {
            s = ensureNotNull(ensureNotNull(s).get_next_wor1vg_k$());
            pos = s.get_pos_18iyad_k$();
            data = s.get_data_wokkxf_k$();
            limit = s.get_limit_iuokuq_k$();
            if (s === head) {
              if (!scanComplete) break navigateTrie;
              s = null;
            }
          }
          if (scanComplete) {
            nextStep = trie[triePos];
            break $l$loop;
          }
        }
      } else {
        var selectChoiceCount = scanOrSelect;
        // Inline function 'okio.and' call
        var tmp_1 = data;
        var tmp5 = pos;
        pos = (tmp5 + 1) | 0;
        var byte_0 = tmp_1[tmp5] & 255;
        var selectLimit = (triePos + selectChoiceCount) | 0;
        $l$loop_0: while (true) {
          if (triePos === selectLimit) return prefixIndex;
          if (byte_0 === trie[triePos]) {
            nextStep = trie[(triePos + selectChoiceCount) | 0];
            break $l$loop_0;
          }
          triePos = (triePos + 1) | 0;
        }
        if (pos === limit) {
          s = ensureNotNull(s.get_next_wor1vg_k$());
          pos = s.get_pos_18iyad_k$();
          data = s.get_data_wokkxf_k$();
          limit = s.get_limit_iuokuq_k$();
          if (s === head) {
            s = null;
          }
        }
      }
      if (nextStep >= 0) return nextStep;
      triePos = -nextStep | 0;
    }
    if (selectTruncated) return -2;
    return prefixIndex;
  }
  function rangeEquals(segment, segmentPos, bytes, bytesOffset, bytesLimit) {
    _init_properties_Buffer_kt__ndcom8();
    var segment_0 = segment;
    var segmentPos_0 = segmentPos;
    var segmentLimit = segment_0.get_limit_iuokuq_k$();
    var data = segment_0.get_data_wokkxf_k$();
    var i = bytesOffset;
    while (i < bytesLimit) {
      if (segmentPos_0 === segmentLimit) {
        segment_0 = ensureNotNull(segment_0.get_next_wor1vg_k$());
        data = segment_0.get_data_wokkxf_k$();
        segmentPos_0 = segment_0.get_pos_18iyad_k$();
        segmentLimit = segment_0.get_limit_iuokuq_k$();
      }
      if (!(data[segmentPos_0] === bytes[i])) {
        return false;
      }
      segmentPos_0 = (segmentPos_0 + 1) | 0;
      i = (i + 1) | 0;
    }
    return true;
  }
  var properties_initialized_Buffer_kt_xv4xxe;
  function _init_properties_Buffer_kt__ndcom8() {
    if (!properties_initialized_Buffer_kt_xv4xxe) {
      properties_initialized_Buffer_kt_xv4xxe = true;
      HEX_DIGIT_BYTES = asUtf8ToByteArray('0123456789abcdef');
    }
  }
  function commonSelect_0(_this__u8e3s4, options) {
    var index = _this__u8e3s4.select_91a7t_k$(options.get_options_jecmyz_k$());
    return index === -1 ? null : options.get_c1px32_k$(index);
  }
  function get_HEX_DIGIT_CHARS() {
    _init_properties_ByteString_kt__sqjq7b();
    return HEX_DIGIT_CHARS;
  }
  var HEX_DIGIT_CHARS;
  function commonUtf8(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    var result = _this__u8e3s4.get_utf8_wovtfe_k$();
    if (result == null) {
      result = toUtf8String(_this__u8e3s4.internalArray_tr176k_k$());
      _this__u8e3s4.set_utf8_8b2t3r_k$(result);
    }
    return result;
  }
  function commonBase64(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    return encodeBase64(_this__u8e3s4.get_data_wokkxf_k$());
  }
  function commonBase64Url(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    return encodeBase64(_this__u8e3s4.get_data_wokkxf_k$(), get_BASE64_URL_SAFE());
  }
  function commonHex(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    var result = charArray(imul(_this__u8e3s4.get_data_wokkxf_k$().length, 2));
    var c = 0;
    var indexedObject = _this__u8e3s4.get_data_wokkxf_k$();
    var inductionVariable = 0;
    var last = indexedObject.length;
    while (inductionVariable < last) {
      var b = indexedObject[inductionVariable];
      inductionVariable = (inductionVariable + 1) | 0;
      var tmp1 = c;
      c = (tmp1 + 1) | 0;
      var tmp = get_HEX_DIGIT_CHARS();
      // Inline function 'okio.shr' call
      result[tmp1] = tmp[(b >> 4) & 15];
      var tmp2 = c;
      c = (tmp2 + 1) | 0;
      var tmp_0 = get_HEX_DIGIT_CHARS();
      // Inline function 'okio.and' call
      result[tmp2] = tmp_0[b & 15];
    }
    return concatToString(result);
  }
  function commonToAsciiLowercase(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    var i = 0;
    $l$loop: while (i < _this__u8e3s4.get_data_wokkxf_k$().length) {
      var c = _this__u8e3s4.get_data_wokkxf_k$()[i];
      if (c < 65 ? true : c > 90) {
        i = (i + 1) | 0;
        continue $l$loop;
      }
      // Inline function 'kotlin.collections.copyOf' call
      // Inline function 'kotlin.js.asDynamic' call
      var lowercase = _this__u8e3s4.get_data_wokkxf_k$().slice();
      var tmp1 = i;
      i = (tmp1 + 1) | 0;
      lowercase[tmp1] = toByte((c - -32) | 0);
      $l$loop_0: while (i < lowercase.length) {
        c = lowercase[i];
        if (c < 65 ? true : c > 90) {
          i = (i + 1) | 0;
          continue $l$loop_0;
        }
        lowercase[i] = toByte((c - -32) | 0);
        i = (i + 1) | 0;
      }
      return new ByteString(lowercase);
    }
    return _this__u8e3s4;
  }
  function commonToAsciiUppercase(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    var i = 0;
    $l$loop: while (i < _this__u8e3s4.get_data_wokkxf_k$().length) {
      var c = _this__u8e3s4.get_data_wokkxf_k$()[i];
      if (c < 97 ? true : c > 122) {
        i = (i + 1) | 0;
        continue $l$loop;
      }
      // Inline function 'kotlin.collections.copyOf' call
      // Inline function 'kotlin.js.asDynamic' call
      var lowercase = _this__u8e3s4.get_data_wokkxf_k$().slice();
      var tmp1 = i;
      i = (tmp1 + 1) | 0;
      lowercase[tmp1] = toByte((c - 32) | 0);
      $l$loop_0: while (i < lowercase.length) {
        c = lowercase[i];
        if (c < 97 ? true : c > 122) {
          i = (i + 1) | 0;
          continue $l$loop_0;
        }
        lowercase[i] = toByte((c - 32) | 0);
        i = (i + 1) | 0;
      }
      return new ByteString(lowercase);
    }
    return _this__u8e3s4;
  }
  function commonSubstring(_this__u8e3s4, beginIndex, endIndex) {
    _init_properties_ByteString_kt__sqjq7b();
    var endIndex_0 = resolveDefaultParameter(_this__u8e3s4, endIndex);
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(beginIndex >= 0)) {
      // Inline function 'okio.internal.commonSubstring.<anonymous>' call
      var message = 'beginIndex < 0';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(endIndex_0 <= _this__u8e3s4.get_data_wokkxf_k$().length)) {
      // Inline function 'okio.internal.commonSubstring.<anonymous>' call
      var message_0 = 'endIndex > length(' + _this__u8e3s4.get_data_wokkxf_k$().length + ')';
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    var subLen = (endIndex_0 - beginIndex) | 0;
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(subLen >= 0)) {
      // Inline function 'okio.internal.commonSubstring.<anonymous>' call
      var message_1 = 'endIndex < beginIndex';
      throw IllegalArgumentException_init_$Create$(toString(message_1));
    }
    if (beginIndex === 0 ? endIndex_0 === _this__u8e3s4.get_data_wokkxf_k$().length : false) {
      return _this__u8e3s4;
    }
    return new ByteString(copyOfRange(_this__u8e3s4.get_data_wokkxf_k$(), beginIndex, endIndex_0));
  }
  function commonGetByte(_this__u8e3s4, pos) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.get_data_wokkxf_k$()[pos];
  }
  function commonGetSize(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.get_data_wokkxf_k$().length;
  }
  function commonToByteArray(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    // Inline function 'kotlin.collections.copyOf' call
    // Inline function 'kotlin.js.asDynamic' call
    return _this__u8e3s4.get_data_wokkxf_k$().slice();
  }
  function commonInternalArray(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.get_data_wokkxf_k$();
  }
  function commonWrite_4(_this__u8e3s4, buffer, offset, byteCount) {
    _init_properties_ByteString_kt__sqjq7b();
    buffer.write_owzzlt_k$(_this__u8e3s4.get_data_wokkxf_k$(), offset, byteCount);
  }
  function commonRangeEquals_0(_this__u8e3s4, offset, other, otherOffset, byteCount) {
    _init_properties_ByteString_kt__sqjq7b();
    return other.rangeEquals_4nzvj0_k$(otherOffset, _this__u8e3s4.get_data_wokkxf_k$(), offset, byteCount);
  }
  function commonRangeEquals_1(_this__u8e3s4, offset, other, otherOffset, byteCount) {
    _init_properties_ByteString_kt__sqjq7b();
    return (
      (
        (offset >= 0 ? offset <= ((_this__u8e3s4.get_data_wokkxf_k$().length - byteCount) | 0) : false)
          ? otherOffset >= 0
          : false
      )
        ? otherOffset <= ((other.length - byteCount) | 0)
        : false
    )
      ? arrayRangeEquals(_this__u8e3s4.get_data_wokkxf_k$(), offset, other, otherOffset, byteCount)
      : false;
  }
  function commonCopyInto(_this__u8e3s4, offset, target, targetOffset, byteCount) {
    _init_properties_ByteString_kt__sqjq7b();
    // Inline function 'kotlin.collections.copyInto' call
    var this_0 = _this__u8e3s4.get_data_wokkxf_k$();
    var endIndex = (offset + byteCount) | 0;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp = this_0;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    arrayCopy(tmp, target, targetOffset, offset, endIndex);
  }
  function commonStartsWith(_this__u8e3s4, prefix) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.rangeEquals_b8izl9_k$(0, prefix, 0, prefix.get_size_woubt6_k$());
  }
  function commonStartsWith_0(_this__u8e3s4, prefix) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.rangeEquals_4nzvj0_k$(0, prefix, 0, prefix.length);
  }
  function commonEndsWith(_this__u8e3s4, suffix) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.rangeEquals_b8izl9_k$(
      (_this__u8e3s4.get_size_woubt6_k$() - suffix.get_size_woubt6_k$()) | 0,
      suffix,
      0,
      suffix.get_size_woubt6_k$(),
    );
  }
  function commonEndsWith_0(_this__u8e3s4, suffix) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.rangeEquals_4nzvj0_k$(
      (_this__u8e3s4.get_size_woubt6_k$() - suffix.length) | 0,
      suffix,
      0,
      suffix.length,
    );
  }
  function commonIndexOf_1(_this__u8e3s4, other, fromIndex) {
    _init_properties_ByteString_kt__sqjq7b();
    var limit = (_this__u8e3s4.get_data_wokkxf_k$().length - other.length) | 0;
    // Inline function 'kotlin.comparisons.maxOf' call
    var inductionVariable = Math.max(fromIndex, 0);
    if (inductionVariable <= limit)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        if (arrayRangeEquals(_this__u8e3s4.get_data_wokkxf_k$(), i, other, 0, other.length)) {
          return i;
        }
      } while (!(i === limit));
    return -1;
  }
  function commonLastIndexOf(_this__u8e3s4, other, fromIndex) {
    _init_properties_ByteString_kt__sqjq7b();
    return _this__u8e3s4.lastIndexOf_cmuddn_k$(other.internalArray_tr176k_k$(), fromIndex);
  }
  function commonLastIndexOf_0(_this__u8e3s4, other, fromIndex) {
    _init_properties_ByteString_kt__sqjq7b();
    var fromIndex_0 = resolveDefaultParameter(_this__u8e3s4, fromIndex);
    var limit = (_this__u8e3s4.get_data_wokkxf_k$().length - other.length) | 0;
    // Inline function 'kotlin.comparisons.minOf' call
    var inductionVariable = Math.min(fromIndex_0, limit);
    if (0 <= inductionVariable)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + -1) | 0;
        if (arrayRangeEquals(_this__u8e3s4.get_data_wokkxf_k$(), i, other, 0, other.length)) {
          return i;
        }
      } while (0 <= inductionVariable);
    return -1;
  }
  function commonEquals_0(_this__u8e3s4, other) {
    _init_properties_ByteString_kt__sqjq7b();
    var tmp;
    if (other === _this__u8e3s4) {
      tmp = true;
    } else {
      if (other instanceof ByteString) {
        tmp =
          other.get_size_woubt6_k$() === _this__u8e3s4.get_data_wokkxf_k$().length
            ? other.rangeEquals_4nzvj0_k$(
                0,
                _this__u8e3s4.get_data_wokkxf_k$(),
                0,
                _this__u8e3s4.get_data_wokkxf_k$().length,
              )
            : false;
      } else {
        tmp = false;
      }
    }
    return tmp;
  }
  function commonHashCode_0(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    var result = _this__u8e3s4.get_hashCode_td036k_k$();
    if (!(result === 0)) return result;
    // Inline function 'kotlin.also' call
    var this_0 = contentHashCode(_this__u8e3s4.get_data_wokkxf_k$());
    // Inline function 'kotlin.contracts.contract' call
    // Inline function 'okio.internal.commonHashCode.<anonymous>' call
    _this__u8e3s4.set_hashCode_zcrtc_k$(this_0);
    return this_0;
  }
  function commonCompareTo(_this__u8e3s4, other) {
    _init_properties_ByteString_kt__sqjq7b();
    var sizeA = _this__u8e3s4.get_size_woubt6_k$();
    var sizeB = other.get_size_woubt6_k$();
    var i = 0;
    // Inline function 'kotlin.comparisons.minOf' call
    var size = Math.min(sizeA, sizeB);
    $l$loop: while (i < size) {
      // Inline function 'okio.and' call
      var byteA = _this__u8e3s4.get_c1px32_k$(i) & 255;
      // Inline function 'okio.and' call
      var byteB = other.get_c1px32_k$(i) & 255;
      if (byteA === byteB) {
        i = (i + 1) | 0;
        continue $l$loop;
      }
      return byteA < byteB ? -1 : 1;
    }
    if (sizeA === sizeB) return 0;
    return sizeA < sizeB ? -1 : 1;
  }
  function commonToString(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    // Inline function 'kotlin.collections.isEmpty' call
    if (_this__u8e3s4.get_data_wokkxf_k$().length === 0) return '[size=0]';
    var i = codePointIndexToCharIndex$accessor$1yfvj6b(_this__u8e3s4.get_data_wokkxf_k$(), 64);
    if (i === -1) {
      var tmp;
      if (_this__u8e3s4.get_data_wokkxf_k$().length <= 64) {
        tmp = '[hex=' + _this__u8e3s4.hex_27mj_k$() + ']';
      } else {
        var tmp_0 = _this__u8e3s4.get_data_wokkxf_k$().length;
        var tmp$ret$4;
        $l$block: {
          // Inline function 'okio.internal.commonSubstring' call
          var endIndex = resolveDefaultParameter(_this__u8e3s4, 64);
          // Inline function 'kotlin.require' call
          // Inline function 'kotlin.contracts.contract' call
          if (!(0 >= 0)) {
            // Inline function 'okio.internal.commonSubstring.<anonymous>' call
            var message = 'beginIndex < 0';
            throw IllegalArgumentException_init_$Create$(toString(message));
          }
          // Inline function 'kotlin.require' call
          // Inline function 'kotlin.contracts.contract' call
          if (!(endIndex <= _this__u8e3s4.get_data_wokkxf_k$().length)) {
            // Inline function 'okio.internal.commonSubstring.<anonymous>' call
            var message_0 = 'endIndex > length(' + _this__u8e3s4.get_data_wokkxf_k$().length + ')';
            throw IllegalArgumentException_init_$Create$(toString(message_0));
          }
          var subLen = (endIndex - 0) | 0;
          // Inline function 'kotlin.require' call
          // Inline function 'kotlin.contracts.contract' call
          if (!(subLen >= 0)) {
            // Inline function 'okio.internal.commonSubstring.<anonymous>' call
            var message_1 = 'endIndex < beginIndex';
            throw IllegalArgumentException_init_$Create$(toString(message_1));
          }
          if (0 === 0 ? endIndex === _this__u8e3s4.get_data_wokkxf_k$().length : false) {
            tmp$ret$4 = _this__u8e3s4;
            break $l$block;
          }
          tmp$ret$4 = new ByteString(copyOfRange(_this__u8e3s4.get_data_wokkxf_k$(), 0, endIndex));
        }
        tmp = '[size=' + tmp_0 + ' hex=' + tmp$ret$4.hex_27mj_k$() + '\u2026]';
      }
      return tmp;
    }
    var text = _this__u8e3s4.utf8_255yp_k$();
    // Inline function 'kotlin.text.substring' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$6 = text.substring(0, i);
    var safeText = replace(replace(replace(tmp$ret$6, '\\', '\\\\'), '\n', '\\n'), '\r', '\\r');
    var tmp_1;
    if (i < text.length) {
      tmp_1 = '[size=' + _this__u8e3s4.get_data_wokkxf_k$().length + ' text=' + safeText + '\u2026]';
    } else {
      tmp_1 = '[text=' + safeText + ']';
    }
    return tmp_1;
  }
  function commonOf(data) {
    _init_properties_ByteString_kt__sqjq7b();
    // Inline function 'kotlin.collections.copyOf' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$1 = data.slice();
    return new ByteString(tmp$ret$1);
  }
  function commonToByteString(_this__u8e3s4, offset, byteCount) {
    _init_properties_ByteString_kt__sqjq7b();
    var byteCount_0 = resolveDefaultParameter_0(_this__u8e3s4, byteCount);
    checkOffsetAndCount(toLong(_this__u8e3s4.length), toLong(offset), toLong(byteCount_0));
    return new ByteString(copyOfRange(_this__u8e3s4, offset, (offset + byteCount_0) | 0));
  }
  function commonEncodeUtf8(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    var byteString = new ByteString(asUtf8ToByteArray(_this__u8e3s4));
    byteString.set_utf8_8b2t3r_k$(_this__u8e3s4);
    return byteString;
  }
  function commonDecodeBase64(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    var decoded = decodeBase64ToArray(_this__u8e3s4);
    return !(decoded == null) ? new ByteString(decoded) : null;
  }
  function commonDecodeHex(_this__u8e3s4) {
    _init_properties_ByteString_kt__sqjq7b();
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!((_this__u8e3s4.length % 2 | 0) === 0)) {
      // Inline function 'okio.internal.commonDecodeHex.<anonymous>' call
      var message = 'Unexpected hex string: ' + _this__u8e3s4;
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    var result = new Int8Array((_this__u8e3s4.length / 2) | 0);
    var inductionVariable = 0;
    var last = (result.length - 1) | 0;
    if (inductionVariable <= last)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var d1 = decodeHexDigit$accessor$1yfvj6b_0(charSequenceGet(_this__u8e3s4, imul(i, 2))) << 4;
        var d2 = decodeHexDigit$accessor$1yfvj6b_0(charSequenceGet(_this__u8e3s4, (imul(i, 2) + 1) | 0));
        result[i] = toByte((d1 + d2) | 0);
      } while (inductionVariable <= last);
    return new ByteString(result);
  }
  function codePointIndexToCharIndex(s, codePointCount) {
    _init_properties_ByteString_kt__sqjq7b();
    var charCount = 0;
    var j = 0;
    // Inline function 'okio.processUtf8CodePoints' call
    var endIndex = s.length;
    var index = 0;
    while (index < endIndex) {
      var b0 = s[index];
      if (b0 >= 0) {
        // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
        var tmp0 = j;
        j = (tmp0 + 1) | 0;
        if (tmp0 === codePointCount) {
          return charCount;
        }
        var tmp;
        var tmp_0;
        var tmp_1;
        // Inline function 'kotlin.code' call
        var this_0 = _Char___init__impl__6a9atx(10);
        if (!(b0 === Char__toInt_impl_vasixd(this_0))) {
          // Inline function 'kotlin.code' call
          var this_1 = _Char___init__impl__6a9atx(13);
          tmp_1 = !(b0 === Char__toInt_impl_vasixd(this_1));
        } else {
          tmp_1 = false;
        }
        if (tmp_1) {
          // Inline function 'okio.isIsoControl' call
          tmp_0 = (0 <= b0 ? b0 <= 31 : false) ? true : 127 <= b0 ? b0 <= 159 : false;
        } else {
          tmp_0 = false;
        }
        if (tmp_0) {
          tmp = true;
        } else {
          tmp = b0 === get_REPLACEMENT_CODE_POINT();
        }
        if (tmp) {
          return -1;
        }
        charCount = (charCount + (b0 < 65536 ? 1 : 2)) | 0;
        index = (index + 1) | 0;
        while (index < endIndex ? s[index] >= 0 : false) {
          // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
          var tmp1 = index;
          index = (tmp1 + 1) | 0;
          var c = s[tmp1];
          var tmp0_0 = j;
          j = (tmp0_0 + 1) | 0;
          if (tmp0_0 === codePointCount) {
            return charCount;
          }
          var tmp_2;
          var tmp_3;
          var tmp_4;
          // Inline function 'kotlin.code' call
          var this_2 = _Char___init__impl__6a9atx(10);
          if (!(c === Char__toInt_impl_vasixd(this_2))) {
            // Inline function 'kotlin.code' call
            var this_3 = _Char___init__impl__6a9atx(13);
            tmp_4 = !(c === Char__toInt_impl_vasixd(this_3));
          } else {
            tmp_4 = false;
          }
          if (tmp_4) {
            // Inline function 'okio.isIsoControl' call
            tmp_3 = (0 <= c ? c <= 31 : false) ? true : 127 <= c ? c <= 159 : false;
          } else {
            tmp_3 = false;
          }
          if (tmp_3) {
            tmp_2 = true;
          } else {
            tmp_2 = c === get_REPLACEMENT_CODE_POINT();
          }
          if (tmp_2) {
            return -1;
          }
          charCount = (charCount + (c < 65536 ? 1 : 2)) | 0;
        }
      } else {
        // Inline function 'okio.shr' call
        if (b0 >> 5 === -2) {
          var tmp_5 = index;
          var tmp$ret$10;
          $l$block_0: {
            // Inline function 'okio.process2Utf8Bytes' call
            var beginIndex = index;
            if (endIndex <= ((beginIndex + 1) | 0)) {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
              var c_0 = get_REPLACEMENT_CODE_POINT();
              var tmp0_1 = j;
              j = (tmp0_1 + 1) | 0;
              if (tmp0_1 === codePointCount) {
                return charCount;
              }
              var tmp_6;
              var tmp_7;
              var tmp_8;
              // Inline function 'kotlin.code' call
              var this_4 = _Char___init__impl__6a9atx(10);
              if (!(c_0 === Char__toInt_impl_vasixd(this_4))) {
                // Inline function 'kotlin.code' call
                var this_5 = _Char___init__impl__6a9atx(13);
                tmp_8 = !(c_0 === Char__toInt_impl_vasixd(this_5));
              } else {
                tmp_8 = false;
              }
              if (tmp_8) {
                // Inline function 'okio.isIsoControl' call
                tmp_7 = (0 <= c_0 ? c_0 <= 31 : false) ? true : 127 <= c_0 ? c_0 <= 159 : false;
              } else {
                tmp_7 = false;
              }
              if (tmp_7) {
                tmp_6 = true;
              } else {
                tmp_6 = c_0 === get_REPLACEMENT_CODE_POINT();
              }
              if (tmp_6) {
                return -1;
              }
              charCount = (charCount + (c_0 < 65536 ? 1 : 2)) | 0;
              tmp$ret$10 = 1;
              break $l$block_0;
            }
            var b0_0 = s[beginIndex];
            var b1 = s[(beginIndex + 1) | 0];
            // Inline function 'okio.isUtf8Continuation' call
            // Inline function 'okio.and' call
            if (!((b1 & 192) === 128)) {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
              var c_1 = get_REPLACEMENT_CODE_POINT();
              var tmp0_2 = j;
              j = (tmp0_2 + 1) | 0;
              if (tmp0_2 === codePointCount) {
                return charCount;
              }
              var tmp_9;
              var tmp_10;
              var tmp_11;
              // Inline function 'kotlin.code' call
              var this_6 = _Char___init__impl__6a9atx(10);
              if (!(c_1 === Char__toInt_impl_vasixd(this_6))) {
                // Inline function 'kotlin.code' call
                var this_7 = _Char___init__impl__6a9atx(13);
                tmp_11 = !(c_1 === Char__toInt_impl_vasixd(this_7));
              } else {
                tmp_11 = false;
              }
              if (tmp_11) {
                // Inline function 'okio.isIsoControl' call
                tmp_10 = (0 <= c_1 ? c_1 <= 31 : false) ? true : 127 <= c_1 ? c_1 <= 159 : false;
              } else {
                tmp_10 = false;
              }
              if (tmp_10) {
                tmp_9 = true;
              } else {
                tmp_9 = c_1 === get_REPLACEMENT_CODE_POINT();
              }
              if (tmp_9) {
                return -1;
              }
              charCount = (charCount + (c_1 < 65536 ? 1 : 2)) | 0;
              tmp$ret$10 = 1;
              break $l$block_0;
            }
            var codePoint = get_MASK_2BYTES() ^ b1 ^ (b0_0 << 6);
            if (codePoint < 128) {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
              var c_2 = get_REPLACEMENT_CODE_POINT();
              var tmp0_3 = j;
              j = (tmp0_3 + 1) | 0;
              if (tmp0_3 === codePointCount) {
                return charCount;
              }
              var tmp_12;
              var tmp_13;
              var tmp_14;
              // Inline function 'kotlin.code' call
              var this_8 = _Char___init__impl__6a9atx(10);
              if (!(c_2 === Char__toInt_impl_vasixd(this_8))) {
                // Inline function 'kotlin.code' call
                var this_9 = _Char___init__impl__6a9atx(13);
                tmp_14 = !(c_2 === Char__toInt_impl_vasixd(this_9));
              } else {
                tmp_14 = false;
              }
              if (tmp_14) {
                // Inline function 'okio.isIsoControl' call
                tmp_13 = (0 <= c_2 ? c_2 <= 31 : false) ? true : 127 <= c_2 ? c_2 <= 159 : false;
              } else {
                tmp_13 = false;
              }
              if (tmp_13) {
                tmp_12 = true;
              } else {
                tmp_12 = c_2 === get_REPLACEMENT_CODE_POINT();
              }
              if (tmp_12) {
                return -1;
              }
              charCount = (charCount + (c_2 < 65536 ? 1 : 2)) | 0;
            } else {
              // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
              // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
              var tmp0_4 = j;
              j = (tmp0_4 + 1) | 0;
              if (tmp0_4 === codePointCount) {
                return charCount;
              }
              var tmp_15;
              var tmp_16;
              var tmp_17;
              // Inline function 'kotlin.code' call
              var this_10 = _Char___init__impl__6a9atx(10);
              if (!(codePoint === Char__toInt_impl_vasixd(this_10))) {
                // Inline function 'kotlin.code' call
                var this_11 = _Char___init__impl__6a9atx(13);
                tmp_17 = !(codePoint === Char__toInt_impl_vasixd(this_11));
              } else {
                tmp_17 = false;
              }
              if (tmp_17) {
                // Inline function 'okio.isIsoControl' call
                tmp_16 = (0 <= codePoint ? codePoint <= 31 : false)
                  ? true
                  : 127 <= codePoint
                    ? codePoint <= 159
                    : false;
              } else {
                tmp_16 = false;
              }
              if (tmp_16) {
                tmp_15 = true;
              } else {
                tmp_15 = codePoint === get_REPLACEMENT_CODE_POINT();
              }
              if (tmp_15) {
                return -1;
              }
              charCount = (charCount + (codePoint < 65536 ? 1 : 2)) | 0;
            }
            tmp$ret$10 = 2;
          }
          index = (tmp_5 + tmp$ret$10) | 0;
        } else {
          // Inline function 'okio.shr' call
          if (b0 >> 4 === -2) {
            var tmp_18 = index;
            var tmp$ret$28;
            $l$block_4: {
              // Inline function 'okio.process3Utf8Bytes' call
              var beginIndex_0 = index;
              if (endIndex <= ((beginIndex_0 + 2) | 0)) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                var c_3 = get_REPLACEMENT_CODE_POINT();
                var tmp0_5 = j;
                j = (tmp0_5 + 1) | 0;
                if (tmp0_5 === codePointCount) {
                  return charCount;
                }
                var tmp_19;
                var tmp_20;
                var tmp_21;
                // Inline function 'kotlin.code' call
                var this_12 = _Char___init__impl__6a9atx(10);
                if (!(c_3 === Char__toInt_impl_vasixd(this_12))) {
                  // Inline function 'kotlin.code' call
                  var this_13 = _Char___init__impl__6a9atx(13);
                  tmp_21 = !(c_3 === Char__toInt_impl_vasixd(this_13));
                } else {
                  tmp_21 = false;
                }
                if (tmp_21) {
                  // Inline function 'okio.isIsoControl' call
                  tmp_20 = (0 <= c_3 ? c_3 <= 31 : false) ? true : 127 <= c_3 ? c_3 <= 159 : false;
                } else {
                  tmp_20 = false;
                }
                if (tmp_20) {
                  tmp_19 = true;
                } else {
                  tmp_19 = c_3 === get_REPLACEMENT_CODE_POINT();
                }
                if (tmp_19) {
                  return -1;
                }
                charCount = (charCount + (c_3 < 65536 ? 1 : 2)) | 0;
                var tmp_22;
                if (endIndex <= ((beginIndex_0 + 1) | 0)) {
                  tmp_22 = true;
                } else {
                  // Inline function 'okio.isUtf8Continuation' call
                  // Inline function 'okio.and' call
                  tmp_22 = !((s[(beginIndex_0 + 1) | 0] & 192) === 128);
                }
                if (tmp_22) {
                  tmp$ret$28 = 1;
                  break $l$block_4;
                } else {
                  tmp$ret$28 = 2;
                  break $l$block_4;
                }
              }
              var b0_1 = s[beginIndex_0];
              var b1_0 = s[(beginIndex_0 + 1) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b1_0 & 192) === 128)) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                var c_4 = get_REPLACEMENT_CODE_POINT();
                var tmp0_6 = j;
                j = (tmp0_6 + 1) | 0;
                if (tmp0_6 === codePointCount) {
                  return charCount;
                }
                var tmp_23;
                var tmp_24;
                var tmp_25;
                // Inline function 'kotlin.code' call
                var this_14 = _Char___init__impl__6a9atx(10);
                if (!(c_4 === Char__toInt_impl_vasixd(this_14))) {
                  // Inline function 'kotlin.code' call
                  var this_15 = _Char___init__impl__6a9atx(13);
                  tmp_25 = !(c_4 === Char__toInt_impl_vasixd(this_15));
                } else {
                  tmp_25 = false;
                }
                if (tmp_25) {
                  // Inline function 'okio.isIsoControl' call
                  tmp_24 = (0 <= c_4 ? c_4 <= 31 : false) ? true : 127 <= c_4 ? c_4 <= 159 : false;
                } else {
                  tmp_24 = false;
                }
                if (tmp_24) {
                  tmp_23 = true;
                } else {
                  tmp_23 = c_4 === get_REPLACEMENT_CODE_POINT();
                }
                if (tmp_23) {
                  return -1;
                }
                charCount = (charCount + (c_4 < 65536 ? 1 : 2)) | 0;
                tmp$ret$28 = 1;
                break $l$block_4;
              }
              var b2 = s[(beginIndex_0 + 2) | 0];
              // Inline function 'okio.isUtf8Continuation' call
              // Inline function 'okio.and' call
              if (!((b2 & 192) === 128)) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                var c_5 = get_REPLACEMENT_CODE_POINT();
                var tmp0_7 = j;
                j = (tmp0_7 + 1) | 0;
                if (tmp0_7 === codePointCount) {
                  return charCount;
                }
                var tmp_26;
                var tmp_27;
                var tmp_28;
                // Inline function 'kotlin.code' call
                var this_16 = _Char___init__impl__6a9atx(10);
                if (!(c_5 === Char__toInt_impl_vasixd(this_16))) {
                  // Inline function 'kotlin.code' call
                  var this_17 = _Char___init__impl__6a9atx(13);
                  tmp_28 = !(c_5 === Char__toInt_impl_vasixd(this_17));
                } else {
                  tmp_28 = false;
                }
                if (tmp_28) {
                  // Inline function 'okio.isIsoControl' call
                  tmp_27 = (0 <= c_5 ? c_5 <= 31 : false) ? true : 127 <= c_5 ? c_5 <= 159 : false;
                } else {
                  tmp_27 = false;
                }
                if (tmp_27) {
                  tmp_26 = true;
                } else {
                  tmp_26 = c_5 === get_REPLACEMENT_CODE_POINT();
                }
                if (tmp_26) {
                  return -1;
                }
                charCount = (charCount + (c_5 < 65536 ? 1 : 2)) | 0;
                tmp$ret$28 = 2;
                break $l$block_4;
              }
              var codePoint_0 = get_MASK_3BYTES() ^ b2 ^ (b1_0 << 6) ^ (b0_1 << 12);
              if (codePoint_0 < 2048) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                var c_6 = get_REPLACEMENT_CODE_POINT();
                var tmp0_8 = j;
                j = (tmp0_8 + 1) | 0;
                if (tmp0_8 === codePointCount) {
                  return charCount;
                }
                var tmp_29;
                var tmp_30;
                var tmp_31;
                // Inline function 'kotlin.code' call
                var this_18 = _Char___init__impl__6a9atx(10);
                if (!(c_6 === Char__toInt_impl_vasixd(this_18))) {
                  // Inline function 'kotlin.code' call
                  var this_19 = _Char___init__impl__6a9atx(13);
                  tmp_31 = !(c_6 === Char__toInt_impl_vasixd(this_19));
                } else {
                  tmp_31 = false;
                }
                if (tmp_31) {
                  // Inline function 'okio.isIsoControl' call
                  tmp_30 = (0 <= c_6 ? c_6 <= 31 : false) ? true : 127 <= c_6 ? c_6 <= 159 : false;
                } else {
                  tmp_30 = false;
                }
                if (tmp_30) {
                  tmp_29 = true;
                } else {
                  tmp_29 = c_6 === get_REPLACEMENT_CODE_POINT();
                }
                if (tmp_29) {
                  return -1;
                }
                charCount = (charCount + (c_6 < 65536 ? 1 : 2)) | 0;
              } else if (55296 <= codePoint_0 ? codePoint_0 <= 57343 : false) {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                var c_7 = get_REPLACEMENT_CODE_POINT();
                var tmp0_9 = j;
                j = (tmp0_9 + 1) | 0;
                if (tmp0_9 === codePointCount) {
                  return charCount;
                }
                var tmp_32;
                var tmp_33;
                var tmp_34;
                // Inline function 'kotlin.code' call
                var this_20 = _Char___init__impl__6a9atx(10);
                if (!(c_7 === Char__toInt_impl_vasixd(this_20))) {
                  // Inline function 'kotlin.code' call
                  var this_21 = _Char___init__impl__6a9atx(13);
                  tmp_34 = !(c_7 === Char__toInt_impl_vasixd(this_21));
                } else {
                  tmp_34 = false;
                }
                if (tmp_34) {
                  // Inline function 'okio.isIsoControl' call
                  tmp_33 = (0 <= c_7 ? c_7 <= 31 : false) ? true : 127 <= c_7 ? c_7 <= 159 : false;
                } else {
                  tmp_33 = false;
                }
                if (tmp_33) {
                  tmp_32 = true;
                } else {
                  tmp_32 = c_7 === get_REPLACEMENT_CODE_POINT();
                }
                if (tmp_32) {
                  return -1;
                }
                charCount = (charCount + (c_7 < 65536 ? 1 : 2)) | 0;
              } else {
                // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                var tmp0_10 = j;
                j = (tmp0_10 + 1) | 0;
                if (tmp0_10 === codePointCount) {
                  return charCount;
                }
                var tmp_35;
                var tmp_36;
                var tmp_37;
                // Inline function 'kotlin.code' call
                var this_22 = _Char___init__impl__6a9atx(10);
                if (!(codePoint_0 === Char__toInt_impl_vasixd(this_22))) {
                  // Inline function 'kotlin.code' call
                  var this_23 = _Char___init__impl__6a9atx(13);
                  tmp_37 = !(codePoint_0 === Char__toInt_impl_vasixd(this_23));
                } else {
                  tmp_37 = false;
                }
                if (tmp_37) {
                  // Inline function 'okio.isIsoControl' call
                  tmp_36 = (0 <= codePoint_0 ? codePoint_0 <= 31 : false)
                    ? true
                    : 127 <= codePoint_0
                      ? codePoint_0 <= 159
                      : false;
                } else {
                  tmp_36 = false;
                }
                if (tmp_36) {
                  tmp_35 = true;
                } else {
                  tmp_35 = codePoint_0 === get_REPLACEMENT_CODE_POINT();
                }
                if (tmp_35) {
                  return -1;
                }
                charCount = (charCount + (codePoint_0 < 65536 ? 1 : 2)) | 0;
              }
              tmp$ret$28 = 3;
            }
            index = (tmp_18 + tmp$ret$28) | 0;
          } else {
            // Inline function 'okio.shr' call
            if (b0 >> 3 === -2) {
              var tmp_38 = index;
              var tmp$ret$54;
              $l$block_10: {
                // Inline function 'okio.process4Utf8Bytes' call
                var beginIndex_1 = index;
                if (endIndex <= ((beginIndex_1 + 3) | 0)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var c_8 = get_REPLACEMENT_CODE_POINT();
                  var tmp0_11 = j;
                  j = (tmp0_11 + 1) | 0;
                  if (tmp0_11 === codePointCount) {
                    return charCount;
                  }
                  var tmp_39;
                  var tmp_40;
                  var tmp_41;
                  // Inline function 'kotlin.code' call
                  var this_24 = _Char___init__impl__6a9atx(10);
                  if (!(c_8 === Char__toInt_impl_vasixd(this_24))) {
                    // Inline function 'kotlin.code' call
                    var this_25 = _Char___init__impl__6a9atx(13);
                    tmp_41 = !(c_8 === Char__toInt_impl_vasixd(this_25));
                  } else {
                    tmp_41 = false;
                  }
                  if (tmp_41) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_40 = (0 <= c_8 ? c_8 <= 31 : false) ? true : 127 <= c_8 ? c_8 <= 159 : false;
                  } else {
                    tmp_40 = false;
                  }
                  if (tmp_40) {
                    tmp_39 = true;
                  } else {
                    tmp_39 = c_8 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_39) {
                    return -1;
                  }
                  charCount = (charCount + (c_8 < 65536 ? 1 : 2)) | 0;
                  var tmp_42;
                  if (endIndex <= ((beginIndex_1 + 1) | 0)) {
                    tmp_42 = true;
                  } else {
                    // Inline function 'okio.isUtf8Continuation' call
                    // Inline function 'okio.and' call
                    tmp_42 = !((s[(beginIndex_1 + 1) | 0] & 192) === 128);
                  }
                  if (tmp_42) {
                    tmp$ret$54 = 1;
                    break $l$block_10;
                  } else {
                    var tmp_43;
                    if (endIndex <= ((beginIndex_1 + 2) | 0)) {
                      tmp_43 = true;
                    } else {
                      // Inline function 'okio.isUtf8Continuation' call
                      // Inline function 'okio.and' call
                      tmp_43 = !((s[(beginIndex_1 + 2) | 0] & 192) === 128);
                    }
                    if (tmp_43) {
                      tmp$ret$54 = 2;
                      break $l$block_10;
                    } else {
                      tmp$ret$54 = 3;
                      break $l$block_10;
                    }
                  }
                }
                var b0_2 = s[beginIndex_1];
                var b1_1 = s[(beginIndex_1 + 1) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b1_1 & 192) === 128)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var c_9 = get_REPLACEMENT_CODE_POINT();
                  var tmp0_12 = j;
                  j = (tmp0_12 + 1) | 0;
                  if (tmp0_12 === codePointCount) {
                    return charCount;
                  }
                  var tmp_44;
                  var tmp_45;
                  var tmp_46;
                  // Inline function 'kotlin.code' call
                  var this_26 = _Char___init__impl__6a9atx(10);
                  if (!(c_9 === Char__toInt_impl_vasixd(this_26))) {
                    // Inline function 'kotlin.code' call
                    var this_27 = _Char___init__impl__6a9atx(13);
                    tmp_46 = !(c_9 === Char__toInt_impl_vasixd(this_27));
                  } else {
                    tmp_46 = false;
                  }
                  if (tmp_46) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_45 = (0 <= c_9 ? c_9 <= 31 : false) ? true : 127 <= c_9 ? c_9 <= 159 : false;
                  } else {
                    tmp_45 = false;
                  }
                  if (tmp_45) {
                    tmp_44 = true;
                  } else {
                    tmp_44 = c_9 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_44) {
                    return -1;
                  }
                  charCount = (charCount + (c_9 < 65536 ? 1 : 2)) | 0;
                  tmp$ret$54 = 1;
                  break $l$block_10;
                }
                var b2_0 = s[(beginIndex_1 + 2) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b2_0 & 192) === 128)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var c_10 = get_REPLACEMENT_CODE_POINT();
                  var tmp0_13 = j;
                  j = (tmp0_13 + 1) | 0;
                  if (tmp0_13 === codePointCount) {
                    return charCount;
                  }
                  var tmp_47;
                  var tmp_48;
                  var tmp_49;
                  // Inline function 'kotlin.code' call
                  var this_28 = _Char___init__impl__6a9atx(10);
                  if (!(c_10 === Char__toInt_impl_vasixd(this_28))) {
                    // Inline function 'kotlin.code' call
                    var this_29 = _Char___init__impl__6a9atx(13);
                    tmp_49 = !(c_10 === Char__toInt_impl_vasixd(this_29));
                  } else {
                    tmp_49 = false;
                  }
                  if (tmp_49) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_48 = (0 <= c_10 ? c_10 <= 31 : false) ? true : 127 <= c_10 ? c_10 <= 159 : false;
                  } else {
                    tmp_48 = false;
                  }
                  if (tmp_48) {
                    tmp_47 = true;
                  } else {
                    tmp_47 = c_10 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_47) {
                    return -1;
                  }
                  charCount = (charCount + (c_10 < 65536 ? 1 : 2)) | 0;
                  tmp$ret$54 = 2;
                  break $l$block_10;
                }
                var b3 = s[(beginIndex_1 + 3) | 0];
                // Inline function 'okio.isUtf8Continuation' call
                // Inline function 'okio.and' call
                if (!((b3 & 192) === 128)) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var c_11 = get_REPLACEMENT_CODE_POINT();
                  var tmp0_14 = j;
                  j = (tmp0_14 + 1) | 0;
                  if (tmp0_14 === codePointCount) {
                    return charCount;
                  }
                  var tmp_50;
                  var tmp_51;
                  var tmp_52;
                  // Inline function 'kotlin.code' call
                  var this_30 = _Char___init__impl__6a9atx(10);
                  if (!(c_11 === Char__toInt_impl_vasixd(this_30))) {
                    // Inline function 'kotlin.code' call
                    var this_31 = _Char___init__impl__6a9atx(13);
                    tmp_52 = !(c_11 === Char__toInt_impl_vasixd(this_31));
                  } else {
                    tmp_52 = false;
                  }
                  if (tmp_52) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_51 = (0 <= c_11 ? c_11 <= 31 : false) ? true : 127 <= c_11 ? c_11 <= 159 : false;
                  } else {
                    tmp_51 = false;
                  }
                  if (tmp_51) {
                    tmp_50 = true;
                  } else {
                    tmp_50 = c_11 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_50) {
                    return -1;
                  }
                  charCount = (charCount + (c_11 < 65536 ? 1 : 2)) | 0;
                  tmp$ret$54 = 3;
                  break $l$block_10;
                }
                var codePoint_1 = get_MASK_4BYTES() ^ b3 ^ (b2_0 << 6) ^ (b1_1 << 12) ^ (b0_2 << 18);
                if (codePoint_1 > 1114111) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var c_12 = get_REPLACEMENT_CODE_POINT();
                  var tmp0_15 = j;
                  j = (tmp0_15 + 1) | 0;
                  if (tmp0_15 === codePointCount) {
                    return charCount;
                  }
                  var tmp_53;
                  var tmp_54;
                  var tmp_55;
                  // Inline function 'kotlin.code' call
                  var this_32 = _Char___init__impl__6a9atx(10);
                  if (!(c_12 === Char__toInt_impl_vasixd(this_32))) {
                    // Inline function 'kotlin.code' call
                    var this_33 = _Char___init__impl__6a9atx(13);
                    tmp_55 = !(c_12 === Char__toInt_impl_vasixd(this_33));
                  } else {
                    tmp_55 = false;
                  }
                  if (tmp_55) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_54 = (0 <= c_12 ? c_12 <= 31 : false) ? true : 127 <= c_12 ? c_12 <= 159 : false;
                  } else {
                    tmp_54 = false;
                  }
                  if (tmp_54) {
                    tmp_53 = true;
                  } else {
                    tmp_53 = c_12 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_53) {
                    return -1;
                  }
                  charCount = (charCount + (c_12 < 65536 ? 1 : 2)) | 0;
                } else if (55296 <= codePoint_1 ? codePoint_1 <= 57343 : false) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var c_13 = get_REPLACEMENT_CODE_POINT();
                  var tmp0_16 = j;
                  j = (tmp0_16 + 1) | 0;
                  if (tmp0_16 === codePointCount) {
                    return charCount;
                  }
                  var tmp_56;
                  var tmp_57;
                  var tmp_58;
                  // Inline function 'kotlin.code' call
                  var this_34 = _Char___init__impl__6a9atx(10);
                  if (!(c_13 === Char__toInt_impl_vasixd(this_34))) {
                    // Inline function 'kotlin.code' call
                    var this_35 = _Char___init__impl__6a9atx(13);
                    tmp_58 = !(c_13 === Char__toInt_impl_vasixd(this_35));
                  } else {
                    tmp_58 = false;
                  }
                  if (tmp_58) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_57 = (0 <= c_13 ? c_13 <= 31 : false) ? true : 127 <= c_13 ? c_13 <= 159 : false;
                  } else {
                    tmp_57 = false;
                  }
                  if (tmp_57) {
                    tmp_56 = true;
                  } else {
                    tmp_56 = c_13 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_56) {
                    return -1;
                  }
                  charCount = (charCount + (c_13 < 65536 ? 1 : 2)) | 0;
                } else if (codePoint_1 < 65536) {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var c_14 = get_REPLACEMENT_CODE_POINT();
                  var tmp0_17 = j;
                  j = (tmp0_17 + 1) | 0;
                  if (tmp0_17 === codePointCount) {
                    return charCount;
                  }
                  var tmp_59;
                  var tmp_60;
                  var tmp_61;
                  // Inline function 'kotlin.code' call
                  var this_36 = _Char___init__impl__6a9atx(10);
                  if (!(c_14 === Char__toInt_impl_vasixd(this_36))) {
                    // Inline function 'kotlin.code' call
                    var this_37 = _Char___init__impl__6a9atx(13);
                    tmp_61 = !(c_14 === Char__toInt_impl_vasixd(this_37));
                  } else {
                    tmp_61 = false;
                  }
                  if (tmp_61) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_60 = (0 <= c_14 ? c_14 <= 31 : false) ? true : 127 <= c_14 ? c_14 <= 159 : false;
                  } else {
                    tmp_60 = false;
                  }
                  if (tmp_60) {
                    tmp_59 = true;
                  } else {
                    tmp_59 = c_14 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_59) {
                    return -1;
                  }
                  charCount = (charCount + (c_14 < 65536 ? 1 : 2)) | 0;
                } else {
                  // Inline function 'okio.processUtf8CodePoints.<anonymous>' call
                  // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
                  var tmp0_18 = j;
                  j = (tmp0_18 + 1) | 0;
                  if (tmp0_18 === codePointCount) {
                    return charCount;
                  }
                  var tmp_62;
                  var tmp_63;
                  var tmp_64;
                  // Inline function 'kotlin.code' call
                  var this_38 = _Char___init__impl__6a9atx(10);
                  if (!(codePoint_1 === Char__toInt_impl_vasixd(this_38))) {
                    // Inline function 'kotlin.code' call
                    var this_39 = _Char___init__impl__6a9atx(13);
                    tmp_64 = !(codePoint_1 === Char__toInt_impl_vasixd(this_39));
                  } else {
                    tmp_64 = false;
                  }
                  if (tmp_64) {
                    // Inline function 'okio.isIsoControl' call
                    tmp_63 = (0 <= codePoint_1 ? codePoint_1 <= 31 : false)
                      ? true
                      : 127 <= codePoint_1
                        ? codePoint_1 <= 159
                        : false;
                  } else {
                    tmp_63 = false;
                  }
                  if (tmp_63) {
                    tmp_62 = true;
                  } else {
                    tmp_62 = codePoint_1 === get_REPLACEMENT_CODE_POINT();
                  }
                  if (tmp_62) {
                    return -1;
                  }
                  charCount = (charCount + (codePoint_1 < 65536 ? 1 : 2)) | 0;
                }
                tmp$ret$54 = 4;
              }
              index = (tmp_38 + tmp$ret$54) | 0;
            } else {
              // Inline function 'okio.internal.codePointIndexToCharIndex.<anonymous>' call
              var c_15 = get_REPLACEMENT_CODE_POINT();
              var tmp0_19 = j;
              j = (tmp0_19 + 1) | 0;
              if (tmp0_19 === codePointCount) {
                return charCount;
              }
              var tmp_65;
              var tmp_66;
              var tmp_67;
              // Inline function 'kotlin.code' call
              var this_40 = _Char___init__impl__6a9atx(10);
              if (!(c_15 === Char__toInt_impl_vasixd(this_40))) {
                // Inline function 'kotlin.code' call
                var this_41 = _Char___init__impl__6a9atx(13);
                tmp_67 = !(c_15 === Char__toInt_impl_vasixd(this_41));
              } else {
                tmp_67 = false;
              }
              if (tmp_67) {
                // Inline function 'okio.isIsoControl' call
                tmp_66 = (0 <= c_15 ? c_15 <= 31 : false) ? true : 127 <= c_15 ? c_15 <= 159 : false;
              } else {
                tmp_66 = false;
              }
              if (tmp_66) {
                tmp_65 = true;
              } else {
                tmp_65 = c_15 === get_REPLACEMENT_CODE_POINT();
              }
              if (tmp_65) {
                return -1;
              }
              charCount = (charCount + (c_15 < 65536 ? 1 : 2)) | 0;
              index = (index + 1) | 0;
            }
          }
        }
      }
    }
    return charCount;
  }
  function decodeHexDigit(c) {
    _init_properties_ByteString_kt__sqjq7b();
    var tmp;
    if (_Char___init__impl__6a9atx(48) <= c ? c <= _Char___init__impl__6a9atx(57) : false) {
      tmp = Char__minus_impl_a2frrh(c, _Char___init__impl__6a9atx(48));
    } else if (_Char___init__impl__6a9atx(97) <= c ? c <= _Char___init__impl__6a9atx(102) : false) {
      tmp = (Char__minus_impl_a2frrh(c, _Char___init__impl__6a9atx(97)) + 10) | 0;
    } else if (_Char___init__impl__6a9atx(65) <= c ? c <= _Char___init__impl__6a9atx(70) : false) {
      tmp = (Char__minus_impl_a2frrh(c, _Char___init__impl__6a9atx(65)) + 10) | 0;
    } else {
      throw IllegalArgumentException_init_$Create$('Unexpected hex digit: ' + toString_0(c));
    }
    return tmp;
  }
  function codePointIndexToCharIndex$accessor$1yfvj6b(s, codePointCount) {
    _init_properties_ByteString_kt__sqjq7b();
    return codePointIndexToCharIndex(s, codePointCount);
  }
  function decodeHexDigit$accessor$1yfvj6b(c) {
    _init_properties_ByteString_kt__sqjq7b();
    return decodeHexDigit(c);
  }
  function decodeHexDigit$accessor$1yfvj6b_0(c) {
    _init_properties_ByteString_kt__sqjq7b();
    return decodeHexDigit(c);
  }
  var properties_initialized_ByteString_kt_8ybv8b;
  function _init_properties_ByteString_kt__sqjq7b() {
    if (!properties_initialized_ByteString_kt_8ybv8b) {
      properties_initialized_ByteString_kt_8ybv8b = true;
      // Inline function 'kotlin.charArrayOf' call
      HEX_DIGIT_CHARS = charArrayOf([
        _Char___init__impl__6a9atx(48),
        _Char___init__impl__6a9atx(49),
        _Char___init__impl__6a9atx(50),
        _Char___init__impl__6a9atx(51),
        _Char___init__impl__6a9atx(52),
        _Char___init__impl__6a9atx(53),
        _Char___init__impl__6a9atx(54),
        _Char___init__impl__6a9atx(55),
        _Char___init__impl__6a9atx(56),
        _Char___init__impl__6a9atx(57),
        _Char___init__impl__6a9atx(97),
        _Char___init__impl__6a9atx(98),
        _Char___init__impl__6a9atx(99),
        _Char___init__impl__6a9atx(100),
        _Char___init__impl__6a9atx(101),
        _Char___init__impl__6a9atx(102),
      ]);
    }
  }
  function get_SLASH() {
    _init_properties_Path_kt__cy3pvf();
    return SLASH;
  }
  var SLASH;
  function get_BACKSLASH() {
    _init_properties_Path_kt__cy3pvf();
    return BACKSLASH;
  }
  var BACKSLASH;
  function get_ANY_SLASH() {
    _init_properties_Path_kt__cy3pvf();
    return ANY_SLASH;
  }
  var ANY_SLASH;
  function get_DOT() {
    _init_properties_Path_kt__cy3pvf();
    return DOT;
  }
  var DOT;
  function get_DOT_DOT() {
    _init_properties_Path_kt__cy3pvf();
    return DOT_DOT;
  }
  var DOT_DOT;
  var properties_initialized_Path_kt_a3g6iv;
  function _init_properties_Path_kt__cy3pvf() {
    if (!properties_initialized_Path_kt_a3g6iv) {
      properties_initialized_Path_kt_a3g6iv = true;
      SLASH = Companion_getInstance_7().encodeUtf8_5n709n_k$('/');
      BACKSLASH = Companion_getInstance_7().encodeUtf8_5n709n_k$('\\');
      ANY_SLASH = Companion_getInstance_7().encodeUtf8_5n709n_k$('/\\');
      DOT = Companion_getInstance_7().encodeUtf8_5n709n_k$('.');
      DOT_DOT = Companion_getInstance_7().encodeUtf8_5n709n_k$('..');
    }
  }
  function commonRead_2(_this__u8e3s4, sink, byteCount) {
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.internal.commonRead.<anonymous>' call
      var message = 'byteCount < 0: ' + byteCount.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonRead.<anonymous>' call
      var message_0 = 'closed';
      throw IllegalStateException_init_$Create$(toString(message_0));
    }
    if (_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().equals(new Long(0, 0))) {
      var read = _this__u8e3s4
        .get_source_jl0x7o_k$()
        .read_a1wdbo_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()));
      if (read.equals(new Long(-1, -1))) return new Long(-1, -1);
    }
    // Inline function 'kotlin.comparisons.minOf' call
    var b = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
    var toRead = byteCount.compareTo_9jj042_k$(b) <= 0 ? byteCount : b;
    return _this__u8e3s4.get_buffer_bmaafd_k$().read_a1wdbo_k$(sink, toRead);
  }
  function commonExhausted(_this__u8e3s4) {
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonExhausted.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    return _this__u8e3s4.get_buffer_bmaafd_k$().exhausted_p1jt55_k$()
      ? _this__u8e3s4
          .get_source_jl0x7o_k$()
          .read_a1wdbo_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
          .equals(new Long(-1, -1))
      : false;
  }
  function commonRequire(_this__u8e3s4, byteCount) {
    if (!_this__u8e3s4.request_mpoy7z_k$(byteCount)) throw EOFException_init_$Create$();
  }
  function commonRequest(_this__u8e3s4, byteCount) {
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.internal.commonRequest.<anonymous>' call
      var message = 'byteCount < 0: ' + byteCount.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonRequest.<anonymous>' call
      var message_0 = 'closed';
      throw IllegalStateException_init_$Create$(toString(message_0));
    }
    while (_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().compareTo_9jj042_k$(byteCount) < 0) {
      if (
        _this__u8e3s4
          .get_source_jl0x7o_k$()
          .read_a1wdbo_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
          .equals(new Long(-1, -1))
      )
        return false;
    }
    return true;
  }
  function commonReadByte_0(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(1, 0));
    return _this__u8e3s4.get_buffer_bmaafd_k$().readByte_ectjk2_k$();
  }
  function commonReadByteString_1(_this__u8e3s4) {
    _this__u8e3s4.get_buffer_bmaafd_k$().writeAll_goqmgy_k$(_this__u8e3s4.get_source_jl0x7o_k$());
    return _this__u8e3s4.get_buffer_bmaafd_k$().readByteString_nzt46n_k$();
  }
  function commonReadByteString_2(_this__u8e3s4, byteCount) {
    _this__u8e3s4.require_28r0pl_k$(byteCount);
    return _this__u8e3s4.get_buffer_bmaafd_k$().readByteString_b9sk0v_k$(byteCount);
  }
  function commonSelect_1(_this__u8e3s4, options) {
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonSelect.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    while (true) {
      var index = selectPrefix(_this__u8e3s4.get_buffer_bmaafd_k$(), options, true);
      switch (index) {
        case -1:
          return -1;
        case -2:
          if (
            _this__u8e3s4
              .get_source_jl0x7o_k$()
              .read_a1wdbo_k$(
                _this__u8e3s4.get_buffer_bmaafd_k$(),
                toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()),
              )
              .equals(new Long(-1, -1))
          )
            return -1;
          break;
        default:
          var selectedSize = options.get_byteStrings_g0wbnz_k$()[index].get_size_woubt6_k$();
          _this__u8e3s4.get_buffer_bmaafd_k$().skip_bgd4sf_k$(toLong(selectedSize));
          return index;
      }
    }
  }
  function commonReadByteArray_1(_this__u8e3s4) {
    _this__u8e3s4.get_buffer_bmaafd_k$().writeAll_goqmgy_k$(_this__u8e3s4.get_source_jl0x7o_k$());
    return _this__u8e3s4.get_buffer_bmaafd_k$().readByteArray_52wnjv_k$();
  }
  function commonReadByteArray_2(_this__u8e3s4, byteCount) {
    _this__u8e3s4.require_28r0pl_k$(byteCount);
    return _this__u8e3s4.get_buffer_bmaafd_k$().readByteArray_176419_k$(byteCount);
  }
  function commonReadFully_1(_this__u8e3s4, sink) {
    try {
      _this__u8e3s4.require_28r0pl_k$(toLong(sink.length));
    } catch ($p) {
      if ($p instanceof EOFException) {
        var e = $p;
        var offset = 0;
        while (_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().compareTo_9jj042_k$(new Long(0, 0)) > 0) {
          var read = _this__u8e3s4
            .get_buffer_bmaafd_k$()
            .read_7zpyie_k$(sink, offset, _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().toInt_1tsl84_k$());
          if (read === -1) throw AssertionError_init_$Create$_0();
          offset = (offset + read) | 0;
        }
        throw e;
      } else {
        throw $p;
      }
    }
    _this__u8e3s4.get_buffer_bmaafd_k$().readFully_qophy4_k$(sink);
  }
  function commonRead_3(_this__u8e3s4, sink, offset, byteCount) {
    checkOffsetAndCount(toLong(sink.length), toLong(offset), toLong(byteCount));
    if (_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().equals(new Long(0, 0))) {
      var read = _this__u8e3s4
        .get_source_jl0x7o_k$()
        .read_a1wdbo_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()));
      if (read.equals(new Long(-1, -1))) return -1;
    }
    // Inline function 'okio.minOf' call
    var b = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
    // Inline function 'kotlin.comparisons.minOf' call
    var a = toLong(byteCount);
    var toRead = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
    return _this__u8e3s4.get_buffer_bmaafd_k$().read_7zpyie_k$(sink, offset, toRead);
  }
  function commonReadFully_2(_this__u8e3s4, sink, byteCount) {
    try {
      _this__u8e3s4.require_28r0pl_k$(byteCount);
    } catch ($p) {
      if ($p instanceof EOFException) {
        var e = $p;
        sink.writeAll_goqmgy_k$(_this__u8e3s4.get_buffer_bmaafd_k$());
        throw e;
      } else {
        throw $p;
      }
    }
    _this__u8e3s4.get_buffer_bmaafd_k$().readFully_8s2k72_k$(sink, byteCount);
  }
  function commonReadAll_0(_this__u8e3s4, sink) {
    var totalBytesWritten = new Long(0, 0);
    while (
      !_this__u8e3s4
        .get_source_jl0x7o_k$()
        .read_a1wdbo_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
        .equals(new Long(-1, -1))
    ) {
      var emitByteCount = _this__u8e3s4.get_buffer_bmaafd_k$().completeSegmentByteCount_8y8ucz_k$();
      if (emitByteCount.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        totalBytesWritten = totalBytesWritten.plus_r93sks_k$(emitByteCount);
        sink.write_f49az7_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), emitByteCount);
      }
    }
    if (_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      totalBytesWritten = totalBytesWritten.plus_r93sks_k$(_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$());
      sink.write_f49az7_k$(
        _this__u8e3s4.get_buffer_bmaafd_k$(),
        _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$(),
      );
    }
    return totalBytesWritten;
  }
  function commonReadUtf8_0(_this__u8e3s4) {
    _this__u8e3s4.get_buffer_bmaafd_k$().writeAll_goqmgy_k$(_this__u8e3s4.get_source_jl0x7o_k$());
    return _this__u8e3s4.get_buffer_bmaafd_k$().readUtf8_echivt_k$();
  }
  function commonReadUtf8_1(_this__u8e3s4, byteCount) {
    _this__u8e3s4.require_28r0pl_k$(byteCount);
    return _this__u8e3s4.get_buffer_bmaafd_k$().readUtf8_pe0fc7_k$(byteCount);
  }
  function commonReadUtf8Line_0(_this__u8e3s4) {
    var newline = _this__u8e3s4.indexOf_ji4kj3_k$(10);
    var tmp;
    if (newline.equals(new Long(-1, -1))) {
      var tmp_0;
      if (!_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().equals(new Long(0, 0))) {
        tmp_0 = _this__u8e3s4.readUtf8_pe0fc7_k$(_this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$());
      } else {
        tmp_0 = null;
      }
      tmp = tmp_0;
    } else {
      tmp = readUtf8Line(_this__u8e3s4.get_buffer_bmaafd_k$(), newline);
    }
    return tmp;
  }
  function commonReadUtf8LineStrict_0(_this__u8e3s4, limit) {
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(limit.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
      // Inline function 'okio.internal.commonReadUtf8LineStrict.<anonymous>' call
      var message = 'limit < 0: ' + limit.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    var tmp;
    if (limit.equals(Companion_getInstance().get_MAX_VALUE_54a9lf_k$())) {
      tmp = Companion_getInstance().get_MAX_VALUE_54a9lf_k$();
    } else {
      // Inline function 'kotlin.Long.plus' call
      tmp = limit.plus_r93sks_k$(toLong(1));
    }
    var scanLength = tmp;
    var newline = _this__u8e3s4.indexOf_nnf9xt_k$(10, new Long(0, 0), scanLength);
    if (!newline.equals(new Long(-1, -1))) return readUtf8Line(_this__u8e3s4.get_buffer_bmaafd_k$(), newline);
    var tmp_0;
    var tmp_1;
    var tmp_2;
    if (
      scanLength.compareTo_9jj042_k$(Companion_getInstance().get_MAX_VALUE_54a9lf_k$()) < 0
        ? _this__u8e3s4.request_mpoy7z_k$(scanLength)
        : false
    ) {
      var tmp_3 = _this__u8e3s4.get_buffer_bmaafd_k$();
      // Inline function 'kotlin.Long.minus' call
      var tmp$ret$2 = scanLength.minus_mfbszm_k$(toLong(1));
      tmp_2 = tmp_3.get_ugtq3c_k$(tmp$ret$2) === 13;
    } else {
      tmp_2 = false;
    }
    if (tmp_2) {
      // Inline function 'kotlin.Long.plus' call
      var tmp$ret$3 = scanLength.plus_r93sks_k$(toLong(1));
      tmp_1 = _this__u8e3s4.request_mpoy7z_k$(tmp$ret$3);
    } else {
      tmp_1 = false;
    }
    if (tmp_1) {
      tmp_0 = _this__u8e3s4.get_buffer_bmaafd_k$().get_ugtq3c_k$(scanLength) === 10;
    } else {
      tmp_0 = false;
    }
    if (tmp_0) {
      return readUtf8Line(_this__u8e3s4.get_buffer_bmaafd_k$(), scanLength);
    }
    var data = new Buffer();
    var tmp_4 = _this__u8e3s4.get_buffer_bmaafd_k$();
    var tmp_5 = new Long(0, 0);
    // Inline function 'okio.minOf' call
    var b = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
    // Inline function 'kotlin.comparisons.minOf' call
    var a = toLong(32);
    var tmp$ret$5 = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
    tmp_4.copyTo_y7so4c_k$(data, tmp_5, tmp$ret$5);
    // Inline function 'kotlin.comparisons.minOf' call
    var a_0 = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
    var tmp$ret$6 = a_0.compareTo_9jj042_k$(limit) <= 0 ? a_0 : limit;
    throw new EOFException(
      '\\n not found: limit=' +
        tmp$ret$6.toString() +
        ' content=' +
        data.readByteString_nzt46n_k$().hex_27mj_k$() +
        '\u2026',
    );
  }
  function commonReadUtf8CodePoint_0(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(1, 0));
    var b0 = _this__u8e3s4.get_buffer_bmaafd_k$().get_ugtq3c_k$(new Long(0, 0));
    if ((b0 & 224) === 192) {
      _this__u8e3s4.require_28r0pl_k$(new Long(2, 0));
    } else if ((b0 & 240) === 224) {
      _this__u8e3s4.require_28r0pl_k$(new Long(3, 0));
    } else if ((b0 & 248) === 240) {
      _this__u8e3s4.require_28r0pl_k$(new Long(4, 0));
    }
    return _this__u8e3s4.get_buffer_bmaafd_k$().readUtf8CodePoint_brmg90_k$();
  }
  function commonReadShort_0(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(2, 0));
    return _this__u8e3s4.get_buffer_bmaafd_k$().readShort_ilpyey_k$();
  }
  function commonReadShortLe(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(2, 0));
    return _this__u8e3s4.get_buffer_bmaafd_k$().readShortLe_lyi6qn_k$();
  }
  function commonReadInt_0(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(4, 0));
    return _this__u8e3s4.get_buffer_bmaafd_k$().readInt_hv8cxl_k$();
  }
  function commonReadIntLe(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(4, 0));
    return _this__u8e3s4.get_buffer_bmaafd_k$().readIntLe_ir3zn2_k$();
  }
  function commonReadLong_0(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(8, 0));
    return _this__u8e3s4.get_buffer_bmaafd_k$().readLong_ecnd8u_k$();
  }
  function commonReadLongLe(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(8, 0));
    return _this__u8e3s4.get_buffer_bmaafd_k$().readLongLe_bnxvp1_k$();
  }
  function commonReadDecimalLong_0(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(1, 0));
    var pos = new Long(0, 0);
    $l$loop_0: while (true) {
      // Inline function 'kotlin.Long.plus' call
      var tmp$ret$0 = pos.plus_r93sks_k$(toLong(1));
      if (!_this__u8e3s4.request_mpoy7z_k$(tmp$ret$0)) {
        break $l$loop_0;
      }
      var b = _this__u8e3s4.get_buffer_bmaafd_k$().get_ugtq3c_k$(pos);
      if ((b < 48 ? true : b > 57) ? (!pos.equals(new Long(0, 0)) ? true : !(b === 45)) : false) {
        if (pos.equals(new Long(0, 0))) {
          // Inline function 'kotlin.text.toString' call
          var tmp$ret$1 = toString_1(b, 16);
          throw NumberFormatException_init_$Create$("Expected a digit or '-' but was 0x" + tmp$ret$1);
        }
        break $l$loop_0;
      }
      pos = pos.inc_28ke_k$();
    }
    return _this__u8e3s4.get_buffer_bmaafd_k$().readDecimalLong_uefo5l_k$();
  }
  function commonReadHexadecimalUnsignedLong_0(_this__u8e3s4) {
    _this__u8e3s4.require_28r0pl_k$(new Long(1, 0));
    var pos = 0;
    $l$loop: while (_this__u8e3s4.request_mpoy7z_k$(toLong((pos + 1) | 0))) {
      var b = _this__u8e3s4.get_buffer_bmaafd_k$().get_ugtq3c_k$(toLong(pos));
      if (((b < 48 ? true : b > 57) ? (b < 97 ? true : b > 102) : false) ? (b < 65 ? true : b > 70) : false) {
        if (pos === 0) {
          // Inline function 'kotlin.text.toString' call
          var tmp$ret$0 = toString_1(b, 16);
          throw NumberFormatException_init_$Create$('Expected leading [0-9a-fA-F] character but was 0x' + tmp$ret$0);
        }
        break $l$loop;
      }
      pos = (pos + 1) | 0;
    }
    return _this__u8e3s4.get_buffer_bmaafd_k$().readHexadecimalUnsignedLong_gqibbu_k$();
  }
  function commonSkip_0(_this__u8e3s4, byteCount) {
    var byteCount_0 = byteCount;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonSkip.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      if (
        _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$().equals(new Long(0, 0))
          ? _this__u8e3s4
              .get_source_jl0x7o_k$()
              .read_a1wdbo_k$(
                _this__u8e3s4.get_buffer_bmaafd_k$(),
                toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()),
              )
              .equals(new Long(-1, -1))
          : false
      ) {
        throw EOFException_init_$Create$();
      }
      // Inline function 'kotlin.comparisons.minOf' call
      var a = byteCount_0;
      var b = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
      var toSkip = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
      _this__u8e3s4.get_buffer_bmaafd_k$().skip_bgd4sf_k$(toSkip);
      byteCount_0 = byteCount_0.minus_mfbszm_k$(toSkip);
    }
  }
  function commonIndexOf_2(_this__u8e3s4, b, fromIndex, toIndex) {
    var fromIndex_0 = fromIndex;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(new Long(0, 0).compareTo_9jj042_k$(fromIndex_0) <= 0 ? fromIndex_0.compareTo_9jj042_k$(toIndex) <= 0 : false)
    ) {
      // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
      var message_0 = 'fromIndex=' + fromIndex_0.toString() + ' toIndex=' + toIndex.toString();
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    while (fromIndex_0.compareTo_9jj042_k$(toIndex) < 0) {
      var result = _this__u8e3s4.get_buffer_bmaafd_k$().indexOf_nnf9xt_k$(b, fromIndex_0, toIndex);
      if (!result.equals(new Long(-1, -1))) return result;
      var lastBufferSize = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
      if (
        lastBufferSize.compareTo_9jj042_k$(toIndex) >= 0
          ? true
          : _this__u8e3s4
              .get_source_jl0x7o_k$()
              .read_a1wdbo_k$(
                _this__u8e3s4.get_buffer_bmaafd_k$(),
                toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()),
              )
              .equals(new Long(-1, -1))
      )
        return new Long(-1, -1);
      // Inline function 'kotlin.comparisons.maxOf' call
      var a = fromIndex_0;
      fromIndex_0 = a.compareTo_9jj042_k$(lastBufferSize) >= 0 ? a : lastBufferSize;
    }
    return new Long(-1, -1);
  }
  function commonIndexOf_3(_this__u8e3s4, bytes, fromIndex) {
    var fromIndex_0 = fromIndex;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    while (true) {
      var result = _this__u8e3s4.get_buffer_bmaafd_k$().indexOf_btz2i6_k$(bytes, fromIndex_0);
      if (!result.equals(new Long(-1, -1))) return result;
      var lastBufferSize = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
      if (
        _this__u8e3s4
          .get_source_jl0x7o_k$()
          .read_a1wdbo_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
          .equals(new Long(-1, -1))
      )
        return new Long(-1, -1);
      // Inline function 'kotlin.comparisons.maxOf' call
      var a = fromIndex_0;
      // Inline function 'kotlin.Long.plus' call
      // Inline function 'kotlin.Long.minus' call
      var other = bytes.get_size_woubt6_k$();
      var b = lastBufferSize.minus_mfbszm_k$(toLong(other)).plus_r93sks_k$(toLong(1));
      fromIndex_0 = a.compareTo_9jj042_k$(b) >= 0 ? a : b;
    }
  }
  function commonIndexOfElement_0(_this__u8e3s4, targetBytes, fromIndex) {
    var fromIndex_0 = fromIndex;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonIndexOfElement.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    while (true) {
      var result = _this__u8e3s4.get_buffer_bmaafd_k$().indexOfElement_r14ejc_k$(targetBytes, fromIndex_0);
      if (!result.equals(new Long(-1, -1))) return result;
      var lastBufferSize = _this__u8e3s4.get_buffer_bmaafd_k$().get_size_woubt6_k$();
      if (
        _this__u8e3s4
          .get_source_jl0x7o_k$()
          .read_a1wdbo_k$(_this__u8e3s4.get_buffer_bmaafd_k$(), toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
          .equals(new Long(-1, -1))
      )
        return new Long(-1, -1);
      // Inline function 'kotlin.comparisons.maxOf' call
      var a = fromIndex_0;
      fromIndex_0 = a.compareTo_9jj042_k$(lastBufferSize) >= 0 ? a : lastBufferSize;
    }
  }
  function commonRangeEquals_2(_this__u8e3s4, offset, bytes, bytesOffset, byteCount) {
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!_this__u8e3s4.get_closed_byjrzp_k$()) {
      // Inline function 'okio.internal.commonRangeEquals.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    if (
      ((offset.compareTo_9jj042_k$(new Long(0, 0)) < 0 ? true : bytesOffset < 0) ? true : byteCount < 0)
        ? true
        : ((bytes.get_size_woubt6_k$() - bytesOffset) | 0) < byteCount
    ) {
      return false;
    }
    var inductionVariable = 0;
    if (inductionVariable < byteCount)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        // Inline function 'kotlin.Long.plus' call
        var bufferOffset = offset.plus_r93sks_k$(toLong(i));
        // Inline function 'kotlin.Long.plus' call
        var tmp$ret$2 = bufferOffset.plus_r93sks_k$(toLong(1));
        if (!_this__u8e3s4.request_mpoy7z_k$(tmp$ret$2)) return false;
        if (
          !(
            _this__u8e3s4.get_buffer_bmaafd_k$().get_ugtq3c_k$(bufferOffset) ===
            bytes.get_c1px32_k$((bytesOffset + i) | 0)
          )
        )
          return false;
      } while (inductionVariable < byteCount);
    return true;
  }
  function commonPeek(_this__u8e3s4) {
    return buffer(new PeekSource(_this__u8e3s4));
  }
  function commonClose_0(_this__u8e3s4) {
    if (_this__u8e3s4.get_closed_byjrzp_k$()) return Unit_getInstance();
    _this__u8e3s4.set_closed_z8zuoc_k$(true);
    _this__u8e3s4.get_source_jl0x7o_k$().close_yn9xrc_k$();
    _this__u8e3s4.get_buffer_bmaafd_k$().clear_j9egeb_k$();
  }
  function commonTimeout(_this__u8e3s4) {
    return _this__u8e3s4.get_source_jl0x7o_k$().timeout_lq9okf_k$();
  }
  function commonToString_0(_this__u8e3s4) {
    return 'buffer(' + _this__u8e3s4.get_source_jl0x7o_k$() + ')';
  }
  function commonSubstring_0(_this__u8e3s4, beginIndex, endIndex) {
    var endIndex_0 = resolveDefaultParameter(_this__u8e3s4, endIndex);
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(beginIndex >= 0)) {
      // Inline function 'okio.internal.commonSubstring.<anonymous>' call
      var message = 'beginIndex=' + beginIndex + ' < 0';
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(endIndex_0 <= _this__u8e3s4.get_size_woubt6_k$())) {
      // Inline function 'okio.internal.commonSubstring.<anonymous>' call
      var message_0 = 'endIndex=' + endIndex_0 + ' > length(' + _this__u8e3s4.get_size_woubt6_k$() + ')';
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    var subLen = (endIndex_0 - beginIndex) | 0;
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(subLen >= 0)) {
      // Inline function 'okio.internal.commonSubstring.<anonymous>' call
      var message_1 = 'endIndex=' + endIndex_0 + ' < beginIndex=' + beginIndex;
      throw IllegalArgumentException_init_$Create$(toString(message_1));
    }
    if (beginIndex === 0 ? endIndex_0 === _this__u8e3s4.get_size_woubt6_k$() : false) return _this__u8e3s4;
    else if (beginIndex === endIndex_0) return Companion_getInstance_7().get_EMPTY_i8q41w_k$();
    var beginSegment = segment(_this__u8e3s4, beginIndex);
    var endSegment = segment(_this__u8e3s4, (endIndex_0 - 1) | 0);
    var newSegments = copyOfRange_0(_this__u8e3s4.get_segments_ecat1z_k$(), beginSegment, (endSegment + 1) | 0);
    var newDirectory = new Int32Array(imul(newSegments.length, 2));
    var index = 0;
    var inductionVariable = beginSegment;
    if (inductionVariable <= endSegment)
      do {
        var s = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var tmp = index;
        // Inline function 'kotlin.comparisons.minOf' call
        var a = (_this__u8e3s4.get_directory_7ekq4c_k$()[s] - beginIndex) | 0;
        newDirectory[tmp] = Math.min(a, subLen);
        var tmp1 = index;
        index = (tmp1 + 1) | 0;
        newDirectory[(tmp1 + newSegments.length) | 0] =
          _this__u8e3s4.get_directory_7ekq4c_k$()[(s + _this__u8e3s4.get_segments_ecat1z_k$().length) | 0];
      } while (!(s === endSegment));
    var segmentOffset = beginSegment === 0 ? 0 : _this__u8e3s4.get_directory_7ekq4c_k$()[(beginSegment - 1) | 0];
    var tmp3_index0 = newSegments.length;
    newDirectory[tmp3_index0] = (newDirectory[tmp3_index0] + ((beginIndex - segmentOffset) | 0)) | 0;
    return new SegmentedByteString(newSegments, newDirectory);
  }
  function commonInternalGet(_this__u8e3s4, pos) {
    checkOffsetAndCount(
      toLong(_this__u8e3s4.get_directory_7ekq4c_k$()[(_this__u8e3s4.get_segments_ecat1z_k$().length - 1) | 0]),
      toLong(pos),
      new Long(1, 0),
    );
    var segment_0 = segment(_this__u8e3s4, pos);
    var segmentOffset = segment_0 === 0 ? 0 : _this__u8e3s4.get_directory_7ekq4c_k$()[(segment_0 - 1) | 0];
    var segmentPos =
      _this__u8e3s4.get_directory_7ekq4c_k$()[(segment_0 + _this__u8e3s4.get_segments_ecat1z_k$().length) | 0];
    return _this__u8e3s4.get_segments_ecat1z_k$()[segment_0][(((pos - segmentOffset) | 0) + segmentPos) | 0];
  }
  function commonGetSize_0(_this__u8e3s4) {
    return _this__u8e3s4.get_directory_7ekq4c_k$()[(_this__u8e3s4.get_segments_ecat1z_k$().length - 1) | 0];
  }
  function commonToByteArray_0(_this__u8e3s4) {
    var result = new Int8Array(_this__u8e3s4.get_size_woubt6_k$());
    var resultPos = 0;
    // Inline function 'okio.internal.forEachSegment' call
    var segmentCount = _this__u8e3s4.get_segments_ecat1z_k$().length;
    var s = 0;
    var pos = 0;
    while (s < segmentCount) {
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(segmentCount + s) | 0];
      var nextSegmentOffset = _this__u8e3s4.get_directory_7ekq4c_k$()[s];
      // Inline function 'okio.internal.commonToByteArray.<anonymous>' call
      var byteCount = (nextSegmentOffset - pos) | 0;
      // Inline function 'kotlin.collections.copyInto' call
      var this_0 = _this__u8e3s4.get_segments_ecat1z_k$()[s];
      var destinationOffset = resultPos;
      var endIndex = (segmentPos + byteCount) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = this_0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, result, destinationOffset, segmentPos, endIndex);
      resultPos = (resultPos + byteCount) | 0;
      pos = nextSegmentOffset;
      s = (s + 1) | 0;
    }
    return result;
  }
  function commonWrite_5(_this__u8e3s4, buffer, offset, byteCount) {
    // Inline function 'okio.internal.forEachSegment' call
    var endIndex = (offset + byteCount) | 0;
    var s = segment(_this__u8e3s4, offset);
    var pos = offset;
    while (pos < endIndex) {
      var segmentOffset = s === 0 ? 0 : _this__u8e3s4.get_directory_7ekq4c_k$()[(s - 1) | 0];
      var segmentSize = (_this__u8e3s4.get_directory_7ekq4c_k$()[s] - segmentOffset) | 0;
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(_this__u8e3s4.get_segments_ecat1z_k$().length + s) | 0];
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (segmentOffset + segmentSize) | 0;
      var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
      var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
      // Inline function 'okio.internal.commonWrite.<anonymous>' call
      var data = _this__u8e3s4.get_segments_ecat1z_k$()[s];
      var segment_0 = Segment_init_$Create$_0(data, offset_0, (offset_0 + byteCount_0) | 0, true, false);
      if (buffer.get_head_won7e1_k$() == null) {
        segment_0.set_prev_ur3dkn_k$(segment_0);
        segment_0.set_next_tohs5l_k$(segment_0.get_prev_wosl18_k$());
        buffer.set_head_iv937o_k$(segment_0.get_next_wor1vg_k$());
      } else {
        ensureNotNull(ensureNotNull(buffer.get_head_won7e1_k$()).get_prev_wosl18_k$()).push_wd62e0_k$(segment_0);
      }
      pos = (pos + byteCount_0) | 0;
      s = (s + 1) | 0;
    }
    // Inline function 'kotlin.Long.plus' call
    var tmp$ret$1 = buffer.get_size_woubt6_k$().plus_r93sks_k$(toLong(byteCount));
    buffer.set_size_9bzqhs_k$(tmp$ret$1);
  }
  function commonRangeEquals_3(_this__u8e3s4, offset, other, otherOffset, byteCount) {
    if (offset < 0 ? true : offset > ((_this__u8e3s4.get_size_woubt6_k$() - byteCount) | 0)) return false;
    var otherOffset_0 = otherOffset;
    // Inline function 'okio.internal.forEachSegment' call
    var endIndex = (offset + byteCount) | 0;
    var s = segment(_this__u8e3s4, offset);
    var pos = offset;
    while (pos < endIndex) {
      var segmentOffset = s === 0 ? 0 : _this__u8e3s4.get_directory_7ekq4c_k$()[(s - 1) | 0];
      var segmentSize = (_this__u8e3s4.get_directory_7ekq4c_k$()[s] - segmentOffset) | 0;
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(_this__u8e3s4.get_segments_ecat1z_k$().length + s) | 0];
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (segmentOffset + segmentSize) | 0;
      var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
      var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
      // Inline function 'okio.internal.commonRangeEquals.<anonymous>' call
      var data = _this__u8e3s4.get_segments_ecat1z_k$()[s];
      if (!other.rangeEquals_4nzvj0_k$(otherOffset_0, data, offset_0, byteCount_0)) return false;
      otherOffset_0 = (otherOffset_0 + byteCount_0) | 0;
      pos = (pos + byteCount_0) | 0;
      s = (s + 1) | 0;
    }
    return true;
  }
  function commonRangeEquals_4(_this__u8e3s4, offset, other, otherOffset, byteCount) {
    if (
      ((offset < 0 ? true : offset > ((_this__u8e3s4.get_size_woubt6_k$() - byteCount) | 0)) ? true : otherOffset < 0)
        ? true
        : otherOffset > ((other.length - byteCount) | 0)
    ) {
      return false;
    }
    var otherOffset_0 = otherOffset;
    // Inline function 'okio.internal.forEachSegment' call
    var endIndex = (offset + byteCount) | 0;
    var s = segment(_this__u8e3s4, offset);
    var pos = offset;
    while (pos < endIndex) {
      var segmentOffset = s === 0 ? 0 : _this__u8e3s4.get_directory_7ekq4c_k$()[(s - 1) | 0];
      var segmentSize = (_this__u8e3s4.get_directory_7ekq4c_k$()[s] - segmentOffset) | 0;
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(_this__u8e3s4.get_segments_ecat1z_k$().length + s) | 0];
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (segmentOffset + segmentSize) | 0;
      var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
      var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
      // Inline function 'okio.internal.commonRangeEquals.<anonymous>' call
      var data = _this__u8e3s4.get_segments_ecat1z_k$()[s];
      if (!arrayRangeEquals(data, offset_0, other, otherOffset_0, byteCount_0)) return false;
      otherOffset_0 = (otherOffset_0 + byteCount_0) | 0;
      pos = (pos + byteCount_0) | 0;
      s = (s + 1) | 0;
    }
    return true;
  }
  function commonCopyInto_0(_this__u8e3s4, offset, target, targetOffset, byteCount) {
    checkOffsetAndCount(toLong(_this__u8e3s4.get_size_woubt6_k$()), toLong(offset), toLong(byteCount));
    checkOffsetAndCount(toLong(target.length), toLong(targetOffset), toLong(byteCount));
    var targetOffset_0 = targetOffset;
    // Inline function 'okio.internal.forEachSegment' call
    var endIndex = (offset + byteCount) | 0;
    var s = segment(_this__u8e3s4, offset);
    var pos = offset;
    while (pos < endIndex) {
      var segmentOffset = s === 0 ? 0 : _this__u8e3s4.get_directory_7ekq4c_k$()[(s - 1) | 0];
      var segmentSize = (_this__u8e3s4.get_directory_7ekq4c_k$()[s] - segmentOffset) | 0;
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(_this__u8e3s4.get_segments_ecat1z_k$().length + s) | 0];
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (segmentOffset + segmentSize) | 0;
      var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
      var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
      // Inline function 'okio.internal.commonCopyInto.<anonymous>' call
      // Inline function 'kotlin.collections.copyInto' call
      var this_0 = _this__u8e3s4.get_segments_ecat1z_k$()[s];
      var destinationOffset = targetOffset_0;
      var endIndex_0 = (offset_0 + byteCount_0) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = this_0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, target, destinationOffset, offset_0, endIndex_0);
      targetOffset_0 = (targetOffset_0 + byteCount_0) | 0;
      pos = (pos + byteCount_0) | 0;
      s = (s + 1) | 0;
    }
  }
  function forEachSegment(_this__u8e3s4, action) {
    var segmentCount = _this__u8e3s4.get_segments_ecat1z_k$().length;
    var s = 0;
    var pos = 0;
    while (s < segmentCount) {
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(segmentCount + s) | 0];
      var nextSegmentOffset = _this__u8e3s4.get_directory_7ekq4c_k$()[s];
      action(_this__u8e3s4.get_segments_ecat1z_k$()[s], segmentPos, (nextSegmentOffset - pos) | 0);
      pos = nextSegmentOffset;
      s = (s + 1) | 0;
    }
  }
  function commonEquals_1(_this__u8e3s4, other) {
    var tmp;
    if (other === _this__u8e3s4) {
      tmp = true;
    } else {
      if (other instanceof ByteString) {
        tmp =
          other.get_size_woubt6_k$() === _this__u8e3s4.get_size_woubt6_k$()
            ? _this__u8e3s4.rangeEquals_b8izl9_k$(0, other, 0, _this__u8e3s4.get_size_woubt6_k$())
            : false;
      } else {
        tmp = false;
      }
    }
    return tmp;
  }
  function commonHashCode_1(_this__u8e3s4) {
    var result = _this__u8e3s4.get_hashCode_td036k_k$();
    if (!(result === 0)) return result;
    result = 1;
    // Inline function 'okio.internal.forEachSegment' call
    var segmentCount = _this__u8e3s4.get_segments_ecat1z_k$().length;
    var s = 0;
    var pos = 0;
    while (s < segmentCount) {
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(segmentCount + s) | 0];
      var nextSegmentOffset = _this__u8e3s4.get_directory_7ekq4c_k$()[s];
      // Inline function 'okio.internal.commonHashCode.<anonymous>' call
      var data = _this__u8e3s4.get_segments_ecat1z_k$()[s];
      var i = segmentPos;
      var limit = (segmentPos + ((nextSegmentOffset - pos) | 0)) | 0;
      while (i < limit) {
        result = (imul(31, result) + data[i]) | 0;
        i = (i + 1) | 0;
      }
      pos = nextSegmentOffset;
      s = (s + 1) | 0;
    }
    _this__u8e3s4.set_hashCode_zcrtc_k$(result);
    return result;
  }
  function segment(_this__u8e3s4, pos) {
    var i = binarySearch_0(
      _this__u8e3s4.get_directory_7ekq4c_k$(),
      (pos + 1) | 0,
      0,
      _this__u8e3s4.get_segments_ecat1z_k$().length,
    );
    return i >= 0 ? i : ~i;
  }
  function forEachSegment_0(_this__u8e3s4, beginIndex, endIndex, action) {
    var s = segment(_this__u8e3s4, beginIndex);
    var pos = beginIndex;
    while (pos < endIndex) {
      var segmentOffset = s === 0 ? 0 : _this__u8e3s4.get_directory_7ekq4c_k$()[(s - 1) | 0];
      var segmentSize = (_this__u8e3s4.get_directory_7ekq4c_k$()[s] - segmentOffset) | 0;
      var segmentPos = _this__u8e3s4.get_directory_7ekq4c_k$()[(_this__u8e3s4.get_segments_ecat1z_k$().length + s) | 0];
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (segmentOffset + segmentSize) | 0;
      var byteCount = (Math.min(endIndex, b) - pos) | 0;
      var offset = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
      action(_this__u8e3s4.get_segments_ecat1z_k$()[s], offset, byteCount);
      pos = (pos + byteCount) | 0;
      s = (s + 1) | 0;
    }
  }
  function binarySearch_0(_this__u8e3s4, value, fromIndex, toIndex) {
    var left = fromIndex;
    var right = (toIndex - 1) | 0;
    while (left <= right) {
      var mid = (((left + right) | 0) >>> 1) | 0;
      var midVal = _this__u8e3s4[mid];
      if (midVal < value) left = (mid + 1) | 0;
      else if (midVal > value) right = (mid - 1) | 0;
      else return mid;
    }
    return ((-left | 0) - 1) | 0;
  }
  function HashFunction() {}
  function _get_IPAD__cq3ym9($this) {
    return $this.IPAD_1;
  }
  function _get_OPAD__cteq6f($this) {
    return $this.OPAD_1;
  }
  function create($this, key, hashFunction, blockLength) {
    var keySize = key.get_size_woubt6_k$();
    var tmp;
    if (keySize === 0) {
      throw IllegalArgumentException_init_$Create$('Empty key');
    } else if (keySize === blockLength) {
      tmp = key.get_data_wokkxf_k$();
    } else if (keySize < blockLength) {
      tmp = copyOf(key.get_data_wokkxf_k$(), blockLength);
    } else {
      // Inline function 'kotlin.apply' call
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'okio.internal.Companion.create.<anonymous>' call
      hashFunction.update$default_mhmryi_k$(key.get_data_wokkxf_k$());
      tmp = copyOf(hashFunction.digest_m0ziv0_k$(), blockLength);
    }
    var paddedKey = tmp;
    var tmp_0 = 0;
    var tmp_1 = new Int8Array(blockLength);
    while (tmp_0 < blockLength) {
      var tmp_2 = tmp_0;
      // Inline function 'okio.xor' call
      var this_0 = paddedKey[tmp_2];
      tmp_1[tmp_2] = toByte(this_0 ^ 54);
      tmp_0 = (tmp_0 + 1) | 0;
    }
    var innerKey = tmp_1;
    var tmp_3 = 0;
    var tmp_4 = new Int8Array(blockLength);
    while (tmp_3 < blockLength) {
      var tmp_5 = tmp_3;
      // Inline function 'okio.xor' call
      var this_1 = paddedKey[tmp_5];
      tmp_4[tmp_5] = toByte(this_1 ^ 92);
      tmp_3 = (tmp_3 + 1) | 0;
    }
    var outerKey = tmp_4;
    hashFunction.update$default_mhmryi_k$(innerKey);
    return new Hmac(hashFunction, outerKey);
  }
  function _get_hashFunction__m3tqmd($this) {
    return $this.hashFunction_1;
  }
  function _get_outerKey__fte6xl($this) {
    return $this.outerKey_1;
  }
  function Companion_2() {
    Companion_instance_2 = this;
    this.IPAD_1 = 54;
    this.OPAD_1 = 92;
  }
  protoOf(Companion_2).sha1_yksf2c_k$ = function (key) {
    return create(this, key, new Sha1(), 64);
  };
  protoOf(Companion_2).sha256_4vtk9u_k$ = function (key) {
    return create(this, key, new Sha256(), 64);
  };
  protoOf(Companion_2).sha512_w2x7pb_k$ = function (key) {
    return create(this, key, new Sha512(), 128);
  };
  var Companion_instance_2;
  function Companion_getInstance_3() {
    if (Companion_instance_2 == null) new Companion_2();
    return Companion_instance_2;
  }
  function Hmac(hashFunction, outerKey) {
    Companion_getInstance_3();
    this.hashFunction_1 = hashFunction;
    this.outerKey_1 = outerKey;
  }
  protoOf(Hmac).update_6igkux_k$ = function (input, offset, byteCount) {
    this.hashFunction_1.update_6igkux_k$(input, offset, byteCount);
  };
  protoOf(Hmac).digest_m0ziv0_k$ = function () {
    var digest = this.hashFunction_1.digest_m0ziv0_k$();
    this.hashFunction_1.update$default_mhmryi_k$(this.outerKey_1);
    this.hashFunction_1.update$default_mhmryi_k$(digest);
    return this.hashFunction_1.digest_m0ziv0_k$();
  };
  function _get_s__7mlovy($this) {
    return $this.s_1;
  }
  function _get_k__7mlop2($this) {
    return $this.k_1;
  }
  function _set_messageLength__vx4ezs($this, _set____db54di) {
    $this.messageLength_1 = _set____db54di;
  }
  function _get_messageLength__nw84h0($this) {
    return $this.messageLength_1;
  }
  function _get_unprocessed__1lqkro($this) {
    return $this.unprocessed_1;
  }
  function _set_unprocessedLimit__o7naz3($this, _set____db54di) {
    $this.unprocessedLimit_1 = _set____db54di;
  }
  function _get_unprocessedLimit__4vgy3p($this) {
    return $this.unprocessedLimit_1;
  }
  function _get_words__9f9arc($this) {
    return $this.words_1;
  }
  function _set_h0__dl8q41($this, _set____db54di) {
    $this.h0__1 = _set____db54di;
  }
  function _get_h0__ndc14z($this) {
    return $this.h0__1;
  }
  function _set_h1__dl8q36($this, _set____db54di) {
    $this.h1__1 = _set____db54di;
  }
  function _get_h1__ndc15u($this) {
    return $this.h1__1;
  }
  function _set_h2__dl8q2b($this, _set____db54di) {
    $this.h2__1 = _set____db54di;
  }
  function _get_h2__ndc16p($this) {
    return $this.h2__1;
  }
  function _set_h3__dl8q1g($this, _set____db54di) {
    $this.h3__1 = _set____db54di;
  }
  function _get_h3__ndc17k($this) {
    return $this.h3__1;
  }
  function processChunk($this, input, pos) {
    var words = $this.words_1;
    var pos_0 = pos;
    var inductionVariable = 0;
    if (inductionVariable < 16)
      do {
        var w = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var tmp4 = pos_0;
        pos_0 = (tmp4 + 1) | 0;
        var tmp = input[tmp4] & 255;
        var tmp3 = pos_0;
        pos_0 = (tmp3 + 1) | 0;
        var tmp_0 = tmp | ((input[tmp3] & 255) << 8);
        var tmp2 = pos_0;
        pos_0 = (tmp2 + 1) | 0;
        var tmp_1 = tmp_0 | ((input[tmp2] & 255) << 16);
        var tmp1 = pos_0;
        pos_0 = (tmp1 + 1) | 0;
        words[w] = tmp_1 | ((input[tmp1] & 255) << 24);
      } while (inductionVariable < 16);
    hash($this, words);
  }
  function hash($this, words) {
    var localK = Companion_getInstance_4().k_1;
    var localS = Companion_getInstance_4().s_1;
    var a = $this.h0__1;
    var b = $this.h1__1;
    var c = $this.h2__1;
    var d = $this.h3__1;
    var inductionVariable = 0;
    if (inductionVariable < 16)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var g = i;
        var f = (((((((b & c) | (~b & d)) + a) | 0) + localK[i]) | 0) + words[g]) | 0;
        a = d;
        d = c;
        c = b;
        var tmp = b;
        // Inline function 'okio.leftRotate' call
        var bitCount = localS[i];
        b = (tmp + ((f << bitCount) | ((f >>> ((32 - bitCount) | 0)) | 0))) | 0;
      } while (inductionVariable < 16);
    var inductionVariable_0 = 16;
    if (inductionVariable_0 < 32)
      do {
        var i_0 = inductionVariable_0;
        inductionVariable_0 = (inductionVariable_0 + 1) | 0;
        var g_0 = ((imul(5, i_0) + 1) | 0) % 16 | 0;
        var f_0 = (((((((d & b) | (~d & c)) + a) | 0) + localK[i_0]) | 0) + words[g_0]) | 0;
        a = d;
        d = c;
        c = b;
        var tmp_0 = b;
        // Inline function 'okio.leftRotate' call
        var bitCount_0 = localS[i_0];
        b = (tmp_0 + ((f_0 << bitCount_0) | ((f_0 >>> ((32 - bitCount_0) | 0)) | 0))) | 0;
      } while (inductionVariable_0 < 32);
    var inductionVariable_1 = 32;
    if (inductionVariable_1 < 48)
      do {
        var i_1 = inductionVariable_1;
        inductionVariable_1 = (inductionVariable_1 + 1) | 0;
        var g_1 = ((imul(3, i_1) + 5) | 0) % 16 | 0;
        var f_1 = ((((((b ^ c ^ d) + a) | 0) + localK[i_1]) | 0) + words[g_1]) | 0;
        a = d;
        d = c;
        c = b;
        var tmp_1 = b;
        // Inline function 'okio.leftRotate' call
        var bitCount_1 = localS[i_1];
        b = (tmp_1 + ((f_1 << bitCount_1) | ((f_1 >>> ((32 - bitCount_1) | 0)) | 0))) | 0;
      } while (inductionVariable_1 < 48);
    var inductionVariable_2 = 48;
    if (inductionVariable_2 < 64)
      do {
        var i_2 = inductionVariable_2;
        inductionVariable_2 = (inductionVariable_2 + 1) | 0;
        var g_2 = imul(7, i_2) % 16 | 0;
        var f_2 = ((((((c ^ (b | ~d)) + a) | 0) + localK[i_2]) | 0) + words[g_2]) | 0;
        a = d;
        d = c;
        c = b;
        var tmp_2 = b;
        // Inline function 'okio.leftRotate' call
        var bitCount_2 = localS[i_2];
        b = (tmp_2 + ((f_2 << bitCount_2) | ((f_2 >>> ((32 - bitCount_2) | 0)) | 0))) | 0;
      } while (inductionVariable_2 < 64);
    $this.h0__1 = ($this.h0__1 + a) | 0;
    $this.h1__1 = ($this.h1__1 + b) | 0;
    $this.h2__1 = ($this.h2__1 + c) | 0;
    $this.h3__1 = ($this.h3__1 + d) | 0;
  }
  function Companion_3() {
    Companion_instance_3 = this;
    var tmp = this;
    // Inline function 'kotlin.intArrayOf' call
    tmp.s_1 = new Int32Array([
      7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
      20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6,
      10, 15, 21,
    ]);
    var tmp_0 = this;
    // Inline function 'kotlin.intArrayOf' call
    tmp_0.k_1 = new Int32Array([
      -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983, 1770035416,
      -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329, -165796510, -1069501632,
      643717713, -373897302, -701558691, 38016083, -660478335, -405537848, 568446438, -1019803690, -187363961,
      1163531501, -1444681467, -51403784, 1735328473, -1926607734, -378558, -2022574463, 1839030562, -35309556,
      -1530992060, 1272893353, -155497632, -1094730640, 681279174, -358537222, -722521979, 76029189, -640364487,
      -421815835, 530742520, -995338651, -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606,
      -1051523, -2054922799, 1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259,
      -343485551,
    ]);
  }
  var Companion_instance_3;
  function Companion_getInstance_4() {
    if (Companion_instance_3 == null) new Companion_3();
    return Companion_instance_3;
  }
  function Md5() {
    Companion_getInstance_4();
    this.messageLength_1 = new Long(0, 0);
    this.unprocessed_1 = new Int8Array(64);
    this.unprocessedLimit_1 = 0;
    this.words_1 = new Int32Array(16);
    this.h0__1 = 1732584193;
    this.h1__1 = -271733879;
    this.h2__1 = -1732584194;
    this.h3__1 = 271733878;
  }
  protoOf(Md5).update_6igkux_k$ = function (input, offset, byteCount) {
    var tmp = this;
    // Inline function 'kotlin.Long.plus' call
    tmp.messageLength_1 = this.messageLength_1.plus_r93sks_k$(toLong(byteCount));
    var pos = offset;
    var limit = (pos + byteCount) | 0;
    var unprocessed = this.unprocessed_1;
    var unprocessedLimit = this.unprocessedLimit_1;
    if (unprocessedLimit > 0) {
      if (((unprocessedLimit + byteCount) | 0) < 64) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_0 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_0, unprocessed, unprocessedLimit, startIndex, limit);
        this.unprocessedLimit_1 = (unprocessedLimit + byteCount) | 0;
        return Unit_getInstance();
      }
      var consumeByteCount = (64 - unprocessedLimit) | 0;
      // Inline function 'kotlin.collections.copyInto' call
      var startIndex_0 = pos;
      var endIndex = (pos + consumeByteCount) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = input;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp_1, unprocessed, unprocessedLimit, startIndex_0, endIndex);
      processChunk(this, unprocessed, 0);
      this.unprocessedLimit_1 = 0;
      pos = (pos + consumeByteCount) | 0;
    }
    while (pos < limit) {
      var nextPos = (pos + 64) | 0;
      if (nextPos > limit) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex_1 = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_2 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_2, unprocessed, 0, startIndex_1, limit);
        this.unprocessedLimit_1 = (limit - pos) | 0;
        return Unit_getInstance();
      }
      processChunk(this, input, pos);
      pos = nextPos;
    }
  };
  protoOf(Md5).digest_m0ziv0_k$ = function () {
    // Inline function 'kotlin.Long.times' call
    var messageLengthBits = this.messageLength_1.times_nfzjiw_k$(toLong(8));
    var tmp1 = this.unprocessedLimit_1;
    this.unprocessedLimit_1 = (tmp1 + 1) | 0;
    this.unprocessed_1[tmp1] = -128;
    if (this.unprocessedLimit_1 > 56) {
      fill(this.unprocessed_1, 0, this.unprocessedLimit_1, 64);
      processChunk(this, this.unprocessed_1, 0);
      fill(this.unprocessed_1, 0, 0, this.unprocessedLimit_1);
    } else {
      fill(this.unprocessed_1, 0, this.unprocessedLimit_1, 56);
    }
    this.unprocessed_1[56] = messageLengthBits.toByte_edm0nx_k$();
    this.unprocessed_1[57] = messageLengthBits.ushr_z7nmq8_k$(8).toByte_edm0nx_k$();
    this.unprocessed_1[58] = messageLengthBits.ushr_z7nmq8_k$(16).toByte_edm0nx_k$();
    this.unprocessed_1[59] = messageLengthBits.ushr_z7nmq8_k$(24).toByte_edm0nx_k$();
    this.unprocessed_1[60] = messageLengthBits.ushr_z7nmq8_k$(32).toByte_edm0nx_k$();
    this.unprocessed_1[61] = messageLengthBits.ushr_z7nmq8_k$(40).toByte_edm0nx_k$();
    this.unprocessed_1[62] = messageLengthBits.ushr_z7nmq8_k$(48).toByte_edm0nx_k$();
    this.unprocessed_1[63] = messageLengthBits.ushr_z7nmq8_k$(56).toByte_edm0nx_k$();
    processChunk(this, this.unprocessed_1, 0);
    var a = this.h0__1;
    var b = this.h1__1;
    var c = this.h2__1;
    var d = this.h3__1;
    // Inline function 'kotlin.byteArrayOf' call
    return new Int8Array([
      toByte(a),
      toByte(a >> 8),
      toByte(a >> 16),
      toByte(a >> 24),
      toByte(b),
      toByte(b >> 8),
      toByte(b >> 16),
      toByte(b >> 24),
      toByte(c),
      toByte(c >> 8),
      toByte(c >> 16),
      toByte(c >> 24),
      toByte(d),
      toByte(d >> 8),
      toByte(d >> 16),
      toByte(d >> 24),
    ]);
  };
  function _set_messageLength__vx4ezs_0($this, _set____db54di) {
    $this.messageLength_1 = _set____db54di;
  }
  function _get_messageLength__nw84h0_0($this) {
    return $this.messageLength_1;
  }
  function _get_unprocessed__1lqkro_0($this) {
    return $this.unprocessed_1;
  }
  function _set_unprocessedLimit__o7naz3_0($this, _set____db54di) {
    $this.unprocessedLimit_1 = _set____db54di;
  }
  function _get_unprocessedLimit__4vgy3p_0($this) {
    return $this.unprocessedLimit_1;
  }
  function _get_words__9f9arc_0($this) {
    return $this.words_1;
  }
  function _set_h0__dl8q41_0($this, _set____db54di) {
    $this.h0__1 = _set____db54di;
  }
  function _get_h0__ndc14z_0($this) {
    return $this.h0__1;
  }
  function _set_h1__dl8q36_0($this, _set____db54di) {
    $this.h1__1 = _set____db54di;
  }
  function _get_h1__ndc15u_0($this) {
    return $this.h1__1;
  }
  function _set_h2__dl8q2b_0($this, _set____db54di) {
    $this.h2__1 = _set____db54di;
  }
  function _get_h2__ndc16p_0($this) {
    return $this.h2__1;
  }
  function _set_h3__dl8q1g_0($this, _set____db54di) {
    $this.h3__1 = _set____db54di;
  }
  function _get_h3__ndc17k_0($this) {
    return $this.h3__1;
  }
  function _set_h4__dl8q0l($this, _set____db54di) {
    $this.h4__1 = _set____db54di;
  }
  function _get_h4__ndc18f($this) {
    return $this.h4__1;
  }
  function processChunk_0($this, input, pos) {
    var words = $this.words_1;
    var pos_0 = pos;
    var inductionVariable = 0;
    if (inductionVariable < 16)
      do {
        var w = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var tmp4 = pos_0;
        pos_0 = (tmp4 + 1) | 0;
        var tmp = (input[tmp4] & 255) << 24;
        var tmp3 = pos_0;
        pos_0 = (tmp3 + 1) | 0;
        var tmp_0 = tmp | ((input[tmp3] & 255) << 16);
        var tmp2 = pos_0;
        pos_0 = (tmp2 + 1) | 0;
        var tmp_1 = tmp_0 | ((input[tmp2] & 255) << 8);
        var tmp1 = pos_0;
        pos_0 = (tmp1 + 1) | 0;
        words[w] = tmp_1 | (input[tmp1] & 255);
      } while (inductionVariable < 16);
    var inductionVariable_0 = 16;
    if (inductionVariable_0 < 80)
      do {
        var w_0 = inductionVariable_0;
        inductionVariable_0 = (inductionVariable_0 + 1) | 0;
        // Inline function 'okio.leftRotate' call
        var this_0 = words[(w_0 - 3) | 0] ^ words[(w_0 - 8) | 0] ^ words[(w_0 - 14) | 0] ^ words[(w_0 - 16) | 0];
        words[w_0] = (this_0 << 1) | ((this_0 >>> ((32 - 1) | 0)) | 0);
      } while (inductionVariable_0 < 80);
    var a = $this.h0__1;
    var b = $this.h1__1;
    var c = $this.h2__1;
    var d = $this.h3__1;
    var e = $this.h4__1;
    var inductionVariable_1 = 0;
    if (inductionVariable_1 < 80)
      do {
        var i = inductionVariable_1;
        inductionVariable_1 = (inductionVariable_1 + 1) | 0;
        var tmp_2;
        if (i < 20) {
          var f = d ^ (b & (c ^ d));
          var k = 1518500249;
          // Inline function 'okio.leftRotate' call
          var this_1 = a;
          tmp_2 =
            (((((((((this_1 << 5) | ((this_1 >>> ((32 - 5) | 0)) | 0)) + f) | 0) + e) | 0) + k) | 0) + words[i]) | 0;
        } else if (i < 40) {
          var f_0 = b ^ c ^ d;
          var k_0 = 1859775393;
          // Inline function 'okio.leftRotate' call
          var this_2 = a;
          tmp_2 =
            (((((((((this_2 << 5) | ((this_2 >>> ((32 - 5) | 0)) | 0)) + f_0) | 0) + e) | 0) + k_0) | 0) + words[i]) |
            0;
        } else if (i < 60) {
          var f_1 = (b & c) | (b & d) | (c & d);
          var k_1 = -1894007588;
          // Inline function 'okio.leftRotate' call
          var this_3 = a;
          tmp_2 =
            (((((((((this_3 << 5) | ((this_3 >>> ((32 - 5) | 0)) | 0)) + f_1) | 0) + e) | 0) + k_1) | 0) + words[i]) |
            0;
        } else {
          var f_2 = b ^ c ^ d;
          var k_2 = -899497514;
          // Inline function 'okio.leftRotate' call
          var this_4 = a;
          tmp_2 =
            (((((((((this_4 << 5) | ((this_4 >>> ((32 - 5) | 0)) | 0)) + f_2) | 0) + e) | 0) + k_2) | 0) + words[i]) |
            0;
        }
        var a2 = tmp_2;
        e = d;
        d = c;
        // Inline function 'okio.leftRotate' call
        var this_5 = b;
        c = (this_5 << 30) | ((this_5 >>> ((32 - 30) | 0)) | 0);
        b = a;
        a = a2;
      } while (inductionVariable_1 < 80);
    $this.h0__1 = ($this.h0__1 + a) | 0;
    $this.h1__1 = ($this.h1__1 + b) | 0;
    $this.h2__1 = ($this.h2__1 + c) | 0;
    $this.h3__1 = ($this.h3__1 + d) | 0;
    $this.h4__1 = ($this.h4__1 + e) | 0;
  }
  function reset($this) {
    $this.messageLength_1 = new Long(0, 0);
    fill($this.unprocessed_1, 0);
    $this.unprocessedLimit_1 = 0;
    fill_0($this.words_1, 0);
    $this.h0__1 = 1732584193;
    $this.h1__1 = -271733879;
    $this.h2__1 = -1732584194;
    $this.h3__1 = 271733878;
    $this.h4__1 = -1009589776;
  }
  function Sha1() {
    this.messageLength_1 = new Long(0, 0);
    this.unprocessed_1 = new Int8Array(64);
    this.unprocessedLimit_1 = 0;
    this.words_1 = new Int32Array(80);
    this.h0__1 = 1732584193;
    this.h1__1 = -271733879;
    this.h2__1 = -1732584194;
    this.h3__1 = 271733878;
    this.h4__1 = -1009589776;
  }
  protoOf(Sha1).update_6igkux_k$ = function (input, offset, byteCount) {
    var tmp = this;
    // Inline function 'kotlin.Long.plus' call
    tmp.messageLength_1 = this.messageLength_1.plus_r93sks_k$(toLong(byteCount));
    var pos = offset;
    var limit = (pos + byteCount) | 0;
    var unprocessed = this.unprocessed_1;
    var unprocessedLimit = this.unprocessedLimit_1;
    if (unprocessedLimit > 0) {
      if (((unprocessedLimit + byteCount) | 0) < 64) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_0 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_0, unprocessed, unprocessedLimit, startIndex, limit);
        this.unprocessedLimit_1 = (unprocessedLimit + byteCount) | 0;
        return Unit_getInstance();
      }
      var consumeByteCount = (64 - unprocessedLimit) | 0;
      // Inline function 'kotlin.collections.copyInto' call
      var startIndex_0 = pos;
      var endIndex = (pos + consumeByteCount) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = input;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp_1, unprocessed, unprocessedLimit, startIndex_0, endIndex);
      processChunk_0(this, unprocessed, 0);
      this.unprocessedLimit_1 = 0;
      pos = (pos + consumeByteCount) | 0;
    }
    while (pos < limit) {
      var nextPos = (pos + 64) | 0;
      if (nextPos > limit) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex_1 = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_2 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_2, unprocessed, 0, startIndex_1, limit);
        this.unprocessedLimit_1 = (limit - pos) | 0;
        return Unit_getInstance();
      }
      processChunk_0(this, input, pos);
      pos = nextPos;
    }
  };
  protoOf(Sha1).digest_m0ziv0_k$ = function () {
    var unprocessed = this.unprocessed_1;
    var unprocessedLimit = this.unprocessedLimit_1;
    // Inline function 'kotlin.Long.times' call
    var messageLengthBits = this.messageLength_1.times_nfzjiw_k$(toLong(8));
    var tmp0 = unprocessedLimit;
    unprocessedLimit = (tmp0 + 1) | 0;
    unprocessed[tmp0] = -128;
    if (unprocessedLimit > 56) {
      fill(unprocessed, 0, unprocessedLimit, 64);
      processChunk_0(this, unprocessed, 0);
      fill(unprocessed, 0, 0, unprocessedLimit);
    } else {
      fill(unprocessed, 0, unprocessedLimit, 56);
    }
    unprocessed[56] = messageLengthBits.ushr_z7nmq8_k$(56).toByte_edm0nx_k$();
    unprocessed[57] = messageLengthBits.ushr_z7nmq8_k$(48).toByte_edm0nx_k$();
    unprocessed[58] = messageLengthBits.ushr_z7nmq8_k$(40).toByte_edm0nx_k$();
    unprocessed[59] = messageLengthBits.ushr_z7nmq8_k$(32).toByte_edm0nx_k$();
    unprocessed[60] = messageLengthBits.ushr_z7nmq8_k$(24).toByte_edm0nx_k$();
    unprocessed[61] = messageLengthBits.ushr_z7nmq8_k$(16).toByte_edm0nx_k$();
    unprocessed[62] = messageLengthBits.ushr_z7nmq8_k$(8).toByte_edm0nx_k$();
    unprocessed[63] = messageLengthBits.toByte_edm0nx_k$();
    processChunk_0(this, unprocessed, 0);
    var a = this.h0__1;
    var b = this.h1__1;
    var c = this.h2__1;
    var d = this.h3__1;
    var e = this.h4__1;
    reset(this);
    // Inline function 'kotlin.byteArrayOf' call
    return new Int8Array([
      toByte(a >> 24),
      toByte(a >> 16),
      toByte(a >> 8),
      toByte(a),
      toByte(b >> 24),
      toByte(b >> 16),
      toByte(b >> 8),
      toByte(b),
      toByte(c >> 24),
      toByte(c >> 16),
      toByte(c >> 8),
      toByte(c),
      toByte(d >> 24),
      toByte(d >> 16),
      toByte(d >> 8),
      toByte(d),
      toByte(e >> 24),
      toByte(e >> 16),
      toByte(e >> 8),
      toByte(e),
    ]);
  };
  function _get_k__7mlop2_0($this) {
    return $this.k_1;
  }
  function _set_messageLength__vx4ezs_1($this, _set____db54di) {
    $this.messageLength_1 = _set____db54di;
  }
  function _get_messageLength__nw84h0_1($this) {
    return $this.messageLength_1;
  }
  function _get_unprocessed__1lqkro_1($this) {
    return $this.unprocessed_1;
  }
  function _set_unprocessedLimit__o7naz3_1($this, _set____db54di) {
    $this.unprocessedLimit_1 = _set____db54di;
  }
  function _get_unprocessedLimit__4vgy3p_1($this) {
    return $this.unprocessedLimit_1;
  }
  function _get_words__9f9arc_1($this) {
    return $this.words_1;
  }
  function _set_h0__dl8q41_1($this, _set____db54di) {
    $this.h0__1 = _set____db54di;
  }
  function _get_h0__ndc14z_1($this) {
    return $this.h0__1;
  }
  function _set_h1__dl8q36_1($this, _set____db54di) {
    $this.h1__1 = _set____db54di;
  }
  function _get_h1__ndc15u_1($this) {
    return $this.h1__1;
  }
  function _set_h2__dl8q2b_1($this, _set____db54di) {
    $this.h2__1 = _set____db54di;
  }
  function _get_h2__ndc16p_1($this) {
    return $this.h2__1;
  }
  function _set_h3__dl8q1g_1($this, _set____db54di) {
    $this.h3__1 = _set____db54di;
  }
  function _get_h3__ndc17k_1($this) {
    return $this.h3__1;
  }
  function _set_h4__dl8q0l_0($this, _set____db54di) {
    $this.h4__1 = _set____db54di;
  }
  function _get_h4__ndc18f_0($this) {
    return $this.h4__1;
  }
  function _set_h5__dl8pzq($this, _set____db54di) {
    $this.h5__1 = _set____db54di;
  }
  function _get_h5__ndc19a($this) {
    return $this.h5__1;
  }
  function _set_h6__dl8pyv($this, _set____db54di) {
    $this.h6__1 = _set____db54di;
  }
  function _get_h6__ndc1a5($this) {
    return $this.h6__1;
  }
  function _set_h7__dl8py0($this, _set____db54di) {
    $this.h7__1 = _set____db54di;
  }
  function _get_h7__ndc1b0($this) {
    return $this.h7__1;
  }
  function processChunk_1($this, input, pos) {
    var words = $this.words_1;
    var pos_0 = pos;
    var inductionVariable = 0;
    if (inductionVariable < 16)
      do {
        var w = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        // Inline function 'okio.and' call
        var tmp4 = pos_0;
        pos_0 = (tmp4 + 1) | 0;
        var tmp = (input[tmp4] & 255) << 24;
        // Inline function 'okio.and' call
        var tmp3 = pos_0;
        pos_0 = (tmp3 + 1) | 0;
        var tmp_0 = tmp | ((input[tmp3] & 255) << 16);
        // Inline function 'okio.and' call
        var tmp2 = pos_0;
        pos_0 = (tmp2 + 1) | 0;
        var tmp_1 = tmp_0 | ((input[tmp2] & 255) << 8);
        // Inline function 'okio.and' call
        var tmp1 = pos_0;
        pos_0 = (tmp1 + 1) | 0;
        words[w] = tmp_1 | (input[tmp1] & 255);
      } while (inductionVariable < 16);
    var inductionVariable_0 = 16;
    if (inductionVariable_0 < 64)
      do {
        var w_0 = inductionVariable_0;
        inductionVariable_0 = (inductionVariable_0 + 1) | 0;
        var w15 = words[(w_0 - 15) | 0];
        var s0 = ((w15 >>> 7) | 0 | (w15 << 25)) ^ ((w15 >>> 18) | 0 | (w15 << 14)) ^ ((w15 >>> 3) | 0);
        var w2 = words[(w_0 - 2) | 0];
        var s1 = ((w2 >>> 17) | 0 | (w2 << 15)) ^ ((w2 >>> 19) | 0 | (w2 << 13)) ^ ((w2 >>> 10) | 0);
        var w16 = words[(w_0 - 16) | 0];
        var w7 = words[(w_0 - 7) | 0];
        words[w_0] = (((((w16 + s0) | 0) + w7) | 0) + s1) | 0;
      } while (inductionVariable_0 < 64);
    hash_0($this, words);
  }
  function hash_0($this, words) {
    var localK = Companion_getInstance_5().k_1;
    var a = $this.h0__1;
    var b = $this.h1__1;
    var c = $this.h2__1;
    var d = $this.h3__1;
    var e = $this.h4__1;
    var f = $this.h5__1;
    var g = $this.h6__1;
    var h = $this.h7__1;
    var inductionVariable = 0;
    if (inductionVariable < 64)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var s0 = ((a >>> 2) | 0 | (a << 30)) ^ ((a >>> 13) | 0 | (a << 19)) ^ ((a >>> 22) | 0 | (a << 10));
        var s1 = ((e >>> 6) | 0 | (e << 26)) ^ ((e >>> 11) | 0 | (e << 21)) ^ ((e >>> 25) | 0 | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var maj = (a & b) ^ (a & c) ^ (b & c);
        var t1 = (((((((h + s1) | 0) + ch) | 0) + localK[i]) | 0) + words[i]) | 0;
        var t2 = (s0 + maj) | 0;
        h = g;
        g = f;
        f = e;
        e = (d + t1) | 0;
        d = c;
        c = b;
        b = a;
        a = (t1 + t2) | 0;
      } while (inductionVariable < 64);
    $this.h0__1 = ($this.h0__1 + a) | 0;
    $this.h1__1 = ($this.h1__1 + b) | 0;
    $this.h2__1 = ($this.h2__1 + c) | 0;
    $this.h3__1 = ($this.h3__1 + d) | 0;
    $this.h4__1 = ($this.h4__1 + e) | 0;
    $this.h5__1 = ($this.h5__1 + f) | 0;
    $this.h6__1 = ($this.h6__1 + g) | 0;
    $this.h7__1 = ($this.h7__1 + h) | 0;
  }
  function reset_0($this) {
    $this.messageLength_1 = new Long(0, 0);
    fill($this.unprocessed_1, 0);
    $this.unprocessedLimit_1 = 0;
    fill_0($this.words_1, 0);
    $this.h0__1 = 1779033703;
    $this.h1__1 = -1150833019;
    $this.h2__1 = 1013904242;
    $this.h3__1 = -1521486534;
    $this.h4__1 = 1359893119;
    $this.h5__1 = -1694144372;
    $this.h6__1 = 528734635;
    $this.h7__1 = 1541459225;
  }
  function Companion_4() {
    Companion_instance_4 = this;
    var tmp = this;
    // Inline function 'kotlin.intArrayOf' call
    tmp.k_1 = new Int32Array([
      1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993, -1841331548, -1424204075, -670586216,
      310598401, 607225278, 1426881987, 1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522,
      264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, -1740746414, -1473132947, -1341970488,
      -1084653625, -958395405, -710438585, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
      1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885, -1035236496, -949202525, -778901479,
      -694614492, -200395387, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063,
      1747873779, 1955562222, 2024104815, -2067236844, -1933114872, -1866530822, -1538233109, -1090935817, -965641998,
    ]);
  }
  var Companion_instance_4;
  function Companion_getInstance_5() {
    if (Companion_instance_4 == null) new Companion_4();
    return Companion_instance_4;
  }
  function Sha256() {
    Companion_getInstance_5();
    this.messageLength_1 = new Long(0, 0);
    this.unprocessed_1 = new Int8Array(64);
    this.unprocessedLimit_1 = 0;
    this.words_1 = new Int32Array(64);
    this.h0__1 = 1779033703;
    this.h1__1 = -1150833019;
    this.h2__1 = 1013904242;
    this.h3__1 = -1521486534;
    this.h4__1 = 1359893119;
    this.h5__1 = -1694144372;
    this.h6__1 = 528734635;
    this.h7__1 = 1541459225;
  }
  protoOf(Sha256).update_6igkux_k$ = function (input, offset, byteCount) {
    var tmp = this;
    // Inline function 'kotlin.Long.plus' call
    tmp.messageLength_1 = this.messageLength_1.plus_r93sks_k$(toLong(byteCount));
    var pos = offset;
    var limit = (pos + byteCount) | 0;
    var unprocessed = this.unprocessed_1;
    var unprocessedLimit = this.unprocessedLimit_1;
    if (unprocessedLimit > 0) {
      if (((unprocessedLimit + byteCount) | 0) < 64) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_0 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_0, unprocessed, unprocessedLimit, startIndex, limit);
        this.unprocessedLimit_1 = (unprocessedLimit + byteCount) | 0;
        return Unit_getInstance();
      }
      var consumeByteCount = (64 - unprocessedLimit) | 0;
      // Inline function 'kotlin.collections.copyInto' call
      var startIndex_0 = pos;
      var endIndex = (pos + consumeByteCount) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = input;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp_1, unprocessed, unprocessedLimit, startIndex_0, endIndex);
      processChunk_1(this, unprocessed, 0);
      this.unprocessedLimit_1 = 0;
      pos = (pos + consumeByteCount) | 0;
    }
    while (pos < limit) {
      var nextPos = (pos + 64) | 0;
      if (nextPos > limit) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex_1 = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_2 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_2, unprocessed, 0, startIndex_1, limit);
        this.unprocessedLimit_1 = (limit - pos) | 0;
        return Unit_getInstance();
      }
      processChunk_1(this, input, pos);
      pos = nextPos;
    }
  };
  protoOf(Sha256).digest_m0ziv0_k$ = function () {
    var unprocessed = this.unprocessed_1;
    var unprocessedLimit = this.unprocessedLimit_1;
    // Inline function 'kotlin.Long.times' call
    var messageLengthBits = this.messageLength_1.times_nfzjiw_k$(toLong(8));
    var tmp0 = unprocessedLimit;
    unprocessedLimit = (tmp0 + 1) | 0;
    unprocessed[tmp0] = -128;
    if (unprocessedLimit > 56) {
      fill(unprocessed, 0, unprocessedLimit, 64);
      processChunk_1(this, unprocessed, 0);
      fill(unprocessed, 0, 0, unprocessedLimit);
    } else {
      fill(unprocessed, 0, unprocessedLimit, 56);
    }
    unprocessed[56] = messageLengthBits.ushr_z7nmq8_k$(56).toByte_edm0nx_k$();
    unprocessed[57] = messageLengthBits.ushr_z7nmq8_k$(48).toByte_edm0nx_k$();
    unprocessed[58] = messageLengthBits.ushr_z7nmq8_k$(40).toByte_edm0nx_k$();
    unprocessed[59] = messageLengthBits.ushr_z7nmq8_k$(32).toByte_edm0nx_k$();
    unprocessed[60] = messageLengthBits.ushr_z7nmq8_k$(24).toByte_edm0nx_k$();
    unprocessed[61] = messageLengthBits.ushr_z7nmq8_k$(16).toByte_edm0nx_k$();
    unprocessed[62] = messageLengthBits.ushr_z7nmq8_k$(8).toByte_edm0nx_k$();
    unprocessed[63] = messageLengthBits.toByte_edm0nx_k$();
    processChunk_1(this, unprocessed, 0);
    var a = this.h0__1;
    var b = this.h1__1;
    var c = this.h2__1;
    var d = this.h3__1;
    var e = this.h4__1;
    var f = this.h5__1;
    var g = this.h6__1;
    var h = this.h7__1;
    reset_0(this);
    // Inline function 'kotlin.byteArrayOf' call
    return new Int8Array([
      toByte(a >> 24),
      toByte(a >> 16),
      toByte(a >> 8),
      toByte(a),
      toByte(b >> 24),
      toByte(b >> 16),
      toByte(b >> 8),
      toByte(b),
      toByte(c >> 24),
      toByte(c >> 16),
      toByte(c >> 8),
      toByte(c),
      toByte(d >> 24),
      toByte(d >> 16),
      toByte(d >> 8),
      toByte(d),
      toByte(e >> 24),
      toByte(e >> 16),
      toByte(e >> 8),
      toByte(e),
      toByte(f >> 24),
      toByte(f >> 16),
      toByte(f >> 8),
      toByte(f),
      toByte(g >> 24),
      toByte(g >> 16),
      toByte(g >> 8),
      toByte(g),
      toByte(h >> 24),
      toByte(h >> 16),
      toByte(h >> 8),
      toByte(h),
    ]);
  };
  function _get_k__7mlop2_1($this) {
    return $this.k_1;
  }
  function _set_messageLength__vx4ezs_2($this, _set____db54di) {
    $this.messageLength_1 = _set____db54di;
  }
  function _get_messageLength__nw84h0_2($this) {
    return $this.messageLength_1;
  }
  function _get_unprocessed__1lqkro_2($this) {
    return $this.unprocessed_1;
  }
  function _set_unprocessedLimit__o7naz3_2($this, _set____db54di) {
    $this.unprocessedLimit_1 = _set____db54di;
  }
  function _get_unprocessedLimit__4vgy3p_2($this) {
    return $this.unprocessedLimit_1;
  }
  function _get_words__9f9arc_2($this) {
    return $this.words_1;
  }
  function _set_h0__dl8q41_2($this, _set____db54di) {
    $this.h0__1 = _set____db54di;
  }
  function _get_h0__ndc14z_2($this) {
    return $this.h0__1;
  }
  function _set_h1__dl8q36_2($this, _set____db54di) {
    $this.h1__1 = _set____db54di;
  }
  function _get_h1__ndc15u_2($this) {
    return $this.h1__1;
  }
  function _set_h2__dl8q2b_2($this, _set____db54di) {
    $this.h2__1 = _set____db54di;
  }
  function _get_h2__ndc16p_2($this) {
    return $this.h2__1;
  }
  function _set_h3__dl8q1g_2($this, _set____db54di) {
    $this.h3__1 = _set____db54di;
  }
  function _get_h3__ndc17k_2($this) {
    return $this.h3__1;
  }
  function _set_h4__dl8q0l_1($this, _set____db54di) {
    $this.h4__1 = _set____db54di;
  }
  function _get_h4__ndc18f_1($this) {
    return $this.h4__1;
  }
  function _set_h5__dl8pzq_0($this, _set____db54di) {
    $this.h5__1 = _set____db54di;
  }
  function _get_h5__ndc19a_0($this) {
    return $this.h5__1;
  }
  function _set_h6__dl8pyv_0($this, _set____db54di) {
    $this.h6__1 = _set____db54di;
  }
  function _get_h6__ndc1a5_0($this) {
    return $this.h6__1;
  }
  function _set_h7__dl8py0_0($this, _set____db54di) {
    $this.h7__1 = _set____db54di;
  }
  function _get_h7__ndc1b0_0($this) {
    return $this.h7__1;
  }
  function processChunk_2($this, input, pos) {
    var words = $this.words_1;
    var pos_0 = pos;
    var inductionVariable = 0;
    if (inductionVariable < 16)
      do {
        var w = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var tmp8 = pos_0;
        pos_0 = (tmp8 + 1) | 0;
        var tmp = toLong(input[tmp8]).and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(56);
        var tmp7 = pos_0;
        pos_0 = (tmp7 + 1) | 0;
        var tmp_0 = tmp.or_v7fvkl_k$(toLong(input[tmp7]).and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(48));
        var tmp6 = pos_0;
        pos_0 = (tmp6 + 1) | 0;
        var tmp_1 = tmp_0.or_v7fvkl_k$(toLong(input[tmp6]).and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(40));
        var tmp5 = pos_0;
        pos_0 = (tmp5 + 1) | 0;
        var tmp_2 = tmp_1.or_v7fvkl_k$(toLong(input[tmp5]).and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(32));
        var tmp4 = pos_0;
        pos_0 = (tmp4 + 1) | 0;
        var tmp_3 = tmp_2.or_v7fvkl_k$(toLong(input[tmp4]).and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(24));
        var tmp3 = pos_0;
        pos_0 = (tmp3 + 1) | 0;
        var tmp_4 = tmp_3.or_v7fvkl_k$(toLong(input[tmp3]).and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(16));
        var tmp2 = pos_0;
        pos_0 = (tmp2 + 1) | 0;
        var tmp_5 = tmp_4.or_v7fvkl_k$(toLong(input[tmp2]).and_4spn93_k$(new Long(255, 0)).shl_bg8if3_k$(8));
        var tmp1 = pos_0;
        pos_0 = (tmp1 + 1) | 0;
        words[w] = tmp_5.or_v7fvkl_k$(toLong(input[tmp1]).and_4spn93_k$(new Long(255, 0)));
      } while (inductionVariable < 16);
    var inductionVariable_0 = 16;
    if (inductionVariable_0 < 80)
      do {
        var i = inductionVariable_0;
        inductionVariable_0 = (inductionVariable_0 + 1) | 0;
        var w15 = words[(i - 15) | 0];
        // Inline function 'okio.rightRotate' call
        var tmp_6 = w15.ushr_z7nmq8_k$(1).or_v7fvkl_k$(w15.shl_bg8if3_k$((64 - 1) | 0));
        // Inline function 'okio.rightRotate' call
        var tmp$ret$1 = w15.ushr_z7nmq8_k$(8).or_v7fvkl_k$(w15.shl_bg8if3_k$((64 - 8) | 0));
        var s0 = tmp_6.xor_qzz94j_k$(tmp$ret$1).xor_qzz94j_k$(w15.ushr_z7nmq8_k$(7));
        var w2 = words[(i - 2) | 0];
        // Inline function 'okio.rightRotate' call
        var tmp_7 = w2.ushr_z7nmq8_k$(19).or_v7fvkl_k$(w2.shl_bg8if3_k$((64 - 19) | 0));
        // Inline function 'okio.rightRotate' call
        var tmp$ret$3 = w2.ushr_z7nmq8_k$(61).or_v7fvkl_k$(w2.shl_bg8if3_k$((64 - 61) | 0));
        var s1 = tmp_7.xor_qzz94j_k$(tmp$ret$3).xor_qzz94j_k$(w2.ushr_z7nmq8_k$(6));
        var w16 = words[(i - 16) | 0];
        var w7 = words[(i - 7) | 0];
        words[i] = w16.plus_r93sks_k$(s0).plus_r93sks_k$(w7).plus_r93sks_k$(s1);
      } while (inductionVariable_0 < 80);
    hash_1($this, words);
  }
  function hash_1($this, words) {
    var localK = Companion_getInstance_6().k_1;
    var a = $this.h0__1;
    var b = $this.h1__1;
    var c = $this.h2__1;
    var d = $this.h3__1;
    var e = $this.h4__1;
    var f = $this.h5__1;
    var g = $this.h6__1;
    var h = $this.h7__1;
    var inductionVariable = 0;
    if (inductionVariable < 80)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        // Inline function 'okio.rightRotate' call
        var this_0 = a;
        var tmp = this_0.ushr_z7nmq8_k$(28).or_v7fvkl_k$(this_0.shl_bg8if3_k$((64 - 28) | 0));
        // Inline function 'okio.rightRotate' call
        var this_1 = a;
        var tmp$ret$1 = this_1.ushr_z7nmq8_k$(34).or_v7fvkl_k$(this_1.shl_bg8if3_k$((64 - 34) | 0));
        var tmp_0 = tmp.xor_qzz94j_k$(tmp$ret$1);
        // Inline function 'okio.rightRotate' call
        var this_2 = a;
        var tmp$ret$2 = this_2.ushr_z7nmq8_k$(39).or_v7fvkl_k$(this_2.shl_bg8if3_k$((64 - 39) | 0));
        var s0 = tmp_0.xor_qzz94j_k$(tmp$ret$2);
        // Inline function 'okio.rightRotate' call
        var this_3 = e;
        var tmp_1 = this_3.ushr_z7nmq8_k$(14).or_v7fvkl_k$(this_3.shl_bg8if3_k$((64 - 14) | 0));
        // Inline function 'okio.rightRotate' call
        var this_4 = e;
        var tmp$ret$4 = this_4.ushr_z7nmq8_k$(18).or_v7fvkl_k$(this_4.shl_bg8if3_k$((64 - 18) | 0));
        var tmp_2 = tmp_1.xor_qzz94j_k$(tmp$ret$4);
        // Inline function 'okio.rightRotate' call
        var this_5 = e;
        var tmp$ret$5 = this_5.ushr_z7nmq8_k$(41).or_v7fvkl_k$(this_5.shl_bg8if3_k$((64 - 41) | 0));
        var s1 = tmp_2.xor_qzz94j_k$(tmp$ret$5);
        var ch = e.and_4spn93_k$(f).xor_qzz94j_k$(e.inv_28kx_k$().and_4spn93_k$(g));
        var maj = a.and_4spn93_k$(b).xor_qzz94j_k$(a.and_4spn93_k$(c)).xor_qzz94j_k$(b.and_4spn93_k$(c));
        var t1 = h.plus_r93sks_k$(s1).plus_r93sks_k$(ch).plus_r93sks_k$(localK[i]).plus_r93sks_k$(words[i]);
        var t2 = s0.plus_r93sks_k$(maj);
        h = g;
        g = f;
        f = e;
        e = d.plus_r93sks_k$(t1);
        d = c;
        c = b;
        b = a;
        a = t1.plus_r93sks_k$(t2);
      } while (inductionVariable < 80);
    $this.h0__1 = $this.h0__1.plus_r93sks_k$(a);
    $this.h1__1 = $this.h1__1.plus_r93sks_k$(b);
    $this.h2__1 = $this.h2__1.plus_r93sks_k$(c);
    $this.h3__1 = $this.h3__1.plus_r93sks_k$(d);
    $this.h4__1 = $this.h4__1.plus_r93sks_k$(e);
    $this.h5__1 = $this.h5__1.plus_r93sks_k$(f);
    $this.h6__1 = $this.h6__1.plus_r93sks_k$(g);
    $this.h7__1 = $this.h7__1.plus_r93sks_k$(h);
  }
  function reset_1($this) {
    $this.messageLength_1 = new Long(0, 0);
    fill($this.unprocessed_1, 0);
    $this.unprocessedLimit_1 = 0;
    fill_1($this.words_1, new Long(0, 0));
    $this.h0__1 = new Long(-205731576, 1779033703);
    $this.h1__1 = new Long(-2067093701, -1150833019);
    $this.h2__1 = new Long(-23791573, 1013904242);
    $this.h3__1 = new Long(1595750129, -1521486534);
    $this.h4__1 = new Long(-1377402159, 1359893119);
    $this.h5__1 = new Long(725511199, -1694144372);
    $this.h6__1 = new Long(-79577749, 528734635);
    $this.h7__1 = new Long(327033209, 1541459225);
  }
  function Companion_5() {
    Companion_instance_5 = this;
    var tmp = this;
    // Inline function 'kotlin.longArrayOf' call
    tmp.k_1 = longArrayOf([
      new Long(-685199838, 1116352408),
      new Long(602891725, 1899447441),
      new Long(-330482897, -1245643825),
      new Long(-2121671748, -373957723),
      new Long(-213338824, 961987163),
      new Long(-1241133031, 1508970993),
      new Long(-1357295717, -1841331548),
      new Long(-630357736, -1424204075),
      new Long(-1560083902, -670586216),
      new Long(1164996542, 310598401),
      new Long(1323610764, 607225278),
      new Long(-704662302, 1426881987),
      new Long(-226784913, 1925078388),
      new Long(991336113, -2132889090),
      new Long(633803317, -1680079193),
      new Long(-815192428, -1046744716),
      new Long(-1628353838, -459576895),
      new Long(944711139, -272742522),
      new Long(-1953704523, 264347078),
      new Long(2007800933, 604807628),
      new Long(1495990901, 770255983),
      new Long(1856431235, 1249150122),
      new Long(-1119749164, 1555081692),
      new Long(-2096016459, 1996064986),
      new Long(-295247957, -1740746414),
      new Long(766784016, -1473132947),
      new Long(-1728372417, -1341970488),
      new Long(-1091629340, -1084653625),
      new Long(1034457026, -958395405),
      new Long(-1828018395, -710438585),
      new Long(-536640913, 113926993),
      new Long(168717936, 338241895),
      new Long(1188179964, 666307205),
      new Long(1546045734, 773529912),
      new Long(1522805485, 1294757372),
      new Long(-1651133473, 1396182291),
      new Long(-1951439906, 1695183700),
      new Long(1014477480, 1986661051),
      new Long(1206759142, -2117940946),
      new Long(344077627, -1838011259),
      new Long(1290863460, -1564481375),
      new Long(-1136513023, -1474664885),
      new Long(-789014639, -1035236496),
      new Long(106217008, -949202525),
      new Long(-688958952, -778901479),
      new Long(1432725776, -694614492),
      new Long(1467031594, -200395387),
      new Long(851169720, 275423344),
      new Long(-1194143544, 430227734),
      new Long(1363258195, 506948616),
      new Long(-544281703, 659060556),
      new Long(-509917016, 883997877),
      new Long(-976659869, 958139571),
      new Long(-482243893, 1322822218),
      new Long(2003034995, 1537002063),
      new Long(-692930397, 1747873779),
      new Long(1575990012, 1955562222),
      new Long(1125592928, 2024104815),
      new Long(-1578062990, -2067236844),
      new Long(442776044, -1933114872),
      new Long(593698344, -1866530822),
      new Long(-561857047, -1538233109),
      new Long(-1295615723, -1090935817),
      new Long(-479046869, -965641998),
      new Long(-366583396, -903397682),
      new Long(566280711, -779700025),
      new Long(-840897762, -354779690),
      new Long(-294727304, -176337025),
      new Long(1914138554, 116418474),
      new Long(-1563912026, 174292421),
      new Long(-1090974290, 289380356),
      new Long(320620315, 460393269),
      new Long(587496836, 685471733),
      new Long(1086792851, 852142971),
      new Long(365543100, 1017036298),
      new Long(-1676669620, 1126000580),
      new Long(-885112138, 1288033470),
      new Long(-60457430, 1501505948),
      new Long(987167468, 1607167915),
      new Long(1246189591, 1816402316),
    ]);
  }
  var Companion_instance_5;
  function Companion_getInstance_6() {
    if (Companion_instance_5 == null) new Companion_5();
    return Companion_instance_5;
  }
  function Sha512() {
    Companion_getInstance_6();
    this.messageLength_1 = new Long(0, 0);
    this.unprocessed_1 = new Int8Array(128);
    this.unprocessedLimit_1 = 0;
    this.words_1 = longArray(80);
    this.h0__1 = new Long(-205731576, 1779033703);
    this.h1__1 = new Long(-2067093701, -1150833019);
    this.h2__1 = new Long(-23791573, 1013904242);
    this.h3__1 = new Long(1595750129, -1521486534);
    this.h4__1 = new Long(-1377402159, 1359893119);
    this.h5__1 = new Long(725511199, -1694144372);
    this.h6__1 = new Long(-79577749, 528734635);
    this.h7__1 = new Long(327033209, 1541459225);
  }
  protoOf(Sha512).update_6igkux_k$ = function (input, offset, byteCount) {
    var tmp = this;
    // Inline function 'kotlin.Long.plus' call
    tmp.messageLength_1 = this.messageLength_1.plus_r93sks_k$(toLong(byteCount));
    var pos = offset;
    var limit = (pos + byteCount) | 0;
    var unprocessed = this.unprocessed_1;
    var unprocessedLimit = this.unprocessedLimit_1;
    if (unprocessedLimit > 0) {
      if (((unprocessedLimit + byteCount) | 0) < 128) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_0 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_0, unprocessed, unprocessedLimit, startIndex, limit);
        this.unprocessedLimit_1 = (unprocessedLimit + byteCount) | 0;
        return Unit_getInstance();
      }
      var consumeByteCount = (128 - unprocessedLimit) | 0;
      // Inline function 'kotlin.collections.copyInto' call
      var startIndex_0 = pos;
      var endIndex = (pos + consumeByteCount) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_1 = input;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp_1, unprocessed, unprocessedLimit, startIndex_0, endIndex);
      processChunk_2(this, unprocessed, 0);
      this.unprocessedLimit_1 = 0;
      pos = (pos + consumeByteCount) | 0;
    }
    while (pos < limit) {
      var nextPos = (pos + 128) | 0;
      if (nextPos > limit) {
        // Inline function 'kotlin.collections.copyInto' call
        var startIndex_1 = pos;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        var tmp_2 = input;
        // Inline function 'kotlin.js.unsafeCast' call
        // Inline function 'kotlin.js.asDynamic' call
        arrayCopy(tmp_2, unprocessed, 0, startIndex_1, limit);
        this.unprocessedLimit_1 = (limit - pos) | 0;
        return Unit_getInstance();
      }
      processChunk_2(this, input, pos);
      pos = nextPos;
    }
  };
  protoOf(Sha512).digest_m0ziv0_k$ = function () {
    var unprocessed = this.unprocessed_1;
    var unprocessedLimit = this.unprocessedLimit_1;
    // Inline function 'kotlin.Long.times' call
    var messageLengthBits = this.messageLength_1.times_nfzjiw_k$(toLong(8));
    var tmp0 = unprocessedLimit;
    unprocessedLimit = (tmp0 + 1) | 0;
    unprocessed[tmp0] = -128;
    if (unprocessedLimit > 112) {
      fill(unprocessed, 0, unprocessedLimit, 128);
      processChunk_2(this, unprocessed, 0);
      fill(unprocessed, 0, 0, unprocessedLimit);
    } else {
      fill(unprocessed, 0, unprocessedLimit, 120);
    }
    unprocessed[120] = messageLengthBits.ushr_z7nmq8_k$(56).toByte_edm0nx_k$();
    unprocessed[121] = messageLengthBits.ushr_z7nmq8_k$(48).toByte_edm0nx_k$();
    unprocessed[122] = messageLengthBits.ushr_z7nmq8_k$(40).toByte_edm0nx_k$();
    unprocessed[123] = messageLengthBits.ushr_z7nmq8_k$(32).toByte_edm0nx_k$();
    unprocessed[124] = messageLengthBits.ushr_z7nmq8_k$(24).toByte_edm0nx_k$();
    unprocessed[125] = messageLengthBits.ushr_z7nmq8_k$(16).toByte_edm0nx_k$();
    unprocessed[126] = messageLengthBits.ushr_z7nmq8_k$(8).toByte_edm0nx_k$();
    unprocessed[127] = messageLengthBits.toByte_edm0nx_k$();
    processChunk_2(this, unprocessed, 0);
    var a = this.h0__1;
    var b = this.h1__1;
    var c = this.h2__1;
    var d = this.h3__1;
    var e = this.h4__1;
    var f = this.h5__1;
    var g = this.h6__1;
    var h = this.h7__1;
    reset_1(this);
    // Inline function 'kotlin.byteArrayOf' call
    return new Int8Array([
      a.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      a.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      a.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      a.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      a.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      a.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      a.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      a.toByte_edm0nx_k$(),
      b.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      b.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      b.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      b.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      b.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      b.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      b.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      b.toByte_edm0nx_k$(),
      c.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      c.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      c.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      c.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      c.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      c.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      c.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      c.toByte_edm0nx_k$(),
      d.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      d.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      d.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      d.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      d.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      d.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      d.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      d.toByte_edm0nx_k$(),
      e.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      e.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      e.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      e.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      e.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      e.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      e.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      e.toByte_edm0nx_k$(),
      f.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      f.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      f.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      f.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      f.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      f.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      f.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      f.toByte_edm0nx_k$(),
      g.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      g.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      g.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      g.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      g.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      g.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      g.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      g.toByte_edm0nx_k$(),
      h.shr_9fl3wl_k$(56).toByte_edm0nx_k$(),
      h.shr_9fl3wl_k$(48).toByte_edm0nx_k$(),
      h.shr_9fl3wl_k$(40).toByte_edm0nx_k$(),
      h.shr_9fl3wl_k$(32).toByte_edm0nx_k$(),
      h.shr_9fl3wl_k$(24).toByte_edm0nx_k$(),
      h.shr_9fl3wl_k$(16).toByte_edm0nx_k$(),
      h.shr_9fl3wl_k$(8).toByte_edm0nx_k$(),
      h.toByte_edm0nx_k$(),
    ]);
  };
  function Companion_6() {
    Companion_instance_6 = this;
    var tmp = this;
    // Inline function 'kotlin.byteArrayOf' call
    var tmp$ret$0 = new Int8Array([]);
    tmp.EMPTY_1 = new ByteString(tmp$ret$0);
  }
  protoOf(Companion_6).get_EMPTY_i8q41w_k$ = function () {
    return this.EMPTY_1;
  };
  protoOf(Companion_6).of_j7zv7t_k$ = function (data) {
    // Inline function 'okio.internal.commonOf' call
    // Inline function 'kotlin.collections.copyOf' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp$ret$1 = data.slice();
    return new ByteString(tmp$ret$1);
  };
  protoOf(Companion_6).toByteString_je42ki_k$ = function (_this__u8e3s4, offset, byteCount) {
    // Inline function 'okio.internal.commonToByteString' call
    var byteCount_0 = resolveDefaultParameter_0(_this__u8e3s4, byteCount);
    checkOffsetAndCount(toLong(_this__u8e3s4.length), toLong(offset), toLong(byteCount_0));
    return new ByteString(copyOfRange(_this__u8e3s4, offset, (offset + byteCount_0) | 0));
  };
  protoOf(Companion_6).toByteString$default_8fw6ae_k$ = function (_this__u8e3s4, offset, byteCount, $super) {
    offset = offset === VOID ? 0 : offset;
    byteCount = byteCount === VOID ? get_DEFAULT__ByteString_size() : byteCount;
    return $super === VOID
      ? this.toByteString_je42ki_k$(_this__u8e3s4, offset, byteCount)
      : $super.toByteString_je42ki_k$.call(this, _this__u8e3s4, offset, byteCount);
  };
  protoOf(Companion_6).encodeUtf8_5n709n_k$ = function (_this__u8e3s4) {
    // Inline function 'okio.internal.commonEncodeUtf8' call
    var byteString = new ByteString(asUtf8ToByteArray(_this__u8e3s4));
    byteString.set_utf8_8b2t3r_k$(_this__u8e3s4);
    return byteString;
  };
  protoOf(Companion_6).decodeBase64_urud1t_k$ = function (_this__u8e3s4) {
    // Inline function 'okio.internal.commonDecodeBase64' call
    var decoded = decodeBase64ToArray(_this__u8e3s4);
    return !(decoded == null) ? new ByteString(decoded) : null;
  };
  protoOf(Companion_6).decodeHex_xvw83l_k$ = function (_this__u8e3s4) {
    // Inline function 'okio.internal.commonDecodeHex' call
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!((_this__u8e3s4.length % 2 | 0) === 0)) {
      // Inline function 'okio.internal.commonDecodeHex.<anonymous>' call
      var message = 'Unexpected hex string: ' + _this__u8e3s4;
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    var result = new Int8Array((_this__u8e3s4.length / 2) | 0);
    var inductionVariable = 0;
    var last = (result.length - 1) | 0;
    if (inductionVariable <= last)
      do {
        var i = inductionVariable;
        inductionVariable = (inductionVariable + 1) | 0;
        var d1 = decodeHexDigit$accessor$1yfvj6b(charSequenceGet(_this__u8e3s4, imul(i, 2))) << 4;
        var d2 = decodeHexDigit$accessor$1yfvj6b(charSequenceGet(_this__u8e3s4, (imul(i, 2) + 1) | 0));
        result[i] = toByte((d1 + d2) | 0);
      } while (inductionVariable <= last);
    return new ByteString(result);
  };
  var Companion_instance_6;
  function Companion_getInstance_7() {
    if (Companion_instance_6 == null) new Companion_6();
    return Companion_instance_6;
  }
  function ByteString(data) {
    Companion_getInstance_7();
    this.data_1 = data;
    this.hashCode_2 = 0;
    this.utf8__1 = null;
  }
  protoOf(ByteString).get_data_wokkxf_k$ = function () {
    return this.data_1;
  };
  protoOf(ByteString).set_hashCode_zcrtc_k$ = function (value) {};
  protoOf(ByteString).get_hashCode_td036k_k$ = function () {
    return this.hashCode_2;
  };
  protoOf(ByteString).set_utf8_8b2t3r_k$ = function (value) {};
  protoOf(ByteString).get_utf8_wovtfe_k$ = function () {
    return this.utf8__1;
  };
  protoOf(ByteString).utf8_255yp_k$ = function () {
    // Inline function 'okio.internal.commonUtf8' call
    var result = this.utf8__1;
    if (result == null) {
      result = toUtf8String(this.internalArray_tr176k_k$());
      this.set_utf8_8b2t3r_k$(result);
    }
    return result;
  };
  protoOf(ByteString).base64_n39i29_k$ = function () {
    // Inline function 'okio.internal.commonBase64' call
    return encodeBase64(this.data_1);
  };
  protoOf(ByteString).base64Url_up517k_k$ = function () {
    // Inline function 'okio.internal.commonBase64Url' call
    return encodeBase64(this.data_1, get_BASE64_URL_SAFE());
  };
  protoOf(ByteString).hex_27mj_k$ = function () {
    // Inline function 'okio.internal.commonHex' call
    var result = charArray(imul(this.data_1.length, 2));
    var c = 0;
    var indexedObject = this.data_1;
    var inductionVariable = 0;
    var last = indexedObject.length;
    while (inductionVariable < last) {
      var b = indexedObject[inductionVariable];
      inductionVariable = (inductionVariable + 1) | 0;
      var tmp1 = c;
      c = (tmp1 + 1) | 0;
      var tmp = get_HEX_DIGIT_CHARS();
      // Inline function 'okio.shr' call
      result[tmp1] = tmp[(b >> 4) & 15];
      var tmp2 = c;
      c = (tmp2 + 1) | 0;
      var tmp_0 = get_HEX_DIGIT_CHARS();
      // Inline function 'okio.and' call
      result[tmp2] = tmp_0[b & 15];
    }
    return concatToString(result);
  };
  protoOf(ByteString).md5_2b9a_k$ = function () {
    return this.digest_b0rr7_k$(new Md5());
  };
  protoOf(ByteString).sha1_23myt_k$ = function () {
    return this.digest_b0rr7_k$(new Sha1());
  };
  protoOf(ByteString).sha256_exzwt5_k$ = function () {
    return this.digest_b0rr7_k$(new Sha256());
  };
  protoOf(ByteString).sha512_exzuom_k$ = function () {
    return this.digest_b0rr7_k$(new Sha512());
  };
  protoOf(ByteString).hmacSha1_crnr8j_k$ = function (key) {
    return this.digest_b0rr7_k$(Companion_getInstance_3().sha1_yksf2c_k$(key));
  };
  protoOf(ByteString).hmacSha256_ynvjgl_k$ = function (key) {
    return this.digest_b0rr7_k$(Companion_getInstance_3().sha256_4vtk9u_k$(key));
  };
  protoOf(ByteString).hmacSha512_7grw14_k$ = function (key) {
    return this.digest_b0rr7_k$(Companion_getInstance_3().sha512_w2x7pb_k$(key));
  };
  protoOf(ByteString).digest_b0rr7_k$ = function (hashFunction) {
    hashFunction.update_6igkux_k$(this.data_1, 0, this.get_size_woubt6_k$());
    var digestBytes = hashFunction.digest_m0ziv0_k$();
    return new ByteString(digestBytes);
  };
  protoOf(ByteString).toAsciiLowercase_hzcfjv_k$ = function () {
    var tmp$ret$2;
    $l$block: {
      // Inline function 'okio.internal.commonToAsciiLowercase' call
      var i = 0;
      $l$loop: while (i < this.data_1.length) {
        var c = this.data_1[i];
        if (c < 65 ? true : c > 90) {
          i = (i + 1) | 0;
          continue $l$loop;
        }
        // Inline function 'kotlin.collections.copyOf' call
        // Inline function 'kotlin.js.asDynamic' call
        var lowercase = this.data_1.slice();
        var tmp1 = i;
        i = (tmp1 + 1) | 0;
        lowercase[tmp1] = toByte((c - -32) | 0);
        $l$loop_0: while (i < lowercase.length) {
          c = lowercase[i];
          if (c < 65 ? true : c > 90) {
            i = (i + 1) | 0;
            continue $l$loop_0;
          }
          lowercase[i] = toByte((c - -32) | 0);
          i = (i + 1) | 0;
        }
        tmp$ret$2 = new ByteString(lowercase);
        break $l$block;
      }
      tmp$ret$2 = this;
    }
    return tmp$ret$2;
  };
  protoOf(ByteString).toAsciiUppercase_u6qzto_k$ = function () {
    var tmp$ret$2;
    $l$block: {
      // Inline function 'okio.internal.commonToAsciiUppercase' call
      var i = 0;
      $l$loop: while (i < this.data_1.length) {
        var c = this.data_1[i];
        if (c < 97 ? true : c > 122) {
          i = (i + 1) | 0;
          continue $l$loop;
        }
        // Inline function 'kotlin.collections.copyOf' call
        // Inline function 'kotlin.js.asDynamic' call
        var lowercase = this.data_1.slice();
        var tmp1 = i;
        i = (tmp1 + 1) | 0;
        lowercase[tmp1] = toByte((c - 32) | 0);
        $l$loop_0: while (i < lowercase.length) {
          c = lowercase[i];
          if (c < 97 ? true : c > 122) {
            i = (i + 1) | 0;
            continue $l$loop_0;
          }
          lowercase[i] = toByte((c - 32) | 0);
          i = (i + 1) | 0;
        }
        tmp$ret$2 = new ByteString(lowercase);
        break $l$block;
      }
      tmp$ret$2 = this;
    }
    return tmp$ret$2;
  };
  protoOf(ByteString).substring_d7lab3_k$ = function (beginIndex, endIndex) {
    var tmp$ret$3;
    $l$block: {
      // Inline function 'okio.internal.commonSubstring' call
      var endIndex_0 = resolveDefaultParameter(this, endIndex);
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(beginIndex >= 0)) {
        // Inline function 'okio.internal.commonSubstring.<anonymous>' call
        var message = 'beginIndex < 0';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(endIndex_0 <= this.data_1.length)) {
        // Inline function 'okio.internal.commonSubstring.<anonymous>' call
        var message_0 = 'endIndex > length(' + this.data_1.length + ')';
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      var subLen = (endIndex_0 - beginIndex) | 0;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(subLen >= 0)) {
        // Inline function 'okio.internal.commonSubstring.<anonymous>' call
        var message_1 = 'endIndex < beginIndex';
        throw IllegalArgumentException_init_$Create$(toString(message_1));
      }
      if (beginIndex === 0 ? endIndex_0 === this.data_1.length : false) {
        tmp$ret$3 = this;
        break $l$block;
      }
      tmp$ret$3 = new ByteString(copyOfRange(this.data_1, beginIndex, endIndex_0));
    }
    return tmp$ret$3;
  };
  protoOf(ByteString).substring$default_eaicy4_k$ = function (beginIndex, endIndex, $super) {
    beginIndex = beginIndex === VOID ? 0 : beginIndex;
    endIndex = endIndex === VOID ? get_DEFAULT__ByteString_size() : endIndex;
    return $super === VOID
      ? this.substring_d7lab3_k$(beginIndex, endIndex)
      : $super.substring_d7lab3_k$.call(this, beginIndex, endIndex);
  };
  protoOf(ByteString).internalGet_c9dep_k$ = function (pos) {
    if (pos >= this.get_size_woubt6_k$() ? true : pos < 0)
      throw new ArrayIndexOutOfBoundsException('size=' + this.get_size_woubt6_k$() + ' pos=' + pos);
    // Inline function 'okio.internal.commonGetByte' call
    return this.data_1[pos];
  };
  protoOf(ByteString).get_c1px32_k$ = function (index) {
    return this.internalGet_c9dep_k$(index);
  };
  protoOf(ByteString).get_size_woubt6_k$ = function () {
    return this.getSize_18qr2h_k$();
  };
  protoOf(ByteString).getSize_18qr2h_k$ = function () {
    // Inline function 'okio.internal.commonGetSize' call
    return this.data_1.length;
  };
  protoOf(ByteString).toByteArray_qczt2u_k$ = function () {
    // Inline function 'okio.internal.commonToByteArray' call
    // Inline function 'kotlin.collections.copyOf' call
    // Inline function 'kotlin.js.asDynamic' call
    return this.data_1.slice();
  };
  protoOf(ByteString).internalArray_tr176k_k$ = function () {
    // Inline function 'okio.internal.commonInternalArray' call
    return this.data_1;
  };
  protoOf(ByteString).write_7y2kpx_k$ = function (buffer, offset, byteCount) {
    return commonWrite_4(this, buffer, offset, byteCount);
  };
  protoOf(ByteString).rangeEquals_b8izl9_k$ = function (offset, other, otherOffset, byteCount) {
    // Inline function 'okio.internal.commonRangeEquals' call
    return other.rangeEquals_4nzvj0_k$(otherOffset, this.data_1, offset, byteCount);
  };
  protoOf(ByteString).rangeEquals_4nzvj0_k$ = function (offset, other, otherOffset, byteCount) {
    // Inline function 'okio.internal.commonRangeEquals' call
    return (
      ((offset >= 0 ? offset <= ((this.data_1.length - byteCount) | 0) : false) ? otherOffset >= 0 : false)
        ? otherOffset <= ((other.length - byteCount) | 0)
        : false
    )
      ? arrayRangeEquals(this.data_1, offset, other, otherOffset, byteCount)
      : false;
  };
  protoOf(ByteString).copyInto_joaaul_k$ = function (offset, target, targetOffset, byteCount) {
    // Inline function 'kotlin.collections.copyInto' call
    var this_0 = this.data_1;
    var endIndex = (offset + byteCount) | 0;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    var tmp = this_0;
    // Inline function 'kotlin.js.unsafeCast' call
    // Inline function 'kotlin.js.asDynamic' call
    arrayCopy(tmp, target, targetOffset, offset, endIndex);
    return Unit_getInstance();
  };
  protoOf(ByteString).copyInto$default_aujyww_k$ = function (offset, target, targetOffset, byteCount, $super) {
    offset = offset === VOID ? 0 : offset;
    targetOffset = targetOffset === VOID ? 0 : targetOffset;
    var tmp;
    if ($super === VOID) {
      this.copyInto_joaaul_k$(offset, target, targetOffset, byteCount);
      tmp = Unit_getInstance();
    } else {
      tmp = $super.copyInto_joaaul_k$.call(this, offset, target, targetOffset, byteCount);
    }
    return tmp;
  };
  protoOf(ByteString).startsWith_w7onu6_k$ = function (prefix) {
    // Inline function 'okio.internal.commonStartsWith' call
    return this.rangeEquals_b8izl9_k$(0, prefix, 0, prefix.get_size_woubt6_k$());
  };
  protoOf(ByteString).startsWith_qrldyh_k$ = function (prefix) {
    // Inline function 'okio.internal.commonStartsWith' call
    return this.rangeEquals_4nzvj0_k$(0, prefix, 0, prefix.length);
  };
  protoOf(ByteString).endsWith_gb36t1_k$ = function (suffix) {
    // Inline function 'okio.internal.commonEndsWith' call
    return this.rangeEquals_b8izl9_k$(
      (this.get_size_woubt6_k$() - suffix.get_size_woubt6_k$()) | 0,
      suffix,
      0,
      suffix.get_size_woubt6_k$(),
    );
  };
  protoOf(ByteString).endsWith_rgsdz2_k$ = function (suffix) {
    // Inline function 'okio.internal.commonEndsWith' call
    return this.rangeEquals_4nzvj0_k$((this.get_size_woubt6_k$() - suffix.length) | 0, suffix, 0, suffix.length);
  };
  protoOf(ByteString).indexOf_kkf4fc_k$ = function (other, fromIndex) {
    return this.indexOf_ivmdf5_k$(other.internalArray_tr176k_k$(), fromIndex);
  };
  protoOf(ByteString).indexOf$default_hu8ijm_k$ = function (other, fromIndex, $super) {
    fromIndex = fromIndex === VOID ? 0 : fromIndex;
    return $super === VOID
      ? this.indexOf_kkf4fc_k$(other, fromIndex)
      : $super.indexOf_kkf4fc_k$.call(this, other, fromIndex);
  };
  protoOf(ByteString).indexOf_ivmdf5_k$ = function (other, fromIndex) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'okio.internal.commonIndexOf' call
      var limit = (this.data_1.length - other.length) | 0;
      // Inline function 'kotlin.comparisons.maxOf' call
      var inductionVariable = Math.max(fromIndex, 0);
      if (inductionVariable <= limit)
        do {
          var i = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          if (arrayRangeEquals(this.data_1, i, other, 0, other.length)) {
            tmp$ret$1 = i;
            break $l$block;
          }
        } while (!(i === limit));
      tmp$ret$1 = -1;
    }
    return tmp$ret$1;
  };
  protoOf(ByteString).indexOf$default_j50f4r_k$ = function (other, fromIndex, $super) {
    fromIndex = fromIndex === VOID ? 0 : fromIndex;
    return $super === VOID
      ? this.indexOf_ivmdf5_k$(other, fromIndex)
      : $super.indexOf_ivmdf5_k$.call(this, other, fromIndex);
  };
  protoOf(ByteString).lastIndexOf_jcxov2_k$ = function (other, fromIndex) {
    // Inline function 'okio.internal.commonLastIndexOf' call
    return this.lastIndexOf_cmuddn_k$(other.internalArray_tr176k_k$(), fromIndex);
  };
  protoOf(ByteString).lastIndexOf$default_47y2vs_k$ = function (other, fromIndex, $super) {
    fromIndex = fromIndex === VOID ? get_DEFAULT__ByteString_size() : fromIndex;
    return $super === VOID
      ? this.lastIndexOf_jcxov2_k$(other, fromIndex)
      : $super.lastIndexOf_jcxov2_k$.call(this, other, fromIndex);
  };
  protoOf(ByteString).lastIndexOf_cmuddn_k$ = function (other, fromIndex) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'okio.internal.commonLastIndexOf' call
      var fromIndex_0 = resolveDefaultParameter(this, fromIndex);
      var limit = (this.data_1.length - other.length) | 0;
      // Inline function 'kotlin.comparisons.minOf' call
      var inductionVariable = Math.min(fromIndex_0, limit);
      if (0 <= inductionVariable)
        do {
          var i = inductionVariable;
          inductionVariable = (inductionVariable + -1) | 0;
          if (arrayRangeEquals(this.data_1, i, other, 0, other.length)) {
            tmp$ret$1 = i;
            break $l$block;
          }
        } while (0 <= inductionVariable);
      tmp$ret$1 = -1;
    }
    return tmp$ret$1;
  };
  protoOf(ByteString).lastIndexOf$default_2sewpd_k$ = function (other, fromIndex, $super) {
    fromIndex = fromIndex === VOID ? get_DEFAULT__ByteString_size() : fromIndex;
    return $super === VOID
      ? this.lastIndexOf_cmuddn_k$(other, fromIndex)
      : $super.lastIndexOf_cmuddn_k$.call(this, other, fromIndex);
  };
  protoOf(ByteString).equals = function (other) {
    // Inline function 'okio.internal.commonEquals' call
    var tmp;
    if (other === this) {
      tmp = true;
    } else {
      if (other instanceof ByteString) {
        tmp =
          other.get_size_woubt6_k$() === this.data_1.length
            ? other.rangeEquals_4nzvj0_k$(0, this.data_1, 0, this.data_1.length)
            : false;
      } else {
        tmp = false;
      }
    }
    return tmp;
  };
  protoOf(ByteString).hashCode = function () {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonHashCode' call
      var result = this.hashCode_2;
      if (!(result === 0)) {
        tmp$ret$0 = result;
        break $l$block;
      }
      // Inline function 'kotlin.also' call
      var this_0 = contentHashCode(this.data_1);
      // Inline function 'kotlin.contracts.contract' call
      // Inline function 'okio.internal.commonHashCode.<anonymous>' call
      this.set_hashCode_zcrtc_k$(this_0);
      tmp$ret$0 = this_0;
    }
    return tmp$ret$0;
  };
  protoOf(ByteString).compareTo_u95g6h_k$ = function (other) {
    var tmp$ret$3;
    $l$block_0: {
      // Inline function 'okio.internal.commonCompareTo' call
      var sizeA = this.get_size_woubt6_k$();
      var sizeB = other.get_size_woubt6_k$();
      var i = 0;
      // Inline function 'kotlin.comparisons.minOf' call
      var size = Math.min(sizeA, sizeB);
      $l$loop: while (i < size) {
        // Inline function 'okio.and' call
        var byteA = this.get_c1px32_k$(i) & 255;
        // Inline function 'okio.and' call
        var byteB = other.get_c1px32_k$(i) & 255;
        if (byteA === byteB) {
          i = (i + 1) | 0;
          continue $l$loop;
        }
        tmp$ret$3 = byteA < byteB ? -1 : 1;
        break $l$block_0;
      }
      if (sizeA === sizeB) {
        tmp$ret$3 = 0;
        break $l$block_0;
      }
      tmp$ret$3 = sizeA < sizeB ? -1 : 1;
    }
    return tmp$ret$3;
  };
  protoOf(ByteString).compareTo_hpufkf_k$ = function (other) {
    return this.compareTo_u95g6h_k$(other instanceof ByteString ? other : THROW_CCE());
  };
  protoOf(ByteString).toString = function () {
    var tmp$ret$1;
    $l$block_1: {
      // Inline function 'okio.internal.commonToString' call
      // Inline function 'kotlin.collections.isEmpty' call
      if (this.data_1.length === 0) {
        tmp$ret$1 = '[size=0]';
        break $l$block_1;
      }
      var i = codePointIndexToCharIndex$accessor$1yfvj6b(this.data_1, 64);
      if (i === -1) {
        var tmp;
        if (this.data_1.length <= 64) {
          tmp = '[hex=' + this.hex_27mj_k$() + ']';
        } else {
          var tmp_0 = this.data_1.length;
          var tmp$ret$5;
          $l$block_0: {
            // Inline function 'okio.internal.commonSubstring' call
            var endIndex = resolveDefaultParameter(this, 64);
            // Inline function 'kotlin.require' call
            // Inline function 'kotlin.contracts.contract' call
            if (!(0 >= 0)) {
              // Inline function 'okio.internal.commonSubstring.<anonymous>' call
              var message = 'beginIndex < 0';
              throw IllegalArgumentException_init_$Create$(toString(message));
            }
            // Inline function 'kotlin.require' call
            // Inline function 'kotlin.contracts.contract' call
            if (!(endIndex <= this.data_1.length)) {
              // Inline function 'okio.internal.commonSubstring.<anonymous>' call
              var message_0 = 'endIndex > length(' + this.data_1.length + ')';
              throw IllegalArgumentException_init_$Create$(toString(message_0));
            }
            var subLen = (endIndex - 0) | 0;
            // Inline function 'kotlin.require' call
            // Inline function 'kotlin.contracts.contract' call
            if (!(subLen >= 0)) {
              // Inline function 'okio.internal.commonSubstring.<anonymous>' call
              var message_1 = 'endIndex < beginIndex';
              throw IllegalArgumentException_init_$Create$(toString(message_1));
            }
            if (0 === 0 ? endIndex === this.data_1.length : false) {
              tmp$ret$5 = this;
              break $l$block_0;
            }
            tmp$ret$5 = new ByteString(copyOfRange(this.data_1, 0, endIndex));
          }
          tmp = '[size=' + tmp_0 + ' hex=' + tmp$ret$5.hex_27mj_k$() + '\u2026]';
        }
        tmp$ret$1 = tmp;
        break $l$block_1;
      }
      var text = this.utf8_255yp_k$();
      // Inline function 'kotlin.text.substring' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp$ret$7 = text.substring(0, i);
      var safeText = replace(replace(replace(tmp$ret$7, '\\', '\\\\'), '\n', '\\n'), '\r', '\\r');
      var tmp_1;
      if (i < text.length) {
        tmp_1 = '[size=' + this.data_1.length + ' text=' + safeText + '\u2026]';
      } else {
        tmp_1 = '[text=' + safeText + ']';
      }
      tmp$ret$1 = tmp_1;
    }
    return tmp$ret$1;
  };
  function toByteString($this) {
    return new ByteString($this.toByteArray_qczt2u_k$());
  }
  function SegmentedByteString(segments, directory) {
    ByteString.call(this, Companion_getInstance_7().get_EMPTY_i8q41w_k$().get_data_wokkxf_k$());
    this.segments_1 = segments;
    this.directory_1 = directory;
  }
  protoOf(SegmentedByteString).get_segments_ecat1z_k$ = function () {
    return this.segments_1;
  };
  protoOf(SegmentedByteString).get_directory_7ekq4c_k$ = function () {
    return this.directory_1;
  };
  protoOf(SegmentedByteString).base64_n39i29_k$ = function () {
    return toByteString(this).base64_n39i29_k$();
  };
  protoOf(SegmentedByteString).hex_27mj_k$ = function () {
    return toByteString(this).hex_27mj_k$();
  };
  protoOf(SegmentedByteString).toAsciiLowercase_hzcfjv_k$ = function () {
    return toByteString(this).toAsciiLowercase_hzcfjv_k$();
  };
  protoOf(SegmentedByteString).toAsciiUppercase_u6qzto_k$ = function () {
    return toByteString(this).toAsciiUppercase_u6qzto_k$();
  };
  protoOf(SegmentedByteString).base64Url_up517k_k$ = function () {
    return toByteString(this).base64Url_up517k_k$();
  };
  protoOf(SegmentedByteString).substring_d7lab3_k$ = function (beginIndex, endIndex) {
    var tmp$ret$3;
    $l$block_0: {
      // Inline function 'okio.internal.commonSubstring' call
      var endIndex_0 = resolveDefaultParameter(this, endIndex);
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(beginIndex >= 0)) {
        // Inline function 'okio.internal.commonSubstring.<anonymous>' call
        var message = 'beginIndex=' + beginIndex + ' < 0';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(endIndex_0 <= this.get_size_woubt6_k$())) {
        // Inline function 'okio.internal.commonSubstring.<anonymous>' call
        var message_0 = 'endIndex=' + endIndex_0 + ' > length(' + this.get_size_woubt6_k$() + ')';
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      var subLen = (endIndex_0 - beginIndex) | 0;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(subLen >= 0)) {
        // Inline function 'okio.internal.commonSubstring.<anonymous>' call
        var message_1 = 'endIndex=' + endIndex_0 + ' < beginIndex=' + beginIndex;
        throw IllegalArgumentException_init_$Create$(toString(message_1));
      }
      if (beginIndex === 0 ? endIndex_0 === this.get_size_woubt6_k$() : false) {
        tmp$ret$3 = this;
        break $l$block_0;
      } else if (beginIndex === endIndex_0) {
        tmp$ret$3 = Companion_getInstance_7().get_EMPTY_i8q41w_k$();
        break $l$block_0;
      }
      var beginSegment = segment(this, beginIndex);
      var endSegment = segment(this, (endIndex_0 - 1) | 0);
      var newSegments = copyOfRange_0(this.segments_1, beginSegment, (endSegment + 1) | 0);
      var newDirectory = new Int32Array(imul(newSegments.length, 2));
      var index = 0;
      var inductionVariable = beginSegment;
      if (inductionVariable <= endSegment)
        do {
          var s = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          var tmp = index;
          // Inline function 'kotlin.comparisons.minOf' call
          var a = (this.directory_1[s] - beginIndex) | 0;
          newDirectory[tmp] = Math.min(a, subLen);
          var tmp1 = index;
          index = (tmp1 + 1) | 0;
          newDirectory[(tmp1 + newSegments.length) | 0] = this.directory_1[(s + this.segments_1.length) | 0];
        } while (!(s === endSegment));
      var segmentOffset = beginSegment === 0 ? 0 : this.directory_1[(beginSegment - 1) | 0];
      var tmp3_index0 = newSegments.length;
      newDirectory[tmp3_index0] = (newDirectory[tmp3_index0] + ((beginIndex - segmentOffset) | 0)) | 0;
      tmp$ret$3 = new SegmentedByteString(newSegments, newDirectory);
    }
    return tmp$ret$3;
  };
  protoOf(SegmentedByteString).internalGet_c9dep_k$ = function (pos) {
    // Inline function 'okio.internal.commonInternalGet' call
    checkOffsetAndCount(toLong(this.directory_1[(this.segments_1.length - 1) | 0]), toLong(pos), new Long(1, 0));
    var segment_0 = segment(this, pos);
    var segmentOffset = segment_0 === 0 ? 0 : this.directory_1[(segment_0 - 1) | 0];
    var segmentPos = this.directory_1[(segment_0 + this.segments_1.length) | 0];
    return this.segments_1[segment_0][(((pos - segmentOffset) | 0) + segmentPos) | 0];
  };
  protoOf(SegmentedByteString).getSize_18qr2h_k$ = function () {
    // Inline function 'okio.internal.commonGetSize' call
    return this.directory_1[(this.segments_1.length - 1) | 0];
  };
  protoOf(SegmentedByteString).toByteArray_qczt2u_k$ = function () {
    // Inline function 'okio.internal.commonToByteArray' call
    var result = new Int8Array(this.get_size_woubt6_k$());
    var resultPos = 0;
    // Inline function 'okio.internal.forEachSegment' call
    var segmentCount = this.segments_1.length;
    var s = 0;
    var pos = 0;
    while (s < segmentCount) {
      var segmentPos = this.directory_1[(segmentCount + s) | 0];
      var nextSegmentOffset = this.directory_1[s];
      // Inline function 'okio.internal.commonToByteArray.<anonymous>' call
      var byteCount = (nextSegmentOffset - pos) | 0;
      // Inline function 'kotlin.collections.copyInto' call
      var this_0 = this.segments_1[s];
      var destinationOffset = resultPos;
      var endIndex = (segmentPos + byteCount) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = this_0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, result, destinationOffset, segmentPos, endIndex);
      resultPos = (resultPos + byteCount) | 0;
      pos = nextSegmentOffset;
      s = (s + 1) | 0;
    }
    return result;
  };
  protoOf(SegmentedByteString).write_7y2kpx_k$ = function (buffer, offset, byteCount) {
    // Inline function 'okio.internal.forEachSegment' call
    var endIndex = (offset + byteCount) | 0;
    var s = segment(this, offset);
    var pos = offset;
    while (pos < endIndex) {
      var segmentOffset = s === 0 ? 0 : this.directory_1[(s - 1) | 0];
      var segmentSize = (this.directory_1[s] - segmentOffset) | 0;
      var segmentPos = this.directory_1[(this.segments_1.length + s) | 0];
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (segmentOffset + segmentSize) | 0;
      var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
      var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
      // Inline function 'okio.internal.commonWrite.<anonymous>' call
      var data = this.segments_1[s];
      var segment_0 = Segment_init_$Create$_0(data, offset_0, (offset_0 + byteCount_0) | 0, true, false);
      if (buffer.get_head_won7e1_k$() == null) {
        segment_0.set_prev_ur3dkn_k$(segment_0);
        segment_0.set_next_tohs5l_k$(segment_0.get_prev_wosl18_k$());
        buffer.set_head_iv937o_k$(segment_0.get_next_wor1vg_k$());
      } else {
        ensureNotNull(ensureNotNull(buffer.get_head_won7e1_k$()).get_prev_wosl18_k$()).push_wd62e0_k$(segment_0);
      }
      pos = (pos + byteCount_0) | 0;
      s = (s + 1) | 0;
    }
    // Inline function 'kotlin.Long.plus' call
    var tmp$ret$1 = buffer.get_size_woubt6_k$().plus_r93sks_k$(toLong(byteCount));
    buffer.set_size_9bzqhs_k$(tmp$ret$1);
    return Unit_getInstance();
  };
  protoOf(SegmentedByteString).rangeEquals_b8izl9_k$ = function (offset, other, otherOffset, byteCount) {
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'okio.internal.commonRangeEquals' call
      if (offset < 0 ? true : offset > ((this.get_size_woubt6_k$() - byteCount) | 0)) {
        tmp$ret$0 = false;
        break $l$block_0;
      }
      var otherOffset_0 = otherOffset;
      // Inline function 'okio.internal.forEachSegment' call
      var endIndex = (offset + byteCount) | 0;
      var s = segment(this, offset);
      var pos = offset;
      while (pos < endIndex) {
        var segmentOffset = s === 0 ? 0 : this.directory_1[(s - 1) | 0];
        var segmentSize = (this.directory_1[s] - segmentOffset) | 0;
        var segmentPos = this.directory_1[(this.segments_1.length + s) | 0];
        // Inline function 'kotlin.comparisons.minOf' call
        var b = (segmentOffset + segmentSize) | 0;
        var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
        var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
        // Inline function 'okio.internal.commonRangeEquals.<anonymous>' call
        var data = this.segments_1[s];
        if (!other.rangeEquals_4nzvj0_k$(otherOffset_0, data, offset_0, byteCount_0)) {
          tmp$ret$0 = false;
          break $l$block_0;
        }
        otherOffset_0 = (otherOffset_0 + byteCount_0) | 0;
        pos = (pos + byteCount_0) | 0;
        s = (s + 1) | 0;
      }
      tmp$ret$0 = true;
    }
    return tmp$ret$0;
  };
  protoOf(SegmentedByteString).rangeEquals_4nzvj0_k$ = function (offset, other, otherOffset, byteCount) {
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'okio.internal.commonRangeEquals' call
      if (
        ((offset < 0 ? true : offset > ((this.get_size_woubt6_k$() - byteCount) | 0)) ? true : otherOffset < 0)
          ? true
          : otherOffset > ((other.length - byteCount) | 0)
      ) {
        tmp$ret$0 = false;
        break $l$block_0;
      }
      var otherOffset_0 = otherOffset;
      // Inline function 'okio.internal.forEachSegment' call
      var endIndex = (offset + byteCount) | 0;
      var s = segment(this, offset);
      var pos = offset;
      while (pos < endIndex) {
        var segmentOffset = s === 0 ? 0 : this.directory_1[(s - 1) | 0];
        var segmentSize = (this.directory_1[s] - segmentOffset) | 0;
        var segmentPos = this.directory_1[(this.segments_1.length + s) | 0];
        // Inline function 'kotlin.comparisons.minOf' call
        var b = (segmentOffset + segmentSize) | 0;
        var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
        var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
        // Inline function 'okio.internal.commonRangeEquals.<anonymous>' call
        var data = this.segments_1[s];
        if (!arrayRangeEquals(data, offset_0, other, otherOffset_0, byteCount_0)) {
          tmp$ret$0 = false;
          break $l$block_0;
        }
        otherOffset_0 = (otherOffset_0 + byteCount_0) | 0;
        pos = (pos + byteCount_0) | 0;
        s = (s + 1) | 0;
      }
      tmp$ret$0 = true;
    }
    return tmp$ret$0;
  };
  protoOf(SegmentedByteString).copyInto_joaaul_k$ = function (offset, target, targetOffset, byteCount) {
    checkOffsetAndCount(toLong(this.get_size_woubt6_k$()), toLong(offset), toLong(byteCount));
    checkOffsetAndCount(toLong(target.length), toLong(targetOffset), toLong(byteCount));
    var targetOffset_0 = targetOffset;
    var endIndex = (offset + byteCount) | 0;
    var s = segment(this, offset);
    var pos = offset;
    while (pos < endIndex) {
      var segmentOffset = s === 0 ? 0 : this.directory_1[(s - 1) | 0];
      var segmentSize = (this.directory_1[s] - segmentOffset) | 0;
      var segmentPos = this.directory_1[(this.segments_1.length + s) | 0];
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (segmentOffset + segmentSize) | 0;
      var byteCount_0 = (Math.min(endIndex, b) - pos) | 0;
      var offset_0 = (segmentPos + ((pos - segmentOffset) | 0)) | 0;
      // Inline function 'okio.internal.commonCopyInto.<anonymous>' call
      // Inline function 'kotlin.collections.copyInto' call
      var this_0 = this.segments_1[s];
      var destinationOffset = targetOffset_0;
      var endIndex_0 = (offset_0 + byteCount_0) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = this_0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, target, destinationOffset, offset_0, endIndex_0);
      targetOffset_0 = (targetOffset_0 + byteCount_0) | 0;
      pos = (pos + byteCount_0) | 0;
      s = (s + 1) | 0;
    }
    return Unit_getInstance();
  };
  protoOf(SegmentedByteString).indexOf_ivmdf5_k$ = function (other, fromIndex) {
    return toByteString(this).indexOf_ivmdf5_k$(other, fromIndex);
  };
  protoOf(SegmentedByteString).lastIndexOf_cmuddn_k$ = function (other, fromIndex) {
    return toByteString(this).lastIndexOf_cmuddn_k$(other, fromIndex);
  };
  protoOf(SegmentedByteString).digest_b0rr7_k$ = function (hashFunction) {
    // Inline function 'okio.internal.forEachSegment' call
    var segmentCount = this.segments_1.length;
    var s = 0;
    var pos = 0;
    while (s < segmentCount) {
      var segmentPos = this.directory_1[(segmentCount + s) | 0];
      var nextSegmentOffset = this.directory_1[s];
      // Inline function 'okio.SegmentedByteString.digest.<anonymous>' call
      var data = this.segments_1[s];
      var byteCount = (nextSegmentOffset - pos) | 0;
      hashFunction.update_6igkux_k$(data, segmentPos, byteCount);
      pos = nextSegmentOffset;
      s = (s + 1) | 0;
    }
    var digestBytes = hashFunction.digest_m0ziv0_k$();
    return new ByteString(digestBytes);
  };
  protoOf(SegmentedByteString).internalArray_tr176k_k$ = function () {
    return this.toByteArray_qczt2u_k$();
  };
  protoOf(SegmentedByteString).equals = function (other) {
    // Inline function 'okio.internal.commonEquals' call
    var tmp;
    if (other === this) {
      tmp = true;
    } else {
      if (other instanceof ByteString) {
        tmp =
          other.get_size_woubt6_k$() === this.get_size_woubt6_k$()
            ? this.rangeEquals_b8izl9_k$(0, other, 0, this.get_size_woubt6_k$())
            : false;
      } else {
        tmp = false;
      }
    }
    return tmp;
  };
  protoOf(SegmentedByteString).hashCode = function () {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonHashCode' call
      var result = this.get_hashCode_td036k_k$();
      if (!(result === 0)) {
        tmp$ret$0 = result;
        break $l$block;
      }
      result = 1;
      // Inline function 'okio.internal.forEachSegment' call
      var segmentCount = this.segments_1.length;
      var s = 0;
      var pos = 0;
      while (s < segmentCount) {
        var segmentPos = this.directory_1[(segmentCount + s) | 0];
        var nextSegmentOffset = this.directory_1[s];
        // Inline function 'okio.internal.commonHashCode.<anonymous>' call
        var data = this.segments_1[s];
        var i = segmentPos;
        var limit = (segmentPos + ((nextSegmentOffset - pos) | 0)) | 0;
        while (i < limit) {
          result = (imul(31, result) + data[i]) | 0;
          i = (i + 1) | 0;
        }
        pos = nextSegmentOffset;
        s = (s + 1) | 0;
      }
      this.set_hashCode_zcrtc_k$(result);
      tmp$ret$0 = result;
    }
    return tmp$ret$0;
  };
  protoOf(SegmentedByteString).toString = function () {
    return toByteString(this).toString();
  };
  function digest($this, hash) {
    forEachSegment_1($this, Buffer$digest$lambda(hash));
    return new ByteString(hash.digest_m0ziv0_k$());
  }
  function forEachSegment_1($this, action) {
    var tmp0_safe_receiver = $this.head_1;
    if (tmp0_safe_receiver == null) null;
    else {
      // Inline function 'kotlin.let' call
      // Inline function 'kotlin.contracts.contract' call
      var segment = tmp0_safe_receiver;
      do {
        var tmp0_safe_receiver_0 = segment;
        if (tmp0_safe_receiver_0 == null) null;
        else {
          // Inline function 'kotlin.let' call
          // Inline function 'kotlin.contracts.contract' call
          action(tmp0_safe_receiver_0);
        }
        var tmp1_safe_receiver = segment;
        segment = tmp1_safe_receiver == null ? null : tmp1_safe_receiver.get_next_wor1vg_k$();
      } while (!(segment === tmp0_safe_receiver));
    }
  }
  function UnsafeCursor() {
    this.buffer_1 = null;
    this.readWrite_1 = false;
    this.segment_1 = null;
    this.offset_1 = new Long(-1, -1);
    this.data_1 = null;
    this.start_1 = -1;
    this.end_1 = -1;
  }
  protoOf(UnsafeCursor).set_buffer_av52bi_k$ = function (_set____db54di) {
    this.buffer_1 = _set____db54di;
  };
  protoOf(UnsafeCursor).get_buffer_bmaafd_k$ = function () {
    return this.buffer_1;
  };
  protoOf(UnsafeCursor).set_readWrite_85z6rb_k$ = function (_set____db54di) {
    this.readWrite_1 = _set____db54di;
  };
  protoOf(UnsafeCursor).get_readWrite_a0tpds_k$ = function () {
    return this.readWrite_1;
  };
  protoOf(UnsafeCursor).set_segment_kblzx9_k$ = function (_set____db54di) {
    this.segment_1 = _set____db54di;
  };
  protoOf(UnsafeCursor).get_segment_xwnoei_k$ = function () {
    return this.segment_1;
  };
  protoOf(UnsafeCursor).set_offset_snb08i_k$ = function (_set____db54di) {
    this.offset_1 = _set____db54di;
  };
  protoOf(UnsafeCursor).get_offset_hjmqak_k$ = function () {
    return this.offset_1;
  };
  protoOf(UnsafeCursor).set_data_zi6csw_k$ = function (_set____db54di) {
    this.data_1 = _set____db54di;
  };
  protoOf(UnsafeCursor).get_data_wokkxf_k$ = function () {
    return this.data_1;
  };
  protoOf(UnsafeCursor).set_start_x5zd0j_k$ = function (_set____db54di) {
    this.start_1 = _set____db54di;
  };
  protoOf(UnsafeCursor).get_start_iypx6h_k$ = function () {
    return this.start_1;
  };
  protoOf(UnsafeCursor).set_end_2o0hu2_k$ = function (_set____db54di) {
    this.end_1 = _set____db54di;
  };
  protoOf(UnsafeCursor).get_end_18j6ha_k$ = function () {
    return this.end_1;
  };
  protoOf(UnsafeCursor).next_20eer_k$ = function () {
    // Inline function 'okio.internal.commonNext' call
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!this.offset_1.equals(ensureNotNull(this.buffer_1).size_1)) {
      // Inline function 'okio.internal.commonNext.<anonymous>' call
      var message = 'no more bytes';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    var tmp;
    if (this.offset_1.equals(new Long(-1, -1))) {
      tmp = this.seek_de9ugm_k$(new Long(0, 0));
    } else {
      // Inline function 'kotlin.Long.plus' call
      var this_0 = this.offset_1;
      var other = (this.end_1 - this.start_1) | 0;
      var tmp$ret$1 = this_0.plus_r93sks_k$(toLong(other));
      tmp = this.seek_de9ugm_k$(tmp$ret$1);
    }
    return tmp;
  };
  protoOf(UnsafeCursor).seek_de9ugm_k$ = function (offset) {
    var tmp$ret$2;
    $l$block_0: {
      // Inline function 'okio.internal.commonSeek' call
      var tmp$ret$1;
      $l$block: {
        // Inline function 'kotlin.checkNotNull' call
        var value = this.buffer_1;
        // Inline function 'kotlin.contracts.contract' call
        if (value == null) {
          // Inline function 'okio.internal.commonSeek.<anonymous>' call
          var message = 'not attached to a buffer';
          throw IllegalStateException_init_$Create$(toString(message));
        } else {
          tmp$ret$1 = value;
          break $l$block;
        }
      }
      var buffer = tmp$ret$1;
      if (offset.compareTo_9jj042_k$(new Long(-1, -1)) < 0 ? true : offset.compareTo_9jj042_k$(buffer.size_1) > 0) {
        throw new ArrayIndexOutOfBoundsException('offset=' + offset.toString() + ' > size=' + buffer.size_1.toString());
      }
      if (offset.equals(new Long(-1, -1)) ? true : offset.equals(buffer.size_1)) {
        this.segment_1 = null;
        this.offset_1 = offset;
        this.data_1 = null;
        this.start_1 = -1;
        this.end_1 = -1;
        tmp$ret$2 = -1;
        break $l$block_0;
      }
      var min = new Long(0, 0);
      var max = buffer.size_1;
      var head = buffer.head_1;
      var tail = buffer.head_1;
      if (!(this.segment_1 == null)) {
        // Inline function 'kotlin.Long.minus' call
        var this_0 = this.offset_1;
        var other = (this.start_1 - ensureNotNull(this.segment_1).get_pos_18iyad_k$()) | 0;
        var segmentOffset = this_0.minus_mfbszm_k$(toLong(other));
        if (segmentOffset.compareTo_9jj042_k$(offset) > 0) {
          max = segmentOffset;
          tail = this.segment_1;
        } else {
          min = segmentOffset;
          head = this.segment_1;
        }
      }
      var next;
      var nextOffset;
      if (max.minus_mfbszm_k$(offset).compareTo_9jj042_k$(offset.minus_mfbszm_k$(min)) > 0) {
        next = head;
        nextOffset = min;
        $l$loop: while (true) {
          // Inline function 'kotlin.Long.plus' call
          var this_1 = nextOffset;
          var other_0 = (ensureNotNull(next).get_limit_iuokuq_k$() - next.get_pos_18iyad_k$()) | 0;
          var tmp$ret$4 = this_1.plus_r93sks_k$(toLong(other_0));
          if (!(offset.compareTo_9jj042_k$(tmp$ret$4) >= 0)) {
            break $l$loop;
          }
          nextOffset = nextOffset.plus_r93sks_k$(toLong((next.get_limit_iuokuq_k$() - next.get_pos_18iyad_k$()) | 0));
          next = next.get_next_wor1vg_k$();
        }
      } else {
        next = tail;
        nextOffset = max;
        while (nextOffset.compareTo_9jj042_k$(offset) > 0) {
          next = ensureNotNull(next).get_prev_wosl18_k$();
          nextOffset = nextOffset.minus_mfbszm_k$(
            toLong((ensureNotNull(next).get_limit_iuokuq_k$() - next.get_pos_18iyad_k$()) | 0),
          );
        }
      }
      if (this.readWrite_1 ? ensureNotNull(next).get_shared_jgtlda_k$() : false) {
        var unsharedNext = next.unsharedCopy_5kj8b7_k$();
        if (buffer.head_1 === next) {
          buffer.head_1 = unsharedNext;
        }
        next = next.push_wd62e0_k$(unsharedNext);
        ensureNotNull(next.get_prev_wosl18_k$()).pop_2dsh_k$();
      }
      this.segment_1 = next;
      this.offset_1 = offset;
      this.data_1 = ensureNotNull(next).get_data_wokkxf_k$();
      this.start_1 = (next.get_pos_18iyad_k$() + offset.minus_mfbszm_k$(nextOffset).toInt_1tsl84_k$()) | 0;
      this.end_1 = next.get_limit_iuokuq_k$();
      tmp$ret$2 = (this.end_1 - this.start_1) | 0;
    }
    return tmp$ret$2;
  };
  protoOf(UnsafeCursor).resizeBuffer_z8og4m_k$ = function (newSize) {
    // Inline function 'okio.internal.commonResizeBuffer' call
    var tmp$ret$1;
    $l$block: {
      // Inline function 'kotlin.checkNotNull' call
      var value = this.buffer_1;
      // Inline function 'kotlin.contracts.contract' call
      if (value == null) {
        // Inline function 'okio.internal.commonResizeBuffer.<anonymous>' call
        var message = 'not attached to a buffer';
        throw IllegalStateException_init_$Create$(toString(message));
      } else {
        tmp$ret$1 = value;
        break $l$block;
      }
    }
    var buffer = tmp$ret$1;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!this.readWrite_1) {
      // Inline function 'okio.internal.commonResizeBuffer.<anonymous>' call
      var message_0 = 'resizeBuffer() only permitted for read/write buffers';
      throw IllegalStateException_init_$Create$(toString(message_0));
    }
    var oldSize = buffer.size_1;
    if (newSize.compareTo_9jj042_k$(oldSize) <= 0) {
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(newSize.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonResizeBuffer.<anonymous>' call
        var message_1 = 'newSize < 0: ' + newSize.toString();
        throw IllegalArgumentException_init_$Create$(toString(message_1));
      }
      var bytesToSubtract = oldSize.minus_mfbszm_k$(newSize);
      $l$loop: while (bytesToSubtract.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        var tail = ensureNotNull(buffer.head_1).get_prev_wosl18_k$();
        var tailSize = (ensureNotNull(tail).get_limit_iuokuq_k$() - tail.get_pos_18iyad_k$()) | 0;
        if (toLong(tailSize).compareTo_9jj042_k$(bytesToSubtract) <= 0) {
          buffer.head_1 = tail.pop_2dsh_k$();
          SegmentPool_getInstance().recycle_ipeoxr_k$(tail);
          bytesToSubtract = bytesToSubtract.minus_mfbszm_k$(toLong(tailSize));
        } else {
          tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() - bytesToSubtract.toInt_1tsl84_k$()) | 0);
          break $l$loop;
        }
      }
      this.segment_1 = null;
      this.offset_1 = newSize;
      this.data_1 = null;
      this.start_1 = -1;
      this.end_1 = -1;
    } else if (newSize.compareTo_9jj042_k$(oldSize) > 0) {
      var needsToSeek = true;
      var bytesToAdd = newSize.minus_mfbszm_k$(oldSize);
      while (bytesToAdd.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        var tail_0 = buffer.writableSegment_i90lmt_k$(1);
        // Inline function 'okio.minOf' call
        var a = bytesToAdd;
        var b = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - tail_0.get_limit_iuokuq_k$()) | 0;
        // Inline function 'kotlin.comparisons.minOf' call
        var b_0 = toLong(b);
        var segmentBytesToAdd = (a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0).toInt_1tsl84_k$();
        tail_0.set_limit_mo5fx2_k$((tail_0.get_limit_iuokuq_k$() + segmentBytesToAdd) | 0);
        bytesToAdd = bytesToAdd.minus_mfbszm_k$(toLong(segmentBytesToAdd));
        if (needsToSeek) {
          this.segment_1 = tail_0;
          this.offset_1 = oldSize;
          this.data_1 = tail_0.get_data_wokkxf_k$();
          this.start_1 = (tail_0.get_limit_iuokuq_k$() - segmentBytesToAdd) | 0;
          this.end_1 = tail_0.get_limit_iuokuq_k$();
          needsToSeek = false;
        }
      }
    }
    buffer.size_1 = newSize;
    return oldSize;
  };
  protoOf(UnsafeCursor).expandBuffer_m7v04i_k$ = function (minByteCount) {
    // Inline function 'okio.internal.commonExpandBuffer' call
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(minByteCount > 0)) {
      // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
      var message = 'minByteCount <= 0: ' + minByteCount;
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(minByteCount <= Companion_getInstance_1().get_SIZE_wo97pm_k$())) {
      // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
      var message_0 = 'minByteCount > Segment.SIZE: ' + minByteCount;
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    var tmp$ret$3;
    $l$block: {
      // Inline function 'kotlin.checkNotNull' call
      var value = this.buffer_1;
      // Inline function 'kotlin.contracts.contract' call
      if (value == null) {
        // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
        var message_1 = 'not attached to a buffer';
        throw IllegalStateException_init_$Create$(toString(message_1));
      } else {
        tmp$ret$3 = value;
        break $l$block;
      }
    }
    var buffer = tmp$ret$3;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!this.readWrite_1) {
      // Inline function 'okio.internal.commonExpandBuffer.<anonymous>' call
      var message_2 = 'expandBuffer() only permitted for read/write buffers';
      throw IllegalStateException_init_$Create$(toString(message_2));
    }
    var oldSize = buffer.size_1;
    var tail = buffer.writableSegment_i90lmt_k$(minByteCount);
    var result = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - tail.get_limit_iuokuq_k$()) | 0;
    tail.set_limit_mo5fx2_k$(Companion_getInstance_1().get_SIZE_wo97pm_k$());
    var tmp = buffer;
    // Inline function 'kotlin.Long.plus' call
    tmp.size_1 = oldSize.plus_r93sks_k$(toLong(result));
    this.segment_1 = tail;
    this.offset_1 = oldSize;
    this.data_1 = tail.get_data_wokkxf_k$();
    this.start_1 = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - result) | 0;
    this.end_1 = Companion_getInstance_1().get_SIZE_wo97pm_k$();
    return toLong(result);
  };
  protoOf(UnsafeCursor).close_yn9xrc_k$ = function () {
    // Inline function 'okio.internal.commonClose' call
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!(this.buffer_1 == null)) {
      // Inline function 'okio.internal.commonClose.<anonymous>' call
      var message = 'not attached to a buffer';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    this.buffer_1 = null;
    this.segment_1 = null;
    this.offset_1 = new Long(-1, -1);
    this.data_1 = null;
    this.start_1 = -1;
    this.end_1 = -1;
  };
  function Buffer$digest$lambda($hash) {
    return function (segment) {
      $hash.update_6igkux_k$(
        segment.get_data_wokkxf_k$(),
        segment.get_pos_18iyad_k$(),
        (segment.get_limit_iuokuq_k$() - segment.get_pos_18iyad_k$()) | 0,
      );
      return Unit_getInstance();
    };
  }
  function Buffer() {
    this.head_1 = null;
    this.size_1 = new Long(0, 0);
  }
  protoOf(Buffer).set_head_iv937o_k$ = function (_set____db54di) {
    this.head_1 = _set____db54di;
  };
  protoOf(Buffer).get_head_won7e1_k$ = function () {
    return this.head_1;
  };
  protoOf(Buffer).set_size_9bzqhs_k$ = function (_set____db54di) {
    this.size_1 = _set____db54di;
  };
  protoOf(Buffer).get_size_woubt6_k$ = function () {
    return this.size_1;
  };
  protoOf(Buffer).get_buffer_bmaafd_k$ = function () {
    return this;
  };
  protoOf(Buffer).emitCompleteSegments_5yum7g_k$ = function () {
    return this;
  };
  protoOf(Buffer).emit_1ut3n_k$ = function () {
    return this;
  };
  protoOf(Buffer).exhausted_p1jt55_k$ = function () {
    return this.size_1.equals(new Long(0, 0));
  };
  protoOf(Buffer).require_28r0pl_k$ = function (byteCount) {
    if (this.size_1.compareTo_9jj042_k$(byteCount) < 0) throw new EOFException(null);
  };
  protoOf(Buffer).request_mpoy7z_k$ = function (byteCount) {
    return this.size_1.compareTo_9jj042_k$(byteCount) >= 0;
  };
  protoOf(Buffer).peek_21nx7_k$ = function () {
    return buffer(new PeekSource(this));
  };
  protoOf(Buffer).copyTo_y7so4c_k$ = function (out, offset, byteCount) {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonCopyTo' call
      var offset_0 = offset;
      var byteCount_0 = byteCount;
      checkOffsetAndCount(this.size_1, offset_0, byteCount_0);
      if (byteCount_0.equals(new Long(0, 0))) {
        tmp$ret$0 = this;
        break $l$block;
      }
      out.size_1 = out.size_1.plus_r93sks_k$(byteCount_0);
      var s = this.head_1;
      while (
        offset_0.compareTo_9jj042_k$(toLong((ensureNotNull(s).get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0)) >= 0
      ) {
        offset_0 = offset_0.minus_mfbszm_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
        s = s.get_next_wor1vg_k$();
      }
      while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        var copy = ensureNotNull(s).sharedCopy_timhza_k$();
        copy.set_pos_tfwdvz_k$((copy.get_pos_18iyad_k$() + offset_0.toInt_1tsl84_k$()) | 0);
        // Inline function 'kotlin.comparisons.minOf' call
        var a = (copy.get_pos_18iyad_k$() + byteCount_0.toInt_1tsl84_k$()) | 0;
        var b = copy.get_limit_iuokuq_k$();
        var tmp$ret$1 = Math.min(a, b);
        copy.set_limit_mo5fx2_k$(tmp$ret$1);
        if (out.head_1 == null) {
          copy.set_prev_ur3dkn_k$(copy);
          copy.set_next_tohs5l_k$(copy.get_prev_wosl18_k$());
          out.head_1 = copy.get_next_wor1vg_k$();
        } else {
          ensureNotNull(ensureNotNull(out.head_1).get_prev_wosl18_k$()).push_wd62e0_k$(copy);
        }
        byteCount_0 = byteCount_0.minus_mfbszm_k$(toLong((copy.get_limit_iuokuq_k$() - copy.get_pos_18iyad_k$()) | 0));
        offset_0 = new Long(0, 0);
        s = s.get_next_wor1vg_k$();
      }
      tmp$ret$0 = this;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).copyTo$default_hb4dxn_k$ = function (out, offset, byteCount, $super) {
    offset = offset === VOID ? new Long(0, 0) : offset;
    return $super === VOID
      ? this.copyTo_y7so4c_k$(out, offset, byteCount)
      : $super.copyTo_y7so4c_k$.call(this, out, offset, byteCount);
  };
  protoOf(Buffer).copyTo_cpj8q6_k$ = function (out, offset) {
    return this.copyTo_y7so4c_k$(out, offset, this.size_1.minus_mfbszm_k$(offset));
  };
  protoOf(Buffer).copyTo$default_m5opp7_k$ = function (out, offset, $super) {
    offset = offset === VOID ? new Long(0, 0) : offset;
    return $super === VOID ? this.copyTo_cpj8q6_k$(out, offset) : $super.copyTo_cpj8q6_k$.call(this, out, offset);
  };
  protoOf(Buffer).get_ugtq3c_k$ = function (pos) {
    var tmp$ret$0;
    $l$block_1: {
      // Inline function 'okio.internal.commonGet' call
      checkOffsetAndCount(this.size_1, pos, new Long(1, 0));
      // Inline function 'okio.internal.seek' call
      var tmp0_elvis_lhs = this.head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        var offset = new Long(-1, -1);
        tmp$ret$0 =
          ensureNotNull(null).get_data_wokkxf_k$()[
            numberToLong(null.get_pos_18iyad_k$()).plus_r93sks_k$(pos).minus_mfbszm_k$(offset).toInt_1tsl84_k$()
          ];
        break $l$block_1;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var s = tmp;
      if (this.size_1.minus_mfbszm_k$(pos).compareTo_9jj042_k$(pos) < 0) {
        var offset_0 = this.size_1;
        while (offset_0.compareTo_9jj042_k$(pos) > 0) {
          s = ensureNotNull(s.get_prev_wosl18_k$());
          offset_0 = offset_0.minus_mfbszm_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
        }
        var s_0 = s;
        var offset_1 = offset_0;
        tmp$ret$0 =
          ensureNotNull(s_0).get_data_wokkxf_k$()[
            numberToLong(s_0.get_pos_18iyad_k$()).plus_r93sks_k$(pos).minus_mfbszm_k$(offset_1).toInt_1tsl84_k$()
          ];
        break $l$block_1;
      } else {
        var offset_2 = new Long(0, 0);
        $l$loop: while (true) {
          // Inline function 'kotlin.Long.plus' call
          var this_0 = offset_2;
          var other = (s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0;
          var nextOffset = this_0.plus_r93sks_k$(toLong(other));
          if (nextOffset.compareTo_9jj042_k$(pos) > 0) break $l$loop;
          s = ensureNotNull(s.get_next_wor1vg_k$());
          offset_2 = nextOffset;
        }
        var s_1 = s;
        var offset_3 = offset_2;
        tmp$ret$0 =
          ensureNotNull(s_1).get_data_wokkxf_k$()[
            numberToLong(s_1.get_pos_18iyad_k$()).plus_r93sks_k$(pos).minus_mfbszm_k$(offset_3).toInt_1tsl84_k$()
          ];
        break $l$block_1;
      }
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).completeSegmentByteCount_8y8ucz_k$ = function () {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonCompleteSegmentByteCount' call
      var result = this.size_1;
      if (result.equals(new Long(0, 0))) {
        tmp$ret$0 = new Long(0, 0);
        break $l$block;
      }
      var tail = ensureNotNull(ensureNotNull(this.head_1).get_prev_wosl18_k$());
      if (
        tail.get_limit_iuokuq_k$() < Companion_getInstance_1().get_SIZE_wo97pm_k$() ? tail.get_owner_iwkx3e_k$() : false
      ) {
        result = result.minus_mfbszm_k$(toLong((tail.get_limit_iuokuq_k$() - tail.get_pos_18iyad_k$()) | 0));
      }
      tmp$ret$0 = result;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).readByte_ectjk2_k$ = function () {
    // Inline function 'okio.internal.commonReadByte' call
    if (this.size_1.equals(new Long(0, 0))) throw EOFException_init_$Create$();
    var segment = ensureNotNull(this.head_1);
    var pos = segment.get_pos_18iyad_k$();
    var limit = segment.get_limit_iuokuq_k$();
    var data = segment.get_data_wokkxf_k$();
    var tmp0 = pos;
    pos = (tmp0 + 1) | 0;
    var b = data[tmp0];
    this.size_1 = this.size_1.minus_mfbszm_k$(new Long(1, 0));
    if (pos === limit) {
      this.head_1 = segment.pop_2dsh_k$();
      SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
    } else {
      segment.set_pos_tfwdvz_k$(pos);
    }
    return b;
  };
  protoOf(Buffer).readShort_ilpyey_k$ = function () {
    var tmp$ret$2;
    $l$block: {
      // Inline function 'okio.internal.commonReadShort' call
      if (this.size_1.compareTo_9jj042_k$(new Long(2, 0)) < 0) throw EOFException_init_$Create$();
      var segment = ensureNotNull(this.head_1);
      var pos = segment.get_pos_18iyad_k$();
      var limit = segment.get_limit_iuokuq_k$();
      if (((limit - pos) | 0) < 2) {
        // Inline function 'okio.and' call
        var tmp = (this.readByte_ectjk2_k$() & 255) << 8;
        // Inline function 'okio.and' call
        var s = tmp | (this.readByte_ectjk2_k$() & 255);
        tmp$ret$2 = toShort(s);
        break $l$block;
      }
      var data = segment.get_data_wokkxf_k$();
      // Inline function 'okio.and' call
      var tmp1 = pos;
      pos = (tmp1 + 1) | 0;
      var tmp_0 = (data[tmp1] & 255) << 8;
      // Inline function 'okio.and' call
      var tmp0 = pos;
      pos = (tmp0 + 1) | 0;
      var s_0 = tmp_0 | (data[tmp0] & 255);
      this.size_1 = this.size_1.minus_mfbszm_k$(new Long(2, 0));
      if (pos === limit) {
        this.head_1 = segment.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
      } else {
        segment.set_pos_tfwdvz_k$(pos);
      }
      tmp$ret$2 = toShort(s_0);
    }
    return tmp$ret$2;
  };
  protoOf(Buffer).readInt_hv8cxl_k$ = function () {
    var tmp$ret$4;
    $l$block: {
      // Inline function 'okio.internal.commonReadInt' call
      if (this.size_1.compareTo_9jj042_k$(new Long(4, 0)) < 0) throw EOFException_init_$Create$();
      var segment = ensureNotNull(this.head_1);
      var pos = segment.get_pos_18iyad_k$();
      var limit = segment.get_limit_iuokuq_k$();
      if (toLong((limit - pos) | 0).compareTo_9jj042_k$(new Long(4, 0)) < 0) {
        // Inline function 'okio.and' call
        var tmp = (this.readByte_ectjk2_k$() & 255) << 24;
        // Inline function 'okio.and' call
        var tmp_0 = tmp | ((this.readByte_ectjk2_k$() & 255) << 16);
        // Inline function 'okio.and' call
        var tmp_1 = tmp_0 | ((this.readByte_ectjk2_k$() & 255) << 8);
        // Inline function 'okio.and' call
        tmp$ret$4 = tmp_1 | (this.readByte_ectjk2_k$() & 255);
        break $l$block;
      }
      var data = segment.get_data_wokkxf_k$();
      // Inline function 'okio.and' call
      var tmp3 = pos;
      pos = (tmp3 + 1) | 0;
      var tmp_2 = (data[tmp3] & 255) << 24;
      // Inline function 'okio.and' call
      var tmp2 = pos;
      pos = (tmp2 + 1) | 0;
      var tmp_3 = tmp_2 | ((data[tmp2] & 255) << 16);
      // Inline function 'okio.and' call
      var tmp1 = pos;
      pos = (tmp1 + 1) | 0;
      var tmp_4 = tmp_3 | ((data[tmp1] & 255) << 8);
      // Inline function 'okio.and' call
      var tmp0 = pos;
      pos = (tmp0 + 1) | 0;
      var i = tmp_4 | (data[tmp0] & 255);
      this.size_1 = this.size_1.minus_mfbszm_k$(new Long(4, 0));
      if (pos === limit) {
        this.head_1 = segment.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
      } else {
        segment.set_pos_tfwdvz_k$(pos);
      }
      tmp$ret$4 = i;
    }
    return tmp$ret$4;
  };
  protoOf(Buffer).readLong_ecnd8u_k$ = function () {
    var tmp$ret$2;
    $l$block: {
      // Inline function 'okio.internal.commonReadLong' call
      if (this.size_1.compareTo_9jj042_k$(new Long(8, 0)) < 0) throw EOFException_init_$Create$();
      var segment = ensureNotNull(this.head_1);
      var pos = segment.get_pos_18iyad_k$();
      var limit = segment.get_limit_iuokuq_k$();
      if (toLong((limit - pos) | 0).compareTo_9jj042_k$(new Long(8, 0)) < 0) {
        // Inline function 'okio.and' call
        var this_0 = this.readInt_hv8cxl_k$();
        var other = new Long(-1, 0);
        var tmp = toLong(this_0).and_4spn93_k$(other).shl_bg8if3_k$(32);
        // Inline function 'okio.and' call
        var this_1 = this.readInt_hv8cxl_k$();
        var other_0 = new Long(-1, 0);
        var tmp$ret$1 = toLong(this_1).and_4spn93_k$(other_0);
        tmp$ret$2 = tmp.or_v7fvkl_k$(tmp$ret$1);
        break $l$block;
      }
      var data = segment.get_data_wokkxf_k$();
      // Inline function 'okio.and' call
      var tmp7 = pos;
      pos = (tmp7 + 1) | 0;
      var this_2 = data[tmp7];
      var other_1 = new Long(255, 0);
      var tmp_0 = toLong(this_2).and_4spn93_k$(other_1).shl_bg8if3_k$(56);
      // Inline function 'okio.and' call
      var tmp6 = pos;
      pos = (tmp6 + 1) | 0;
      var this_3 = data[tmp6];
      var other_2 = new Long(255, 0);
      var tmp$ret$4 = toLong(this_3).and_4spn93_k$(other_2);
      var tmp_1 = tmp_0.or_v7fvkl_k$(tmp$ret$4.shl_bg8if3_k$(48));
      // Inline function 'okio.and' call
      var tmp5 = pos;
      pos = (tmp5 + 1) | 0;
      var this_4 = data[tmp5];
      var other_3 = new Long(255, 0);
      var tmp$ret$5 = toLong(this_4).and_4spn93_k$(other_3);
      var tmp_2 = tmp_1.or_v7fvkl_k$(tmp$ret$5.shl_bg8if3_k$(40));
      // Inline function 'okio.and' call
      var tmp4 = pos;
      pos = (tmp4 + 1) | 0;
      var this_5 = data[tmp4];
      var other_4 = new Long(255, 0);
      var tmp$ret$6 = toLong(this_5).and_4spn93_k$(other_4);
      var tmp_3 = tmp_2.or_v7fvkl_k$(tmp$ret$6.shl_bg8if3_k$(32));
      // Inline function 'okio.and' call
      var tmp3 = pos;
      pos = (tmp3 + 1) | 0;
      var this_6 = data[tmp3];
      var other_5 = new Long(255, 0);
      var tmp$ret$7 = toLong(this_6).and_4spn93_k$(other_5);
      var tmp_4 = tmp_3.or_v7fvkl_k$(tmp$ret$7.shl_bg8if3_k$(24));
      // Inline function 'okio.and' call
      var tmp2 = pos;
      pos = (tmp2 + 1) | 0;
      var this_7 = data[tmp2];
      var other_6 = new Long(255, 0);
      var tmp$ret$8 = toLong(this_7).and_4spn93_k$(other_6);
      var tmp_5 = tmp_4.or_v7fvkl_k$(tmp$ret$8.shl_bg8if3_k$(16));
      // Inline function 'okio.and' call
      var tmp1 = pos;
      pos = (tmp1 + 1) | 0;
      var this_8 = data[tmp1];
      var other_7 = new Long(255, 0);
      var tmp$ret$9 = toLong(this_8).and_4spn93_k$(other_7);
      var tmp_6 = tmp_5.or_v7fvkl_k$(tmp$ret$9.shl_bg8if3_k$(8));
      // Inline function 'okio.and' call
      var tmp0 = pos;
      pos = (tmp0 + 1) | 0;
      var this_9 = data[tmp0];
      var other_8 = new Long(255, 0);
      var tmp$ret$10 = toLong(this_9).and_4spn93_k$(other_8);
      var v = tmp_6.or_v7fvkl_k$(tmp$ret$10);
      this.size_1 = this.size_1.minus_mfbszm_k$(new Long(8, 0));
      if (pos === limit) {
        this.head_1 = segment.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
      } else {
        segment.set_pos_tfwdvz_k$(pos);
      }
      tmp$ret$2 = v;
    }
    return tmp$ret$2;
  };
  protoOf(Buffer).readShortLe_lyi6qn_k$ = function () {
    return reverseBytes(this.readShort_ilpyey_k$());
  };
  protoOf(Buffer).readIntLe_ir3zn2_k$ = function () {
    return reverseBytes_0(this.readInt_hv8cxl_k$());
  };
  protoOf(Buffer).readLongLe_bnxvp1_k$ = function () {
    return reverseBytes_1(this.readLong_ecnd8u_k$());
  };
  protoOf(Buffer).readDecimalLong_uefo5l_k$ = function () {
    // Inline function 'okio.internal.commonReadDecimalLong' call
    if (this.size_1.equals(new Long(0, 0))) throw EOFException_init_$Create$();
    var value = new Long(0, 0);
    var seen = 0;
    var negative = false;
    var done = false;
    var overflowDigit = get_OVERFLOW_DIGIT_START();
    do {
      var segment = ensureNotNull(this.head_1);
      var data = segment.get_data_wokkxf_k$();
      var pos = segment.get_pos_18iyad_k$();
      var limit = segment.get_limit_iuokuq_k$();
      $l$loop: while (pos < limit) {
        var b = data[pos];
        if (b >= 48 ? b <= 57 : false) {
          var digit = 48 - b;
          if (
            value.compareTo_9jj042_k$(get_OVERFLOW_ZONE()) < 0
              ? true
              : value.equals(get_OVERFLOW_ZONE())
                ? toLong(digit).compareTo_9jj042_k$(overflowDigit) < 0
                : false
          ) {
            var buffer = new Buffer().writeDecimalLong_3t8cww_k$(value).writeByte_3m2t4h_k$(b);
            if (!negative) {
              buffer.readByte_ectjk2_k$();
            }
            throw NumberFormatException_init_$Create$('Number too large: ' + buffer.readUtf8_echivt_k$());
          }
          value = value.times_nfzjiw_k$(new Long(10, 0));
          value = value.plus_r93sks_k$(toLong(digit));
        } else if (b === 45 ? seen === 0 : false) {
          negative = true;
          // Inline function 'kotlin.Long.minus' call
          overflowDigit = overflowDigit.minus_mfbszm_k$(toLong(1));
        } else {
          done = true;
          break $l$loop;
        }
        pos = (pos + 1) | 0;
        seen = (seen + 1) | 0;
      }
      if (pos === limit) {
        this.head_1 = segment.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
      } else {
        segment.set_pos_tfwdvz_k$(pos);
      }
    } while (!done ? !(this.head_1 == null) : false);
    this.size_1 = this.size_1.minus_mfbszm_k$(toLong(seen));
    var minimumSeen = negative ? 2 : 1;
    if (seen < minimumSeen) {
      if (this.size_1.equals(new Long(0, 0))) throw EOFException_init_$Create$();
      var expected = negative ? 'Expected a digit' : "Expected a digit or '-'";
      throw NumberFormatException_init_$Create$(
        expected + ' but was 0x' + toHexString(this.get_ugtq3c_k$(new Long(0, 0))),
      );
    }
    return negative ? value : value.unaryMinus_6uz0qp_k$();
  };
  protoOf(Buffer).readHexadecimalUnsignedLong_gqibbu_k$ = function () {
    // Inline function 'okio.internal.commonReadHexadecimalUnsignedLong' call
    if (this.size_1.equals(new Long(0, 0))) throw EOFException_init_$Create$();
    var value = new Long(0, 0);
    var seen = 0;
    var done = false;
    do {
      var segment = ensureNotNull(this.head_1);
      var data = segment.get_data_wokkxf_k$();
      var pos = segment.get_pos_18iyad_k$();
      var limit = segment.get_limit_iuokuq_k$();
      $l$loop: while (pos < limit) {
        var digit;
        var b = data[pos];
        if (b >= 48 ? b <= 57 : false) {
          digit = b - 48;
        } else if (b >= 97 ? b <= 102 : false) {
          digit = (b - 97 + 10) | 0;
        } else if (b >= 65 ? b <= 70 : false) {
          digit = (b - 65 + 10) | 0;
        } else {
          if (seen === 0) {
            throw NumberFormatException_init_$Create$(
              'Expected leading [0-9a-fA-F] character but was 0x' + toHexString(b),
            );
          }
          done = true;
          break $l$loop;
        }
        if (!value.and_4spn93_k$(new Long(0, -268435456)).equals(new Long(0, 0))) {
          var buffer = new Buffer().writeHexadecimalUnsignedLong_x2e47l_k$(value).writeByte_3m2t4h_k$(b);
          throw NumberFormatException_init_$Create$('Number too large: ' + buffer.readUtf8_echivt_k$());
        }
        value = value.shl_bg8if3_k$(4);
        value = value.or_v7fvkl_k$(toLong(digit));
        pos = (pos + 1) | 0;
        seen = (seen + 1) | 0;
      }
      if (pos === limit) {
        this.head_1 = segment.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(segment);
      } else {
        segment.set_pos_tfwdvz_k$(pos);
      }
    } while (!done ? !(this.head_1 == null) : false);
    this.size_1 = this.size_1.minus_mfbszm_k$(toLong(seen));
    return value;
  };
  protoOf(Buffer).readByteString_nzt46n_k$ = function () {
    // Inline function 'okio.internal.commonReadByteString' call
    return this.readByteString_b9sk0v_k$(this.size_1);
  };
  protoOf(Buffer).readByteString_b9sk0v_k$ = function (byteCount) {
    var tmp$ret$2;
    $l$block_0: {
      // Inline function 'okio.internal.commonReadByteString' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (
        !(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0
          ? byteCount.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0
          : false)
      ) {
        // Inline function 'okio.internal.commonReadByteString.<anonymous>' call
        var message = 'byteCount: ' + byteCount.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      if (this.size_1.compareTo_9jj042_k$(byteCount) < 0) throw EOFException_init_$Create$();
      if (byteCount.compareTo_9jj042_k$(toLong(get_SEGMENTING_THRESHOLD())) >= 0) {
        // Inline function 'kotlin.also' call
        var this_0 = this.snapshot_hwfoq4_k$(byteCount.toInt_1tsl84_k$());
        // Inline function 'kotlin.contracts.contract' call
        // Inline function 'okio.internal.commonReadByteString.<anonymous>' call
        this.skip_bgd4sf_k$(byteCount);
        tmp$ret$2 = this_0;
        break $l$block_0;
      } else {
        tmp$ret$2 = new ByteString(this.readByteArray_176419_k$(byteCount));
        break $l$block_0;
      }
    }
    return tmp$ret$2;
  };
  protoOf(Buffer).readFully_8s2k72_k$ = function (sink, byteCount) {
    if (this.size_1.compareTo_9jj042_k$(byteCount) < 0) {
      sink.write_f49az7_k$(this, this.size_1);
      throw EOFException_init_$Create$();
    }
    sink.write_f49az7_k$(this, byteCount);
    return Unit_getInstance();
  };
  protoOf(Buffer).readAll_mirvr1_k$ = function (sink) {
    // Inline function 'okio.internal.commonReadAll' call
    var byteCount = this.size_1;
    if (byteCount.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      sink.write_f49az7_k$(this, byteCount);
    }
    return byteCount;
  };
  protoOf(Buffer).readUtf8_echivt_k$ = function () {
    return this.readUtf8_pe0fc7_k$(this.size_1);
  };
  protoOf(Buffer).readUtf8_pe0fc7_k$ = function (byteCount) {
    var tmp$ret$1;
    $l$block_0: {
      // Inline function 'okio.internal.commonReadUtf8' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (
        !(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0
          ? byteCount.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0
          : false)
      ) {
        // Inline function 'okio.internal.commonReadUtf8.<anonymous>' call
        var message = 'byteCount: ' + byteCount.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      if (this.size_1.compareTo_9jj042_k$(byteCount) < 0) throw EOFException_init_$Create$();
      if (byteCount.equals(new Long(0, 0))) {
        tmp$ret$1 = '';
        break $l$block_0;
      }
      var s = ensureNotNull(this.head_1);
      if (
        numberToLong(s.get_pos_18iyad_k$())
          .plus_r93sks_k$(byteCount)
          .compareTo_9jj042_k$(toLong(s.get_limit_iuokuq_k$())) > 0
      ) {
        tmp$ret$1 = commonToUtf8String(this.readByteArray_176419_k$(byteCount));
        break $l$block_0;
      }
      var result = commonToUtf8String(
        s.get_data_wokkxf_k$(),
        s.get_pos_18iyad_k$(),
        (s.get_pos_18iyad_k$() + byteCount.toInt_1tsl84_k$()) | 0,
      );
      s.set_pos_tfwdvz_k$((s.get_pos_18iyad_k$() + byteCount.toInt_1tsl84_k$()) | 0);
      this.size_1 = this.size_1.minus_mfbszm_k$(byteCount);
      if (s.get_pos_18iyad_k$() === s.get_limit_iuokuq_k$()) {
        this.head_1 = s.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(s);
      }
      tmp$ret$1 = result;
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).readUtf8Line_e2s5l1_k$ = function () {
    // Inline function 'okio.internal.commonReadUtf8Line' call
    var newline = this.indexOf_ji4kj3_k$(10);
    return !newline.equals(new Long(-1, -1))
      ? readUtf8Line(this, newline)
      : !this.size_1.equals(new Long(0, 0))
        ? this.readUtf8_pe0fc7_k$(this.size_1)
        : null;
  };
  protoOf(Buffer).readUtf8LineStrict_40ilic_k$ = function () {
    return this.readUtf8LineStrict_6h4kc6_k$(Companion_getInstance().get_MAX_VALUE_54a9lf_k$());
  };
  protoOf(Buffer).readUtf8LineStrict_6h4kc6_k$ = function (limit) {
    var tmp$ret$1;
    $l$block_0: {
      // Inline function 'okio.internal.commonReadUtf8LineStrict' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(limit.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonReadUtf8LineStrict.<anonymous>' call
        var message = 'limit < 0: ' + limit.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      var scanLength = limit.equals(Companion_getInstance().get_MAX_VALUE_54a9lf_k$())
        ? Companion_getInstance().get_MAX_VALUE_54a9lf_k$()
        : limit.plus_r93sks_k$(new Long(1, 0));
      var newline = this.indexOf_nnf9xt_k$(10, new Long(0, 0), scanLength);
      if (!newline.equals(new Long(-1, -1))) {
        tmp$ret$1 = readUtf8Line(this, newline);
        break $l$block_0;
      }
      var tmp;
      var tmp_0;
      if (scanLength.compareTo_9jj042_k$(this.size_1) < 0) {
        // Inline function 'kotlin.Long.minus' call
        var tmp$ret$2 = scanLength.minus_mfbszm_k$(toLong(1));
        tmp_0 = this.get_ugtq3c_k$(tmp$ret$2) === 13;
      } else {
        tmp_0 = false;
      }
      if (tmp_0) {
        tmp = this.get_ugtq3c_k$(scanLength) === 10;
      } else {
        tmp = false;
      }
      if (tmp) {
        tmp$ret$1 = readUtf8Line(this, scanLength);
        break $l$block_0;
      }
      var data = new Buffer();
      var tmp_1 = new Long(0, 0);
      // Inline function 'okio.minOf' call
      var b = this.size_1;
      // Inline function 'kotlin.comparisons.minOf' call
      var a = toLong(32);
      var tmp$ret$4 = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
      this.copyTo_y7so4c_k$(data, tmp_1, tmp$ret$4);
      // Inline function 'kotlin.comparisons.minOf' call
      var a_0 = this.size_1;
      var tmp$ret$5 = a_0.compareTo_9jj042_k$(limit) <= 0 ? a_0 : limit;
      throw new EOFException(
        '\\n not found: limit=' +
          tmp$ret$5.toString() +
          ' content=' +
          data.readByteString_nzt46n_k$().hex_27mj_k$() +
          '\u2026',
      );
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).readUtf8CodePoint_brmg90_k$ = function () {
    var tmp$ret$8;
    $l$block_0: {
      // Inline function 'okio.internal.commonReadUtf8CodePoint' call
      if (this.size_1.equals(new Long(0, 0))) throw EOFException_init_$Create$();
      var b0 = this.get_ugtq3c_k$(new Long(0, 0));
      var codePoint;
      var byteCount;
      var min;
      // Inline function 'okio.and' call
      if ((b0 & 128) === 0) {
        // Inline function 'okio.and' call
        codePoint = b0 & 127;
        byteCount = 1;
        min = 0;
      } else {
        // Inline function 'okio.and' call
        if ((b0 & 224) === 192) {
          // Inline function 'okio.and' call
          codePoint = b0 & 31;
          byteCount = 2;
          min = 128;
        } else {
          // Inline function 'okio.and' call
          if ((b0 & 240) === 224) {
            // Inline function 'okio.and' call
            codePoint = b0 & 15;
            byteCount = 3;
            min = 2048;
          } else {
            // Inline function 'okio.and' call
            if ((b0 & 248) === 240) {
              // Inline function 'okio.and' call
              codePoint = b0 & 7;
              byteCount = 4;
              min = 65536;
            } else {
              this.skip_bgd4sf_k$(new Long(1, 0));
              tmp$ret$8 = get_REPLACEMENT_CODE_POINT();
              break $l$block_0;
            }
          }
        }
      }
      if (this.size_1.compareTo_9jj042_k$(toLong(byteCount)) < 0) {
        throw new EOFException(
          'size < ' +
            byteCount +
            ': ' +
            this.size_1.toString() +
            ' (to read code point prefixed 0x' +
            toHexString(b0) +
            ')',
        );
      }
      var inductionVariable = 1;
      if (inductionVariable < byteCount)
        do {
          var i = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          var b = this.get_ugtq3c_k$(toLong(i));
          // Inline function 'okio.and' call
          if ((b & 192) === 128) {
            codePoint = codePoint << 6;
            var tmp = codePoint;
            // Inline function 'okio.and' call
            codePoint = tmp | (b & 63);
          } else {
            this.skip_bgd4sf_k$(toLong(i));
            tmp$ret$8 = get_REPLACEMENT_CODE_POINT();
            break $l$block_0;
          }
        } while (inductionVariable < byteCount);
      this.skip_bgd4sf_k$(toLong(byteCount));
      var tmp_0;
      if (codePoint > 1114111) {
        tmp_0 = get_REPLACEMENT_CODE_POINT();
      } else if (55296 <= codePoint ? codePoint <= 57343 : false) {
        tmp_0 = get_REPLACEMENT_CODE_POINT();
      } else if (codePoint < min) {
        tmp_0 = get_REPLACEMENT_CODE_POINT();
      } else {
        tmp_0 = codePoint;
      }
      tmp$ret$8 = tmp_0;
    }
    return tmp$ret$8;
  };
  protoOf(Buffer).select_91a7t_k$ = function (options) {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonSelect' call
      var index = selectPrefix(this, options);
      if (index === -1) {
        tmp$ret$0 = -1;
        break $l$block;
      }
      var selectedSize = options.get_byteStrings_g0wbnz_k$()[index].get_size_woubt6_k$();
      this.skip_bgd4sf_k$(toLong(selectedSize));
      tmp$ret$0 = index;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).select_4klarg_k$ = function (options) {
    // Inline function 'okio.internal.commonSelect' call
    var index = this.select_91a7t_k$(options.get_options_jecmyz_k$());
    return index === -1 ? null : options.get_c1px32_k$(index);
  };
  protoOf(Buffer).readByteArray_52wnjv_k$ = function () {
    // Inline function 'okio.internal.commonReadByteArray' call
    return this.readByteArray_176419_k$(this.size_1);
  };
  protoOf(Buffer).readByteArray_176419_k$ = function (byteCount) {
    // Inline function 'okio.internal.commonReadByteArray' call
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (
      !(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0
        ? byteCount.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0
        : false)
    ) {
      // Inline function 'okio.internal.commonReadByteArray.<anonymous>' call
      var message = 'byteCount: ' + byteCount.toString();
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    if (this.size_1.compareTo_9jj042_k$(byteCount) < 0) throw EOFException_init_$Create$();
    var result = new Int8Array(byteCount.toInt_1tsl84_k$());
    this.readFully_qophy4_k$(result);
    return result;
  };
  protoOf(Buffer).read_iv1lrq_k$ = function (sink) {
    // Inline function 'okio.internal.commonRead' call
    return this.read_7zpyie_k$(sink, 0, sink.length);
  };
  protoOf(Buffer).readFully_qophy4_k$ = function (sink) {
    var offset = 0;
    while (offset < sink.length) {
      var read = this.read_7zpyie_k$(sink, offset, (sink.length - offset) | 0);
      if (read === -1) throw EOFException_init_$Create$();
      offset = (offset + read) | 0;
    }
    return Unit_getInstance();
  };
  protoOf(Buffer).read_7zpyie_k$ = function (sink, offset, byteCount) {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonRead' call
      checkOffsetAndCount(toLong(sink.length), toLong(offset), toLong(byteCount));
      var tmp0_elvis_lhs = this.head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        tmp$ret$0 = -1;
        break $l$block;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var s = tmp;
      // Inline function 'kotlin.comparisons.minOf' call
      var b = (s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0;
      var toCopy = Math.min(byteCount, b);
      // Inline function 'kotlin.collections.copyInto' call
      var this_0 = s.get_data_wokkxf_k$();
      var startIndex = s.get_pos_18iyad_k$();
      var endIndex = (s.get_pos_18iyad_k$() + toCopy) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp_0 = this_0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp_0, sink, offset, startIndex, endIndex);
      s.set_pos_tfwdvz_k$((s.get_pos_18iyad_k$() + toCopy) | 0);
      this.size_1 = this.size_1.minus_mfbszm_k$(toLong(toCopy));
      if (s.get_pos_18iyad_k$() === s.get_limit_iuokuq_k$()) {
        this.head_1 = s.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(s);
      }
      tmp$ret$0 = toCopy;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).clear_j9egeb_k$ = function () {
    // Inline function 'okio.internal.commonClear' call
    this.skip_bgd4sf_k$(this.size_1);
    return Unit_getInstance();
  };
  protoOf(Buffer).skip_bgd4sf_k$ = function (byteCount) {
    var byteCount_0 = byteCount;
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      var tmp0_elvis_lhs = this.head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        throw EOFException_init_$Create$();
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var head = tmp;
      // Inline function 'okio.minOf' call
      var a = byteCount_0;
      var b = (head.get_limit_iuokuq_k$() - head.get_pos_18iyad_k$()) | 0;
      // Inline function 'kotlin.comparisons.minOf' call
      var b_0 = toLong(b);
      var toSkip = (a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0).toInt_1tsl84_k$();
      this.size_1 = this.size_1.minus_mfbszm_k$(toLong(toSkip));
      byteCount_0 = byteCount_0.minus_mfbszm_k$(toLong(toSkip));
      head.set_pos_tfwdvz_k$((head.get_pos_18iyad_k$() + toSkip) | 0);
      if (head.get_pos_18iyad_k$() === head.get_limit_iuokuq_k$()) {
        this.head_1 = head.pop_2dsh_k$();
        SegmentPool_getInstance().recycle_ipeoxr_k$(head);
      }
    }
    return Unit_getInstance();
  };
  protoOf(Buffer).write_f9cjbq_k$ = function (byteString) {
    // Inline function 'okio.internal.commonWrite' call
    var byteCount = byteString.get_size_woubt6_k$();
    byteString.write_7y2kpx_k$(this, 0, byteCount);
    return this;
  };
  protoOf(Buffer).write_1oosdm_k$ = function (byteString, offset, byteCount) {
    // Inline function 'okio.internal.commonWrite' call
    byteString.write_7y2kpx_k$(this, offset, byteCount);
    return this;
  };
  protoOf(Buffer).writableSegment_i90lmt_k$ = function (minimumCapacity) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'okio.internal.commonWritableSegment' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(minimumCapacity >= 1 ? minimumCapacity <= Companion_getInstance_1().get_SIZE_wo97pm_k$() : false)) {
        // Inline function 'okio.internal.commonWritableSegment.<anonymous>' call
        var message = 'unexpected capacity';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      if (this.head_1 == null) {
        var result = SegmentPool_getInstance().take_2451j_k$();
        this.head_1 = result;
        result.set_prev_ur3dkn_k$(result);
        result.set_next_tohs5l_k$(result);
        tmp$ret$1 = result;
        break $l$block;
      }
      var tail = ensureNotNull(this.head_1).get_prev_wosl18_k$();
      if (
        ((ensureNotNull(tail).get_limit_iuokuq_k$() + minimumCapacity) | 0) >
        Companion_getInstance_1().get_SIZE_wo97pm_k$()
          ? true
          : !tail.get_owner_iwkx3e_k$()
      ) {
        tail = tail.push_wd62e0_k$(SegmentPool_getInstance().take_2451j_k$());
      }
      tmp$ret$1 = tail;
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).writeUtf8_9rv3au_k$ = function (string) {
    return this.writeUtf8_sgs1di_k$(string, 0, string.length);
  };
  protoOf(Buffer).writeUtf8_sgs1di_k$ = function (string, beginIndex, endIndex) {
    // Inline function 'okio.internal.commonWriteUtf8' call
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(beginIndex >= 0)) {
      // Inline function 'okio.internal.commonWriteUtf8.<anonymous>' call
      var message = 'beginIndex < 0: ' + beginIndex;
      throw IllegalArgumentException_init_$Create$(toString(message));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(endIndex >= beginIndex)) {
      // Inline function 'okio.internal.commonWriteUtf8.<anonymous>' call
      var message_0 = 'endIndex < beginIndex: ' + endIndex + ' < ' + beginIndex;
      throw IllegalArgumentException_init_$Create$(toString(message_0));
    }
    // Inline function 'kotlin.require' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(endIndex <= string.length)) {
      // Inline function 'okio.internal.commonWriteUtf8.<anonymous>' call
      var message_1 = 'endIndex > string.length: ' + endIndex + ' > ' + string.length;
      throw IllegalArgumentException_init_$Create$(toString(message_1));
    }
    var i = beginIndex;
    while (i < endIndex) {
      // Inline function 'kotlin.code' call
      var this_0 = charSequenceGet(string, i);
      var c = Char__toInt_impl_vasixd(this_0);
      if (c < 128) {
        var tail = this.writableSegment_i90lmt_k$(1);
        var data = tail.get_data_wokkxf_k$();
        var segmentOffset = (tail.get_limit_iuokuq_k$() - i) | 0;
        // Inline function 'kotlin.comparisons.minOf' call
        var b = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - segmentOffset) | 0;
        var runLimit = Math.min(endIndex, b);
        var tmp0 = i;
        i = (tmp0 + 1) | 0;
        data[(segmentOffset + tmp0) | 0] = toByte(c);
        $l$loop: while (i < runLimit) {
          // Inline function 'kotlin.code' call
          var this_1 = charSequenceGet(string, i);
          c = Char__toInt_impl_vasixd(this_1);
          if (c >= 128) break $l$loop;
          var tmp1 = i;
          i = (tmp1 + 1) | 0;
          data[(segmentOffset + tmp1) | 0] = toByte(c);
        }
        var runSize = (((i + segmentOffset) | 0) - tail.get_limit_iuokuq_k$()) | 0;
        tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + runSize) | 0);
        this.size_1 = this.size_1.plus_r93sks_k$(toLong(runSize));
      } else if (c < 2048) {
        var tail_0 = this.writableSegment_i90lmt_k$(2);
        tail_0.get_data_wokkxf_k$()[tail_0.get_limit_iuokuq_k$()] = toByte((c >> 6) | 192);
        tail_0.get_data_wokkxf_k$()[(tail_0.get_limit_iuokuq_k$() + 1) | 0] = toByte((c & 63) | 128);
        tail_0.set_limit_mo5fx2_k$((tail_0.get_limit_iuokuq_k$() + 2) | 0);
        this.size_1 = this.size_1.plus_r93sks_k$(new Long(2, 0));
        i = (i + 1) | 0;
      } else if (c < 55296 ? true : c > 57343) {
        var tail_1 = this.writableSegment_i90lmt_k$(3);
        tail_1.get_data_wokkxf_k$()[tail_1.get_limit_iuokuq_k$()] = toByte((c >> 12) | 224);
        tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 1) | 0] = toByte(((c >> 6) & 63) | 128);
        tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 2) | 0] = toByte((c & 63) | 128);
        tail_1.set_limit_mo5fx2_k$((tail_1.get_limit_iuokuq_k$() + 3) | 0);
        this.size_1 = this.size_1.plus_r93sks_k$(new Long(3, 0));
        i = (i + 1) | 0;
      } else {
        var tmp;
        if (((i + 1) | 0) < endIndex) {
          // Inline function 'kotlin.code' call
          var this_2 = charSequenceGet(string, (i + 1) | 0);
          tmp = Char__toInt_impl_vasixd(this_2);
        } else {
          tmp = 0;
        }
        var low = tmp;
        if (c > 56319 ? true : !(56320 <= low ? low <= 57343 : false)) {
          // Inline function 'kotlin.code' call
          var this_3 = _Char___init__impl__6a9atx(63);
          var tmp$ret$7 = Char__toInt_impl_vasixd(this_3);
          this.writeByte_3m2t4h_k$(tmp$ret$7);
          i = (i + 1) | 0;
        } else {
          var codePoint = (65536 + (((c & 1023) << 10) | (low & 1023))) | 0;
          var tail_2 = this.writableSegment_i90lmt_k$(4);
          tail_2.get_data_wokkxf_k$()[tail_2.get_limit_iuokuq_k$()] = toByte((codePoint >> 18) | 240);
          tail_2.get_data_wokkxf_k$()[(tail_2.get_limit_iuokuq_k$() + 1) | 0] = toByte(((codePoint >> 12) & 63) | 128);
          tail_2.get_data_wokkxf_k$()[(tail_2.get_limit_iuokuq_k$() + 2) | 0] = toByte(((codePoint >> 6) & 63) | 128);
          tail_2.get_data_wokkxf_k$()[(tail_2.get_limit_iuokuq_k$() + 3) | 0] = toByte((codePoint & 63) | 128);
          tail_2.set_limit_mo5fx2_k$((tail_2.get_limit_iuokuq_k$() + 4) | 0);
          this.size_1 = this.size_1.plus_r93sks_k$(new Long(4, 0));
          i = (i + 2) | 0;
        }
      }
    }
    return this;
  };
  protoOf(Buffer).writeUtf8CodePoint_4mbg4l_k$ = function (codePoint) {
    // Inline function 'okio.internal.commonWriteUtf8CodePoint' call
    if (codePoint < 128) {
      this.writeByte_3m2t4h_k$(codePoint);
    } else if (codePoint < 2048) {
      var tail = this.writableSegment_i90lmt_k$(2);
      tail.get_data_wokkxf_k$()[tail.get_limit_iuokuq_k$()] = toByte((codePoint >> 6) | 192);
      tail.get_data_wokkxf_k$()[(tail.get_limit_iuokuq_k$() + 1) | 0] = toByte((codePoint & 63) | 128);
      tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + 2) | 0);
      this.size_1 = this.size_1.plus_r93sks_k$(new Long(2, 0));
    } else if (55296 <= codePoint ? codePoint <= 57343 : false) {
      // Inline function 'kotlin.code' call
      var this_0 = _Char___init__impl__6a9atx(63);
      var tmp$ret$0 = Char__toInt_impl_vasixd(this_0);
      this.writeByte_3m2t4h_k$(tmp$ret$0);
    } else if (codePoint < 65536) {
      var tail_0 = this.writableSegment_i90lmt_k$(3);
      tail_0.get_data_wokkxf_k$()[tail_0.get_limit_iuokuq_k$()] = toByte((codePoint >> 12) | 224);
      tail_0.get_data_wokkxf_k$()[(tail_0.get_limit_iuokuq_k$() + 1) | 0] = toByte(((codePoint >> 6) & 63) | 128);
      tail_0.get_data_wokkxf_k$()[(tail_0.get_limit_iuokuq_k$() + 2) | 0] = toByte((codePoint & 63) | 128);
      tail_0.set_limit_mo5fx2_k$((tail_0.get_limit_iuokuq_k$() + 3) | 0);
      this.size_1 = this.size_1.plus_r93sks_k$(new Long(3, 0));
    } else if (codePoint <= 1114111) {
      var tail_1 = this.writableSegment_i90lmt_k$(4);
      tail_1.get_data_wokkxf_k$()[tail_1.get_limit_iuokuq_k$()] = toByte((codePoint >> 18) | 240);
      tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 1) | 0] = toByte(((codePoint >> 12) & 63) | 128);
      tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 2) | 0] = toByte(((codePoint >> 6) & 63) | 128);
      tail_1.get_data_wokkxf_k$()[(tail_1.get_limit_iuokuq_k$() + 3) | 0] = toByte((codePoint & 63) | 128);
      tail_1.set_limit_mo5fx2_k$((tail_1.get_limit_iuokuq_k$() + 4) | 0);
      this.size_1 = this.size_1.plus_r93sks_k$(new Long(4, 0));
    } else {
      throw IllegalArgumentException_init_$Create$('Unexpected code point: 0x' + toHexString_0(codePoint));
    }
    return this;
  };
  protoOf(Buffer).write_ldf0ov_k$ = function (source) {
    // Inline function 'okio.internal.commonWrite' call
    return this.write_owzzlt_k$(source, 0, source.length);
  };
  protoOf(Buffer).write_owzzlt_k$ = function (source, offset, byteCount) {
    // Inline function 'okio.internal.commonWrite' call
    var offset_0 = offset;
    checkOffsetAndCount(toLong(source.length), toLong(offset_0), toLong(byteCount));
    var limit = (offset_0 + byteCount) | 0;
    while (offset_0 < limit) {
      var tail = this.writableSegment_i90lmt_k$(1);
      // Inline function 'kotlin.comparisons.minOf' call
      var a = (limit - offset_0) | 0;
      var b = (Companion_getInstance_1().get_SIZE_wo97pm_k$() - tail.get_limit_iuokuq_k$()) | 0;
      var toCopy = Math.min(a, b);
      // Inline function 'kotlin.collections.copyInto' call
      var destination = tail.get_data_wokkxf_k$();
      var destinationOffset = tail.get_limit_iuokuq_k$();
      var startIndex = offset_0;
      var endIndex = (offset_0 + toCopy) | 0;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      var tmp = source;
      // Inline function 'kotlin.js.unsafeCast' call
      // Inline function 'kotlin.js.asDynamic' call
      arrayCopy(tmp, destination, destinationOffset, startIndex, endIndex);
      offset_0 = (offset_0 + toCopy) | 0;
      tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + toCopy) | 0);
    }
    this.size_1 = this.size_1.plus_r93sks_k$(toLong(byteCount));
    return this;
  };
  protoOf(Buffer).writeAll_goqmgy_k$ = function (source) {
    // Inline function 'okio.internal.commonWriteAll' call
    var totalBytesRead = new Long(0, 0);
    $l$loop: while (true) {
      var readCount = source.read_a1wdbo_k$(this, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()));
      if (readCount.equals(new Long(-1, -1))) break $l$loop;
      totalBytesRead = totalBytesRead.plus_r93sks_k$(readCount);
    }
    return totalBytesRead;
  };
  protoOf(Buffer).write_nfw0z7_k$ = function (source, byteCount) {
    // Inline function 'okio.internal.commonWrite' call
    var byteCount_0 = byteCount;
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      var read = source.read_a1wdbo_k$(this, byteCount_0);
      if (read.equals(new Long(-1, -1))) throw EOFException_init_$Create$();
      byteCount_0 = byteCount_0.minus_mfbszm_k$(read);
    }
    return this;
  };
  protoOf(Buffer).writeByte_3m2t4h_k$ = function (b) {
    // Inline function 'okio.internal.commonWriteByte' call
    var tail = this.writableSegment_i90lmt_k$(1);
    var tmp = tail.get_data_wokkxf_k$();
    var tmp1 = tail.get_limit_iuokuq_k$();
    tail.set_limit_mo5fx2_k$((tmp1 + 1) | 0);
    tmp[tmp1] = toByte(b);
    this.size_1 = this.size_1.plus_r93sks_k$(new Long(1, 0));
    return this;
  };
  protoOf(Buffer).writeShort_4m7m05_k$ = function (s) {
    // Inline function 'okio.internal.commonWriteShort' call
    var tail = this.writableSegment_i90lmt_k$(2);
    var data = tail.get_data_wokkxf_k$();
    var limit = tail.get_limit_iuokuq_k$();
    var tmp0 = limit;
    limit = (tmp0 + 1) | 0;
    data[tmp0] = toByte(((s >>> 8) | 0) & 255);
    var tmp1 = limit;
    limit = (tmp1 + 1) | 0;
    data[tmp1] = toByte(s & 255);
    tail.set_limit_mo5fx2_k$(limit);
    this.size_1 = this.size_1.plus_r93sks_k$(new Long(2, 0));
    return this;
  };
  protoOf(Buffer).writeShortLe_er39um_k$ = function (s) {
    return this.writeShort_4m7m05_k$(reverseBytes(toShort(s)));
  };
  protoOf(Buffer).writeInt_nsyxiw_k$ = function (i) {
    // Inline function 'okio.internal.commonWriteInt' call
    var tail = this.writableSegment_i90lmt_k$(4);
    var data = tail.get_data_wokkxf_k$();
    var limit = tail.get_limit_iuokuq_k$();
    var tmp0 = limit;
    limit = (tmp0 + 1) | 0;
    data[tmp0] = toByte(((i >>> 24) | 0) & 255);
    var tmp1 = limit;
    limit = (tmp1 + 1) | 0;
    data[tmp1] = toByte(((i >>> 16) | 0) & 255);
    var tmp2 = limit;
    limit = (tmp2 + 1) | 0;
    data[tmp2] = toByte(((i >>> 8) | 0) & 255);
    var tmp3 = limit;
    limit = (tmp3 + 1) | 0;
    data[tmp3] = toByte(i & 255);
    tail.set_limit_mo5fx2_k$(limit);
    this.size_1 = this.size_1.plus_r93sks_k$(new Long(4, 0));
    return this;
  };
  protoOf(Buffer).writeIntLe_duwg7j_k$ = function (i) {
    return this.writeInt_nsyxiw_k$(reverseBytes_0(i));
  };
  protoOf(Buffer).writeLong_4zwjf7_k$ = function (v) {
    // Inline function 'okio.internal.commonWriteLong' call
    var tail = this.writableSegment_i90lmt_k$(8);
    var data = tail.get_data_wokkxf_k$();
    var limit = tail.get_limit_iuokuq_k$();
    var tmp0 = limit;
    limit = (tmp0 + 1) | 0;
    data[tmp0] = v.ushr_z7nmq8_k$(56).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp1 = limit;
    limit = (tmp1 + 1) | 0;
    data[tmp1] = v.ushr_z7nmq8_k$(48).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp2 = limit;
    limit = (tmp2 + 1) | 0;
    data[tmp2] = v.ushr_z7nmq8_k$(40).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp3 = limit;
    limit = (tmp3 + 1) | 0;
    data[tmp3] = v.ushr_z7nmq8_k$(32).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp4 = limit;
    limit = (tmp4 + 1) | 0;
    data[tmp4] = v.ushr_z7nmq8_k$(24).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp5 = limit;
    limit = (tmp5 + 1) | 0;
    data[tmp5] = v.ushr_z7nmq8_k$(16).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp6 = limit;
    limit = (tmp6 + 1) | 0;
    data[tmp6] = v.ushr_z7nmq8_k$(8).and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    var tmp7 = limit;
    limit = (tmp7 + 1) | 0;
    data[tmp7] = v.and_4spn93_k$(new Long(255, 0)).toByte_edm0nx_k$();
    tail.set_limit_mo5fx2_k$(limit);
    this.size_1 = this.size_1.plus_r93sks_k$(new Long(8, 0));
    return this;
  };
  protoOf(Buffer).writeLongLe_wsnjx6_k$ = function (v) {
    return this.writeLong_4zwjf7_k$(reverseBytes_1(v));
  };
  protoOf(Buffer).writeDecimalLong_3t8cww_k$ = function (v) {
    var tmp$ret$1;
    $l$block_0: {
      // Inline function 'okio.internal.commonWriteDecimalLong' call
      var v_0 = v;
      if (v_0.equals(new Long(0, 0))) {
        // Inline function 'kotlin.code' call
        var this_0 = _Char___init__impl__6a9atx(48);
        var tmp$ret$0 = Char__toInt_impl_vasixd(this_0);
        tmp$ret$1 = this.writeByte_3m2t4h_k$(tmp$ret$0);
        break $l$block_0;
      }
      var negative = false;
      if (v_0.compareTo_9jj042_k$(new Long(0, 0)) < 0) {
        v_0 = v_0.unaryMinus_6uz0qp_k$();
        if (v_0.compareTo_9jj042_k$(new Long(0, 0)) < 0) {
          tmp$ret$1 = this.writeUtf8_9rv3au_k$('-9223372036854775808');
          break $l$block_0;
        }
        negative = true;
      }
      var tmp;
      if (v_0.compareTo_9jj042_k$(new Long(100000000, 0)) < 0) {
        var tmp_0;
        if (v_0.compareTo_9jj042_k$(new Long(10000, 0)) < 0) {
          var tmp_1;
          if (v_0.compareTo_9jj042_k$(new Long(100, 0)) < 0) {
            var tmp_2;
            if (v_0.compareTo_9jj042_k$(new Long(10, 0)) < 0) {
              tmp_2 = 1;
            } else {
              tmp_2 = 2;
            }
            tmp_1 = tmp_2;
          } else if (v_0.compareTo_9jj042_k$(new Long(1000, 0)) < 0) {
            tmp_1 = 3;
          } else {
            tmp_1 = 4;
          }
          tmp_0 = tmp_1;
        } else if (v_0.compareTo_9jj042_k$(new Long(1000000, 0)) < 0) {
          var tmp_3;
          if (v_0.compareTo_9jj042_k$(new Long(100000, 0)) < 0) {
            tmp_3 = 5;
          } else {
            tmp_3 = 6;
          }
          tmp_0 = tmp_3;
        } else if (v_0.compareTo_9jj042_k$(new Long(10000000, 0)) < 0) {
          tmp_0 = 7;
        } else {
          tmp_0 = 8;
        }
        tmp = tmp_0;
      } else if (v_0.compareTo_9jj042_k$(new Long(-727379968, 232)) < 0) {
        var tmp_4;
        if (v_0.compareTo_9jj042_k$(new Long(1410065408, 2)) < 0) {
          var tmp_5;
          if (v_0.compareTo_9jj042_k$(new Long(1000000000, 0)) < 0) {
            tmp_5 = 9;
          } else {
            tmp_5 = 10;
          }
          tmp_4 = tmp_5;
        } else if (v_0.compareTo_9jj042_k$(new Long(1215752192, 23)) < 0) {
          tmp_4 = 11;
        } else {
          tmp_4 = 12;
        }
        tmp = tmp_4;
      } else if (v_0.compareTo_9jj042_k$(new Long(-1530494976, 232830)) < 0) {
        var tmp_6;
        if (v_0.compareTo_9jj042_k$(new Long(1316134912, 2328)) < 0) {
          tmp_6 = 13;
        } else if (v_0.compareTo_9jj042_k$(new Long(276447232, 23283)) < 0) {
          tmp_6 = 14;
        } else {
          tmp_6 = 15;
        }
        tmp = tmp_6;
      } else if (v_0.compareTo_9jj042_k$(new Long(1569325056, 23283064)) < 0) {
        var tmp_7;
        if (v_0.compareTo_9jj042_k$(new Long(1874919424, 2328306)) < 0) {
          tmp_7 = 16;
        } else {
          tmp_7 = 17;
        }
        tmp = tmp_7;
      } else if (v_0.compareTo_9jj042_k$(new Long(-1486618624, 232830643)) < 0) {
        tmp = 18;
      } else {
        tmp = 19;
      }
      var width = tmp;
      if (negative) {
        width = (width + 1) | 0;
      }
      var tail = this.writableSegment_i90lmt_k$(width);
      var data = tail.get_data_wokkxf_k$();
      var pos = (tail.get_limit_iuokuq_k$() + width) | 0;
      while (!v_0.equals(new Long(0, 0))) {
        // Inline function 'kotlin.Long.rem' call
        var digit = v_0.rem_bsnl9o_k$(toLong(10)).toInt_1tsl84_k$();
        pos = (pos - 1) | 0;
        data[pos] = get_HEX_DIGIT_BYTES()[digit];
        // Inline function 'kotlin.Long.div' call
        v_0 = v_0.div_jun7gj_k$(toLong(10));
      }
      if (negative) {
        pos = (pos - 1) | 0;
        data[pos] = 45;
      }
      tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + width) | 0);
      this.size_1 = this.size_1.plus_r93sks_k$(toLong(width));
      tmp$ret$1 = this;
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).writeHexadecimalUnsignedLong_x2e47l_k$ = function (v) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'okio.internal.commonWriteHexadecimalUnsignedLong' call
      var v_0 = v;
      if (v_0.equals(new Long(0, 0))) {
        // Inline function 'kotlin.code' call
        var this_0 = _Char___init__impl__6a9atx(48);
        var tmp$ret$0 = Char__toInt_impl_vasixd(this_0);
        tmp$ret$1 = this.writeByte_3m2t4h_k$(tmp$ret$0);
        break $l$block;
      }
      var x = v_0;
      x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(1));
      x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(2));
      x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(4));
      x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(8));
      x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(16));
      x = x.or_v7fvkl_k$(x.ushr_z7nmq8_k$(32));
      x = x.minus_mfbszm_k$(x.ushr_z7nmq8_k$(1).and_4spn93_k$(new Long(1431655765, 1431655765)));
      x = x
        .ushr_z7nmq8_k$(2)
        .and_4spn93_k$(new Long(858993459, 858993459))
        .plus_r93sks_k$(x.and_4spn93_k$(new Long(858993459, 858993459)));
      x = x.ushr_z7nmq8_k$(4).plus_r93sks_k$(x).and_4spn93_k$(new Long(252645135, 252645135));
      x = x.plus_r93sks_k$(x.ushr_z7nmq8_k$(8));
      x = x.plus_r93sks_k$(x.ushr_z7nmq8_k$(16));
      x = x.and_4spn93_k$(new Long(63, 0)).plus_r93sks_k$(x.ushr_z7nmq8_k$(32).and_4spn93_k$(new Long(63, 0)));
      // Inline function 'kotlin.Long.div' call
      // Inline function 'kotlin.Long.plus' call
      var width = x.plus_r93sks_k$(toLong(3)).div_jun7gj_k$(toLong(4)).toInt_1tsl84_k$();
      var tail = this.writableSegment_i90lmt_k$(width);
      var data = tail.get_data_wokkxf_k$();
      var pos = (((tail.get_limit_iuokuq_k$() + width) | 0) - 1) | 0;
      var start = tail.get_limit_iuokuq_k$();
      while (pos >= start) {
        data[pos] = get_HEX_DIGIT_BYTES()[v_0.and_4spn93_k$(new Long(15, 0)).toInt_1tsl84_k$()];
        v_0 = v_0.ushr_z7nmq8_k$(4);
        pos = (pos - 1) | 0;
      }
      tail.set_limit_mo5fx2_k$((tail.get_limit_iuokuq_k$() + width) | 0);
      this.size_1 = this.size_1.plus_r93sks_k$(toLong(width));
      tmp$ret$1 = this;
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).write_f49az7_k$ = function (source, byteCount) {
    var tmp$ret$3;
    $l$block: {
      // Inline function 'okio.internal.commonWrite' call
      var byteCount_0 = byteCount;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!(source === this)) {
        // Inline function 'okio.internal.commonWrite.<anonymous>' call
        var message = 'source == this';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      checkOffsetAndCount(source.size_1, new Long(0, 0), byteCount_0);
      while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        if (
          byteCount_0.compareTo_9jj042_k$(
            toLong(
              (ensureNotNull(source.head_1).get_limit_iuokuq_k$() - ensureNotNull(source.head_1).get_pos_18iyad_k$()) |
                0,
            ),
          ) < 0
        ) {
          var tail = !(this.head_1 == null) ? ensureNotNull(this.head_1).get_prev_wosl18_k$() : null;
          var tmp;
          if (!(tail == null) ? tail.get_owner_iwkx3e_k$() : false) {
            // Inline function 'kotlin.Long.minus' call
            // Inline function 'kotlin.Long.plus' call
            var this_0 = byteCount_0;
            var other = tail.get_limit_iuokuq_k$();
            var this_1 = this_0.plus_r93sks_k$(toLong(other));
            var other_0 = tail.get_shared_jgtlda_k$() ? 0 : tail.get_pos_18iyad_k$();
            tmp =
              this_1
                .minus_mfbszm_k$(toLong(other_0))
                .compareTo_9jj042_k$(toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$())) <= 0;
          } else {
            tmp = false;
          }
          if (tmp) {
            ensureNotNull(source.head_1).writeTo_yxwz0w_k$(tail, byteCount_0.toInt_1tsl84_k$());
            source.size_1 = source.size_1.minus_mfbszm_k$(byteCount_0);
            this.size_1 = this.size_1.plus_r93sks_k$(byteCount_0);
            tmp$ret$3 = Unit_getInstance();
            break $l$block;
          } else {
            source.head_1 = ensureNotNull(source.head_1).split_cz4av2_k$(byteCount_0.toInt_1tsl84_k$());
          }
        }
        var segmentToMove = source.head_1;
        var movedByteCount = toLong(
          (ensureNotNull(segmentToMove).get_limit_iuokuq_k$() - segmentToMove.get_pos_18iyad_k$()) | 0,
        );
        source.head_1 = segmentToMove.pop_2dsh_k$();
        if (this.head_1 == null) {
          this.head_1 = segmentToMove;
          segmentToMove.set_prev_ur3dkn_k$(segmentToMove);
          segmentToMove.set_next_tohs5l_k$(segmentToMove.get_prev_wosl18_k$());
        } else {
          var tail_0 = ensureNotNull(this.head_1).get_prev_wosl18_k$();
          tail_0 = ensureNotNull(tail_0).push_wd62e0_k$(segmentToMove);
          tail_0.compact_dawvql_k$();
        }
        source.size_1 = source.size_1.minus_mfbszm_k$(movedByteCount);
        this.size_1 = this.size_1.plus_r93sks_k$(movedByteCount);
        byteCount_0 = byteCount_0.minus_mfbszm_k$(movedByteCount);
      }
    }
    return tmp$ret$3;
  };
  protoOf(Buffer).read_a1wdbo_k$ = function (sink, byteCount) {
    var tmp$ret$1;
    $l$block: {
      // Inline function 'okio.internal.commonRead' call
      var byteCount_0 = byteCount;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonRead.<anonymous>' call
        var message = 'byteCount < 0: ' + byteCount_0.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      if (this.size_1.equals(new Long(0, 0))) {
        tmp$ret$1 = new Long(-1, -1);
        break $l$block;
      }
      if (byteCount_0.compareTo_9jj042_k$(this.size_1) > 0) byteCount_0 = this.size_1;
      sink.write_f49az7_k$(this, byteCount_0);
      tmp$ret$1 = byteCount_0;
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).indexOf_ji4kj3_k$ = function (b) {
    return this.indexOf_nnf9xt_k$(b, new Long(0, 0), Companion_getInstance().get_MAX_VALUE_54a9lf_k$());
  };
  protoOf(Buffer).indexOf_hx61un_k$ = function (b, fromIndex) {
    return this.indexOf_nnf9xt_k$(b, fromIndex, Companion_getInstance().get_MAX_VALUE_54a9lf_k$());
  };
  protoOf(Buffer).indexOf_nnf9xt_k$ = function (b, fromIndex, toIndex) {
    var tmp$ret$1;
    $l$block_8: {
      // Inline function 'okio.internal.commonIndexOf' call
      var fromIndex_0 = fromIndex;
      var toIndex_0 = toIndex;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (
        !(new Long(0, 0).compareTo_9jj042_k$(fromIndex_0) <= 0
          ? fromIndex_0.compareTo_9jj042_k$(toIndex_0) <= 0
          : false)
      ) {
        // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
        var message =
          'size=' +
          this.size_1.toString() +
          ' fromIndex=' +
          fromIndex_0.toString() +
          ' toIndex=' +
          toIndex_0.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      if (toIndex_0.compareTo_9jj042_k$(this.size_1) > 0) toIndex_0 = this.size_1;
      if (fromIndex_0.equals(toIndex_0)) {
        tmp$ret$1 = new Long(-1, -1);
        break $l$block_8;
      }
      // Inline function 'okio.internal.seek' call
      var fromIndex_1 = fromIndex_0;
      var tmp0_elvis_lhs = this.head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        var offset = new Long(-1, -1);
        var tmp_0;
        if (null == null) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_8;
        } else {
          tmp_0 = null;
        }
        var s = tmp_0;
        var offset_0 = offset;
        while (offset_0.compareTo_9jj042_k$(toIndex_0) < 0) {
          var data = s.get_data_wokkxf_k$();
          // Inline function 'kotlin.comparisons.minOf' call
          var a = toLong(s.get_limit_iuokuq_k$());
          var b_0 = numberToLong(s.get_pos_18iyad_k$()).plus_r93sks_k$(toIndex_0).minus_mfbszm_k$(offset_0);
          var limit = (a.compareTo_9jj042_k$(b_0) <= 0 ? a : b_0).toInt_1tsl84_k$();
          var pos = numberToLong(s.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_0)
            .toInt_1tsl84_k$();
          while (pos < limit) {
            if (data[pos] === b) {
              tmp$ret$1 = numberToLong((pos - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
              break $l$block_8;
            }
            pos = (pos + 1) | 0;
          }
          offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_0;
          s = ensureNotNull(s.get_next_wor1vg_k$());
        }
        tmp$ret$1 = new Long(-1, -1);
        break $l$block_8;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var s_0 = tmp;
      if (this.size_1.minus_mfbszm_k$(fromIndex_1).compareTo_9jj042_k$(fromIndex_1) < 0) {
        var offset_1 = this.size_1;
        while (offset_1.compareTo_9jj042_k$(fromIndex_1) > 0) {
          s_0 = ensureNotNull(s_0.get_prev_wosl18_k$());
          offset_1 = offset_1.minus_mfbszm_k$(toLong((s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0));
        }
        var s_1 = s_0;
        var offset_2 = offset_1;
        var tmp_1;
        if (s_1 == null) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_8;
        } else {
          tmp_1 = s_1;
        }
        var s_2 = tmp_1;
        var offset_3 = offset_2;
        while (offset_3.compareTo_9jj042_k$(toIndex_0) < 0) {
          var data_0 = s_2.get_data_wokkxf_k$();
          // Inline function 'kotlin.comparisons.minOf' call
          var a_0 = toLong(s_2.get_limit_iuokuq_k$());
          var b_1 = numberToLong(s_2.get_pos_18iyad_k$()).plus_r93sks_k$(toIndex_0).minus_mfbszm_k$(offset_3);
          var limit_0 = (a_0.compareTo_9jj042_k$(b_1) <= 0 ? a_0 : b_1).toInt_1tsl84_k$();
          var pos_0 = numberToLong(s_2.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_3)
            .toInt_1tsl84_k$();
          while (pos_0 < limit_0) {
            if (data_0[pos_0] === b) {
              tmp$ret$1 = numberToLong((pos_0 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
              break $l$block_8;
            }
            pos_0 = (pos_0 + 1) | 0;
          }
          offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_3;
          s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
        }
        tmp$ret$1 = new Long(-1, -1);
        break $l$block_8;
      } else {
        var offset_4 = new Long(0, 0);
        $l$loop: while (true) {
          // Inline function 'kotlin.Long.plus' call
          var this_0 = offset_4;
          var other = (s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0;
          var nextOffset = this_0.plus_r93sks_k$(toLong(other));
          if (nextOffset.compareTo_9jj042_k$(fromIndex_1) > 0) break $l$loop;
          s_0 = ensureNotNull(s_0.get_next_wor1vg_k$());
          offset_4 = nextOffset;
        }
        var s_3 = s_0;
        var offset_5 = offset_4;
        var tmp_2;
        if (s_3 == null) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_8;
        } else {
          tmp_2 = s_3;
        }
        var s_4 = tmp_2;
        var offset_6 = offset_5;
        while (offset_6.compareTo_9jj042_k$(toIndex_0) < 0) {
          var data_1 = s_4.get_data_wokkxf_k$();
          // Inline function 'kotlin.comparisons.minOf' call
          var a_1 = toLong(s_4.get_limit_iuokuq_k$());
          var b_2 = numberToLong(s_4.get_pos_18iyad_k$()).plus_r93sks_k$(toIndex_0).minus_mfbszm_k$(offset_6);
          var limit_1 = (a_1.compareTo_9jj042_k$(b_2) <= 0 ? a_1 : b_2).toInt_1tsl84_k$();
          var pos_1 = numberToLong(s_4.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_6)
            .toInt_1tsl84_k$();
          while (pos_1 < limit_1) {
            if (data_1[pos_1] === b) {
              tmp$ret$1 = numberToLong((pos_1 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
              break $l$block_8;
            }
            pos_1 = (pos_1 + 1) | 0;
          }
          offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_6;
          s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
        }
        tmp$ret$1 = new Long(-1, -1);
        break $l$block_8;
      }
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).indexOf_b8dvgg_k$ = function (bytes) {
    return this.indexOf_btz2i6_k$(bytes, new Long(0, 0));
  };
  protoOf(Buffer).indexOf_btz2i6_k$ = function (bytes, fromIndex) {
    var tmp$ret$2;
    $l$block_7: {
      // Inline function 'okio.internal.commonIndexOf' call
      var fromIndex_0 = fromIndex;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(bytes.get_size_woubt6_k$() > 0)) {
        // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
        var message = 'bytes is empty';
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(fromIndex_0.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
        var message_0 = 'fromIndex < 0: ' + fromIndex_0.toString();
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      // Inline function 'okio.internal.seek' call
      var fromIndex_1 = fromIndex_0;
      var tmp0_elvis_lhs = this.head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        var offset = new Long(-1, -1);
        var tmp_0;
        if (null == null) {
          tmp$ret$2 = new Long(-1, -1);
          break $l$block_7;
        } else {
          tmp_0 = null;
        }
        var s = tmp_0;
        var offset_0 = offset;
        var targetByteArray = bytes.internalArray_tr176k_k$();
        var b0 = targetByteArray[0];
        var bytesSize = bytes.get_size_woubt6_k$();
        // Inline function 'kotlin.Long.minus' call
        var resultLimit = this.size_1.minus_mfbszm_k$(toLong(bytesSize)).plus_r93sks_k$(new Long(1, 0));
        while (offset_0.compareTo_9jj042_k$(resultLimit) < 0) {
          var data = s.get_data_wokkxf_k$();
          // Inline function 'okio.minOf' call
          var a = s.get_limit_iuokuq_k$();
          var b = numberToLong(s.get_pos_18iyad_k$()).plus_r93sks_k$(resultLimit).minus_mfbszm_k$(offset_0);
          // Inline function 'kotlin.comparisons.minOf' call
          var a_0 = toLong(a);
          var segmentLimit = (a_0.compareTo_9jj042_k$(b) <= 0 ? a_0 : b).toInt_1tsl84_k$();
          var inductionVariable = numberToLong(s.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_0)
            .toInt_1tsl84_k$();
          if (inductionVariable < segmentLimit)
            do {
              var pos = inductionVariable;
              inductionVariable = (inductionVariable + 1) | 0;
              if (data[pos] === b0 ? rangeEquals(s, (pos + 1) | 0, targetByteArray, 1, bytesSize) : false) {
                tmp$ret$2 = numberToLong((pos - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
                break $l$block_7;
              }
            } while (inductionVariable < segmentLimit);
          offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_0;
          s = ensureNotNull(s.get_next_wor1vg_k$());
        }
        tmp$ret$2 = new Long(-1, -1);
        break $l$block_7;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var s_0 = tmp;
      if (this.size_1.minus_mfbszm_k$(fromIndex_1).compareTo_9jj042_k$(fromIndex_1) < 0) {
        var offset_1 = this.size_1;
        while (offset_1.compareTo_9jj042_k$(fromIndex_1) > 0) {
          s_0 = ensureNotNull(s_0.get_prev_wosl18_k$());
          offset_1 = offset_1.minus_mfbszm_k$(toLong((s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0));
        }
        var s_1 = s_0;
        var offset_2 = offset_1;
        var tmp_1;
        if (s_1 == null) {
          tmp$ret$2 = new Long(-1, -1);
          break $l$block_7;
        } else {
          tmp_1 = s_1;
        }
        var s_2 = tmp_1;
        var offset_3 = offset_2;
        var targetByteArray_0 = bytes.internalArray_tr176k_k$();
        var b0_0 = targetByteArray_0[0];
        var bytesSize_0 = bytes.get_size_woubt6_k$();
        // Inline function 'kotlin.Long.minus' call
        var resultLimit_0 = this.size_1.minus_mfbszm_k$(toLong(bytesSize_0)).plus_r93sks_k$(new Long(1, 0));
        while (offset_3.compareTo_9jj042_k$(resultLimit_0) < 0) {
          var data_0 = s_2.get_data_wokkxf_k$();
          // Inline function 'okio.minOf' call
          var a_1 = s_2.get_limit_iuokuq_k$();
          var b_0 = numberToLong(s_2.get_pos_18iyad_k$()).plus_r93sks_k$(resultLimit_0).minus_mfbszm_k$(offset_3);
          // Inline function 'kotlin.comparisons.minOf' call
          var a_2 = toLong(a_1);
          var segmentLimit_0 = (a_2.compareTo_9jj042_k$(b_0) <= 0 ? a_2 : b_0).toInt_1tsl84_k$();
          var inductionVariable_0 = numberToLong(s_2.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_3)
            .toInt_1tsl84_k$();
          if (inductionVariable_0 < segmentLimit_0)
            do {
              var pos_0 = inductionVariable_0;
              inductionVariable_0 = (inductionVariable_0 + 1) | 0;
              if (
                data_0[pos_0] === b0_0 ? rangeEquals(s_2, (pos_0 + 1) | 0, targetByteArray_0, 1, bytesSize_0) : false
              ) {
                tmp$ret$2 = numberToLong((pos_0 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
                break $l$block_7;
              }
            } while (inductionVariable_0 < segmentLimit_0);
          offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_3;
          s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
        }
        tmp$ret$2 = new Long(-1, -1);
        break $l$block_7;
      } else {
        var offset_4 = new Long(0, 0);
        $l$loop: while (true) {
          // Inline function 'kotlin.Long.plus' call
          var this_0 = offset_4;
          var other = (s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0;
          var nextOffset = this_0.plus_r93sks_k$(toLong(other));
          if (nextOffset.compareTo_9jj042_k$(fromIndex_1) > 0) break $l$loop;
          s_0 = ensureNotNull(s_0.get_next_wor1vg_k$());
          offset_4 = nextOffset;
        }
        var s_3 = s_0;
        var offset_5 = offset_4;
        var tmp_2;
        if (s_3 == null) {
          tmp$ret$2 = new Long(-1, -1);
          break $l$block_7;
        } else {
          tmp_2 = s_3;
        }
        var s_4 = tmp_2;
        var offset_6 = offset_5;
        var targetByteArray_1 = bytes.internalArray_tr176k_k$();
        var b0_1 = targetByteArray_1[0];
        var bytesSize_1 = bytes.get_size_woubt6_k$();
        // Inline function 'kotlin.Long.minus' call
        var resultLimit_1 = this.size_1.minus_mfbszm_k$(toLong(bytesSize_1)).plus_r93sks_k$(new Long(1, 0));
        while (offset_6.compareTo_9jj042_k$(resultLimit_1) < 0) {
          var data_1 = s_4.get_data_wokkxf_k$();
          // Inline function 'okio.minOf' call
          var a_3 = s_4.get_limit_iuokuq_k$();
          var b_1 = numberToLong(s_4.get_pos_18iyad_k$()).plus_r93sks_k$(resultLimit_1).minus_mfbszm_k$(offset_6);
          // Inline function 'kotlin.comparisons.minOf' call
          var a_4 = toLong(a_3);
          var segmentLimit_1 = (a_4.compareTo_9jj042_k$(b_1) <= 0 ? a_4 : b_1).toInt_1tsl84_k$();
          var inductionVariable_1 = numberToLong(s_4.get_pos_18iyad_k$())
            .plus_r93sks_k$(fromIndex_0)
            .minus_mfbszm_k$(offset_6)
            .toInt_1tsl84_k$();
          if (inductionVariable_1 < segmentLimit_1)
            do {
              var pos_1 = inductionVariable_1;
              inductionVariable_1 = (inductionVariable_1 + 1) | 0;
              if (
                data_1[pos_1] === b0_1 ? rangeEquals(s_4, (pos_1 + 1) | 0, targetByteArray_1, 1, bytesSize_1) : false
              ) {
                tmp$ret$2 = numberToLong((pos_1 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
                break $l$block_7;
              }
            } while (inductionVariable_1 < segmentLimit_1);
          offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
          fromIndex_0 = offset_6;
          s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
        }
        tmp$ret$2 = new Long(-1, -1);
        break $l$block_7;
      }
    }
    return tmp$ret$2;
  };
  protoOf(Buffer).indexOfElement_ux3f9y_k$ = function (targetBytes) {
    return this.indexOfElement_r14ejc_k$(targetBytes, new Long(0, 0));
  };
  protoOf(Buffer).indexOfElement_r14ejc_k$ = function (targetBytes, fromIndex) {
    var tmp$ret$1;
    $l$block_10: {
      // Inline function 'okio.internal.commonIndexOfElement' call
      var fromIndex_0 = fromIndex;
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(fromIndex_0.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonIndexOfElement.<anonymous>' call
        var message = 'fromIndex < 0: ' + fromIndex_0.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'okio.internal.seek' call
      var fromIndex_1 = fromIndex_0;
      var tmp0_elvis_lhs = this.head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        var offset = new Long(-1, -1);
        var tmp_0;
        if (null == null) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_10;
        } else {
          tmp_0 = null;
        }
        var s = tmp_0;
        var offset_0 = offset;
        if (targetBytes.get_size_woubt6_k$() === 2) {
          var b0 = targetBytes.get_c1px32_k$(0);
          var b1 = targetBytes.get_c1px32_k$(1);
          while (offset_0.compareTo_9jj042_k$(this.size_1) < 0) {
            var data = s.get_data_wokkxf_k$();
            var pos = numberToLong(s.get_pos_18iyad_k$())
              .plus_r93sks_k$(fromIndex_0)
              .minus_mfbszm_k$(offset_0)
              .toInt_1tsl84_k$();
            var limit = s.get_limit_iuokuq_k$();
            while (pos < limit) {
              var b = data[pos];
              if (b === b0 ? true : b === b1) {
                tmp$ret$1 = numberToLong((pos - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
                break $l$block_10;
              }
              pos = (pos + 1) | 0;
            }
            offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
            fromIndex_0 = offset_0;
            s = ensureNotNull(s.get_next_wor1vg_k$());
          }
        } else {
          var targetByteArray = targetBytes.internalArray_tr176k_k$();
          while (offset_0.compareTo_9jj042_k$(this.size_1) < 0) {
            var data_0 = s.get_data_wokkxf_k$();
            var pos_0 = numberToLong(s.get_pos_18iyad_k$())
              .plus_r93sks_k$(fromIndex_0)
              .minus_mfbszm_k$(offset_0)
              .toInt_1tsl84_k$();
            var limit_0 = s.get_limit_iuokuq_k$();
            while (pos_0 < limit_0) {
              var b_0 = data_0[pos_0];
              var inductionVariable = 0;
              var last = targetByteArray.length;
              while (inductionVariable < last) {
                var t = targetByteArray[inductionVariable];
                inductionVariable = (inductionVariable + 1) | 0;
                if (b_0 === t) {
                  tmp$ret$1 = numberToLong((pos_0 - s.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_0);
                  break $l$block_10;
                }
              }
              pos_0 = (pos_0 + 1) | 0;
            }
            offset_0 = offset_0.plus_r93sks_k$(toLong((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0));
            fromIndex_0 = offset_0;
            s = ensureNotNull(s.get_next_wor1vg_k$());
          }
        }
        tmp$ret$1 = new Long(-1, -1);
        break $l$block_10;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var s_0 = tmp;
      if (this.size_1.minus_mfbszm_k$(fromIndex_1).compareTo_9jj042_k$(fromIndex_1) < 0) {
        var offset_1 = this.size_1;
        while (offset_1.compareTo_9jj042_k$(fromIndex_1) > 0) {
          s_0 = ensureNotNull(s_0.get_prev_wosl18_k$());
          offset_1 = offset_1.minus_mfbszm_k$(toLong((s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0));
        }
        var s_1 = s_0;
        var offset_2 = offset_1;
        var tmp_1;
        if (s_1 == null) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_10;
        } else {
          tmp_1 = s_1;
        }
        var s_2 = tmp_1;
        var offset_3 = offset_2;
        if (targetBytes.get_size_woubt6_k$() === 2) {
          var b0_0 = targetBytes.get_c1px32_k$(0);
          var b1_0 = targetBytes.get_c1px32_k$(1);
          while (offset_3.compareTo_9jj042_k$(this.size_1) < 0) {
            var data_1 = s_2.get_data_wokkxf_k$();
            var pos_1 = numberToLong(s_2.get_pos_18iyad_k$())
              .plus_r93sks_k$(fromIndex_0)
              .minus_mfbszm_k$(offset_3)
              .toInt_1tsl84_k$();
            var limit_1 = s_2.get_limit_iuokuq_k$();
            while (pos_1 < limit_1) {
              var b_1 = data_1[pos_1];
              if (b_1 === b0_0 ? true : b_1 === b1_0) {
                tmp$ret$1 = numberToLong((pos_1 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
                break $l$block_10;
              }
              pos_1 = (pos_1 + 1) | 0;
            }
            offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
            fromIndex_0 = offset_3;
            s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
          }
        } else {
          var targetByteArray_0 = targetBytes.internalArray_tr176k_k$();
          while (offset_3.compareTo_9jj042_k$(this.size_1) < 0) {
            var data_2 = s_2.get_data_wokkxf_k$();
            var pos_2 = numberToLong(s_2.get_pos_18iyad_k$())
              .plus_r93sks_k$(fromIndex_0)
              .minus_mfbszm_k$(offset_3)
              .toInt_1tsl84_k$();
            var limit_2 = s_2.get_limit_iuokuq_k$();
            while (pos_2 < limit_2) {
              var b_2 = data_2[pos_2];
              var inductionVariable_0 = 0;
              var last_0 = targetByteArray_0.length;
              while (inductionVariable_0 < last_0) {
                var t_0 = targetByteArray_0[inductionVariable_0];
                inductionVariable_0 = (inductionVariable_0 + 1) | 0;
                if (b_2 === t_0) {
                  tmp$ret$1 = numberToLong((pos_2 - s_2.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_3);
                  break $l$block_10;
                }
              }
              pos_2 = (pos_2 + 1) | 0;
            }
            offset_3 = offset_3.plus_r93sks_k$(toLong((s_2.get_limit_iuokuq_k$() - s_2.get_pos_18iyad_k$()) | 0));
            fromIndex_0 = offset_3;
            s_2 = ensureNotNull(s_2.get_next_wor1vg_k$());
          }
        }
        tmp$ret$1 = new Long(-1, -1);
        break $l$block_10;
      } else {
        var offset_4 = new Long(0, 0);
        $l$loop: while (true) {
          // Inline function 'kotlin.Long.plus' call
          var this_0 = offset_4;
          var other = (s_0.get_limit_iuokuq_k$() - s_0.get_pos_18iyad_k$()) | 0;
          var nextOffset = this_0.plus_r93sks_k$(toLong(other));
          if (nextOffset.compareTo_9jj042_k$(fromIndex_1) > 0) break $l$loop;
          s_0 = ensureNotNull(s_0.get_next_wor1vg_k$());
          offset_4 = nextOffset;
        }
        var s_3 = s_0;
        var offset_5 = offset_4;
        var tmp_2;
        if (s_3 == null) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_10;
        } else {
          tmp_2 = s_3;
        }
        var s_4 = tmp_2;
        var offset_6 = offset_5;
        if (targetBytes.get_size_woubt6_k$() === 2) {
          var b0_1 = targetBytes.get_c1px32_k$(0);
          var b1_1 = targetBytes.get_c1px32_k$(1);
          while (offset_6.compareTo_9jj042_k$(this.size_1) < 0) {
            var data_3 = s_4.get_data_wokkxf_k$();
            var pos_3 = numberToLong(s_4.get_pos_18iyad_k$())
              .plus_r93sks_k$(fromIndex_0)
              .minus_mfbszm_k$(offset_6)
              .toInt_1tsl84_k$();
            var limit_3 = s_4.get_limit_iuokuq_k$();
            while (pos_3 < limit_3) {
              var b_3 = data_3[pos_3];
              if (b_3 === b0_1 ? true : b_3 === b1_1) {
                tmp$ret$1 = numberToLong((pos_3 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
                break $l$block_10;
              }
              pos_3 = (pos_3 + 1) | 0;
            }
            offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
            fromIndex_0 = offset_6;
            s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
          }
        } else {
          var targetByteArray_1 = targetBytes.internalArray_tr176k_k$();
          while (offset_6.compareTo_9jj042_k$(this.size_1) < 0) {
            var data_4 = s_4.get_data_wokkxf_k$();
            var pos_4 = numberToLong(s_4.get_pos_18iyad_k$())
              .plus_r93sks_k$(fromIndex_0)
              .minus_mfbszm_k$(offset_6)
              .toInt_1tsl84_k$();
            var limit_4 = s_4.get_limit_iuokuq_k$();
            while (pos_4 < limit_4) {
              var b_4 = data_4[pos_4];
              var inductionVariable_1 = 0;
              var last_1 = targetByteArray_1.length;
              while (inductionVariable_1 < last_1) {
                var t_1 = targetByteArray_1[inductionVariable_1];
                inductionVariable_1 = (inductionVariable_1 + 1) | 0;
                if (b_4 === t_1) {
                  tmp$ret$1 = numberToLong((pos_4 - s_4.get_pos_18iyad_k$()) | 0).plus_r93sks_k$(offset_6);
                  break $l$block_10;
                }
              }
              pos_4 = (pos_4 + 1) | 0;
            }
            offset_6 = offset_6.plus_r93sks_k$(toLong((s_4.get_limit_iuokuq_k$() - s_4.get_pos_18iyad_k$()) | 0));
            fromIndex_0 = offset_6;
            s_4 = ensureNotNull(s_4.get_next_wor1vg_k$());
          }
        }
        tmp$ret$1 = new Long(-1, -1);
        break $l$block_10;
      }
    }
    return tmp$ret$1;
  };
  protoOf(Buffer).rangeEquals_pk4yqx_k$ = function (offset, bytes) {
    return this.rangeEquals_yttejb_k$(offset, bytes, 0, bytes.get_size_woubt6_k$());
  };
  protoOf(Buffer).rangeEquals_yttejb_k$ = function (offset, bytes, bytesOffset, byteCount) {
    var tmp$ret$0;
    $l$block_0: {
      // Inline function 'okio.internal.commonRangeEquals' call
      if (
        (
          ((offset.compareTo_9jj042_k$(new Long(0, 0)) < 0 ? true : bytesOffset < 0) ? true : byteCount < 0)
            ? true
            : this.size_1.minus_mfbszm_k$(offset).compareTo_9jj042_k$(toLong(byteCount)) < 0
        )
          ? true
          : ((bytes.get_size_woubt6_k$() - bytesOffset) | 0) < byteCount
      ) {
        tmp$ret$0 = false;
        break $l$block_0;
      }
      var inductionVariable = 0;
      if (inductionVariable < byteCount)
        do {
          var i = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          // Inline function 'kotlin.Long.plus' call
          var tmp$ret$1 = offset.plus_r93sks_k$(toLong(i));
          if (!(this.get_ugtq3c_k$(tmp$ret$1) === bytes.get_c1px32_k$((bytesOffset + i) | 0))) {
            tmp$ret$0 = false;
            break $l$block_0;
          }
        } while (inductionVariable < byteCount);
      tmp$ret$0 = true;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).flush_shahbo_k$ = function () {
    return Unit_getInstance();
  };
  protoOf(Buffer).close_yn9xrc_k$ = function () {
    return Unit_getInstance();
  };
  protoOf(Buffer).timeout_lq9okf_k$ = function () {
    return Companion_getInstance_8().get_NONE_wo64xt_k$();
  };
  protoOf(Buffer).equals = function (other) {
    var tmp$ret$0;
    $l$block_3: {
      // Inline function 'okio.internal.commonEquals' call
      if (this === other) {
        tmp$ret$0 = true;
        break $l$block_3;
      }
      if (!(other instanceof Buffer)) {
        tmp$ret$0 = false;
        break $l$block_3;
      }
      if (!this.size_1.equals(other.size_1)) {
        tmp$ret$0 = false;
        break $l$block_3;
      }
      if (this.size_1.equals(new Long(0, 0))) {
        tmp$ret$0 = true;
        break $l$block_3;
      }
      var sa = ensureNotNull(this.head_1);
      var sb = ensureNotNull(other.head_1);
      var posA = sa.get_pos_18iyad_k$();
      var posB = sb.get_pos_18iyad_k$();
      var pos = new Long(0, 0);
      var count;
      while (pos.compareTo_9jj042_k$(this.size_1) < 0) {
        // Inline function 'kotlin.comparisons.minOf' call
        var a = (sa.get_limit_iuokuq_k$() - posA) | 0;
        var b = (sb.get_limit_iuokuq_k$() - posB) | 0;
        var tmp$ret$1 = Math.min(a, b);
        count = toLong(tmp$ret$1);
        var inductionVariable = new Long(0, 0);
        if (inductionVariable.compareTo_9jj042_k$(count) < 0)
          do {
            var i = inductionVariable;
            inductionVariable = inductionVariable.plus_r93sks_k$(new Long(1, 0));
            var tmp = sa.get_data_wokkxf_k$();
            var tmp1 = posA;
            posA = (tmp1 + 1) | 0;
            var tmp_0 = tmp[tmp1];
            var tmp_1 = sb.get_data_wokkxf_k$();
            var tmp2 = posB;
            posB = (tmp2 + 1) | 0;
            if (!(tmp_0 === tmp_1[tmp2])) {
              tmp$ret$0 = false;
              break $l$block_3;
            }
          } while (inductionVariable.compareTo_9jj042_k$(count) < 0);
        if (posA === sa.get_limit_iuokuq_k$()) {
          sa = ensureNotNull(sa.get_next_wor1vg_k$());
          posA = sa.get_pos_18iyad_k$();
        }
        if (posB === sb.get_limit_iuokuq_k$()) {
          sb = ensureNotNull(sb.get_next_wor1vg_k$());
          posB = sb.get_pos_18iyad_k$();
        }
        pos = pos.plus_r93sks_k$(count);
      }
      tmp$ret$0 = true;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).hashCode = function () {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonHashCode' call
      var tmp0_elvis_lhs = this.head_1;
      var tmp;
      if (tmp0_elvis_lhs == null) {
        tmp$ret$0 = 0;
        break $l$block;
      } else {
        tmp = tmp0_elvis_lhs;
      }
      var s = tmp;
      var result = 1;
      do {
        var pos = s.get_pos_18iyad_k$();
        var limit = s.get_limit_iuokuq_k$();
        while (pos < limit) {
          result = (imul(31, result) + s.get_data_wokkxf_k$()[pos]) | 0;
          pos = (pos + 1) | 0;
        }
        s = ensureNotNull(s.get_next_wor1vg_k$());
      } while (!(s === this.head_1));
      tmp$ret$0 = result;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).toString = function () {
    return this.snapshot_4plubo_k$().toString();
  };
  protoOf(Buffer).copy_1tks5_k$ = function () {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonCopy' call
      var result = new Buffer();
      if (this.size_1.equals(new Long(0, 0))) {
        tmp$ret$0 = result;
        break $l$block;
      }
      var head = ensureNotNull(this.head_1);
      var headCopy = head.sharedCopy_timhza_k$();
      result.head_1 = headCopy;
      headCopy.set_prev_ur3dkn_k$(result.head_1);
      headCopy.set_next_tohs5l_k$(headCopy.get_prev_wosl18_k$());
      var s = head.get_next_wor1vg_k$();
      while (!(s === head)) {
        ensureNotNull(headCopy.get_prev_wosl18_k$()).push_wd62e0_k$(ensureNotNull(s).sharedCopy_timhza_k$());
        s = s.get_next_wor1vg_k$();
      }
      result.size_1 = this.size_1;
      tmp$ret$0 = result;
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).snapshot_4plubo_k$ = function () {
    // Inline function 'okio.internal.commonSnapshot' call
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!(this.size_1.compareTo_9jj042_k$(toLong(IntCompanionObject_getInstance().get_MAX_VALUE_54a9lf_k$())) <= 0)) {
      // Inline function 'okio.internal.commonSnapshot.<anonymous>' call
      var message = 'size > Int.MAX_VALUE: ' + this.size_1.toString();
      throw IllegalStateException_init_$Create$(toString(message));
    }
    return this.snapshot_hwfoq4_k$(this.size_1.toInt_1tsl84_k$());
  };
  protoOf(Buffer).snapshot_hwfoq4_k$ = function (byteCount) {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonSnapshot' call
      if (byteCount === 0) {
        tmp$ret$0 = Companion_getInstance_7().get_EMPTY_i8q41w_k$();
        break $l$block;
      }
      checkOffsetAndCount(this.size_1, new Long(0, 0), toLong(byteCount));
      var offset = 0;
      var segmentCount = 0;
      var s = this.head_1;
      while (offset < byteCount) {
        if (ensureNotNull(s).get_limit_iuokuq_k$() === s.get_pos_18iyad_k$()) {
          throw AssertionError_init_$Create$('s.limit == s.pos');
        }
        offset = (offset + ((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0)) | 0;
        segmentCount = (segmentCount + 1) | 0;
        s = s.get_next_wor1vg_k$();
      }
      // Inline function 'kotlin.arrayOfNulls' call
      var size = segmentCount;
      var segments = fillArrayVal(Array(size), null);
      var directory = new Int32Array(imul(segmentCount, 2));
      offset = 0;
      segmentCount = 0;
      s = this.head_1;
      while (offset < byteCount) {
        segments[segmentCount] = ensureNotNull(s).get_data_wokkxf_k$();
        offset = (offset + ((s.get_limit_iuokuq_k$() - s.get_pos_18iyad_k$()) | 0)) | 0;
        var tmp = segmentCount;
        // Inline function 'kotlin.comparisons.minOf' call
        var a = offset;
        directory[tmp] = Math.min(a, byteCount);
        directory[(segmentCount + segments.length) | 0] = s.get_pos_18iyad_k$();
        s.set_shared_67kjx_k$(true);
        segmentCount = (segmentCount + 1) | 0;
        s = s.get_next_wor1vg_k$();
      }
      tmp$ret$0 = new SegmentedByteString(isArray(segments) ? segments : THROW_CCE(), directory);
    }
    return tmp$ret$0;
  };
  protoOf(Buffer).md5_2b9a_k$ = function () {
    return digest(this, new Md5());
  };
  protoOf(Buffer).sha1_23myt_k$ = function () {
    return digest(this, new Sha1());
  };
  protoOf(Buffer).sha256_exzwt5_k$ = function () {
    return digest(this, new Sha256());
  };
  protoOf(Buffer).sha512_exzuom_k$ = function () {
    return digest(this, new Sha512());
  };
  protoOf(Buffer).hmacSha1_crnr8j_k$ = function (key) {
    return digest(this, Companion_getInstance_3().sha1_yksf2c_k$(key));
  };
  protoOf(Buffer).hmacSha256_ynvjgl_k$ = function (key) {
    return digest(this, Companion_getInstance_3().sha256_4vtk9u_k$(key));
  };
  protoOf(Buffer).hmacSha512_7grw14_k$ = function (key) {
    return digest(this, Companion_getInstance_3().sha512_w2x7pb_k$(key));
  };
  protoOf(Buffer).readUnsafe_rpflop_k$ = function (unsafeCursor) {
    return commonReadUnsafe(this, unsafeCursor);
  };
  protoOf(Buffer).readUnsafe$default_wyzrnu_k$ = function (unsafeCursor, $super) {
    unsafeCursor = unsafeCursor === VOID ? get_DEFAULT__new_UnsafeCursor() : unsafeCursor;
    return $super === VOID
      ? this.readUnsafe_rpflop_k$(unsafeCursor)
      : $super.readUnsafe_rpflop_k$.call(this, unsafeCursor);
  };
  protoOf(Buffer).readAndWriteUnsafe_yzshyp_k$ = function (unsafeCursor) {
    return commonReadAndWriteUnsafe(this, unsafeCursor);
  };
  protoOf(Buffer).readAndWriteUnsafe$default_z1mo2q_k$ = function (unsafeCursor, $super) {
    unsafeCursor = unsafeCursor === VOID ? get_DEFAULT__new_UnsafeCursor() : unsafeCursor;
    return $super === VOID
      ? this.readAndWriteUnsafe_yzshyp_k$(unsafeCursor)
      : $super.readAndWriteUnsafe_yzshyp_k$.call(this, unsafeCursor);
  };
  function BufferedSink() {}
  function BufferedSource() {}
  function asUtf8ToByteArray(_this__u8e3s4) {
    return commonAsUtf8ToByteArray(_this__u8e3s4);
  }
  function ArrayIndexOutOfBoundsException(message) {
    IndexOutOfBoundsException_init_$Init$(message, this);
    captureStack(this, ArrayIndexOutOfBoundsException);
  }
  function EOFException_init_$Init$($this) {
    EOFException.call($this, null);
    return $this;
  }
  function EOFException_init_$Create$() {
    var tmp = EOFException_init_$Init$(objectCreate(protoOf(EOFException)));
    captureStack(tmp, EOFException_init_$Create$);
    return tmp;
  }
  function EOFException(message) {
    IOException_init_$Init$(message, this);
    captureStack(this, EOFException);
  }
  function Closeable() {}
  function IOException_init_$Init$(message, $this) {
    IOException.call($this, message, null);
    return $this;
  }
  function IOException_init_$Create$(message) {
    var tmp = IOException_init_$Init$(message, objectCreate(protoOf(IOException)));
    captureStack(tmp, IOException_init_$Create$);
    return tmp;
  }
  function IOException_init_$Init$_0($this) {
    IOException.call($this, null, null);
    return $this;
  }
  function IOException_init_$Create$_0() {
    var tmp = IOException_init_$Init$_0(objectCreate(protoOf(IOException)));
    captureStack(tmp, IOException_init_$Create$_0);
    return tmp;
  }
  function IOException(message, cause) {
    Exception_init_$Init$(message, cause, this);
    captureStack(this, IOException);
  }
  function toUtf8String(_this__u8e3s4) {
    return commonToUtf8String(_this__u8e3s4);
  }
  function RealBufferedSource(source) {
    this.source_1 = source;
    this.closed_1 = false;
    this.buffer_1 = new Buffer();
  }
  protoOf(RealBufferedSource).get_source_jl0x7o_k$ = function () {
    return this.source_1;
  };
  protoOf(RealBufferedSource).set_closed_z8zuoc_k$ = function (_set____db54di) {
    this.closed_1 = _set____db54di;
  };
  protoOf(RealBufferedSource).get_closed_byjrzp_k$ = function () {
    return this.closed_1;
  };
  protoOf(RealBufferedSource).get_buffer_bmaafd_k$ = function () {
    return this.buffer_1;
  };
  protoOf(RealBufferedSource).read_a1wdbo_k$ = function (sink, byteCount) {
    var tmp$ret$2;
    $l$block: {
      // Inline function 'okio.internal.commonRead' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonRead.<anonymous>' call
        var message = 'byteCount < 0: ' + byteCount.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!this.closed_1) {
        // Inline function 'okio.internal.commonRead.<anonymous>' call
        var message_0 = 'closed';
        throw IllegalStateException_init_$Create$(toString(message_0));
      }
      if (this.buffer_1.get_size_woubt6_k$().equals(new Long(0, 0))) {
        var read = this.source_1.read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()));
        if (read.equals(new Long(-1, -1))) {
          tmp$ret$2 = new Long(-1, -1);
          break $l$block;
        }
      }
      // Inline function 'kotlin.comparisons.minOf' call
      var b = this.buffer_1.get_size_woubt6_k$();
      var toRead = byteCount.compareTo_9jj042_k$(b) <= 0 ? byteCount : b;
      tmp$ret$2 = this.buffer_1.read_a1wdbo_k$(sink, toRead);
    }
    return tmp$ret$2;
  };
  protoOf(RealBufferedSource).exhausted_p1jt55_k$ = function () {
    // Inline function 'okio.internal.commonExhausted' call
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!this.closed_1) {
      // Inline function 'okio.internal.commonExhausted.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    return this.buffer_1.exhausted_p1jt55_k$()
      ? this.source_1
          .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
          .equals(new Long(-1, -1))
      : false;
  };
  protoOf(RealBufferedSource).require_28r0pl_k$ = function (byteCount) {
    var tmp;
    if (!this.request_mpoy7z_k$(byteCount)) {
      throw EOFException_init_$Create$();
    }
    return tmp;
  };
  protoOf(RealBufferedSource).request_mpoy7z_k$ = function (byteCount) {
    var tmp$ret$2;
    $l$block: {
      // Inline function 'okio.internal.commonRequest' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(byteCount.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonRequest.<anonymous>' call
        var message = 'byteCount < 0: ' + byteCount.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!this.closed_1) {
        // Inline function 'okio.internal.commonRequest.<anonymous>' call
        var message_0 = 'closed';
        throw IllegalStateException_init_$Create$(toString(message_0));
      }
      while (this.buffer_1.get_size_woubt6_k$().compareTo_9jj042_k$(byteCount) < 0) {
        if (
          this.source_1
            .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
            .equals(new Long(-1, -1))
        ) {
          tmp$ret$2 = false;
          break $l$block;
        }
      }
      tmp$ret$2 = true;
    }
    return tmp$ret$2;
  };
  protoOf(RealBufferedSource).readByte_ectjk2_k$ = function () {
    // Inline function 'okio.internal.commonReadByte' call
    this.require_28r0pl_k$(new Long(1, 0));
    return this.buffer_1.readByte_ectjk2_k$();
  };
  protoOf(RealBufferedSource).readByteString_nzt46n_k$ = function () {
    // Inline function 'okio.internal.commonReadByteString' call
    this.buffer_1.writeAll_goqmgy_k$(this.source_1);
    return this.buffer_1.readByteString_nzt46n_k$();
  };
  protoOf(RealBufferedSource).readByteString_b9sk0v_k$ = function (byteCount) {
    // Inline function 'okio.internal.commonReadByteString' call
    this.require_28r0pl_k$(byteCount);
    return this.buffer_1.readByteString_b9sk0v_k$(byteCount);
  };
  protoOf(RealBufferedSource).select_91a7t_k$ = function (options) {
    var tmp$ret$1;
    $l$block_1: {
      // Inline function 'okio.internal.commonSelect' call
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!this.closed_1) {
        // Inline function 'okio.internal.commonSelect.<anonymous>' call
        var message = 'closed';
        throw IllegalStateException_init_$Create$(toString(message));
      }
      while (true) {
        var index = selectPrefix(this.buffer_1, options, true);
        switch (index) {
          case -1:
            tmp$ret$1 = -1;
            break $l$block_1;
          case -2:
            if (
              this.source_1
                .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
                .equals(new Long(-1, -1))
            ) {
              tmp$ret$1 = -1;
              break $l$block_1;
            }

            break;
          default:
            var selectedSize = options.get_byteStrings_g0wbnz_k$()[index].get_size_woubt6_k$();
            this.buffer_1.skip_bgd4sf_k$(toLong(selectedSize));
            tmp$ret$1 = index;
            break $l$block_1;
        }
      }
    }
    return tmp$ret$1;
  };
  protoOf(RealBufferedSource).select_4klarg_k$ = function (options) {
    // Inline function 'okio.internal.commonSelect' call
    var index = this.select_91a7t_k$(options.get_options_jecmyz_k$());
    return index === -1 ? null : options.get_c1px32_k$(index);
  };
  protoOf(RealBufferedSource).readByteArray_52wnjv_k$ = function () {
    // Inline function 'okio.internal.commonReadByteArray' call
    this.buffer_1.writeAll_goqmgy_k$(this.source_1);
    return this.buffer_1.readByteArray_52wnjv_k$();
  };
  protoOf(RealBufferedSource).readByteArray_176419_k$ = function (byteCount) {
    // Inline function 'okio.internal.commonReadByteArray' call
    this.require_28r0pl_k$(byteCount);
    return this.buffer_1.readByteArray_176419_k$(byteCount);
  };
  protoOf(RealBufferedSource).read_iv1lrq_k$ = function (sink) {
    return this.read_7zpyie_k$(sink, 0, sink.length);
  };
  protoOf(RealBufferedSource).readFully_qophy4_k$ = function (sink) {
    try {
      this.require_28r0pl_k$(toLong(sink.length));
    } catch ($p) {
      if ($p instanceof EOFException) {
        var e = $p;
        var offset = 0;
        while (this.buffer_1.get_size_woubt6_k$().compareTo_9jj042_k$(new Long(0, 0)) > 0) {
          var read = this.buffer_1.read_7zpyie_k$(sink, offset, this.buffer_1.get_size_woubt6_k$().toInt_1tsl84_k$());
          if (read === -1) throw AssertionError_init_$Create$_0();
          offset = (offset + read) | 0;
        }
        throw e;
      } else {
        throw $p;
      }
    }
    this.buffer_1.readFully_qophy4_k$(sink);
    return Unit_getInstance();
  };
  protoOf(RealBufferedSource).read_7zpyie_k$ = function (sink, offset, byteCount) {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonRead' call
      checkOffsetAndCount(toLong(sink.length), toLong(offset), toLong(byteCount));
      if (this.buffer_1.get_size_woubt6_k$().equals(new Long(0, 0))) {
        var read = this.source_1.read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()));
        if (read.equals(new Long(-1, -1))) {
          tmp$ret$0 = -1;
          break $l$block;
        }
      }
      // Inline function 'okio.minOf' call
      var b = this.buffer_1.get_size_woubt6_k$();
      // Inline function 'kotlin.comparisons.minOf' call
      var a = toLong(byteCount);
      var toRead = (a.compareTo_9jj042_k$(b) <= 0 ? a : b).toInt_1tsl84_k$();
      tmp$ret$0 = this.buffer_1.read_7zpyie_k$(sink, offset, toRead);
    }
    return tmp$ret$0;
  };
  protoOf(RealBufferedSource).readFully_8s2k72_k$ = function (sink, byteCount) {
    try {
      this.require_28r0pl_k$(byteCount);
    } catch ($p) {
      if ($p instanceof EOFException) {
        var e = $p;
        sink.writeAll_goqmgy_k$(this.buffer_1);
        throw e;
      } else {
        throw $p;
      }
    }
    this.buffer_1.readFully_8s2k72_k$(sink, byteCount);
    return Unit_getInstance();
  };
  protoOf(RealBufferedSource).readAll_mirvr1_k$ = function (sink) {
    // Inline function 'okio.internal.commonReadAll' call
    var totalBytesWritten = new Long(0, 0);
    while (
      !this.source_1
        .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
        .equals(new Long(-1, -1))
    ) {
      var emitByteCount = this.buffer_1.completeSegmentByteCount_8y8ucz_k$();
      if (emitByteCount.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
        totalBytesWritten = totalBytesWritten.plus_r93sks_k$(emitByteCount);
        sink.write_f49az7_k$(this.buffer_1, emitByteCount);
      }
    }
    if (this.buffer_1.get_size_woubt6_k$().compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      totalBytesWritten = totalBytesWritten.plus_r93sks_k$(this.buffer_1.get_size_woubt6_k$());
      sink.write_f49az7_k$(this.buffer_1, this.buffer_1.get_size_woubt6_k$());
    }
    return totalBytesWritten;
  };
  protoOf(RealBufferedSource).readUtf8_echivt_k$ = function () {
    // Inline function 'okio.internal.commonReadUtf8' call
    this.buffer_1.writeAll_goqmgy_k$(this.source_1);
    return this.buffer_1.readUtf8_echivt_k$();
  };
  protoOf(RealBufferedSource).readUtf8_pe0fc7_k$ = function (byteCount) {
    // Inline function 'okio.internal.commonReadUtf8' call
    this.require_28r0pl_k$(byteCount);
    return this.buffer_1.readUtf8_pe0fc7_k$(byteCount);
  };
  protoOf(RealBufferedSource).readUtf8Line_e2s5l1_k$ = function () {
    // Inline function 'okio.internal.commonReadUtf8Line' call
    var newline = this.indexOf_ji4kj3_k$(10);
    var tmp;
    if (newline.equals(new Long(-1, -1))) {
      var tmp_0;
      if (!this.buffer_1.get_size_woubt6_k$().equals(new Long(0, 0))) {
        tmp_0 = this.readUtf8_pe0fc7_k$(this.buffer_1.get_size_woubt6_k$());
      } else {
        tmp_0 = null;
      }
      tmp = tmp_0;
    } else {
      tmp = readUtf8Line(this.buffer_1, newline);
    }
    return tmp;
  };
  protoOf(RealBufferedSource).readUtf8LineStrict_40ilic_k$ = function () {
    return this.readUtf8LineStrict_6h4kc6_k$(Companion_getInstance().get_MAX_VALUE_54a9lf_k$());
  };
  protoOf(RealBufferedSource).readUtf8LineStrict_6h4kc6_k$ = function (limit) {
    var tmp$ret$2;
    $l$block_0: {
      // Inline function 'okio.internal.commonReadUtf8LineStrict' call
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (!(limit.compareTo_9jj042_k$(new Long(0, 0)) >= 0)) {
        // Inline function 'okio.internal.commonReadUtf8LineStrict.<anonymous>' call
        var message = 'limit < 0: ' + limit.toString();
        throw IllegalArgumentException_init_$Create$(toString(message));
      }
      var tmp;
      if (limit.equals(Companion_getInstance().get_MAX_VALUE_54a9lf_k$())) {
        tmp = Companion_getInstance().get_MAX_VALUE_54a9lf_k$();
      } else {
        // Inline function 'kotlin.Long.plus' call
        tmp = limit.plus_r93sks_k$(toLong(1));
      }
      var scanLength = tmp;
      var newline = this.indexOf_nnf9xt_k$(10, new Long(0, 0), scanLength);
      if (!newline.equals(new Long(-1, -1))) {
        tmp$ret$2 = readUtf8Line(this.buffer_1, newline);
        break $l$block_0;
      }
      var tmp_0;
      var tmp_1;
      var tmp_2;
      if (
        scanLength.compareTo_9jj042_k$(Companion_getInstance().get_MAX_VALUE_54a9lf_k$()) < 0
          ? this.request_mpoy7z_k$(scanLength)
          : false
      ) {
        // Inline function 'kotlin.Long.minus' call
        var tmp$ret$3 = scanLength.minus_mfbszm_k$(toLong(1));
        tmp_2 = this.buffer_1.get_ugtq3c_k$(tmp$ret$3) === 13;
      } else {
        tmp_2 = false;
      }
      if (tmp_2) {
        // Inline function 'kotlin.Long.plus' call
        var tmp$ret$4 = scanLength.plus_r93sks_k$(toLong(1));
        tmp_1 = this.request_mpoy7z_k$(tmp$ret$4);
      } else {
        tmp_1 = false;
      }
      if (tmp_1) {
        tmp_0 = this.buffer_1.get_ugtq3c_k$(scanLength) === 10;
      } else {
        tmp_0 = false;
      }
      if (tmp_0) {
        tmp$ret$2 = readUtf8Line(this.buffer_1, scanLength);
        break $l$block_0;
      }
      var data = new Buffer();
      var tmp_3 = new Long(0, 0);
      // Inline function 'okio.minOf' call
      var b = this.buffer_1.get_size_woubt6_k$();
      // Inline function 'kotlin.comparisons.minOf' call
      var a = toLong(32);
      var tmp$ret$6 = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
      this.buffer_1.copyTo_y7so4c_k$(data, tmp_3, tmp$ret$6);
      // Inline function 'kotlin.comparisons.minOf' call
      var a_0 = this.buffer_1.get_size_woubt6_k$();
      var tmp$ret$7 = a_0.compareTo_9jj042_k$(limit) <= 0 ? a_0 : limit;
      throw new EOFException(
        '\\n not found: limit=' +
          tmp$ret$7.toString() +
          ' content=' +
          data.readByteString_nzt46n_k$().hex_27mj_k$() +
          '\u2026',
      );
    }
    return tmp$ret$2;
  };
  protoOf(RealBufferedSource).readUtf8CodePoint_brmg90_k$ = function () {
    // Inline function 'okio.internal.commonReadUtf8CodePoint' call
    this.require_28r0pl_k$(new Long(1, 0));
    var b0 = this.buffer_1.get_ugtq3c_k$(new Long(0, 0));
    if ((b0 & 224) === 192) {
      this.require_28r0pl_k$(new Long(2, 0));
    } else if ((b0 & 240) === 224) {
      this.require_28r0pl_k$(new Long(3, 0));
    } else if ((b0 & 248) === 240) {
      this.require_28r0pl_k$(new Long(4, 0));
    }
    return this.buffer_1.readUtf8CodePoint_brmg90_k$();
  };
  protoOf(RealBufferedSource).readShort_ilpyey_k$ = function () {
    // Inline function 'okio.internal.commonReadShort' call
    this.require_28r0pl_k$(new Long(2, 0));
    return this.buffer_1.readShort_ilpyey_k$();
  };
  protoOf(RealBufferedSource).readShortLe_lyi6qn_k$ = function () {
    // Inline function 'okio.internal.commonReadShortLe' call
    this.require_28r0pl_k$(new Long(2, 0));
    return this.buffer_1.readShortLe_lyi6qn_k$();
  };
  protoOf(RealBufferedSource).readInt_hv8cxl_k$ = function () {
    // Inline function 'okio.internal.commonReadInt' call
    this.require_28r0pl_k$(new Long(4, 0));
    return this.buffer_1.readInt_hv8cxl_k$();
  };
  protoOf(RealBufferedSource).readIntLe_ir3zn2_k$ = function () {
    // Inline function 'okio.internal.commonReadIntLe' call
    this.require_28r0pl_k$(new Long(4, 0));
    return this.buffer_1.readIntLe_ir3zn2_k$();
  };
  protoOf(RealBufferedSource).readLong_ecnd8u_k$ = function () {
    // Inline function 'okio.internal.commonReadLong' call
    this.require_28r0pl_k$(new Long(8, 0));
    return this.buffer_1.readLong_ecnd8u_k$();
  };
  protoOf(RealBufferedSource).readLongLe_bnxvp1_k$ = function () {
    // Inline function 'okio.internal.commonReadLongLe' call
    this.require_28r0pl_k$(new Long(8, 0));
    return this.buffer_1.readLongLe_bnxvp1_k$();
  };
  protoOf(RealBufferedSource).readDecimalLong_uefo5l_k$ = function () {
    // Inline function 'okio.internal.commonReadDecimalLong' call
    this.require_28r0pl_k$(new Long(1, 0));
    var pos = new Long(0, 0);
    $l$loop_0: while (true) {
      // Inline function 'kotlin.Long.plus' call
      var tmp$ret$0 = pos.plus_r93sks_k$(toLong(1));
      if (!this.request_mpoy7z_k$(tmp$ret$0)) {
        break $l$loop_0;
      }
      var b = this.buffer_1.get_ugtq3c_k$(pos);
      if ((b < 48 ? true : b > 57) ? (!pos.equals(new Long(0, 0)) ? true : !(b === 45)) : false) {
        if (pos.equals(new Long(0, 0))) {
          // Inline function 'kotlin.text.toString' call
          var tmp$ret$1 = toString_1(b, 16);
          throw NumberFormatException_init_$Create$("Expected a digit or '-' but was 0x" + tmp$ret$1);
        }
        break $l$loop_0;
      }
      pos = pos.inc_28ke_k$();
    }
    return this.buffer_1.readDecimalLong_uefo5l_k$();
  };
  protoOf(RealBufferedSource).readHexadecimalUnsignedLong_gqibbu_k$ = function () {
    // Inline function 'okio.internal.commonReadHexadecimalUnsignedLong' call
    this.require_28r0pl_k$(new Long(1, 0));
    var pos = 0;
    $l$loop: while (this.request_mpoy7z_k$(toLong((pos + 1) | 0))) {
      var b = this.buffer_1.get_ugtq3c_k$(toLong(pos));
      if (((b < 48 ? true : b > 57) ? (b < 97 ? true : b > 102) : false) ? (b < 65 ? true : b > 70) : false) {
        if (pos === 0) {
          // Inline function 'kotlin.text.toString' call
          var tmp$ret$0 = toString_1(b, 16);
          throw NumberFormatException_init_$Create$('Expected leading [0-9a-fA-F] character but was 0x' + tmp$ret$0);
        }
        break $l$loop;
      }
      pos = (pos + 1) | 0;
    }
    return this.buffer_1.readHexadecimalUnsignedLong_gqibbu_k$();
  };
  protoOf(RealBufferedSource).skip_bgd4sf_k$ = function (byteCount) {
    var byteCount_0 = byteCount;
    // Inline function 'kotlin.check' call
    // Inline function 'kotlin.contracts.contract' call
    if (!!this.closed_1) {
      // Inline function 'okio.internal.commonSkip.<anonymous>' call
      var message = 'closed';
      throw IllegalStateException_init_$Create$(toString(message));
    }
    while (byteCount_0.compareTo_9jj042_k$(new Long(0, 0)) > 0) {
      if (
        this.buffer_1.get_size_woubt6_k$().equals(new Long(0, 0))
          ? this.source_1
              .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
              .equals(new Long(-1, -1))
          : false
      ) {
        throw EOFException_init_$Create$();
      }
      // Inline function 'kotlin.comparisons.minOf' call
      var a = byteCount_0;
      var b = this.buffer_1.get_size_woubt6_k$();
      var toSkip = a.compareTo_9jj042_k$(b) <= 0 ? a : b;
      this.buffer_1.skip_bgd4sf_k$(toSkip);
      byteCount_0 = byteCount_0.minus_mfbszm_k$(toSkip);
    }
    return Unit_getInstance();
  };
  protoOf(RealBufferedSource).indexOf_ji4kj3_k$ = function (b) {
    return this.indexOf_nnf9xt_k$(b, new Long(0, 0), Companion_getInstance().get_MAX_VALUE_54a9lf_k$());
  };
  protoOf(RealBufferedSource).indexOf_hx61un_k$ = function (b, fromIndex) {
    return this.indexOf_nnf9xt_k$(b, fromIndex, Companion_getInstance().get_MAX_VALUE_54a9lf_k$());
  };
  protoOf(RealBufferedSource).indexOf_nnf9xt_k$ = function (b, fromIndex, toIndex) {
    var tmp$ret$2;
    $l$block_0: {
      // Inline function 'okio.internal.commonIndexOf' call
      var fromIndex_0 = fromIndex;
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!this.closed_1) {
        // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
        var message = 'closed';
        throw IllegalStateException_init_$Create$(toString(message));
      }
      // Inline function 'kotlin.require' call
      // Inline function 'kotlin.contracts.contract' call
      if (
        !(new Long(0, 0).compareTo_9jj042_k$(fromIndex_0) <= 0 ? fromIndex_0.compareTo_9jj042_k$(toIndex) <= 0 : false)
      ) {
        // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
        var message_0 = 'fromIndex=' + fromIndex_0.toString() + ' toIndex=' + toIndex.toString();
        throw IllegalArgumentException_init_$Create$(toString(message_0));
      }
      while (fromIndex_0.compareTo_9jj042_k$(toIndex) < 0) {
        var result = this.buffer_1.indexOf_nnf9xt_k$(b, fromIndex_0, toIndex);
        if (!result.equals(new Long(-1, -1))) {
          tmp$ret$2 = result;
          break $l$block_0;
        }
        var lastBufferSize = this.buffer_1.get_size_woubt6_k$();
        if (
          lastBufferSize.compareTo_9jj042_k$(toIndex) >= 0
            ? true
            : this.source_1
                .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
                .equals(new Long(-1, -1))
        ) {
          tmp$ret$2 = new Long(-1, -1);
          break $l$block_0;
        }
        // Inline function 'kotlin.comparisons.maxOf' call
        var a = fromIndex_0;
        fromIndex_0 = a.compareTo_9jj042_k$(lastBufferSize) >= 0 ? a : lastBufferSize;
      }
      tmp$ret$2 = new Long(-1, -1);
    }
    return tmp$ret$2;
  };
  protoOf(RealBufferedSource).indexOf_b8dvgg_k$ = function (bytes) {
    return this.indexOf_btz2i6_k$(bytes, new Long(0, 0));
  };
  protoOf(RealBufferedSource).indexOf_btz2i6_k$ = function (bytes, fromIndex) {
    var tmp$ret$1;
    $l$block_0: {
      // Inline function 'okio.internal.commonIndexOf' call
      var fromIndex_0 = fromIndex;
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!this.closed_1) {
        // Inline function 'okio.internal.commonIndexOf.<anonymous>' call
        var message = 'closed';
        throw IllegalStateException_init_$Create$(toString(message));
      }
      while (true) {
        var result = this.buffer_1.indexOf_btz2i6_k$(bytes, fromIndex_0);
        if (!result.equals(new Long(-1, -1))) {
          tmp$ret$1 = result;
          break $l$block_0;
        }
        var lastBufferSize = this.buffer_1.get_size_woubt6_k$();
        if (
          this.source_1
            .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
            .equals(new Long(-1, -1))
        ) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_0;
        }
        // Inline function 'kotlin.comparisons.maxOf' call
        var a = fromIndex_0;
        // Inline function 'kotlin.Long.plus' call
        // Inline function 'kotlin.Long.minus' call
        var other = bytes.get_size_woubt6_k$();
        var b = lastBufferSize.minus_mfbszm_k$(toLong(other)).plus_r93sks_k$(toLong(1));
        fromIndex_0 = a.compareTo_9jj042_k$(b) >= 0 ? a : b;
      }
    }
    return tmp$ret$1;
  };
  protoOf(RealBufferedSource).indexOfElement_ux3f9y_k$ = function (targetBytes) {
    return this.indexOfElement_r14ejc_k$(targetBytes, new Long(0, 0));
  };
  protoOf(RealBufferedSource).indexOfElement_r14ejc_k$ = function (targetBytes, fromIndex) {
    var tmp$ret$1;
    $l$block_0: {
      // Inline function 'okio.internal.commonIndexOfElement' call
      var fromIndex_0 = fromIndex;
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!this.closed_1) {
        // Inline function 'okio.internal.commonIndexOfElement.<anonymous>' call
        var message = 'closed';
        throw IllegalStateException_init_$Create$(toString(message));
      }
      while (true) {
        var result = this.buffer_1.indexOfElement_r14ejc_k$(targetBytes, fromIndex_0);
        if (!result.equals(new Long(-1, -1))) {
          tmp$ret$1 = result;
          break $l$block_0;
        }
        var lastBufferSize = this.buffer_1.get_size_woubt6_k$();
        if (
          this.source_1
            .read_a1wdbo_k$(this.buffer_1, toLong(Companion_getInstance_1().get_SIZE_wo97pm_k$()))
            .equals(new Long(-1, -1))
        ) {
          tmp$ret$1 = new Long(-1, -1);
          break $l$block_0;
        }
        // Inline function 'kotlin.comparisons.maxOf' call
        var a = fromIndex_0;
        fromIndex_0 = a.compareTo_9jj042_k$(lastBufferSize) >= 0 ? a : lastBufferSize;
      }
    }
    return tmp$ret$1;
  };
  protoOf(RealBufferedSource).rangeEquals_pk4yqx_k$ = function (offset, bytes) {
    return this.rangeEquals_yttejb_k$(offset, bytes, 0, bytes.get_size_woubt6_k$());
  };
  protoOf(RealBufferedSource).rangeEquals_yttejb_k$ = function (offset, bytes, bytesOffset, byteCount) {
    var tmp$ret$1;
    $l$block_1: {
      // Inline function 'okio.internal.commonRangeEquals' call
      // Inline function 'kotlin.check' call
      // Inline function 'kotlin.contracts.contract' call
      if (!!this.closed_1) {
        // Inline function 'okio.internal.commonRangeEquals.<anonymous>' call
        var message = 'closed';
        throw IllegalStateException_init_$Create$(toString(message));
      }
      if (
        ((offset.compareTo_9jj042_k$(new Long(0, 0)) < 0 ? true : bytesOffset < 0) ? true : byteCount < 0)
          ? true
          : ((bytes.get_size_woubt6_k$() - bytesOffset) | 0) < byteCount
      ) {
        tmp$ret$1 = false;
        break $l$block_1;
      }
      var inductionVariable = 0;
      if (inductionVariable < byteCount)
        do {
          var i = inductionVariable;
          inductionVariable = (inductionVariable + 1) | 0;
          // Inline function 'kotlin.Long.plus' call
          var bufferOffset = offset.plus_r93sks_k$(toLong(i));
          // Inline function 'kotlin.Long.plus' call
          var tmp$ret$3 = bufferOffset.plus_r93sks_k$(toLong(1));
          if (!this.request_mpoy7z_k$(tmp$ret$3)) {
            tmp$ret$1 = false;
            break $l$block_1;
          }
          if (!(this.buffer_1.get_ugtq3c_k$(bufferOffset) === bytes.get_c1px32_k$((bytesOffset + i) | 0))) {
            tmp$ret$1 = false;
            break $l$block_1;
          }
        } while (inductionVariable < byteCount);
      tmp$ret$1 = true;
    }
    return tmp$ret$1;
  };
  protoOf(RealBufferedSource).peek_21nx7_k$ = function () {
    // Inline function 'okio.internal.commonPeek' call
    return buffer(new PeekSource(this));
  };
  protoOf(RealBufferedSource).close_yn9xrc_k$ = function () {
    var tmp$ret$0;
    $l$block: {
      // Inline function 'okio.internal.commonClose' call
      if (this.closed_1) {
        tmp$ret$0 = Unit_getInstance();
        break $l$block;
      }
      this.closed_1 = true;
      this.source_1.close_yn9xrc_k$();
      this.buffer_1.clear_j9egeb_k$();
    }
    return tmp$ret$0;
  };
  protoOf(RealBufferedSource).timeout_lq9okf_k$ = function () {
    // Inline function 'okio.internal.commonTimeout' call
    return this.source_1.timeout_lq9okf_k$();
  };
  protoOf(RealBufferedSource).toString = function () {
    // Inline function 'okio.internal.commonToString' call
    return 'buffer(' + this.source_1 + ')';
  };
  function SegmentPool() {
    SegmentPool_instance = this;
    this.MAX_SIZE_1 = 0;
    this.byteCount_1 = 0;
  }
  protoOf(SegmentPool).get_MAX_SIZE_bmfi1n_k$ = function () {
    return this.MAX_SIZE_1;
  };
  protoOf(SegmentPool).get_byteCount_pu5ghu_k$ = function () {
    return this.byteCount_1;
  };
  protoOf(SegmentPool).take_2451j_k$ = function () {
    return Segment_init_$Create$();
  };
  protoOf(SegmentPool).recycle_ipeoxr_k$ = function (segment) {};
  var SegmentPool_instance;
  function SegmentPool_getInstance() {
    if (SegmentPool_instance == null) new SegmentPool();
    return SegmentPool_instance;
  }
  function Sink() {}
  function Companion_7() {
    Companion_instance_7 = this;
    this.NONE_1 = new Timeout();
  }
  protoOf(Companion_7).get_NONE_wo64xt_k$ = function () {
    return this.NONE_1;
  };
  var Companion_instance_7;
  function Companion_getInstance_8() {
    if (Companion_instance_7 == null) new Companion_7();
    return Companion_instance_7;
  }
  function Timeout() {
    Companion_getInstance_8();
  }
  //region block: post-declaration
  protoOf(Hmac).update$default_mhmryi_k$ = update$default;
  protoOf(Md5).update$default_mhmryi_k$ = update$default;
  protoOf(Sha1).update$default_mhmryi_k$ = update$default;
  protoOf(Sha256).update$default_mhmryi_k$ = update$default;
  protoOf(Sha512).update$default_mhmryi_k$ = update$default;
  //endregion
  //region block: init
  REPLACEMENT_CODE_POINT = 65533;
  REPLACEMENT_BYTE = 63;
  HIGH_SURROGATE_HEADER = 55232;
  LOG_SURROGATE_HEADER = 56320;
  REPLACEMENT_CHARACTER = _Char___init__impl__6a9atx(65533);
  MASK_2BYTES = 3968;
  MASK_3BYTES = -123008;
  MASK_4BYTES = 3678080;
  OVERFLOW_DIGIT_START = new Long(-7, -1);
  OVERFLOW_ZONE = new Long(858993460, -214748365);
  SEGMENTING_THRESHOLD = 4096;
  //endregion
  return _;
});

//# sourceMappingURL=okio-parent-okio.js.map
