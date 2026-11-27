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

import {useMemo, useState, useEffect, useRef, type FunctionComponent} from 'react';

import {isNonEmptyString, isNullOrUndefined} from '@sindresorhus/is';
import cx from 'classnames';
import ko from 'knockout';

import {ContentAsset} from './asset';
import {deliveredMessageIndicator, messageBodyWrapper, messageEphemeralTimer} from './contentMessage.styles';
import {MessageActionsMenu} from './messageActions/messageActions';
import {useMessageActionsState} from './messageActions/messageActions.state';
import {MessageReactionsList} from './messageActions/messageReactions/messageReactionsList';
import {MessageHeader} from './messageHeader';
import {Quote} from './messageQuote';
import {PendingClock} from './pendingClock';
import {CompleteFailureToSendWarning, PartialFailureToSendWarning} from './warnings';
import {shouldShowWrittenTime, writtenTimeStyles} from './writtenTime';

import {MessageActions} from '..';
import {QualifiedId} from '../../../../apiClient/user/qualifiedId';
import {pendingOfflineMessagesFeatureToggleName} from '../../../../featureToggles/startupFeatureToggleNames';
import {useClickOutside} from '../../../../hooks/useClickOutside';
import {
  createRelativeTimestampFormatter,
  useRelativeTimestamp,
  type RelativeTimestampFormatter,
} from '../../../../hooks/useRelativeTimestamp';
import {EphemeralStatusType} from '../../../../message/ephemeralStatusType';
import {StatusType} from '../../../../message/statusType';
import {useApplicationContext} from '../../../../page/rootProvider';
import type {OutboxState} from '../../../../repositories/conversation/outbox/OutboxState';
import {Conversation} from '../../../../repositories/entity/Conversation';
import {CompositeMessage} from '../../../../repositories/entity/message/compositeMessage';
import {ContentMessage} from '../../../../repositories/entity/message/contentMessage';
import type {FileAsset as FileAssetType} from '../../../../repositories/entity/message/fileAsset';
import type {User} from '../../../../repositories/entity/User';
import {ContextMenuEntry} from '../../../../ui/contextMenu';
import {OutlineCheck} from '../../../../uiKit/dataDisplay/icon/outlineCheck';
import {useKoSubscribableChildren} from '../../../../util/componentUtil';
import {getMessageAriaLabel} from '../../../../util/conversationMessages';
import {TIME_IN_MILLIS, fromUnixTime, isYoungerThan1Hour} from '../../../../util/timeUtil';
import {FileFullscreenModalSourceConversationProvider} from '../../../FileFullscreenModal/FileFullscreenModalSourceConversationContext';
import {EphemeralTimer} from '../ephemeralTimer';
import {MessageTime} from '../messageTime';
import {ReadIndicator} from '../readIndicator';
import {useMessageFocusedTabIndex} from '../util';

export interface ContentMessageProps extends Omit<MessageActions, 'onClickResetSession'> {
  contextMenu: {entries: ko.Subscribable<ContextMenuEntry[]>};
  conversation: Conversation;
  findMessage: (conversation: Conversation, messageId: string) => Promise<ContentMessage | undefined>;
  focusMessage?: () => void;
  /** whether the message should display the user avatar and user name before the actual content */
  hideHeader: boolean;
  hasMarker?: boolean;
  isFocused: boolean;
  isLastDeliveredMessage: boolean;
  message: ContentMessage;
  onClickButton: (message: CompositeMessage, buttonId: string) => void;
  onRetry: (message: ContentMessage) => void;
  quotedMessage?: ContentMessage;
  selfId: QualifiedId;
  isMsgElementsFocusable: boolean;
  onClickReaction: (emoji: string) => void;
  is1to1?: boolean;
  isFileShareRestricted: boolean;
  loadUsersByIdsFromDb: (userIds: QualifiedId[]) => Promise<User[]>;
  /** `undefined` while the outbox doesn't have the message */
  outboxState: OutboxState | undefined;
}

interface WrittenTimeProps {
  /** Unix timestamp in milliseconds */
  timestamp: number;
  formatter: RelativeTimestampFormatter;
  translate: (key: 'outboxWrittenTimeAgo' | 'outboxWrittenTimeAt', substitutions: {time: string}) => string;
}

/** Kept here, apart from the rest of the written time, because the time helpers it needs sit in this module's cycle */
const WrittenTime: FunctionComponent<WrittenTimeProps> = ({timestamp, formatter, translate}) => {
  const time = useRelativeTimestamp(timestamp, false, formatter);
  const isRelative = isYoungerThan1Hour(fromUnixTime(timestamp / TIME_IN_MILLIS.SECOND));
  const label = translate(isRelative ? 'outboxWrittenTimeAgo' : 'outboxWrittenTimeAt', {time});

  return (
    <span css={writtenTimeStyles} data-uie-name="status-message-written-time">
      {label}
    </span>
  );
};

