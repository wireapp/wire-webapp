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

import Logger from 'utils/Logger';

import {CallLogger} from '../../telemetry/calling/CallLogger';

import {t} from 'utils/LocalizerUtil';
import TimeUtil from 'utils/TimeUtil';

window.z = window.z || {};
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

import {THEMES as ThemeViewModelThemes} from '../ThemeViewModel';

z.viewModel.content.PreferencesOptionsViewModel = class PreferencesOptionsViewModel {
  static get CONFIG() {
    return {
      MINIMUM_CALL_LOG_LENGTH: 10,
    };
  }

  constructor(repositories) {
    this.logger = Logger('z.viewModel.content.PreferencesOptionsViewModel');

    this.callingRepository = repositories.calling;
    this.propertiesRepository = repositories.properties;
    this.teamRepository = repositories.team;
    this.userRepository = repositories.user;

    this.isActivatedAccount = this.userRepository.isActivatedAccount;
    this.isTeam = this.teamRepository.isTeam;
    this.supportsCalling = this.callingRepository.supportsCalling;

    this.optionAudio = ko.observable();
    this.optionAudio.subscribe(audioPreference => {
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.SOUND_ALERTS, audioPreference);
    });

    this.optionDarkMode = ko.observable();
    this.optionDarkMode.subscribe(useDarkMode => {
      const newTheme = useDarkMode ? ThemeViewModelThemes.DARK : ThemeViewModelThemes.DEFAULT;
      this.propertiesRepository.savePreference(z.properties.PROPERTIES_TYPE.INTERFACE.THEME, newTheme);
    });
    amplify.subscribe(z.event.WebApp.PROPERTIES.UPDATE.INTERFACE.USE_DARK_MODE, this.optionDarkMode);

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
    this.updateProperties(this.propertiesRepository.properties);
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

      const selfUserId = this.userRepository.self().id;
      const truncatedId = selfUserId.substr(0, CallLogger.CONFIG.OBFUSCATION_TRUNCATE_TO);
      const filename = `Wire-${truncatedId}-Calling_${TimeUtil.getCurrentDate()}.log`;

      return z.util.downloadBlob(blob, filename);
    }

    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.ModalsViewModel.TYPE.ACKNOWLEDGE, {
      text: {
        message: t('modalCallEmptyLogMessage'),
        title: t('modalCallEmptyLogHeadline'),
      },
    });
  }

  updateProperties = ({settings}) => {
    this.optionAudio(settings.sound.alerts);
    this.optionReplaceInlineEmoji(settings.emoji.replace_inline);
    this.optionDarkMode(settings.interface.theme === ThemeViewModelThemes.DARK);
    this.optionSendPreviews(settings.previews.send);
    this.optionNotifications(settings.notifications);
  };
};
