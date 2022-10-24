/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {TestFactory} from '../../../test/helper/TestFactory';
import {Cryptobox} from '@wireapp/cryptobox';
import {CryptographyRepository} from './CryptographyRepository';
import {container} from 'tsyringe';
import {Core} from '../service/CoreSingleton';

describe('CryptographyRepository', () => {
  const testFactory = new TestFactory();
  let cryptographyRepository: CryptographyRepository;

  beforeEach(async () => {
    const storage = await testFactory.exposeStorageActors();
    const storeEngine = storage.storageService['engine'];
    const cryptobox = new Cryptobox(storeEngine, 10);
    await cryptobox.create();
    const core = container.resolve(Core);
    core.service = {
      cryptography: {constructSessionId: jest.fn(() => 'user-id@device-id'), cryptobox},
    } as any;
    cryptographyRepository = new CryptographyRepository(core);
  });

  describe('getRemoteFingerprint', () => {
    it('generates the remote fingerprint based on a prekey', async () => {
      const userId = {domain: '', id: '6f656da7-0c52-44d1-959d-ddc9fbdca244'};
      const clientId = '689ce2df236eb2be';
      const preKey = {
        id: 3,
        key: 'pQABAQMCoQBYIFycSfcOATSpOIkJz8ntEnFAZ+YWtzVaJ7RLeDAqGU+0A6EAoQBYIMEJnklbfFFvnFC41rmjDMqx6L0oVX5RMab3uGwBgbkaBPY=',
      };
      const fingerprint = await cryptographyRepository.getRemoteFingerprint(userId, clientId, preKey);

      // eslint-disable-next-line
      expect(fingerprint).toEqual('c1099e495b7c516f9c50b8d6b9a30ccab1e8bd28557e5131a6f7b86c0181b91a');
    });
  });
});
