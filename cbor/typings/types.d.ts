/**
 * @class BaseError
 * @extends Error
 * @param {string} message
 * @returns {string}
 */
export declare class BaseError extends Error {
  /**
   * @class BaseError
   * @extends Error
   * @param {string} message
   * @returns {string}
   */
  constructor(message: string);
}

/**
 * @class DecodeError
 * @param {string} message
 * @param {*} [extra]
 */
export declare class DecodeError {
  /**
   * @class DecodeError
   * @param {string} message
   * @param {*} [extra]
   */
  constructor(message: string, extra?: any);

  /** @type {string} */
  static INVALID_TYPE: string;

  /** @type {string} */
  static UNEXPECTED_EOF: string;

  /** @type {string} */
  static UNEXPECTED_TYPE: string;

  /** @type {string} */
  static INT_OVERFLOW: string;

  /** @type {string} */
  static TOO_LONG: string;

  /** @type {string} */
  static TOO_NESTED: string;
}

/**
 * @class Decoder
 * @param {!ArrayBuffer} buffer
 * @param {Object} [config=DEFAULT_CONFIG] config
 * @returns {Decoder} `this`
 */
export declare class Decoder {
  /**
   * @class Decoder
   * @param {!ArrayBuffer} buffer
   * @param {Object} [config=DEFAULT_CONFIG] config
   * @returns {Decoder} `this`
   */
  constructor(buffer: ArrayBuffer, config?: Object);

  /**
   * @param {!number} int
   * @param {!number} overflow
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  private static _check_overflow(int: number, overflow: number): number;

  /**
   * @param {!number} bytes
   * @returns {void}
   * @private
   */
  private _advance(bytes: number): void;

  /**
   * @returns {!number}
   * @private
   */
  private _available(): number;

  /**
   * @param {!number} bytes
   * @param {!closureCallback} closure
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  private _read(bytes: number, closure: closureCallback): number;

  /**
   * @returns {number}
   * @private
   */
  private _u8(): number;

  /**
   * @returns {number}
   * @private
   */
  private _u16(): number;

  /**
   * @returns {number}
   * @private
   */
  private _u32(): number;

  /**
   * @returns {number}
   * @private
   */
  private _u64(): number;

  /**
   * @returns {number}
   * @private
   */
  private _f32(): number;

  /**
   * @returns {number}
   * @private
   */
  private _f64(): number;

  /**
   * @param {!number} minor
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  private _read_length(minor: number): number;

  /**
   * @param {!number} minor
   * @param {!number} max_len
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  private _bytes(minor: number, max_len: number): number;

  /**
   * @returns {Array<Types|number>}
   * @private
   * @throws DecodeError
   */
  private _read_type_info(): (Types | number)[];

  /**
   * @param {!(number|Array<number>)} expected
   * @returns {Array<Types|number>}
   * @private
   * @throws DecodeError
   */
  private _type_info_with_assert(expected: number | number[]): (Types | number)[];

  /**
   * @param {Types} type
   * @param {!number} minor
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  private _read_unsigned(type: Types, minor: number): number;

  /**
   * @param {!number} overflow
   * @param {*} type
   * @param {!number} minor
   * @returns {number}
   * @private
   * @throws DecodeError
   */
  private _read_signed(overflow: number, type: any, minor: number): number;

  /** @returns {number} */
  u8(): number;

  /** @returns {number} */
  u16(): number;

  /** @returns {number} */
  u32(): number;

  /** @returns {number} */
  u64(): number;

  /** @returns {number} */
  i8(): number;

  /** @returns {number} */
  i16(): number;

  /** @returns {number} */
  i32(): number;

  /** @returns {number} */
  i64(): number;

  /** @returns {number} */
  unsigned(): number;

  /** @returns {number} */
  int(): number;

  /** @returns {number} */
  f16(): number;

  /** @returns {number} */
  f32(): number;

  /** @returns {number} */
  f64(): number;

  /**
   * @returns {boolean}
   * @throws DecodeError
   */
  bool(): boolean;

  /**
   * @returns {number}
   * @throws DecodeError
   */
  bytes(): number;

  /**
   * @returns {string}
   * @throws DecodeError
   */
  text(): string;

  /**
   * @param {!closureCallback} closure
   * @returns {(closureCallback|null)}
   * @throws DecodeError
   */
  optional(closure: closureCallback): closureCallback | null;

  /**
   * @returns {number}
   * @throws DecodeError
   */
  array(): number;

  /**
   * @returns {number}
   * @throws DecodeError
   */
  object(): number;

