/*! @wireapp/cryptobox v6.3.0 */
var cryptobox =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// identity function for calling harmony imports with the correct context
/******/ 	__webpack_require__.i = function(value) { return value; };
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 21);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, exports) {

module.exports = Proteus;

/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var DecryptionError = /** @class */ (function (_super) {
    __extends(DecryptionError, _super);
    function DecryptionError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, DecryptionError.prototype);
        _this.message = message;
        _this.name = _this.constructor.name;
        _this.stack = new Error().stack;
        return _this;
    }
    return DecryptionError;
}(Error));
exports.DecryptionError = DecryptionError;


/***/ }),
/* 2 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var RecordAlreadyExistsError_1 = __webpack_require__(18);
exports.RecordAlreadyExistsError = RecordAlreadyExistsError_1.default;
var RecordNotFoundError_1 = __webpack_require__(19);
exports.RecordNotFoundError = RecordNotFoundError_1.default;
var RecordTypeError_1 = __webpack_require__(20);
exports.RecordTypeError = RecordTypeError_1.default;


/***/ }),
/* 3 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);
var EventEmitter = __webpack_require__(13);

var LRUCache = __webpack_require__(25);
var error_1 = __webpack_require__(6);
var CryptoboxSession_1 = __webpack_require__(4);
var DecryptionError_1 = __webpack_require__(1);
var InvalidPreKeyFormatError_1 = __webpack_require__(5);
var ReadOnlyStore_1 = __webpack_require__(7);
var Cryptobox = /** @class */ (function (_super) {
    __extends(Cryptobox, _super);
    /**
     * Constructs a Cryptobox.
     * @param {CryptoboxCRUDStore} cryptoBoxStore
     * @param {number} minimumAmountOfPreKeys - Minimum amount of PreKeys (including the last resort PreKey)
     */
    function Cryptobox(cryptoBoxStore, minimumAmountOfPreKeys) {
        if (minimumAmountOfPreKeys === void 0) { minimumAmountOfPreKeys = 1; }
        var _this = _super.call(this) || this;
        if (!cryptoBoxStore) {
            throw new Error("You cannot initialize Cryptobox without a storage component.");
        }
        if (minimumAmountOfPreKeys > Proteus.keys.PreKey.MAX_PREKEY_ID) {
            minimumAmountOfPreKeys = Proteus.keys.PreKey.MAX_PREKEY_ID;
        }
        
        _this.cachedPreKeys = [];
        _this.cachedSessions = new LRUCache(1000);
        _this.minimumAmountOfPreKeys = minimumAmountOfPreKeys;
        _this.store = cryptoBoxStore;
        _this.pk_store = new ReadOnlyStore_1.ReadOnlyStore(_this.store);
        var storageEngine = cryptoBoxStore.constructor.name;
        
        return _this;
    }
    Cryptobox.prototype.save_session_in_cache = function (session) {
        
        this.cachedSessions.set(session.id, session);
        return session;
    };
    Cryptobox.prototype.load_session_from_cache = function (session_id) {
        
        return this.cachedSessions.get(session_id);
    };
    Cryptobox.prototype.remove_session_from_cache = function (session_id) {
        
        this.cachedSessions.delete(session_id);
    };
    Cryptobox.prototype.create = function () {
        var _this = this;
        
        return this.create_new_identity()
            .then(function (identity) {
            _this.identity = identity;
            
            return _this.create_last_resort_prekey();
        })
            .then(function (lastResortPreKey) {
            _this.cachedPreKeys = [lastResortPreKey];
            
            return _this.init();
        });
    };
    Cryptobox.prototype.load = function () {
        var _this = this;
        
        return this.store
            .load_identity()
            .then(function (identity) {
            if (identity) {
                
                _this.identity = identity;
                
                return _this.store.load_prekeys();
            }
            throw new error_1.CryptoboxError('Failed to load local identity');
        })
            .then(function (preKeysFromStorage) {
            var lastResortPreKey = preKeysFromStorage.find(function (preKey) { return preKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID; });
            if (lastResortPreKey) {
                
                _this.lastResortPreKey = lastResortPreKey;
                
                _this.cachedPreKeys = preKeysFromStorage;
                return _this.init();
            }
            throw new error_1.CryptoboxError('Failed to load last resort PreKey');
        });
    };
    Cryptobox.prototype.init = function () {
        var _this = this;
        return this.refill_prekeys().then(function () {
            var ids = _this.cachedPreKeys.map(function (preKey) { return preKey.key_id.toString(); });
            
            return _this.cachedPreKeys.sort(function (a, b) { return a.key_id - b.key_id; });
        });
    };
    Cryptobox.prototype.get_serialized_last_resort_prekey = function () {
        return Promise.resolve(this.serialize_prekey(this.lastResortPreKey));
    };
    Cryptobox.prototype.get_serialized_standard_prekeys = function () {
        var _this = this;
        var standardPreKeys = this.cachedPreKeys
            .map(function (preKey) {
            var isLastResortPreKey = preKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID;
            return isLastResortPreKey ? undefined : _this.serialize_prekey(preKey);
        })
            .filter(function (preKeyJson) { return preKeyJson; });
        return Promise.resolve(standardPreKeys);
    };
    Cryptobox.prototype.publish_event = function (topic, event) {
        this.emit(topic, event);
        
    };
    Cryptobox.prototype.publish_prekeys = function (newPreKeys) {
        if (newPreKeys.length > 0) {
            this.publish_event(Cryptobox.TOPIC.NEW_PREKEYS, newPreKeys);
        }
    };
    Cryptobox.prototype.publish_session_id = function (session) {
        this.publish_event(Cryptobox.TOPIC.NEW_SESSION, session.id);
    };
    /**
     * This method returns all PreKeys available, respecting the minimum required amount of PreKeys.
     * If all available PreKeys don't meet the minimum PreKey amount, new PreKeys will be created.
     */
    Cryptobox.prototype.refill_prekeys = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            var missingAmount = Math.max(0, _this.minimumAmountOfPreKeys - _this.cachedPreKeys.length);
            if (missingAmount > 0) {
                var startId = _this.cachedPreKeys.reduce(function (currentHighestValue, currentPreKey) {
                    var isLastResortPreKey = currentPreKey.key_id === Proteus.keys.PreKey.MAX_PREKEY_ID;
                    return isLastResortPreKey ? currentHighestValue : Math.max(currentPreKey.key_id + 1, currentHighestValue);
                }, 0);
                
                return _this.new_prekeys(startId, missingAmount);
            }
            return [];
        })
            .then(function (newPreKeys) {
            if (newPreKeys.length > 0) {
                
                _this.cachedPreKeys = _this.cachedPreKeys.concat(newPreKeys);
            }
            return newPreKeys;
        });
    };
    Cryptobox.prototype.create_new_identity = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () { return _this.store.delete_all(); })
            .then(function () {
            var identity = Proteus.keys.IdentityKeyPair.new();
            
            return _this.store.save_identity(identity);
        });
    };
    /**
     * Creates a new session which can be used for cryptographic operations (encryption & decryption) from a remote PreKey bundle.
     * Saving the session takes automatically place when the session is used to encrypt or decrypt a message.
     */
    Cryptobox.prototype.session_from_prekey = function (session_id, pre_key_bundle) {
        var _this = this;
        return this.session_load(session_id).catch(function (sessionLoadError) {
            
            var bundle;
            try {
                bundle = Proteus.keys.PreKeyBundle.deserialise(pre_key_bundle);
            }
            catch (error) {
                throw new InvalidPreKeyFormatError_1.InvalidPreKeyFormatError("PreKey bundle for session \"" + session_id + "\" has an unsupported format.");
            }
            return Proteus.session.Session.init_from_prekey(_this.identity, bundle).then(function (session) {
                var cryptobox_session = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
                return _this.session_save(cryptobox_session);
            });
        });
    };
    /**
     * Uses a cipher message to create a new session and to decrypt to message which the given cipher message contains.
     * Saving the newly created session is not needed as it's done during the inbuilt decryption phase.
     */
    Cryptobox.prototype.session_from_message = function (session_id, envelope) {
        var _this = this;
        var env = Proteus.message.Envelope.deserialise(envelope);
        return Proteus.session.Session.init_from_message(this.identity, this.pk_store, env).then(function (tuple) {
            var session = tuple[0], decrypted = tuple[1];
            var cryptoBoxSession = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
            return [cryptoBoxSession, decrypted];
        });
    };
    Cryptobox.prototype.session_load = function (session_id) {
        var _this = this;
        
        var cachedSession = this.load_session_from_cache(session_id);
        if (cachedSession) {
            return Promise.resolve(cachedSession);
        }
        return this.store.read_session(this.identity, session_id).then(function (session) {
            var cryptobox_session = new CryptoboxSession_1.CryptoboxSession(session_id, _this.pk_store, session);
            return _this.save_session_in_cache(cryptobox_session);
        });
    };
    Cryptobox.prototype.session_cleanup = function (session) {
        var _this = this;
        var preKeyDeletionPromises = this.pk_store.prekeys.map(function (preKeyId) { return _this.store.delete_prekey(preKeyId); });
        return Promise.all(preKeyDeletionPromises)
            .then(function (deletedPreKeyIds) {
            // Remove PreKey from cache
            _this.cachedPreKeys = _this.cachedPreKeys.filter(function (preKey) { return !deletedPreKeyIds.includes(preKey.key_id); });
            // Remove PreKey from removal list
            _this.pk_store.release_prekeys(deletedPreKeyIds);
            return _this.refill_prekeys();
        })
            .then(function (newPreKeys) {
            _this.publish_prekeys(newPreKeys);
            return _this.save_session_in_cache(session);
        })
            .then(function () { return session; });
    };
    Cryptobox.prototype.session_save = function (session) {
        var _this = this;
        return this.store.create_session(session.id, session.session).then(function () { return _this.session_cleanup(session); });
    };
    Cryptobox.prototype.session_update = function (session) {
        var _this = this;
        return this.store.update_session(session.id, session.session).then(function () { return _this.session_cleanup(session); });
    };
    Cryptobox.prototype.session_delete = function (session_id) {
        this.remove_session_from_cache(session_id);
        return this.store.delete_session(session_id);
    };
    Cryptobox.prototype.create_last_resort_prekey = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            
            _this.lastResortPreKey = Proteus.keys.PreKey.last_resort();
            return _this.store.save_prekeys([_this.lastResortPreKey]);
        })
            .then(function (preKeys) { return preKeys[0]; });
    };
    Cryptobox.prototype.serialize_prekey = function (prekey) {
        return Proteus.keys.PreKeyBundle.new(this.identity.public_key, prekey).serialised_json();
    };
    /**
     * Creates new PreKeys and saves them into the storage.
     */
    Cryptobox.prototype.new_prekeys = function (start, size) {
        var _this = this;
        if (size === void 0) { size = 0; }
        if (size === 0) {
            return Promise.resolve([]);
        }
        return Promise.resolve()
            .then(function () { return Proteus.keys.PreKey.generate_prekeys(start, size); })
            .then(function (newPreKeys) { return _this.store.save_prekeys(newPreKeys); });
    };
    Cryptobox.prototype.encrypt = function (session_id, payload, pre_key_bundle) {
        var _this = this;
        var encryptedBuffer;
        var loadedSession;
        return Promise.resolve()
            .then(function () {
            if (pre_key_bundle) {
                return _this.session_from_prekey(session_id, pre_key_bundle);
            }
            return _this.session_load(session_id);
        })
            .then(function (session) {
            loadedSession = session;
            return loadedSession.encrypt(payload);
        })
            .then(function (encrypted) {
            encryptedBuffer = encrypted;
            // TODO: This should be "update_session"
            return _this.session_update(loadedSession);
        })
            .then(function () { return encryptedBuffer; });
    };
    Cryptobox.prototype.decrypt = function (session_id, ciphertext) {
        var _this = this;
        var is_new_session = false;
        var message;
        var session;
        if (ciphertext.byteLength === 0) {
            return Promise.reject(new DecryptionError_1.DecryptionError('Cannot decrypt an empty ArrayBuffer.'));
        }
        return (this.session_load(session_id)
            .catch(function () { return _this.session_from_message(session_id, ciphertext); })
            .then(function (value) {
            var decrypted_message;
            if (value[0] !== undefined) {
                session = value[0], decrypted_message = value[1];
                _this.publish_session_id(session);
                is_new_session = true;
                return decrypted_message;
            }
            session = value;
            return session.decrypt(ciphertext);
        })
            .then(function (decrypted_message) {
            message = decrypted_message;
            if (is_new_session) {
                return _this.session_save(session);
            }
            return _this.session_update(session);
        })
            .then(function () { return message; }));
    };
    Cryptobox.TOPIC = {
        NEW_PREKEYS: 'new-prekeys',
        NEW_SESSION: 'new-session',
    };
    return Cryptobox;
}(EventEmitter));
exports.Cryptobox = Cryptobox;
// Note: Path to "package.json" must be relative to the "commonjs" dist files
Cryptobox.prototype.VERSION = __webpack_require__(23).version;


