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
import {StatusType} from '../../../message/statusType';
import {Conversation} from '../../../repositories/entity/Conversation';
import {ContentMessage} from '../../../repositories/entity/message/contentMessage';
import {Text} from '../../../repositories/entity/message/text';
import {useNoInternetState} from '../../../view_model/WarningsContainer/noInternetState';
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
  messageActions: {deleteMessage: jest.Mock; deleteMessageEveryone: jest.Mock};
};

const renderMenu = (isNeverAttempted: boolean, status = StatusType.SENT, isOutboxEnabled = true): Setup => {
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
  message.status(status);
  message.assets.push(new Text(createUuid(), 'hello'));

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

  return {messageActions};
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
    renderMenu(true);

    expect(labels()).not.toContain('conversationContextMenuDelete');
    expect(labels()).not.toContain('conversationContextMenuDeleteEveryone');
    expect(labels()).toContain('outboxDeletePending');
  });

  it('deletes through the same action, which asks to confirm', () => {
    const {messageActions} = renderMenu(true);

    latestEntries
      .find(({label}) => {
        return label === 'outboxDeletePending';
      })
      ?.click?.(new MouseEvent('click') as never);

    expect(messageActions.deleteMessage).toHaveBeenCalledTimes(1);
    expect(messageActions.deleteMessageEveryone).not.toHaveBeenCalled();
  });

  it('offers "Delete for me" and "Delete for everyone" for any other message', () => {
    renderMenu(false);

    expect(labels()).toEqual(
      expect.arrayContaining(['conversationContextMenuDelete', 'conversationContextMenuDeleteEveryone']),
    );
    expect(labels()).not.toContain('outboxDeletePending');
  });

  describe('while offline', () => {
    const changeLabels = [
      'conversationContextMenuEdit',
      'conversationContextMenuDelete',
      'conversationContextMenuDeleteEveryone',
      'outboxDeletePending',
    ];
    const changeEntries = (): ContextMenuEntry[] => {
      return latestEntries.filter(({label}) => {
        return label !== undefined && changeLabels.includes(label);
      });
    };

    afterEach(() => {
      useNoInternetState.setState({hasNoInternet: false});
    });

    it('disables edit and both deletes of a sent message, with the reason, and keeps their order', () => {
      useNoInternetState.setState({hasNoInternet: true});

      const {messageActions} = renderMenu(false);

      expect(
        changeEntries().map(({label, isDisabled, title}) => {
          return [label, isDisabled, title];
        }),
      ).toEqual([
        ['conversationContextMenuEdit', true, 'featureNotAvailableOffline'],
        ['conversationContextMenuDelete', true, 'featureNotAvailableOffline'],
        ['conversationContextMenuDeleteEveryone', true, 'featureNotAvailableOffline'],
      ]);
      expect(messageActions.deleteMessage).not.toHaveBeenCalled();
    });

    it('keeps edit and delete of a pending message enabled', () => {
      useNoInternetState.setState({hasNoInternet: true});

      renderMenu(true, StatusType.SENDING);

      expect(changeEntries()).toHaveLength(2);
      expect(
        changeEntries().some(({isDisabled}) => {
          return isDisabled === true;
        }),
      ).toBe(false);
      expect(labels()).toContain('outboxDeletePending');
    });

    it('keeps edit and both deletes of a failed message enabled', () => {
      useNoInternetState.setState({hasNoInternet: true});

      renderMenu(false, StatusType.FAILED);

      expect(changeEntries()).toHaveLength(3);
      expect(
        changeEntries().some(({isDisabled}) => {
          return isDisabled === true;
        }),
      ).toBe(false);
    });

    it('keeps everything enabled while online', () => {
      renderMenu(false);

      expect(changeEntries()).toHaveLength(3);
      expect(
        changeEntries().some(({isDisabled}) => {
          return isDisabled === true;
        }),
      ).toBe(false);
    });

    it('keeps everything enabled with the toggle off', () => {
      useNoInternetState.setState({hasNoInternet: true});

      renderMenu(false, StatusType.SENT, false);

      expect(
        changeEntries().some(({isDisabled}) => {
          return isDisabled === true;
        }),
      ).toBe(false);
    });
  });
});