  /**
   * @param {*} type
   * @returns {void}
   * @private
   * @throws DecodeError
   */
  private _skip_until_break(type: any): void;

  /**
   * @param {!number} level
   * @returns {boolean}
   * @private
   * @throws DecodeError
   */
  private _skip_value(level: number): boolean;

  /** @returns {boolean} */
  skip(): boolean;
}

/**
 * @callback closureCallback
 */
type closureCallback = () => void;

/**
 * @class Encoder
 * @returns {Encoder} `this`
 */
export declare class Encoder {
  /**
   * @class Encoder
   * @returns {Encoder} `this`
   */
  constructor();

  /** @returns {ArrayBuffer} */
  get_buffer(): ArrayBuffer;

  /**
   * @param {!number} need_nbytes
   * @returns {number}
   * @private
   */
  private _new_buffer_length(need_nbytes: number): number;

  /**
   * @param {!number} need_nbytes
   * @returns {void}
   * @private
   */
  private _grow_buffer(need_nbytes: number): void;

  /**
   * @param {!number} bytes
   * @returns {void}
   * @private
   */
  private _ensure(bytes: number): void;

  /**
   * @param {!number} bytes
   * @returns {void}
   * @private
   */
  private _advance(bytes: number): void;

  /**
   * @param {!number} bytes
   * @param {!closureCallback} closure
   * @returns {void}
   * @private
   */
  private _write(bytes: number, closure: closureCallback): void;

  /**
   * @param {Types} type
   * @param {!number} len
   * @returns {void}
   * @private
   * @throws RangeError
   */
  private _write_type_and_len(type: Types, len: number): void;

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  private _u8(value: number): void;

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  private _u16(value: number): void;

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  private _u32(value: number): void;

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  private _u64(value: number): void;

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  private _f32(value: number): void;

  /**
   * @param {!number} value
   * @returns {void}
   * @private
   */
  private _f64(value: number): void;

  /**
   * @param {!Uint8Array} value
   * @returns {void}
   * @private
   */
  private _bytes(value: Uint8Array): void;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u8(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u16(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u32(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  u64(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i8(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i16(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i32(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   * @throws RangeError
   */
  i64(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  f32(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  f64(value: number): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  bool(value: number): Encoder;

  /**
   * @param {!(ArrayBuffer|Uint8Array)} value
   * @returns {Encoder} `this`
   */
  bytes(value: ArrayBuffer | Uint8Array): Encoder;

  /**
   * @param {!number} value
   * @returns {Encoder} `this`
   */
  text(value: number): Encoder;

  /** @returns {Encoder} `this` */
  null(): Encoder;

  /** @returns {Encoder} `this` */
  undefined(): Encoder;

  /**
   * @param {!number} len
   * @returns {Encoder} `this`
   */
  array(len: number): Encoder;

  /** @returns {Encoder} `this` */
  array_begin(): Encoder;

  /** @returns {Encoder} `this` */
  array_end(): Encoder;

  /**
   * @param {!number} len
   * @returns {Encoder} `this`
   */
  object(len: number): Encoder;

  /** @returns {Encoder} `this` */
  object_begin(): Encoder;

  /** @returns {Encoder} `this` */
  object_end(): Encoder;
}

/**
 * @class Types
 * @throws Error
 */
export declare class Types {
  /**
   * @class Types
   * @throws Error
   */
  constructor();

  /** @type {number} */
  static ARRAY: number;

  /** @type {number} */
  static BOOL: number;

  /** @type {number} */
  static BREAK: number;

  /** @type {number} */
  static BYTES: number;

  /** @type {number} */
  static FLOAT16: number;

  /** @type {number} */
  static FLOAT32: number;

  /** @type {number} */
  static FLOAT64: number;

  /** @type {number} */
  static UINT8: number;

  /** @type {number} */
  static UINT16: number;

  /** @type {number} */
  static UINT32: number;

  /** @type {number} */
  static UINT64: number;

  /** @type {number} */
  static INT8: number;

  /** @type {number} */
  static INT16: number;

  /** @type {number} */
  static INT32: number;

  /** @type {number} */
  static INT64: number;

  /** @type {number} */
  static NULL: number;

  /** @type {number} */
  static OBJECT: number;

  /** @type {number} */
  static TAGGED: number;

  /** @type {number} */
  static TEXT: number;

  /** @type {number} */
  static UNDEFINED: number;

  /**
   * @param {!Types} type
   * @returns {number}
   * @throws TypeError
   */
  static major(type: Types): number;
}