/***/ }),
/* 4 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);
var DecryptionError_1 = __webpack_require__(1);
var CryptoboxSession = /** @class */ (function () {
    function CryptoboxSession(id, pk_store, session) {
        this.id = id;
        this.pk_store = pk_store;
        this.session = session;
        Object.freeze(this);
    }
    CryptoboxSession.prototype.decrypt = function (ciphertext) {
        if (ciphertext.byteLength === 0) {
            return Promise.reject(new DecryptionError_1.DecryptionError('Cannot decrypt an empty ArrayBuffer.'));
        }
        var envelope = Proteus.message.Envelope.deserialise(ciphertext);
        return this.session.decrypt(this.pk_store, envelope);
    };
    CryptoboxSession.prototype.encrypt = function (plaintext) {
        return this.session.encrypt(plaintext).then(function (ciphertext) {
            return ciphertext.serialise();
        });
    };
    CryptoboxSession.prototype.fingerprint_local = function () {
        return this.session.local_identity.public_key.fingerprint();
    };
    CryptoboxSession.prototype.fingerprint_remote = function () {
        return this.session.remote_identity.fingerprint();
    };
    return CryptoboxSession;
}());
exports.CryptoboxSession = CryptoboxSession;


/***/ }),
/* 5 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var InvalidPreKeyFormatError = /** @class */ (function (_super) {
    __extends(InvalidPreKeyFormatError, _super);
    function InvalidPreKeyFormatError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, InvalidPreKeyFormatError.prototype);
        _this.name = _this.constructor.name;
        _this.message = message;
        _this.stack = new Error().stack;
        return _this;
    }
    return InvalidPreKeyFormatError;
}(Error));
exports.InvalidPreKeyFormatError = InvalidPreKeyFormatError;


