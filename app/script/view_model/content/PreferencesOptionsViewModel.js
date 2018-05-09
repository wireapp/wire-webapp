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
  static get CONFIG() {
    return {
      MINIMUM_CALL_LOG_LENGTH: 10,
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.logger = new z.util.Logger('z.viewModel.content.PreferencesOptionsViewModel', z.config.LOGGER.OPTIONS);

    this.callingRepository = repositories.calling;
    this.propertiesRepository = repositories.properties;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.isActivatedAccount = mainViewModel.isActivatedAccount;
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

    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATED, this.updateProperties.bind(this));
  }

  connectGoogleContacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL);
  }

  connectMacOSContacts() {
    amplify.publish(z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD);
  }

  saveCallLogs() {
    const messageLog = this.callingRepository.messageLog;
    // Very short logs will not contain useful information
    const logExceedsMinimumLength = messageLog.length > PreferencesOptionsViewModel.CONFIG.MINIMUM_CALL_LOG_LENGTH;
    if (logExceedsMinimumLength) {
      const callLog = [messageLog.join('\r\n')];
      const blob = new Blob(callLog, {type: 'text/plain;charset=utf-8'});

      const userName = this.userRepository.self().username();
      const filename = `Wire-${userName}-Calling_${z.util.TimeUtil.getCurrentDate()}.log`;

      return z.util.downloadBlob(blob, filename);
    }

    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: z.l10n.text(z.string.modalCallEmptyLogMessage),
        title: z.l10n.text(z.string.modalCallEmptyLogHeadline),
      },
    });
  }

  updateProperties(properties) {
    this.optionAudio(properties.settings.sound.alerts);
    this.optionReplaceInlineEmoji(properties.settings.emoji.replace_inline);
    this.optionSendPreviews(properties.settings.previews.send);
    this.optionNotifications(properties.settings.notifications);
  }
};
