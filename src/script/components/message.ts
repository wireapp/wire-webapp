/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import ko from 'knockout';
import {container} from 'tsyringe';

import {AVATAR_SIZE} from 'Components/Avatar';
import {t} from 'Util/LocalizerUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';
import {formatDateNumeral, formatTimeShort} from 'Util/TimeUtil';

import {EphemeralStatusType} from '../message/EphemeralStatusType';
import {Context, ContextMenuEntry} from '../ui/ContextMenu';
import type {ContentMessage} from '../entity/message/ContentMessage';
import type {CompositeMessage} from '../entity/message/CompositeMessage';
import {StatusType} from '../message/StatusType';
import type {Text} from '../entity/message/Text';
import type {ActionsViewModel} from '../view_model/ActionsViewModel';
import type {Conversation} from '../entity/Conversation';
import type {User} from '../entity/User';
import type {MessageListViewModel} from '../view_model/content/MessageListViewModel';
import type {DecryptErrorMessage} from '../entity/message/DecryptErrorMessage';
import type {ConversationRepository} from '../conversation/ConversationRepository';
import {AssetRepository} from '../assets/AssetRepository';
import type {MessageRepository} from '../conversation/MessageRepository';

import './asset/audioAsset';
import './asset/FileAssetComponent';
import './asset/imageAsset';
import './asset/LinkPreviewAssetComponent';
import './asset/LocationAsset';
import './asset/videoAsset';
import './asset/MessageButton';
import './message/VerificationMessage';
import './message/CallMessage';
import './message/CallTimeoutMessage';
import './message/MissedMessage';
import './message/FileTypeRestrictedMessage';
import './message/DeleteMessage';
import './message/DecryptErrorMessage';
import './message/LegalHoldMessage';
import './message/SystemMessage';

interface MessageParams {
  actionsViewModel: ActionsViewModel;
  conversation: ko.Observable<Conversation>;
  conversationRepository: ConversationRepository;
  isLastDeliveredMessage: ko.Observable<boolean>;
  isMarked: ko.Observable<boolean>;
  isSelfTemporaryGuest: ko.Observable<boolean>;
  message: ContentMessage;
  messageRepository: MessageRepository;
  onClickAvatar: (user: User) => void;
  onClickCancelRequest: (message: ContentMessage) => void;
  onClickImage: (message: ContentMessage, event: UIEvent) => void;
  onClickInvitePeople: () => void;
  onClickLikes: (view: MessageListViewModel) => void;
  onClickMessage: (message: ContentMessage, event: Event) => boolean;
  onClickParticipants: (participants: User[]) => void;
  onClickReceipts: (view: Message) => void;
  onClickResetSession: (messageError: DecryptErrorMessage) => void;
  onClickTimestamp: (messageId: string) => void;
  onContentUpdated: () => void;
  onLike: (message: ContentMessage, button?: boolean) => void;
  onMessageMarked: (element: HTMLElement) => void;
  selfId: ko.Observable<string>;
  shouldShowAvatar: ko.Observable<boolean>;
  shouldShowInvitePeople: ko.Observable<boolean>;
}

class Message {
  accentColor: ko.PureComputed<string>;
  actionsViewModel: ActionsViewModel;
  assetSubscription: ko.Subscription;
  contextMenuEntries: ko.PureComputed<ContextMenuEntry[]>;
  conversation: ko.Observable<Conversation>;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  EphemeralStatusType: typeof EphemeralStatusType;
  hasReadReceiptsTurnedOn: boolean;
  includesOnlyEmojis: (text: string) => boolean;
  isLastDeliveredMessage: ko.Observable<boolean>;
  isSelfTemporaryGuest: ko.Observable<boolean>;
  message: ContentMessage;
  onClickAvatar: (user: User) => void;
  onClickCancelRequest: (message: ContentMessage) => void;
  onClickImage: (message: ContentMessage, event: UIEvent) => void;
  onClickInvitePeople: () => void;
  onClickLikes: (view: MessageListViewModel) => void;
  onClickMessage: (message: ContentMessage, event: Event) => boolean;
  onClickParticipants: (participants: User[]) => void;
  onClickReceipts: (view: Message) => void;
  onClickResetSession: (messageError: DecryptErrorMessage) => void;
  onClickTimestamp: (messageId: string) => void;
  onLike: (message: ContentMessage, button?: boolean) => void;
  AVATAR_SIZE: typeof AVATAR_SIZE;
  previewSubscription: ko.Subscription;
  readReceiptText: ko.PureComputed<string>;
  readReceiptTooltip: ko.PureComputed<string>;
  selfId: ko.Observable<string>;
  shouldShowAvatar: ko.Observable<boolean>;
  shouldShowInvitePeople: ko.Observable<boolean>;
  StatusType: typeof StatusType;

