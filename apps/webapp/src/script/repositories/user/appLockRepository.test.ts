/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {removeCurrentModal} from 'Components/Modals/PrimaryModal';
import {usePrimaryModalState} from 'Components/Modals/PrimaryModal/PrimaryModalState';
import {User} from 'Repositories/entity/User/User';
import type {Translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {createUuid} from 'Util/uuid';

import {AppLockCrypto, AppLockRepository} from './appLockRepository';
import {AppLockState} from './appLockState';
import {UserState} from './userState';

const mockCryptoPwhashStr = jest.fn();
const mockCryptoPwhashStrVerify = jest.fn();

const createAppLockRepository = (translate: Translate = translateForTest): AppLockRepository => {
  const userState = new UserState();
  const appLockState = new AppLockState();
  const appLockCrypto: AppLockCrypto = {
    cryptoPwhashMemLimitInteractive: 1,
    cryptoPwhashOpsLimitInteractive: 1,
    ready: Promise.resolve(),
    cryptoPwhashStr: (code: string, opsLimit: number, memLimit: number) =>
      mockCryptoPwhashStr(code, opsLimit, memLimit),
    cryptoPwhashStrVerify: (hashedCode: string, code: string) => mockCryptoPwhashStrVerify(hashedCode, code),
  };

  userState.self(new User(createUuid(), ''));

  return new AppLockRepository(translate, userState, appLockState, appLockCrypto);
};

describe('AppLockRepository', () => {
  beforeEach(() => {
    mockCryptoPwhashStr.mockReset();
    mockCryptoPwhashStrVerify.mockReset();
    globalThis.localStorage.clear();
    removeCurrentModal();
  });

  it('stores the pwhash output directly when libsodium returns a string', async () => {
    const repository = createAppLockRepository();
    const storedHash = '$argon2id$mocked';
    mockCryptoPwhashStr.mockReturnValue(storedHash);

    await repository.setCode('ValidPassword123!');

    expect(repository.getStoredPassphrase()).toBe(storedHash);
  });

  it('throws when libsodium returns a non-string hash', async () => {
    const repository = createAppLockRepository();
    const hashedBytes = new Uint8Array([1, 2, 3]);
    mockCryptoPwhashStr.mockReturnValue(hashedBytes);

    await expect(repository.setCode('ValidPassword123!')).rejects.toThrow('Unexpected crypto_pwhash_str output type');
    expect(repository.getStoredPassphrase()).toBeNull();
  });

  it('uses the injected translate function for the disable confirmation modal copy', async () => {
    const translate = jest.fn((translationKey: string) => `translated:${translationKey}`);
    const repository = createAppLockRepository(translate);
    mockCryptoPwhashStr.mockReturnValue('$argon2id$mocked');

    await repository.setCode('ValidPassword123!');
    repository.setEnabled(false);

    const {currentModalContent} = usePrimaryModalState.getState();
    const secondaryActionButtons = Array.isArray(currentModalContent.secondaryAction)
      ? currentModalContent.secondaryAction
      : [currentModalContent.secondaryAction];
    const [cancelActionButton] = secondaryActionButtons;

    expect(currentModalContent.primaryAction?.text).toBe('translated:AppLockDisableTurnOff');
    expect(cancelActionButton?.text).toBe('translated:AppLockDisableCancel');
    expect(currentModalContent.titleText).toBe('translated:ApplockDisableHeadline');
    expect(currentModalContent.message).toBe('translated:AppLockDisableInfo');
  });
});