/***/ }),
/* 6 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var CryptoboxError_1 = __webpack_require__(17);
exports.CryptoboxError = CryptoboxError_1.default;


/***/ }),
/* 7 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);
/**
 * This store holds IDs of PreKeys which should be deleted.
 */
var ReadOnlyStore = /** @class */ (function (_super) {
    __extends(ReadOnlyStore, _super);
    function ReadOnlyStore(store) {
        var _this = _super.call(this) || this;
        _this.store = store;
        _this.prekeys = [];
        return _this;
    }
    /**
     * Releases PreKeys from list. Called when PreKeys have been deleted.
     */
    ReadOnlyStore.prototype.release_prekeys = function (deletedPreKeyIds) {
        var _this = this;
        deletedPreKeyIds.forEach(function (id) {
            var index = _this.prekeys.indexOf(id);
            if (index > -1) {
                _this.prekeys.splice(index, 1);
            }
        });
    };
    /**
     * Returns a PreKey (if it's not marked for deletion) via the Cryptobox store.
     * @override
     */
    ReadOnlyStore.prototype.get_prekey = function (prekey_id) {
        if (this.prekeys.indexOf(prekey_id) !== -1) {
            return Promise.reject(new Error("PreKey \"" + prekey_id + "\" not found."));
        }
        return this.store.load_prekey(prekey_id).then(function (prekey) {
            return prekey;
        });
    };
    /**
     * Saves the PreKey ID which should get deleted.
     * @override
     */
    ReadOnlyStore.prototype.remove = function (prekey_id) {
        this.prekeys.push(prekey_id);
        return Promise.resolve(prekey_id);
    };
    return ReadOnlyStore;
}(Proteus.session.PreKeyStore));
exports.ReadOnlyStore = ReadOnlyStore;


/***/ }),
/* 8 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Cryptobox_1 = __webpack_require__(3);
var SerialisedRecord = /** @class */ (function () {
    function SerialisedRecord(serialised, id) {
        this.created = Date.now();
        this.id = id;
        this.serialised = serialised;
        this.version = Cryptobox_1.Cryptobox.prototype.VERSION;
    }
    return SerialisedRecord;
}());
exports.SerialisedRecord = SerialisedRecord;