export const ContentMessageComponent: FunctionComponent<ContentMessageProps> = ({
  conversation,
  message,
  findMessage,
  selfId,
  hideHeader,
  isFocused,
  isLastDeliveredMessage,
  contextMenu,
  onClickAvatar,
  onClickImage,
  onClickTimestamp,
  onClickMessage,
  onClickReactionDetails,
  onClickButton,
  onRetry,
  isMsgElementsFocusable,
  onClickReaction,
  onClickDetails,
  is1to1,
  isFileShareRestricted,
  loadUsersByIdsFromDb,
  outboxState,
}: ContentMessageProps) => {
  const messageRef = useRef<HTMLDivElement | null>(null);
  const {translate, isFeatureToggleEnabled} = useApplicationContext();
  const isOutboxEnabled = isFeatureToggleEnabled(pendingOfflineMessagesFeatureToggleName);

  // check if current message is focused and its elements focusable
  const msgFocusState = useMemo(() => {
    return isMsgElementsFocusable && isFocused;
  }, [isMsgElementsFocusable, isFocused]);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(msgFocusState);
  const {
    senderName,
    timestamp,
    ephemeralCaption,
    ephemeral_status,
    assets,
    was_edited,
    failedToSend,
    failed_reason: failedReason,
    reactions,
    status,
    quote,
    isObfuscated,
    written_time: writtenTime,
  } = useKoSubscribableChildren(message, [
    'senderName',
    'timestamp',
    'ephemeralCaption',
    'ephemeral_status',
    'assets',
    'was_edited',
    'failedToSend',
    'failed_reason',
    'reactions',
    'status',
    'quote',
    'isObfuscated',
    'written_time',
  ]);

  const relativeTimestampFormatter = useMemo(() => {
    return createRelativeTimestampFormatter({
      justNow: translate('conversationJustNow'),
      today: translate('conversationToday'),
      yesterday: translate('conversationYesterday'),
    });
  }, [translate]);
  const timeAgo = useRelativeTimestamp(message.timestamp(), false, relativeTimestampFormatter);

  const sendingState = message.sendingState();
  // A message restored after a reload has no outbox state until the outbox started, but it already waits
  const isWaitingForConnection = isOutboxEnabled && sendingState === 'outgoing' && outboxState !== 'sending';
  const isPendingInOutbox = outboxState === 'pending' && sendingState === 'outgoing';
  const isDimmed = isOutboxEnabled && sendingState !== 'sent';
  const writtenTimestamp = Date.parse(writtenTime ?? '');
  const showWrittenTime =
    isOutboxEnabled && shouldShowWrittenTime({sendingState, sentTimestamp: timestamp, writtenTimestamp});

  const [messageAriaLabel] = getMessageAriaLabel({
    assets,
    displayTimestampShort: message.displayTimestampShort(),
    senderName,
  });

  const [isActionMenuVisible, setActionMenuVisibility] = useState(false);
  const isMenuOpen = useMessageActionsState(state => {
    return state.isMenuOpen;
  });
  useEffect(() => {
    setActionMenuVisibility(isFocused || msgFocusState);
  }, [msgFocusState, isFocused]);

  const isConversationReadonly = conversation.readOnlyState() !== null;

  const contentMessageWrapperRef = (element: HTMLDivElement | null): void => {
    messageRef.current = element;

    setTimeout(() => {
      if (element?.parentElement?.querySelector(':hover') === element) {
        // Trigger the action menu in case the component is rendered with the mouse already hovering over it
        setActionMenuVisibility(true);
      }
    });
  };

  const asset = assets?.[0] as FileAssetType | undefined;
  const isFileMessage = asset?.isFile() === true;
  const isAudioMessage = asset?.isAudio() === true;
  const isVideoMessage = asset?.isVideo() === true;
  const isImageMessage = asset?.isImage() === true;

  const isAssetMessage = isFileMessage || isAudioMessage || isVideoMessage || isImageMessage;
  const isEphemeralMessage = ephemeral_status === EphemeralStatusType.ACTIVE;

  const hideActionMenuVisibility = (): void => {
    if (isFocused) {
      setActionMenuVisibility(false);
    }
  };

  // Closing another ActionMenu on outside click
  useClickOutside(messageRef, hideActionMenuVisibility);

  return (
    <div
      aria-label={messageAriaLabel}
      className="content-message-wrapper"
      ref={contentMessageWrapperRef}
      onMouseEnter={() => {
        // open another floating action menu if none already open
        if (!isMenuOpen) {
          setActionMenuVisibility(true);
        }
      }}
      onMouseLeave={() => {
        // close floating message actions when no active menu is open like context menu/emoji picker
        if (!isMenuOpen) {
          setActionMenuVisibility(false);
        }
      }}
    >
      {(was_edited || !hideHeader) && (
        <MessageHeader onClickAvatar={onClickAvatar} message={message} focusTabIndex={messageFocusedTabIndex}>
          {was_edited && (
            <span className="message-header-label-icon icon-edit" title={message.displayEditedTimestamp()}></span>
          )}

          <span className="content-message-timestamp">
            <MessageTime timestamp={timestamp} data-timestamp-type="normal">
              {timeAgo}
            </MessageTime>
          </span>

          {showWrittenTime && (
            <WrittenTime timestamp={writtenTimestamp} formatter={relativeTimestampFormatter} translate={translate} />
          )}

          {isWaitingForConnection && <PendingClock label={translate('outboxWaitingForConnection')} />}
        </MessageHeader>
      )}

      <div css={messageBodyWrapper(isEphemeralMessage)}>
        {isEphemeralMessage && (
          <div
            css={messageEphemeralTimer}
            {...(isNonEmptyString(ephemeralCaption) ? {title: ephemeralCaption} : {})}
            className="message-ephemeral-timer"
          >
            <EphemeralTimer message={message} />
          </div>
        )}

        <FileFullscreenModalSourceConversationProvider sourceConversation={conversation}>
          <div
            className={cx('message-body', {
              'message-asset': isAssetMessage,
              'message-quoted': !isNullOrUndefined(quote),
              'message-body-dimmed': isDimmed,
              'ephemeral-asset-expired': isObfuscated && isAssetMessage,
              'icon-file': isObfuscated && isFileMessage,
              'icon-movie': isObfuscated && isVideoMessage,
            })}
          >
            {isNullOrUndefined(quote) ? (
              quote
            ) : (
              <Quote
                conversation={conversation}
                quote={quote}
                selfId={selfId}
                findMessage={findMessage}
                showDetail={onClickImage}
                focusMessage={onClickTimestamp}
                handleClickOnMessage={onClickMessage}
                showUserDetails={onClickAvatar}
                isMessageFocused={msgFocusState}
              />
            )}

            {assets.map(asset => {
              return (
                <ContentAsset
                  key={asset.id}
                  asset={asset}
                  message={message}
                  selfId={selfId}
                  onClickButton={onClickButton}
                  onClickImage={onClickImage}
                  onClickMessage={onClickMessage}
                  isMessageFocused={msgFocusState}
                  is1to1Conversation={conversation.is1to1()}
                  isFileShareRestricted={isFileShareRestricted}
                  onClickDetails={() => {
                    return onClickDetails(message);
                  }}
                />
              );
            })}

            {isAssetMessage && (
              <ReadIndicator message={message} is1to1Conversation={conversation.is1to1()} onClick={onClickDetails} />
            )}

            {!isConversationReadonly && isActionMenuVisible && (
              <MessageActionsMenu
                isMsgWithHeader={!hideHeader}
                message={message}
                handleActionMenuVisibility={setActionMenuVisibility}
                contextMenu={contextMenu}
                isMessageFocused={msgFocusState}
                handleReactionClick={onClickReaction}
                reactionsTotalCount={reactions.length}
                isRemovedFromConversation={conversation.isSelfUserRemoved()}
                isPendingInOutbox={isPendingInOutbox}
              />
            )}
          </div>
        </FileFullscreenModalSourceConversationProvider>

        {message.expectsReadConfirmation && (
          <div css={deliveredMessageIndicator}>
            {is1to1 === true && isLastDeliveredMessage && !isWaitingForConnection && (
              <div
                data-uie-name="status-message-read-receipt-delivered"
                title={translate('conversationMessageDelivered')}
                className="delivered-message-icon"
              >
                <OutlineCheck />
              </div>
            )}
          </div>
        )}
      </div>

      {sendingState === 'failed' && (
        <CompleteFailureToSendWarning
          {...(status === StatusType.FEDERATION_ERROR && {unreachableDomain: conversation.domain})}
          failedReason={failedReason}
          isMessageFocused={msgFocusState}
          onRetry={() => {
            return onRetry(message);
          }}
        />
      )}

      {isNullOrUndefined(failedToSend) ? (
        failedToSend
      ) : (
        <PartialFailureToSendWarning
          isMessageFocused={msgFocusState}
          failedToSend={failedToSend}
          knownUsers={conversation.allUserEntities()}
        />
      )}

      {reactions.length > 0 && (
        <MessageReactionsList
          translate={translate}
          reactions={reactions}
          selfUserId={selfId}
          handleReactionClick={onClickReaction}
          isMessageFocused={msgFocusState}
          onTooltipReactionCountClick={() => {
            return onClickReactionDetails(message);
          }}
          onLastReactionKeyEvent={() => {
            return setActionMenuVisibility(false);
          }}
          isRemovedFromConversation={conversation.isSelfUserRemoved()}
          users={conversation.allUserEntities()}
          loadUsersByIdsFromDb={loadUsersByIdsFromDb}
        />
      )}
    </div>
  );
};