  constructor(
    {
      message,
      conversation,
      selfId,
      isSelfTemporaryGuest,
      isLastDeliveredMessage,
      isMarked,
      shouldShowAvatar,
      shouldShowInvitePeople,
      onContentUpdated,
      onClickAvatar,
      onClickImage,
      onClickInvitePeople,
      onClickLikes,
      onClickMessage,
      onClickTimestamp,
      onClickParticipants,
      onClickReceipts,
      onClickResetSession,
      onClickCancelRequest,
      onLike,
      onMessageMarked,
      conversationRepository,
      messageRepository,
      actionsViewModel,
    }: MessageParams,
    componentInfo: {element: HTMLElement},
  ) {
    this.message = message;
    this.conversation = conversation;

    this.shouldShowAvatar = shouldShowAvatar;
    this.shouldShowInvitePeople = shouldShowInvitePeople;
    this.selfId = selfId;
    this.isSelfTemporaryGuest = isSelfTemporaryGuest;
    this.isLastDeliveredMessage = isLastDeliveredMessage;
    this.accentColor = ko.pureComputed(() => message.user().accent_color());

    this.onClickImage = onClickImage;
    this.onClickInvitePeople = onClickInvitePeople;
    this.onClickAvatar = onClickAvatar;
    this.onClickMessage = onClickMessage;
    this.onClickTimestamp = onClickTimestamp;
    this.onClickParticipants = onClickParticipants;
    this.onClickReceipts = onClickReceipts;
    this.onClickLikes = onClickLikes;
    this.onClickResetSession = onClickResetSession;
    this.onClickCancelRequest = onClickCancelRequest;
    this.onLike = onLike;
    this.includesOnlyEmojis = includesOnlyEmojis;
    this.AVATAR_SIZE = AVATAR_SIZE;

    ko.computed(
      () => {
        if (isMarked()) {
          setTimeout(() => onMessageMarked(componentInfo.element));
        }
      },
      {disposeWhenNodeIsRemoved: componentInfo.element},
    );

    this.conversationRepository = conversationRepository;
    this.messageRepository = messageRepository;
    this.EphemeralStatusType = EphemeralStatusType;
    this.StatusType = StatusType;

    if (message.hasAssetText()) {
      // add a listener to any changes to the assets. This will warn the parent that the message has changed
      this.assetSubscription = message.assets.subscribe(onContentUpdated);
      // also listen for link previews on a single Text entity
      this.previewSubscription = (message.getFirstAsset() as Text).previews.subscribe(onContentUpdated);
    }

    this.actionsViewModel = actionsViewModel;

    this.hasReadReceiptsTurnedOn = this.conversationRepository.expectReadReceipt(this.conversation());

    this.readReceiptTooltip = ko.pureComputed(() => {
      const receipts = this.message.readReceipts();
      if (!receipts.length || !this.conversation().is1to1()) {
        return '';
      }
      return formatDateNumeral(receipts[0].time);
    });

    this.readReceiptText = ko.pureComputed(() => {
      if (!this.message.expectsReadConfirmation) {
        return '';
      }
      const receipts = this.message.readReceipts();
      if (!receipts.length) {
        return '';
      }
      const is1to1 = this.conversation().is1to1();
      return is1to1 ? formatTimeShort(receipts[0].time) : receipts.length.toString(10);
    });

    this.contextMenuEntries = ko.pureComputed(() => {
      const messageEntity = this.message;
      const entries: ContextMenuEntry[] = [];

      const canDelete =
        messageEntity.user().isMe && !this.conversation().removed_from_conversation() && messageEntity.isDeletable();

      const hasDetails =
        !this.conversation().is1to1() &&
        !messageEntity.isEphemeral() &&
        !this.conversation().removed_from_conversation();

      if (messageEntity.isDownloadable()) {
        entries.push({
          click: () => messageEntity.download(container.resolve(AssetRepository)),
          label: t('conversationContextMenuDownload'),
        });
      }

      if (messageEntity.isReactable() && !this.conversation().removed_from_conversation()) {
        const label = messageEntity.is_liked() ? t('conversationContextMenuUnlike') : t('conversationContextMenuLike');

        entries.push({
          click: () => this.onLike(messageEntity, false),
          label,
        });
      }

      if (messageEntity.isEditable() && !this.conversation().removed_from_conversation()) {
        entries.push({
          click: () => amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.EDIT, messageEntity),
          label: t('conversationContextMenuEdit'),
        });
      }

      if (messageEntity.isReplyable() && !this.conversation().removed_from_conversation()) {
        entries.push({
          click: () => amplify.publish(WebAppEvents.CONVERSATION.MESSAGE.REPLY, messageEntity),
          label: t('conversationContextMenuReply'),
        });
      }

      if (messageEntity.isCopyable()) {
        entries.push({
          click: () => messageEntity.copy(),
          label: t('conversationContextMenuCopy'),
        });
      }

      if (hasDetails) {
        entries.push({
          click: () => this.onClickReceipts(this),
          label: t('conversationContextMenuDetails'),
        });
      }

      if (messageEntity.isDeletable()) {
        entries.push({
          click: () => this.actionsViewModel.deleteMessage(this.conversation(), messageEntity),
          label: t('conversationContextMenuDelete'),
        });
      }

      if (canDelete) {
        entries.push({
          click: () => this.actionsViewModel.deleteMessageEveryone(this.conversation(), messageEntity),
          label: t('conversationContextMenuDeleteEveryone'),
        });
      }

      return entries;
    });
  }

  readonly dispose = () => {
    if (this.assetSubscription) {
      this.assetSubscription.dispose();
      this.previewSubscription.dispose();
    }
  };

  clickButton(message: CompositeMessage, buttonId: string) {
    if (message.selectedButtonId() !== buttonId && message.waitingButtonId() !== buttonId) {
      message.waitingButtonId(buttonId);
      this.messageRepository.sendButtonAction(this.conversation(), message, buttonId);
    }
  }

  showContextMenu(event: MouseEvent) {
    const entries = this.contextMenuEntries();
    Context.from(event, entries, 'message-options-menu');
  }

  readonly bindShowMore = (elements: HTMLElement[], scope: Message) => {
    const label = elements.find(element => element.className === 'message-header-label');
    if (!label) {
      return;
    }
    const link = label.querySelector('.message-header-show-more');
    if (link) {
      link.addEventListener('click', () => this.onClickParticipants((scope.message as any).highlightedUsers()));
    }
  };
}

