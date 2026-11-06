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

import {Account} from '@wireapp/core';
import {Account as AccountImplementation} from '@wireapp/core/lib/account';

import {createCoreTestFixture} from './createCoreTestFixture';

describe('explicit core test fixtures', () => {
  it('loads the real Account through the package entry', () => {
    expect(Account).toBe(AccountImplementation);
    expect(jest.isMockFunction(Account)).toBe(false);
    expect(Object.getOwnPropertyDescriptor(Account.prototype, 'clientId')?.get).toBeDefined();
  });

  it('supplies only the requested dependencies without initializing services', () => {
    const send = jest.fn();
    const fixture = createCoreTestFixture({service: {conversation: {send}}});

    expect(fixture.service.conversation.send).toBe(send);
    expect(fixture.service).not.toHaveProperty('mls');
    expect(fixture).not.toHaveProperty('apiClient');
    expect(createCoreTestFixture({}).service).toBeUndefined();
  });

  it('keeps independently constructed service stubs isolated', () => {
    const first = createCoreTestFixture({service: {conversation: {send: jest.fn()}}});
    const second = createCoreTestFixture({service: {conversation: {send: jest.fn()}}});

    first.service.conversation.send();

    expect(first).not.toBe(second);
    expect(second.service.conversation.send).not.toHaveBeenCalled();
  });

  it('preserves explicit getters used by feature-gating tests', () => {
    const fixture = createCoreTestFixture({
      get hasMLSDevice() {
        return true;
      },
    });
    const hasDevice = jest.spyOn(fixture, 'hasMLSDevice', 'get').mockReturnValue(false);

    expect(fixture.hasMLSDevice).toBe(false);

    hasDevice.mockRestore();
    expect(fixture.hasMLSDevice).toBe(true);
  });
});
