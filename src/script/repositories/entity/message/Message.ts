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

import {QualifiedId} from '@wireapp/api-client/lib/user';
import ko from 'knockout';

import type {LegalHoldStatus} from '@wireapp/protocol-messaging';

import {AssetTransferState} from 'Repositories/assets/AssetTransferState';
import {AssetType} from 'Repositories/assets/AssetType';
import type {ReadReceipt} from 'Repositories/storage/record/EventRecord';
import {t, getUserName} from 'Util/LocalizerUtil';
import {formatDateNumeral, formatDurationCaption, formatTimeShort, fromUnixTime, TIME_IN_MILLIS} from 'Util/TimeUtil';

import {CallingTimeoutMessage} from './CallingTimeoutMessage';
import type {CallMessage} from './CallMessage';
import type {CompositeMessage} from './CompositeMessage';
import type {ContentMessage} from './ContentMessage';
import type {DecryptErrorMessage} from './DecryptErrorMessage';
import type {DeleteMessage} from './DeleteMessage';
import {E2EIVerificationMessage} from './E2EIVerificationMessage';
import type {FailedToAddUsersMessage} from './FailedToAddUsersMessage';
import type {FederationStopMessage} from './FederationStopMessage';
import type {FileAsset} from './FileAsset';
import type {FileTypeRestrictedMessage} from './FileTypeRestrictedMessage';
import type {LegalHoldMessage} from './LegalHoldMessage';
import type {LinkPreview} from './LinkPreview';
import type {MemberMessage} from './MemberMessage';
import type {MissedMessage} from './MissedMessage';
import type {PingMessage} from './PingMessage';
import type {SystemMessage} from './SystemMessage';
import type {VerificationMessage} from './VerificationMessage';

import {EphemeralStatusType} from '../../../message/EphemeralStatusType';
import type {MessageCategory} from '../../../message/MessageCategory';
import {StatusType} from '../../../message/StatusType';
import {SuperType} from '../../../message/SuperType';
import {User} from '../User';

export class Message {
  private messageTimerStarted: boolean;
  protected readonly affect_order: ko.Observable<boolean>;
  public category?: MessageCategory;
  public conversation_id: string;
  public from: string;
  // TODO(Federation): Map domain to Message entity
  public fromDomain?: string;
  public fromClientId: string;
  public id: string;
  public primary_key?: string;
  public readonly accent_color: ko.PureComputed<string>;
  public readonly ephemeralCaption: ko.PureComputed<string>;
  public readonly ephemeral_expires: ko.Observable<boolean | number | string>;
  public readonly ephemeral_remaining: ko.Observable<number>;
  public readonly ephemeral_started: ko.Observable<number>;
  public readonly ephemeral_status: ko.Computed<EphemeralStatusType>;
  public expectsReadConfirmation: boolean;
  public senderName: ko.PureComputed<string>;
  public readonly isObfuscated: ko.PureComputed<boolean>;
  public legalHoldStatus?: LegalHoldStatus;
  public readonly status: ko.Observable<StatusType>;
  public readonly timestamp_affects_order: ko.PureComputed<boolean>;
  public readonly timestamp: ko.Observable<number>;
  public readonly unsafeSenderName: ko.PureComputed<string>;
  public readonly user: ko.Observable<User>;
  public readonly visible: ko.Observable<boolean>;
  public readReceipts: ko.ObservableArray<ReadReceipt>;
  public super_type: SuperType;
  public type: string;
  public version: number;

  constructor(id: string = '0', super_type?: SuperType) {
    this.id = id;
    this.super_type = super_type;
    this.ephemeralCaption = ko.pureComputed(() => {
      const remainingTime = this.ephemeral_remaining();
      return remainingTime ? `${formatDurationCaption(remainingTime)} ${t('ephemeralRemaining')}` : '';
    });
    this.ephemeral_remaining = ko.observable(0);
    this.ephemeral_expires = ko.observable(false);
    this.ephemeral_started = ko.observable(0);
    this.ephemeral_status = ko.computed(() => {
      const expires = this.ephemeral_expires();
      const isExpired = expires === true;
      if (isExpired) {
        return EphemeralStatusType.TIMED_OUT;
      }

      if (typeof expires === 'number') {
        return EphemeralStatusType.INACTIVE;
      }

      if (typeof expires === 'string') {
        const isExpiring = Date.now() >= parseInt(expires, 10);
        return isExpiring ? EphemeralStatusType.TIMED_OUT : EphemeralStatusType.ACTIVE;
      }

      return EphemeralStatusType.NONE;
    });

    this.isObfuscated = ko.pureComputed(() => {
      const messageIsAtLeastSent = this.status() > StatusType.SENDING;
      const isEphemeralInactive = this.ephemeral_status() === EphemeralStatusType.INACTIVE;
      return messageIsAtLeastSent && (isEphemeralInactive || this.isExpired());
    });

    this.readReceipts = ko.observableArray([]);

    this.conversation_id = '';
    this.expectsReadConfirmation = false;
    this.from = '';
    this.fromClientId = '';
    this.legalHoldStatus = undefined;
    this.primary_key = undefined;
    this.status = ko.observable(StatusType.UNSPECIFIED);
    this.type = '';
    this.user = ko.observable(new User('', null));
    this.version = 1;
    this.visible = ko.observable(true);

    this.affect_order = ko.observable(true);
    this.timestamp = ko.observable(Date.now());
    this.timestamp_affects_order = ko.pureComputed(() => this.visible() && this.affect_order());

    // MessageCategory
    this.category = undefined;

    this.unsafeSenderName = ko.pureComputed(() => getUserName(this.user(), undefined, true));
    this.senderName = ko.pureComputed(() => {
      return this.user().name();
    });

    this.accent_color = ko.pureComputed(() => `accent-color-${this.user().accent_id()}`);
  }

