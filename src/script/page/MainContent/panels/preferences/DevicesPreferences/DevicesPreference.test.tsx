/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {render, waitFor} from '@testing-library/react';
import {CONVERSATION_TYPE, ConversationProtocol} from '@wireapp/api-client/lib/conversation';

import {randomUUID} from 'crypto';

import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {ClientState} from 'src/script/client/ClientState';
import {ConversationState} from 'src/script/conversation/ConversationState';
import {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import {User} from 'src/script/entity/User';
import {createUuid} from 'Util/uuid';

import {DevicesPreferences} from './DevicesPreference';

import {E2EIHandler} from '../../../../../E2EIdentity';
import {Conversation} from '../../../../../entity/Conversation';

function createDevice(): ClientEntity {
  const device = new ClientEntity(true, '', createUuid());
  device.model = 'test device';
  device.time = new Date().toISOString();
  return device;
}

function createConversation(protocol?: ConversationProtocol, type?: CONVERSATION_TYPE) {
  const conversation = new Conversation(randomUUID(), '', protocol);
  if (protocol === ConversationProtocol.MLS) {
    conversation.groupId = `groupid-${randomUUID()}`;
    conversation.epoch = 0;
  }
  if (type) {
    conversation.type(type);
  }
  return conversation;
}

describe('DevicesPreferences', () => {
  const params = {discoveryUrl: 'http://example.com', gracePeriodInSeconds: 30};

  const selfProteusConversation = createConversation(ConversationProtocol.PROTEUS, CONVERSATION_TYPE.SELF);
  const selfMLSConversation = createConversation(ConversationProtocol.MLS, CONVERSATION_TYPE.SELF);
  const regularConversation = createConversation();

  const selfUser = new User(createUuid());
  selfUser.devices([createDevice(), createDevice()]);

  const clientState = new ClientState();
  clientState.currentClient = createDevice();
  const defaultParams = {
    clientState,
    conversationState: new ConversationState(),
    cryptographyRepository: {
      getLocalFingerprint: jest.fn().mockResolvedValue('0000000000000'),
      getRemoteFingerprint: jest.fn().mockResolvedValue('1111111111'),
    } as unknown as CryptographyRepository,
    removeDevice: jest.fn(),
    resetSession: jest.fn(),
    verifyDevice: jest.fn(),
    selfUser,
  };

  defaultParams.conversationState.conversations([selfProteusConversation, selfMLSConversation, regularConversation]);

  it('displays all devices', async () => {
    const instance = E2EIHandler.getInstance(params);
    expect(instance).toBeInstanceOf(E2EIHandler);

    const {getByText, getAllByText} = render(withTheme(<DevicesPreferences {...defaultParams} />));

    await waitFor(() => getByText('preferencesDevicesCurrent'));
    expect(getByText('preferencesDevicesCurrent')).toBeDefined();
    expect(getAllByText('preferencesDevicesId')).toHaveLength(selfUser.devices().length);
  });
});
