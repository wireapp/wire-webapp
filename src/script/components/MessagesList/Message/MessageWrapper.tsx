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

import React from 'react';

import {ReactionType} from '@wireapp/core/lib/conversation';
import {amplify} from 'amplify';
import ko from 'knockout';
import {container} from 'tsyringe';

import {WebAppEvents} from '@wireapp/webapp-events';

import {E2EIVerificationMessage} from 'Components/MessagesList/Message/E2EIVerificationMessage';
import {AssetRepository} from 'Repositories/assets/AssetRepository';
import {OutgoingQuote} from 'Repositories/conversation/MessageRepository';
import {Conversation} from 'Repositories/entity/Conversation';
import {CompositeMessage} from 'Repositories/entity/message/CompositeMessage';
import {ContentMessage} from 'Repositories/entity/message/ContentMessage';
import {Text} from 'Repositories/entity/message/Text';
import {TeamState} from 'Repositories/team/TeamState';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {CallMessage} from './CallMessage';
import {CallTimeoutMessage} from './CallTimeoutMessage';
import {ContentMessageComponent} from './ContentMessage';
import {DecryptErrorMessage} from './DecryptErrorMessage';
import {DeleteMessage} from './DeleteMessage';
import {FailedToAddUsersMessage} from './FailedToAddUsersMessage';
import {FederationStopMessage} from './FederationStopMessage';
import {FileTypeRestrictedMessage} from './FileTypeRestrictedMessage';
import {LegalHoldMessage} from './LegalHoldMessage';
import {MemberMessage} from './MemberMessage';
import {MissedMessage} from './MissedMessage';
import {PingMessage} from './PingMessage';
import {SystemMessage} from './SystemMessage';
import {VerificationMessage} from './VerificationMessage';

import {ContextMenuEntry} from '../../../ui/ContextMenu';

import {MessageParams} from './index';

const isOutgoingQuote = (quoteEntity: QuoteEntity): quoteEntity is OutgoingQuote => {
  return quoteEntity.hash !== undefined;
};

