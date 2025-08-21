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

import {OutlineCheck} from '@wireapp/react-ui-kit';

import {ReadIndicator} from 'Components/MessagesList/Message/ReadIndicator';
import {useClickOutside} from 'Hooks/useClickOutside';
import {Conversation} from 'Repositories/entity/Conversation';
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import type {FileAsset as FileAssetType} from 'Repositories/entity/message/FileAsset';
import {useRelativeTimestamp} from 'src/script/hooks/useRelativeTimestamp';
import {StatusType} from 'src/script/message/StatusType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {getMessageAriaLabel} from 'Util/conversationMessages';
import {t} from 'Util/LocalizerUtil';

import {ContentAsset} from './asset';
import {deliveredMessageIndicator, messageBodyWrapper, messageEphemeralTimer} from './ContentMessage.styles';
import {MessageActionsMenu} from './MessageActions/MessageActions';
import {useMessageActionsState} from './MessageActions/MessageActions.state';
import {MessageReactionsList} from './MessageActions/MessageReactions/MessageReactionsList';
import {MessageHeader} from './MessageHeader';
import {Quote} from './MessageQuote';
import {CompleteFailureToSendWarning, PartialFailureToSendWarning} from './Warnings';

import {MessageActions} from '..';
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
  is1to1?: boolean;
  isFileShareRestricted: boolean;
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
  is1to1,
  isFileShareRestricted,
}: ContentMessageProps) => {
  const messageRef = useRef<HTMLDivElement | null>(null);

  // check if current message is focused and its elements focusable
  const msgFocusState = useMemo(() => isMsgElementsFocusable && isFocused, [isMsgElementsFocusable, isFocused]);
  const messageFocusedTabIndex = useMessageFocusedTabIndex(msgFocusState);
  const {
    senderName,
    timestamp,
    ephemeralCaption,
    ephemeral_status,
    assets,
    was_edited,
    failedToSend,
    reactions,
    status,
    quote,
    isObfuscated,
  } = useKoSubscribableChildren(message, [
    'senderName',
    'timestamp',
    'ephemeralCaption',
    'ephemeral_status',
    'assets',
    'was_edited',
    'failedToSend',
    'reactions',
    'status',
    'quote',
    'isObfuscated',
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
  const isEphemeralMessage = ephemeral_status === EphemeralStatusType.ACTIVE;

  const hideActionMenuVisibility = () => {
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
        </MessageHeader>
      )}

      <div css={messageBodyWrapper(isEphemeralMessage)}>
        {isEphemeralMessage && (
          <div
            css={messageEphemeralTimer}
            {...(ephemeralCaption && {title: ephemeralCaption})}
            className="message-ephemeral-timer"
          >
            <EphemeralTimer message={message} />
          </div>
        )}

        <div
          className={cx('message-body', {
            'message-asset': isAssetMessage,
            'message-quoted': !!quote,
            'ephemeral-asset-expired': isObfuscated && isAssetMessage,
            'icon-file': isObfuscated && isFileMessage,
            'icon-movie': isObfuscated && isVideoMessage,
          })}
        >
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
              isFileShareRestricted={isFileShareRestricted}
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
              isRemovedFromConversation={conversation.isSelfUserRemoved()}
            />
          )}
        </div>

        {message.expectsReadConfirmation && (
          <div css={deliveredMessageIndicator}>
            {is1to1 && isLastDeliveredMessage && (
              <div
                data-uie-name="status-message-read-receipt-delivered"
                title={t('conversationMessageDelivered')}
                className="delivered-message-icon"
              >
                <OutlineCheck />
              </div>
            )}
          </div>
        )}
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
          isRemovedFromConversation={conversation.isSelfUserRemoved()}
          users={conversation.allUserEntities()}
        />
      )}
    </div>
  );
};
