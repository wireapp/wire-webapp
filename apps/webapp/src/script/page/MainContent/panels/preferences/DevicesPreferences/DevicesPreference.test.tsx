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
import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {container} from 'tsyringe';

import {randomUUID} from 'crypto';

import {ClientEntity} from 'Repositories/client/ClientEntity';
import {ClientState} from 'Repositories/client/ClientState';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {withTheme} from 'src/script/auth/util/test/TestUtil';
import {Core} from 'src/script/service/CoreSingleton';
import {createUuid} from 'Util/uuid';

import {DevicesPreferences} from './DevicesPreference';

function createDevice(): ClientEntity {
  const device = new ClientEntity(true, '', createUuid());
  device.model = 'test device';
  device.time = new Date().toISOString();
  return device;
}

function createConversation(protocol?: CONVERSATION_PROTOCOL, type?: CONVERSATION_TYPE) {
  const conversation = new Conversation(randomUUID(), '', protocol);
  if (protocol === CONVERSATION_PROTOCOL.MLS) {
    conversation.groupId = `groupid-${randomUUID()}`;
    conversation.epoch = 0;
  }
  if (type) {
    conversation.type(type);
  }
  return conversation;
}

describe('DevicesPreferences', () => {
  const selfProteusConversation = createConversation(CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_TYPE.SELF);
  const selfMLSConversation = createConversation(CONVERSATION_PROTOCOL.MLS, CONVERSATION_TYPE.SELF);
  const regularConversation = createConversation();

  const coreMock = container.resolve(Core);
  coreMock.isMLSActiveForClient = jest.fn().mockReturnValue(true);

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
    const {getByText, getAllByText} = render(withTheme(<DevicesPreferences {...defaultParams} />));

    await waitFor(() => getByText('preferencesDevicesCurrent'));
    expect(getByText('preferencesDevicesCurrent')).toBeDefined();
    expect(getAllByText('preferencesDevicesId')).toHaveLength(selfUser.devices().length);
  });
});
