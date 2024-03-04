/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {waitFor} from '@testing-library/react';
import {LowPrecisionTaskScheduler} from '@wireapp/core/lib/util/LowPrecisionTaskScheduler';
import {container} from 'tsyringe';

import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {PrimaryModalType} from 'Components/Modals/PrimaryModal/PrimaryModalTypes';
import {Core} from 'src/script/service/CoreSingleton';
import {UserState} from 'src/script/user/UserState';
import * as util from 'Util/util';

import {E2EIHandler} from './E2EIdentityEnrollment';
import {OIDCServiceStore} from './OIDCService/OIDCServiceStorage';

import {ConversationState} from '../conversation/ConversationState';
import {Conversation} from '../entity/Conversation';

jest.mock('./OIDCService', () => {
  return {
    // Mock the OIDCService class
    OIDCService: jest.fn().mockImplementation(() => ({
      handleSilentAuthentication: jest.fn().mockResolvedValue({
        id_token: 'ID_TOKEN',
        access_token: 'ACCESS_TOKEN',
        refresh_token: 'REFRESH_TOKEN  ',
        token_type: 'auth',
        profile: 'sub',
      }),
      clearProgress: jest.fn(),
      handleAuthentication: jest.fn().mockResolvedValue({}),
      // ... other methods of OIDCService
    })),
    getOIDCServiceInstance: jest.fn(), // if needed
  };
});

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const modalMock = jest.spyOn(PrimaryModal, 'show');

describe('E2EIHandler', () => {
  const params = {discoveryUrl: 'http://example.com', gracePeriodInSeconds: 30};
  const user = {name: () => 'John Doe', username: () => 'johndoe', teamId: 'team'};
  const coreMock = container.resolve(Core);

  beforeEach(() => {
    jest.spyOn(util, 'supportsMLS').mockReturnValue(true);
    // Reset the singleton instance before each test
    E2EIHandler.resetInstance();
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Mock the Config to enable e2eIdentity
    (util.supportsMLS as jest.Mock).mockReturnValue(true);

    jest.spyOn(PrimaryModal, 'show');

    jest.spyOn(container.resolve(UserState), 'self').mockReturnValue(user);
    OIDCServiceStore.store.targetURL('http://example.com');
    coreMock.key = new Uint8Array();
  });

  it('should create instance with valid params', async () => {
    const instance = E2EIHandler.getInstance();
    expect(instance).toBeInstanceOf(E2EIHandler);
  });

  it('should always return the same instance', async () => {
    const instance1 = E2EIHandler.getInstance();
    const instance2 = E2EIHandler.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should trigger an initial enrollement when device is a fresh new one', async () => {
    await E2EIHandler.getInstance().initialize(params);
    await wait(1);
    expect(coreMock.service?.e2eIdentity?.initialize).toHaveBeenCalled();
  });

  it('does nothing if there is not enrollment in progress and device is alreaady enrolled', async () => {
    jest.spyOn(coreMock.service!.e2eIdentity!, 'isEnrollmentInProgress').mockResolvedValue(false);
    jest.spyOn(coreMock.service!.e2eIdentity!, 'isFreshMLSSelfClient').mockResolvedValue(false);
    const enrollPromise = E2EIHandler.getInstance().initialize(params);

    expect(modalMock).not.toHaveBeenCalled();

    return enrollPromise;
  });

  it('trigger an enrollment when instantiated with a fresh new MLS device', async () => {
    jest.spyOn(coreMock.service!.e2eIdentity!, 'isFreshMLSSelfClient').mockResolvedValue(true);
    const enrollPromise = E2EIHandler.getInstance().initialize(params);
    await waitFor(() => {
      expect(modalMock).toHaveBeenCalledWith(
        PrimaryModalType.ACKNOWLEDGE,
        expect.objectContaining({text: expect.objectContaining({title: 'acme.settingsChanged.headline.alt'})}),
      );
    });

    // Trigger the user clicking the get certificate button
    modalMock.mock.lastCall?.[1].primaryAction?.action?.();

    await waitFor(() => {
      expect(modalMock).toHaveBeenCalledWith(
        PrimaryModalType.ACKNOWLEDGE,
        expect.objectContaining({text: expect.objectContaining({title: 'acme.done.headline'})}),
      );
    });

    // Trigger the user clicking the OK button after successful enrollment
    modalMock.mock.lastCall?.[1].primaryAction?.action?.();

    return enrollPromise;
  });

  it('continues in progress enrollment', async () => {
    jest.spyOn(coreMock.service!.e2eIdentity!, 'isEnrollmentInProgress').mockResolvedValue(true);
    const enrollPromise = E2EIHandler.getInstance().initialize(params);
    await waitFor(() => {
      expect(modalMock).toHaveBeenCalledWith(
        PrimaryModalType.LOADING,
        expect.objectContaining({text: expect.objectContaining({title: 'acme.inProgress.headline'})}),
      );
    });

    await waitFor(() => {
      expect(modalMock).toHaveBeenCalledWith(
        PrimaryModalType.ACKNOWLEDGE,
        expect.objectContaining({text: expect.objectContaining({title: 'acme.done.headline'})}),
      );
    });

    // Trigger the user clicking the OK button after successful enrollment
    modalMock.mock.lastCall?.[1].primaryAction?.action?.();

    return enrollPromise;
  });

  it('registers a renew timer when device is enrolled', async () => {
    const conversationState = container.resolve(ConversationState);
    jest.spyOn(conversationState, 'getSelfMLSConversation').mockReturnValue(new Conversation() as any);

    jest.spyOn(coreMock.service!.e2eIdentity!, 'isEnrollmentInProgress').mockResolvedValue(false);
    jest.spyOn(coreMock.service!.e2eIdentity!, 'isFreshMLSSelfClient').mockResolvedValue(false);
    jest
      .spyOn(coreMock.service!.conversation!, 'getMLSSelfConversation')
      .mockResolvedValue({group_id: 'groupId'} as any);

    const taskMock = jest.spyOn(LowPrecisionTaskScheduler, 'addTask');

    const instance = await E2EIHandler.getInstance().initialize(params);

    await instance.startTimers();

    expect(taskMock).toHaveBeenCalledWith(expect.objectContaining({key: 'enrollmentTimer'}));
  });
});