/***/ }),
/* 9 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);

var Cache = /** @class */ (function () {
    function Cache() {
        this.prekeys = {};
        this.sessions = {};
        
    }
    Cache.prototype.delete_all = function () {
        this.identity = undefined;
        this.prekeys = {};
        this.sessions = {};
        return Promise.resolve(true);
    };
    Cache.prototype.delete_prekey = function (prekey_id) {
        delete this.prekeys[prekey_id];
        
        return Promise.resolve(prekey_id);
    };
    Cache.prototype.delete_session = function (session_id) {
        delete this.sessions[session_id];
        return Promise.resolve(session_id);
    };
    Cache.prototype.load_identity = function () {
        return Promise.resolve(this.identity);
    };
    Cache.prototype.load_prekey = function (prekey_id) {
        var serialised = this.prekeys[prekey_id];
        if (serialised) {
            return Promise.resolve(Proteus.keys.PreKey.deserialise(serialised));
        }
        return Promise.resolve(undefined);
    };
    Cache.prototype.load_prekeys = function () {
        var _this = this;
        var prekey_promises = Object.keys(this.prekeys).map(function (key) {
            var prekey_id = parseInt(key, 10);
            return _this.load_prekey(prekey_id);
        });
        return Promise.all(prekey_promises);
    };
    Cache.prototype.read_session = function (identity, session_id) {
        var serialised = this.sessions[session_id];
        if (serialised) {
            return Promise.resolve(Proteus.session.Session.deserialise(identity, serialised));
        }
        return Promise.reject(new Error("Session with ID \"" + session_id + "\" not found."));
    };
    Cache.prototype.save_identity = function (identity) {
        this.identity = identity;
        return Promise.resolve(this.identity);
    };
    Cache.prototype.save_prekey = function (preKey) {
        try {
            this.prekeys[preKey.key_id] = preKey.serialise();
            
        }
        catch (error) {
            // TODO: Keep (and log) error stack trace
            return Promise.reject(new Error("PreKey (no. " + preKey.key_id + ") serialization problem \"" + error.message + "\" at \"" + error.stack + "\"."));
        }
        return Promise.resolve(preKey);
    };
    Cache.prototype.save_prekeys = function (preKeys) {
        var _this = this;
        var savePromises = preKeys.map(function (preKey) {
            return _this.save_prekey(preKey);
        });
        return Promise.all(savePromises).then(function () {
            return preKeys;
        });
    };
    Cache.prototype.create_session = function (session_id, session) {
        try {
            this.sessions[session_id] = session.serialise();
        }
        catch (error) {
            return Promise.reject(new Error("Session serialization problem: \"" + error.message + "\""));
        }
        return Promise.resolve(session);
    };
    Cache.prototype.update_session = function (session_id, session) {
        return this.create_session(session_id, session);
    };
    return Cache;
}());
exports.default = Cache;


