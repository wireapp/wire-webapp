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

import {useMemo, useState, useEffect, useRef} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import cx from 'classnames';
import ko from 'knockout';

import {ReadIndicator} from 'Components/MessagesList/Message/ReadIndicator';
import {Conversation} from 'src/script/entity/Conversation';
import {CompositeMessage} from 'src/script/entity/message/CompositeMessage';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {useRelativeTimestamp} from 'src/script/hooks/useRelativeTimestamp';
import {StatusType} from 'src/script/message/StatusType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getMessageAriaLabel} from 'Util/conversationMessages';
import {t} from 'Util/LocalizerUtil';
import {checkIsMessageDelivered} from 'Util/util';

import {ContentAsset} from './asset';
import {deliveredMessageIndicator, messageBodyWrapper} from './ContentMessage.styles';
import {MessageActionsMenu} from './MessageActions/MessageActions';
import {useMessageActionsState} from './MessageActions/MessageActions.state';
import {MessageReactionsList} from './MessageActions/MessageReactions/MessageReactionsList';
import {MessageHeader} from './MessageHeader';
import {Quote} from './MessageQuote';
import {CompleteFailureToSendWarning, PartialFailureToSendWarning} from './Warnings';

import {MessageActions} from '..';
import type {FileAsset as FileAssetType} from '../../../../entity/message/FileAsset';
import {useClickOutside} from '../../../../hooks/useClickOutside';
import {EphemeralStatusType} from '../../../../message/EphemeralStatusType';
import {ContextMenuEntry} from '../../../../ui/ContextMenu';
import {EphemeralTimer} from '../EphemeralTimer';
import {MessageTime} from '../MessageTime';
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
}

export const ContentMessageComponent = ({
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
}: ContentMessageProps) => {
  const messageRef = useRef<HTMLDivElement | null>(null);

  // check if current message is focused and its elements focusable
  const msgFocusState = useMemo(() => isMsgElementsFocusable && isFocused, [isMsgElementsFocusable, isFocused]);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(msgFocusState);
  const {
    senderName,
    timestamp,
    ephemeral_caption: ephemeralCaption,
    ephemeral_status,
    assets,
    was_edited,
    failedToSend,
    reactions,
    status,
    quote,
    isObfuscated,
    readReceipts,
  } = useKoSubscribableChildren(message, [
    'senderName',
    'timestamp',
    'ephemeral_caption',
    'ephemeral_status',
    'assets',
    'was_edited',
    'failedToSend',
    'reactions',
    'status',
    'quote',
    'isObfuscated',
    'readReceipts',
  ]);

  const timeAgo = useRelativeTimestamp(message.timestamp());

  const [messageAriaLabel] = getMessageAriaLabel({
    assets,
    displayTimestampShort: message.displayTimestampShort(),
    senderName,
  });

  const [isActionMenuVisible, setActionMenuVisibility] = useState(false);
  const isMenuOpen = useMessageActionsState(state => state.isMenuOpen);
  useEffect(() => {
    setActionMenuVisibility(isFocused || msgFocusState);
  }, [msgFocusState, isFocused]);

  const isConversationReadonly = conversation.readOnlyState() !== null;

  const contentMessageWrapperRef = (element: HTMLDivElement | null) => {
    messageRef.current = element;

    setTimeout(() => {
      if (element?.parentElement?.querySelector(':hover') === element) {
        // Trigger the action menu in case the component is rendered with the mouse already hovering over it
        setActionMenuVisibility(true);
      }
    });
  };

  const asset = assets?.[0] as FileAssetType | undefined;
  const isFileMessage = !!asset?.isFile();
  const isAudioMessage = !!asset?.isAudio();
  const isVideoMessage = !!asset?.isVideo();
  const isImageMessage = !!asset?.isImage();

  const isAssetMessage = isFileMessage || isAudioMessage || isVideoMessage || isImageMessage;

  const hideActionMenuVisibility = () => {
    if (isFocused) {
      setActionMenuVisibility(false);
    }
  };

  const showDeliveredMessageIcon = checkIsMessageDelivered(isLastDeliveredMessage, readReceipts);

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
        </MessageHeader>
      )}

      <div css={messageBodyWrapper}>
        <div
          className={cx('message-body', {
            'message-asset': isAssetMessage,
            'message-quoted': !!quote,
            'ephemeral-asset-expired': isObfuscated && isAssetMessage,
            'icon-file': isObfuscated && isFileMessage,
            'icon-movie': isObfuscated && isVideoMessage,
          })}
          {...(ephemeralCaption && {title: ephemeralCaption})}
        >
          {ephemeral_status === EphemeralStatusType.ACTIVE && (
            <div className="message-ephemeral-timer">
              <EphemeralTimer message={message} />
            </div>
          )}

          {quote && (
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

          {assets.map(asset => (
            <ContentAsset
              key={asset.type}
              asset={asset}
              message={message}
              selfId={selfId}
              onClickButton={onClickButton}
              onClickImage={onClickImage}
              onClickMessage={onClickMessage}
              isMessageFocused={msgFocusState}
              is1to1Conversation={conversation.is1to1()}
              onClickDetails={() => onClickDetails(message)}
            />
          ))}

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
              isRemovedFromConversation={conversation.removed_from_conversation()}
            />
          )}
        </div>

        <div css={deliveredMessageIndicator}>
          {showDeliveredMessageIcon && (
            <div data-uie-name="status-message-read-receipt-delivered" title={t('conversationMessageDelivered')}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none">
                <path
                  fill="#676B71"
                  fillRule="evenodd"
                  d="M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Zm2 0A8 8 0 1 1 0 8a8 8 0 0 1 16 0Zm-8.659 3.27 5.128-5.127-1.414-1.415-4.42 4.421-1.69-1.69-1.414 1.415 2.396 2.396.707.708.707-.708Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {[StatusType.FAILED, StatusType.FEDERATION_ERROR].includes(status) && (
        <CompleteFailureToSendWarning
          {...(status === StatusType.FEDERATION_ERROR && {unreachableDomain: conversation.domain})}
          isMessageFocused={msgFocusState}
          onRetry={() => onRetry(message)}
        />
      )}

      {failedToSend && (
        <PartialFailureToSendWarning
          isMessageFocused={msgFocusState}
          failedToSend={failedToSend}
          knownUsers={conversation.allUserEntities()}
        />
      )}

      {!!reactions.length && (
        <MessageReactionsList
          reactions={reactions}
          selfUserId={selfId}
          handleReactionClick={onClickReaction}
          isMessageFocused={msgFocusState}
          onTooltipReactionCountClick={() => onClickReactionDetails(message)}
          onLastReactionKeyEvent={() => setActionMenuVisibility(false)}
          isRemovedFromConversation={conversation.removed_from_conversation()}
          users={conversation.allUserEntities()}
        />
      )}
    </div>
  );
};
