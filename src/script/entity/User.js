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

import ko from 'knockout';

import {t} from 'Util/LocalizerUtil';
import {TIME_IN_MILLIS} from 'Util/TimeUtil';
import {clamp} from 'Util/NumberUtil';
import {compareTransliteration, startsWith, getFirstChar} from 'Util/StringUtil';

import {ACCENT_ID} from '../config';
import {ROLE as TEAM_ROLE} from '../user/UserPermission';
import {AvailabilityType} from '../user/AvailabilityType';
import {WebAppEvents} from '../event/WebApp';
import {ConnectionEntity} from '../connection/ConnectionEntity';

// Please note: The own user has a "locale"
class User {
  static get ACCENT_COLOR() {
    return {
      [ACCENT_ID.BLUE]: '#2391d3',
      [ACCENT_ID.GREEN]: '#00c800',
      [ACCENT_ID.ORANGE]: '#ff8900',
      [ACCENT_ID.PINK]: '#fe5ebd',
      [ACCENT_ID.PURPLE]: '#9c00fe',
      [ACCENT_ID.RED]: '#fb0807',
      [ACCENT_ID.YELLOW]: '#febf02',
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

  constructor(id = '') {
    this.id = id;
    this.is_me = false;
    this.isService = false;
    this.isSingleSignOn = false;
    this.isDeleted = false;

    this.joaatHash = -1;

    this.accent_id = ko.observable(ACCENT_ID.BLUE);

    this.accent_color = ko.pureComputed(() => User.ACCENT_COLOR[this.accent_id()] || User.ACCENT_COLOR[ACCENT_ID.BLUE]);

    this.email = ko.observable();
    this.phone = ko.observable();

    this.name = ko.observable('');
    this.first_name = ko.pureComputed(() => {
      const [firstName] = this.name().split(' ');
      return firstName || '';
    });

    this.managedBy = ko.observable(User.CONFIG.MANAGED_BY.WIRE);

    this.last_name = ko.pureComputed(() => {
      const nameParts = this.name().split(' ');
      if (nameParts.length > 1) {
        return nameParts.pop();
      }
    });

    this.initials = ko.pureComputed(() => {
      let initials = '';
      if (this.first_name() && this.last_name()) {
        const first = getFirstChar(this.first_name());
        const last = getFirstChar(this.last_name());
        initials = `${first}${last}`;
      } else {
        initials = this.first_name().slice(0, 2);
      }
      return initials.toUpperCase();
    });

    this.username = ko.observable('');

    this.previewPictureResource = ko.observable();
    this.mediumPictureResource = ko.observable();

    this.connection = ko.observable(new ConnectionEntity());

    this.isBlocked = ko.pureComputed(() => this.connection().isBlocked());
    this.isCanceled = ko.pureComputed(() => this.connection().isCanceled());
    this.isConnected = ko.pureComputed(() => this.connection().isConnected());
    this.isIgnored = ko.pureComputed(() => this.connection().isIgnored());
    this.isIncomingRequest = ko.pureComputed(() => this.connection().isIncomingRequest());
    this.isOutgoingRequest = ko.pureComputed(() => this.connection().isOutgoingRequest());
    this.isUnknown = ko.pureComputed(() => this.connection().isUnknown());

    this.inTeam = ko.observable(false);
    this.isGuest = ko.observable(false);
    this.isTemporaryGuest = ko.observable(false);
    this.isTeamMember = ko.observable(false);
    this.teamRole = ko.observable(TEAM_ROLE.NONE);
    this.teamId = undefined;

    this.isRequest = ko.pureComputed(() => this.connection().isRequest());

    this.devices = ko.observableArray(); // does not include current client/device
    this.is_verified = ko.pureComputed(() => {
      if (this.devices().length === 0 && !this.is_me) {
        return false;
      }
      return this.devices().every(client_et => client_et.meta.isVerified());
    });
    this.isOnLegalHold = ko.pureComputed(() => {
      return this.devices().some(client_et => client_et.isLegalHold());
    });

    this.availability = ko.observable(AvailabilityType.NONE);

    this.expirationRemaining = ko.observable(0);
    this.expirationText = ko.observable('');
    this.expirationIsUrgent = ko.observable(false);
    this.expirationRemainingText = ko.observable('');
    this.expirationIntervalId = undefined;
    this.expirationTimeoutId = undefined;
    this.isExpired = ko.observable(false);
  }

  subscribeToChanges() {
    this.availability.subscribe(() => amplify.publish(WebAppEvents.USER.PERSIST, this));
  }

  add_client(new_client_et) {
    for (const client_et of this.devices()) {
      if (client_et.id === new_client_et.id) {
        return false;
      }
    }

    this.devices.push(new_client_et);

    if (this.is_me) {
      this.devices.sort((client_a, client_b) => new Date(client_b.time) - new Date(client_a.time));
    }

    return true;
  }

  hasActivatedIdentity() {
    return this.email() || this.phone() || this.isSingleSignOn;
  }

  remove_client(client_id) {
    return this.devices.remove(client_et => client_et.id === client_id);
  }

  /**
   * Check whether handle or name matches the given query
   * @param {string} query - Query
   * @param {boolean} is_handle - Query string is handle
   * @param {array} excludedChars - list of chars to exclude from getSlug
   * @returns {undefined} No return value
   */
  matches(query, is_handle, excludedChars = []) {
    if (is_handle) {
      return startsWith(this.username(), query);
    }
    return compareTransliteration(this.name(), query, excludedChars) || this.username() === query;
  }

  serialize() {
    return {
      availability: this.availability(),
      id: this.id,
    };
  }

  setGuestExpiration(timestamp) {
    if (this.expirationIntervalId) {
      window.clearInterval(this.expirationIntervalId);
      this.expirationIntervalId = undefined;
    }

    this._setRemainingExpirationTime(timestamp);

    const expirationInterval = User.CONFIG.TEMPORARY_GUEST.EXPIRATION_INTERVAL;
    this.expirationIntervalId = window.setInterval(
      () => this._setRemainingExpirationTime(timestamp),
      expirationInterval
    );

    window.setTimeout(() => {
      this.isExpired(true);
      window.clearInterval(this.expirationIntervalId);
    }, this.expirationRemaining());
  }

  clearExpirationTimeout() {
    if (this.expirationTimeoutId) {
      window.clearTimeout(this.expirationTimeoutId);
      this.expirationTimeoutId = undefined;
    }
  }

  checkGuestExpiration() {
    const checkExpiration = this.isTemporaryGuest() && !this.expirationTimeoutId;
    if (checkExpiration) {
      if (this.isExpired()) {
        return amplify.publish(WebAppEvents.USER.UPDATE, this.id);
      }

      const timeout = this.expirationRemaining() + User.CONFIG.TEMPORARY_GUEST.EXPIRATION_THRESHOLD;
      this.expirationTimeoutId = window.setTimeout(() => amplify.publish(WebAppEvents.USER.UPDATE, this.id), timeout);
    }
  }

  _setRemainingExpirationTime(expirationTime) {
    const remainingTime = clamp(expirationTime - Date.now(), 0, User.CONFIG.TEMPORARY_GUEST.LIFETIME);
    const remainingMinutes = Math.ceil(remainingTime / TIME_IN_MILLIS.MINUTE);

    if (remainingMinutes <= 45) {
      const remainingQuarters = Math.max(1, Math.ceil(remainingMinutes / 15));
      const timeValue = remainingQuarters * 15;
      this.expirationText(t('userRemainingTimeMinutes', timeValue));
      this.expirationRemaining(timeValue * TIME_IN_MILLIS.MINUTE);
      this.expirationRemainingText(`${timeValue}m`);
    } else {
      const showOneAndAHalf = remainingMinutes > 60 && remainingMinutes <= 90;
      const timeValue = showOneAndAHalf ? 1.5 : Math.ceil(remainingMinutes / 60);
      this.expirationText(t('userRemainingTimeHours', timeValue));
      this.expirationRemaining(timeValue * TIME_IN_MILLIS.HOUR);
      this.expirationRemainingText(`${timeValue}h`);
    }

    this.expirationIsUrgent(remainingMinutes < 120);
  }
}

export {User};
