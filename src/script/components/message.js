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

import {t} from 'Util/LocalizerUtil';
import {includesOnlyEmojis} from 'Util/EmojiUtil';
import {formatDateNumeral, formatTimeShort} from 'Util/TimeUtil';

import {EphemeralStatusType} from '../message/EphemeralStatusType';
import {WebAppEvents} from '../event/WebApp';
import {Context} from '../ui/ContextMenu';

import {SystemMessageType} from '../message/SystemMessageType';
import {StatusType} from '../message/StatusType';
import {ParticipantAvatar} from 'Components/participantAvatar';

import './asset/audioAsset';
import './asset/fileAsset';
import './asset/imageAsset';
import './asset/linkPreviewAsset';
import './asset/locationAsset';
import './asset/videoAsset';
import {SHOW_LEGAL_HOLD_MODAL} from '../view_model/content/LegalHoldModalViewModel';

class Message {
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
      actionsViewModel,
    },
    componentInfo,
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
    this.ParticipantAvatar = ParticipantAvatar;

    ko.computed(
      () => {
        if (isMarked()) {
          setTimeout(() => onMessageMarked(componentInfo.element));
        }
      },
      {disposeWhenNodeIsRemoved: componentInfo.element},
    );

    this.conversationRepository = conversationRepository;
    this.EphemeralStatusType = EphemeralStatusType;
    this.StatusType = StatusType;

    if (message.has_asset_text()) {
      // add a listener to any changes to the assets. This will warn the parent that the message has changed
      this.assetSubscription = message.assets.subscribe(onContentUpdated);
      // also listen for link previews on a single Text entity
      this.previewSubscription = message.get_first_asset().previews.subscribe(onContentUpdated);
    }

    this.actionsViewModel = actionsViewModel;

    this.hasReadReceiptsTurnedOn = this.conversationRepository.expectReadReceipt(this.conversation());

    this.bindShowMore = this.bindShowMore.bind(this);

    this.readReceiptTooltip = ko.pureComputed(() => {
      const receipts = this.message.readReceipts();
      if (!receipts.length || !this.conversation().is1to1()) {
        return '';
      }
      return formatDateNumeral(receipts[0].time);
    });

    this.readReceiptText = ko.pureComputed(() => {
      const receipts = this.message.readReceipts();
      if (!receipts.length) {
        return '';
      }
      const is1to1 = this.conversation().is1to1();
      return is1to1 ? formatTimeShort(receipts[0].time) : receipts.length.toString(10);
    });

    this.dispose = () => {
      if (this.assetSubscription) {
        this.assetSubscription.dispose();
        this.previewSubscription.dispose();
      }
    };
  }

  getSystemMessageIconComponent(message) {
    const iconComponents = {
      [SystemMessageType.CONVERSATION_RENAME]: 'edit-icon',
      [SystemMessageType.CONVERSATION_MESSAGE_TIMER_UPDATE]: 'timer-icon',
      [SystemMessageType.CONVERSATION_RECEIPT_MODE_UPDATE]: 'read-icon',
    };
    return iconComponents[message.system_message_type];
  }

  showDevice(messageEntity) {
    const topic = messageEntity.isSelfClient() ? WebAppEvents.PREFERENCES.MANAGE_DEVICES : WebAppEvents.SHORTCUT.PEOPLE;
    amplify.publish(topic);
  }

  showLegalHold = () => {
    amplify.publish(SHOW_LEGAL_HOLD_MODAL, this.conversationRepository.active_conversation());
  };

  showContextMenu(messageEntity, event) {
    const entries = [];

    if (messageEntity.is_downloadable()) {
      entries.push({
        click: () => messageEntity.download(),
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

    if (messageEntity.is_editable() && !this.conversation().removed_from_conversation()) {
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

    if (
      !this.conversation().is1to1() &&
      !messageEntity.is_ephemeral() &&
      !this.conversation().removed_from_conversation()
    ) {
      entries.push({
        click: () => this.onClickReceipts(this),
        label: t('conversationContextMenuDetails'),
      });
    }

    if (messageEntity.is_deletable()) {
      entries.push({
        click: () => this.actionsViewModel.deleteMessage(this.conversation(), messageEntity),
        label: t('conversationContextMenuDelete'),
      });
    }

    const isSendingMessage = messageEntity.status() === StatusType.SENDING;
    const canDelete =
      messageEntity.user().is_me && !this.conversation().removed_from_conversation() && !isSendingMessage;
    if (canDelete) {
      entries.push({
        click: () => this.actionsViewModel.deleteMessageEveryone(this.conversation(), messageEntity),
        label: t('conversationContextMenuDeleteEveryone'),
      });
    }

    Context.from(event, entries, 'message-options-menu');
  }

  bindShowMore(elements, scope) {
    const label = elements.find(element => element.className === 'message-header-label');
    if (!label) {
      return;
    }
    const link = label.querySelector('.message-header-show-more');
    if (link) {
      link.addEventListener('click', () => this.onClickParticipants(scope.message.highlightedUsers()));
    }
  }
}

const receiptStatusTemplate = `
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

const normalTemplate = `
  <!-- ko if: shouldShowAvatar -->
    <div class="message-header">
      <div class="message-header-icon">
        <participant-avatar class="sender-avatar" params="participant: message.user, click: onClickAvatar, size: ParticipantAvatar.SIZE.X_SMALL"></participant-avatar>
      </div>
      <div class="message-header-label">
        <span class="message-header-label-sender" data-bind='css: message.accent_color(), text: message.headerSenderName()' data-uie-name="sender-name"></span>
        <!-- ko if: message.user().isService -->
          <service-icon class="message-header-icon-service"></service-icon>
        <!-- /ko -->
        <!-- ko if: message.was_edited() -->
          <span class="message-header-label-icon icon-edit" data-bind="attr: {title: message.display_edited_timestamp()}"></span>
        <!-- /ko -->
      </div>
    </div>
  <!-- /ko -->
  <!-- ko if: message.quote() -->
    <message-quote params="
        conversation: conversation,
        quote: message.quote(),
        selfId: selfId,
        conversationRepository: conversationRepository,
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
      <!-- ko if: asset.is_image() -->
        <image-asset params="asset: asset, message: message, onClick: onClickImage"></image-asset>
      <!-- /ko -->
      <!-- ko if: asset.is_text() -->
        <!-- ko if: asset.should_render_text -->
          <div class="text" data-bind="html: asset.render(selfId(), accentColor()), event: {click: (data, event) => onClickMessage(asset, event)}, css: {'text-large': includesOnlyEmojis(asset.text), 'text-foreground': message.status() === StatusType.SENDING, 'ephemeral-message-obfuscated': message.isObfuscated()}" dir="auto"></div>
        <!-- /ko -->
        <!-- ko foreach: asset.previews() -->
          <link-preview-asset class="message-asset" data-bind="css: {'ephemeral-asset-expired': $parent.message.isObfuscated()}" params="message: $parent.message"></link-preview-asset>
        <!-- /ko -->
      <!-- /ko -->
      <!-- ko if: asset.is_video() -->
        <video-asset class="message-asset" data-bind="css: {'ephemeral-asset-expired icon-movie': message.isObfuscated()}" params="message: message"></video-asset>
      <!-- /ko -->
      <!-- ko if: asset.is_audio() -->
        <audio-asset class="message-asset" data-bind="css: {'ephemeral-asset-expired icon-microphone': message.isObfuscated()}" params="message: message"></audio-asset>
      <!-- /ko -->
      <!-- ko if: asset.is_file() -->
        <file-asset class="message-asset" data-bind="css: {'ephemeral-asset-expired icon-file': message.isObfuscated()}" params="message: message"></file-asset>
      <!-- /ko -->
      <!-- ko if: asset.is_location() -->
        <location-asset params="asset: asset"></location-asset>
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
      <span class="context-menu icon-more font-size-xs" data-bind="click: (data, event) => showContextMenu(message, event)"></span>
      <!-- ko if: message.ephemeral_status() === EphemeralStatusType.ACTIVE -->
        <time class="time" data-bind="text: message.display_timestamp_short(), attr: {'data-timestamp': message.timestamp, 'data-uie-uid': message.id, 'title': message.ephemeral_caption()}, showAllTimestamps"></time>
      <!-- /ko -->
      <!-- ko ifnot: message.ephemeral_status() === EphemeralStatusType.ACTIVE -->
        <time class="time" data-bind="text: message.display_timestamp_short(), attr: {'data-timestamp': message.timestamp, 'data-uie-uid': message.id}, showAllTimestamps"></time>
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

const missedTemplate = `
  <div class="message-header">
    <div class="message-header-icon">
      <span class="icon-sysmsg-error text-red"></span>
    </div>
    <div class="message-header-label" data-bind="text: t('conversationMissedMessages')"></div>
  </div>
  `;

const unableToDecryptTemplate = `
  <div class="message-header">
    <div class="message-header-icon">
      <span class="icon-sysmsg-error text-red"></span>
    </div>
    <div class="message-header-label ellipsis">
      <span data-bind="html: message.htmlCaption()"></span>
      <span>&nbsp;</span>
      <a class="accent-text" data-bind="text: t('conversationUnableToDecryptLink'), attr: {'href': message.link}" rel="nofollow noopener noreferrer" target="_blank"></a>
      <hr class="message-header-line" />
    </div>
  </div>
  <div class="message-body message-body-decrypt-error">
    <div class="message-header-decrypt-error-label" data-bind="html: message.htmlErrorMessage()"></div>
    <!-- ko if: message.is_recoverable -->
      <div class="message-header-decrypt-reset-session">
        <loading-icon class="accent-fill" data-bind="style : {visibility : message.is_resetting_session() ? 'visible' : 'hidden'}" data-uie-name="status-loading"></loading-icon>
        <span class="message-header-decrypt-reset-session-action button-label accent-text"
              data-bind="click: () => onClickResetSession(message), text: t('conversationUnableToDecryptResetSession'), style : {visibility : !message.is_resetting_session() ? 'visible' : 'hidden'}"></span>
      </div>
    <!-- /ko -->
  </div>
  `;

const systemTemplate = `
  <div class="message-header">
    <div class="message-header-icon message-header-icon--svg text-foreground">
      <span data-bind="component: getSystemMessageIconComponent(message)"></span>
    </div>
    <div class="message-header-label">
      <span class="message-header-sender-name" data-bind='text: message.unsafeSenderName()'></span>
      <span class="ellipsis" data-bind="text: message.caption()"></span>
      <hr class="message-header-line" />
    </div>
    <div class="message-body-actions">
      <time class="time" data-bind="text: message.display_timestamp_short(), attr: {'data-timestamp': message.timestamp}, showAllTimestamps"></time>
    </div>
  </div>
  <div class="message-body font-weight-bold" data-bind="text: message.name"></div>
  `;

const pingTemplate = `
  <div class="message-header">
    <div class="message-header-icon">
      <div class="icon-ping" data-bind="css: message.get_icon_classes"></div>
    </div>
    <div class="message-header-label" data-bind="attr: {title: message.ephemeral_caption()}, css: {'ephemeral-message-obfuscated': message.isObfuscated()}">
      <span class="message-header-sender-name" data-bind='text: message.unsafeSenderName()'></span>
      <span class="ellipsis" data-bind="text: message.caption"></span>
    </div>
    <div class="message-body-actions">
      <time class="time" data-bind="text: message.display_timestamp_short(), attr: {'data-timestamp': message.timestamp}, showAllTimestamps"></time>
      ${receiptStatusTemplate}
    </div>
  </div>
  `;

const deleteTemplate = `
  <div class="message-header">
    <div class="message-header-icon">
      <participant-avatar class="sender-avatar" params="participant: message.user, click: onClickAvatar, size: ParticipantAvatar.SIZE.X_SMALL"></participant-avatar>
    </div>
    <div class="message-header-label">
      <span class="message-header-label-sender" data-bind='text: message.unsafeSenderName()'></span>
      <span class="message-header-label-icon icon-trash" data-bind="attr: {title: message.display_deleted_timestamp()}"></span>
    </div>
    <div class="message-body-actions message-body-actions-large">
      <time class="time" data-bind="text: message.display_deleted_timestamp(), attr: {'data-timestamp': message.deleted_timestamp, 'data-uie-uid': message.id}, showAllTimestamps" data-uie-name="item-message-delete-timestamp"></time>
    </div>
  </div>
  `;

const legalHoldTemplate = `
  <div class="message-header">
    <div class="message-header-icon">
      <legal-hold-dot></legal-hold-dot>
    </div>
    <div class="message-header-label">
      <!-- ko if: message.isActivationMessage -->
        <span data-bind="text: t('legalHoldActivated')"></span>
        <span class="message-header-label__learn-more" data-bind="click: showLegalHold, text: t('legalHoldActivatedLearnMore')"></span>
      <!-- /ko -->
      <!-- ko ifnot: message.isActivationMessage -->
        <span class="message-header-label" data-bind="text: t('legalHoldDeactivated')"></span>
      <!-- /ko -->
    </div>
  </div>
  `;

const verificationTemplate = `
  <div class="message-header">
    <div class="message-header-icon">
      <!-- ko if: message.isTypeVerified() -->
        <verified-icon></verified-icon>
      <!-- /ko -->
      <!-- ko ifnot: message.isTypeVerified() -->
        <not-verified-icon></not-verified-icon>
      <!-- /ko -->
    </div>
    <div class="message-header-label">
      <!-- ko if: message.isTypeVerified() -->
        <span data-bind="text: t('tooltipConversationAllVerified')"></span>
      <!-- /ko -->
      <!-- ko if: message.isTypeUnverified() -->
        <span class="message-header-sender-name" data-bind="text: message.unsafeSenderName()"></span>
        <span class="ellipsis" data-bind="text: t('conversationDeviceUnverified')"></span>
        <span class="message-verification-action accent-text" data-bind="click: () => showDevice(message), text: message.captionUnverifiedDevice" data-uie-name="go-devices"></span>
      <!-- /ko -->
      <!-- ko if: message.isTypeNewDevice() -->
        <span class="message-header-plain-sender-name" data-bind='text: message.captionUser'></span>
        <span class="ellipsis" data-bind="text: message.captionStartedUsing"></span>
        <span class="message-verification-action accent-text" data-bind="click: () => showDevice(message), text: message.captionNewDevice" data-uie-name="go-devices"></span>
      <!-- /ko -->
      <!-- ko if: message.isTypeNewMember() -->
        <span class="ellipsis" data-bind="text: t('conversationDeviceNewPeopleJoined')"></span>&nbsp;<span class="message-verification-action accent-text" data-bind="click: () => showDevice(message), text: t('conversationDeviceNewPeopleJoinedVerify')" data-uie-name="go-devices"></span>
      <!-- /ko -->
      <hr class="message-header-line" />
    </div>
  </div>
  `;

const callTemplate = `
  <div class="message-header">
    <div class="message-header-icon message-header-icon--svg">
      <!-- ko if: message.was_completed() -->
        <div class="svg-green"><pickup-icon></pickup-icon></div>
      <!-- /ko -->
      <!-- ko if: !message.was_completed() -->
        <div class="svg-red"><hangup-icon></hangup-icon></div>
      <!-- /ko -->
    </div>
    <div class="message-header-label">
      <span class="message-header-sender-name" data-bind='text: message.unsafeSenderName()'></span>
      <span class="ellipsis" data-bind="text: message.caption()"></span>
    </div>
    <div class="message-body-actions">
      <time class="time" data-bind="text: message.display_timestamp_short(), attr: {'data-timestamp': message.timestamp}, showAllTimestamps"></time>
    </div>
  </div>
  `;

const memberTemplate = `
  <!-- ko if: message.showLargeAvatar() -->
    <div class="message-connected">
      <span class="message-connected-header" data-bind='text: message.otherUser().name()'></span>
      <!-- ko if: message.otherUser().isService -->
        <span class="message-connected-provider-name" data-bind='text: message.otherUser().providerName()'></span>
      <!-- /ko -->
      <!-- ko ifnot: message.otherUser().isService -->
        <span class="message-connected-username label-username" data-bind='text: message.otherUser().username()'></span>
      <!-- /ko -->
      <participant-avatar class="message-connected-avatar avatar-no-badge cursor-default"
                   data-bind="css: {'avatar-no-badge': message.otherUser().isOutgoingRequest()}"
                   params="participant: message.otherUser, size: ParticipantAvatar.SIZE.X_LARGE"></participant-avatar>
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
            <time class="time" data-bind="text: message.display_timestamp_short(), attr: {'data-timestamp': message.timestamp}, showAllTimestamps"></time>
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

    <!-- ko if: message.isMemberLeave() && message.user().is_me && isSelfTemporaryGuest -->
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
      ${missedTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'unable-to-decrypt' -->
      ${unableToDecryptTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'verification' -->
      ${verificationTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'delete' -->
      ${deleteTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'call' -->
      ${callTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'system' -->
      ${systemTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'member' -->
      ${memberTemplate}
    <!-- /ko -->
    <!-- ko if: message.super_type === 'ping' -->
      ${pingTemplate}
    <!-- /ko -->
    <!-- ko if: message.isLegalHold() -->
      ${legalHoldTemplate}
    <!-- /ko -->
    `,
  viewModel: {
    createViewModel: (params, componentInfo) => new Message(params, componentInfo),
  },
});
