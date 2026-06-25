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

import {TabIndex, Checkbox, CheckboxLabel, IndicatorRangeInput} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {Theme} from 'Components/appContainer/hooks/usetheme';
import {RadioGroup} from 'Components/radio';
import {RootFontSize, useRootFontSize} from 'Hooks/userootfontsize';
import {User} from 'Repositories/entity/user';
import {PropertiesRepository} from 'Repositories/properties/propertiesrepository';
import {PROPERTIES_TYPE} from 'Repositories/properties/propertiestype';
import {Config} from 'src/script/config';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {useKoSubscribableChildren} from 'Util/componentUtil';

import {PreferencesPage} from './components/preferencespage';
import {PreferencesSection} from './components/preferencessection';

interface OptionPreferencesProps {
  propertiesRepository: PropertiesRepository;
  selfUser: User;
}

type AudioPreferenceValue = PropertiesRepository['properties']['settings']['sound']['alerts'];
type NotificationPreferenceValue = PropertiesRepository['properties']['settings']['notifications'];
type WebappProperties = PropertiesRepository['properties'];

const audioPreferenceValues = {
  ALL: 'all' as AudioPreferenceValue,
  NONE: 'none' as AudioPreferenceValue,
  SOME: 'some' as AudioPreferenceValue,
} as const satisfies Record<'ALL' | 'NONE' | 'SOME', AudioPreferenceValue>;

const notificationPreferenceValues = {
  NONE: 'none' as NotificationPreferenceValue,
  OBFUSCATE: 'obfuscate' as NotificationPreferenceValue,
  OBFUSCATE_MESSAGE: 'obfuscate-message' as NotificationPreferenceValue,
  ON: 'on' as NotificationPreferenceValue,
} as const satisfies Record<'NONE' | 'OBFUSCATE' | 'OBFUSCATE_MESSAGE' | 'ON', NotificationPreferenceValue>;

const fontSizes = Object.values(RootFontSize);

const OptionPreferences = ({propertiesRepository, selfUser}: OptionPreferencesProps) => {
  const {translate} = useApplicationContext();
  const {isActivatedAccount} = useKoSubscribableChildren(selfUser, ['isActivatedAccount']);
  const {
    properties: {settings},
  } = propertiesRepository;
  const [optionAudio, setOptionAudio] = useState<AudioPreferenceValue>(settings.sound.alerts);
  const [optionReplaceInlineEmoji, setOptionReplaceInlineEmoji] = useState<boolean>(settings.emoji.replace_inline);
  const [optionDarkMode, setOptionDarkMode] = useState<boolean>(settings.interface.theme === 'dark');
  const [optionSendPreviews, setOptionSendPreviews] = useState<boolean>(settings.previews.send);
  const [optionNotifications, setOptionNotifications] = useState<NotificationPreferenceValue>(settings.notifications);
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

  const saveOptionAudioPreference = (audioPreference: AudioPreferenceValue) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.SOUND_ALERTS, audioPreference);
    setOptionAudio(audioPreference);
  };

  const saveOptionEmojiPreference = (emojiPreference: boolean) => {
    propertiesRepository.savePreference(PROPERTIES_TYPE.EMOJI.REPLACE_INLINE, emojiPreference);
    setOptionReplaceInlineEmoji(emojiPreference);
  };

  const saveOptionNotificationsPreference = (notificationsPreference: NotificationPreferenceValue) => {
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
    {value: 0, label: RootFontSize.XXS, heading: translate('preferencesOptionsFontSizeSmall')},
    {value: 1, label: RootFontSize.XS},
    {value: 2, label: RootFontSize.S},
    {value: 3, label: RootFontSize.M, heading: translate('preferencesOptionsFontSizeDefault')},
    {value: 4, label: RootFontSize.L},
    {value: 5, label: RootFontSize.XL},
    {value: 6, label: RootFontSize.XXL, heading: translate('preferencesOptionsFontSizeLarge')},
  ];

  const isMessageFormatButtonsFlagEnabled = Config.getConfig().FEATURE.ENABLE_MESSAGE_FORMAT_BUTTONS;
  const isLinkPreviewsEnabled = Config.getConfig().FEATURE.ALLOW_LINK_PREVIEWS;

  return (
    <PreferencesPage title={translate('preferencesOptions')}>
      <PreferencesSection title={translate('preferencesOptionsAudio')}>
        <RadioGroup
          ariaLabelledBy={translate('preferencesOptionsAudio')}
          name="preferences-options-audio"
          selectedValue={optionAudio}
          onChange={saveOptionAudioPreference}
          options={[
            {
              detailLabel: translate('preferencesOptionsAudioAllDetail'),
              label: translate('preferencesOptionsAudioAll'),
              value: audioPreferenceValues.ALL,
            },
            {
              detailLabel: translate('preferencesOptionsAudioSomeDetail'),
              label: translate('preferencesOptionsAudioSome'),
              value: audioPreferenceValues.SOME,
            },
            {
              detailLabel: translate('preferencesOptionsAudioNoneDetail'),
              label: translate('preferencesOptionsAudioNone'),
              value: audioPreferenceValues.NONE,
            },
          ]}
        />
      </PreferencesSection>

      {isActivatedAccount && (
        <>
          <hr className="preferences-separator" />

          <PreferencesSection title={translate('preferencesOptionsNotifications')}>
            <RadioGroup
              ariaLabelledBy={translate('preferencesOptionsNotifications')}
              name="preferences-options-notification"
              selectedValue={optionNotifications}
              onChange={saveOptionNotificationsPreference}
              options={[
                {
                  label: translate('preferencesOptionsNotificationsOn'),
                  value: notificationPreferenceValues.ON,
                },
                {
                  label: translate('preferencesOptionsNotificationsObfuscateMessage'),
                  value: notificationPreferenceValues.OBFUSCATE_MESSAGE,
                },
                {
                  label: translate('preferencesOptionsNotificationsObfuscate'),
                  value: notificationPreferenceValues.OBFUSCATE,
                },
                {
                  label: translate('preferencesOptionsNotificationsNone'),
                  value: notificationPreferenceValues.NONE,
                },
              ]}
            />
          </PreferencesSection>
        </>
      )}
      <hr className="preferences-separator" />

      <PreferencesSection title={translate('preferencesOptionsAppearance')}>
        <div css={{marginBottom: '1.5rem', width: '100%'}}>
          <IndicatorRangeInput
            value={sliderValue}
            label={translate('preferencesOptionsAppearanceTextSize')}
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
                {translate('preferencesOptionsUseDarkMode')}
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
                  {translate('preferencesOptionsEmojiReplaceCheckbox')}
                </CheckboxLabel>
              </Checkbox>

              <p
                className="preferences-detail preferences-detail-intended"
                aria-hidden="true"
                dangerouslySetInnerHTML={{
                  __html: translate('preferencesOptionsEmojiReplaceDetail', undefined, {
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
                    {translate('preferencesOptionsMarkdownPreview')}
                  </CheckboxLabel>
                </Checkbox>

                <p className="preferences-detail preferences-detail-intended">
                  {translate('preferencesOptionsMarkdownPreviewDetails')}
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
                    {translate('preferencesOptionsPreviewsSendCheckbox')}
                  </CheckboxLabel>
                </Checkbox>

                <p className="preferences-detail preferences-detail-intended">
                  {translate('preferencesOptionsPreviewsSendDetail')}
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
