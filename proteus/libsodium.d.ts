// Type definitions for libsodium-wrappers-sumo 0.7.3
// Project: https://github.com/jedisct1/libsodium.js
// Definitions by: Florian Keller <https://github.com/ffflorian>

declare module 'libsodium-wrappers-sumo' {
  type Uint8ArrayOutputFormat = 'uint8array';
  type StringOutputFormat = 'text' | 'hex' | 'base64';
  type KeyType = 'curve25519' | 'ed25519' | 'x25519';

  enum base64_variants {
    ORIGINAL,
    ORIGINAL_NO_PADDING,
    URLSAFE,
    URLSAFE_NO_PADDING,
  }

  interface CryptoBox {
    ciphertext: Uint8Array;
    mac: Uint8Array;
  }

  interface StringCryptoBox {
    ciphertext: string;
    mac: string;
  }

  interface CryptoKX {
    sharedRx: Uint8Array;
    sharedTx: Uint8Array;
  }

  interface StringCryptoKX {
    sharedRx: string;
    sharedTx: string;
  }

  interface KeyPair {
    keyType: KeyType;
    privateKey: Uint8Array;
    publicKey: Uint8Array;
  }

  interface StringKeyPair {
    keyType: KeyType;
    privateKey: string;
    publicKey: string;
  }

  interface SecretBox {
    cipher: Uint8Array;
    mac: Uint8Array;
  }

  interface StringSecretBox {
    cipher: string;
    mac: string;
  }

  interface generichash_state_address {
    name: string;
  }

  interface onetimeauth_state_address {
    name: string;
  }

  interface state_address {
    name: string;
  }

  interface secretstream_xchacha20poly1305_state_address {
    name: string;
  }

  interface sign_state_address {
    name: string;
  }

