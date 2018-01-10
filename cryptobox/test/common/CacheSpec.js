describe('cryptobox.store.Cache', () => {
  let cryptobox = undefined;
  let Proteus = undefined;
  let store = undefined;

  beforeAll(done => {
    if (typeof window === 'object') {
      cryptobox = window.cryptobox;
      Proteus = window.Proteus;
      done();
    } else {
      cryptobox = require('../../dist/commonjs/wire-webapp-cryptobox');
      Proteus = require('wire-webapp-proteus');
      done();
    }
  });

  beforeEach(() => {
    store = new cryptobox.store.Cache();
  });

  describe('"constructor"', () => {
    it('creates an instance', () => {
      const storeInstance = new cryptobox.store.Cache();
      expect(storeInstance).toBeDefined();
    });

    it('causes new identities on a Cryptobox initialization with a new storage instance (because a cache is temporary)', done => {
      let box = new cryptobox.Cryptobox(new cryptobox.store.Cache(), 1);

      let firstFingerprint = undefined;
      let secondFingerprint = undefined;

      box
        .create()
        .then(() => {
          firstFingerprint = box.identity.public_key.fingerprint();
          box = new cryptobox.Cryptobox(new cryptobox.store.Cache(), 1);
          return box.create();
        })
        .then(() => {
          secondFingerprint = box.identity.public_key.fingerprint();
          expect(firstFingerprint).not.toBe(secondFingerprint);
          done();
        })
        .catch(done.fail);
    });
  });

  describe('"save_identity"', () => {
    it('saves the local identity', done => {
      const ikp = Proteus.keys.IdentityKeyPair.new();
      store
        .save_identity(ikp)
        .then(identity => {
          expect(identity.public_key.fingerprint()).toEqual(ikp.public_key.fingerprint());
          done();
        })
        .catch(done.fail);
    });
  });
});