/***/ }),
/* 10 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(Buffer) {
Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);
var error_1 = __webpack_require__(2);
var SerialisedRecord_1 = __webpack_require__(8);
var CryptoboxCRUDStore = /** @class */ (function () {
    function CryptoboxCRUDStore(engine) {
        this.engine = engine;
    }
    Object.defineProperty(CryptoboxCRUDStore, "KEYS", {
        get: function () {
            return {
                LOCAL_IDENTITY: 'local_identity',
            };
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(CryptoboxCRUDStore, "STORES", {
        get: function () {
            return {
                LOCAL_IDENTITY: 'keys',
                PRE_KEYS: 'prekeys',
                SESSIONS: 'sessions',
            };
        },
        enumerable: true,
        configurable: true
    });
    CryptoboxCRUDStore.prototype.from_store = function (record) {
        var decodedData = Buffer.from(record.serialised, 'base64');
        return {
            created: record.created,
            id: record.id,
            serialised: new Uint8Array(decodedData).buffer,
            version: record.version,
        };
    };
    CryptoboxCRUDStore.prototype.to_store = function (record) {
        return {
            created: record.created,
            id: record.id,
            serialised: new Buffer(record.serialised).toString('base64'),
            version: record.version,
        };
    };
    CryptoboxCRUDStore.prototype.delete_all = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () { return _this.engine.deleteAll(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY); })
            .then(function () { return _this.engine.deleteAll(CryptoboxCRUDStore.STORES.PRE_KEYS); })
            .then(function () { return _this.engine.deleteAll(CryptoboxCRUDStore.STORES.SESSIONS); })
            .then(function () { return true; });
    };
    CryptoboxCRUDStore.prototype.delete_prekey = function (prekey_id) {
        return this.engine.delete(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString()).then(function () { return prekey_id; });
    };
    CryptoboxCRUDStore.prototype.load_identity = function () {
        var _this = this;
        return this.engine
            .read(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY)
            .then(function (payload) {
            var record = _this.from_store(payload);
            var identity = Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
            return identity;
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    CryptoboxCRUDStore.prototype.load_prekey = function (prekey_id) {
        var _this = this;
        return this.engine
            .read(CryptoboxCRUDStore.STORES.PRE_KEYS, prekey_id.toString())
            .then(function (payload) {
            var record = _this.from_store(payload);
            return Proteus.keys.PreKey.deserialise(record.serialised);
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    CryptoboxCRUDStore.prototype.load_prekeys = function () {
        var _this = this;
        return this.engine.readAll(CryptoboxCRUDStore.STORES.PRE_KEYS).then(function (records) {
            var preKeys = [];
            records.forEach(function (payload) {
                var record = _this.from_store(payload);
                var preKey = Proteus.keys.PreKey.deserialise(record.serialised);
                preKeys.push(preKey);
            });
            return preKeys;
        });
    };
    CryptoboxCRUDStore.prototype.save_identity = function (identity) {
        var record = new SerialisedRecord_1.SerialisedRecord(identity.serialise(), CryptoboxCRUDStore.KEYS.LOCAL_IDENTITY);
        var payload = this.to_store(record);
        return this.engine.create(CryptoboxCRUDStore.STORES.LOCAL_IDENTITY, record.id, payload).then(function () { return identity; });
    };
    CryptoboxCRUDStore.prototype.save_prekey = function (pre_key) {
        var record = new SerialisedRecord_1.SerialisedRecord(pre_key.serialise(), pre_key.key_id.toString());
        var payload = this.to_store(record);
        return this.engine.create(CryptoboxCRUDStore.STORES.PRE_KEYS, record.id, payload).then(function () { return pre_key; });
    };
    CryptoboxCRUDStore.prototype.save_prekeys = function (pre_keys) {
        var _this = this;
        var promises = pre_keys.map(function (pre_key) { return _this.save_prekey(pre_key); });
        return Promise.all(promises).then(function () { return pre_keys; });
    };
    CryptoboxCRUDStore.prototype.create_session = function (session_id, session) {
        var record = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        var payload = this.to_store(record);
        return this.engine.create(CryptoboxCRUDStore.STORES.SESSIONS, record.id, payload).then(function () { return session; });
    };
    CryptoboxCRUDStore.prototype.read_session = function (identity, session_id) {
        var _this = this;
        return this.engine.read(CryptoboxCRUDStore.STORES.SESSIONS, session_id).then(function (payload) {
            var record = _this.from_store(payload);
            return Proteus.session.Session.deserialise(identity, record.serialised);
        });
    };
    CryptoboxCRUDStore.prototype.update_session = function (session_id, session) {
        var record = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        var payload = this.to_store(record);
        return this.engine
            .update(CryptoboxCRUDStore.STORES.SESSIONS, record.id, { serialised: payload.serialised })
            .then(function () { return session; });
    };
    CryptoboxCRUDStore.prototype.delete_session = function (session_id) {
        return this.engine
            .delete(CryptoboxCRUDStore.STORES.SESSIONS, session_id)
            .then(function (primary_key) { return primary_key; });
    };
    return CryptoboxCRUDStore;
}());
exports.default = CryptoboxCRUDStore;

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(15).Buffer))

/***/ }),
/* 11 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Proteus = __webpack_require__(0);
var dexie_1 = __webpack_require__(24);

var error_1 = __webpack_require__(2);
var SerialisedRecord_1 = __webpack_require__(8);
var IndexedDB = /** @class */ (function () {
    function IndexedDB(identifier) {
        var _this = this;
        this.prekeys = {};
        this.TABLE = {
            LOCAL_IDENTITY: 'keys',
            PRE_KEYS: 'prekeys',
            SESSIONS: 'sessions',
        };
        this.localIdentityKey = 'local_identity';
        
        if (typeof indexedDB === 'undefined') {
            var warning = "IndexedDB isn't supported by your platform.";
            throw new Error(warning);
        }
        if (typeof identifier === 'string') {
            var schema = {};
            schema[this.TABLE.LOCAL_IDENTITY] = '';
            schema[this.TABLE.PRE_KEYS] = '';
            schema[this.TABLE.SESSIONS] = '';
            this.db = new dexie_1.default("cryptobox@" + identifier);
            this.db.version(1).stores(schema);
        }
        else {
            this.db = identifier;
            
        }
        this.db.on('blocked', function (event) {
            
            _this.db.close();
        });
    }
    IndexedDB.prototype.create = function (store_name, primary_key, entity) {
        var _this = this;
        return Promise.resolve().then(function () {
            if (entity) {
                
                return _this.db[store_name].add(entity, primary_key);
            }
            throw new error_1.RecordTypeError("Entity is \"undefined\" or \"null\". Store name \"" + store_name + "\", Primary Key \"" + primary_key + "\".");
        });
    };
    IndexedDB.prototype.read = function (store_name, primary_key) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            
            return _this.db[store_name].get(primary_key);
        })
            .then(function (record) {
            if (record) {
                
                return record;
            }
            var message = "Record \"" + primary_key + "\" from object store \"" + store_name + "\" could not be found.";
            
            throw new error_1.RecordNotFoundError(message);
        });
    };
    IndexedDB.prototype.update = function (store_name, primary_key, changes) {
        
        return this.db[store_name].update(primary_key, changes);
    };
    IndexedDB.prototype.delete = function (store_name, primary_key) {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[store_name].delete(primary_key);
        })
            .then(function () {
            
            return primary_key;
        });
    };
    IndexedDB.prototype.delete_all = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[_this.TABLE.LOCAL_IDENTITY].clear();
        })
            .then(function () {
            
            return _this.db[_this.TABLE.PRE_KEYS].clear();
        })
            .then(function () {
            
            return _this.db[_this.TABLE.SESSIONS].clear();
        })
            .then(function () {
            
            return true;
        });
    };
    IndexedDB.prototype.delete_prekey = function (prekey_id) {
        return this.delete(this.TABLE.PRE_KEYS, prekey_id.toString()).then(function () {
            return prekey_id;
        });
    };
    IndexedDB.prototype.delete_session = function (session_id) {
        return this.delete(this.TABLE.SESSIONS, session_id).then(function (primary_key) {
            return primary_key;
        });
    };
    IndexedDB.prototype.load_identity = function () {
        return this.read(this.TABLE.LOCAL_IDENTITY, this.localIdentityKey)
            .then(function (record) {
            return Proteus.keys.IdentityKeyPair.deserialise(record.serialised);
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    IndexedDB.prototype.load_prekey = function (prekey_id) {
        return this.read(this.TABLE.PRE_KEYS, prekey_id.toString())
            .then(function (record) {
            return Proteus.keys.PreKey.deserialise(record.serialised);
        })
            .catch(function (error) {
            if (error instanceof error_1.RecordNotFoundError) {
                return undefined;
            }
            throw error;
        });
    };
    IndexedDB.prototype.load_prekeys = function () {
        var _this = this;
        return Promise.resolve()
            .then(function () {
            return _this.db[_this.TABLE.PRE_KEYS].toArray();
        })
            .then(function (records) {
            return records.map(function (record) {
                return Proteus.keys.PreKey.deserialise(record.serialised);
            });
        });
    };
    IndexedDB.prototype.read_session = function (identity, session_id) {
        return this.read(this.TABLE.SESSIONS, session_id).then(function (payload) {
            return Proteus.session.Session.deserialise(identity, payload.serialised);
        });
    };
    IndexedDB.prototype.save_identity = function (identity) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(identity.serialise(), this.localIdentityKey);
        this.identity = identity;
        return this.create(this.TABLE.LOCAL_IDENTITY, payload.id, payload).then(function (primaryKey) {
            var fingerprint = identity.public_key.fingerprint();
            var message = "Saved local identity \"" + fingerprint + "\"" +
                (" with key \"" + primaryKey + "\" in object store \"" + _this.TABLE.LOCAL_IDENTITY + "\".");
            
            return identity;
        });
    };
    IndexedDB.prototype.save_prekey = function (prekey) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(prekey.serialise(), prekey.key_id.toString());
        this.prekeys[prekey.key_id] = prekey;
        return this.create(this.TABLE.PRE_KEYS, payload.id, payload).then(function (primaryKey) {
            var message = "Saved PreKey (ID \"" + prekey.key_id + "\") with key \"" + primaryKey + "\" in object store \"" + _this.TABLE.PRE_KEYS + "\".";
            
            return prekey;
        });
    };
    IndexedDB.prototype.save_prekeys = function (prekeys) {
        var _this = this;
        if (prekeys.length === 0) {
            return Promise.resolve(prekeys);
        }
        var items = [];
        var keys = prekeys.map(function (preKey) {
            var key = preKey.key_id.toString();
            var payload = new SerialisedRecord_1.SerialisedRecord(preKey.serialise(), key);
            items.push(payload);
            return key;
        });
        
        return Promise.resolve()
            .then(function () {
            return _this.db[_this.TABLE.PRE_KEYS].bulkPut(items, keys);
        })
            .then(function () {
            
            return prekeys;
        });
    };
    IndexedDB.prototype.create_session = function (session_id, session) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        return this.create(this.TABLE.SESSIONS, payload.id, payload)
            .then(function (primaryKey) {
            var message = "Added session ID \"" + session_id + "\" in object store \"" + _this.TABLE.SESSIONS + "\" with key \"" + primaryKey + "\".";
            
            return session;
        })
            .catch(function (error) {
            if (error instanceof dexie_1.default.ConstraintError) {
                var message = "Session with ID '" + session_id + "' already exists and cannot get overwritten. You need to delete the session first if you want to do it.";
                throw new error_1.RecordAlreadyExistsError(message);
            }
            throw error;
        });
    };
    IndexedDB.prototype.update_session = function (session_id, session) {
        var _this = this;
        var payload = new SerialisedRecord_1.SerialisedRecord(session.serialise(), session_id);
        return this.update(this.TABLE.SESSIONS, payload.id, { serialised: payload.serialised }).then(function (primaryKey) {
            var message = "Updated session ID \"" + session_id + "\" in object store \"" + _this.TABLE.SESSIONS + "\" with key \"" + primaryKey + "\".";
            
            return session;
        });
    };
    return IndexedDB;
}());
exports.default = IndexedDB;


