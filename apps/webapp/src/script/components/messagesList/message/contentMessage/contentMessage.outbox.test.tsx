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

import type {FunctionComponent, ReactNode} from 'react';

import {fireEvent, render} from '@testing-library/react';
import ko from 'knockout';

import {CONVERSATION_PROTOCOL} from '../../../../apiClient/team/feature/featureList.types';
import {pendingOfflineMessagesFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {StatusType} from '../../../../message/statusType';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from '../../../../page/testSupport/rootContextTestSupport';
import {Conversation} from '../../../../repositories/entity/Conversation';
import {ContentMessage} from '../../../../repositories/entity/message/contentMessage';
import {Text} from '../../../../repositories/entity/message/text';
import {User} from '../../../../repositories/entity/User';
import {THEME_ID} from '../../../../uiKit/identity/theme/theme';
import {StyledApp} from '../../../../uiKit/layout/styledApp/styledApp';
import {TIME_IN_MILLIS} from '../../../../util/timeUtil';
import {translateForTest} from '../../../../util/test/translateForTest';
import {createUuid} from '../../../../util/uuid';
import {useNoInternetState} from '../../../../view_model/WarningsContainer/noInternetState';

import {ContentMessageComponent, ContentMessageProps} from './contentMessage';

describe.each([THEME_ID.LIGHT, THEME_ID.DARK])('content message with the outbox in the %s', themeId => {
  let params: ContentMessageProps;
  let message: ContentMessage;

  function createWrapper(isOutboxEnabled: boolean): FunctionComponent<{children: ReactNode}> {
    const RootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        isFeatureToggleEnabled: featureName => {
          return isOutboxEnabled && featureName === pendingOfflineMessagesFeatureToggleName;
        },
      }),
    );

    return function ThemedWrapper({children}) {
      return (
        <StyledApp themeId={themeId}>
          <RootProviderWrapper>{children}</RootProviderWrapper>
        </StyledApp>
      );
    };
  }

  beforeEach(() => {
    message = new ContentMessage(createUuid(), translateForTest);
    message.user(new User(createUuid(), '', translateForTest));
    const textAsset = new Text('', 'hello');
    jest.spyOn(textAsset, 'render').mockReturnValue('<span>hello</span>');
    message.assets.push(textAsset);
    message.timestamp(Date.now());

    params = {
      contextMenu: {entries: ko.observable([])},
      conversation: new Conversation('', '', CONVERSATION_PROTOCOL.PROTEUS, translateForTest),
      findMessage: jest.fn(),
      isFocused: true,
      isLastDeliveredMessage: false,
      hideHeader: false,
      message,
      onClickAvatar: jest.fn(),
      onClickButton: jest.fn(),
      onClickCancelRequest: jest.fn(),
      onClickImage: jest.fn(),
      onClickInvitePeople: jest.fn(),
      onClickMessage: jest.fn(),
      onClickParticipants: jest.fn(),
      onClickReaction: jest.fn(),
      onClickReactionDetails: jest.fn(),
      onClickDetails: jest.fn(),
      onClickTimestamp: jest.fn(),
      onRetry: jest.fn(),
      selfId: {domain: '', id: createUuid()},
      isMsgElementsFocusable: true,
      isFileShareRestricted: false,
      loadUsersByIdsFromDb: jest.fn().mockResolvedValue([]),
      outboxState: 'pending',
    };
  });

  describe('waiting for connection', () => {
    it('shows the clock with its label for a pending message', () => {
      message.status(StatusType.SENDING);

      const {getByRole} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

      expect(getByRole('img', {name: 'outboxWaitingForConnection'})).toBeInTheDocument();
    });

    it('shows the clock for a message restored after a reload, before the outbox knows it', () => {
      message.status(StatusType.SENDING);

      const {getByRole} = render(<ContentMessageComponent {...params} outboxState={undefined} />, {
        wrapper: createWrapper(true),
      });

      expect(getByRole('img', {name: 'outboxWaitingForConnection'})).toBeInTheDocument();
    });

    it('shows no clock while the send is in flight', () => {
      message.status(StatusType.SENDING);

      const {queryByRole} = render(<ContentMessageComponent {...params} outboxState="sending" />, {
        wrapper: createWrapper(true),
      });

      expect(queryByRole('img', {name: 'outboxWaitingForConnection'})).not.toBeInTheDocument();
    });

    it.each([StatusType.SENT, StatusType.FAILED])('shows no clock for a %s message', status => {
      message.status(status);

      const {queryByRole} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

      expect(queryByRole('img', {name: 'outboxWaitingForConnection'})).not.toBeInTheDocument();
    });

    it('shows nothing of it with the toggle off', () => {
      message.status(StatusType.SENDING);

      const {queryByRole, container} = render(<ContentMessageComponent {...params} />, {
        wrapper: createWrapper(false),
      });

      expect(queryByRole('img', {name: 'outboxWaitingForConnection'})).not.toBeInTheDocument();
      expect(container.querySelector('.message-body-dimmed')).not.toBeInTheDocument();
    });

    it('shows no delivered state for a pending message', () => {
      message.status(StatusType.SENDING);
      message.expectsReadConfirmation = true;

      const {container} = render(<ContentMessageComponent {...params} is1to1 isLastDeliveredMessage />, {
        wrapper: createWrapper(true),
      });

      expect(container.querySelector('[data-uie-name="status-message-read-receipt-delivered"]')).toBeNull();
    });

    it('shows the delivered state of a sent message', () => {
      message.status(StatusType.SENT);
      message.expectsReadConfirmation = true;

      const {container} = render(<ContentMessageComponent {...params} is1to1 isLastDeliveredMessage />, {
        wrapper: createWrapper(true),
      });

      expect(container.querySelector('[data-uie-name="status-message-read-receipt-delivered"]')).not.toBeNull();
    });
  });

  describe('dimming', () => {
    it.each([StatusType.SENDING, StatusType.FAILED, StatusType.FEDERATION_ERROR])(
      'dims the content of a %s message',
      status => {
        message.status(status);

        const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

        expect(container.querySelector('.message-body')).toHaveClass('message-body-dimmed');
      },
    );

    it('does not dim a sent message', () => {
      message.status(StatusType.SENT);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

      expect(container.querySelector('.message-body')).not.toHaveClass('message-body-dimmed');
    });
  });

  describe('written time', () => {
    const writtenAgo = (milliseconds: number): string => {
      return new Date(message.timestamp() - milliseconds).toISOString();
    };

    it('says when a message sent at least five minutes later was written, relative while recent', () => {
      message.status(StatusType.SENT);
      message.written_time(writtenAgo(TIME_IN_MILLIS.FIVE_MINUTES * 2));

      const {getByText} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

      expect(getByText('outboxWrittenTimeAgo')).toBeInTheDocument();
    });

    it('says "written at" once the written time is a clock time', () => {
      message.status(StatusType.SENT);
      message.written_time(writtenAgo(3 * TIME_IN_MILLIS.HOUR));

      const {getByText} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

      expect(getByText('outboxWrittenTimeAt')).toBeInTheDocument();
    });

    it('stays silent when the message was sent within five minutes', () => {
      message.status(StatusType.SENT);
      message.written_time(writtenAgo(TIME_IN_MILLIS.MINUTE));

      const {queryByText} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

      expect(queryByText(/outboxWrittenTime/)).not.toBeInTheDocument();
    });

    it('stays silent for pending and failed messages, whose header time is the written time', () => {
      message.written_time(writtenAgo(10 * TIME_IN_MILLIS.MINUTE));

      for (const status of [StatusType.SENDING, StatusType.FAILED]) {
        message.status(status);
        const {queryByText, unmount} = render(<ContentMessageComponent {...params} />, {
          wrapper: createWrapper(true),
        });
        expect(queryByText(/outboxWrittenTime/)).not.toBeInTheDocument();
        unmount();
      }
    });

    it('stays silent with the toggle off', () => {
      message.status(StatusType.SENT);
      message.written_time(writtenAgo(10 * TIME_IN_MILLIS.MINUTE));

      const {queryByText} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(false)});

      expect(queryByText(/outboxWrittenTime/)).not.toBeInTheDocument();
    });
  });

  describe('reacting and replying', () => {
    const replyButton = (container: HTMLElement): Element | null => {
      return container.querySelector('[data-uie-name="do-reply-message"]');
    };

    it('offers both on a pending message', () => {
      message.status(StatusType.SENDING);

      const {container, getByRole} = render(<ContentMessageComponent {...params} />, {
        wrapper: createWrapper(true),
      });

      expect(getByRole('group', {name: 'accessibility.messageActionsMenuLabel'})).toBeInTheDocument();
      expect(replyButton(container)).toBeInTheDocument();
    });

    it('offers neither while the send is in flight', () => {
      message.status(StatusType.SENDING);

      const {container} = render(<ContentMessageComponent {...params} outboxState="sending" />, {
        wrapper: createWrapper(true),
      });

      expect(replyButton(container)).not.toBeInTheDocument();
    });

    it('offers neither on a sending message with the toggle off', () => {
      message.status(StatusType.SENDING);

      const {container} = render(<ContentMessageComponent {...params} outboxState={undefined} />, {
        wrapper: createWrapper(false),
      });

      expect(replyButton(container)).not.toBeInTheDocument();
    });

    it('still offers both on a sent message', () => {
      message.status(StatusType.SENT);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(false)});

      expect(replyButton(container)).toBeInTheDocument();
    });
  });

  describe('changes while offline', () => {
    const thumbsUp = (container: HTMLElement): Element | null => {
      return container.querySelector('[data-uie-name="reactwith-thumbsup-messag"]');
    };
    const pill = (container: HTMLElement): Element | null => {
      return container.querySelector('[data-uie-name="emoji-pill"]');
    };

    beforeEach(() => {
      message.reactions([['👍', [params.selfId]]]);
    });

    afterEach(() => {
      useNoInternetState.setState({hasNoInternet: false});
    });

    it('disables the reaction buttons and the pills of a sent message, and keeps reply', () => {
      useNoInternetState.setState({hasNoInternet: true});
      message.status(StatusType.SENT);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});

      expect(thumbsUp(container)).toHaveAttribute('aria-disabled', 'true');
      expect(thumbsUp(container)).toHaveAttribute('aria-label', 'featureNotAvailableOffline');
      expect(thumbsUp(container)).not.toHaveAttribute('disabled');
      expect(container.querySelector('[data-uie-name="reactwith-emoji-message"]')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
      expect(pill(container)).toHaveAttribute('aria-disabled', 'true');
      expect(container.querySelector('[data-uie-name="do-reply-message"]')).not.toHaveAttribute('aria-disabled');
    });

    it('does nothing when a disabled reaction button or pill is clicked', () => {
      useNoInternetState.setState({hasNoInternet: true});
      message.status(StatusType.SENT);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});
      fireEvent.click(thumbsUp(container) as Element);
      fireEvent.click(container.querySelector('[data-uie-name="reactwith-emoji-message"]') as Element);
      fireEvent.click(pill(container) as Element);

      expect(params.onClickReaction).not.toHaveBeenCalled();
    });

    it('keeps the reactions of a pending message enabled', () => {
      useNoInternetState.setState({hasNoInternet: true});
      message.status(StatusType.SENDING);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});
      fireEvent.click(thumbsUp(container) as Element);
      fireEvent.click(pill(container) as Element);

      expect(thumbsUp(container)).not.toHaveAttribute('aria-disabled');
      expect(pill(container)).not.toHaveAttribute('aria-disabled');
      expect(params.onClickReaction).toHaveBeenCalledTimes(2);
    });

    it('keeps the reactions of a failed message enabled', () => {
      useNoInternetState.setState({hasNoInternet: true});
      message.status(StatusType.FAILED);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});
      fireEvent.click(thumbsUp(container) as Element);
      fireEvent.click(pill(container) as Element);

      expect(thumbsUp(container)).not.toHaveAttribute('aria-disabled');
      expect(pill(container)).not.toHaveAttribute('aria-disabled');
      expect(params.onClickReaction).toHaveBeenCalledTimes(2);
    });

    it('keeps the reactions of a sent message enabled while online', () => {
      message.status(StatusType.SENT);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(true)});
      fireEvent.click(thumbsUp(container) as Element);

      expect(thumbsUp(container)).not.toHaveAttribute('aria-disabled');
      expect(pill(container)).not.toHaveAttribute('aria-disabled');
      expect(params.onClickReaction).toHaveBeenCalledWith('👍');
    });

    it('keeps the reactions of a sent message enabled with the toggle off', () => {
      useNoInternetState.setState({hasNoInternet: true});
      message.status(StatusType.SENT);

      const {container} = render(<ContentMessageComponent {...params} />, {wrapper: createWrapper(false)});

      expect(thumbsUp(container)).not.toHaveAttribute('aria-disabled');
      expect(pill(container)).not.toHaveAttribute('aria-disabled');
    });
  });
});
