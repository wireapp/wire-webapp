type Nullable<T> = T | null | undefined;
export declare namespace pbandk {
  class ByteArr {
    constructor(array: Int8Array);
    get array(): Int8Array;
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get Companion(): {
      get empty(): pbandk.ByteArr;
    };
  }
}
export declare namespace pbandk {
  class FieldDescriptor<M extends unknown /* pbandk.Message */, T> {
    constructor(
      messageDescriptor: any /* kotlin.reflect.KProperty0<pbandk.MessageDescriptor<M>> */,
      name: string,
      number: number,
      type: pbandk.FieldDescriptor.Type,
      value: any /* kotlin.reflect.KProperty1<M, T> */,
      oneofMember?: boolean,
      jsonName?: Nullable<string>,
      options?: pbandk.wkt.FieldOptions,
    );
    get name(): string;
    get options(): pbandk.wkt.FieldOptions;
  }
  namespace FieldDescriptor {
    abstract class Type {
      protected constructor();
    }
    namespace Type {
      abstract class Primitive<KotlinT extends any> extends pbandk.FieldDescriptor.Type {
        protected constructor(defaultValue: KotlinT);
      }
      namespace Primitive {
        class Double extends pbandk.FieldDescriptor.Type.Primitive<number> {
          constructor(hasPresence?: boolean);
        }
        class Float extends pbandk.FieldDescriptor.Type.Primitive<number> {
          constructor(hasPresence?: boolean);
        }
        class Int64 extends pbandk.FieldDescriptor.Type.Primitive<any /* kotlin.Long */> {
          constructor(hasPresence?: boolean);
        }
        class UInt64 extends pbandk.FieldDescriptor.Type.Primitive<any /* kotlin.Long */> {
          constructor(hasPresence?: boolean);
        }
        class Int32 extends pbandk.FieldDescriptor.Type.Primitive<number> {
          constructor(hasPresence?: boolean);
        }
        class Fixed64 extends pbandk.FieldDescriptor.Type.Primitive<any /* kotlin.Long */> {
          constructor(hasPresence?: boolean);
        }
        class Fixed32 extends pbandk.FieldDescriptor.Type.Primitive<number> {
          constructor(hasPresence?: boolean);
        }
        class Bool extends pbandk.FieldDescriptor.Type.Primitive<boolean> {
          constructor(hasPresence?: boolean);
        }
        class String extends pbandk.FieldDescriptor.Type.Primitive<string> {
          constructor(hasPresence?: boolean);
        }
        class Bytes extends pbandk.FieldDescriptor.Type.Primitive<pbandk.ByteArr> {
          constructor(hasPresence?: boolean);
        }
        class UInt32 extends pbandk.FieldDescriptor.Type.Primitive<number> {
          constructor(hasPresence?: boolean);
        }
        class SFixed32 extends pbandk.FieldDescriptor.Type.Primitive<number> {
          constructor(hasPresence?: boolean);
        }
        class SFixed64 extends pbandk.FieldDescriptor.Type.Primitive<any /* kotlin.Long */> {
          constructor(hasPresence?: boolean);
        }
        class SInt32 extends pbandk.FieldDescriptor.Type.Primitive<number> {
          constructor(hasPresence?: boolean);
        }
        class SInt64 extends pbandk.FieldDescriptor.Type.Primitive<any /* kotlin.Long */> {
          constructor(hasPresence?: boolean);
        }
      }
      class Message<T extends unknown /* pbandk.Message */> extends pbandk.FieldDescriptor.Type {
        constructor(messageCompanion: any /* pbandk.Message.Companion<T> */);
      }
      class Enum<T extends unknown /* pbandk.Message.Enum */> extends pbandk.FieldDescriptor.Type {
        constructor(enumCompanion: any /* pbandk.Message.Enum.Companion<T> */, hasPresence?: boolean);
      }
      class Repeated<T extends any> extends pbandk.FieldDescriptor.Type {
        constructor(valueType: pbandk.FieldDescriptor.Type, packed?: boolean);
        get packed(): boolean;
      }
      class Map<K, V> extends pbandk.FieldDescriptor.Type {
        constructor(keyType: pbandk.FieldDescriptor.Type, valueType: pbandk.FieldDescriptor.Type);
      }
    }
  }
}
export declare namespace pbandk {
  class InvalidProtocolBufferException /* extends kotlin.RuntimeException */ {
    private constructor();
    static get Companion(): {
      missingRequiredField(fieldName: string): pbandk.InvalidProtocolBufferException;
    };
  }
}
export declare namespace pbandk {
  class ListWithSize<T> /* implements kotlin.collections.List<T> */ {
    private constructor();
    get list(): any /* kotlin.collections.List<T> */;
    get protoSize(): Nullable<number>;
    static initWithSizeFn<T>(
      list: any /* kotlin.collections.List<T> */,
      sizeFn: (p0: T) => number,
    ): pbandk.ListWithSize<T>;
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
  }
  namespace ListWithSize {
    class Builder<T> /* implements kotlin.collections.MutableList<T> */ {
      private constructor();
      get list(): any /* kotlin.collections.ArrayList<T> */;
      static init<T>(): pbandk.ListWithSize.Builder<T>;
      fixed(): pbandk.ListWithSize<T>;
      static get Companion(): {
        fixed<T>(bld: Nullable<pbandk.ListWithSize.Builder<T>>): pbandk.ListWithSize<T>;
      };
    }
  }
}
export declare namespace pbandk {
  function encodeWith<T extends unknown /* pbandk.Message */>(_this_: T, m: any /* pbandk.MessageEncoder */): void;
  function encodeToByteArray<T extends unknown /* pbandk.Message */>(_this_: T): Int8Array;
  function decodeFromByteArray<T extends unknown /* pbandk.Message */>(
    _this_: any /* pbandk.Message.Companion<T> */,
    arr: Int8Array,
  ): T;
  function plus<T extends unknown /* pbandk.Message */>(_this_: Nullable<T>, other: Nullable<T>): Nullable<T>;
}
export declare namespace pbandk {
  class MessageDescriptor<T extends unknown /* pbandk.Message */> {
    constructor(
      fullName: string,
      messageClass: any /* kotlin.reflect.KClass<T> */,
      messageCompanion: any /* pbandk.Message.Companion<T> */,
      fields: any /* kotlin.collections.Collection<pbandk.FieldDescriptor<T, UnknownType *>> */,
    );
    get fullName(): string;
    get messageCompanion(): any /* pbandk.Message.Companion<T> */;
    get fields(): any /* kotlin.collections.Collection<pbandk.FieldDescriptor<T, UnknownType *>> */;
    get name(): string;
  }
}
export declare namespace pbandk {
  class MessageMap<K, V> /* extends kotlin.collections.AbstractMap<K, V> */ {
    private constructor();
  }
  namespace MessageMap {
    class Builder<K, V> {
      constructor();
      get entries(): any /* kotlin.collections.MutableSet<pbandk.MessageMap.Entry<K, V>> */;
      fixed(): pbandk.MessageMap<K, V>;
      static get Companion(): {
        fixed<K, V>(bld: Nullable<pbandk.MessageMap.Builder<K, V>>): pbandk.MessageMap<K, V>;
      };
    }
    class Entry<K, V> /* implements kotlin.collections.Map.Entry<K, V>, pbandk.Message */ {
      constructor(
        key: K,
        value: V,
        companion: pbandk.MessageMap.Entry.Companion<K, V>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
    }
    namespace Entry {
      class Companion<K, V> /* implements pbandk.Message.Companion<pbandk.MessageMap.Entry<K, V>> */ {
        constructor(keyType: pbandk.FieldDescriptor.Type, valueType: pbandk.FieldDescriptor.Type);
      }
    }
  }
}
export declare namespace pbandk {
  class UnknownField {
    constructor(fieldNum: number, values: any /* kotlin.collections.List<pbandk.UnknownField.Value> */);
    get fieldNum(): number;
    get values(): any /* kotlin.collections.List<pbandk.UnknownField.Value> */;
    copy(fieldNum?: number, values?: any /* kotlin.collections.List<pbandk.UnknownField.Value> */): pbandk.UnknownField;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
  }
  namespace UnknownField {
    class Value {
      constructor(wireType: number, rawBytes: pbandk.ByteArr);
      get wireType(): number;
      get rawBytes(): pbandk.ByteArr;
      static fromByteArray(wireType: number, rawBytes: Int8Array): pbandk.UnknownField.Value;
      copy(wireType?: number, rawBytes?: pbandk.ByteArr): pbandk.UnknownField.Value;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
    }
  }
}
export declare namespace pbandk.json {
  class JsonConfig {
    constructor(
      outputProtoFieldNames?: boolean,
      outputDefaultValues?: boolean,
      outputDefaultStringsAsNull?: boolean,
      compactOutput?: boolean,
      ignoreUnknownFieldsInInput?: boolean,
      typeRegistry?: any /* pbandk.TypeRegistry */,
    );
    get outputProtoFieldNames(): boolean;
    get outputDefaultValues(): boolean;
    /** @deprecated This option only exists for backwards-compatibility reasons. It should not be used by new code and will eventually be removed. */
    get outputDefaultStringsAsNull(): boolean;
    get compactOutput(): boolean;
    get ignoreUnknownFieldsInInput(): boolean;
    get typeRegistry(): any /* pbandk.TypeRegistry */;
    copy(
      outputProtoFieldNames?: boolean,
      outputDefaultValues?: boolean,
      outputDefaultStringsAsNull?: boolean,
      compactOutput?: boolean,
      ignoreUnknownFieldsInInput?: boolean,
      typeRegistry?: any /* pbandk.TypeRegistry */,
    ): pbandk.json.JsonConfig;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get DEFAULT(): pbandk.json.JsonConfig;
    };
  }
}
export declare namespace pbandk.json {
  function encodeToJsonString<T extends unknown /* pbandk.Message */>(
    _this_: T,
    jsonConfig?: pbandk.json.JsonConfig,
  ): string;
  function decodeFromJsonString<T extends unknown /* pbandk.Message */>(
    _this_: any /* pbandk.Message.Companion<T> */,
    data: string,
    jsonConfig?: pbandk.json.JsonConfig,
  ): T;
}
export declare namespace pbandk.wkt {
  class Any /* implements pbandk.Message */ {
    constructor(
      typeUrl?: string,
      value?: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get typeUrl(): string;
    get value(): pbandk.ByteArr;
    copy(
      typeUrl?: string,
      value?: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Any;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Any;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Any> */;
  }
  function orDefaultForAny(_this_: Nullable<pbandk.wkt.Any>): pbandk.wkt.Any;
}
export declare namespace pbandk.wkt {
  class Api /* implements pbandk.Message */ {
    constructor(
      name?: string,
      methods?: any /* kotlin.collections.List<pbandk.wkt.Method> */,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      version?: string,
      sourceContext?: Nullable<pbandk.wkt.SourceContext>,
      mixins?: any /* kotlin.collections.List<pbandk.wkt.Mixin> */,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): string;
    get methods(): any /* kotlin.collections.List<pbandk.wkt.Method> */;
    get options(): any /* kotlin.collections.List<pbandk.wkt.Option> */;
    get version(): string;
    get sourceContext(): Nullable<pbandk.wkt.SourceContext>;
    get mixins(): any /* kotlin.collections.List<pbandk.wkt.Mixin> */;
    get syntax(): pbandk.wkt.Syntax;
    copy(
      name?: string,
      methods?: any /* kotlin.collections.List<pbandk.wkt.Method> */,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      version?: string,
      sourceContext?: Nullable<pbandk.wkt.SourceContext>,
      mixins?: any /* kotlin.collections.List<pbandk.wkt.Mixin> */,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Api;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Api;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Api> */;
  }
  class Method /* implements pbandk.Message */ {
    constructor(
      name?: string,
      requestTypeUrl?: string,
      requestStreaming?: boolean,
      responseTypeUrl?: string,
      responseStreaming?: boolean,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): string;
    get requestTypeUrl(): string;
    get requestStreaming(): boolean;
    get responseTypeUrl(): string;
    get responseStreaming(): boolean;
    get options(): any /* kotlin.collections.List<pbandk.wkt.Option> */;
    get syntax(): pbandk.wkt.Syntax;
    copy(
      name?: string,
      requestTypeUrl?: string,
      requestStreaming?: boolean,
      responseTypeUrl?: string,
      responseStreaming?: boolean,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Method;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Method;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Method> */;
  }
  class Mixin /* implements pbandk.Message */ {
    constructor(
      name?: string,
      root?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): string;
    get root(): string;
    copy(
      name?: string,
      root?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Mixin;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Mixin;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Mixin> */;
  }
  function orDefaultForApi(_this_: Nullable<pbandk.wkt.Api>): pbandk.wkt.Api;
  function orDefaultForMethod(_this_: Nullable<pbandk.wkt.Method>): pbandk.wkt.Method;
  function orDefaultForMixin(_this_: Nullable<pbandk.wkt.Mixin>): pbandk.wkt.Mixin;
}
export declare namespace pbandk.wkt {
  class FileDescriptorSet /* implements pbandk.Message */ {
    constructor(
      file?: any /* kotlin.collections.List<pbandk.wkt.FileDescriptorProto> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get file(): any /* kotlin.collections.List<pbandk.wkt.FileDescriptorProto> */;
    copy(
      file?: any /* kotlin.collections.List<pbandk.wkt.FileDescriptorProto> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.FileDescriptorSet;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.FileDescriptorSet;
    } & any /* pbandk.Message.Companion<pbandk.wkt.FileDescriptorSet> */;
  }
  class FileDescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      _package?: Nullable<string>,
      dependency?: any /* kotlin.collections.List<string> */,
      publicDependency?: any /* kotlin.collections.List<number> */,
      weakDependency?: any /* kotlin.collections.List<number> */,
      messageType?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto> */,
      enumType?: any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto> */,
      service?: any /* kotlin.collections.List<pbandk.wkt.ServiceDescriptorProto> */,
      extension?: any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */,
      options?: Nullable<pbandk.wkt.FileOptions>,
      sourceCodeInfo?: Nullable<pbandk.wkt.SourceCodeInfo>,
      syntax?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get package(): Nullable<string>;
    get dependency(): any /* kotlin.collections.List<string> */;
    get publicDependency(): any /* kotlin.collections.List<number> */;
    get weakDependency(): any /* kotlin.collections.List<number> */;
    get messageType(): any /* kotlin.collections.List<pbandk.wkt.DescriptorProto> */;
    get enumType(): any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto> */;
    get service(): any /* kotlin.collections.List<pbandk.wkt.ServiceDescriptorProto> */;
    get extension(): any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */;
    get options(): Nullable<pbandk.wkt.FileOptions>;
    get sourceCodeInfo(): Nullable<pbandk.wkt.SourceCodeInfo>;
    get syntax(): Nullable<string>;
    copy(
      name?: Nullable<string>,
      _package?: Nullable<string>,
      dependency?: any /* kotlin.collections.List<string> */,
      publicDependency?: any /* kotlin.collections.List<number> */,
      weakDependency?: any /* kotlin.collections.List<number> */,
      messageType?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto> */,
      enumType?: any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto> */,
      service?: any /* kotlin.collections.List<pbandk.wkt.ServiceDescriptorProto> */,
      extension?: any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */,
      options?: Nullable<pbandk.wkt.FileOptions>,
      sourceCodeInfo?: Nullable<pbandk.wkt.SourceCodeInfo>,
      syntax?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.FileDescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.FileDescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.FileDescriptorProto> */;
  }
  class DescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      field?: any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */,
      extension?: any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */,
      nestedType?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto> */,
      enumType?: any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto> */,
      extensionRange?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto.ExtensionRange> */,
      oneofDecl?: any /* kotlin.collections.List<pbandk.wkt.OneofDescriptorProto> */,
      options?: Nullable<pbandk.wkt.MessageOptions>,
      reservedRange?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto.ReservedRange> */,
      reservedName?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get field(): any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */;
    get extension(): any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */;
    get nestedType(): any /* kotlin.collections.List<pbandk.wkt.DescriptorProto> */;
    get enumType(): any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto> */;
    get extensionRange(): any /* kotlin.collections.List<pbandk.wkt.DescriptorProto.ExtensionRange> */;
    get oneofDecl(): any /* kotlin.collections.List<pbandk.wkt.OneofDescriptorProto> */;
    get options(): Nullable<pbandk.wkt.MessageOptions>;
    get reservedRange(): any /* kotlin.collections.List<pbandk.wkt.DescriptorProto.ReservedRange> */;
    get reservedName(): any /* kotlin.collections.List<string> */;
    copy(
      name?: Nullable<string>,
      field?: any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */,
      extension?: any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto> */,
      nestedType?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto> */,
      enumType?: any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto> */,
      extensionRange?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto.ExtensionRange> */,
      oneofDecl?: any /* kotlin.collections.List<pbandk.wkt.OneofDescriptorProto> */,
      options?: Nullable<pbandk.wkt.MessageOptions>,
      reservedRange?: any /* kotlin.collections.List<pbandk.wkt.DescriptorProto.ReservedRange> */,
      reservedName?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.DescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.DescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.DescriptorProto> */;
  }
  namespace DescriptorProto {
    class ExtensionRange /* implements pbandk.Message */ {
      constructor(
        start?: Nullable<number>,
        end?: Nullable<number>,
        options?: Nullable<pbandk.wkt.ExtensionRangeOptions>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get start(): Nullable<number>;
      get end(): Nullable<number>;
      get options(): Nullable<pbandk.wkt.ExtensionRangeOptions>;
      copy(
        start?: Nullable<number>,
        end?: Nullable<number>,
        options?: Nullable<pbandk.wkt.ExtensionRangeOptions>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): pbandk.wkt.DescriptorProto.ExtensionRange;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): pbandk.wkt.DescriptorProto.ExtensionRange;
      } & any /* pbandk.Message.Companion<pbandk.wkt.DescriptorProto.ExtensionRange> */;
    }
    class ReservedRange /* implements pbandk.Message */ {
      constructor(
        start?: Nullable<number>,
        end?: Nullable<number>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get start(): Nullable<number>;
      get end(): Nullable<number>;
      copy(
        start?: Nullable<number>,
        end?: Nullable<number>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): pbandk.wkt.DescriptorProto.ReservedRange;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): pbandk.wkt.DescriptorProto.ReservedRange;
      } & any /* pbandk.Message.Companion<pbandk.wkt.DescriptorProto.ReservedRange> */;
    }
  }
  class ExtensionRangeOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.ExtensionRangeOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.ExtensionRangeOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.ExtensionRangeOptions> */;
  }
  class FieldDescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      number?: Nullable<number>,
      label?: Nullable<pbandk.wkt.FieldDescriptorProto.Label>,
      type?: Nullable<pbandk.wkt.FieldDescriptorProto.Type>,
      typeName?: Nullable<string>,
      extendee?: Nullable<string>,
      defaultValue?: Nullable<string>,
      oneofIndex?: Nullable<number>,
      jsonName?: Nullable<string>,
      options?: Nullable<pbandk.wkt.FieldOptions>,
      proto3Optional?: Nullable<boolean>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get number(): Nullable<number>;
    get label(): Nullable<pbandk.wkt.FieldDescriptorProto.Label>;
    get type(): Nullable<pbandk.wkt.FieldDescriptorProto.Type>;
    get typeName(): Nullable<string>;
    get extendee(): Nullable<string>;
    get defaultValue(): Nullable<string>;
    get oneofIndex(): Nullable<number>;
    get jsonName(): Nullable<string>;
    get options(): Nullable<pbandk.wkt.FieldOptions>;
    get proto3Optional(): Nullable<boolean>;
    copy(
      name?: Nullable<string>,
      number?: Nullable<number>,
      label?: Nullable<pbandk.wkt.FieldDescriptorProto.Label>,
      type?: Nullable<pbandk.wkt.FieldDescriptorProto.Type>,
      typeName?: Nullable<string>,
      extendee?: Nullable<string>,
      defaultValue?: Nullable<string>,
      oneofIndex?: Nullable<number>,
      jsonName?: Nullable<string>,
      options?: Nullable<pbandk.wkt.FieldOptions>,
      proto3Optional?: Nullable<boolean>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.FieldDescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.FieldDescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.FieldDescriptorProto> */;
  }
  namespace FieldDescriptorProto {
    abstract class Type /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get DOUBLE(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get FLOAT(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get INT64(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get UINT64(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get INT32(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get FIXED64(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get FIXED32(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get BOOL(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get STRING(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get GROUP(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get MESSAGE(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get BYTES(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get UINT32(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get ENUM(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get SFIXED32(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get SFIXED64(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get SINT32(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get SINT64(): {} & pbandk.wkt.FieldDescriptorProto.Type;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto.Type> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.FieldDescriptorProto.Type> */;
    }
    namespace Type {
      class UNRECOGNIZED extends pbandk.wkt.FieldDescriptorProto.Type {
        constructor(value: number);
      }
    }
    abstract class Label /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get OPTIONAL(): {} & pbandk.wkt.FieldDescriptorProto.Label;
      static get REQUIRED(): {} & pbandk.wkt.FieldDescriptorProto.Label;
      static get REPEATED(): {} & pbandk.wkt.FieldDescriptorProto.Label;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.FieldDescriptorProto.Label> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.FieldDescriptorProto.Label> */;
    }
    namespace Label {
      class UNRECOGNIZED extends pbandk.wkt.FieldDescriptorProto.Label {
        constructor(value: number);
      }
    }
  }
  class OneofDescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      options?: Nullable<pbandk.wkt.OneofOptions>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get options(): Nullable<pbandk.wkt.OneofOptions>;
    copy(
      name?: Nullable<string>,
      options?: Nullable<pbandk.wkt.OneofOptions>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.OneofDescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.OneofDescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.OneofDescriptorProto> */;
  }
  class EnumDescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      value?: any /* kotlin.collections.List<pbandk.wkt.EnumValueDescriptorProto> */,
      options?: Nullable<pbandk.wkt.EnumOptions>,
      reservedRange?: any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto.EnumReservedRange> */,
      reservedName?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get value(): any /* kotlin.collections.List<pbandk.wkt.EnumValueDescriptorProto> */;
    get options(): Nullable<pbandk.wkt.EnumOptions>;
    get reservedRange(): any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto.EnumReservedRange> */;
    get reservedName(): any /* kotlin.collections.List<string> */;
    copy(
      name?: Nullable<string>,
      value?: any /* kotlin.collections.List<pbandk.wkt.EnumValueDescriptorProto> */,
      options?: Nullable<pbandk.wkt.EnumOptions>,
      reservedRange?: any /* kotlin.collections.List<pbandk.wkt.EnumDescriptorProto.EnumReservedRange> */,
      reservedName?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.EnumDescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.EnumDescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.EnumDescriptorProto> */;
  }
  namespace EnumDescriptorProto {
    class EnumReservedRange /* implements pbandk.Message */ {
      constructor(
        start?: Nullable<number>,
        end?: Nullable<number>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get start(): Nullable<number>;
      get end(): Nullable<number>;
      copy(
        start?: Nullable<number>,
        end?: Nullable<number>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): pbandk.wkt.EnumDescriptorProto.EnumReservedRange;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): pbandk.wkt.EnumDescriptorProto.EnumReservedRange;
      } & any /* pbandk.Message.Companion<pbandk.wkt.EnumDescriptorProto.EnumReservedRange> */;
    }
  }
  class EnumValueDescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      number?: Nullable<number>,
      options?: Nullable<pbandk.wkt.EnumValueOptions>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get number(): Nullable<number>;
    get options(): Nullable<pbandk.wkt.EnumValueOptions>;
    copy(
      name?: Nullable<string>,
      number?: Nullable<number>,
      options?: Nullable<pbandk.wkt.EnumValueOptions>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.EnumValueDescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.EnumValueDescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.EnumValueDescriptorProto> */;
  }
  class ServiceDescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      method?: any /* kotlin.collections.List<pbandk.wkt.MethodDescriptorProto> */,
      options?: Nullable<pbandk.wkt.ServiceOptions>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get method(): any /* kotlin.collections.List<pbandk.wkt.MethodDescriptorProto> */;
    get options(): Nullable<pbandk.wkt.ServiceOptions>;
    copy(
      name?: Nullable<string>,
      method?: any /* kotlin.collections.List<pbandk.wkt.MethodDescriptorProto> */,
      options?: Nullable<pbandk.wkt.ServiceOptions>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.ServiceDescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.ServiceDescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.ServiceDescriptorProto> */;
  }
  class MethodDescriptorProto /* implements pbandk.Message */ {
    constructor(
      name?: Nullable<string>,
      inputType?: Nullable<string>,
      outputType?: Nullable<string>,
      options?: Nullable<pbandk.wkt.MethodOptions>,
      clientStreaming?: Nullable<boolean>,
      serverStreaming?: Nullable<boolean>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): Nullable<string>;
    get inputType(): Nullable<string>;
    get outputType(): Nullable<string>;
    get options(): Nullable<pbandk.wkt.MethodOptions>;
    get clientStreaming(): Nullable<boolean>;
    get serverStreaming(): Nullable<boolean>;
    copy(
      name?: Nullable<string>,
      inputType?: Nullable<string>,
      outputType?: Nullable<string>,
      options?: Nullable<pbandk.wkt.MethodOptions>,
      clientStreaming?: Nullable<boolean>,
      serverStreaming?: Nullable<boolean>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.MethodDescriptorProto;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.MethodDescriptorProto;
    } & any /* pbandk.Message.Companion<pbandk.wkt.MethodDescriptorProto> */;
  }
  class FileOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      javaPackage?: Nullable<string>,
      javaOuterClassname?: Nullable<string>,
      javaMultipleFiles?: Nullable<boolean>,
      javaGenerateEqualsAndHash?: Nullable<boolean>,
      javaStringCheckUtf8?: Nullable<boolean>,
      optimizeFor?: Nullable<pbandk.wkt.FileOptions.OptimizeMode>,
      goPackage?: Nullable<string>,
      ccGenericServices?: Nullable<boolean>,
      javaGenericServices?: Nullable<boolean>,
      pyGenericServices?: Nullable<boolean>,
      phpGenericServices?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      ccEnableArenas?: Nullable<boolean>,
      objcClassPrefix?: Nullable<string>,
      csharpNamespace?: Nullable<string>,
      swiftPrefix?: Nullable<string>,
      phpClassPrefix?: Nullable<string>,
      phpNamespace?: Nullable<string>,
      phpMetadataNamespace?: Nullable<string>,
      rubyPackage?: Nullable<string>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get javaPackage(): Nullable<string>;
    get javaOuterClassname(): Nullable<string>;
    get javaMultipleFiles(): Nullable<boolean>;
    /** @deprecated Field marked deprecated in google/protobuf/descriptor.proto */
    get javaGenerateEqualsAndHash(): Nullable<boolean>;
    get javaStringCheckUtf8(): Nullable<boolean>;
    get optimizeFor(): Nullable<pbandk.wkt.FileOptions.OptimizeMode>;
    get goPackage(): Nullable<string>;
    get ccGenericServices(): Nullable<boolean>;
    get javaGenericServices(): Nullable<boolean>;
    get pyGenericServices(): Nullable<boolean>;
    get phpGenericServices(): Nullable<boolean>;
    get deprecated(): Nullable<boolean>;
    get ccEnableArenas(): Nullable<boolean>;
    get objcClassPrefix(): Nullable<string>;
    get csharpNamespace(): Nullable<string>;
    get swiftPrefix(): Nullable<string>;
    get phpClassPrefix(): Nullable<string>;
    get phpNamespace(): Nullable<string>;
    get phpMetadataNamespace(): Nullable<string>;
    get rubyPackage(): Nullable<string>;
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      javaPackage?: Nullable<string>,
      javaOuterClassname?: Nullable<string>,
      javaMultipleFiles?: Nullable<boolean>,
      javaGenerateEqualsAndHash?: Nullable<boolean>,
      javaStringCheckUtf8?: Nullable<boolean>,
      optimizeFor?: Nullable<pbandk.wkt.FileOptions.OptimizeMode>,
      goPackage?: Nullable<string>,
      ccGenericServices?: Nullable<boolean>,
      javaGenericServices?: Nullable<boolean>,
      pyGenericServices?: Nullable<boolean>,
      phpGenericServices?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      ccEnableArenas?: Nullable<boolean>,
      objcClassPrefix?: Nullable<string>,
      csharpNamespace?: Nullable<string>,
      swiftPrefix?: Nullable<string>,
      phpClassPrefix?: Nullable<string>,
      phpNamespace?: Nullable<string>,
      phpMetadataNamespace?: Nullable<string>,
      rubyPackage?: Nullable<string>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.FileOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.FileOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.FileOptions> */;
  }
  namespace FileOptions {
    abstract class OptimizeMode /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get SPEED(): {} & pbandk.wkt.FileOptions.OptimizeMode;
      static get CODE_SIZE(): {} & pbandk.wkt.FileOptions.OptimizeMode;
      static get LITE_RUNTIME(): {} & pbandk.wkt.FileOptions.OptimizeMode;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.FileOptions.OptimizeMode> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.FileOptions.OptimizeMode> */;
    }
    namespace OptimizeMode {
      class UNRECOGNIZED extends pbandk.wkt.FileOptions.OptimizeMode {
        constructor(value: number);
      }
    }
  }
  class MessageOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      messageSetWireFormat?: Nullable<boolean>,
      noStandardDescriptorAccessor?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      mapEntry?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get messageSetWireFormat(): Nullable<boolean>;
    get noStandardDescriptorAccessor(): Nullable<boolean>;
    get deprecated(): Nullable<boolean>;
    get mapEntry(): Nullable<boolean>;
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      messageSetWireFormat?: Nullable<boolean>,
      noStandardDescriptorAccessor?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      mapEntry?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.MessageOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.MessageOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.MessageOptions> */;
  }
  class FieldOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      ctype?: Nullable<pbandk.wkt.FieldOptions.CType>,
      packed?: Nullable<boolean>,
      jstype?: Nullable<pbandk.wkt.FieldOptions.JSType>,
      lazy?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      weak?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get ctype(): Nullable<pbandk.wkt.FieldOptions.CType>;
    get packed(): Nullable<boolean>;
    get jstype(): Nullable<pbandk.wkt.FieldOptions.JSType>;
    get lazy(): Nullable<boolean>;
    get deprecated(): Nullable<boolean>;
    get weak(): Nullable<boolean>;
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      ctype?: Nullable<pbandk.wkt.FieldOptions.CType>,
      packed?: Nullable<boolean>,
      jstype?: Nullable<pbandk.wkt.FieldOptions.JSType>,
      lazy?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      weak?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.FieldOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.FieldOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.FieldOptions> */;
  }
  namespace FieldOptions {
    abstract class CType /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get STRING(): {} & pbandk.wkt.FieldOptions.CType;
      static get CORD(): {} & pbandk.wkt.FieldOptions.CType;
      static get STRING_PIECE(): {} & pbandk.wkt.FieldOptions.CType;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.FieldOptions.CType> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.FieldOptions.CType> */;
    }
    namespace CType {
      class UNRECOGNIZED extends pbandk.wkt.FieldOptions.CType {
        constructor(value: number);
      }
    }
    abstract class JSType /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get JS_NORMAL(): {} & pbandk.wkt.FieldOptions.JSType;
      static get JS_STRING(): {} & pbandk.wkt.FieldOptions.JSType;
      static get JS_NUMBER(): {} & pbandk.wkt.FieldOptions.JSType;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.FieldOptions.JSType> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.FieldOptions.JSType> */;
    }
    namespace JSType {
      class UNRECOGNIZED extends pbandk.wkt.FieldOptions.JSType {
        constructor(value: number);
      }
    }
  }
  class OneofOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.OneofOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.OneofOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.OneofOptions> */;
  }
  class EnumOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      allowAlias?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get allowAlias(): Nullable<boolean>;
    get deprecated(): Nullable<boolean>;
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      allowAlias?: Nullable<boolean>,
      deprecated?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.EnumOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.EnumOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.EnumOptions> */;
  }
  class EnumValueOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      deprecated?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get deprecated(): Nullable<boolean>;
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      deprecated?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.EnumValueOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.EnumValueOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.EnumValueOptions> */;
  }
  class ServiceOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      deprecated?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get deprecated(): Nullable<boolean>;
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      deprecated?: Nullable<boolean>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.ServiceOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.ServiceOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.ServiceOptions> */;
  }
  class MethodOptions /* implements pbandk.ExtendableMessage */ {
    constructor(
      deprecated?: Nullable<boolean>,
      idempotencyLevel?: Nullable<pbandk.wkt.MethodOptions.IdempotencyLevel>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    );
    get deprecated(): Nullable<boolean>;
    get idempotencyLevel(): Nullable<pbandk.wkt.MethodOptions.IdempotencyLevel>;
    get uninterpretedOption(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */;
    copy(
      deprecated?: Nullable<boolean>,
      idempotencyLevel?: Nullable<pbandk.wkt.MethodOptions.IdempotencyLevel>,
      uninterpretedOption?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      extensionFields?: any /* pbandk.ExtensionFieldSet */,
    ): pbandk.wkt.MethodOptions;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.MethodOptions;
    } & any /* pbandk.Message.Companion<pbandk.wkt.MethodOptions> */;
  }
  namespace MethodOptions {
    abstract class IdempotencyLevel /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get IDEMPOTENCY_UNKNOWN(): {} & pbandk.wkt.MethodOptions.IdempotencyLevel;
      static get NO_SIDE_EFFECTS(): {} & pbandk.wkt.MethodOptions.IdempotencyLevel;
      static get IDEMPOTENT(): {} & pbandk.wkt.MethodOptions.IdempotencyLevel;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.MethodOptions.IdempotencyLevel> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.MethodOptions.IdempotencyLevel> */;
    }
    namespace IdempotencyLevel {
      class UNRECOGNIZED extends pbandk.wkt.MethodOptions.IdempotencyLevel {
        constructor(value: number);
      }
    }
  }
  class UninterpretedOption /* implements pbandk.Message */ {
    constructor(
      name?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption.NamePart> */,
      identifierValue?: Nullable<string>,
      positiveIntValue?: Nullable<any> /* Nullable<kotlin.Long> */,
      negativeIntValue?: Nullable<any> /* Nullable<kotlin.Long> */,
      doubleValue?: Nullable<number>,
      stringValue?: Nullable<pbandk.ByteArr>,
      aggregateValue?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption.NamePart> */;
    get identifierValue(): Nullable<string>;
    get positiveIntValue(): Nullable<any> /* Nullable<kotlin.Long> */;
    get negativeIntValue(): Nullable<any> /* Nullable<kotlin.Long> */;
    get doubleValue(): Nullable<number>;
    get stringValue(): Nullable<pbandk.ByteArr>;
    get aggregateValue(): Nullable<string>;
    copy(
      name?: any /* kotlin.collections.List<pbandk.wkt.UninterpretedOption.NamePart> */,
      identifierValue?: Nullable<string>,
      positiveIntValue?: Nullable<any> /* Nullable<kotlin.Long> */,
      negativeIntValue?: Nullable<any> /* Nullable<kotlin.Long> */,
      doubleValue?: Nullable<number>,
      stringValue?: Nullable<pbandk.ByteArr>,
      aggregateValue?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.UninterpretedOption;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.UninterpretedOption;
    } & any /* pbandk.Message.Companion<pbandk.wkt.UninterpretedOption> */;
  }
  namespace UninterpretedOption {
    class NamePart /* implements pbandk.Message */ {
      constructor(
        namePart: string,
        isExtension: boolean,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get namePart(): string;
      get isExtension(): boolean;
      copy(
        namePart?: string,
        isExtension?: boolean,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): pbandk.wkt.UninterpretedOption.NamePart;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {} & any /* pbandk.Message.Companion<pbandk.wkt.UninterpretedOption.NamePart> */;
    }
  }
  class SourceCodeInfo /* implements pbandk.Message */ {
    constructor(
      location?: any /* kotlin.collections.List<pbandk.wkt.SourceCodeInfo.Location> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get location(): any /* kotlin.collections.List<pbandk.wkt.SourceCodeInfo.Location> */;
    copy(
      location?: any /* kotlin.collections.List<pbandk.wkt.SourceCodeInfo.Location> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.SourceCodeInfo;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.SourceCodeInfo;
    } & any /* pbandk.Message.Companion<pbandk.wkt.SourceCodeInfo> */;
  }
  namespace SourceCodeInfo {
    class Location /* implements pbandk.Message */ {
      constructor(
        path?: any /* kotlin.collections.List<number> */,
        span?: any /* kotlin.collections.List<number> */,
        leadingComments?: Nullable<string>,
        trailingComments?: Nullable<string>,
        leadingDetachedComments?: any /* kotlin.collections.List<string> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get path(): any /* kotlin.collections.List<number> */;
      get span(): any /* kotlin.collections.List<number> */;
      get leadingComments(): Nullable<string>;
      get trailingComments(): Nullable<string>;
      get leadingDetachedComments(): any /* kotlin.collections.List<string> */;
      copy(
        path?: any /* kotlin.collections.List<number> */,
        span?: any /* kotlin.collections.List<number> */,
        leadingComments?: Nullable<string>,
        trailingComments?: Nullable<string>,
        leadingDetachedComments?: any /* kotlin.collections.List<string> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): pbandk.wkt.SourceCodeInfo.Location;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): pbandk.wkt.SourceCodeInfo.Location;
      } & any /* pbandk.Message.Companion<pbandk.wkt.SourceCodeInfo.Location> */;
    }
  }
  class GeneratedCodeInfo /* implements pbandk.Message */ {
    constructor(
      annotation?: any /* kotlin.collections.List<pbandk.wkt.GeneratedCodeInfo.Annotation> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get annotation(): any /* kotlin.collections.List<pbandk.wkt.GeneratedCodeInfo.Annotation> */;
    copy(
      annotation?: any /* kotlin.collections.List<pbandk.wkt.GeneratedCodeInfo.Annotation> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.GeneratedCodeInfo;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.GeneratedCodeInfo;
    } & any /* pbandk.Message.Companion<pbandk.wkt.GeneratedCodeInfo> */;
  }
  namespace GeneratedCodeInfo {
    class Annotation /* implements pbandk.Message */ {
      constructor(
        path?: any /* kotlin.collections.List<number> */,
        sourceFile?: Nullable<string>,
        begin?: Nullable<number>,
        end?: Nullable<number>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get path(): any /* kotlin.collections.List<number> */;
      get sourceFile(): Nullable<string>;
      get begin(): Nullable<number>;
      get end(): Nullable<number>;
      copy(
        path?: any /* kotlin.collections.List<number> */,
        sourceFile?: Nullable<string>,
        begin?: Nullable<number>,
        end?: Nullable<number>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): pbandk.wkt.GeneratedCodeInfo.Annotation;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): pbandk.wkt.GeneratedCodeInfo.Annotation;
      } & any /* pbandk.Message.Companion<pbandk.wkt.GeneratedCodeInfo.Annotation> */;
    }
  }
  function orDefaultForFileDescriptorSet(_this_: Nullable<pbandk.wkt.FileDescriptorSet>): pbandk.wkt.FileDescriptorSet;
  function orDefaultForFileDescriptorProto(
    _this_: Nullable<pbandk.wkt.FileDescriptorProto>,
  ): pbandk.wkt.FileDescriptorProto;
  function orDefaultForDescriptorProto(_this_: Nullable<pbandk.wkt.DescriptorProto>): pbandk.wkt.DescriptorProto;
  function orDefaultForDescriptorProtoExtensionRange(
    _this_: Nullable<pbandk.wkt.DescriptorProto.ExtensionRange>,
  ): pbandk.wkt.DescriptorProto.ExtensionRange;
  function orDefaultForDescriptorProtoReservedRange(
    _this_: Nullable<pbandk.wkt.DescriptorProto.ReservedRange>,
  ): pbandk.wkt.DescriptorProto.ReservedRange;
  function orDefaultForExtensionRangeOptions(
    _this_: Nullable<pbandk.wkt.ExtensionRangeOptions>,
  ): pbandk.wkt.ExtensionRangeOptions;
  function orDefaultForFieldDescriptorProto(
    _this_: Nullable<pbandk.wkt.FieldDescriptorProto>,
  ): pbandk.wkt.FieldDescriptorProto;
  function orDefaultForOneofDescriptorProto(
    _this_: Nullable<pbandk.wkt.OneofDescriptorProto>,
  ): pbandk.wkt.OneofDescriptorProto;
  function orDefaultForEnumDescriptorProto(
    _this_: Nullable<pbandk.wkt.EnumDescriptorProto>,
  ): pbandk.wkt.EnumDescriptorProto;
  function orDefaultForEnumDescriptorProtoEnumReservedRange(
    _this_: Nullable<pbandk.wkt.EnumDescriptorProto.EnumReservedRange>,
  ): pbandk.wkt.EnumDescriptorProto.EnumReservedRange;
  function orDefaultForEnumValueDescriptorProto(
    _this_: Nullable<pbandk.wkt.EnumValueDescriptorProto>,
  ): pbandk.wkt.EnumValueDescriptorProto;
  function orDefaultForServiceDescriptorProto(
    _this_: Nullable<pbandk.wkt.ServiceDescriptorProto>,
  ): pbandk.wkt.ServiceDescriptorProto;
  function orDefaultForMethodDescriptorProto(
    _this_: Nullable<pbandk.wkt.MethodDescriptorProto>,
  ): pbandk.wkt.MethodDescriptorProto;
  function orDefaultForFileOptions(_this_: Nullable<pbandk.wkt.FileOptions>): pbandk.wkt.FileOptions;
  function orDefaultForMessageOptions(_this_: Nullable<pbandk.wkt.MessageOptions>): pbandk.wkt.MessageOptions;
  function orDefaultForFieldOptions(_this_: Nullable<pbandk.wkt.FieldOptions>): pbandk.wkt.FieldOptions;
  function orDefaultForOneofOptions(_this_: Nullable<pbandk.wkt.OneofOptions>): pbandk.wkt.OneofOptions;
  function orDefaultForEnumOptions(_this_: Nullable<pbandk.wkt.EnumOptions>): pbandk.wkt.EnumOptions;
  function orDefaultForEnumValueOptions(_this_: Nullable<pbandk.wkt.EnumValueOptions>): pbandk.wkt.EnumValueOptions;
  function orDefaultForServiceOptions(_this_: Nullable<pbandk.wkt.ServiceOptions>): pbandk.wkt.ServiceOptions;
  function orDefaultForMethodOptions(_this_: Nullable<pbandk.wkt.MethodOptions>): pbandk.wkt.MethodOptions;
  function orDefaultForUninterpretedOption(
    _this_: Nullable<pbandk.wkt.UninterpretedOption>,
  ): pbandk.wkt.UninterpretedOption;
  function orDefaultForSourceCodeInfo(_this_: Nullable<pbandk.wkt.SourceCodeInfo>): pbandk.wkt.SourceCodeInfo;
  function orDefaultForSourceCodeInfoLocation(
    _this_: Nullable<pbandk.wkt.SourceCodeInfo.Location>,
  ): pbandk.wkt.SourceCodeInfo.Location;
  function orDefaultForGeneratedCodeInfo(_this_: Nullable<pbandk.wkt.GeneratedCodeInfo>): pbandk.wkt.GeneratedCodeInfo;
  function orDefaultForGeneratedCodeInfoAnnotation(
    _this_: Nullable<pbandk.wkt.GeneratedCodeInfo.Annotation>,
  ): pbandk.wkt.GeneratedCodeInfo.Annotation;
}
export declare namespace pbandk.wkt {
  class Duration /* implements pbandk.Message */ {
    constructor(
      seconds?: any /* kotlin.Long */,
      nanos?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get seconds(): any /* kotlin.Long */;
    get nanos(): number;
    copy(
      seconds?: any /* kotlin.Long */,
      nanos?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Duration;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Duration;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Duration> */;
  }
  function orDefaultForDuration(_this_: Nullable<pbandk.wkt.Duration>): pbandk.wkt.Duration;
}
export declare namespace pbandk.wkt {
  class Empty /* implements pbandk.Message */ {
    constructor(unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    copy(unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */): pbandk.wkt.Empty;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Empty;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Empty> */;
  }
  function orDefaultForEmpty(_this_: Nullable<pbandk.wkt.Empty>): pbandk.wkt.Empty;
}
export declare namespace pbandk.wkt {
  class FieldMask /* implements pbandk.Message */ {
    constructor(
      paths?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get paths(): any /* kotlin.collections.List<string> */;
    copy(
      paths?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.FieldMask;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.FieldMask;
    } & any /* pbandk.Message.Companion<pbandk.wkt.FieldMask> */;
  }
  function orDefaultForFieldMask(_this_: Nullable<pbandk.wkt.FieldMask>): pbandk.wkt.FieldMask;
}
export declare namespace pbandk.wkt {
  class SourceContext /* implements pbandk.Message */ {
    constructor(fileName?: string, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get fileName(): string;
    copy(
      fileName?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.SourceContext;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.SourceContext;
    } & any /* pbandk.Message.Companion<pbandk.wkt.SourceContext> */;
  }
  function orDefaultForSourceContext(_this_: Nullable<pbandk.wkt.SourceContext>): pbandk.wkt.SourceContext;
}
export declare namespace pbandk.wkt {
  abstract class NullValue /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get NULL_VALUE(): {} & pbandk.wkt.NullValue;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<pbandk.wkt.NullValue> */;
    } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.NullValue> */;
  }
  namespace NullValue {
    class UNRECOGNIZED extends pbandk.wkt.NullValue {
      constructor(value: number);
    }
  }
  class Struct /* implements pbandk.Message */ {
    constructor(
      fields?: any /* kotlin.collections.Map<string, Nullable<pbandk.wkt.Value>> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get fields(): any /* kotlin.collections.Map<string, Nullable<pbandk.wkt.Value>> */;
    copy(
      fields?: any /* kotlin.collections.Map<string, Nullable<pbandk.wkt.Value>> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Struct;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Struct;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Struct> */;
  }
  namespace Struct {
    class FieldsEntry /* implements pbandk.Message, kotlin.collections.Map.Entry<string, Nullable<pbandk.wkt.Value>> */ {
      constructor(
        key?: string,
        value?: Nullable<pbandk.wkt.Value>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      copy(
        key?: string,
        value?: Nullable<pbandk.wkt.Value>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): pbandk.wkt.Struct.FieldsEntry;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): pbandk.wkt.Struct.FieldsEntry;
      } & any /* pbandk.Message.Companion<pbandk.wkt.Struct.FieldsEntry> */;
    }
  }
  class Value /* implements pbandk.Message */ {
    constructor(
      kind?: Nullable<pbandk.wkt.Value.Kind<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get kind(): Nullable<pbandk.wkt.Value.Kind<any /*UnknownType **/>>;
    get nullValue(): Nullable<pbandk.wkt.NullValue>;
    get numberValue(): Nullable<number>;
    get stringValue(): Nullable<string>;
    get boolValue(): Nullable<boolean>;
    get structValue(): Nullable<pbandk.wkt.Struct>;
    get listValue(): Nullable<pbandk.wkt.ListValue>;
    copy(
      kind?: Nullable<pbandk.wkt.Value.Kind<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Value;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Value;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Value> */;
  }
  namespace Value {
    abstract class Kind<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace Kind {
      class NullValue extends pbandk.wkt.Value.Kind<pbandk.wkt.NullValue> {
        constructor(nullValue?: pbandk.wkt.NullValue);
      }
      class NumberValue extends pbandk.wkt.Value.Kind<number> {
        constructor(numberValue?: number);
      }
      class StringValue extends pbandk.wkt.Value.Kind<string> {
        constructor(stringValue?: string);
      }
      class BoolValue extends pbandk.wkt.Value.Kind<boolean> {
        constructor(boolValue?: boolean);
      }
      class StructValue extends pbandk.wkt.Value.Kind<pbandk.wkt.Struct> {
        constructor(structValue: pbandk.wkt.Struct);
      }
      class ListValue extends pbandk.wkt.Value.Kind<pbandk.wkt.ListValue> {
        constructor(listValue: pbandk.wkt.ListValue);
      }
    }
  }
  class ListValue /* implements pbandk.Message */ {
    constructor(
      values?: any /* kotlin.collections.List<pbandk.wkt.Value> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get values(): any /* kotlin.collections.List<pbandk.wkt.Value> */;
    copy(
      values?: any /* kotlin.collections.List<pbandk.wkt.Value> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.ListValue;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.ListValue;
    } & any /* pbandk.Message.Companion<pbandk.wkt.ListValue> */;
  }
  function orDefaultForStruct(_this_: Nullable<pbandk.wkt.Struct>): pbandk.wkt.Struct;
  function orDefaultForStructFieldsEntry(
    _this_: Nullable<pbandk.wkt.Struct.FieldsEntry>,
  ): pbandk.wkt.Struct.FieldsEntry;
  function orDefaultForValue(_this_: Nullable<pbandk.wkt.Value>): pbandk.wkt.Value;
  function orDefaultForListValue(_this_: Nullable<pbandk.wkt.ListValue>): pbandk.wkt.ListValue;
}
export declare namespace pbandk.wkt {
  class Timestamp /* implements pbandk.Message */ {
    constructor(
      seconds?: any /* kotlin.Long */,
      nanos?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get seconds(): any /* kotlin.Long */;
    get nanos(): number;
    copy(
      seconds?: any /* kotlin.Long */,
      nanos?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Timestamp;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Timestamp;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Timestamp> */;
  }
  function orDefaultForTimestamp(_this_: Nullable<pbandk.wkt.Timestamp>): pbandk.wkt.Timestamp;
}
export declare namespace pbandk.wkt {
  abstract class Syntax /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get PROTO2(): {} & pbandk.wkt.Syntax;
    static get PROTO3(): {} & pbandk.wkt.Syntax;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<pbandk.wkt.Syntax> */;
    } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.Syntax> */;
  }
  namespace Syntax {
    class UNRECOGNIZED extends pbandk.wkt.Syntax {
      constructor(value: number);
    }
  }
  class Type /* implements pbandk.Message */ {
    constructor(
      name?: string,
      fields?: any /* kotlin.collections.List<pbandk.wkt.Field> */,
      oneofs?: any /* kotlin.collections.List<string> */,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      sourceContext?: Nullable<pbandk.wkt.SourceContext>,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): string;
    get fields(): any /* kotlin.collections.List<pbandk.wkt.Field> */;
    get oneofs(): any /* kotlin.collections.List<string> */;
    get options(): any /* kotlin.collections.List<pbandk.wkt.Option> */;
    get sourceContext(): Nullable<pbandk.wkt.SourceContext>;
    get syntax(): pbandk.wkt.Syntax;
    copy(
      name?: string,
      fields?: any /* kotlin.collections.List<pbandk.wkt.Field> */,
      oneofs?: any /* kotlin.collections.List<string> */,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      sourceContext?: Nullable<pbandk.wkt.SourceContext>,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Type;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Type;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Type> */;
  }
  class Field /* implements pbandk.Message */ {
    constructor(
      kind?: pbandk.wkt.Field.Kind,
      cardinality?: pbandk.wkt.Field.Cardinality,
      number?: number,
      name?: string,
      typeUrl?: string,
      oneofIndex?: number,
      packed?: boolean,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      jsonName?: string,
      defaultValue?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get kind(): pbandk.wkt.Field.Kind;
    get cardinality(): pbandk.wkt.Field.Cardinality;
    get number(): number;
    get name(): string;
    get typeUrl(): string;
    get oneofIndex(): number;
    get packed(): boolean;
    get options(): any /* kotlin.collections.List<pbandk.wkt.Option> */;
    get jsonName(): string;
    get defaultValue(): string;
    copy(
      kind?: pbandk.wkt.Field.Kind,
      cardinality?: pbandk.wkt.Field.Cardinality,
      number?: number,
      name?: string,
      typeUrl?: string,
      oneofIndex?: number,
      packed?: boolean,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      jsonName?: string,
      defaultValue?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Field;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Field;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Field> */;
  }
  namespace Field {
    abstract class Kind /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get TYPE_UNKNOWN(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_DOUBLE(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_FLOAT(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_INT64(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_UINT64(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_INT32(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_FIXED64(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_FIXED32(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_BOOL(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_STRING(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_GROUP(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_MESSAGE(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_BYTES(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_UINT32(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_ENUM(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_SFIXED32(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_SFIXED64(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_SINT32(): {} & pbandk.wkt.Field.Kind;
      static get TYPE_SINT64(): {} & pbandk.wkt.Field.Kind;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.Field.Kind> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.Field.Kind> */;
    }
    namespace Kind {
      class UNRECOGNIZED extends pbandk.wkt.Field.Kind {
        constructor(value: number);
      }
    }
    abstract class Cardinality /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get UNKNOWN(): {} & pbandk.wkt.Field.Cardinality;
      static get OPTIONAL(): {} & pbandk.wkt.Field.Cardinality;
      static get REQUIRED(): {} & pbandk.wkt.Field.Cardinality;
      static get REPEATED(): {} & pbandk.wkt.Field.Cardinality;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<pbandk.wkt.Field.Cardinality> */;
      } & any /* pbandk.Message.Enum.Companion<pbandk.wkt.Field.Cardinality> */;
    }
    namespace Cardinality {
      class UNRECOGNIZED extends pbandk.wkt.Field.Cardinality {
        constructor(value: number);
      }
    }
  }
  class Enum /* implements pbandk.Message */ {
    constructor(
      name?: string,
      enumvalue?: any /* kotlin.collections.List<pbandk.wkt.EnumValue> */,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      sourceContext?: Nullable<pbandk.wkt.SourceContext>,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): string;
    get enumvalue(): any /* kotlin.collections.List<pbandk.wkt.EnumValue> */;
    get options(): any /* kotlin.collections.List<pbandk.wkt.Option> */;
    get sourceContext(): Nullable<pbandk.wkt.SourceContext>;
    get syntax(): pbandk.wkt.Syntax;
    copy(
      name?: string,
      enumvalue?: any /* kotlin.collections.List<pbandk.wkt.EnumValue> */,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      sourceContext?: Nullable<pbandk.wkt.SourceContext>,
      syntax?: pbandk.wkt.Syntax,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Enum;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Enum;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Enum> */;
  }
  class EnumValue /* implements pbandk.Message */ {
    constructor(
      name?: string,
      number?: number,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): string;
    get number(): number;
    get options(): any /* kotlin.collections.List<pbandk.wkt.Option> */;
    copy(
      name?: string,
      number?: number,
      options?: any /* kotlin.collections.List<pbandk.wkt.Option> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.EnumValue;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.EnumValue;
    } & any /* pbandk.Message.Companion<pbandk.wkt.EnumValue> */;
  }
  class Option /* implements pbandk.Message */ {
    constructor(
      name?: string,
      value?: Nullable<pbandk.wkt.Any>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get name(): string;
    get value(): Nullable<pbandk.wkt.Any>;
    copy(
      name?: string,
      value?: Nullable<pbandk.wkt.Any>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Option;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Option;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Option> */;
  }
  function orDefaultForType(_this_: Nullable<pbandk.wkt.Type>): pbandk.wkt.Type;
  function orDefaultForField(_this_: Nullable<pbandk.wkt.Field>): pbandk.wkt.Field;
  function orDefaultForEnum(_this_: Nullable<pbandk.wkt.Enum>): pbandk.wkt.Enum;
  function orDefaultForEnumValue(_this_: Nullable<pbandk.wkt.EnumValue>): pbandk.wkt.EnumValue;
  function orDefaultForOption(_this_: Nullable<pbandk.wkt.Option>): pbandk.wkt.Option;
}
export declare namespace pbandk.wkt {
  class DoubleValue /* implements pbandk.Message */ {
    constructor(value?: number, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get value(): number;
    copy(
      value?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.DoubleValue;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.DoubleValue;
    } & any /* pbandk.Message.Companion<pbandk.wkt.DoubleValue> */;
  }
  class FloatValue /* implements pbandk.Message */ {
    constructor(value?: number, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get value(): number;
    copy(
      value?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.FloatValue;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.FloatValue;
    } & any /* pbandk.Message.Companion<pbandk.wkt.FloatValue> */;
  }
  class Int64Value /* implements pbandk.Message */ {
    constructor(
      value?: any /* kotlin.Long */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get value(): any /* kotlin.Long */;
    copy(
      value?: any /* kotlin.Long */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Int64Value;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Int64Value;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Int64Value> */;
  }
  class UInt64Value /* implements pbandk.Message */ {
    constructor(
      value?: any /* kotlin.Long */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get value(): any /* kotlin.Long */;
    copy(
      value?: any /* kotlin.Long */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.UInt64Value;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.UInt64Value;
    } & any /* pbandk.Message.Companion<pbandk.wkt.UInt64Value> */;
  }
  class Int32Value /* implements pbandk.Message */ {
    constructor(value?: number, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get value(): number;
    copy(
      value?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.Int32Value;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.Int32Value;
    } & any /* pbandk.Message.Companion<pbandk.wkt.Int32Value> */;
  }
  class UInt32Value /* implements pbandk.Message */ {
    constructor(value?: number, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get value(): number;
    copy(
      value?: number,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.UInt32Value;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.UInt32Value;
    } & any /* pbandk.Message.Companion<pbandk.wkt.UInt32Value> */;
  }
  class BoolValue /* implements pbandk.Message */ {
    constructor(value?: boolean, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get value(): boolean;
    copy(
      value?: boolean,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.BoolValue;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.BoolValue;
    } & any /* pbandk.Message.Companion<pbandk.wkt.BoolValue> */;
  }
  class StringValue /* implements pbandk.Message */ {
    constructor(value?: string, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get value(): string;
    copy(
      value?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.StringValue;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.StringValue;
    } & any /* pbandk.Message.Companion<pbandk.wkt.StringValue> */;
  }
  class BytesValue /* implements pbandk.Message */ {
    constructor(value?: pbandk.ByteArr, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get value(): pbandk.ByteArr;
    copy(
      value?: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): pbandk.wkt.BytesValue;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): pbandk.wkt.BytesValue;
    } & any /* pbandk.Message.Companion<pbandk.wkt.BytesValue> */;
  }
  function orDefaultForDoubleValue(_this_: Nullable<pbandk.wkt.DoubleValue>): pbandk.wkt.DoubleValue;
  function orDefaultForFloatValue(_this_: Nullable<pbandk.wkt.FloatValue>): pbandk.wkt.FloatValue;
  function orDefaultForInt64Value(_this_: Nullable<pbandk.wkt.Int64Value>): pbandk.wkt.Int64Value;
  function orDefaultForUInt64Value(_this_: Nullable<pbandk.wkt.UInt64Value>): pbandk.wkt.UInt64Value;
  function orDefaultForInt32Value(_this_: Nullable<pbandk.wkt.Int32Value>): pbandk.wkt.Int32Value;
  function orDefaultForUInt32Value(_this_: Nullable<pbandk.wkt.UInt32Value>): pbandk.wkt.UInt32Value;
  function orDefaultForBoolValue(_this_: Nullable<pbandk.wkt.BoolValue>): pbandk.wkt.BoolValue;
  function orDefaultForStringValue(_this_: Nullable<pbandk.wkt.StringValue>): pbandk.wkt.StringValue;
  function orDefaultForBytesValue(_this_: Nullable<pbandk.wkt.BytesValue>): pbandk.wkt.BytesValue;
}
export declare namespace com.wire.kalium.protobuf.backup {
  abstract class ExportedEncryptionAlgorithm /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get BACKUP_AES_CBC(): {} & com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm;
    static get BACKUP_AES_GCM(): {} & com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm> */;
  }
  namespace ExportedEncryptionAlgorithm {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm {
      constructor(value: number);
    }
  }
  class BackupData /* implements pbandk.Message */ {
    constructor(
      info: com.wire.kalium.protobuf.backup.BackupInfo,
      conversations?: any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportedConversation> */,
      messages?: any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportedMessage> */,
      users?: any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportUser> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get info(): com.wire.kalium.protobuf.backup.BackupInfo;
    get conversations(): any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportedConversation> */;
    get messages(): any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportedMessage> */;
    get users(): any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportUser> */;
    copy(
      info?: com.wire.kalium.protobuf.backup.BackupInfo,
      conversations?: any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportedConversation> */,
      messages?: any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportedMessage> */,
      users?: any /* kotlin.collections.List<com.wire.kalium.protobuf.backup.ExportUser> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.BackupData;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.BackupData> */;
  }
  class BackupInfo /* implements pbandk.Message */ {
    constructor(
      platform: string,
      version: string,
      userId: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      creationTime: any /* kotlin.Long */,
      clientId: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get platform(): string;
    get version(): string;
    get userId(): com.wire.kalium.protobuf.backup.ExportedQualifiedId;
    get creationTime(): any /* kotlin.Long */;
    get clientId(): string;
    copy(
      platform?: string,
      version?: string,
      userId?: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      creationTime?: any /* kotlin.Long */,
      clientId?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.BackupInfo;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.BackupInfo> */;
  }
  class ExportUser /* implements pbandk.Message */ {
    constructor(
      id: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      name: string,
      handle: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get id(): com.wire.kalium.protobuf.backup.ExportedQualifiedId;
    get name(): string;
    get handle(): string;
    copy(
      id?: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      name?: string,
      handle?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportUser;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportUser> */;
  }
  class ExportedQualifiedId /* implements pbandk.Message */ {
    constructor(
      value: string,
      domain: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get value(): string;
    get domain(): string;
    copy(
      value?: string,
      domain?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedQualifiedId;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedQualifiedId> */;
  }
  class ExportedConversation /* implements pbandk.Message */ {
    constructor(
      id: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      name: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get id(): com.wire.kalium.protobuf.backup.ExportedQualifiedId;
    get name(): string;
    copy(
      id?: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      name?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedConversation;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedConversation> */;
  }
  class ExportedMessage /* implements pbandk.Message */ {
    constructor(
      id: string,
      timeIso: any /* kotlin.Long */,
      senderUserId: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      senderClientId: string,
      conversationId: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      webPk?: Nullable<any> /* Nullable<kotlin.Long> */,
      content?: Nullable<com.wire.kalium.protobuf.backup.ExportedMessage.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get id(): string;
    get timeIso(): any /* kotlin.Long */;
    get senderUserId(): com.wire.kalium.protobuf.backup.ExportedQualifiedId;
    get senderClientId(): string;
    get conversationId(): com.wire.kalium.protobuf.backup.ExportedQualifiedId;
    get webPk(): Nullable<any> /* Nullable<kotlin.Long> */;
    get content(): Nullable<com.wire.kalium.protobuf.backup.ExportedMessage.Content<any /*UnknownType **/>>;
    get text(): Nullable<com.wire.kalium.protobuf.backup.ExportedText>;
    get asset(): Nullable<com.wire.kalium.protobuf.backup.ExportedAsset>;
    get location(): Nullable<com.wire.kalium.protobuf.backup.ExportedLocation>;
    copy(
      id?: string,
      timeIso?: any /* kotlin.Long */,
      senderUserId?: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      senderClientId?: string,
      conversationId?: com.wire.kalium.protobuf.backup.ExportedQualifiedId,
      webPk?: Nullable<any> /* Nullable<kotlin.Long> */,
      content?: Nullable<com.wire.kalium.protobuf.backup.ExportedMessage.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedMessage;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedMessage> */;
  }
  namespace ExportedMessage {
    abstract class Content<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace Content {
      class Text extends com.wire.kalium.protobuf.backup.ExportedMessage
        .Content<com.wire.kalium.protobuf.backup.ExportedText> {
        constructor(text: com.wire.kalium.protobuf.backup.ExportedText);
      }
      class Asset extends com.wire.kalium.protobuf.backup.ExportedMessage
        .Content<com.wire.kalium.protobuf.backup.ExportedAsset> {
        constructor(asset: com.wire.kalium.protobuf.backup.ExportedAsset);
      }
      class Location extends com.wire.kalium.protobuf.backup.ExportedMessage
        .Content<com.wire.kalium.protobuf.backup.ExportedLocation> {
        constructor(location: com.wire.kalium.protobuf.backup.ExportedLocation);
      }
    }
  }
  class ExportedText /* implements pbandk.Message */ {
    constructor(content: string, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get content(): string;
    copy(
      content?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedText;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedText> */;
  }
  class ExportedAsset /* implements pbandk.Message */ {
    constructor(
      mimetype: string,
      size: any /* kotlin.Long */,
      name: Nullable<string> | undefined,
      otrKey: pbandk.ByteArr,
      sha256: pbandk.ByteArr,
      assetId: string,
      assetToken?: Nullable<string>,
      assetDomain?: Nullable<string>,
      encryption?: Nullable<com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm>,
      metaData?: Nullable<com.wire.kalium.protobuf.backup.ExportedAsset.MetaData<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get mimetype(): string;
    get size(): any /* kotlin.Long */;
    get name(): Nullable<string>;
    get otrKey(): pbandk.ByteArr;
    get sha256(): pbandk.ByteArr;
    get assetId(): string;
    get assetToken(): Nullable<string>;
    get assetDomain(): Nullable<string>;
    get encryption(): Nullable<com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm>;
    get metaData(): Nullable<com.wire.kalium.protobuf.backup.ExportedAsset.MetaData<any /*UnknownType **/>>;
    get image(): Nullable<com.wire.kalium.protobuf.backup.ExportedImageMetaData>;
    get video(): Nullable<com.wire.kalium.protobuf.backup.ExportedVideoMetaData>;
    get audio(): Nullable<com.wire.kalium.protobuf.backup.ExportedAudioMetaData>;
    get generic(): Nullable<com.wire.kalium.protobuf.backup.ExportedGenericMetaData>;
    copy(
      mimetype?: string,
      size?: any /* kotlin.Long */,
      name?: Nullable<string>,
      otrKey?: pbandk.ByteArr,
      sha256?: pbandk.ByteArr,
      assetId?: string,
      assetToken?: Nullable<string>,
      assetDomain?: Nullable<string>,
      encryption?: Nullable<com.wire.kalium.protobuf.backup.ExportedEncryptionAlgorithm>,
      metaData?: Nullable<com.wire.kalium.protobuf.backup.ExportedAsset.MetaData<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedAsset;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedAsset> */;
  }
  namespace ExportedAsset {
    abstract class MetaData<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace MetaData {
      class Image extends com.wire.kalium.protobuf.backup.ExportedAsset
        .MetaData<com.wire.kalium.protobuf.backup.ExportedImageMetaData> {
        constructor(image: com.wire.kalium.protobuf.backup.ExportedImageMetaData);
      }
      class Video extends com.wire.kalium.protobuf.backup.ExportedAsset
        .MetaData<com.wire.kalium.protobuf.backup.ExportedVideoMetaData> {
        constructor(video: com.wire.kalium.protobuf.backup.ExportedVideoMetaData);
      }
      class Audio extends com.wire.kalium.protobuf.backup.ExportedAsset
        .MetaData<com.wire.kalium.protobuf.backup.ExportedAudioMetaData> {
        constructor(audio: com.wire.kalium.protobuf.backup.ExportedAudioMetaData);
      }
      class Generic extends com.wire.kalium.protobuf.backup.ExportedAsset
        .MetaData<com.wire.kalium.protobuf.backup.ExportedGenericMetaData> {
        constructor(generic: com.wire.kalium.protobuf.backup.ExportedGenericMetaData);
      }
    }
  }
  class ExportedImageMetaData /* implements pbandk.Message */ {
    constructor(
      width: number,
      height: number,
      tag?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get width(): number;
    get height(): number;
    get tag(): Nullable<string>;
    copy(
      width?: number,
      height?: number,
      tag?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedImageMetaData;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedImageMetaData> */;
  }
  class ExportedVideoMetaData /* implements pbandk.Message */ {
    constructor(
      width?: Nullable<number>,
      height?: Nullable<number>,
      durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get width(): Nullable<number>;
    get height(): Nullable<number>;
    get durationInMillis(): Nullable<any> /* Nullable<kotlin.Long> */;
    copy(
      width?: Nullable<number>,
      height?: Nullable<number>,
      durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedVideoMetaData;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.backup.ExportedVideoMetaData;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedVideoMetaData> */;
  }
  class ExportedAudioMetaData /* implements pbandk.Message */ {
    constructor(
      durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
      normalizedLoudness?: Nullable<pbandk.ByteArr>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get durationInMillis(): Nullable<any> /* Nullable<kotlin.Long> */;
    get normalizedLoudness(): Nullable<pbandk.ByteArr>;
    copy(
      durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
      normalizedLoudness?: Nullable<pbandk.ByteArr>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedAudioMetaData;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.backup.ExportedAudioMetaData;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedAudioMetaData> */;
  }
  class ExportedGenericMetaData /* implements pbandk.Message */ {
    constructor(name?: Nullable<string>, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get name(): Nullable<string>;
    copy(
      name?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedGenericMetaData;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.backup.ExportedGenericMetaData;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedGenericMetaData> */;
  }
  class ExportedLocation /* implements pbandk.Message */ {
    constructor(
      longitude: number,
      latitude: number,
      name?: Nullable<string>,
      zoom?: Nullable<number>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get longitude(): number;
    get latitude(): number;
    get name(): Nullable<string>;
    get zoom(): Nullable<number>;
    copy(
      longitude?: number,
      latitude?: number,
      name?: Nullable<string>,
      zoom?: Nullable<number>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.backup.ExportedLocation;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.backup.ExportedLocation> */;
  }
  function orDefaultForExportedVideoMetaData(
    _this_: Nullable<com.wire.kalium.protobuf.backup.ExportedVideoMetaData>,
  ): com.wire.kalium.protobuf.backup.ExportedVideoMetaData;
  function orDefaultForExportedAudioMetaData(
    _this_: Nullable<com.wire.kalium.protobuf.backup.ExportedAudioMetaData>,
  ): com.wire.kalium.protobuf.backup.ExportedAudioMetaData;
  function orDefaultForExportedGenericMetaData(
    _this_: Nullable<com.wire.kalium.protobuf.backup.ExportedGenericMetaData>,
  ): com.wire.kalium.protobuf.backup.ExportedGenericMetaData;
}
export declare namespace com.wire.kalium.protobuf.messages {
  abstract class ClientAction /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get RESET_SESSION(): {} & com.wire.kalium.protobuf.messages.ClientAction;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.ClientAction> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.messages.ClientAction> */;
  }
  namespace ClientAction {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.messages.ClientAction {
      constructor(value: number);
    }
  }
  abstract class EncryptionAlgorithm /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get AES_CBC(): {} & com.wire.kalium.protobuf.messages.EncryptionAlgorithm;
    static get AES_GCM(): {} & com.wire.kalium.protobuf.messages.EncryptionAlgorithm;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.EncryptionAlgorithm> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.messages.EncryptionAlgorithm> */;
  }
  namespace EncryptionAlgorithm {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.messages.EncryptionAlgorithm {
      constructor(value: number);
    }
  }
  abstract class LegalHoldStatus /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get UNKNOWN(): {} & com.wire.kalium.protobuf.messages.LegalHoldStatus;
    static get DISABLED(): {} & com.wire.kalium.protobuf.messages.LegalHoldStatus;
    static get ENABLED(): {} & com.wire.kalium.protobuf.messages.LegalHoldStatus;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.LegalHoldStatus> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.messages.LegalHoldStatus> */;
  }
  namespace LegalHoldStatus {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.messages.LegalHoldStatus {
      constructor(value: number);
    }
  }
  abstract class UnknownStrategy /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get IGNORE(): {} & com.wire.kalium.protobuf.messages.UnknownStrategy;
    static get DISCARD_AND_WARN(): {} & com.wire.kalium.protobuf.messages.UnknownStrategy;
    static get WARN_USER_ALLOW_RETRY(): {} & com.wire.kalium.protobuf.messages.UnknownStrategy;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.UnknownStrategy> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.messages.UnknownStrategy> */;
  }
  namespace UnknownStrategy {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.messages.UnknownStrategy {
      constructor(value: number);
    }
  }
  class GenericMessage /* implements pbandk.Message */ {
    constructor(
      messageId: string,
      unknownStrategy?: Nullable<com.wire.kalium.protobuf.messages.UnknownStrategy>,
      content?: Nullable<com.wire.kalium.protobuf.messages.GenericMessage.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get messageId(): string;
    get unknownStrategy(): Nullable<com.wire.kalium.protobuf.messages.UnknownStrategy>;
    get content(): Nullable<com.wire.kalium.protobuf.messages.GenericMessage.Content<any /*UnknownType **/>>;
    get text(): Nullable<com.wire.kalium.protobuf.messages.Text>;
    get image(): Nullable<com.wire.kalium.protobuf.messages.ImageAsset>;
    get knock(): Nullable<com.wire.kalium.protobuf.messages.Knock>;
    get lastRead(): Nullable<com.wire.kalium.protobuf.messages.LastRead>;
    get cleared(): Nullable<com.wire.kalium.protobuf.messages.Cleared>;
    get external(): Nullable<com.wire.kalium.protobuf.messages.External>;
    get clientAction(): Nullable<com.wire.kalium.protobuf.messages.ClientAction>;
    get calling(): Nullable<com.wire.kalium.protobuf.messages.Calling>;
    get asset(): Nullable<com.wire.kalium.protobuf.messages.Asset>;
    get hidden(): Nullable<com.wire.kalium.protobuf.messages.MessageHide>;
    get location(): Nullable<com.wire.kalium.protobuf.messages.Location>;
    get deleted(): Nullable<com.wire.kalium.protobuf.messages.MessageDelete>;
    get edited(): Nullable<com.wire.kalium.protobuf.messages.MessageEdit>;
    get confirmation(): Nullable<com.wire.kalium.protobuf.messages.Confirmation>;
    get reaction(): Nullable<com.wire.kalium.protobuf.messages.Reaction>;
    get ephemeral(): Nullable<com.wire.kalium.protobuf.messages.Ephemeral>;
    get availability(): Nullable<com.wire.kalium.protobuf.messages.Availability>;
    get composite(): Nullable<com.wire.kalium.protobuf.messages.Composite>;
    get buttonAction(): Nullable<com.wire.kalium.protobuf.messages.ButtonAction>;
    get buttonActionConfirmation(): Nullable<com.wire.kalium.protobuf.messages.ButtonActionConfirmation>;
    get dataTransfer(): Nullable<com.wire.kalium.protobuf.messages.DataTransfer>;
    copy(
      messageId?: string,
      unknownStrategy?: Nullable<com.wire.kalium.protobuf.messages.UnknownStrategy>,
      content?: Nullable<com.wire.kalium.protobuf.messages.GenericMessage.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.GenericMessage;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.GenericMessage> */;
  }
  namespace GenericMessage {
    abstract class Content<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace Content {
      class Text extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Text> {
        constructor(text: com.wire.kalium.protobuf.messages.Text);
      }
      class Image extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.ImageAsset> {
        constructor(image: com.wire.kalium.protobuf.messages.ImageAsset);
      }
      class Knock extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Knock> {
        constructor(knock: com.wire.kalium.protobuf.messages.Knock);
      }
      class LastRead extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.LastRead> {
        constructor(lastRead: com.wire.kalium.protobuf.messages.LastRead);
      }
      class Cleared extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Cleared> {
        constructor(cleared: com.wire.kalium.protobuf.messages.Cleared);
      }
      class External extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.External> {
        constructor(external: com.wire.kalium.protobuf.messages.External);
      }
      class ClientAction extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.ClientAction> {
        constructor(clientAction?: com.wire.kalium.protobuf.messages.ClientAction);
      }
      class Calling extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Calling> {
        constructor(calling: com.wire.kalium.protobuf.messages.Calling);
      }
      class Asset extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Asset> {
        constructor(asset: com.wire.kalium.protobuf.messages.Asset);
      }
      class Hidden extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.MessageHide> {
        constructor(hidden: com.wire.kalium.protobuf.messages.MessageHide);
      }
      class Location extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Location> {
        constructor(location: com.wire.kalium.protobuf.messages.Location);
      }
      class Deleted extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.MessageDelete> {
        constructor(deleted: com.wire.kalium.protobuf.messages.MessageDelete);
      }
      class Edited extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.MessageEdit> {
        constructor(edited: com.wire.kalium.protobuf.messages.MessageEdit);
      }
      class Confirmation extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Confirmation> {
        constructor(confirmation: com.wire.kalium.protobuf.messages.Confirmation);
      }
      class Reaction extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Reaction> {
        constructor(reaction: com.wire.kalium.protobuf.messages.Reaction);
      }
      class Ephemeral extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Ephemeral> {
        constructor(ephemeral: com.wire.kalium.protobuf.messages.Ephemeral);
      }
      class Availability extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Availability> {
        constructor(availability: com.wire.kalium.protobuf.messages.Availability);
      }
      class Composite extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.Composite> {
        constructor(composite: com.wire.kalium.protobuf.messages.Composite);
      }
      class ButtonAction extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.ButtonAction> {
        constructor(buttonAction: com.wire.kalium.protobuf.messages.ButtonAction);
      }
      class ButtonActionConfirmation extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.ButtonActionConfirmation> {
        constructor(buttonActionConfirmation: com.wire.kalium.protobuf.messages.ButtonActionConfirmation);
      }
      class DataTransfer extends com.wire.kalium.protobuf.messages.GenericMessage
        .Content<com.wire.kalium.protobuf.messages.DataTransfer> {
        constructor(dataTransfer: com.wire.kalium.protobuf.messages.DataTransfer);
      }
    }
  }
  class QualifiedUserId /* implements pbandk.Message */ {
    constructor(
      id: string,
      domain: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get id(): string;
    get domain(): string;
    copy(
      id?: string,
      domain?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.QualifiedUserId;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.QualifiedUserId> */;
  }
  class QualifiedConversationId /* implements pbandk.Message */ {
    constructor(
      id: string,
      domain: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get id(): string;
    get domain(): string;
    copy(
      id?: string,
      domain?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.QualifiedConversationId;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.QualifiedConversationId> */;
  }
  class Composite /* implements pbandk.Message */ {
    constructor(
      items?: any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Composite.Item> */,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get items(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Composite.Item> */;
    get expectsReadConfirmation(): Nullable<boolean>;
    get legalHoldStatus(): Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>;
    copy(
      items?: any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Composite.Item> */,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Composite;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.messages.Composite;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Composite> */;
  }
  namespace Composite {
    class Item /* implements pbandk.Message */ {
      constructor(
        content?: Nullable<com.wire.kalium.protobuf.messages.Composite.Item.Content<any /*UnknownType **/>>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get content(): Nullable<com.wire.kalium.protobuf.messages.Composite.Item.Content<any /*UnknownType **/>>;
      get text(): Nullable<com.wire.kalium.protobuf.messages.Text>;
      get button(): Nullable<com.wire.kalium.protobuf.messages.Button>;
      copy(
        content?: Nullable<com.wire.kalium.protobuf.messages.Composite.Item.Content<any /*UnknownType **/>>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.messages.Composite.Item;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): com.wire.kalium.protobuf.messages.Composite.Item;
      } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Composite.Item> */;
    }
    namespace Item {
      abstract class Content<V> /* extends pbandk.Message.OneOf<V> */ {
        protected constructor(value: V);
      }
      namespace Content {
        class Text extends com.wire.kalium.protobuf.messages.Composite.Item
          .Content<com.wire.kalium.protobuf.messages.Text> {
          constructor(text: com.wire.kalium.protobuf.messages.Text);
        }
        class Button extends com.wire.kalium.protobuf.messages.Composite.Item
          .Content<com.wire.kalium.protobuf.messages.Button> {
          constructor(button: com.wire.kalium.protobuf.messages.Button);
        }
      }
    }
  }
  class Button /* implements pbandk.Message */ {
    constructor(
      text: string,
      id: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get text(): string;
    get id(): string;
    copy(
      text?: string,
      id?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Button;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Button> */;
  }
  class ButtonAction /* implements pbandk.Message */ {
    constructor(
      buttonId: string,
      referenceMessageId: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get buttonId(): string;
    get referenceMessageId(): string;
    copy(
      buttonId?: string,
      referenceMessageId?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.ButtonAction;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.ButtonAction> */;
  }
  class ButtonActionConfirmation /* implements pbandk.Message */ {
    constructor(
      referenceMessageId: string,
      buttonId?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get referenceMessageId(): string;
    get buttonId(): Nullable<string>;
    copy(
      referenceMessageId?: string,
      buttonId?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.ButtonActionConfirmation;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.ButtonActionConfirmation> */;
  }
  class Availability /* implements pbandk.Message */ {
    constructor(
      type: com.wire.kalium.protobuf.messages.Availability.Type,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get type(): com.wire.kalium.protobuf.messages.Availability.Type;
    copy(
      type?: com.wire.kalium.protobuf.messages.Availability.Type,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Availability;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Availability> */;
  }
  namespace Availability {
    abstract class Type /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get NONE(): {} & com.wire.kalium.protobuf.messages.Availability.Type;
      static get AVAILABLE(): {} & com.wire.kalium.protobuf.messages.Availability.Type;
      static get AWAY(): {} & com.wire.kalium.protobuf.messages.Availability.Type;
      static get BUSY(): {} & com.wire.kalium.protobuf.messages.Availability.Type;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Availability.Type> */;
      } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.messages.Availability.Type> */;
    }
    namespace Type {
      class UNRECOGNIZED extends com.wire.kalium.protobuf.messages.Availability.Type {
        constructor(value: number);
      }
    }
  }
  class Ephemeral /* implements pbandk.Message */ {
    constructor(
      expireAfterMillis: any /* kotlin.Long */,
      content?: Nullable<com.wire.kalium.protobuf.messages.Ephemeral.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get expireAfterMillis(): any /* kotlin.Long */;
    get content(): Nullable<com.wire.kalium.protobuf.messages.Ephemeral.Content<any /*UnknownType **/>>;
    get text(): Nullable<com.wire.kalium.protobuf.messages.Text>;
    get image(): Nullable<com.wire.kalium.protobuf.messages.ImageAsset>;
    get knock(): Nullable<com.wire.kalium.protobuf.messages.Knock>;
    get asset(): Nullable<com.wire.kalium.protobuf.messages.Asset>;
    get location(): Nullable<com.wire.kalium.protobuf.messages.Location>;
    copy(
      expireAfterMillis?: any /* kotlin.Long */,
      content?: Nullable<com.wire.kalium.protobuf.messages.Ephemeral.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Ephemeral;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Ephemeral> */;
  }
  namespace Ephemeral {
    abstract class Content<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace Content {
      class Text extends com.wire.kalium.protobuf.messages.Ephemeral.Content<com.wire.kalium.protobuf.messages.Text> {
        constructor(text: com.wire.kalium.protobuf.messages.Text);
      }
      class Image extends com.wire.kalium.protobuf.messages.Ephemeral
        .Content<com.wire.kalium.protobuf.messages.ImageAsset> {
        constructor(image: com.wire.kalium.protobuf.messages.ImageAsset);
      }
      class Knock extends com.wire.kalium.protobuf.messages.Ephemeral.Content<com.wire.kalium.protobuf.messages.Knock> {
        constructor(knock: com.wire.kalium.protobuf.messages.Knock);
      }
      class Asset extends com.wire.kalium.protobuf.messages.Ephemeral.Content<com.wire.kalium.protobuf.messages.Asset> {
        constructor(asset: com.wire.kalium.protobuf.messages.Asset);
      }
      class Location extends com.wire.kalium.protobuf.messages.Ephemeral
        .Content<com.wire.kalium.protobuf.messages.Location> {
        constructor(location: com.wire.kalium.protobuf.messages.Location);
      }
    }
  }
  class Text /* implements pbandk.Message */ {
    constructor(
      content: string,
      linkPreview?: any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.LinkPreview> */,
      mentions?: any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Mention> */,
      quote?: Nullable<com.wire.kalium.protobuf.messages.Quote>,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get content(): string;
    get linkPreview(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.LinkPreview> */;
    get mentions(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Mention> */;
    get quote(): Nullable<com.wire.kalium.protobuf.messages.Quote>;
    get expectsReadConfirmation(): Nullable<boolean>;
    get legalHoldStatus(): Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>;
    copy(
      content?: string,
      linkPreview?: any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.LinkPreview> */,
      mentions?: any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Mention> */,
      quote?: Nullable<com.wire.kalium.protobuf.messages.Quote>,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Text;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Text> */;
  }
  class Knock /* implements pbandk.Message */ {
    constructor(
      hotKnock: boolean,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get hotKnock(): boolean;
    get expectsReadConfirmation(): Nullable<boolean>;
    get legalHoldStatus(): Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>;
    copy(
      hotKnock?: boolean,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Knock;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Knock> */;
  }
  class LinkPreview /* implements pbandk.Message */ {
    constructor(
      url: string,
      urlOffset: number,
      permanentUrl?: Nullable<string>,
      title?: Nullable<string>,
      summary?: Nullable<string>,
      image?: Nullable<com.wire.kalium.protobuf.messages.Asset>,
      preview?: Nullable<com.wire.kalium.protobuf.messages.LinkPreview.Preview<any /*UnknownType **/>>,
      metaData?: Nullable<com.wire.kalium.protobuf.messages.LinkPreview.MetaData<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get url(): string;
    get urlOffset(): number;
    get permanentUrl(): Nullable<string>;
    get title(): Nullable<string>;
    get summary(): Nullable<string>;
    get image(): Nullable<com.wire.kalium.protobuf.messages.Asset>;
    get preview(): Nullable<com.wire.kalium.protobuf.messages.LinkPreview.Preview<any /*UnknownType **/>>;
    get metaData(): Nullable<com.wire.kalium.protobuf.messages.LinkPreview.MetaData<any /*UnknownType **/>>;
    get article(): Nullable<com.wire.kalium.protobuf.messages.Article>;
    get tweet(): Nullable<com.wire.kalium.protobuf.messages.Tweet>;
    copy(
      url?: string,
      urlOffset?: number,
      permanentUrl?: Nullable<string>,
      title?: Nullable<string>,
      summary?: Nullable<string>,
      image?: Nullable<com.wire.kalium.protobuf.messages.Asset>,
      preview?: Nullable<com.wire.kalium.protobuf.messages.LinkPreview.Preview<any /*UnknownType **/>>,
      metaData?: Nullable<com.wire.kalium.protobuf.messages.LinkPreview.MetaData<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.LinkPreview;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.LinkPreview> */;
  }
  namespace LinkPreview {
    abstract class Preview<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace Preview {
      class Article extends com.wire.kalium.protobuf.messages.LinkPreview
        .Preview<com.wire.kalium.protobuf.messages.Article> {
        constructor(article: com.wire.kalium.protobuf.messages.Article);
      }
    }
    abstract class MetaData<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace MetaData {
      class Tweet extends com.wire.kalium.protobuf.messages.LinkPreview
        .MetaData<com.wire.kalium.protobuf.messages.Tweet> {
        constructor(tweet: com.wire.kalium.protobuf.messages.Tweet);
      }
    }
  }
  class Tweet /* implements pbandk.Message */ {
    constructor(
      author?: Nullable<string>,
      username?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get author(): Nullable<string>;
    get username(): Nullable<string>;
    copy(
      author?: Nullable<string>,
      username?: Nullable<string>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Tweet;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.messages.Tweet;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Tweet> */;
  }
  class Article /* implements pbandk.Message */ {
    constructor(
      permanentUrl: string,
      title?: Nullable<string>,
      summary?: Nullable<string>,
      image?: Nullable<com.wire.kalium.protobuf.messages.Asset>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get permanentUrl(): string;
    get title(): Nullable<string>;
    get summary(): Nullable<string>;
    get image(): Nullable<com.wire.kalium.protobuf.messages.Asset>;
    copy(
      permanentUrl?: string,
      title?: Nullable<string>,
      summary?: Nullable<string>,
      image?: Nullable<com.wire.kalium.protobuf.messages.Asset>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Article;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Article> */;
  }
  class Mention /* implements pbandk.Message */ {
    constructor(
      start: number,
      length: number,
      qualifiedUserId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedUserId>,
      mentionType?: Nullable<com.wire.kalium.protobuf.messages.Mention.MentionType<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get start(): number;
    get length(): number;
    get qualifiedUserId(): Nullable<com.wire.kalium.protobuf.messages.QualifiedUserId>;
    get mentionType(): Nullable<com.wire.kalium.protobuf.messages.Mention.MentionType<any /*UnknownType **/>>;
    get userId(): Nullable<string>;
    copy(
      start?: number,
      length?: number,
      qualifiedUserId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedUserId>,
      mentionType?: Nullable<com.wire.kalium.protobuf.messages.Mention.MentionType<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Mention;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Mention> */;
  }
  namespace Mention {
    abstract class MentionType<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace MentionType {
      class UserId extends com.wire.kalium.protobuf.messages.Mention.MentionType<string> {
        constructor(userId?: string);
      }
    }
  }
  class LastRead /* implements pbandk.Message */ {
    constructor(
      conversationId: string,
      lastReadTimestamp: any /* kotlin.Long */,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get conversationId(): string;
    get lastReadTimestamp(): any /* kotlin.Long */;
    get qualifiedConversationId(): Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>;
    copy(
      conversationId?: string,
      lastReadTimestamp?: any /* kotlin.Long */,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.LastRead;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.LastRead> */;
  }
  class Cleared /* implements pbandk.Message */ {
    constructor(
      conversationId: string,
      clearedTimestamp: any /* kotlin.Long */,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get conversationId(): string;
    get clearedTimestamp(): any /* kotlin.Long */;
    get qualifiedConversationId(): Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>;
    copy(
      conversationId?: string,
      clearedTimestamp?: any /* kotlin.Long */,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Cleared;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Cleared> */;
  }
  class MessageHide /* implements pbandk.Message */ {
    constructor(
      conversationId: string,
      messageId: string,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get conversationId(): string;
    get messageId(): string;
    get qualifiedConversationId(): Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>;
    copy(
      conversationId?: string,
      messageId?: string,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.MessageHide;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.MessageHide> */;
  }
  class MessageDelete /* implements pbandk.Message */ {
    constructor(messageId: string, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get messageId(): string;
    copy(
      messageId?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.MessageDelete;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.MessageDelete> */;
  }
  class MessageEdit /* implements pbandk.Message */ {
    constructor(
      replacingMessageId: string,
      content?: Nullable<com.wire.kalium.protobuf.messages.MessageEdit.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get replacingMessageId(): string;
    get content(): Nullable<com.wire.kalium.protobuf.messages.MessageEdit.Content<any /*UnknownType **/>>;
    get text(): Nullable<com.wire.kalium.protobuf.messages.Text>;
    get composite(): Nullable<com.wire.kalium.protobuf.messages.Composite>;
    copy(
      replacingMessageId?: string,
      content?: Nullable<com.wire.kalium.protobuf.messages.MessageEdit.Content<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.MessageEdit;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.MessageEdit> */;
  }
  namespace MessageEdit {
    abstract class Content<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace Content {
      class Text extends com.wire.kalium.protobuf.messages.MessageEdit.Content<com.wire.kalium.protobuf.messages.Text> {
        constructor(text: com.wire.kalium.protobuf.messages.Text);
      }
      class Composite extends com.wire.kalium.protobuf.messages.MessageEdit
        .Content<com.wire.kalium.protobuf.messages.Composite> {
        constructor(composite: com.wire.kalium.protobuf.messages.Composite);
      }
    }
  }
  class Quote /* implements pbandk.Message */ {
    constructor(
      quotedMessageId: string,
      quotedMessageSha256?: Nullable<pbandk.ByteArr>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get quotedMessageId(): string;
    get quotedMessageSha256(): Nullable<pbandk.ByteArr>;
    copy(
      quotedMessageId?: string,
      quotedMessageSha256?: Nullable<pbandk.ByteArr>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Quote;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Quote> */;
  }
  class Confirmation /* implements pbandk.Message */ {
    constructor(
      type: com.wire.kalium.protobuf.messages.Confirmation.Type,
      firstMessageId: string,
      moreMessageIds?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get type(): com.wire.kalium.protobuf.messages.Confirmation.Type;
    get firstMessageId(): string;
    get moreMessageIds(): any /* kotlin.collections.List<string> */;
    copy(
      type?: com.wire.kalium.protobuf.messages.Confirmation.Type,
      firstMessageId?: string,
      moreMessageIds?: any /* kotlin.collections.List<string> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Confirmation;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Confirmation> */;
  }
  namespace Confirmation {
    abstract class Type /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get DELIVERED(): {} & com.wire.kalium.protobuf.messages.Confirmation.Type;
      static get READ(): {} & com.wire.kalium.protobuf.messages.Confirmation.Type;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Confirmation.Type> */;
      } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.messages.Confirmation.Type> */;
    }
    namespace Type {
      class UNRECOGNIZED extends com.wire.kalium.protobuf.messages.Confirmation.Type {
        constructor(value: number);
      }
    }
  }
  class Location /* implements pbandk.Message */ {
    constructor(
      longitude: number,
      latitude: number,
      name?: Nullable<string>,
      zoom?: Nullable<number>,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get longitude(): number;
    get latitude(): number;
    get name(): Nullable<string>;
    get zoom(): Nullable<number>;
    get expectsReadConfirmation(): Nullable<boolean>;
    get legalHoldStatus(): Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>;
    copy(
      longitude?: number,
      latitude?: number,
      name?: Nullable<string>,
      zoom?: Nullable<number>,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Location;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Location> */;
  }
  class ImageAsset /* implements pbandk.Message */ {
    constructor(
      tag: string,
      width: number,
      height: number,
      originalWidth: number,
      originalHeight: number,
      mimeType: string,
      size: number,
      otrKey?: Nullable<pbandk.ByteArr>,
      macKey?: Nullable<pbandk.ByteArr>,
      mac?: Nullable<pbandk.ByteArr>,
      sha256?: Nullable<pbandk.ByteArr>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get tag(): string;
    get width(): number;
    get height(): number;
    get originalWidth(): number;
    get originalHeight(): number;
    get mimeType(): string;
    get size(): number;
    get otrKey(): Nullable<pbandk.ByteArr>;
    get macKey(): Nullable<pbandk.ByteArr>;
    get mac(): Nullable<pbandk.ByteArr>;
    get sha256(): Nullable<pbandk.ByteArr>;
    copy(
      tag?: string,
      width?: number,
      height?: number,
      originalWidth?: number,
      originalHeight?: number,
      mimeType?: string,
      size?: number,
      otrKey?: Nullable<pbandk.ByteArr>,
      macKey?: Nullable<pbandk.ByteArr>,
      mac?: Nullable<pbandk.ByteArr>,
      sha256?: Nullable<pbandk.ByteArr>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.ImageAsset;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.ImageAsset> */;
  }
  class Asset /* implements pbandk.Message */ {
    constructor(
      original?: Nullable<com.wire.kalium.protobuf.messages.Asset.Original>,
      preview?: Nullable<com.wire.kalium.protobuf.messages.Asset.Preview>,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      status?: Nullable<com.wire.kalium.protobuf.messages.Asset.Status<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get original(): Nullable<com.wire.kalium.protobuf.messages.Asset.Original>;
    get preview(): Nullable<com.wire.kalium.protobuf.messages.Asset.Preview>;
    get expectsReadConfirmation(): Nullable<boolean>;
    get legalHoldStatus(): Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>;
    get status(): Nullable<com.wire.kalium.protobuf.messages.Asset.Status<any /*UnknownType **/>>;
    get notUploaded(): Nullable<com.wire.kalium.protobuf.messages.Asset.NotUploaded>;
    get uploaded(): Nullable<com.wire.kalium.protobuf.messages.Asset.RemoteData>;
    copy(
      original?: Nullable<com.wire.kalium.protobuf.messages.Asset.Original>,
      preview?: Nullable<com.wire.kalium.protobuf.messages.Asset.Preview>,
      expectsReadConfirmation?: Nullable<boolean>,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      status?: Nullable<com.wire.kalium.protobuf.messages.Asset.Status<any /*UnknownType **/>>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Asset;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.messages.Asset;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Asset> */;
  }
  namespace Asset {
    abstract class Status<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace Status {
      class NotUploaded extends com.wire.kalium.protobuf.messages.Asset
        .Status<com.wire.kalium.protobuf.messages.Asset.NotUploaded> {
        constructor(notUploaded?: com.wire.kalium.protobuf.messages.Asset.NotUploaded);
      }
      class Uploaded extends com.wire.kalium.protobuf.messages.Asset
        .Status<com.wire.kalium.protobuf.messages.Asset.RemoteData> {
        constructor(uploaded: com.wire.kalium.protobuf.messages.Asset.RemoteData);
      }
    }
    abstract class NotUploaded /* implements pbandk.Message.Enum */ {
      protected constructor(value: number, name?: Nullable<string>);
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      toString(): string;
      static get CANCELLED(): {} & com.wire.kalium.protobuf.messages.Asset.NotUploaded;
      static get FAILED(): {} & com.wire.kalium.protobuf.messages.Asset.NotUploaded;
      static get Companion(): {
        get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.messages.Asset.NotUploaded> */;
      } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.messages.Asset.NotUploaded> */;
    }
    namespace NotUploaded {
      class UNRECOGNIZED extends com.wire.kalium.protobuf.messages.Asset.NotUploaded {
        constructor(value: number);
      }
    }
    class Original /* implements pbandk.Message */ {
      constructor(
        mimeType: string,
        size: any /* kotlin.Long */,
        name?: Nullable<string>,
        source?: Nullable<string>,
        caption?: Nullable<string>,
        metaData?: Nullable<com.wire.kalium.protobuf.messages.Asset.Original.MetaData<any /*UnknownType **/>>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get mimeType(): string;
      get size(): any /* kotlin.Long */;
      get name(): Nullable<string>;
      get source(): Nullable<string>;
      get caption(): Nullable<string>;
      get metaData(): Nullable<com.wire.kalium.protobuf.messages.Asset.Original.MetaData<any /*UnknownType **/>>;
      get image(): Nullable<com.wire.kalium.protobuf.messages.Asset.ImageMetaData>;
      get video(): Nullable<com.wire.kalium.protobuf.messages.Asset.VideoMetaData>;
      get audio(): Nullable<com.wire.kalium.protobuf.messages.Asset.AudioMetaData>;
      copy(
        mimeType?: string,
        size?: any /* kotlin.Long */,
        name?: Nullable<string>,
        source?: Nullable<string>,
        caption?: Nullable<string>,
        metaData?: Nullable<com.wire.kalium.protobuf.messages.Asset.Original.MetaData<any /*UnknownType **/>>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.messages.Asset.Original;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Asset.Original> */;
    }
    namespace Original {
      abstract class MetaData<V> /* extends pbandk.Message.OneOf<V> */ {
        protected constructor(value: V);
      }
      namespace MetaData {
        class Image extends com.wire.kalium.protobuf.messages.Asset.Original
          .MetaData<com.wire.kalium.protobuf.messages.Asset.ImageMetaData> {
          constructor(image: com.wire.kalium.protobuf.messages.Asset.ImageMetaData);
        }
        class Video extends com.wire.kalium.protobuf.messages.Asset.Original
          .MetaData<com.wire.kalium.protobuf.messages.Asset.VideoMetaData> {
          constructor(video: com.wire.kalium.protobuf.messages.Asset.VideoMetaData);
        }
        class Audio extends com.wire.kalium.protobuf.messages.Asset.Original
          .MetaData<com.wire.kalium.protobuf.messages.Asset.AudioMetaData> {
          constructor(audio: com.wire.kalium.protobuf.messages.Asset.AudioMetaData);
        }
      }
    }
    class Preview /* implements pbandk.Message */ {
      constructor(
        mimeType: string,
        size: any /* kotlin.Long */,
        remote?: Nullable<com.wire.kalium.protobuf.messages.Asset.RemoteData>,
        metaData?: Nullable<com.wire.kalium.protobuf.messages.Asset.Preview.MetaData<any /*UnknownType **/>>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get mimeType(): string;
      get size(): any /* kotlin.Long */;
      get remote(): Nullable<com.wire.kalium.protobuf.messages.Asset.RemoteData>;
      get metaData(): Nullable<com.wire.kalium.protobuf.messages.Asset.Preview.MetaData<any /*UnknownType **/>>;
      get image(): Nullable<com.wire.kalium.protobuf.messages.Asset.ImageMetaData>;
      copy(
        mimeType?: string,
        size?: any /* kotlin.Long */,
        remote?: Nullable<com.wire.kalium.protobuf.messages.Asset.RemoteData>,
        metaData?: Nullable<com.wire.kalium.protobuf.messages.Asset.Preview.MetaData<any /*UnknownType **/>>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.messages.Asset.Preview;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Asset.Preview> */;
    }
    namespace Preview {
      abstract class MetaData<V> /* extends pbandk.Message.OneOf<V> */ {
        protected constructor(value: V);
      }
      namespace MetaData {
        class Image extends com.wire.kalium.protobuf.messages.Asset.Preview
          .MetaData<com.wire.kalium.protobuf.messages.Asset.ImageMetaData> {
          constructor(image: com.wire.kalium.protobuf.messages.Asset.ImageMetaData);
        }
      }
    }
    class ImageMetaData /* implements pbandk.Message */ {
      constructor(
        width: number,
        height: number,
        tag?: Nullable<string>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get width(): number;
      get height(): number;
      get tag(): Nullable<string>;
      copy(
        width?: number,
        height?: number,
        tag?: Nullable<string>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.messages.Asset.ImageMetaData;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Asset.ImageMetaData> */;
    }
    class VideoMetaData /* implements pbandk.Message */ {
      constructor(
        width?: Nullable<number>,
        height?: Nullable<number>,
        durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get width(): Nullable<number>;
      get height(): Nullable<number>;
      get durationInMillis(): Nullable<any> /* Nullable<kotlin.Long> */;
      copy(
        width?: Nullable<number>,
        height?: Nullable<number>,
        durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.messages.Asset.VideoMetaData;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): com.wire.kalium.protobuf.messages.Asset.VideoMetaData;
      } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Asset.VideoMetaData> */;
    }
    class AudioMetaData /* implements pbandk.Message */ {
      constructor(
        durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
        normalizedLoudness?: Nullable<pbandk.ByteArr>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get durationInMillis(): Nullable<any> /* Nullable<kotlin.Long> */;
      get normalizedLoudness(): Nullable<pbandk.ByteArr>;
      copy(
        durationInMillis?: Nullable<any> /* Nullable<kotlin.Long> */,
        normalizedLoudness?: Nullable<pbandk.ByteArr>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.messages.Asset.AudioMetaData;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): com.wire.kalium.protobuf.messages.Asset.AudioMetaData;
      } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Asset.AudioMetaData> */;
    }
    class RemoteData /* implements pbandk.Message */ {
      constructor(
        otrKey: pbandk.ByteArr,
        sha256: pbandk.ByteArr,
        assetId?: Nullable<string>,
        assetToken?: Nullable<string>,
        assetDomain?: Nullable<string>,
        encryption?: Nullable<com.wire.kalium.protobuf.messages.EncryptionAlgorithm>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get otrKey(): pbandk.ByteArr;
      get sha256(): pbandk.ByteArr;
      get assetId(): Nullable<string>;
      get assetToken(): Nullable<string>;
      get assetDomain(): Nullable<string>;
      get encryption(): Nullable<com.wire.kalium.protobuf.messages.EncryptionAlgorithm>;
      copy(
        otrKey?: pbandk.ByteArr,
        sha256?: pbandk.ByteArr,
        assetId?: Nullable<string>,
        assetToken?: Nullable<string>,
        assetDomain?: Nullable<string>,
        encryption?: Nullable<com.wire.kalium.protobuf.messages.EncryptionAlgorithm>,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.messages.Asset.RemoteData;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Asset.RemoteData> */;
    }
  }
  class External /* implements pbandk.Message */ {
    constructor(
      otrKey: pbandk.ByteArr,
      sha256?: Nullable<pbandk.ByteArr>,
      encryption?: Nullable<com.wire.kalium.protobuf.messages.EncryptionAlgorithm>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get otrKey(): pbandk.ByteArr;
    get sha256(): Nullable<pbandk.ByteArr>;
    get encryption(): Nullable<com.wire.kalium.protobuf.messages.EncryptionAlgorithm>;
    copy(
      otrKey?: pbandk.ByteArr,
      sha256?: Nullable<pbandk.ByteArr>,
      encryption?: Nullable<com.wire.kalium.protobuf.messages.EncryptionAlgorithm>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.External;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.External> */;
  }
  class Reaction /* implements pbandk.Message */ {
    constructor(
      emoji: Nullable<string> | undefined,
      messageId: string,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get emoji(): Nullable<string>;
    get messageId(): string;
    get legalHoldStatus(): Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>;
    copy(
      emoji?: Nullable<string>,
      messageId?: string,
      legalHoldStatus?: Nullable<com.wire.kalium.protobuf.messages.LegalHoldStatus>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Reaction;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Reaction> */;
  }
  class Calling /* implements pbandk.Message */ {
    constructor(
      content: string,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get content(): string;
    get qualifiedConversationId(): Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>;
    copy(
      content?: string,
      qualifiedConversationId?: Nullable<com.wire.kalium.protobuf.messages.QualifiedConversationId>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.Calling;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.Calling> */;
  }
  class DataTransfer /* implements pbandk.Message */ {
    constructor(
      trackingIdentifier?: Nullable<com.wire.kalium.protobuf.messages.TrackingIdentifier>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get trackingIdentifier(): Nullable<com.wire.kalium.protobuf.messages.TrackingIdentifier>;
    copy(
      trackingIdentifier?: Nullable<com.wire.kalium.protobuf.messages.TrackingIdentifier>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.DataTransfer;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.messages.DataTransfer;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.DataTransfer> */;
  }
  class TrackingIdentifier /* implements pbandk.Message */ {
    constructor(identifier: string, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get identifier(): string;
    copy(
      identifier?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.messages.TrackingIdentifier;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.messages.TrackingIdentifier> */;
  }
  function orDefaultForComposite(
    _this_: Nullable<com.wire.kalium.protobuf.messages.Composite>,
  ): com.wire.kalium.protobuf.messages.Composite;
  function orDefaultForCompositeItem(
    _this_: Nullable<com.wire.kalium.protobuf.messages.Composite.Item>,
  ): com.wire.kalium.protobuf.messages.Composite.Item;
  function orDefaultForTweet(
    _this_: Nullable<com.wire.kalium.protobuf.messages.Tweet>,
  ): com.wire.kalium.protobuf.messages.Tweet;
  function orDefaultForAsset(
    _this_: Nullable<com.wire.kalium.protobuf.messages.Asset>,
  ): com.wire.kalium.protobuf.messages.Asset;
  function orDefaultForAssetVideoMetaData(
    _this_: Nullable<com.wire.kalium.protobuf.messages.Asset.VideoMetaData>,
  ): com.wire.kalium.protobuf.messages.Asset.VideoMetaData;
  function orDefaultForAssetAudioMetaData(
    _this_: Nullable<com.wire.kalium.protobuf.messages.Asset.AudioMetaData>,
  ): com.wire.kalium.protobuf.messages.Asset.AudioMetaData;
  function orDefaultForDataTransfer(
    _this_: Nullable<com.wire.kalium.protobuf.messages.DataTransfer>,
  ): com.wire.kalium.protobuf.messages.DataTransfer;
}
export declare namespace com.wire.kalium.protobuf.mls {
  abstract class GroupInfoType /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get PUBLIC_GROUP_STATE(): {} & com.wire.kalium.protobuf.mls.GroupInfoType;
    static get GROUP_INFO(): {} & com.wire.kalium.protobuf.mls.GroupInfoType;
    static get GROUP_INFO_JWE(): {} & com.wire.kalium.protobuf.mls.GroupInfoType;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.mls.GroupInfoType> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.mls.GroupInfoType> */;
  }
  namespace GroupInfoType {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.mls.GroupInfoType {
      constructor(value: number);
    }
  }
  abstract class RatchetTreeType /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get FULL(): {} & com.wire.kalium.protobuf.mls.RatchetTreeType;
    static get DELTA(): {} & com.wire.kalium.protobuf.mls.RatchetTreeType;
    static get REFERENCE(): {} & com.wire.kalium.protobuf.mls.RatchetTreeType;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.mls.RatchetTreeType> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.mls.RatchetTreeType> */;
  }
  namespace RatchetTreeType {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.mls.RatchetTreeType {
      constructor(value: number);
    }
  }
  class GroupInfoBundle /* implements pbandk.Message */ {
    constructor(
      groupInfoType: com.wire.kalium.protobuf.mls.GroupInfoType,
      ratchetTreeType: com.wire.kalium.protobuf.mls.RatchetTreeType,
      groupInfo: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get groupInfoType(): com.wire.kalium.protobuf.mls.GroupInfoType;
    get ratchetTreeType(): com.wire.kalium.protobuf.mls.RatchetTreeType;
    get groupInfo(): pbandk.ByteArr;
    copy(
      groupInfoType?: com.wire.kalium.protobuf.mls.GroupInfoType,
      ratchetTreeType?: com.wire.kalium.protobuf.mls.RatchetTreeType,
      groupInfo?: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.mls.GroupInfoBundle;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.mls.GroupInfoBundle> */;
  }
  class CommitBundle /* implements pbandk.Message */ {
    constructor(
      commit: pbandk.ByteArr,
      welcome: Nullable<pbandk.ByteArr> | undefined,
      groupInfoBundle: com.wire.kalium.protobuf.mls.GroupInfoBundle,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get commit(): pbandk.ByteArr;
    get welcome(): Nullable<pbandk.ByteArr>;
    get groupInfoBundle(): com.wire.kalium.protobuf.mls.GroupInfoBundle;
    copy(
      commit?: pbandk.ByteArr,
      welcome?: Nullable<pbandk.ByteArr>,
      groupInfoBundle?: com.wire.kalium.protobuf.mls.GroupInfoBundle,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.mls.CommitBundle;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.mls.CommitBundle> */;
  }
}
export declare namespace com.wire.kalium.protobuf.otr {
  abstract class Priority /* implements pbandk.Message.Enum */ {
    protected constructor(value: number, name?: Nullable<string>);
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    toString(): string;
    static get LOW_PRIORITY(): {} & com.wire.kalium.protobuf.otr.Priority;
    static get HIGH_PRIORITY(): {} & com.wire.kalium.protobuf.otr.Priority;
    static get Companion(): {
      get values(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.Priority> */;
    } & any /* pbandk.Message.Enum.Companion<com.wire.kalium.protobuf.otr.Priority> */;
  }
  namespace Priority {
    class UNRECOGNIZED extends com.wire.kalium.protobuf.otr.Priority {
      constructor(value: number);
    }
  }
  class UserId /* implements pbandk.Message */ {
    constructor(uuid: pbandk.ByteArr, unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    get uuid(): pbandk.ByteArr;
    copy(
      uuid?: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.UserId;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.UserId> */;
  }
  class QualifiedUserId /* implements pbandk.Message */ {
    constructor(
      id: string,
      domain: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get id(): string;
    get domain(): string;
    copy(
      id?: string,
      domain?: string,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.QualifiedUserId;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.QualifiedUserId> */;
  }
  class ClientId /* implements pbandk.Message */ {
    constructor(
      client: any /* kotlin.Long */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get client(): any /* kotlin.Long */;
    copy(
      client?: any /* kotlin.Long */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.ClientId;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.ClientId> */;
  }
  class ClientEntry /* implements pbandk.Message */ {
    constructor(
      client: com.wire.kalium.protobuf.otr.ClientId,
      text: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get client(): com.wire.kalium.protobuf.otr.ClientId;
    get text(): pbandk.ByteArr;
    copy(
      client?: com.wire.kalium.protobuf.otr.ClientId,
      text?: pbandk.ByteArr,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.ClientEntry;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.ClientEntry> */;
  }
  class UserEntry /* implements pbandk.Message */ {
    constructor(
      user: com.wire.kalium.protobuf.otr.UserId,
      clients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.ClientEntry> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get user(): com.wire.kalium.protobuf.otr.UserId;
    get clients(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.ClientEntry> */;
    copy(
      user?: com.wire.kalium.protobuf.otr.UserId,
      clients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.ClientEntry> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.UserEntry;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.UserEntry> */;
  }
  class QualifiedUserEntry /* implements pbandk.Message */ {
    constructor(
      domain: string,
      entries?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get domain(): string;
    get entries(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */;
    copy(
      domain?: string,
      entries?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.QualifiedUserEntry;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.QualifiedUserEntry> */;
  }
  class NewOtrMessage /* implements pbandk.Message */ {
    constructor(
      sender: com.wire.kalium.protobuf.otr.ClientId,
      recipients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */,
      nativePush?: Nullable<boolean>,
      blob?: Nullable<pbandk.ByteArr>,
      nativePriority?: Nullable<com.wire.kalium.protobuf.otr.Priority>,
      transient?: Nullable<boolean>,
      reportMissing?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserId> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get sender(): com.wire.kalium.protobuf.otr.ClientId;
    get recipients(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */;
    get nativePush(): Nullable<boolean>;
    get blob(): Nullable<pbandk.ByteArr>;
    get nativePriority(): Nullable<com.wire.kalium.protobuf.otr.Priority>;
    get transient(): Nullable<boolean>;
    get reportMissing(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserId> */;
    copy(
      sender?: com.wire.kalium.protobuf.otr.ClientId,
      recipients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */,
      nativePush?: Nullable<boolean>,
      blob?: Nullable<pbandk.ByteArr>,
      nativePriority?: Nullable<com.wire.kalium.protobuf.otr.Priority>,
      transient?: Nullable<boolean>,
      reportMissing?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserId> */,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.NewOtrMessage;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.NewOtrMessage> */;
  }
  class QualifiedNewOtrMessage /* implements pbandk.Message */ {
    constructor(
      sender: com.wire.kalium.protobuf.otr.ClientId,
      recipients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserEntry> */,
      nativePush?: Nullable<boolean>,
      blob?: Nullable<pbandk.ByteArr>,
      nativePriority?: Nullable<com.wire.kalium.protobuf.otr.Priority>,
      transient?: Nullable<boolean>,
      clientMismatchStrategy?: Nullable<
        com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage.ClientMismatchStrategy<any /*UnknownType **/>
      >,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get sender(): com.wire.kalium.protobuf.otr.ClientId;
    get recipients(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserEntry> */;
    get nativePush(): Nullable<boolean>;
    get blob(): Nullable<pbandk.ByteArr>;
    get nativePriority(): Nullable<com.wire.kalium.protobuf.otr.Priority>;
    get transient(): Nullable<boolean>;
    get clientMismatchStrategy(): Nullable<
      com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage.ClientMismatchStrategy<any /*UnknownType **/>
    >;
    get reportAll(): Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll>;
    get ignoreAll(): Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll>;
    get reportOnly(): Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly>;
    get ignoreOnly(): Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly>;
    copy(
      sender?: com.wire.kalium.protobuf.otr.ClientId,
      recipients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserEntry> */,
      nativePush?: Nullable<boolean>,
      blob?: Nullable<pbandk.ByteArr>,
      nativePriority?: Nullable<com.wire.kalium.protobuf.otr.Priority>,
      transient?: Nullable<boolean>,
      clientMismatchStrategy?: Nullable<
        com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage.ClientMismatchStrategy<any /*UnknownType **/>
      >,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage> */;
  }
  namespace QualifiedNewOtrMessage {
    abstract class ClientMismatchStrategy<V> /* extends pbandk.Message.OneOf<V> */ {
      protected constructor(value: V);
    }
    namespace ClientMismatchStrategy {
      class ReportAll extends com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage
        .ClientMismatchStrategy<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll> {
        constructor(reportAll: com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll);
      }
      class IgnoreAll extends com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage
        .ClientMismatchStrategy<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll> {
        constructor(ignoreAll: com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll);
      }
      class ReportOnly extends com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage
        .ClientMismatchStrategy<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly> {
        constructor(reportOnly: com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly);
      }
      class IgnoreOnly extends com.wire.kalium.protobuf.otr.QualifiedNewOtrMessage
        .ClientMismatchStrategy<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly> {
        constructor(ignoreOnly: com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly);
      }
    }
  }
  class ClientMismatchStrategy /* implements pbandk.Message */ {
    constructor(unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
    copy(
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      get defaultInstance(): com.wire.kalium.protobuf.otr.ClientMismatchStrategy;
    } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.ClientMismatchStrategy> */;
  }
  namespace ClientMismatchStrategy {
    class ReportAll /* implements pbandk.Message */ {
      constructor(unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
      copy(
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll;
      } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll> */;
    }
    class IgnoreAll /* implements pbandk.Message */ {
      constructor(unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */);
      copy(
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll;
      } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll> */;
    }
    class ReportOnly /* implements pbandk.Message */ {
      constructor(
        userIds?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserId> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get userIds(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserId> */;
      copy(
        userIds?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserId> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly;
      } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly> */;
    }
    class IgnoreOnly /* implements pbandk.Message */ {
      constructor(
        userIds?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserId> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      );
      get userIds(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserId> */;
      copy(
        userIds?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.QualifiedUserId> */,
        unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
      ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
      static get Companion(): {
        get defaultInstance(): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly;
      } & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly> */;
    }
  }
  class OtrAssetMeta /* implements pbandk.Message */ {
    constructor(
      sender: com.wire.kalium.protobuf.otr.ClientId,
      recipients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */,
      isInline?: Nullable<boolean>,
      nativePush?: Nullable<boolean>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    );
    get sender(): com.wire.kalium.protobuf.otr.ClientId;
    get recipients(): any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */;
    get isInline(): Nullable<boolean>;
    get nativePush(): Nullable<boolean>;
    copy(
      sender?: com.wire.kalium.protobuf.otr.ClientId,
      recipients?: any /* kotlin.collections.List<com.wire.kalium.protobuf.otr.UserEntry> */,
      isInline?: Nullable<boolean>,
      nativePush?: Nullable<boolean>,
      unknownFields?: any /* kotlin.collections.Map<number, pbandk.UnknownField> */,
    ): com.wire.kalium.protobuf.otr.OtrAssetMeta;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {} & any /* pbandk.Message.Companion<com.wire.kalium.protobuf.otr.OtrAssetMeta> */;
  }
  function orDefaultForClientMismatchStrategy(
    _this_: Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy>,
  ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy;
  function orDefaultForClientMismatchStrategyReportAll(
    _this_: Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll>,
  ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportAll;
  function orDefaultForClientMismatchStrategyIgnoreAll(
    _this_: Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll>,
  ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreAll;
  function orDefaultForClientMismatchStrategyReportOnly(
    _this_: Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly>,
  ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.ReportOnly;
  function orDefaultForClientMismatchStrategyIgnoreOnly(
    _this_: Nullable<com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly>,
  ): com.wire.kalium.protobuf.otr.ClientMismatchStrategy.IgnoreOnly;
}
export declare namespace com.wire.backup {
  const MPBackup: {
    get ZIP_ENTRY_DATA(): string;
  };
}
export declare namespace com.wire.backup.data {
  class BackupData {
    constructor(
      metadata: com.wire.backup.data.BackupMetadata,
      users: Array<com.wire.backup.data.BackupUser>,
      conversations: Array<com.wire.backup.data.BackupConversation>,
      messages: Array<com.wire.backup.data.BackupMessage>,
    );
    get metadata(): com.wire.backup.data.BackupMetadata;
    get users(): Array<com.wire.backup.data.BackupUser>;
    get conversations(): Array<com.wire.backup.data.BackupConversation>;
    get messages(): Array<com.wire.backup.data.BackupMessage>;
    get userList(): any /* kotlin.collections.List<com.wire.backup.data.BackupUser> */;
    get conversationList(): any /* kotlin.collections.List<com.wire.backup.data.BackupConversation> */;
    get messageList(): any /* kotlin.collections.List<com.wire.backup.data.BackupMessage> */;
  }
  class BackupQualifiedId {
    constructor(id: string, domain: string);
    get id(): string;
    get domain(): string;
    toString(): string;
    copy(id?: string, domain?: string): com.wire.backup.data.BackupQualifiedId;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
    static get Companion(): {
      fromEncodedString(id: string): Nullable<com.wire.backup.data.BackupQualifiedId>;
    };
  }
  class BackupUser {
    constructor(id: com.wire.backup.data.BackupQualifiedId, name: string, handle: string);
    get id(): com.wire.backup.data.BackupQualifiedId;
    get name(): string;
    get handle(): string;
    copy(id?: com.wire.backup.data.BackupQualifiedId, name?: string, handle?: string): com.wire.backup.data.BackupUser;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
  }
  class BackupConversation {
    constructor(id: com.wire.backup.data.BackupQualifiedId, name: string);
    get id(): com.wire.backup.data.BackupQualifiedId;
    get name(): string;
    copy(id?: com.wire.backup.data.BackupQualifiedId, name?: string): com.wire.backup.data.BackupConversation;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
  }
  class BackupMessage {
    constructor(
      id: string,
      conversationId: com.wire.backup.data.BackupQualifiedId,
      senderUserId: com.wire.backup.data.BackupQualifiedId,
      senderClientId: string,
      creationDate: com.wire.backup.data.BackupDateTime,
      content: com.wire.backup.data.BackupMessageContent,
      webPrimaryKey?: Nullable<number>,
    );
    get id(): string;
    get conversationId(): com.wire.backup.data.BackupQualifiedId;
    get senderUserId(): com.wire.backup.data.BackupQualifiedId;
    get senderClientId(): string;
    get creationDate(): com.wire.backup.data.BackupDateTime;
    get content(): com.wire.backup.data.BackupMessageContent;
    /** @deprecated Used only by the Webteam in order to simplify debugging */
    get webPrimaryKey(): Nullable<number>;
    copy(
      id?: string,
      conversationId?: com.wire.backup.data.BackupQualifiedId,
      senderUserId?: com.wire.backup.data.BackupQualifiedId,
      senderClientId?: string,
      creationDate?: com.wire.backup.data.BackupDateTime,
      content?: com.wire.backup.data.BackupMessageContent,
      webPrimaryKey?: Nullable<number>,
    ): com.wire.backup.data.BackupMessage;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
  }
  abstract class BackupMessageContent {
    protected constructor();
  }
  namespace BackupMessageContent {
    class Text extends com.wire.backup.data.BackupMessageContent {
      constructor(text: string);
      get text(): string;
      copy(text?: string): com.wire.backup.data.BackupMessageContent.Text;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
    }
    class Asset extends com.wire.backup.data.BackupMessageContent {
      constructor(
        mimeType: string,
        size: number,
        name: Nullable<string>,
        otrKey: Int8Array,
        sha256: Int8Array,
        assetId: string,
        assetToken: Nullable<string>,
        assetDomain: Nullable<string>,
        encryption: Nullable<com.wire.backup.data.BackupMessageContent.Asset.EncryptionAlgorithm>,
        metaData: Nullable<com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata>,
      );
      get mimeType(): string;
      get size(): number;
      get name(): Nullable<string>;
      get otrKey(): Int8Array;
      get sha256(): Int8Array;
      get assetId(): string;
      get assetToken(): Nullable<string>;
      get assetDomain(): Nullable<string>;
      get encryption(): Nullable<com.wire.backup.data.BackupMessageContent.Asset.EncryptionAlgorithm>;
      get metaData(): Nullable<com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata>;
      equals(other: Nullable<any>): boolean;
      hashCode(): number;
      copy(
        mimeType?: string,
        size?: number,
        name?: Nullable<string>,
        otrKey?: Int8Array,
        sha256?: Int8Array,
        assetId?: string,
        assetToken?: Nullable<string>,
        assetDomain?: Nullable<string>,
        encryption?: Nullable<com.wire.backup.data.BackupMessageContent.Asset.EncryptionAlgorithm>,
        metaData?: Nullable<com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata>,
      ): com.wire.backup.data.BackupMessageContent.Asset;
      toString(): string;
    }
    namespace Asset {
      abstract class EncryptionAlgorithm {
        private constructor();
        static get AES_GCM(): com.wire.backup.data.BackupMessageContent.Asset.EncryptionAlgorithm & {
          get name(): 'AES_GCM';
          get ordinal(): 0;
        };
        static get AES_CBC(): com.wire.backup.data.BackupMessageContent.Asset.EncryptionAlgorithm & {
          get name(): 'AES_CBC';
          get ordinal(): 1;
        };
        static values(): Array<com.wire.backup.data.BackupMessageContent.Asset.EncryptionAlgorithm>;
        static valueOf(value: string): com.wire.backup.data.BackupMessageContent.Asset.EncryptionAlgorithm;
        get name(): 'AES_GCM' | 'AES_CBC';
        get ordinal(): 0 | 1;
      }
      abstract class AssetMetadata {
        protected constructor();
      }
      namespace AssetMetadata {
        class Image extends com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata {
          constructor(width: number, height: number, tag: Nullable<string>);
          get width(): number;
          get height(): number;
          get tag(): Nullable<string>;
          copy(
            width?: number,
            height?: number,
            tag?: Nullable<string>,
          ): com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata.Image;
          toString(): string;
          hashCode(): number;
          equals(other: Nullable<any>): boolean;
        }
        class Video extends com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata {
          constructor(
            width: Nullable<number>,
            height: Nullable<number>,
            duration: Nullable<any> /* Nullable<kotlin.Long> */,
          );
          get width(): Nullable<number>;
          get height(): Nullable<number>;
          get duration(): Nullable<any> /* Nullable<kotlin.Long> */;
          copy(
            width?: Nullable<number>,
            height?: Nullable<number>,
            duration?: Nullable<any> /* Nullable<kotlin.Long> */,
          ): com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata.Video;
          toString(): string;
          hashCode(): number;
          equals(other: Nullable<any>): boolean;
        }
        class Audio extends com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata {
          constructor(normalization: Nullable<Int8Array>, duration: Nullable<any> /* Nullable<kotlin.Long> */);
          get normalization(): Nullable<Int8Array>;
          get duration(): Nullable<any> /* Nullable<kotlin.Long> */;
          copy(
            normalization?: Nullable<Int8Array>,
            duration?: Nullable<any> /* Nullable<kotlin.Long> */,
          ): com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata.Audio;
          toString(): string;
          hashCode(): number;
          equals(other: Nullable<any>): boolean;
        }
        class Generic extends com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata {
          constructor(name: Nullable<string>);
          get name(): Nullable<string>;
          copy(name?: Nullable<string>): com.wire.backup.data.BackupMessageContent.Asset.AssetMetadata.Generic;
          toString(): string;
          hashCode(): number;
          equals(other: Nullable<any>): boolean;
        }
      }
    }
    class Location extends com.wire.backup.data.BackupMessageContent {
      constructor(longitude: number, latitude: number, name: Nullable<string>, zoom: Nullable<number>);
      get longitude(): number;
      get latitude(): number;
      get name(): Nullable<string>;
      get zoom(): Nullable<number>;
      copy(
        longitude?: number,
        latitude?: number,
        name?: Nullable<string>,
        zoom?: Nullable<number>,
      ): com.wire.backup.data.BackupMessageContent.Location;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
    }
  }
}
export declare namespace com.wire.backup.data {
  class BackupMetadata {
    constructor(
      version: string,
      userId: com.wire.backup.data.BackupQualifiedId,
      creationTime: com.wire.backup.data.BackupDateTime,
      clientId: Nullable<string>,
    );
    get version(): string;
    get userId(): com.wire.backup.data.BackupQualifiedId;
    get creationTime(): com.wire.backup.data.BackupDateTime;
    get clientId(): Nullable<string>;
    copy(
      version?: string,
      userId?: com.wire.backup.data.BackupQualifiedId,
      creationTime?: com.wire.backup.data.BackupDateTime,
      clientId?: Nullable<string>,
    ): com.wire.backup.data.BackupMetadata;
    toString(): string;
    hashCode(): number;
    equals(other: Nullable<any>): boolean;
  }
}
export declare namespace com.wire.backup.dump {
  abstract class CommonMPBackupExporter {
    constructor(selfUserId: com.wire.backup.data.BackupQualifiedId);
    addUser(user: com.wire.backup.data.BackupUser): void;
    addConversation(conversation: com.wire.backup.data.BackupConversation): void;
    addMessage(message: com.wire.backup.data.BackupMessage): void;
    serialize(): Int8Array;
  }
}
export declare namespace com.wire.backup.ingest {
  abstract class BackupImportResult {
    protected constructor();
    static get ParsingFailure(): {
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
    } & com.wire.backup.ingest.BackupImportResult;
  }
  namespace BackupImportResult {
    class Success extends com.wire.backup.ingest.BackupImportResult {
      constructor(backupData: com.wire.backup.data.BackupData);
      get backupData(): com.wire.backup.data.BackupData;
      copy(backupData?: com.wire.backup.data.BackupData): com.wire.backup.ingest.BackupImportResult.Success;
      toString(): string;
      hashCode(): number;
      equals(other: Nullable<any>): boolean;
    }
  }
}
export declare namespace com.wire.backup.ingest {
  abstract class CommonMPBackupImporter {
    constructor();
    importBackup(data: Int8Array): com.wire.backup.ingest.BackupImportResult;
  }
}
export declare namespace com.wire.backup.data {
  class BackupDateTime {
    constructor(date: Date);
    get date(): Date;
    equals(other: Nullable<any>): boolean;
    hashCode(): number;
    copy(date?: Date): com.wire.backup.data.BackupDateTime;
    toString(): string;
  }
}
export declare namespace com.wire.backup.dump {
  class MPBackupExporter extends com.wire.backup.dump.CommonMPBackupExporter {
    constructor(selfUserId: com.wire.backup.data.BackupQualifiedId);
  }
}
export declare namespace com.wire.backup.ingest {
  class MPBackupImporter extends com.wire.backup.ingest.CommonMPBackupImporter {
    constructor();
  }
}
export as namespace com_wire_backup;
