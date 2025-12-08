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

import {AudioPreference, NotificationPreference, WebappProperties} from '@wireapp/api-client/lib/user/data/';
import {amplify} from 'amplify';

import {TabIndex, Checkbox, CheckboxLabel, IndicatorRangeInput} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Theme} from 'Components/AppContainer/hooks/useTheme';
import {RadioGroup} from 'Components/Radio';
import {RootFontSize, useRootFontSize} from 'Hooks/useRootFontSize';
import {User} from 'Repositories/entity/User';
import {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/PropertiesType';
import {Config} from 'src/script/Config';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {PreferencesPage} from './components/PreferencesPage';
import {PreferencesSection} from './components/PreferencesSection';

interface OptionPreferencesProps {
  propertiesRepository: PropertiesRepository;
  selfUser: User;
}

const fontSizes = Object.values(RootFontSize);

const OptionPreferences = ({propertiesRepository, selfUser}: OptionPreferencesProps) => {
  const {isActivatedAccount} = useKoSubscribableChildren(selfUser, ['isActivatedAccount']);
  const {
    properties: {settings},
  } = propertiesRepository;
  const [optionAudio, setOptionAudio] = useState<AudioPreference>(settings.sound.alerts);
  const [optionReplaceInlineEmoji, setOptionReplaceInlineEmoji] = useState<boolean>(settings.emoji.replace_inline);
  const [optionDarkMode, setOptionDarkMode] = useState<boolean>(settings.interface.theme === 'dark');
  const [optionSendPreviews, setOptionSendPreviews] = useState<boolean>(settings.previews.send);
  const [optionNotifications, setOptionNotifications] = useState<NotificationPreference>(settings.notifications);
  const [optionMarkdownPreview, setOptionMarkdownPreview] = useState<boolean>(settings.interface.markdown_preview);
  const [currentRootFontSize, setCurrentRootFontSize] = useRootFontSize();
  const [sliderValue, setSliderValue] = useState<number>(fontSizes.indexOf(currentRootFontSize));

  useEffect(() => {
    const updateProperties = ({settings}: WebappProperties): void => {
      setOptionAudio(settings.sound.alerts);
      setOptionReplaceInlineEmoji(settings.emoji.replace_inline);
      setOptionDarkMode(settings.interface.theme === 'dark');
      setOptionSendPreviews(settings.previews.send);
      setOptionNotifications(settings.notifications);
      setOptionMarkdownPreview(settings.interface.markdown_preview);
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

  const saveMarkdownPreviewPreference = (markdownPreviewPreference: boolean) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.MARKDOWN_PREVIEW, markdownPreviewPreference);
    setOptionMarkdownPreview(markdownPreviewPreference);
  };

  const saveOptionSendPreviewsPreference = (sendPreviewsPreference: boolean) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.PREVIEWS.SEND, sendPreviewsPreference);
    setOptionSendPreviews(sendPreviewsPreference);
  };

  const saveOptionNewTheme = (useDarkMode: boolean) => {
    const newTheme: Theme = useDarkMode ? 'dark' : 'default';
    propertiesRepository.savePreference(PROPERTIES_TYPE.INTERFACE.THEME, newTheme);
    setOptionDarkMode(useDarkMode);
  };

  const saveOptionFontSize = (event: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(event.target.value);
    const fontSize = fontSizes[index];
    setSliderValue(index);
    setCurrentRootFontSize(fontSize);
  };

  const handleOptionClick = (value: number) => {
    const fontSize = fontSizes[value];
    setSliderValue(value);
    setCurrentRootFontSize(fontSize);
  };

  const fontSliderOptions = [
    {value: 0, label: RootFontSize.XXS, heading: t('preferencesOptionsFontSizeSmall')},
    {value: 1, label: RootFontSize.XS},
    {value: 2, label: RootFontSize.S},
    {value: 3, label: RootFontSize.M, heading: t('preferencesOptionsFontSizeDefault')},
    {value: 4, label: RootFontSize.L},
    {value: 5, label: RootFontSize.XL},
    {value: 6, label: RootFontSize.XXL, heading: t('preferencesOptionsFontSizeLarge')},
  ];

  const isMessageFormatButtonsFlagEnabled = Config.getConfig().FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;
  const isLinkPreviewsEnabled = Config.getConfig().FEATURE.ALLOW_LINK_PREVIEWS;

  return (
    <PreferencesPage title={t('preferencesOptions')}>
      <PreferencesSection title={t('preferencesOptionsAudio')}>
        <RadioGroup
          ariaLabelledBy={t('preferencesOptionsAudio')}
          name="preferences-options-audio"
          selectedValue={optionAudio}
          onChange={saveOptionAudioPreference}
          options={[
            {
              detailLabel: t('preferencesOptionsAudioAllDetail'),
              label: t('preferencesOptionsAudioAll'),
              value: AudioPreference.ALL,
            },
            {
              detailLabel: t('preferencesOptionsAudioSomeDetail'),
              label: t('preferencesOptionsAudioSome'),
              value: AudioPreference.SOME,
            },
            {
              detailLabel: t('preferencesOptionsAudioNoneDetail'),
              label: t('preferencesOptionsAudioNone'),
              value: AudioPreference.NONE,
            },
          ]}
        />
      </PreferencesSection>

      {isActivatedAccount && (
        <>
          <hr className="preferences-separator" />

          <PreferencesSection title={t('preferencesOptionsNotifications')}>
            <RadioGroup
              ariaLabelledBy={t('preferencesOptionsNotifications')}
              name="preferences-options-notification"
              selectedValue={optionNotifications}
              onChange={saveOptionNotificationsPreference}
              options={[
                {
                  label: t('preferencesOptionsNotificationsOn'),
                  value: NotificationPreference.ON,
                },
                {
                  label: t('preferencesOptionsNotificationsObfuscateMessage'),
                  value: NotificationPreference.OBFUSCATE_MESSAGE,
                },
                {
                  label: t('preferencesOptionsNotificationsObfuscate'),
                  value: NotificationPreference.OBFUSCATE,
                },
                {
                  label: t('preferencesOptionsNotificationsNone'),
                  value: NotificationPreference.NONE,
                },
              ]}
            />
          </PreferencesSection>
        </>
      )}
      <hr className="preferences-separator" />

      <PreferencesSection title={t('preferencesOptionsAppearance')}>
        <div css={{marginBottom: '1.5rem', width: '100%'}}>
          <IndicatorRangeInput
            value={sliderValue}
            label={t('preferencesOptionsAppearanceTextSize')}
            onChange={saveOptionFontSize}
            onOptionClick={handleOptionClick}
            dataListOptions={fontSliderOptions}
          />
        </div>
        {isActivatedAccount && (
          <>
            <Checkbox
              tabIndex={TabIndex.FOCUSABLE}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                saveOptionNewTheme(event.target.checked);
              }}
              checked={optionDarkMode}
              data-uie-name="status-preference-use-dark-mode"
            >
              <CheckboxLabel htmlFor="status-preference-use-dark-mode">
                {t('preferencesOptionsUseDarkMode')}
              </CheckboxLabel>
            </Checkbox>

            <div className="checkbox-margin">
              <Checkbox
                tabIndex={TabIndex.FOCUSABLE}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  saveOptionEmojiPreference(event.target.checked);
                }}
                checked={optionReplaceInlineEmoji}
                data-uie-name="status-preference-emoji-replace"
              >
                <CheckboxLabel htmlFor="status-preference-emoji-replace">
                  {t('preferencesOptionsEmojiReplaceCheckbox')}
                </CheckboxLabel>
              </Checkbox>

              <p
                className="preferences-detail preferences-detail-intended"
                aria-hidden="true"
                dangerouslySetInnerHTML={{
                  __html: t('preferencesOptionsEmojiReplaceDetail', undefined, {
                    icon: "<span class='font-size-xs icon-emoji'></span>",
                  }),
                }}
              />
            </div>

            {isMessageFormatButtonsFlagEnabled && (
              <div className="checkbox-margin">
                <Checkbox
                  tabIndex={TabIndex.FOCUSABLE}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    saveMarkdownPreviewPreference(event.target.checked);
                  }}
                  checked={optionMarkdownPreview}
                  data-uie-name="status-preference-markdown-preview"
                >
                  <CheckboxLabel htmlFor="status-preference-markdown-preview">
                    {t('preferencesOptionsMarkdownPreview')}
                  </CheckboxLabel>
                </Checkbox>

                <p className="preferences-detail preferences-detail-intended">
                  {t('preferencesOptionsMarkdownPreviewDetails')}
                </p>
              </div>
            )}

            {isLinkPreviewsEnabled && (
              <div className="checkbox-margin">
                <Checkbox
                  tabIndex={TabIndex.FOCUSABLE}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                    saveOptionSendPreviewsPreference(event.target.checked);
                  }}
                  checked={optionSendPreviews}
                  data-uie-name="status-preference-previews-send"
                >
                  <CheckboxLabel htmlFor="status-preference-previews-send">
                    {t('preferencesOptionsPreviewsSendCheckbox')}
                  </CheckboxLabel>
                </Checkbox>

                <p className="preferences-detail preferences-detail-intended">
                  {t('preferencesOptionsPreviewsSendDetail')}
                </p>
              </div>
            )}
          </>
        )}
      </PreferencesSection>
    </PreferencesPage>
  );
};

export {OptionPreferences};
