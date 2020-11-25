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
import {amplify} from 'amplify';
import {AudioPreference, WebappProperties, NotificationPreference} from '@wireapp/api-client/src/user/data';
import {WebAppEvents} from '@wireapp/webapp-events';

import {PROPERTIES_TYPE} from '../../properties/PropertiesType';
import {Config} from '../../Config';
import {THEMES as ThemeViewModelThemes} from '../ThemeViewModel';
import {PropertiesRepository} from 'src/script/properties/PropertiesRepository';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';
import {TeamState} from '../../team/TeamState';

export class PreferencesOptionsViewModel {
  isActivatedAccount: ko.PureComputed<boolean>;
  isTeam: ko.PureComputed<boolean>;
  optionAudio: ko.Observable<AudioPreference>;
  optionDarkMode: ko.Observable<boolean>;
  optionReplaceInlineEmoji: ko.Observable<boolean>;
  optionNotifications: ko.Observable<NotificationPreference>;
  optionSendPreviews: ko.Observable<boolean>;
  AudioPreference: typeof AudioPreference;
  brandName: string;

  constructor(
    private readonly propertiesRepository: PropertiesRepository,
    private readonly userState = container.resolve(UserState),
    private readonly teamState = container.resolve(TeamState),
  ) {
    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.isTeam = this.teamState.isTeam;

    this.optionAudio = ko.observable();
    this.optionAudio.subscribe(audioPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.SOUND_ALERTS, audioPreference);
    });

    this.optionDarkMode = ko.observable();
    this.optionDarkMode.subscribe(useDarkMode => {
      const newTheme = useDarkMode ? ThemeViewModelThemes.DARK : ThemeViewModelThemes.DEFAULT;
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.THEME, newTheme);
    });
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.USE_DARK_MODE, this.optionDarkMode);

    this.optionReplaceInlineEmoji = ko.observable();
    this.optionReplaceInlineEmoji.subscribe(emojiPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE, emojiPreference);
    });

    this.optionNotifications = ko.observable();
    this.optionNotifications.subscribe(notificationsPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.NOTIFICATIONS, notificationsPreference);
    });

    this.optionSendPreviews = ko.observable();
    this.optionSendPreviews.subscribe(sendPreviewsPreference => {
      this.propertiesRepository.savePreference(PROPERTIES_TYPE.PREVIEWS.SEND, sendPreviewsPreference);
    });

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, this.updateProperties.bind(this));
    this.updateProperties(this.propertiesRepository.properties);

    this.AudioPreference = AudioPreference;
    this.brandName = Config.getConfig().BRAND_NAME;
  }

  updateProperties = ({settings}: WebappProperties): void => {
    this.optionAudio(settings.sound.alerts);
    this.optionReplaceInlineEmoji(settings.emoji.replace_inline);
    this.optionDarkMode(settings.interface.theme === ThemeViewModelThemes.DARK);
    this.optionSendPreviews(settings.previews.send);
    this.optionNotifications(settings.notifications);
  };
}
