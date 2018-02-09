/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

describe('Store Compatibility', () => {
  let cryptobox = undefined;
  let Proteus = undefined;

  beforeAll(done => {
    if (typeof window === 'object') {
      cryptobox = window.cryptobox;
      Proteus = window.Proteus;
      done();
    } else {
      cryptobox = require('@wireapp/cryptobox');
      Proteus = require('@wireapp/proteus');
      done();
    }
  });

  describe('local identity', () => {
    it('saves the same identity', done => {
      const identity = Proteus.keys.IdentityKeyPair.new();
      const fingerprint = identity.public_key.fingerprint();

      const identifier = 'compatibility-test';
      const storeCache = new cryptobox.store.Cache();
      const storeIndexedDB = new cryptobox.store.IndexedDB(identifier);

      let identityFromCache = undefined;
      let identityFromIndexedDB = undefined;

      storeCache
        .save_identity(identity)
        .then(() => {
          return storeIndexedDB.save_identity(identity);
        })
        .then(() => {
          return storeCache.load_identity();
        })
        .then(ident => {
          identityFromCache = ident;
          return storeIndexedDB.load_identity();
        })
        .then(() => {
          identityFromIndexedDB = identity;

          expect(identityFromCache.public_key.fingerprint()).toBe(fingerprint);
          expect(identityFromIndexedDB.public_key.fingerprint()).toBe(fingerprint);

          done();
        })
        .catch(done.fail);
    });
  });
});