/***/ }),
/* 12 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function placeHoldersCount (b64) {
  var len = b64.length
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0
}

function byteLength (b64) {
  // base64 is 4/3 + up to two characters of the original data
  return (b64.length * 3 / 4) - placeHoldersCount(b64)
}

function toByteArray (b64) {
  var i, l, tmp, placeHolders, arr
  var len = b64.length
  placeHolders = placeHoldersCount(b64)

  arr = new Arr((len * 3 / 4) - placeHolders)

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len

  var L = 0

  for (i = 0; i < l; i += 4) {
    tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)]
    arr[L++] = (tmp >> 16) & 0xFF
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  if (placeHolders === 2) {
    tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[L++] = tmp & 0xFF
  } else if (placeHolders === 1) {
    tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[L++] = (tmp >> 8) & 0xFF
    arr[L++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2])
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var output = ''
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    output += lookup[tmp >> 2]
    output += lookup[(tmp << 4) & 0x3F]
    output += '=='
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + (uint8[len - 1])
    output += lookup[tmp >> 10]
    output += lookup[(tmp >> 4) & 0x3F]
    output += lookup[(tmp << 2) & 0x3F]
    output += '='
  }

  parts.push(output)

  return parts.join('')
}


/***/ }),
/* 13 */
/***/ (function(module, exports) {

// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        // At least give some kind of context to the user
        var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
        err.context = er;
        throw err;
      }
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    args = Array.prototype.slice.call(arguments, 1);
    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else if (listeners) {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.prototype.listenerCount = function(type) {
  if (this._events) {
    var evlistener = this._events[type];

    if (isFunction(evlistener))
      return 1;
    else if (evlistener)
      return evlistener.length;
  }
  return 0;
};

EventEmitter.listenerCount = function(emitter, type) {
  return emitter.listenerCount(type);
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}


/***/ }),
/* 14 */
/***/ (function(module, exports) {

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = nBytes * 8 - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}


/***/ }),
/* 15 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/* WEBPACK VAR INJECTION */(function(global) {/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */



var base64 = __webpack_require__(12)
var ieee754 = __webpack_require__(14)
var isArray = __webpack_require__(16)

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Use Object implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * Due to various browser bugs, sometimes the Object implementation will be used even
 * when the browser supports typed arrays.
 *
 * Note:
 *
 *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
 *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
 *
 *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
 *
 *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
 *     incorrect length in some situations.

 * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
 * get the Object implementation, which is slower but behaves correctly.
 */
Buffer.TYPED_ARRAY_SUPPORT = global.TYPED_ARRAY_SUPPORT !== undefined
  ? global.TYPED_ARRAY_SUPPORT
  : typedArraySupport()

/*
 * Export kMaxLength after typed array support is determined.
 */
exports.kMaxLength = kMaxLength()

function typedArraySupport () {
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = {__proto__: Uint8Array.prototype, foo: function () { return 42 }}
    return arr.foo() === 42 && // typed array instances can be augmented
        typeof arr.subarray === 'function' && // chrome 9-10 lack `subarray`
        arr.subarray(1, 1).byteLength === 0 // ie10 has broken `subarray`
  } catch (e) {
    return false
  }
}

function kMaxLength () {
  return Buffer.TYPED_ARRAY_SUPPORT
    ? 0x7fffffff
    : 0x3fffffff
}

function createBuffer (that, length) {
  if (kMaxLength() < length) {
    throw new RangeError('Invalid typed array length')
  }
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = new Uint8Array(length)
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    if (that === null) {
      that = new Buffer(length)
    }
    that.length = length
  }

  return that
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
    return new Buffer(arg, encodingOrOffset, length)
  }

  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error(
        'If encoding is specified then the first argument must be a string'
      )
    }
    return allocUnsafe(this, arg)
  }
  return from(this, arg, encodingOrOffset, length)
}

Buffer.poolSize = 8192 // not used by this implementation

// TODO: Legacy, not needed anymore. Remove in next major version.
Buffer._augment = function (arr) {
  arr.__proto__ = Buffer.prototype
  return arr
}

