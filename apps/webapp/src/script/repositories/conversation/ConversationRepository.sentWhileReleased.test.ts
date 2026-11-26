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

import {CONVERSATION_TYPE} from '../../apiClient/conversation/conversation';
import {StatusType} from '../../message/statusType';
import {requireValueForTest} from '../../page/testSupport/rootContextTestSupport';
import {createCoreTestFixture} from '../../util/test/createCoreTestFixture';
import {StorageSchemata} from '../storage/storageSchemata';

import {generateConversation} from '../../../../test/helper/ConversationGenerator';
import {createMessageAddEvent} from '../../../../test/helper/EventGenerator';
import {TestFactory} from '../../../../test/helper/TestFactory';
import {generateUser} from '../../../../test/helper/UserGenerator';

describe('a message that is sent while its conversation is not loaded', () => {
  let testFactory: TestFactory;

  beforeEach(async () => {
    testFactory = new TestFactory(createCoreTestFixture({backendFeatures: {isFederated: false}}));
    await testFactory.exposeConversationActors();
  });

  afterEach(() => {
    testFactory.dispose();
  });

  it('is loaded when the conversation is opened', async () => {
    const conversationRepository = requireValueForTest(testFactory.conversation_repository);
    const messageRepository = requireValueForTest(testFactory.message_repository);
    const selfUser = generateUser();
    selfUser.isMe = true;
    jest.spyOn(conversationRepository['userState'], 'self').mockReturnValue(selfUser);
    jest.spyOn(conversationRepository['userRepository'], 'getUserById').mockResolvedValue(selfUser);

    const conversation = generateConversation({type: CONVERSATION_TYPE.REGULAR});
    const sentAt = '2026-01-01T00:05:00.000Z';
    const event = createMessageAddEvent({
      text: 'written offline',
      overrides: {
        conversation: conversation.id,
        from: selfUser.id,
        time: '2026-01-01T00:00:00.000Z',
        status: StatusType.SENDING,
      },
    });
    await conversationRepository['eventService'].storageService.save(
      StorageSchemata.OBJECT_STORE.EVENTS,
      undefined as unknown as string,
      event,
    );

    await messageRepository['updateMessageAsSent'](conversation, event.id, sentAt);
    const loaded = await conversationRepository.getPrecedingMessages(conversation);

    expect(
      loaded.map(({id}) => {
        return id;
      }),
    ).toContain(event.id);
  });
});
