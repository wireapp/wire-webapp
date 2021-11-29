/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React, {useEffect, useState} from 'react';
import {amplify} from 'amplify';
import {container} from 'tsyringe';
import {AudioPreference, WebappProperties, NotificationPreference} from '@wireapp/api-client/src/user/data/';
import {THEMES as ThemeViewModelThemes} from '../../view_model/ThemeViewModel';
import {WebAppEvents} from '@wireapp/webapp-events';
import {PROPERTIES_TYPE} from '../../properties/PropertiesType';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import useEffectRef from 'Util/useEffectRef';

import {ClientRepository} from '../../client/ClientRepository';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {PropertiesRepository} from '../../properties/PropertiesRepository';
import {TeamState} from '../../team/TeamState';
import {useFadingScrollbar} from '../../ui/fadingScrollbar';
import {RichProfileRepository} from '../../user/RichProfileRepository';
import type {UserRepository} from '../../user/UserRepository';
import {UserState} from '../../user/UserState';
import PreferencesCheckbox from './accountPreferences/PreferencesCheckbox';

interface OptionPreferencesProps {
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  propertiesRepository: PropertiesRepository;
  richProfileRepository?: RichProfileRepository;
  teamState?: TeamState;
  userRepository: UserRepository;
  userState?: UserState;
}