function from (that, value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number')
  }

  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
    return fromArrayBuffer(that, value, encodingOrOffset, length)
  }

  if (typeof value === 'string') {
    return fromString(that, value, encodingOrOffset)
  }

  return fromObject(that, value)
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(null, value, encodingOrOffset, length)
}

if (Buffer.TYPED_ARRAY_SUPPORT) {
  Buffer.prototype.__proto__ = Uint8Array.prototype
  Buffer.__proto__ = Uint8Array
  if (typeof Symbol !== 'undefined' && Symbol.species &&
      Buffer[Symbol.species] === Buffer) {
    // Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
    Object.defineProperty(Buffer, Symbol.species, {
      value: null,
      configurable: true
    })
  }
}

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number')
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative')
  }
}

function alloc (that, size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(that, size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(that, size).fill(fill, encoding)
      : createBuffer(that, size).fill(fill)
  }
  return createBuffer(that, size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(null, size, fill, encoding)
}

function allocUnsafe (that, size) {
  assertSize(size)
  that = createBuffer(that, size < 0 ? 0 : checked(size) | 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) {
    for (var i = 0; i < size; ++i) {
      that[i] = 0
    }
  }
  return that
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(null, size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(null, size)
}

function fromString (that, string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding')
  }

  var length = byteLength(string, encoding) | 0
  that = createBuffer(that, length)

  var actual = that.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    that = that.slice(0, actual)
  }

  return that
}

function fromArrayLike (that, array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  that = createBuffer(that, length)
  for (var i = 0; i < length; i += 1) {
    that[i] = array[i] & 255
  }
  return that
}

function fromArrayBuffer (that, array, byteOffset, length) {
  array.byteLength // this throws if `array` is not a valid ArrayBuffer

  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds')
  }

  if (byteOffset === undefined && length === undefined) {
    array = new Uint8Array(array)
  } else if (length === undefined) {
    array = new Uint8Array(array, byteOffset)
  } else {
    array = new Uint8Array(array, byteOffset, length)
  }

  if (Buffer.TYPED_ARRAY_SUPPORT) {
    // Return an augmented `Uint8Array` instance, for best performance
    that = array
    that.__proto__ = Buffer.prototype
  } else {
    // Fallback: Return an object instance of the Buffer class
    that = fromArrayLike(that, array)
  }
  return that
}

function fromObject (that, obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    that = createBuffer(that, len)

    if (that.length === 0) {
      return that
    }

    obj.copy(that, 0, 0, len)
    return that
  }

  if (obj) {
    if ((typeof ArrayBuffer !== 'undefined' &&
        obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
      if (typeof obj.length !== 'number' || isnan(obj.length)) {
        return createBuffer(that, 0)
      }
      return fromArrayLike(that, obj)
    }

    if (obj.type === 'Buffer' && isArray(obj.data)) {
      return fromArrayLike(that, obj.data)
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
}

function checked (length) {
  // Note: cannot use `length < kMaxLength()` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= kMaxLength()) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + kMaxLength().toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return !!(b != null && b._isBuffer)
}

Buffer.compare = function compare (a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers')
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
      (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    string = '' + string
  }

  var len = string.length
  if (len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) return utf8ToBytes(string).length // assume utf8
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
// Buffer instances.
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length | 0
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ')
    if (this.length > max) str += ' ... '
  }
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer')
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset  // Coerce to Number.
  if (isNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (Buffer.TYPED_ARRAY_SUPPORT &&
        typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  // must be an even number of digits
  var strLen = string.length
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (isNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset | 0
    if (isFinite(length)) {
      length = length | 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  // legacy write(string, encoding, offset, length) - remove in v0.13
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
      : (firstByte > 0xBF) ? 2
      : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256)
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    newBuf = this.subarray(start, end)
    newBuf.__proto__ = Buffer.prototype
  } else {
    var sliceLen = end - start
    newBuf = new Buffer(sliceLen, undefined)
    for (var i = 0; i < sliceLen; ++i) {
      newBuf[i] = this[i + start]
    }
  }

  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  byteLength = byteLength | 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  this[offset] = (value & 0xff)
  return offset + 1
}

function objectWriteUInt16 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
    buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
      (littleEndian ? i : 1 - i) * 8
  }
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

function objectWriteUInt32 (buf, value, offset, littleEndian) {
  if (value < 0) value = 0xffffffff + value + 1
  for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
    buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff
  }
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset + 3] = (value >>> 24)
    this[offset + 2] = (value >>> 16)
    this[offset + 1] = (value >>> 8)
    this[offset] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
  } else {
    objectWriteUInt16(this, value, offset, true)
  }
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 8)
    this[offset + 1] = (value & 0xff)
  } else {
    objectWriteUInt16(this, value, offset, false)
  }
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value & 0xff)
    this[offset + 1] = (value >>> 8)
    this[offset + 2] = (value >>> 16)
    this[offset + 3] = (value >>> 24)
  } else {
    objectWriteUInt32(this, value, offset, true)
  }
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset | 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  if (Buffer.TYPED_ARRAY_SUPPORT) {
    this[offset] = (value >>> 24)
    this[offset + 1] = (value >>> 16)
    this[offset + 2] = (value >>> 8)
    this[offset + 3] = (value & 0xff)
  } else {
    objectWriteUInt32(this, value, offset, false)
  }
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start
  var i

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, start + len),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if (code < 256) {
        val = code
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : utf8ToBytes(new Buffer(val, encoding).toString())
    var len = bytes.length
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = stringtrim(str).replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function stringtrim (str) {
  if (str.trim) return str.trim()
  return str.replace(/^\s+|\s+$/g, '')
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

function isnan (val) {
  return val !== val // eslint-disable-line no-self-compare
}

/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(22)))

/***/ }),
/* 16 */
/***/ (function(module, exports) {

var toString = {}.toString;

module.exports = Array.isArray || function (arr) {
  return toString.call(arr) == '[object Array]';
};


/***/ }),
/* 17 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var CryptoboxError = /** @class */ (function (_super) {
    __extends(CryptoboxError, _super);
    function CryptoboxError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, CryptoboxError.prototype);
        _this.message = message;
        _this.name = _this.constructor.name;
        _this.stack = new Error().stack;
        return _this;
    }
    return CryptoboxError;
}(Error));
exports.default = CryptoboxError;