// If this is not explicitly defined as string,
// TS will define this as the string's content.
const receiptStatusTemplate: string = `
  <!-- ko if: isLastDeliveredMessage() && readReceiptText() === '' -->
    <span class="message-status" data-bind="text: t('conversationMessageDelivered')"></span>
  <!-- /ko -->
  <!-- ko if: readReceiptText() -->
    <span class="message-status-read" data-bind="
        css: {'message-status-read--visible': isLastDeliveredMessage(),
          'with-tooltip with-tooltip--receipt': readReceiptTooltip(),
          'message-status-read--clickable': !conversation().is1to1()},
        attr: {'data-tooltip': readReceiptTooltip()},
        click: conversation().is1to1() ? null : onClickReceipts
        "
        data-uie-name="status-message-read-receipts">
      <read-icon></read-icon>
      <span class="message-status-read__count" data-bind="text: readReceiptText()" data-uie-name="status-message-read-receipt-count"></span>
    </span>
  <!-- /ko -->
`;

const normalTemplate: string = `
  <!-- ko if: shouldShowAvatar -->
    <div class="message-header">
      <div class="message-header-icon">
        <participant-avatar class="cursor-pointer" params="participant: message.user, onAvatarClick: onClickAvatar, size: AVATAR_SIZE.X_SMALL"></participant-avatar>
      </div>
      <div class="message-header-label">
        <span class="message-header-label-sender" data-bind='css: message.accent_color(), text: message.headerSenderName()' data-uie-name="sender-name"></span>
        <!-- ko if: message.user().isService -->
          <service-icon class="message-header-icon-service"></service-icon>
        <!-- /ko -->
        <!-- ko if: message.user().isExternal() -->
          <external-icon class="message-header-icon-external with-tooltip with-tooltip--external" data-bind="attr: {'data-tooltip': t('rolePartner')}" data-uie-name="sender-external"></external-icon>
        <!-- /ko -->
        <!-- ko if: message.user().isGuest() -->
          <guest-icon class="message-header-icon-guest with-tooltip with-tooltip--external" data-bind="attr: {'data-tooltip': t('conversationGuestIndicator')}" data-uie-name="sender-guest"></guest-icon>
        <!-- /ko -->
        <!-- ko if: message.was_edited() -->
          <span class="message-header-label-icon icon-edit" data-bind="attr: {title: message.displayEditedTimestamp()}"></span>
        <!-- /ko -->
      </div>
    </div>
  <!-- /ko -->
  <!-- ko if: message.quote() -->
    <message-quote params="
        conversation: conversation,
        quote: message.quote(),
        selfId: selfId,
        messageRepository: messageRepository,
        showDetail: onClickImage,
        focusMessage: onClickTimestamp,
        handleClickOnMessage: onClickMessage,
        showUserDetails: onClickAvatar,
      "></message-quote>
  <!-- /ko -->

  <div class="message-body" data-bind="attr: {'title': message.ephemeral_caption()}">
    <!-- ko if: message.ephemeral_status() === EphemeralStatusType.ACTIVE -->
      <ephemeral-timer class="message-ephemeral-timer" params="message: message"></ephemeral-timer>
    <!-- /ko -->

    <!-- ko foreach: {data: message.assets, as: 'asset', noChildContext: true} -->
      <!-- ko if: asset.isImage() -->
        <image-asset params="asset: asset, message: message, onClick: onClickImage"></image-asset>
      <!-- /ko -->
      <!-- ko if: asset.isText() -->
        <!-- ko if: asset.should_render_text -->
          <div class="text" data-bind="html: asset.render(selfId(), accentColor()), event: {mousedown: (data, event) => onClickMessage(asset, event)}, css: {'text-large': includesOnlyEmojis(asset.text), 'text-foreground': message.status() === StatusType.SENDING, 'ephemeral-message-obfuscated': message.isObfuscated()}" dir="auto"></div>
        <!-- /ko -->
        <!-- ko foreach: asset.previews() -->
          <link-preview-asset class="message-asset" params="message: $parent.message"></link-preview-asset>
        <!-- /ko -->
      <!-- /ko -->
      <!-- ko if: asset.isVideo() -->
        <video-asset class="message-asset" data-bind="css: {'ephemeral-asset-expired icon-movie': message.isObfuscated()}" params="message: message"></video-asset>
      <!-- /ko -->
      <!-- ko if: asset.isAudio() -->
        <audio-asset class="message-asset" data-bind="css: {'ephemeral-asset-expired': message.isObfuscated()}" params="message: message"></audio-asset>
      <!-- /ko -->
      <!-- ko if: asset.isFile() -->
        <file-asset class="message-asset" data-bind="css: {'ephemeral-asset-expired icon-file': message.isObfuscated()}" params="message: message"></file-asset>
      <!-- /ko -->
      <!-- ko if: asset.isLocation() -->
        <location-asset params="asset: asset"></location-asset>
      <!-- /ko -->
      <!-- ko if: asset.isButton() -->
        <message-button params="onClick: () => clickButton(message, asset.id), label: asset.text, id: asset.id, message: message"></message-button>
      <!-- /ko -->
    <!-- /ko -->

    <!-- ko if: !message.other_likes().length && message.isReactable() -->
      <div class="message-body-like">
        <span class="message-body-like-icon like-button message-show-on-hover" data-bind="attr: {'data-ui-value': message.is_liked()}, css: {'like-button-liked': message.is_liked()}, style: {opacity: message.is_liked() ? 1 : ''}, click: () => onLike(message)">
          <span class="icon-like-small"></span>
          <span class="icon-liked-small"></span>
        </span>
      </div>
    <!-- /ko -->

    <div class="message-body-actions">
      <!-- ko if: contextMenuEntries().length > 0 -->
        <span class="context-menu icon-more font-size-xs" data-bind="click: (data, event) => showContextMenu(event)"></span>
      <!-- /ko -->
      <!-- ko if: message.ephemeral_status() === EphemeralStatusType.ACTIVE -->
        <time class="time" data-bind="text: message.displayTimestampShort(), attr: {'data-timestamp': message.timestamp, 'data-uie-uid': message.id, 'title': message.ephemeral_caption()}, showAllTimestamps"></time>
      <!-- /ko -->
      <!-- ko ifnot: message.ephemeral_status() === EphemeralStatusType.ACTIVE -->
        <time class="time with-tooltip with-tooltip--top with-tooltip--time" data-bind="text: message.displayTimestampShort(), attr: {'data-timestamp': message.timestamp, 'data-uie-uid': message.id, 'data-tooltip': message.displayTimestampLong()}, showAllTimestamps"></time>
      <!-- /ko -->
      ${receiptStatusTemplate}
    </div>

  </div>
  <!-- ko if: message.other_likes().length -->
    <div class="message-footer">
      <div class="message-footer-icon">
        <span class="like-button" data-bind="attr: {'data-ui-value': message.is_liked()}, css: {'like-button-liked': message.is_liked()}, style: {opacity: message.is_liked() ? 1 : ''}, click: () => onLike(message)">
          <span class="icon-like-small"></span>
          <span class="icon-liked-small"></span>
        </span>
      </div>
      <div class="message-footer-label " data-bind="css: {'cursor-pointer': !conversation().is1to1()}, click: !conversation().is1to1() ? onClickLikes : null ">
        <span class="font-size-xs text-foreground" data-bind="text: message.like_caption(), attr: {'data-uie-value': message.reactions_user_ids()}"  data-uie-name="message-liked-names"></span>
      </div>
    </div>
  <!-- /ko -->
  `;

