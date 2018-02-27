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

z.entity.VerificationMessage = class VerificationMessage extends z.entity.Message {
  constructor() {
    super();
    this.super_type = z.message.SuperType.VERIFICATION;
    this.affect_order(false);
    this.verification_message_type = undefined;

    this.userEntities = ko.observableArray();
    this.userIds = ko.observableArray();

    this.is_self_device = ko.pureComputed(() => {
      return this.userIds().length === 1 && this.userIds()[0] === this.user().id;
    });

    this.caption_user = ko.pureComputed(() => {
      return z.util.LocalizerUtil.joinNames(this.userEntities(), z.string.Declension.NOMINATIVE);
    });

    this.caption_started_using = ko.pureComputed(() => {
      if (this.userIds().length > 1) {
        return z.l10n.text(z.string.conversationDeviceStartedUsingMany);
      }
      return z.l10n.text(z.string.conversationDeviceStartedUsingOne);
    });

    this.caption_new_device = ko.pureComputed(() => {
      if (this.userIds().length > 1) {
        return z.l10n.text(z.string.conversationDeviceNewDeviceMany);
      }
      return z.l10n.text(z.string.conversationDeviceNewDeviceOne);
    });

    this.caption_unverified_device = ko.pureComputed(() => {
      if (this.is_self_device()) {
        return z.l10n.text(z.string.conversationDeviceYourDevices);
      }
      return z.l10n.text(z.string.conversationDeviceUserDevices, this.userEntities()[0].first_name());
    });
  }

  click_on_device() {
    if (this.is_self_device()) {
      return amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_DEVICES);
    }
    return amplify.publish(z.event.WebApp.SHORTCUT.PEOPLE);
  }
};
