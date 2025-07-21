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

import {ConnectionStatus} from '@wireapp/api-client/lib/connection/';
import {ConversationProtocol} from '@wireapp/api-client/lib/conversation';
import {QualifiedId} from '@wireapp/api-client/lib/user';
import {amplify} from 'amplify';
import ko from 'knockout';

import {Availability} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';

import type {AssetRemoteData} from 'Repositories/assets/AssetRemoteData';
import type {ClientEntity} from 'Repositories/client/ClientEntity';
import {ConnectionEntity} from 'Repositories/connection/ConnectionEntity';
import {ROLE as TEAM_ROLE} from 'Repositories/user/UserPermission';
import {t} from 'Util/LocalizerUtil';
import {clamp} from 'Util/NumberUtil';
import {getFirstChar} from 'Util/StringUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';

import {ACCENT_ID} from '../../../Config';

export class User {
  private expirationIntervalId?: number;
  private expirationTimeoutId?: number;
  public readonly expirationIsUrgent: ko.Observable<boolean>;
  public id: string;
  public isDeleted: boolean;
  public isMe: boolean;
  public isService: boolean;
  public isSingleSignOn: boolean;
  public isNoPasswordSSO: boolean;
  public providerId?: string;
  public readonly accent_color: ko.PureComputed<string>;
  public readonly accent_id: ko.Observable<number>;
  public readonly availability = ko.observable(Availability.Type.NONE);
  public readonly connection: ko.Observable<ConnectionEntity | null>;
  /** does not include current client/device */
  public readonly devices: ko.ObservableArray<ClientEntity>;
  public localClient: ClientEntity | undefined;
  public readonly email: ko.Observable<string>;
  public locale?: string;
  public readonly expirationRemaining: ko.Observable<number>;
  public readonly expirationRemainingText: ko.Observable<string>;
  public readonly expirationText: ko.Observable<string>;
  public readonly hasPendingLegalHold: ko.PureComputed<boolean>;
  public readonly initials: ko.PureComputed<string>;
  public readonly is_trusted: ko.PureComputed<boolean>;
  // Manual Proteus verification
  public readonly is_verified: ko.PureComputed<boolean>;
  // MLS certificate verification
  public readonly isBlocked: ko.PureComputed<boolean>;
  public readonly isCanceled: ko.PureComputed<boolean>;
  public readonly isConnected: ko.PureComputed<boolean>;
  public readonly isExpired: ko.Observable<boolean>;
  public readonly isExternal: ko.PureComputed<boolean>;
  public readonly isAdminOrOwner: ko.PureComputed<boolean>;
  public readonly isGuest: ko.Observable<boolean>;
  public readonly isActivatedAccount: ko.PureComputed<boolean>;
  /** indicates whether that user entity is available (if we have metadata for the user, it's considered available) */
  public readonly isAvailable: ko.PureComputed<boolean>;

  /**
   * isDirectGuest is true when the user is a guest but not a federated user (a federated user is, by definition, a guest)
   */
  public readonly isDirectGuest: ko.PureComputed<boolean>;
  public readonly isIgnored: ko.PureComputed<boolean>;
  public readonly isIncomingRequest: ko.PureComputed<boolean>;
  public readonly isOnLegalHold: ko.PureComputed<boolean>;
  public readonly isOutgoingRequest: ko.PureComputed<boolean>;
  public readonly isRequest: ko.PureComputed<boolean>;
  /** @deprecated use teamState.isInTeam method instead */
  public readonly isTeamMember: ko.Observable<boolean> = ko.observable(false);
  public readonly isTemporaryGuest: ko.Observable<boolean>;
  public readonly isUnknown: ko.PureComputed<boolean>;
  public readonly managedBy: ko.Observable<string>;
  public readonly mediumPictureResource: ko.Observable<AssetRemoteData>;
  public readonly name: ko.Observable<string>;
  public readonly previewPictureResource: ko.Observable<AssetRemoteData>;
  public readonly providerName: ko.Observable<string | undefined> = ko.observable();
  public readonly teamRole: ko.Observable<TEAM_ROLE>;
  public readonly username: ko.Observable<string>;
  public isFederated: boolean = false;
  public serviceId?: string;
  public teamId?: string;
  /** The federated domain (when the user is on a federated server) */
  public domain: string;
  public readonly isBlockedLegalHold: ko.PureComputed<boolean>;
  public readonly supportedProtocols: ko.Observable<null | ConversationProtocol[]>;