export const MessageWrapper: React.FC<MessageParams> = ({
  message,
  conversation,
  selfId,
  isFocused,
  isSelfTemporaryGuest,
  isLastDeliveredMessage,
  shouldShowInvitePeople,
  hideHeader,
  hasReadReceiptsTurnedOn,
  onClickAvatar,
  onClickImage,
  onClickInvitePeople,
  onClickReactionDetails,
  onClickMessage,
  onClickTimestamp,
  onClickParticipants,
  onClickDetails,
  onClickResetSession,
  onClickCancelRequest,
  messageRepository,
  messageActions,
  teamState = container.resolve(TeamState),
  isMsgElementsFocusable,
}) => {
  const findMessage = async (conversation: Conversation, messageId: string) => {
    const event =
      (await messageRepository.getMessageInConversationById(conversation, messageId)) ||
      (await messageRepository.getMessageInConversationByReplacementId(conversation, messageId));
    return await messageRepository.ensureMessageSender(event);
  };
  const clickButton = (message: CompositeMessage, buttonId: string) => {
    if (message.selectedButtonId() !== buttonId && message.waitingButtonId() !== buttonId) {
      message.waitingButtonId(buttonId);
      messageRepository.sendButtonAction(conversation, message, buttonId);
    }
  };

  const onRetry = async (message: ContentMessage) => {
    const firstAsset = message.getFirstAsset();
    const file = message.fileData();

    if (firstAsset instanceof Text) {
      const messageId = message.id;
      const messageText = firstAsset.text;
      const mentions = firstAsset.mentions();
      const incomingQuote = message.quote();
      const quote: OutgoingQuote | undefined =
        incomingQuote && isOutgoingQuote(incomingQuote) ? (incomingQuote as OutgoingQuote) : undefined;

      await messageRepository.sendTextWithLinkPreview({
        conversation,
        textMessage: messageText,
        mentions,
        quoteEntity: quote,
        messageId,
        attachments: [],
      });
    } else if (file) {
      await messageRepository.retryUploadFile(conversation, file, firstAsset.isImage(), message.id);
    }
  };
  const {display_name: displayName} = useKoSubscribableChildren(conversation, ['display_name']);
  const isFileShareRestricted = !teamState.isFileSharingReceivingEnabled();

  const contextMenuEntries = ko.pureComputed(() => {
    const entries: ContextMenuEntry[] = [];

    const canDelete = message.user().isMe && !conversation.isSelfUserRemoved() && message.isDeletable();

    const canEdit = message.isEditable() && !conversation.isSelfUserRemoved();

    const hasDetails = !conversation.is1to1() && !message.isEphemeral() && !conversation.isSelfUserRemoved();

    if (message.isDownloadable() && !isFileShareRestricted) {
      entries.push({
        click: () => message.download(container.resolve(AssetRepository)),
        label: t('conversationContextMenuDownload'),
      });
    }

    if (canEdit) {
      entries.push({
        click: () => amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.EDIT, message),
        label: t('conversationContextMenuEdit'),
      });
    }

    if (message.isCopyable() && !isFileShareRestricted) {
      entries.push({
        click: () => message.copy(),
        label: t('conversationContextMenuCopy'),
      });
    }

    if (hasDetails) {
      entries.push({
        click: () => onClickDetails(message),
        label: t('conversationContextMenuDetails'),
      });
    }

    if (message.isDeletable()) {
      entries.push({
        click: () => messageActions.deleteMessage(conversation, message),
        label: t('conversationContextMenuDelete'),
      });
    }

    if (canDelete) {
      entries.push({
        click: () => messageActions.deleteMessageEveryone(conversation, message),
        label: t('conversationContextMenuDeleteEveryone'),
      });
    }

    return entries;
  });

  const handleReactionClick = (reaction: ReactionType): void => {
    if (!message.isContent()) {
      return;
    }
    return void messageRepository.toggleReaction(conversation, message, reaction, selfId);
  };
  if (message.isContent()) {
    return (
      <ContentMessageComponent
        message={message}
        findMessage={findMessage}
        conversation={conversation}
        hideHeader={hideHeader}
        selfId={selfId}
        isLastDeliveredMessage={isLastDeliveredMessage}
        onClickMessage={onClickMessage}
        onClickTimestamp={onClickTimestamp}
        onClickReactionDetails={onClickReactionDetails}
        onClickButton={clickButton}
        onClickAvatar={onClickAvatar}
        contextMenu={{entries: contextMenuEntries}}
        onClickCancelRequest={onClickCancelRequest}
        onClickImage={onClickImage}
        onClickInvitePeople={onClickInvitePeople}
        onClickParticipants={onClickParticipants}
        onClickDetails={onClickDetails}
        onRetry={onRetry}
        isFocused={isFocused}
        isMsgElementsFocusable={isMsgElementsFocusable}
        onClickReaction={handleReactionClick}
        is1to1={conversation.is1to1()}
        isFileShareRestricted={isFileShareRestricted}
      />
    );
  }
  if (message.isUnableToDecrypt()) {
    return <DecryptErrorMessage message={message} onClickResetSession={onClickResetSession} />;
  }
  if (message.isLegalHold()) {
    return <LegalHoldMessage message={message} />;
  }
  if (message.isFederationStop()) {
    return <FederationStopMessage isMessageFocused={isFocused} message={message} />;
  }
  if (message.isVerification()) {
    return <VerificationMessage message={message} />;
  }
  if (message.isE2EIVerification()) {
    return <E2EIVerificationMessage message={message} conversation={conversation} />;
  }
  if (message.isDelete()) {
    return <DeleteMessage message={message} onClickAvatar={onClickAvatar} />;
  }
  if (message.isCall()) {
    return <CallMessage message={message} />;
  }
  if (message.isCallTimeout()) {
    return <CallTimeoutMessage message={message} />;
  }
  if (message.isFailedToAddUsersMessage()) {
    return <FailedToAddUsersMessage isMessageFocused={isFocused} message={message} />;
  }
  if (message.isSystem()) {
    return <SystemMessage message={message} />;
  }
  if (message.isMember()) {
    return (
      <MemberMessage
        message={message}
        conversationName={displayName}
        onClickInvitePeople={onClickInvitePeople}
        onClickParticipants={onClickParticipants}
        onClickCancelRequest={onClickCancelRequest}
        hasReadReceiptsTurnedOn={hasReadReceiptsTurnedOn}
        shouldShowInvitePeople={shouldShowInvitePeople}
        isSelfTemporaryGuest={isSelfTemporaryGuest}
        classifiedDomains={teamState.classifiedDomains()}
      />
    );
  }
  if (message.isPing()) {
    return (
      <PingMessage
        message={message}
        is1to1Conversation={conversation.is1to1()}
        isLastDeliveredMessage={isLastDeliveredMessage}
        onClickDetails={onClickDetails}
      />
    );
  }
  if (message.isFileTypeRestricted()) {
    return <FileTypeRestrictedMessage message={message} />;
  }

  if (message.isMissed()) {
    return <MissedMessage />;
  }

  return null;
};
