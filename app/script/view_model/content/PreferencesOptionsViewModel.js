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
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.content = z.ViewModel.content || {};

z.ViewModel.content.PreferencesOptionsViewModel = class PreferencesOptionsViewModel {
  constructor(element_id, properties_repository) {
    this.properties_repository = properties_repository;
    this.logger = new z.util.Logger('z.ViewModel.content.PreferencesOptionsViewModel', z.config.LOGGER.OPTIONS);

    this.option_privacy = ko.observable();
    this.option_privacy.subscribe((privacy_preference) => {
      this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.PRIVACY, privacy_preference);
    });

    this.option_audio = ko.observable();
    this.option_audio.subscribe((audio_preference) => {
      const tracking_value = (() => {
        switch (audio_preference) {
          case z.audio.AudioPreference.ALL:
            return 'alwaysPlay';
          case z.audio.AudioPreference.SOME:
            return 'firstMessageOnly';
          case z.audio.AudioPreference.NONE:
            return 'neverPlay';
          default:
            return;
        }
      })();

      this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.SOUND_ALERTS, audio_preference);
      amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SOUND_SETTINGS_CHANGED, {value: tracking_value});
    });

    this.option_notifications = ko.observable();
    this.option_notifications.subscribe((notifications_preference) => {
      this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.NOTIFICATIONS, notifications_preference);
    });

    this.option_replace_inline_emoji = ko.observable();
    this.option_replace_inline_emoji.subscribe((replace_inline_emoji_preference) => {
      this.properties_repository.save_preference(z.properties.PROPERTIES_TYPE.EMOJI.REPLACE_INLINE, replace_inline_emoji_preference);
    });

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.update_properties.bind(this));
  }

  connect_google_contacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL);
  }

  connect_macos_contacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD);
  }

  update_properties(properties) {
    this.option_audio(properties.settings.sound.alerts);
    this.option_replace_inline_emoji(properties.settings.emoji.replace_inline);
    this.option_privacy(properties.settings.privacy.report_errors);
    this.option_notifications(properties.settings.notifications);
  }
};