  public static get ACCENT_COLOR() {
    return {
      [ACCENT_ID.BLUE]: 'var(--blue-500)',
      [ACCENT_ID.GREEN]: 'var(--green-500)',
      [ACCENT_ID.PURPLE]: 'var(--purple-500)',
      [ACCENT_ID.AMBER]: 'var(--amber-500)',
      [ACCENT_ID.RED]: 'var(--red-500)',
      [ACCENT_ID.TURQUOISE]: 'var(--turquoise-500)',
    };
  }

  static get CONFIG() {
    return {
      MANAGED_BY: {
        SCIM: 'scim',
        WIRE: 'wire',
      },
      TEMPORARY_GUEST: {
        EXPIRATION_INTERVAL: TIME_IN_MILLIS.MINUTE,
        EXPIRATION_THRESHOLD: TIME_IN_MILLIS.SECOND * 10,
        LIFETIME: TIME_IN_MILLIS.DAY,
      },
    };
  }

  constructor(id: string = '', domain: string = '') {
    this.id = id;
    this.domain = domain;
    this.isMe = false;
    this.isService = false;
    this.isSingleSignOn = false;
    this.isNoPasswordSSO = false;
    this.isDeleted = false;
    this.providerId = undefined;
    this.serviceId = undefined;

    this.isAvailable = ko.pureComputed(() => this.id !== '' && this.name() !== '');

    this.accent_id = ko.observable(ACCENT_ID.BLUE);

    this.accent_color = ko.pureComputed(() => User.ACCENT_COLOR[this.accent_id()] || User.ACCENT_COLOR[ACCENT_ID.BLUE]);

    this.email = ko.observable();

    this.name = ko.observable('');

    this.supportedProtocols = ko.observable<null | ConversationProtocol[]>(null);

    this.managedBy = ko.observable(User.CONFIG.MANAGED_BY.WIRE);

    this.initials = ko.pureComputed(() => {
      const nameParts = this.name().toUpperCase().split(' ');
      if (nameParts.length > 1) {
        const first = getFirstChar(nameParts[0]);
        const last = getFirstChar(nameParts[nameParts.length - 1]);
        return `${first}${last}`;
      }
      return nameParts[0].slice(0, 2);
    });

    this.username = ko.observable('');

    this.previewPictureResource = ko.observable().extend({rateLimit: {method: 'notifyWhenChangesStop', timeout: 100}});
    this.mediumPictureResource = ko.observable().extend({rateLimit: {method: 'notifyWhenChangesStop', timeout: 100}});

    this.connection = ko.observable<ConnectionEntity | null>(null);

    this.isBlocked = ko.pureComputed(() => !!this.connection()?.isBlocked() || this.isBlockedLegalHold());
    this.isBlockedLegalHold = ko.pureComputed(() => !!this.connection()?.isMissingLegalHoldConsent());
    this.isCanceled = ko.pureComputed(() => !!this.connection()?.isCanceled());
    this.isConnected = ko.pureComputed(() => !!this.connection()?.isConnected());
    this.isIgnored = ko.pureComputed(() => !!this.connection()?.isIgnored());
    this.isIncomingRequest = ko.pureComputed(() => !!this.connection()?.isIncomingRequest());
    this.isOutgoingRequest = ko.pureComputed(() => !!this.connection()?.isOutgoingRequest());
    this.isUnknown = ko.pureComputed(() => {
      const connection = this.connection();
      return !connection || connection.isUnknown();
    });
    this.isExternal = ko.pureComputed(() => this.teamRole() === TEAM_ROLE.PARTNER);
    this.isAdminOrOwner = ko.pureComputed(() => [TEAM_ROLE.ADMIN, TEAM_ROLE.OWNER].includes(this.teamRole()));
    this.isRequest = ko.pureComputed(() => !!this.connection()?.isRequest());

    this.isGuest = ko.observable(false);
    this.isDirectGuest = ko.pureComputed(() => {
      return this.isGuest() && !this.isFederated;
    });
    this.isTemporaryGuest = ko.observable(false);
    this.isActivatedAccount = ko.pureComputed(() => !this.isTemporaryGuest());
    this.teamRole = ko.observable(TEAM_ROLE.NONE);
    this.teamId = undefined;

    /* Placeholder for a future feature allowing 3rd party user verification
      As it is not implemented yet, it always returns false for now */
    this.is_trusted = ko.pureComputed(() => {
      return false;
    });

    this.devices = ko.observableArray();
    // Proteus verification
    this.is_verified = ko.pureComputed(() => {
      if (this.devices().length === 0 && !this.isMe) {
        return false;
      }
      return this.devices().every(client_et => client_et.meta.isVerified?.());
    });
    this.isOnLegalHold = ko.pureComputed(() => {
      return this.devices().some(client_et => client_et.isLegalHold());
    });

    const _hasPendingLegalHold = ko.observable(false);
    this.hasPendingLegalHold = ko.pureComputed({
      owner: this,
      read: () => this.isMe && !this.isOnLegalHold() && _hasPendingLegalHold(),
      write: value => _hasPendingLegalHold(value),
    });

    this.expirationRemaining = ko.observable(0);
    this.expirationText = ko.observable('');
    this.expirationIsUrgent = ko.observable(false);
    this.expirationRemainingText = ko.observable('');
    this.expirationIntervalId = undefined;
    this.expirationTimeoutId = undefined;
    this.isExpired = ko.observable(false);
  }

