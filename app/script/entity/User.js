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

// Please note: The own user has a "locale"
z.entity.User = class User {
  static get ACCENT_COLOR() {
    return {
      BLUE: '#2391d3',
      GREEN: '#00c800',
      ORANGE: '#ff8900',
      PINK: '#fe5ebd',
      PURPLE: '#9c00fe',
      RED: '#fb0807',
      YELLOW: '#febf02',
    };
  }

  static get CONFIG() {
    return {
      TEMPORARY_GUEST: {
        EXPIRATION_INTERVAL: 60 * 1000,
        LIFETIME: 24 * 60 * 60 * 1000,
      },
    };
  }

  static get THEME() {
    return {
      BLUE: 'theme-blue',
      GREEN: 'theme-green',
      ORANGE: 'theme-orange',
      PINK: 'theme-pink',
      PURPLE: 'theme-purple',
      RED: 'theme-red',
      YELLOW: 'theme-yellow',
    };
  }

  constructor(id = '') {
    this.id = id;
    this.is_me = false;
    this.isBot = false;

    this.joaat_hash = -1;

    this.accent_id = ko.observable(z.config.ACCENT_ID.BLUE);
    this.accent_theme = ko.pureComputed(
      () => {
        switch (this.accent_id()) {
          case z.config.ACCENT_ID.BLUE:
            return z.entity.User.THEME.BLUE;
          case z.config.ACCENT_ID.GREEN:
            return z.entity.User.THEME.GREEN;
          case z.config.ACCENT_ID.ORANGE:
            return z.entity.User.THEME.ORANGE;
          case z.config.ACCENT_ID.PINK:
            return z.entity.User.THEME.PINK;
          case z.config.ACCENT_ID.PURPLE:
            return z.entity.User.THEME.PURPLE;
          case z.config.ACCENT_ID.RED:
            return z.entity.User.THEME.RED;
          case z.config.ACCENT_ID.YELLOW:
            return z.entity.User.THEME.YELLOW;
          default:
            return z.entity.User.THEME.BLUE;
        }
      },
      this,
      {deferEvaluation: true}
    );

    this.accent_color = ko.pureComputed(
      () => {
        switch (this.accent_id()) {
          case z.config.ACCENT_ID.BLUE:
            return z.entity.User.ACCENT_COLOR.BLUE;
          case z.config.ACCENT_ID.GREEN:
            return z.entity.User.ACCENT_COLOR.GREEN;
          case z.config.ACCENT_ID.ORANGE:
            return z.entity.User.ACCENT_COLOR.ORANGE;
          case z.config.ACCENT_ID.PINK:
            return z.entity.User.ACCENT_COLOR.PINK;
          case z.config.ACCENT_ID.PURPLE:
            return z.entity.User.ACCENT_COLOR.PURPLE;
          case z.config.ACCENT_ID.RED:
            return z.entity.User.ACCENT_COLOR.RED;
          case z.config.ACCENT_ID.YELLOW:
            return z.entity.User.ACCENT_COLOR.YELLOW;
          default:
            return z.entity.User.ACCENT_COLOR.BLUE;
        }
      },
      this,
      {deferEvaluation: true}
    );

    this.email = ko.observable();
    this.phone = ko.observable();

    this.name = ko.observable('');
    this.first_name = ko.pureComputed(() => this.name().split(' ')[0]);

    this.last_name = ko.pureComputed(() => {
      const parts = this.name().split(' ');
      if (parts.length > 1) {
        return parts.pop();
      }
    });

    this.initials = ko.pureComputed(() => {
      let initials = '';
      if (this.first_name() && this.last_name()) {
        const first = z.util.StringUtil.get_first_character(this.first_name());
        const last = z.util.StringUtil.get_first_character(this.last_name());
        initials = `${first}${last}`;
      } else {
        initials = this.first_name().slice(0, 2);
      }
      return initials.toUpperCase();
    });

    this.username = ko.observable('');

    this.previewPictureResource = ko.observable();
    this.mediumPictureResource = ko.observable();

    this.connection = ko.observable(new z.entity.Connection());

    this.is_blocked = ko.pureComputed(() => this.connection().is_blocked());
    this.is_canceled = ko.pureComputed(() => this.connection().is_canceled());
    this.is_connected = ko.pureComputed(() => this.connection().is_connected());
    this.is_ignored = ko.pureComputed(() => this.connection().is_ignored());
    this.is_incoming_request = ko.pureComputed(() => this.connection().is_incoming_request());
    this.is_outgoing_request = ko.pureComputed(() => this.connection().is_outgoing_request());
    this.is_unknown = ko.pureComputed(() => this.connection().is_unknown());

    this.is_guest = ko.observable(false);
    this.isTemporaryGuest = ko.observable(false);
    this.is_team_member = ko.observable(false);
    this.team_role = ko.observable(z.team.TeamRole.ROLE.NONE);
    this.isTeamManager = ko.pureComputed(() => {
      return [z.team.TeamRole.ROLE.ADMIN, z.team.TeamRole.ROLE.OWNER].includes(this.team_role());
    });
    this.isTeamOwner = ko.pureComputed(() => z.team.TeamRole.ROLE.OWNER === this.team_role());

    this.is_request = ko.pureComputed(() => this.connection().is_request());

    this.devices = ko.observableArray();
    this.is_verified = ko.pureComputed(() => {
      if (this.devices().length === 0 && !this.is_me) {
        return false;
      }
      return this.devices().every(client_et => client_et.meta.isVerified());
    });

    this.availability = ko.observable(z.user.AvailabilityType.NONE);

    this.expirationTimestamp = ko.observable();
    this.expirationRemaining = ko.observable();
    this.expirationIntervalId = undefined;
    this.isExpired = ko.observable(false);
  }

  subscribeToChanges() {
    this.availability.subscribe(() => amplify.publish(z.event.WebApp.USER.PERSIST, this));
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
      return z.util.StringUtil.starts_with(this.username(), query);
    }
    return z.util.StringUtil.compare_transliteration(this.name(), query, excludedChars) || this.username() === query;
  }

  serialize() {
    return {
      availability: this.availability(),
      id: this.id,
    };
  }

  setExpiration(timestamp) {
    if (this.expirationIntervalId) {
      window.clearInterval(this.expirationIntervalId);
      this.expirationIntervalId = undefined;
    }

    this.expirationTimestamp(timestamp);
    this.expirationRemaining(this.expirationTimestamp() - Date.now());

    this.expirationIntervalId = window.setInterval(() => {
      this.expirationRemaining(this.expirationTimestamp() - Date.now());
    }, User.CONFIG.TEMPORARY_GUEST.EXPIRATION_INTERVAL);

    window.setTimeout(() => {
      this.isExpired(true);
      window.clearInterval(this.expirationIntervalId);
    }, this.expirationRemaining());
  }
};
