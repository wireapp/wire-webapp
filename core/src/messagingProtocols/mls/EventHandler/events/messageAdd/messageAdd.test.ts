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

import {CONVERSATION_EVENT, ConversationMLSMessageAddEvent} from '@wireapp/api-client/lib/event';
import {QualifiedId} from '@wireapp/api-client/lib/user';

import {GenericMessage, Text} from '@wireapp/protocol-messaging';

import {handleMLSMessageAdd} from './messageAdd';

import {MLSService} from '../../../MLSService';

const mockedMLSService = {
  getGroupIdFromConversationId: jest.fn(),
  decryptMessage: jest.fn(),
  handlePendingProposals: jest.fn(),
  getEpoch: jest.fn(),
  emit: jest.fn(),
} as unknown as MLSService;

const createMLSMessageAddEventMock = (conversationId: QualifiedId): ConversationMLSMessageAddEvent => ({
  data: '',
  conversation: conversationId.id,
  qualified_conversation: conversationId,
  from: '',
  senderClientId: '',
  type: CONVERSATION_EVENT.MLS_MESSAGE_ADD,
  time: '2023-08-21T06:47:43.387Z',
});

const createMockedMessage = () => {
  return GenericMessage.encode(
    GenericMessage.create({
      messageId: '2d7cb6d8-118f-11e8-b642-0ed5f89f718b',
      text: Text.create({content: 'Hello, World!'}),
    }),
  ).finish();
};

describe('handleMLSMessageAdd', () => {
  it('does not handle pending proposals if message does not contain proposals', async () => {
    const event = createMLSMessageAddEventMock({id: 'conversationId', domain: 'staging.zinfra.io'});
    const mockGroupId = 'AAEAAH87aajaQ011i+rNLmwpy0sAZGl5YS53aXJlLmxpbms=';

    const message = createMockedMessage();

    jest.spyOn(mockedMLSService, 'decryptMessage').mockResolvedValueOnce({
      proposals: [],
      commitDelay: undefined,
      message,
      hasEpochChanged: false,
      isActive: true,
    });

    await handleMLSMessageAdd({event, mlsService: mockedMLSService, groupId: mockGroupId});

    expect(mockedMLSService.handlePendingProposals).not.toHaveBeenCalled();
  });

  it('handles pending proposals if message includes proposals', async () => {
    const event = createMLSMessageAddEventMock({id: 'conversationId', domain: 'staging.zinfra.io'});
    const mockGroupId = 'AAEAAH87aajaQ011i+rNLmwpy0sAZGl5YS53aXJlLmxpbms=';

    const message = createMockedMessage();

    jest.spyOn(mockedMLSService, 'decryptMessage').mockResolvedValueOnce({
      proposals: [
        {proposal: new Uint8Array(), proposalRef: new Uint8Array(), free: () => {}, crlNewDistributionPoints: []},
      ],
      commitDelay: 2000,
      message,
      hasEpochChanged: false,
      isActive: true,
    });

    await handleMLSMessageAdd({event, mlsService: mockedMLSService, groupId: mockGroupId});

    expect(mockedMLSService.handlePendingProposals).toHaveBeenCalledWith({
      groupId: mockGroupId,
      delayInMs: 2000,
      eventTime: event.time,
    });
  });

  it('emits "newEpoch" event if incoming message has advanced epoch number', async () => {
    const event = createMLSMessageAddEventMock({id: 'conversationId', domain: 'staging.zinfra.io'});
    const mockGroupId = 'AAEAAH87aajaQ011i+rNLmwpy0sAZGl5YS53aXJlLmxpbms=';

    const message = createMockedMessage();

    jest.spyOn(mockedMLSService, 'decryptMessage').mockResolvedValueOnce({
      proposals: [],
      message,
      hasEpochChanged: true,
      isActive: true,
    });

    const mockedNewEpoch = 5;
    jest.spyOn(mockedMLSService, 'getEpoch').mockResolvedValueOnce(mockedNewEpoch);

    await handleMLSMessageAdd({event, mlsService: mockedMLSService, groupId: mockGroupId});

    expect(mockedMLSService.emit).toHaveBeenCalledWith('newEpoch', {
      groupId: mockGroupId,
      epoch: mockedNewEpoch,
    });
  });
});
