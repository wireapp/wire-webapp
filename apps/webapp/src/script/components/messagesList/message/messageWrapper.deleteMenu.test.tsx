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

import {render} from '@testing-library/react';
import type {ComponentProps} from 'react';

import {CONVERSATION_PROTOCOL} from '../../../apiClient/team/feature/featureList.types';
import {pendingOfflineMessagesFeatureToggleName} from '../../../featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../page/testSupport/rootContextTestSupport';
import {Conversation} from '../../../repositories/entity/Conversation';
import {ContentMessage} from '../../../repositories/entity/message/contentMessage';
import {translateForTest} from '../../../util/test/translateForTest';
import {createUuid} from '../../../util/uuid';
import {generateUser} from '../../../../../test/helper/UserGenerator';

import {MessageWrapper} from './messageWrapper';

import type {ContextMenuEntry} from '../../../ui/contextMenu';

let latestEntries: ContextMenuEntry[] = [];

jest.mock('./contentMessage', () => {
  return {
    ContentMessageComponent: ({contextMenu}: {contextMenu: {entries: () => ContextMenuEntry[]}}) => {
      latestEntries = contextMenu.entries();
      return null;
    },
  };
});

type Setup = {
  messageRepository: {isPendingAndNeverAttempted: jest.Mock};
  messageActions: {deleteMessage: jest.Mock; deleteMessageEveryone: jest.Mock};
};

const renderMenu = (isOutboxEnabled: boolean, isNeverAttempted: boolean): Setup => {
  const conversation = new Conversation(
    createUuid(),
    'test.wire.link',
    CONVERSATION_PROTOCOL.PROTEUS,
    translateForTest,
  );
  const message = new ContentMessage(createUuid(), translateForTest);
  const self = generateUser();
  self.isMe = true;
  message.user(self);

  const messageRepository = {
    getOutboxState: jest.fn(),
    isPendingAndNeverAttempted: jest.fn().mockReturnValue(isNeverAttempted),
  };
  const messageActions = {deleteMessage: jest.fn(), deleteMessageEveryone: jest.fn()};
  const props = {
    conversation,
    message,
    messageRepository,
    messageActions,
    selfId: {id: createUuid(), domain: 'test.wire.link'},
  } as unknown as ComponentProps<typeof MessageWrapper>;

  render(<MessageWrapper {...props} />, {
    wrapper: createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: featureName => {
          return isOutboxEnabled && featureName === pendingOfflineMessagesFeatureToggleName;
        },
      }),
    ),
  });

  return {messageRepository, messageActions};
};

const labels = (): (string | undefined)[] => {
  return latestEntries.map(({label}) => {
    return label;
  });
};

describe('MessageWrapper delete menu', () => {
  beforeEach(() => {
    latestEntries = [];
  });

  it('offers one "Delete…" for a pending message nobody can have', () => {
    renderMenu(true, true);

    expect(labels()).not.toContain('conversationContextMenuDelete');
    expect(labels()).not.toContain('conversationContextMenuDeleteEveryone');
    expect(labels()).toContain('outboxDeletePending');
  });

  it('deletes through the same action, which asks to confirm', () => {
    const {messageActions} = renderMenu(true, true);

    latestEntries
      .find(({label}) => {
        return label === 'outboxDeletePending';
      })
      ?.click?.(new MouseEvent('click') as never);

    expect(messageActions.deleteMessage).toHaveBeenCalledTimes(1);
    expect(messageActions.deleteMessageEveryone).not.toHaveBeenCalled();
  });

  it('offers "Delete for me" and "Delete for everyone" for an unconfirmed message', () => {
    renderMenu(true, false);

    expect(labels()).toEqual(
      expect.arrayContaining(['conversationContextMenuDelete', 'conversationContextMenuDeleteEveryone']),
    );
    expect(labels()).not.toContain('outboxDeletePending');
  });

  it('offers both deletes, without asking the outbox, when the outbox is off', () => {
    const {messageRepository} = renderMenu(false, true);

    expect(labels()).toEqual(
      expect.arrayContaining(['conversationContextMenuDelete', 'conversationContextMenuDeleteEveryone']),
    );
    expect(labels()).not.toContain('outboxDeletePending');
    expect(messageRepository.isPendingAndNeverAttempted).not.toHaveBeenCalled();
  });
});