  public get qualifiedFrom(): QualifiedId {
    return {domain: this.fromDomain || '', id: this.from};
  }

  readonly displayTimestampShort = (): string => {
    const date = fromUnixTime(this.timestamp() / TIME_IN_MILLIS.SECOND);
    return formatTimeShort(date);
  };

  readonly displayTimestampLong = (): string => {
    const date = fromUnixTime(this.timestamp() / TIME_IN_MILLIS.SECOND);
    return formatDateNumeral(date);
  };

  /**
   * Check if message contains an asset of type file.
   * @returns Message contains any file type asset
   */
  hasAsset(): boolean {
    return this.isContent() ? this.assets().some(assetEntity => assetEntity.type === AssetType.FILE) : false;
  }

  /**
   * Check if message contains any image asset.
   * @returns Message contains any image
   */
  hasAssetImage(): boolean {
    return this.isContent() ? this.assets().some(assetEntity => assetEntity.isImage()) : false;
  }

  /**
   * Check if message contains a location asset.
   * @returns Message contains a location
   */
  hasAssetLocation(): boolean {
    return this.isContent() ? this.assets().some(assetEntity => assetEntity.isLocation()) : false;
  }

  /**
   * Check if message contains a text asset.
   * @returns Message contains text
   */
  hasAssetText(): boolean {
    return this.isContent()
      ? this.assets().some(assetEntity => assetEntity.isText() || assetEntity.isMultipart())
      : false;
  }

  hasMultipartAsset(): this is ContentMessage {
    return this.isContent() ? this.assets().some(assetEntity => assetEntity.type === AssetType.MULTIPART) : false;
  }

  getMultipartAssets() {
    const hasMultipartAsset = this.hasMultipartAsset();
    if (!hasMultipartAsset) {
      return [];
    }

    return this.assets().filter(assetEntity => assetEntity.isMultipart());
  }

  /**
   * Check if message is a call message.
   * @returns Is message of type call
   */
  isCall(): this is CallMessage {
    return this.super_type === SuperType.CALL;
  }

  /**
   * Check if message is a content message.
   * @returns Is message of type content
   */
  isContent(): this is ContentMessage {
    return this.super_type === SuperType.CONTENT;
  }

  isComposite(): this is CompositeMessage {
    return this.isContent() && this.hasOwnProperty('selectedButtonId');
  }

  /**
   * Check if message can be deleted.
   * @returns `true`, if message is deletable, `false` otherwise.
   */
  isDeletable(): boolean {
    return !this.hasUnavailableAsset(false) && !this.isComposite();
  }

  /**
   * Check if the message content can be downloaded.
   * @returns `true`, if the message has downloadable content, `false` otherwise.
   */
  isDownloadable(): this is ContentMessage {
    const isExpiredEphemeral = this.ephemeral_status() === EphemeralStatusType.TIMED_OUT;
    if (isExpiredEphemeral) {
      return false;
    }

    if (this.hasUnavailableAsset()) {
      return false;
    }

    if (this.isContent()) {
      const assetEntity = this.getFirstAsset();

      if (assetEntity && typeof (assetEntity as FileAsset).original_resource === 'function') {
        return true;
      }
    }

    return false;
  }

  isEdited(): boolean {
    return this.isContent() && this.was_edited();
  }

  isLinkPreview(): this is LinkPreview {
    return (
      this.hasAssetText() &&
      (this as unknown as ContentMessage)
        .assets()
        .some(assetEntity => assetEntity.isText() && assetEntity.previews().length)
    );
  }

  /**
   * Check if message is a member message.
   * @returns Is message of type member
   */
  isMember(): this is MemberMessage {
    return this.super_type === SuperType.MEMBER;
  }

  /**
   * Check if message is a ping message.
   * @returns Is message of type ping
   */
  isPing(): this is PingMessage {
    return this.super_type === SuperType.PING;
  }

