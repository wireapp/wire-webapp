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

/* eslint no-magic-numbers: "off" */

describe('cryptobox.Cryptobox', () => {
  const cryptobox = require('@wireapp/cryptobox');
  const Proteus = require('@wireapp/proteus');
  const {MemoryEngine} = require('@wireapp/store-engine').StoreEngine;

  async function createCryptobox(storeName) {
    const engine = new MemoryEngine();
    await engine.init(storeName);
    return new cryptobox.Cryptobox(new cryptobox.store.CryptoboxCRUDStore(engine));
  }

  describe('"encrypt / decrypt"', () => {
    it('encrypts messages for multiple clients and decrypts', async done => {
      const alice = await createCryptobox('alice');
      const text = 'Hello, World!';

      expect(alice.cachedPreKeys.length).toBe(0);
      await alice.create();
      expect(alice.cachedPreKeys.length).toBe(1);

      const bob = await createCryptobox('bob');
      await bob.create();

      const eve = await createCryptobox('eve');
      await eve.create();

      const mallory = await createCryptobox('mallory');
      await mallory.create();

      const bobBundle = Proteus.keys.PreKeyBundle.new(bob.identity.public_key, bob.cachedPreKeys[0]);
      const eveBundle = Proteus.keys.PreKeyBundle.new(eve.identity.public_key, eve.cachedPreKeys[0]);
      const malloryBundle = Proteus.keys.PreKeyBundle.new(mallory.identity.public_key, mallory.cachedPreKeys[0]);

      Promise.all([
        alice.encrypt('session-with-bob', text, bobBundle.serialise()),
        alice.encrypt('session-with-eve', text, eveBundle.serialise()),
        alice.encrypt('session-with-mallory', text, malloryBundle.serialise()),
      ])
        .then(async ([bobPayload, evePayload, malloryPayload]) => {
          let decrypted = await bob.decrypt('session-with-alice', bobPayload);
          expect(Buffer.from(decrypted).toString('utf8')).toBe(text);

          decrypted = await eve.decrypt('session-with-alice', evePayload);
          expect(Buffer.from(decrypted).toString('utf8')).toBe(text);

          decrypted = await mallory.decrypt('session-with-alice', malloryPayload);
          expect(Buffer.from(decrypted).toString('utf8')).toBe(text);

          done();
        })
        .catch(done.fail);
    });
  });
});
