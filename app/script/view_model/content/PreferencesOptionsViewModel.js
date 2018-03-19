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
    this.teamRepository = repositories.team;

    this.isTeam = this.teamRepository.isTeam;

    this.optionAudio = ko.observable();
    this.optionAudio.subscribe(audioPreference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.SOUND_ALERTS, audioPreference);
    });

    this.optionReplaceInlineEmoji = ko.observable();
    this.optionReplaceInlineEmoji.subscribe(emojiPreference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.EMOJI.REPLACE_INLINE, emojiPreference);
    });

    this.optionNotifications = ko.observable();
    this.optionNotifications.subscribe(notificationsPreference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.NOTIFICATIONS, notificationsPreference);
    });

    this.optionSendPreviews = ko.observable();
    this.optionSendPreviews.subscribe(sendPreviewsPreference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.PREVIEWS.SEND, sendPreviewsPreference);
    });

    this.optionPrivacy = ko.observable();
    this.optionPrivacy.subscribe(privacyPreference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.PRIVACY, privacyPreference);
    });

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updateProperties.bind(this));
  }

  connectGoogleContacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL);
  }

  connectMacOSContacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD);
  }

  updateProperties(properties) {
    this.optionAudio(properties.settings.sound.alerts);
    this.optionReplaceInlineEmoji(properties.settings.emoji.replace_inline);
    this.optionSendPreviews(properties.settings.previews.send);
    this.optionPrivacy(properties.settings.privacy.improve_wire);
    this.optionNotifications(properties.settings.notifications);
  }
};
