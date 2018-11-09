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

'use strict';

window.z = window.z || {};
window.z.entity = z.entity || {};

z.entity.Message = class Message {
  /**
   * Sort messages by timestamp
   * @param {Array<z.entity.Message>} message_ets - Message entities
   * @returns {boolean} Sorted message entities
   */
  static sort_by_timestamp(message_ets) {
    return message_ets.sort((m1, m2) => m1.timestamp() > m2.timestamp());
  }

  constructor(id = '0', super_type = '') {
    this.equals = this.equals.bind(this);
    this.is_expired = this.is_expired.bind(this);
    this.startMessageTimer = this.startMessageTimer.bind(this);
    this.id = id;
    this.super_type = super_type;
    this.ephemeral_caption = ko.pureComputed(() => {
      const remainingTime = this.ephemeral_remaining();
      return remainingTime ? z.util.TimeUtil.formatDurationCaption(remainingTime) : '';
    });
    this.ephemeral_duration = ko.observable(0);
    this.ephemeral_remaining = ko.observable(0);
    this.ephemeral_expires = ko.observable(false);
    this.ephemeral_started = ko.observable('0');
    this.ephemeral_status = ko.computed(() => {
      const isExpired = this.ephemeral_expires() === true;
      if (isExpired) {
        return z.message.EphemeralStatusType.TIMED_OUT;
      }

      if (_.isNumber(this.ephemeral_expires())) {
        return z.message.EphemeralStatusType.INACTIVE;
      }

      if (_.isString(this.ephemeral_expires())) {
        const isExpiring = Date.now() >= this.ephemeral_expires();
        return isExpiring ? z.message.EphemeralStatusType.TIMED_OUT : z.message.EphemeralStatusType.ACTIVE;
      }

      return z.message.EphemeralStatusType.NONE;
    });

    this.isObfuscated = ko.pureComputed(() => {
      const messageIsAtLeastSent = this.status() > z.message.StatusType.SENDING;
      const isEphemeralInactive = this.ephemeral_status() === z.message.EphemeralStatusType.INACTIVE;
      return messageIsAtLeastSent && (isEphemeralInactive || this.is_expired());
    });

    this.conversation_id = '';
    this.from = '';
    this.primary_key = undefined;
    this.status = ko.observable(z.message.StatusType.UNSPECIFIED);
    this.type = '';
    this.user = ko.observable(new z.entity.User());
    this.visible = ko.observable(true);
    this.version = 1;

    this.affect_order = ko.observable(true);
    this.timestamp = ko.observable(Date.now());
    this.timestamp_affects_order = ko.pureComputed(() => this.visible() && this.affect_order());

    // z.message.MessageCategory
    this.category = undefined;

    this.display_timestamp_short = () => {
      const date = moment.unix(this.timestamp() / z.util.TimeUtil.UNITS_IN_MILLIS.SECOND);
      return date.local().format('HH:mm');
    };

    this.unsafeSenderName = ko.pureComputed(() => z.util.SanitizationUtil.getFirstName(this.user(), undefined, true));
    this.headerSenderName = ko.pureComputed(() => {
      return this.user().isService ? this.user().name() : this.user().first_name();
    });

    this.accent_color = ko.pureComputed(() => `accent-color-${this.user().accent_id()}`);
  }

  equals(messageEntity) {
    return messageEntity && this.id ? this.id === messageEntity.id : false;
  }

  /**
   * Check if message contains an asset of type file.
   * @returns {boolean} Message contains any file type asset
   */
  has_asset() {
    return this.is_content() ? this.assets().some(assetEntity => assetEntity.type === z.assets.AssetType.FILE) : false;
  }

  /**
   * Check if message contains a file asset.
   * @returns {boolean} Message contains a file
   */
  has_asset_file() {
    return this.is_content() ? this.assets().some(assetEntity => assetEntity.is_file()) : false;
  }

  /**
   * Check if message contains any image asset.
   * @returns {boolean} Message contains any image
   */
  has_asset_image() {
    return this.is_content() ? this.assets().some(assetEntity => assetEntity.is_image()) : false;
  }

  /**
   * Check if message contains a location asset.
   * @returns {boolean} Message contains a location
   */
  has_asset_location() {
    return this.is_content() ? this.assets().some(assetEntity => assetEntity.is_location()) : false;
  }

  /**
   * Check if message contains a text asset.
   * @returns {boolean} Message contains text
   */
  has_asset_text() {
    return this.is_content() ? this.assets().some(assetEntity => assetEntity.is_text()) : false;
  }

  /**
   * Check if message is a call message.
   * @returns {boolean} Is message of type call
   */
  is_call() {
    return this.super_type === z.message.SuperType.CALL;
  }

  /**
   * Check if message is a content message.
   * @returns {boolean} Is message of type content
   */
  is_content() {
    return this.super_type === z.message.SuperType.CONTENT;
  }

  /**
   * Check if message can be deleted.
   * @returns {boolean} True, if message is deletable.
   */
  is_deletable() {
    if (this.is_ping() || !this.has_asset()) {
      return true;
    }
    return ![z.assets.AssetTransferState.DOWNLOADING, z.assets.AssetTransferState.UPLOADING].includes(
      this.get_first_asset().status()
    );
  }

  /**
   * Check if the message content can be downloaded.
   * @returns {boolean} True, if the message has downloadable content.
   */
  is_downloadable() {
    const isExpiredEphemeral = this.ephemeral_status() === z.message.EphemeralStatusType.TIMED_OUT;
    if (isExpiredEphemeral) {
      return false;
    }

    if (this.is_content()) {
      const assetEntity = this.get_first_asset();
      if (assetEntity && typeof assetEntity.download === 'function') {
        return true;
      }
    }
    return false;
  }

  isEdited() {
    return this.is_content() && this.was_edited();
  }

  isLinkPreview() {
    return (
      this.has_asset_text() && this.assets().some(assetEntity => assetEntity.is_text() && assetEntity.previews().length)
    );
  }

  /**
   * Check if message is a member message.
   * @returns {boolean} Is message of type member
   */
  is_member() {
    return this.super_type === z.message.SuperType.MEMBER;
  }

  /**
   * Check if message is a ping message.
   * @returns {boolean} Is message of type ping
   */
  is_ping() {
    return this.super_type === z.message.SuperType.PING;
  }

  /**
   * Check if message is a system message.
   * @returns {boolean} Is message of type system
   */
  is_system() {
    return this.super_type === z.message.SuperType.SYSTEM;
  }

  /**
   * Check if message is a e2ee message.
   * @returns {boolean} Is message of type system
   */
  is_unable_to_decrypt() {
    return this.super_type === z.message.SuperType.UNABLE_TO_DECRYPT;
  }

  /**
   * Check if message is a e2ee message.
   * @returns {boolean} Is message of type system
   */
  is_verification() {
    return this.super_type === z.message.SuperType.VERIFICATION;
  }

  /**
   * Check if message can be copied.
   * @returns {boolean} True, if message can be copied.
   */

  isCopyable() {
    return this.has_asset_text();
  }

  /**
   * Check if message can be edited.
   * @returns {boolean} True, if message can be edited.
   */
  is_editable() {
    return this.has_asset_text() && this.user().is_me && !this.is_ephemeral();
  }

  /**
   * Check if message is ephemeral.
   * @returns {boolean} True, if message is ephemeral.
   */
  is_ephemeral() {
    return this.ephemeral_expires() !== false;
  }

  /**
   * Check if ephemeral message is expired.
   * @returns {boolean} True, if message expired.
   */
  is_expired() {
    return this.ephemeral_expires() === true;
  }

  /**
   * Check if message can be reacted to.
   * @returns {boolean} True, if message type supports reactions.
   */
  is_reactable() {
    return this.is_content() && !this.is_ephemeral() && this.status() !== z.message.StatusType.SENDING;
  }

  /**
   * Check if message can be replied to.
   * @returns {boolean} True, if message type supports replies.
   */
  isReplyable() {
    return this.is_content() && !this.is_ephemeral() && this.status() !== z.message.StatusType.SENDING;
  }

  // Start the ephemeral timer for the message.
  startMessageTimer(timeOffset) {
    if (this.messageTimerStarted) {
      return;
    }

    if (this.ephemeral_status() === z.message.EphemeralStatusType.INACTIVE) {
      const startingTimestamp = this.user().is_me ? Math.min(this.timestamp() + timeOffset, Date.now()) : Date.now();
      const expirationTimestamp = `${startingTimestamp + this.ephemeral_expires()}`;
      this.ephemeral_expires(expirationTimestamp);
      this.ephemeral_started(`${startingTimestamp}`);
    }

    const remainingTime = this.ephemeral_expires() - this.ephemeral_started();
    this.ephemeral_remaining(remainingTime);
    this.messageTimerStarted = true;
  }

  /**
   * Update the status of a message.
   * @param {z.message.StatusType} updated_status - New status of message
   * @returns {z.message.StatusType|boolean} Returns the new status on a successful update, otherwise "false"
   */
  update_status(updated_status) {
    if (this.status() >= z.message.StatusType.SENT) {
      if (updated_status > this.status()) {
        return this.status(updated_status);
      }
    } else if (this.status() !== updated_status) {
      return this.status(updated_status);
    }
    return false;
  }
};
