process.env.NODE_PATH = './src';
require('module').Module._initPaths();

assert = require('chai').assert;

global.sodium = require('libsodium-wrappers-sumo');

Proteus = require('proteus');
Proteus.derived = {
  CipherKey: require('proteus/derived/CipherKey'),
  DerivedSecrets: require('proteus/derived/DerivedSecrets'),
  MacKey: require('proteus/derived/MacKey'),
};

Proteus.message.SessionTag = require('proteus/message/SessionTag');

Proteus.util = {
  ArrayUtil: require('proteus/util/ArrayUtil'),
  KeyDerivationUtil: require('proteus/util/KeyDerivationUtil'),
  MemoryUtil: require('proteus/util/MemoryUtil'),
  TypeUtil: require('proteus/util/TypeUtil'),
};