  /**
   * Check if message is a system message.
   * @returns Is message of type system
   */
  isSystem(): this is SystemMessage {
    return this.super_type === SuperType.SYSTEM;
  }

  isFileTypeRestricted(): this is FileTypeRestrictedMessage {
    return this.super_type === SuperType.FILE_TYPE_RESTRICTED;
  }

  isDelete(): this is DeleteMessage {
    return this.super_type === SuperType.DELETE;
  }

  isMissed(): this is MissedMessage {
    return this.super_type === SuperType.MISSED;
  }

  isCallTimeout(): this is CallingTimeoutMessage {
    return this.super_type === SuperType.CALL_TIME_OUT;
  }

  isFailedToAddUsersMessage(): this is FailedToAddUsersMessage {
    return this.super_type === SuperType.FAILED_TO_ADD_USERS;
  }

  /**
   * Check if message is an undecryptable message.
   * @returns Is message unable to decrypt
   */
  isUnableToDecrypt(): this is DecryptErrorMessage {
    return this.super_type === SuperType.UNABLE_TO_DECRYPT;
  }

  /**
   * Check if message is a verification message.
   * @returns Is message of type verification
   */
  isVerification(): this is VerificationMessage {
    return this.super_type === SuperType.VERIFICATION;
  }

  /**
   * Check if message is a E2E Identity Verification message.
   * @returns Is message of type E2E Identity Verification
   */
  isE2EIVerification(): this is E2EIVerificationMessage {
    return this.super_type === SuperType.E2EI_VERIFICATION;
  }

  isFederationStop(): this is FederationStopMessage {
    return this.super_type === SuperType.FEDERATION_STOP;
  }

  isLegalHold(): this is LegalHoldMessage {
    return this.super_type === SuperType.LEGALHOLD;
  }

  /**
   * Check if message can be copied.
   * @returns `true`, if message can be copied, `false` otherwise.
   */

  isCopyable(): this is ContentMessage {
    return this.hasAssetText() && !this.isComposite() && (!this.isEphemeral() || this.user().isMe);
  }

  /**
   * Check if message can be edited.
   * @returns `true`, if message can be edited, `false` otherwise.
   */
  isEditable(): this is ContentMessage {
    return this.hasAssetText() && this.user().isMe && !this.isEphemeral();
  }

  /**
   * Check if message is ephemeral.
   * @returns `true`, if message is ephemeral, `false` otherwise.
   */
  isEphemeral(): boolean {
    return this.ephemeral_expires() !== false;
  }

  /**
   * Check if ephemeral message is expired.
   * @returns `true`, if message expired, `false` otherwise.
   */
  readonly isExpired = (): boolean => this.ephemeral_expires() === true;

  /**
   * Check if message has an unavailable (uploading or failed) asset.
   * @returns `true`, if an asset is unavailable, `false` otherwise.
   */
  hasUnavailableAsset(includeFailedState = true): boolean {
    if (this.hasAsset()) {
      return (this as unknown as ContentMessage).assets().some(asset => {
        const unavailableStatus = [AssetTransferState.UPLOAD_PENDING, AssetTransferState.UPLOADING];
        if (includeFailedState) {
          unavailableStatus.push(AssetTransferState.UPLOAD_FAILED);
        }
        const assetStatus = (asset as FileAsset).status();
        return unavailableStatus.includes(assetStatus);
      });
    }
    return false;
  }

  /**
   * Check if message can be reacted to.
   * @returns `true`, if message type supports reactions, `false` otherwise.
   */
  isReactable(): this is ContentMessage {
    return (
      this.isContent() &&
      !this.isComposite() &&
      !this.isEphemeral() &&
      this.status() !== StatusType.SENDING &&
      !this.hasUnavailableAsset()
    );
  }

  /**
   * Check if message can be replied to.
   * @returns `true`, if message type supports replies, `false` otherwise.
   */
  isReplyable(): boolean {
    return (
      this.isContent() &&
      !this.isComposite() &&
      !this.isEphemeral() &&
      this.status() !== StatusType.SENDING &&
      !this.hasUnavailableAsset()
    );
  }

  /** Start the ephemeral timer for the message. */
  readonly startMessageTimer = (timeOffset: number): void => {
    if (this.messageTimerStarted) {
      return;
    }

    if (this.ephemeral_status() === EphemeralStatusType.INACTIVE) {
      const startingTimestamp = this.user().isMe ? Math.min(this.timestamp() + timeOffset, Date.now()) : Date.now();
      const expirationTimestamp = `${startingTimestamp + Number(this.ephemeral_expires())}`;
      this.ephemeral_expires(expirationTimestamp);
      this.ephemeral_started(startingTimestamp);
    }

    const remainingTime = Number(this.ephemeral_expires()) - this.ephemeral_started();
    this.ephemeral_remaining(remainingTime);
    this.messageTimerStarted = true;
  };
}