/***/ }),
/* 18 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var RecordAlreadyExistsError = /** @class */ (function (_super) {
    __extends(RecordAlreadyExistsError, _super);
    function RecordAlreadyExistsError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, RecordAlreadyExistsError.prototype);
        _this.message = message;
        _this.name = _this.constructor.name;
        _this.stack = new Error().stack;
        return _this;
    }
    return RecordAlreadyExistsError;
}(Error));
exports.default = RecordAlreadyExistsError;


/***/ }),
/* 19 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var RecordNotFoundError = /** @class */ (function (_super) {
    __extends(RecordNotFoundError, _super);
    function RecordNotFoundError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, RecordNotFoundError.prototype);
        _this.message = message;
        _this.name = _this.constructor.name;
        _this.stack = new Error().stack;
        return _this;
    }
    return RecordNotFoundError;
}(Error));
exports.default = RecordNotFoundError;


/***/ }),
/* 20 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var RecordTypeError = /** @class */ (function (_super) {
    __extends(RecordTypeError, _super);
    function RecordTypeError(message) {
        var _this = _super.call(this, message) || this;
        _this.message = message;
        Object.setPrototypeOf(_this, RecordTypeError.prototype);
        _this.message = message;
        _this.name = _this.constructor.name;
        _this.stack = new Error().stack;
        return _this;
    }
    return RecordTypeError;
}(Error));
exports.default = RecordTypeError;


/***/ }),
/* 21 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
var Cache_1 = __webpack_require__(9);
var IndexedDB_1 = __webpack_require__(11);
var CryptoboxCRUDStore_1 = __webpack_require__(10);
var Cryptobox_1 = __webpack_require__(3);
var error_1 = __webpack_require__(6);
var CryptoboxSession_1 = __webpack_require__(4);
var DecryptionError_1 = __webpack_require__(1);
var InvalidPreKeyFormatError_1 = __webpack_require__(5);
var ReadOnlyStore_1 = __webpack_require__(7);
var error_2 = __webpack_require__(2);
module.exports = {
    Cryptobox: Cryptobox_1.Cryptobox,
    CryptoboxSession: CryptoboxSession_1.CryptoboxSession,
    DecryptionError: DecryptionError_1.DecryptionError,
    error: {
        CryptoboxError: error_1.CryptoboxError,
    },
    InvalidPreKeyFormatError: InvalidPreKeyFormatError_1.InvalidPreKeyFormatError,
    store: {
        Cache: Cache_1.default,
        error: {
            RecordAlreadyExistsError: error_2.RecordAlreadyExistsError,
            RecordNotFoundError: error_2.RecordNotFoundError,
            RecordTypeError: error_2.RecordTypeError,
        },
        CryptoboxCRUDStore: CryptoboxCRUDStore_1.default,
        IndexedDB: IndexedDB_1.default,
        ReadOnlyStore: ReadOnlyStore_1.ReadOnlyStore,
    },
};


/***/ }),
/* 22 */
/***/ (function(module, exports) {

var g;

// This works in non-strict mode
g = (function() {
	return this;
})();

try {
	// This works if eval is allowed (see CSP)
	g = g || Function("return this")() || (1,eval)("this");
} catch(e) {
	// This works if the window reference is available
	if(typeof window === "object")
		g = window;
}

// g can still be undefined, but nothing to do about it...
// We return undefined, instead of nothing here, so it's
// easier to handle this case. if(!global) { ...}

module.exports = g;


/***/ }),
/* 23 */
/***/ (function(module, exports) {

module.exports = {"dependencies":{"@wireapp/store-engine":"0.1.4","dexie":"1.5.1","fs-extra":"5.0.0","wire-webapp-lru-cache":"2.0.0","wire-webapp-proteus":"5.2.0"},"description":"High-level API with persistent storage for Proteus.","devDependencies":{"@types/fs-extra":"5.0.0","@types/node":"8.5.7","browser-sync":"2.23.3","gulp":"3.9.1","gulp-babel":"6.1.2","gulp-bower":"0.0.13","gulp-bower-assets":"0.0.3","gulp-clean":"0.3.2","gulp-concat":"2.6.0","gulp-eslint":"3.0.1","gulp-if":"2.0.2","gulp-jasmine":"2.4.1","gulp-replace":"0.5.4","gulp-typescript":"3.1.6","gulp-util":"3.0.7","gutil":"1.6.4","karma":"1.7.0","karma-chrome-launcher":"2.1.1","karma-jasmine":"1.1.0","logdown":"2.2.0","merge2":"1.0.2","rimraf":"2.6.2","run-sequence":"1.2.2","typescript":"2.6.2","webpack":"2.3.3","yargs":"7.0.2"},"files":["dist/commonjs","dist/typings","dist/window"],"license":"GPL-3.0","main":"dist/commonjs/wire-webapp-cryptobox.js","name":"@wireapp/cryptobox","repository":"https://github.com/wireapp/wire-web-packages/tree/master/packages/cryptobox","scripts":{"clear":"rimraf dist/commonjs && rimraf dist/lib","dist":"yarn clear && gulp dist --env production","postversion":"git push && git push --tags","preversion":"yarn dist && yarn test","start":"gulp","test:browser":"gulp build && gulp test_browser","test:node":"gulp dist && node dist/index.js && gulp test_node","test:rerun":"gulp test","test":"gulp test","version":"gulp build_ts_browser && git add dist/"},"types":"dist/typings/wire-webapp-cryptobox.d.ts","version":"6.3.0"}

/***/ }),
/* 24 */
/***/ (function(module, exports) {

module.exports = Dexie;

/***/ }),
/* 25 */
/***/ (function(module, exports) {

module.exports = LRUCache;

/***/ })
/******/ ]);
//# sourceMappingURL=wire-webapp-cryptobox.js.map