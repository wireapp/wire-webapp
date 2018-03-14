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
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.PreferencesOptionsViewModel = class PreferencesOptionsViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this.logger = new z.util.Logger('z.viewModel.content.PreferencesOptionsViewModel', z.config.LOGGER.OPTIONS);

    this.propertiesRepository = repositories.properties;
    this.team_repository = repositories.team;

    this.is_team = this.team_repository.isTeam;

    this.option_audio = ko.observable();
    this.option_audio.subscribe(audio_preference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.SOUND_ALERTS, audio_preference);
    });

    this.option_emoji_replace_inline = ko.observable();
    this.option_emoji_replace_inline.subscribe(emoji_replace_inline_preference => {
      this.propertiesRepository.savePreference(
        z.properties.PROPERTIES_TYPE.EMOJI.REPLACE_INLINE,
        emoji_replace_inline_preference
      );
    });

    this.option_notifications = ko.observable();
    this.option_notifications.subscribe(notifications_preference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.NOTIFICATIONS, notifications_preference);
    });

    this.option_previews_send = ko.observable();
    this.option_previews_send.subscribe(previews_send_preference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.PREVIEWS.SEND, previews_send_preference);
    });

    this.option_privacy = ko.observable();
    this.option_privacy.subscribe(privacy_preference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, privacy_preference);
    });

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.update_properties.bind(this));
  }

  connect_google_contacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL);
  }

  connect_macos_contacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD);
  }

  saveCallLogs() {
    if (!z.telemetry.calling.CallLog.length) {
      return;
    }

    const blob = new Blob([z.telemetry.calling.CallLog.join('\r\n')], {
      type: 'text/plain;charset=utf-8',
    });
    const currentDate = new Date().toISOString().replace(' ', '-');

    z.util.download_blob(blob, `CallLogs-${currentDate}.log`);
  }

  update_properties(properties) {
    this.option_audio(properties.settings.sound.alerts);
    this.option_emoji_replace_inline(properties.settings.emoji.replace_inline);
    this.option_previews_send(properties.settings.previews.send);
    this.option_privacy(properties.settings.privacy.improve_wire);
    this.option_notifications(properties.settings.notifications);
  }
};
