/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
    this.affect_conversation_order = false;
    this.verification_message_type = undefined;

    this.user_ets = ko.observableArray();
    this.user_ids = ko.observableArray();

    this.is_self_device = ko.pureComputed(() => {
      return (this.user_ids().length === 1) && (this.user_ids()[0] === this.user().id);
    });

    this.caption_user = ko.pureComputed(() => {
      return z.util.LocalizerUtil.join_names(this.user_ets(), z.string.Declension.NOMINATIVE);
    });

    this.caption_started_using = ko.pureComputed(() => {
      if (this.user_ids().length > 1) {
        return z.l10n.text(z.string.conversation_device_started_using_many);
      }
      return z.l10n.text(z.string.conversation_device_started_using_one);
    });

    this.caption_new_device = ko.pureComputed(() => {
      if (this.user_ids().length > 1) {
        return z.l10n.text(z.string.conversation_device_new_device_many);
      }
      return z.l10n.text(z.string.conversation_device_new_device_one);
    });

    this.caption_unverified_device = ko.pureComputed(() => {
      if (this.is_self_device()) {
        return z.l10n.text(z.string.conversation_device_your_devices);
      }
      return z.l10n.text(z.string.conversation_device_user_devices, this.user_ets()[0].first_name());
    });
  }

  click_on_device() {
    if (this.is_self_device()) {
      return amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_DEVICES);
    }
    return amplify.publish(z.event.WebApp.SHORTCUT.PEOPLE);
  }
};