  const SODIUM_LIBRARY_VERSION_MAJOR: number;
  const SODIUM_LIBRARY_VERSION_MINOR: number;
  const SODIUM_VERSION_STRING: string;
  const crypto_aead_chacha20poly1305_ABYTES: number;
  const crypto_aead_chacha20poly1305_KEYBYTES: number;
  const crypto_aead_chacha20poly1305_MESSAGEBYTES_MAX: number;
  const crypto_aead_chacha20poly1305_NPUBBYTES: number;
  const crypto_aead_chacha20poly1305_NSECBYTES: number;
  const crypto_aead_chacha20poly1305_ietf_ABYTES: number;
  const crypto_aead_chacha20poly1305_ietf_KEYBYTES: number;
  const crypto_aead_chacha20poly1305_ietf_MESSAGEBYTES_MAX: number;
  const crypto_aead_chacha20poly1305_ietf_NPUBBYTES: number;
  const crypto_aead_chacha20poly1305_ietf_NSECBYTES: number;
  const crypto_aead_xchacha20poly1305_ietf_ABYTES: number;
  const crypto_aead_xchacha20poly1305_ietf_KEYBYTES: number;
  const crypto_aead_xchacha20poly1305_ietf_MESSAGEBYTES_MAX: number;
  const crypto_aead_xchacha20poly1305_ietf_NPUBBYTES: number;
  const crypto_aead_xchacha20poly1305_ietf_NSECBYTES: number;
  const crypto_auth_BYTES: number;
  const crypto_auth_KEYBYTES: number;
  const crypto_auth_hmacsha256_BYTES: number;
  const crypto_auth_hmacsha256_KEYBYTES: number;
  const crypto_auth_hmacsha512_BYTES: number;
  const crypto_auth_hmacsha512_KEYBYTES: number;
  const crypto_box_BEFORENMBYTES: number;
  const crypto_box_MACBYTES: number;
  const crypto_box_MESSAGEBYTES_MAX: number;
  const crypto_box_NONCEBYTES: number;
  const crypto_box_PUBLICKEYBYTES: number;
  const crypto_box_SEALBYTES: number;
  const crypto_box_SECRETKEYBYTES: number;
  const crypto_box_SEEDBYTES: number;
  const crypto_core_hchacha20_CONSTBYTES: number;
  const crypto_core_hchacha20_INPUTBYTES: number;
  const crypto_core_hchacha20_KEYBYTES: number;
  const crypto_core_hchacha20_OUTPUTBYTES: number;
  const crypto_generichash_BYTES: number;
  const crypto_generichash_BYTES_MAX: number;
  const crypto_generichash_BYTES_MIN: number;
  const crypto_generichash_KEYBYTES: number;
  const crypto_generichash_KEYBYTES_MAX: number;
  const crypto_generichash_KEYBYTES_MIN: number;
  const crypto_hash_BYTES: number;
  const crypto_hash_sha256_BYTES: number;
  const crypto_hash_sha512_BYTES: number;
  const crypto_kdf_BYTES_MAX: number;
  const crypto_kdf_BYTES_MIN: number;
  const crypto_kdf_CONTEXTBYTES: number;
  const crypto_kdf_KEYBYTES: number;
  const crypto_kx_PUBLICKEYBYTES: number;
  const crypto_kx_SECRETKEYBYTES: number;
  const crypto_kx_SEEDBYTES: number;
  const crypto_kx_SESSIONKEYBYTES: number;
  const crypto_onetimeauth_BYTES: number;
  const crypto_onetimeauth_KEYBYTES: number;
  const crypto_pwhash_ALG_ARGON2I13: number;
  const crypto_pwhash_ALG_ARGON2ID13: number;
  const crypto_pwhash_ALG_DEFAULT: number;
  const crypto_pwhash_BYTES_MAX: number;
  const crypto_pwhash_BYTES_MIN: number;
  const crypto_pwhash_MEMLIMIT_INTERACTIVE: number;
  const crypto_pwhash_MEMLIMIT_MAX: number;
  const crypto_pwhash_MEMLIMIT_MIN: number;
  const crypto_pwhash_MEMLIMIT_MODERATE: number;
  const crypto_pwhash_MEMLIMIT_SENSITIVE: number;
  const crypto_pwhash_OPSLIMIT_INTERACTIVE: number;
  const crypto_pwhash_OPSLIMIT_MAX: number;
  const crypto_pwhash_OPSLIMIT_MIN: number;
  const crypto_pwhash_OPSLIMIT_MODERATE: number;
  const crypto_pwhash_OPSLIMIT_SENSITIVE: number;
  const crypto_pwhash_PASSWD_MAX: number;
  const crypto_pwhash_PASSWD_MIN: number;
  const crypto_pwhash_SALTBYTES: number;
  const crypto_pwhash_STRBYTES: number;
  const crypto_pwhash_STRPREFIX: string;
  const crypto_pwhash_STR_VERIFY: number;
  const crypto_pwhash_scryptsalsa208sha256_BYTES_MAX: number;
  const crypto_pwhash_scryptsalsa208sha256_BYTES_MIN: number;
  const crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_INTERACTIVE: number;
  const crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_MAX: number;
  const crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_MIN: number;
  const crypto_pwhash_scryptsalsa208sha256_MEMLIMIT_SENSITIVE: number;
  const crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_INTERACTIVE: number;
  const crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_MAX: number;
  const crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_MIN: number;
  const crypto_pwhash_scryptsalsa208sha256_OPSLIMIT_SENSITIVE: number;
  const crypto_pwhash_scryptsalsa208sha256_SALTBYTES: number;
  const crypto_pwhash_scryptsalsa208sha256_STRBYTES: number;
  const crypto_pwhash_scryptsalsa208sha256_STRPREFIX: string;
  const crypto_pwhash_scryptsalsa208sha256_STR_VERIFY: number;
  const crypto_scalarmult_BYTES: number;
  const crypto_scalarmult_SCALARBYTES: number;
  const crypto_secretbox_KEYBYTES: number;
  const crypto_secretbox_MACBYTES: number;
  const crypto_secretbox_MESSAGEBYTES_MAX: number;
  const crypto_secretbox_NONCEBYTES: number;
  const crypto_secretstream_xchacha20poly1305_ABYTES: number;
  const crypto_secretstream_xchacha20poly1305_HEADERBYTES: number;
  const crypto_secretstream_xchacha20poly1305_KEYBYTES: number;
  const crypto_secretstream_xchacha20poly1305_MESSAGEBYTES_MAX: number;
  const crypto_secretstream_xchacha20poly1305_MESSAGESBYTES_MAX: number;
  const crypto_secretstream_xchacha20poly1305_NPUBBYTES: number;
  const crypto_secretstream_xchacha20poly1305_TAG_FINAL: number;
  const crypto_secretstream_xchacha20poly1305_TAG_MESSAGE: number;
  const crypto_secretstream_xchacha20poly1305_TAG_PUSH: number;
  const crypto_secretstream_xchacha20poly1305_TAG_REKEY: number;
  const crypto_shorthash_BYTES: number;
  const crypto_shorthash_KEYBYTES: number;
  const crypto_shorthash_siphashx24_BYTES: number;
  const crypto_shorthash_siphashx24_KEYBYTES: number;
  const crypto_sign_BYTES: number;
  const crypto_sign_MESSAGEBYTES_MAX: number;
  const crypto_sign_PUBLICKEYBYTES: number;
  const crypto_sign_SECRETKEYBYTES: number;
  const crypto_sign_SEEDBYTES: number;
  const crypto_stream_KEYBYTES: number;
  const crypto_stream_MESSAGEBYTES_MAX: number;
  const crypto_stream_NONCEBYTES: number;
  const crypto_stream_chacha20_KEYBYTES: number;
  const crypto_stream_chacha20_NONCEBYTES: number;
  const crypto_stream_chacha20_ietf_KEYBYTES: number;
  const crypto_stream_chacha20_ietf_MESSAGEBYTES_MAX: number;
  const crypto_stream_chacha20_ietf_NONCEBYTES: number;
  const crypto_stream_xchacha20_KEYBYTES: number;
  const crypto_stream_xchacha20_MESSAGEBYTES_MAX: number;
  const crypto_stream_xchacha20_NONCEBYTES: number;
  const randombytes_SEEDBYTES: number;
  const ready: Promise<void>;