const OptionPreferences: React.FC<OptionPreferencesProps> = ({
  propertiesRepository,
  userState = container.resolve(UserState),
}) => {
  const [scrollbarRef, setScrollbarRef] = useEffectRef<HTMLDivElement>();
  useFadingScrollbar(scrollbarRef);

  const {isActivatedAccount} = useKoSubscribableChildren(userState, ['self', 'isActivatedAccount']);
  const {
    properties: {settings},
  } = propertiesRepository;
  const [optionAudio, setOptionAudio] = useState<AudioPreference>(settings.sound.alerts);
  const [optionReplaceInlineEmoji, setOptionReplaceInlineEmoji] = useState<boolean>(settings.emoji.replace_inline);
  const [optionDarkMode, setOptionDarkMode] = useState<boolean>(settings.interface.theme === ThemeViewModelThemes.DARK);
  const [optionSendPreviews, setOptionSendPreviews] = useState<boolean>(settings.previews.send);
  const [optionNotifications, setOptionNotifications] = useState<NotificationPreference>(settings.notifications);

  useEffect(() => {
    const updateProperties = ({settings}: WebappProperties): void => {
      setOptionAudio(settings.sound.alerts);
      setOptionReplaceInlineEmoji(settings.emoji.replace_inline);
      setOptionDarkMode(settings.interface.theme === ThemeViewModelThemes.DARK);
      setOptionSendPreviews(settings.previews.send);
      setOptionNotifications(settings.notifications);
    };
    const updateDarkMode = (newDarkMode: boolean) => setOptionDarkMode(newDarkMode);

    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.USE_DARK_MODE, updateDarkMode);
    amplify.subscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);

    return () => {
      amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATE.INTERFACE.USE_DARK_MODE, updateDarkMode);
      amplify.unsubscribe(WebAppEvents.PROPERTIES.UPDATED, updateProperties);
    };
  }, []);

  const saveOptionAudioPreference = (audioPreference: AudioPreference) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.SOUND_ALERTS, audioPreference);
    setOptionAudio(audioPreference);
  };

  const saveOptionEmojiPreference = (emojiPreference: boolean) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE, emojiPreference);
    setOptionReplaceInlineEmoji(emojiPreference);
  };

  const saveOptionNotificationsPreference = (notificationsPreference: NotificationPreference) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.NOTIFICATIONS, notificationsPreference);
    setOptionNotifications(notificationsPreference);
  };

  const saveOptionSendPreviewsPreference = (sendPreviewsPreference: boolean) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.PREVIEWS.SEND, sendPreviewsPreference);
    setOptionSendPreviews(sendPreviewsPreference);
  };

  const saveOptionNewTheme = (useDarkMode: boolean) => {
    const newTheme = useDarkMode ? ThemeViewModelThemes.DARK : ThemeViewModelThemes.DEFAULT;
    propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.THEME, newTheme);
    setOptionDarkMode(useDarkMode);
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div className="preferences-titlebar">{t('preferencesOptions')}</div>
      <div className="preferences-content" ref={setScrollbarRef}>
        <section className="preferences-section">
          <header className="preferences-header">{t('preferencesOptionsAudio')}</header>
          <div className="preferences-option">
            <div className="preferences-options-radio">
              <input
                type="radio"
                id="preferences-options-audio-all"
                name="preferences-options-audio"
                value="all"
                onChange={() => saveOptionAudioPreference(AudioPreference.ALL)}
                checked={optionAudio === AudioPreference.ALL}
              />
              <label htmlFor="preferences-options-audio-all">
                <span className="preferences-label">{t('preferencesOptionsAudioAll')}</span>
                <span className="preferences-hint" style={optionAudio === AudioPreference.ALL ? {} : {display: 'none'}}>
                  {' '}
                  · <span>{t('preferencesOptionsAudioAllDetail')}</span>
                </span>
              </label>
              <input
                type="radio"
                id="preferences-options-audio-some"
                name="preferences-options-audio"
                value="some"
                onChange={() => saveOptionAudioPreference(AudioPreference.SOME)}
                checked={optionAudio === AudioPreference.SOME}
              />
              <label htmlFor="preferences-options-audio-some">
                <span className="preferences-label">{t('preferencesOptionsAudioSome')}</span>
                <span
                  className="preferences-hint"
                  style={optionAudio === AudioPreference.SOME ? {} : {display: 'none'}}
                >
                  {' '}
                  · <span>{t('preferencesOptionsAudioSomeDetail')}</span>
                </span>
              </label>
              <input
                type="radio"
                id="preferences-options-audio-none"
                name="preferences-options-audio"
                value="none"
                onChange={() => saveOptionAudioPreference(AudioPreference.NONE)}
                checked={optionAudio === AudioPreference.NONE}
              />
              <label htmlFor="preferences-options-audio-none">
                <span className="preferences-label">{t('preferencesOptionsAudioNone')}</span>
                <span
                  className="preferences-hint"
                  style={optionAudio === AudioPreference.NONE ? {} : {display: 'none'}}
                >
                  {' '}
                  · <span>{t('preferencesOptionsAudioNoneDetail')}</span>
                </span>
              </label>
            </div>
          </div>
        </section>

        {isActivatedAccount && (
          <>
            <section className="preferences-section">
              <header className="preferences-header">{t('preferencesOptionsNotifications')}</header>
              <div className="preferences-options-radio">
                <input
                  type="radio"
                  id="preferences-options-notification-on"
                  name="preferences-options-notification"
                  value="on"
                  onChange={() => saveOptionNotificationsPreference(NotificationPreference.ON)}
                  checked={optionNotifications === NotificationPreference.ON}
                />
                <label className="accent-text" htmlFor="preferences-options-notification-on">
                  <span className="preferences-label">{t('preferencesOptionsNotificationsOn')}</span>
                </label>
                <input
                  type="radio"
                  id="preferences-options-notification-obfuscate-message"
                  name="preferences-options-notification"
                  value="obfuscate-message"
                  onChange={() => saveOptionNotificationsPreference(NotificationPreference.OBFUSCATE_MESSAGE)}
                  checked={optionNotifications === NotificationPreference.OBFUSCATE_MESSAGE}
                />
                <label className="accent-text" htmlFor="preferences-options-notification-obfuscate-message">
                  <span className="preferences-label">{t('preferencesOptionsNotificationsObfuscateMessage')}</span>
                </label>
                <input
                  type="radio"
                  id="preferences-options-notification-obfuscate"
                  name="preferences-options-notification"
                  value="obfuscate"
                  onChange={() => saveOptionNotificationsPreference(NotificationPreference.OBFUSCATE)}
                  checked={optionNotifications === NotificationPreference.OBFUSCATE}
                />
                <label className="accent-text" htmlFor="preferences-options-notification-obfuscate">
                  <span className="preferences-label">{t('preferencesOptionsNotificationsObfuscate')}</span>
                </label>
                <input
                  type="radio"
                  id="preferences-options-notification-none"
                  name="preferences-options-notification"
                  value="none"
                  onChange={() => saveOptionNotificationsPreference(NotificationPreference.NONE)}
                  checked={optionNotifications === NotificationPreference.NONE}
                />
                <label className="accent-text" htmlFor="preferences-options-notification-none">
                  <span className="preferences-label">{t('preferencesOptionsNotificationsNone')}</span>
                </label>
              </div>
            </section>

            <section className="preferences-section">
              <header className="preferences-header">{t('preferencesOptionsPopular')}</header>
              <PreferencesCheckbox
                uieName="status-preference-use-dark-mode"
                label={t('preferencesAccountReadReceiptsCheckbox')}
                checked={optionDarkMode}
                onChange={newOptionDarkMode => saveOptionNewTheme(newOptionDarkMode)}
              />
              <PreferencesCheckbox
                uieName="status-preference-emoji-replace"
                label={t('preferencesOptionsEmojiReplaceCheckbox')}
                checked={optionReplaceInlineEmoji}
                onChange={newOptionReplaceInlineEmoji => saveOptionEmojiPreference(newOptionReplaceInlineEmoji)}
                details={
                  <div
                    dangerouslySetInnerHTML={{
                      __html: t(
                        'preferencesOptionsEmojiReplaceDetail',
                        {},
                        {icon: "<span class='font-size-xs icon-emoji'></span>"},
                      ),
                    }}
                  />
                }
              />
              <PreferencesCheckbox
                uieName="status-preference-previews-send"
                label={t('preferencesOptionsPreviewsSendCheckbox')}
                checked={optionSendPreviews}
                onChange={newOptionSendPreviews => saveOptionSendPreviewsPreference(newOptionSendPreviews)}
                details={t('preferencesOptionsPreviewsSendDetail')}
              />
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default OptionPreferences;

registerReactComponent('option-preferences', {
  component: OptionPreferences,
  template: '<div data-bind="react:{propertiesRepository}"></div>',
});