  get qualifiedId(): QualifiedId {
    return {domain: this.domain, id: this.id};
  }
  get hasDomain(): boolean {
    return !!this.domain;
  }

  /**
   * Returns the fully qualified user ID.
   * @example "@handle@wire.com"
   */
  get handle(): string {
    if (!this.username()) {
      /** Very old user accounts don't have a handle on Wire. */
      return '';
    }
    return this.isFederated ? `@${this.username()}@${this.domain}` : `@${this.username()}`;
  }

  markConnectionAsUnknown() {
    this.connection()?.status(ConnectionStatus.UNKNOWN);
  }

  addClient(new_client_et: ClientEntity): boolean {
    for (const client_et of this.devices()) {
      if (client_et.id === new_client_et.id) {
        return false;
      }
    }

    this.devices.push(new_client_et);

    if (this.isMe) {
      this.devices.sort((client_a, client_b) => new Date(client_b.time).getTime() - new Date(client_a.time).getTime());
    }

    return true;
  }

  hasActivatedIdentity(): boolean {
    return !!this.email() || this.isSingleSignOn;
  }

  removeClient(client_id: string): ClientEntity[] {
    return this.devices.remove(client_et => client_et.id === client_id);
  }

  serialize() {
    return {
      availability: this.availability(),
      domain: this.domain,
      id: this.id,
    };
  }

  setGuestExpiration(timestamp: number): void {
    if (this.expirationIntervalId) {
      window.clearInterval(this.expirationIntervalId);
      this.expirationIntervalId = undefined;
    }

    this._setRemainingExpirationTime(timestamp);

    const expirationInterval = User.CONFIG.TEMPORARY_GUEST.EXPIRATION_INTERVAL;
    this.expirationIntervalId = window.setInterval(
      () => this._setRemainingExpirationTime(timestamp),
      expirationInterval,
    );

    window.setTimeout(() => {
      this.isExpired(true);
      window.clearInterval(this.expirationIntervalId);
    }, this.expirationRemaining());
  }

  clearExpirationTimeout(): void {
    if (this.expirationTimeoutId) {
      window.clearTimeout(this.expirationTimeoutId);
      this.expirationTimeoutId = undefined;
    }
  }

  checkGuestExpiration(): void {
    const checkExpiration = this.isTemporaryGuest() && !this.expirationTimeoutId;
    if (checkExpiration) {
      if (this.isExpired()) {
        amplify.publish(WebAppEvents.USER.UPDATE, this.qualifiedId);
        return;
      }

      const timeout = this.expirationRemaining() + User.CONFIG.TEMPORARY_GUEST.EXPIRATION_THRESHOLD;
      this.expirationTimeoutId = window.setTimeout(
        () => amplify.publish(WebAppEvents.USER.UPDATE, this.qualifiedId),
        timeout,
      );
    }
  }

  private _setRemainingExpirationTime(expirationTime: number): void {
    const remainingTime = clamp(expirationTime - Date.now(), 0, User.CONFIG.TEMPORARY_GUEST.LIFETIME);
    const remainingMinutes = Math.ceil(remainingTime / TIME_IN_MILLIS.MINUTE);

    if (remainingMinutes <= 45) {
      const remainingQuarters = Math.max(1, Math.ceil(remainingMinutes / 15));
      const timeValue = remainingQuarters * 15;
      this.expirationText(t('userRemainingTimeMinutes', {time: timeValue}));
      this.expirationRemaining(timeValue * TIME_IN_MILLIS.MINUTE);
      this.expirationRemainingText(`${timeValue}m`);
    } else {
      const showOneAndAHalf = remainingMinutes > 60 && remainingMinutes <= 90;
      const timeValue = showOneAndAHalf ? 1.5 : Math.ceil(remainingMinutes / 60);
      this.expirationText(t('userRemainingTimeHours', {time: timeValue}));
      this.expirationRemaining(timeValue * TIME_IN_MILLIS.HOUR);
      this.expirationRemainingText(`${timeValue}h`);
    }

    this.expirationIsUrgent(remainingMinutes < 120);
  }
}