const pingTemplate: string = `
  <div class="message-header">
    <div class="message-header-icon">
      <div class="icon-ping" data-bind="css: message.get_icon_classes"></div>
    </div>
    <div class="message-header-label" data-bind="attr: {title: message.ephemeral_caption()}, css: {'ephemeral-message-obfuscated': message.isObfuscated()}">
      <span class="message-header-label__multiline">
        <span class="message-header-sender-name" data-bind='text: message.unsafeSenderName()'></span>
        <span class="ellipsis" data-bind="text: message.caption"></span>
      </span>
    </div>
    <div class="message-body-actions">
      <time class="time with-tooltip with-tooltip--top with-tooltip--time" data-bind="text: message.displayTimestampShort(), attr: {'data-timestamp': message.timestamp, 'data-tooltip': message.displayTimestampLong()}, showAllTimestamps"></time>
      ${receiptStatusTemplate}
    </div>
  </div>
  `;

const memberTemplate: string = `
  <!-- ko if: message.showLargeAvatar() -->
    <div class="message-connected">
      <span class="message-connected-header" data-bind='text: message.otherUser().name()'></span>
      <!-- ko if: message.otherUser().isService -->
        <span class="message-connected-provider-name" data-bind='text: message.otherUser().providerName()'></span>
      <!-- /ko -->
      <!-- ko ifnot: message.otherUser().isService -->
        <span class="message-connected-username label-username" data-bind='text: message.otherUser().handle'></span>
      <!-- /ko -->
      <participant-avatar class="message-connected-avatar cursor-default"
                   params="participant: message.otherUser, size: AVATAR_SIZE.X_LARGE, noBadge: message.otherUser().isOutgoingRequest()"></participant-avatar>
      <!-- ko if: message.otherUser().isOutgoingRequest() -->
        <div class="message-connected-cancel accent-text"
             data-bind="click: () => onClickCancelRequest(message),
                        text: t('conversationConnectionCancelRequest')"
             data-uie-name="do-cancel-request"></div>
      <!-- /ko -->
      <!-- ko if: message.showServicesWarning -->
        <div class="message-services-warning" data-bind="text: t('conversationServicesWarning')" data-uie-name="label-services-warning"></div>
      <!-- /ko -->
    </div>
  <!-- /ko -->
  <!-- ko ifnot: message.showLargeAvatar() -->
    <!-- ko if: message.showNamedCreation() -->
      <div class="message-group-creation-header">
        <div class="message-group-creation-header-text" data-bind="html: message.htmlGroupCreationHeader()"></div>
        <div class="message-group-creation-header-name" data-bind="text: message.name()"></div>
      </div>
    <!-- /ko -->

    <!-- ko if: message.hasUsers() -->
      <div class="message-header" data-bind="template: {afterRender: bindShowMore}">
        <div class="message-header-icon message-header-icon--svg text-foreground">
          <message-icon data-bind="visible: message.isGroupCreation()"></message-icon>
          <span class="icon-minus" data-bind="visible: message.isMemberRemoval()"></span>
          <span class="icon-plus" data-bind="visible: message.isMemberJoin()"></span>
        </div>
        <div class="message-header-label">
          <span class="message-header-caption" data-bind="html: message.htmlCaption()"></span>
          <hr class="message-header-line" />
        </div>
        <!-- ko if: message.isMemberChange() -->
          <div class="message-body-actions">
            <time class="time with-tooltip with-tooltip--top with-tooltip--time" data-bind="text: message.displayTimestampShort(), attr: {'data-timestamp': message.timestamp, 'data-tooltip': message.displayTimestampLong()}, showAllTimestamps"></time>
          </div>
        <!-- /ko -->
      </div>
      <!-- ko if: message.showServicesWarning -->
        <div class="message-services-warning" data-bind="text: t('conversationServicesWarning')" data-uie-name="label-services-warning"></div>
      <!-- /ko -->
    <!-- /ko -->

    <!-- ko if: message.isGroupCreation() -->
      <!-- ko if: shouldShowInvitePeople -->
        <div class="message-member-footer">
          <div data-bind="text: t('guestRoomConversationHead')"></div>
          <div class="message-member-footer-button" data-bind="click: onClickInvitePeople, text: t('guestRoomConversationButton')" data-uie-name="do-invite-people"></div>
        </div>
      <!-- /ko -->
      <!-- ko if: isSelfTemporaryGuest -->
        <div class="message-member-footer">
          <div class="message-member-footer-message" data-bind="text: t('temporaryGuestJoinMessage')"></div>
          <div class="message-member-footer-description" data-bind="text: t('temporaryGuestJoinDescription')"></div>
        </div>
      <!-- /ko -->
      <!-- ko if: hasReadReceiptsTurnedOn -->
        <div class="message-header" data-uie-name="label-group-creation-receipts">
          <div class="message-header-icon message-header-icon--svg text-foreground">
            <read-icon></read-icon>
          </div>
          <div class="message-header-label">
            <span class="ellipsis" data-bind="text: t('conversationCreateReceiptsEnabled')"></span>
            <hr class="message-header-line" />
          </div>
        </div>
      <!-- /ko -->
    <!-- /ko -->

    <!-- ko if: message.isMemberLeave() && message.user().isMe && isSelfTemporaryGuest -->
      <div class="message-member-footer">
        <div class="message-member-footer-description" data-bind="text: t('temporaryGuestLeaveDescription')"></div>
      </div>
    <!-- /ko -->
  <!-- /ko -->  `;