  function add(a: Uint8Array, b: Uint8Array): void;
  function compare(b1: Uint8Array, b2: Uint8Array): number;
  function crypto_aead_chacha20poly1305_decrypt(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_chacha20poly1305_decrypt(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_chacha20poly1305_decrypt_detached(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_chacha20poly1305_decrypt_detached(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_chacha20poly1305_encrypt(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_chacha20poly1305_encrypt(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_chacha20poly1305_encrypt_detached(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): CryptoBox;
  function crypto_aead_chacha20poly1305_encrypt_detached(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): StringCryptoBox;
  function crypto_aead_chacha20poly1305_ietf_decrypt(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_chacha20poly1305_ietf_decrypt(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_chacha20poly1305_ietf_decrypt_detached(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_chacha20poly1305_ietf_decrypt_detached(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_chacha20poly1305_ietf_encrypt(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_chacha20poly1305_ietf_encrypt(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_chacha20poly1305_ietf_encrypt_detached(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): CryptoBox;
  function crypto_aead_chacha20poly1305_ietf_encrypt_detached(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): StringCryptoBox;
  function crypto_aead_chacha20poly1305_ietf_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_aead_chacha20poly1305_ietf_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_aead_chacha20poly1305_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_aead_chacha20poly1305_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_aead_xchacha20poly1305_ietf_decrypt(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_xchacha20poly1305_ietf_decrypt(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_xchacha20poly1305_ietf_decrypt_detached(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_xchacha20poly1305_ietf_decrypt_detached(
    secret_nonce: string | Uint8Array | undefined | null,
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    additional_data: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_xchacha20poly1305_ietf_encrypt(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_aead_xchacha20poly1305_ietf_encrypt(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_aead_xchacha20poly1305_ietf_encrypt_detached(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): CryptoBox;
  function crypto_aead_xchacha20poly1305_ietf_encrypt_detached(
    message: string | Uint8Array | undefined,
    additional_data: string | Uint8Array | undefined | null,
    secret_nonce: string | Uint8Array | undefined | null,
    public_nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): StringCryptoBox;
  function crypto_aead_xchacha20poly1305_ietf_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_aead_xchacha20poly1305_ietf_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_auth(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_auth(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_auth_hmacsha256(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_auth_hmacsha256(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_auth_hmacsha256_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_auth_hmacsha256_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_auth_hmacsha256_verify(
    tag: Uint8Array,
    message: string | Uint8Array | undefined,
    key: Uint8Array
  ): boolean;
  function crypto_auth_hmacsha512(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_auth_hmacsha512(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_auth_hmacsha512_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_auth_hmacsha512_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_auth_hmacsha512_verify(
    tag: Uint8Array,
    message: string | Uint8Array | undefined,
    key: Uint8Array
  ): boolean;
  function crypto_auth_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_auth_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_auth_verify(tag: Uint8Array, message: string | Uint8Array | undefined, key: Uint8Array): boolean;
  function crypto_box_beforenm(
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_beforenm(
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_detached(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): CryptoBox;
  function crypto_box_detached(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): StringCryptoBox;
  function crypto_box_easy(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_easy(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_easy_afternm(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    sharedKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_easy_afternm(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    sharedKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_keypair(outputFormat?: Uint8ArrayOutputFormat | null): KeyPair;
  function crypto_box_keypair(outputFormat?: StringOutputFormat | null): StringKeyPair;
  function crypto_box_open_detached(
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_open_detached(
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_open_easy(
    ciphertext: string | Uint8Array | undefined,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_open_easy(
    ciphertext: string | Uint8Array | undefined,
    nonce: Uint8Array,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_open_easy_afternm(
    ciphertext: string | Uint8Array | undefined,
    nonce: Uint8Array,
    sharedKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_open_easy_afternm(
    ciphertext: string | Uint8Array | undefined,
    nonce: Uint8Array,
    sharedKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_seal(
    message: string | Uint8Array | undefined,
    publicKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_seal(
    message: string | Uint8Array | undefined,
    publicKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_seal_open(
    ciphertext: string | Uint8Array | undefined,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_box_seal_open(
    ciphertext: string | Uint8Array | undefined,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_box_seed_keypair(seed: Uint8Array, outputFormat?: Uint8ArrayOutputFormat | null): KeyPair;
  function crypto_box_seed_keypair(seed: Uint8Array, outputFormat?: StringOutputFormat | null): StringKeyPair;
  function crypto_generichash(
    hash_length: number,
    message: string | Uint8Array | undefined,
    key: string | Uint8Array | undefined | null,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_generichash(
    hash_length: number,
    message: string | Uint8Array | undefined,
    key: string | Uint8Array | undefined | null,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_generichash_final(
    state_address: generichash_state_address,
    hash_length: number,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_generichash_final(
    state_address: generichash_state_address,
    hash_length: number,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_generichash_init(key: string | Uint8Array | undefined | null, hash_length: number): state_address;
  function crypto_generichash_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_generichash_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_generichash_update(
    state_address: generichash_state_address,
    message_chunk: string | Uint8Array | undefined
  ): void;
  function crypto_hash(
    message: string | Uint8Array | undefined,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_hash(message: string | Uint8Array | undefined, outputFormat?: StringOutputFormat | null): string;
  function crypto_hash_sha256(
    message: string | Uint8Array | undefined,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_hash_sha256(
    message: string | Uint8Array | undefined,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_hash_sha512(
    message: string | Uint8Array | undefined,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_hash_sha512(
    message: string | Uint8Array | undefined,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_kdf_derive_from_key(
    subkey_len: number,
    subkey_id: number,
    ctx: string,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_kdf_derive_from_key(
    subkey_len: number,
    subkey_id: number,
    ctx: string,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_kdf_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_kdf_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_kx_client_session_keys(
    clientPublicKey: Uint8Array,
    clientSecretKey: Uint8Array,
    serverPublicKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): CryptoKX;
  function crypto_kx_client_session_keys(
    clientPublicKey: Uint8Array,
    clientSecretKey: Uint8Array,
    serverPublicKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): StringCryptoKX;
  function crypto_kx_keypair(outputFormat?: Uint8ArrayOutputFormat | null): KeyPair;
  function crypto_kx_keypair(outputFormat?: StringOutputFormat | null): StringKeyPair;
  function crypto_kx_seed_keypair(seed: Uint8Array, outputFormat?: Uint8ArrayOutputFormat | null): KeyPair;
  function crypto_kx_seed_keypair(seed: Uint8Array, outputFormat?: StringOutputFormat | null): StringKeyPair;
  function crypto_kx_server_session_keys(
    serverPublicKey: Uint8Array,
    serverSecretKey: Uint8Array,
    clientPublicKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): CryptoKX;
  function crypto_kx_server_session_keys(
    serverPublicKey: Uint8Array,
    serverSecretKey: Uint8Array,
    clientPublicKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): StringCryptoKX;
  function crypto_onetimeauth(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_onetimeauth(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_onetimeauth_final(
    state_address: onetimeauth_state_address,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_onetimeauth_final(
    state_address: onetimeauth_state_address,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_onetimeauth_init(key: string | Uint8Array | undefined | null): state_address;
  function crypto_onetimeauth_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_onetimeauth_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_onetimeauth_update(
    state_address: onetimeauth_state_address,
    message_chunk: string | Uint8Array | undefined
  ): void;
  function crypto_onetimeauth_verify(
    hash: Uint8Array,
    message: string | Uint8Array | undefined,
    key: Uint8Array
  ): boolean;
  function crypto_pwhash(
    keyLength: number,
    password: string | Uint8Array | undefined,
    salt: Uint8Array,
    opsLimit: number,
    memLimit: number,
    algorithm: number,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_pwhash(
    keyLength: number,
    password: string | Uint8Array | undefined,
    salt: Uint8Array,
    opsLimit: number,
    memLimit: number,
    algorithm: number,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_pwhash_scryptsalsa208sha256(
    keyLength: number,
    password: string | Uint8Array | undefined,
    salt: Uint8Array,
    opsLimit: number,
    memLimit: number,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_pwhash_scryptsalsa208sha256(
    keyLength: number,
    password: string | Uint8Array | undefined,
    salt: Uint8Array,
    opsLimit: number,
    memLimit: number,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_pwhash_scryptsalsa208sha256_ll(
    password: string | Uint8Array | undefined,
    salt: string | Uint8Array | undefined,
    opsLimit: number,
    r: number,
    p: number,
    keyLength: number,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_pwhash_scryptsalsa208sha256_ll(
    password: string | Uint8Array | undefined,
    salt: string | Uint8Array | undefined,
    opsLimit: number,
    r: number,
    p: number,
    keyLength: number,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_pwhash_scryptsalsa208sha256_str(
    password: string | Uint8Array | undefined,
    opsLimit: number,
    memLimit: number
  ): string;
  function crypto_pwhash_scryptsalsa208sha256_str_verify(
    hashed_password: string,
    password: string | Uint8Array | undefined
  ): boolean;
  function crypto_pwhash_str(password: string | Uint8Array | undefined, opsLimit: number, memLimit: number): string;
  function crypto_pwhash_str_verify(hashed_password: string, password: string | Uint8Array | undefined): boolean;
  function crypto_scalarmult(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_scalarmult(
    privateKey: Uint8Array,
    publicKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_scalarmult_base(privateKey: Uint8Array, outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_scalarmult_base(privateKey: Uint8Array, outputFormat?: StringOutputFormat | null): string;
  function crypto_secretbox_detached(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): SecretBox;
  function crypto_secretbox_detached(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): StringSecretBox;
  function crypto_secretbox_easy(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_secretbox_easy(
    message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_secretbox_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_secretbox_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_secretbox_open_detached(
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_secretbox_open_detached(
    ciphertext: string | Uint8Array | undefined,
    mac: Uint8Array,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_secretbox_open_easy(
    ciphertext: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_secretbox_open_easy(
    ciphertext: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_secretstream_xchacha20poly1305_init_pull(header: Uint8Array, key: Uint8Array): state_address;
  function crypto_secretstream_xchacha20poly1305_init_push(
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_secretstream_xchacha20poly1305_init_push(
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_secretstream_xchacha20poly1305_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_secretstream_xchacha20poly1305_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_secretstream_xchacha20poly1305_pull(
    state_address: secretstream_xchacha20poly1305_state_address,
    cipher: string | Uint8Array | undefined,
    ad: string | Uint8Array | undefined | null,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_secretstream_xchacha20poly1305_pull(
    state_address: secretstream_xchacha20poly1305_state_address,
    cipher: string | Uint8Array | undefined,
    ad: string | Uint8Array | undefined | null,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_secretstream_xchacha20poly1305_push(
    state_address: secretstream_xchacha20poly1305_state_address,
    message_chunk: string | Uint8Array | undefined,
    ad: string | Uint8Array | undefined | null,
    tag: number,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_secretstream_xchacha20poly1305_push(
    state_address: secretstream_xchacha20poly1305_state_address,
    message_chunk: string | Uint8Array | undefined,
    ad: string | Uint8Array | undefined | null,
    tag: number,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_secretstream_xchacha20poly1305_rekey(
    state_address: secretstream_xchacha20poly1305_state_address
  ): true;
  function crypto_shorthash(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_shorthash(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_shorthash_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_shorthash_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_shorthash_siphashx24(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_shorthash_siphashx24(
    message: string | Uint8Array | undefined,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_sign(
    message: string | Uint8Array | undefined,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign(
    message: string | Uint8Array | undefined,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_sign_detached(
    message: string | Uint8Array | undefined,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign_detached(
    message: string | Uint8Array | undefined,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_sign_ed25519_pk_to_curve25519(
    edPk: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign_ed25519_pk_to_curve25519(edPk: Uint8Array, outputFormat?: StringOutputFormat | null): string;
  function crypto_sign_ed25519_sk_to_curve25519(
    edSk: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign_ed25519_sk_to_curve25519(edSk: Uint8Array, outputFormat?: StringOutputFormat | null): string;
  function crypto_sign_ed25519_sk_to_pk(
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign_ed25519_sk_to_pk(privateKey: Uint8Array, outputFormat?: StringOutputFormat | null): string;
  function crypto_sign_ed25519_sk_to_seed(
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign_ed25519_sk_to_seed(privateKey: Uint8Array, outputFormat?: StringOutputFormat | null): string;
  function crypto_sign_final_create(
    state_address: sign_state_address,
    privateKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign_final_create(
    state_address: sign_state_address,
    privateKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_sign_final_verify(
    state_address: sign_state_address,
    signature: Uint8Array,
    publicKey: Uint8Array
  ): boolean;
  function crypto_sign_init(): state_address;
  function crypto_sign_keypair(outputFormat?: Uint8ArrayOutputFormat | null): KeyPair;
  function crypto_sign_keypair(outputFormat?: StringOutputFormat | null): StringKeyPair;
  function crypto_sign_open(
    signedMessage: string | Uint8Array | undefined,
    publicKey: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_sign_open(
    signedMessage: string | Uint8Array | undefined,
    publicKey: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_sign_seed_keypair(seed: Uint8Array, outputFormat?: Uint8ArrayOutputFormat | null): KeyPair;
  function crypto_sign_seed_keypair(seed: Uint8Array, outputFormat?: StringOutputFormat | null): StringKeyPair;
  function crypto_sign_update(state_address: sign_state_address, message_chunk: string | Uint8Array | undefined): void;
  function crypto_sign_verify_detached(
    signature: Uint8Array,
    message: string | Uint8Array | undefined,
    publicKey: Uint8Array
  ): boolean;
  function crypto_stream_chacha20_ietf_xor(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_stream_chacha20_ietf_xor(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_stream_chacha20_ietf_xor_ic(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    nonce_increment: number,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_stream_chacha20_ietf_xor_ic(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    nonce_increment: number,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_stream_chacha20_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_stream_chacha20_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_stream_chacha20_xor(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_stream_chacha20_xor(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_stream_chacha20_xor_ic(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    nonce_increment: number,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_stream_chacha20_xor_ic(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    nonce_increment: number,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_stream_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_stream_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_stream_xchacha20_keygen(outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function crypto_stream_xchacha20_keygen(outputFormat?: StringOutputFormat | null): string;
  function crypto_stream_xchacha20_xor(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_stream_xchacha20_xor(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function crypto_stream_xchacha20_xor_ic(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    nonce_increment: number,
    key: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function crypto_stream_xchacha20_xor_ic(
    input_message: string | Uint8Array | undefined,
    nonce: Uint8Array,
    nonce_increment: number,
    key: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function from_base64(input: string, variant: base64_variants): Uint8Array;
  function from_hex(input: string): string;
  function from_string(str: string): Uint8Array;
  function increment(bytes: Uint8Array): void;
  function is_zero(bytes: Uint8Array): boolean;
  function memcmp(b1: Uint8Array, b2: Uint8Array): boolean;
  function memzero(bytes: Uint8Array): void;
  function pad(buf: Uint8Array, blocksize: number): Uint8Array;
  function randombytes_buf(length: number, outputFormat?: Uint8ArrayOutputFormat | null): Uint8Array;
  function randombytes_buf(length: number, outputFormat?: StringOutputFormat | null): string;
  function randombytes_buf_deterministic(
    length: number,
    seed: Uint8Array,
    outputFormat?: Uint8ArrayOutputFormat | null
  ): Uint8Array;
  function randombytes_buf_deterministic(
    length: number,
    seed: Uint8Array,
    outputFormat?: StringOutputFormat | null
  ): string;
  function randombytes_close(): void;
  function randombytes_random(): number;
  function randombytes_set_implementation(implementation: Uint8Array): void;
  function randombytes_stir(): void;
  function randombytes_uniform(upper_bound: number): number;
  function sodium_version_string(): string;
  function to_base64(input: string | Uint8Array, variant: base64_variants): string;
  function to_hex(input: string | Uint8Array): string;
  function to_string(bytes: Uint8Array): string;
  function unpad(buf: Uint8Array, blocksize: number): Uint8Array;
}
