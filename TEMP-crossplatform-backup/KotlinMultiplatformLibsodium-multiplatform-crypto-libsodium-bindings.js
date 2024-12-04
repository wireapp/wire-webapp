(function (root, factory) {
  if (typeof define === 'function' && define.amd) define(['exports'], factory);
  else if (typeof exports === 'object') factory(module.exports);
  else
    root['KotlinMultiplatformLibsodium-multiplatform-crypto-libsodium-bindings'] = factory(
      typeof this['KotlinMultiplatformLibsodium-multiplatform-crypto-libsodium-bindings'] === 'undefined'
        ? {}
        : this['KotlinMultiplatformLibsodium-multiplatform-crypto-libsodium-bindings'],
    );
})(this, function (_) {
  'use strict';
  //region block: pre-declaration
  //endregion
  function get_crypto_aead_xchacha20poly1305_ietf_KEYBYTES() {
    return crypto_aead_xchacha20poly1305_ietf_KEYBYTES;
  }
  var crypto_aead_xchacha20poly1305_ietf_KEYBYTES;
  function get_crypto_aead_xchacha20poly1305_ietf_NPUBBYTES() {
    return crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  }
  var crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  function get_crypto_aead_xchacha20poly1305_ietf_ABYTES() {
    return crypto_aead_xchacha20poly1305_ietf_ABYTES;
  }
  var crypto_aead_xchacha20poly1305_ietf_ABYTES;
  function get_crypto_aead_chacha20poly1305_ietf_KEYBYTES() {
    return crypto_aead_chacha20poly1305_ietf_KEYBYTES;
  }
  var crypto_aead_chacha20poly1305_ietf_KEYBYTES;
  function get_crypto_aead_chacha20poly1305_ietf_NPUBBYTES() {
    return crypto_aead_chacha20poly1305_ietf_NPUBBYTES;
  }
  var crypto_aead_chacha20poly1305_ietf_NPUBBYTES;
  function get_crypto_aead_chacha20poly1305_ietf_ABYTES() {
    return crypto_aead_chacha20poly1305_ietf_ABYTES;
  }
  var crypto_aead_chacha20poly1305_ietf_ABYTES;
  function get_crypto_aead_chacha20poly1305_KEYBYTES() {
    return crypto_aead_chacha20poly1305_KEYBYTES;
  }
  var crypto_aead_chacha20poly1305_KEYBYTES;
  function get_crypto_aead_chacha20poly1305_NPUBBYTES() {
    return crypto_aead_chacha20poly1305_NPUBBYTES;
  }
  var crypto_aead_chacha20poly1305_NPUBBYTES;
  function get_crypto_aead_chacha20poly1305_ABYTES() {
    return crypto_aead_chacha20poly1305_ABYTES;
  }
  var crypto_aead_chacha20poly1305_ABYTES;
  function get_crypto_auth_BYTES() {
    return crypto_auth_BYTES;
  }
  var crypto_auth_BYTES;
  function get_crypto_auth_KEYBYTES() {
    return crypto_auth_KEYBYTES;
  }
  var crypto_auth_KEYBYTES;
  function get_crypto_auth_hmacsha512256_BYTES() {
    return crypto_auth_hmacsha512256_BYTES;
  }
  var crypto_auth_hmacsha512256_BYTES;
  function get_crypto_auth_hmacsha512256_KEYBYTES() {
    return crypto_auth_hmacsha512256_KEYBYTES;
  }
  var crypto_auth_hmacsha512256_KEYBYTES;
  function get_crypto_auth_hmacsha256_KEYBYTES() {
    return crypto_auth_hmacsha256_KEYBYTES;
  }
  var crypto_auth_hmacsha256_KEYBYTES;
  function get_crypto_auth_hmacsha256_BYTES() {
    return crypto_auth_hmacsha256_BYTES;
  }
  var crypto_auth_hmacsha256_BYTES;
  function get_crypto_auth_hmacsha512_KEYBYTES() {
    return crypto_auth_hmacsha512_KEYBYTES;
  }
  var crypto_auth_hmacsha512_KEYBYTES;
  function get_crypto_auth_hmacsha512_BYTES() {
    return crypto_auth_hmacsha512_BYTES;
  }
  var crypto_auth_hmacsha512_BYTES;
  function get_crypto_box_PUBLICKEYBYTES() {
    return crypto_box_PUBLICKEYBYTES;
  }
  var crypto_box_PUBLICKEYBYTES;
  function get_crypto_box_SECRETKEYBYTES() {
    return crypto_box_SECRETKEYBYTES;
  }
  var crypto_box_SECRETKEYBYTES;
  function get_crypto_box_MACBYTES() {
    return crypto_box_MACBYTES;
  }
  var crypto_box_MACBYTES;
  function get_crypto_box_SEEDBYTES() {
    return crypto_box_SEEDBYTES;
  }
  var crypto_box_SEEDBYTES;
  function get_crypto_box_NONCEBYTES() {
    return crypto_box_NONCEBYTES;
  }
  var crypto_box_NONCEBYTES;
  function get_crypto_box_SEALBYTES() {
    return crypto_box_SEALBYTES;
  }
  var crypto_box_SEALBYTES;
  function get_crypto_box_BEFORENMBYTES() {
    return crypto_box_BEFORENMBYTES;
  }
  var crypto_box_BEFORENMBYTES;
  function get_crypto_generichash_BYTES() {
    return crypto_generichash_BYTES;
  }
  var crypto_generichash_BYTES;
  function get_crypto_generichash_blake2b_BYTES_MIN() {
    return crypto_generichash_blake2b_BYTES_MIN;
  }
  var crypto_generichash_blake2b_BYTES_MIN;
  function get_crypto_generichash_blake2b_BYTES_MAX() {
    return crypto_generichash_blake2b_BYTES_MAX;
  }
  var crypto_generichash_blake2b_BYTES_MAX;
  function get_crypto_generichash_blake2b_BYTES() {
    return crypto_generichash_blake2b_BYTES;
  }
  var crypto_generichash_blake2b_BYTES;
  function get_crypto_generichash_blake2b_KEYBYTES_MIN() {
    return crypto_generichash_blake2b_KEYBYTES_MIN;
  }
  var crypto_generichash_blake2b_KEYBYTES_MIN;
  function get_crypto_generichash_blake2b_KEYBYTES_MAX() {
    return crypto_generichash_blake2b_KEYBYTES_MAX;
  }
  var crypto_generichash_blake2b_KEYBYTES_MAX;
  function get_crypto_generichash_blake2b_KEYBYTES() {
    return crypto_generichash_blake2b_KEYBYTES;
  }
  var crypto_generichash_blake2b_KEYBYTES;
  function get_crypto_generichash_blake2b_SALTBYTES() {
    return crypto_generichash_blake2b_SALTBYTES;
  }
  var crypto_generichash_blake2b_SALTBYTES;
  function get_crypto_hash_BYTES() {
    return crypto_hash_BYTES;
  }
  var crypto_hash_BYTES;
  function get_crypto_hash_sha256_BYTES() {
    return crypto_hash_sha256_BYTES;
  }
  var crypto_hash_sha256_BYTES;
  function get_crypto_hash_sha512_BYTES() {
    return crypto_hash_sha512_BYTES;
  }
  var crypto_hash_sha512_BYTES;
  function get_crypto_pwhash_argon2id_ALG_ARGON2ID13() {
    _init_properties_PasswordHash_kt__p0yoa1();
    return crypto_pwhash_argon2id_ALG_ARGON2ID13;
  }
  var crypto_pwhash_argon2id_ALG_ARGON2ID13;
  function get_crypto_pwhash_argon2i_ALG_ARGON2I13() {
    _init_properties_PasswordHash_kt__p0yoa1();
    return crypto_pwhash_argon2i_ALG_ARGON2I13;
  }
  var crypto_pwhash_argon2i_ALG_ARGON2I13;
  function get_crypto_pwhash_ALG_DEFAULT() {
    _init_properties_PasswordHash_kt__p0yoa1();
    return crypto_pwhash_ALG_DEFAULT;
  }
  var crypto_pwhash_ALG_DEFAULT;
  var properties_initialized_PasswordHash_kt_p1k2tx;
  function _init_properties_PasswordHash_kt__p0yoa1() {
    if (!properties_initialized_PasswordHash_kt_p1k2tx) {
      properties_initialized_PasswordHash_kt_p1k2tx = true;
      crypto_pwhash_argon2id_ALG_ARGON2ID13 = 2;
      crypto_pwhash_argon2i_ALG_ARGON2I13 = 1;
      crypto_pwhash_ALG_DEFAULT = get_crypto_pwhash_argon2id_ALG_ARGON2ID13();
    }
  }
  function get_crypto_secretbox_KEYBYTES() {
    return crypto_secretbox_KEYBYTES;
  }
  var crypto_secretbox_KEYBYTES;
  function get_crypto_secretbox_MACBYTES() {
    return crypto_secretbox_MACBYTES;
  }
  var crypto_secretbox_MACBYTES;
  function get_crypto_secretbox_NONCEBYTES() {
    return crypto_secretbox_NONCEBYTES;
  }
  var crypto_secretbox_NONCEBYTES;
  function get_crypto_secretstream_xchacha20poly1305_TAG_MESSAGE() {
    return crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
  }
  var crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
  function get_crypto_secretstream_xchacha20poly1305_TAG_PUSH() {
    return crypto_secretstream_xchacha20poly1305_TAG_PUSH;
  }
  var crypto_secretstream_xchacha20poly1305_TAG_PUSH;
  function get_crypto_secretstream_xchacha20poly1305_TAG_REKEY() {
    return crypto_secretstream_xchacha20poly1305_TAG_REKEY;
  }
  var crypto_secretstream_xchacha20poly1305_TAG_REKEY;
  function get_crypto_secretstream_xchacha20poly1305_TAG_FINAL() {
    return crypto_secretstream_xchacha20poly1305_TAG_FINAL;
  }
  var crypto_secretstream_xchacha20poly1305_TAG_FINAL;
  function get_crypto_secretstream_xchacha20poly1305_HEADERBYTES() {
    return crypto_secretstream_xchacha20poly1305_HEADERBYTES;
  }
  var crypto_secretstream_xchacha20poly1305_HEADERBYTES;
  function get_crypto_secretstream_xchacha20poly1305_KEYBYTES() {
    return crypto_secretstream_xchacha20poly1305_KEYBYTES;
  }
  var crypto_secretstream_xchacha20poly1305_KEYBYTES;
  function get_crypto_secretstream_xchacha20poly1305_ABYTES() {
    return crypto_secretstream_xchacha20poly1305_ABYTES;
  }
  var crypto_secretstream_xchacha20poly1305_ABYTES;
  function get_randombytes_SEEDBYTES() {
    return randombytes_SEEDBYTES;
  }
  var randombytes_SEEDBYTES;
  function set_sodiumLoaded(_set____db54di) {
    sodiumLoaded = _set____db54di;
  }
  function get_sodiumLoaded() {
    return sodiumLoaded;
  }
  var sodiumLoaded;
  //region block: init
  crypto_aead_xchacha20poly1305_ietf_KEYBYTES = 32;
  crypto_aead_xchacha20poly1305_ietf_NPUBBYTES = 24;
  crypto_aead_xchacha20poly1305_ietf_ABYTES = 16;
  crypto_aead_chacha20poly1305_ietf_KEYBYTES = 32;
  crypto_aead_chacha20poly1305_ietf_NPUBBYTES = 12;
  crypto_aead_chacha20poly1305_ietf_ABYTES = 16;
  crypto_aead_chacha20poly1305_KEYBYTES = 32;
  crypto_aead_chacha20poly1305_NPUBBYTES = 8;
  crypto_aead_chacha20poly1305_ABYTES = 16;
  crypto_auth_BYTES = 32;
  crypto_auth_KEYBYTES = 32;
  crypto_auth_hmacsha512256_BYTES = 32;
  crypto_auth_hmacsha512256_KEYBYTES = 32;
  crypto_auth_hmacsha256_KEYBYTES = 32;
  crypto_auth_hmacsha256_BYTES = 32;
  crypto_auth_hmacsha512_KEYBYTES = 32;
  crypto_auth_hmacsha512_BYTES = 64;
  crypto_box_PUBLICKEYBYTES = 32;
  crypto_box_SECRETKEYBYTES = 32;
  crypto_box_MACBYTES = 16;
  crypto_box_SEEDBYTES = 32;
  crypto_box_NONCEBYTES = 24;
  crypto_box_SEALBYTES = 48;
  crypto_box_BEFORENMBYTES = 32;
  crypto_generichash_BYTES = 32;
  crypto_generichash_blake2b_BYTES_MIN = 16;
  crypto_generichash_blake2b_BYTES_MAX = 64;
  crypto_generichash_blake2b_BYTES = 32;
  crypto_generichash_blake2b_KEYBYTES_MIN = 16;
  crypto_generichash_blake2b_KEYBYTES_MAX = 64;
  crypto_generichash_blake2b_KEYBYTES = 32;
  crypto_generichash_blake2b_SALTBYTES = 16;
  crypto_hash_BYTES = 64;
  crypto_hash_sha256_BYTES = 32;
  crypto_hash_sha512_BYTES = 64;
  crypto_secretbox_KEYBYTES = 32;
  crypto_secretbox_MACBYTES = 16;
  crypto_secretbox_NONCEBYTES = 24;
  crypto_secretstream_xchacha20poly1305_TAG_MESSAGE = 0;
  crypto_secretstream_xchacha20poly1305_TAG_PUSH = 1;
  crypto_secretstream_xchacha20poly1305_TAG_REKEY = 2;
  crypto_secretstream_xchacha20poly1305_TAG_FINAL = 3;
  crypto_secretstream_xchacha20poly1305_HEADERBYTES = 24;
  crypto_secretstream_xchacha20poly1305_KEYBYTES = 32;
  crypto_secretstream_xchacha20poly1305_ABYTES = 17;
  randombytes_SEEDBYTES = 32;
  sodiumLoaded = false;
  //endregion
  return _;
});

//# sourceMappingURL=KotlinMultiplatformLibsodium-multiplatform-crypto-libsodium-bindings.js.map