ko.components.register('message', {
  template: `
    <!-- ko if: message.super_type === 'normal' -->
      ${normalTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'missed' -->
      <missed-message></missed-message>
    <!-- /ko -->
    <!-- ko if: message.super_type === 'unable-to-decrypt' -->
      <decrypt-error-message params="message: message, onClickResetSession: onClickResetSession"></decrypt-error-message>
    <!-- /ko -->
    <!-- ko if: message.super_type === 'verification' -->
      <verification-message params="message: message"></verification-message>
    <!-- /ko -->
    <!-- ko if: message.super_type === 'delete' -->
      <delete-message params="message: message, onClickAvatar: onClickAvatar"></delete-message>
    <!-- /ko -->
    <!-- ko if: message.super_type === 'call' -->
      <call-message params="message: message"></call-message>
      <!-- /ko -->
    <!-- ko if: message.super_type === 'call-time-out' -->
      <call-timeout-message params="message: message"></call-timeout-message>
    <!-- /ko -->
    <!-- ko if: message.super_type === 'system' -->
      <system-message params="message: message"></system-message>
    <!-- /ko -->
    <!-- ko if: message.super_type === 'member' -->
      ${memberTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'ping' -->
      ${pingTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'file-type-restricted' -->
      <filetype-restricted-message params="message: message"></filetype-restricted-message>
    <!-- /ko -->
    <!-- ko if: message.isLegalHold() -->
      <legalhold-message params="message: message"></legalhold-message>
    <!-- /ko -->
    `,
  viewModel: {
    createViewModel: (params: MessageParams, componentInfo: {element: HTMLElement}) => {
      return new Message(params, componentInfo);
    },
  },
});
