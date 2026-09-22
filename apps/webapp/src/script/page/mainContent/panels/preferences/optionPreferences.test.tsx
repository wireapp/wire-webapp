/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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
 */

import {render} from '@testing-library/react';

import en from 'I18n/en-US.json';
import {User} from 'Repositories/entity/User';
import type {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {createUuid} from 'Util/uuid';

import {OptionPreferences} from './optionPreferences';

const translationRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));

type TranslationTestFunction = () => void | Promise<void>;
type IsolatedTranslationTestFunction = () => Promise<void>;

function withTranslationStrings(
  strings: typeof en,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runTranslationTest(): Promise<void> {
    setStrings({en: strings});

    try {
      await testFunction();
    } finally {
      setStrings({en});
    }
  };
}

function createPropertiesRepositoryForTest(): PropertiesRepository {
  return {
    properties: {
      settings: {
        call: {
          enable_press_space_to_unmute: false,
          enable_soundless_incoming_calls: false,
          enable_vbr_encoding: true,
        },
        emoji: {
          replace_inline: true,
        },
        interface: {
          font_size: '16px',
          markdown_preview: true,
          theme: 'default',
          view_folders: false,
        },
        notifications: 'on',
        previews: {
          send: true,
        },
        privacy: {
          marketing_consent: undefined,
          telemetry_data_sharing: undefined,
        },
        sound: {
          alerts: 'all',
        },
      },
    },
    savePreference: jest.fn(),
  } as unknown as PropertiesRepository;
}

function createSelfUserForTest(): User {
  return new User(createUuid(), '', translateForTest);
}

describe('OptionPreferences', () => {
  it(
    'renders the emoji detail icon as a React node',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <OptionPreferences
            propertiesRepository={createPropertiesRepositoryForTest()}
            selfUser={createSelfUserForTest()}
          />,
          translationRootProviderWrapper,
        ),
      );

      expect(container.querySelector('.icon-emoji')).toBeTruthy();
    }),
  );

  it(
    'follows the translated emoji icon marker position',
    withTranslationStrings(
      {
        ...en,
        preferencesOptionsEmojiReplaceDetail: '[icon] :-)',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <OptionPreferences
              propertiesRepository={createPropertiesRepositoryForTest()}
              selfUser={createSelfUserForTest()}
            />,
            translationRootProviderWrapper,
          ),
        );

        const emojiDetail = container.querySelector('.preferences-detail-intended');
        expect(emojiDetail?.firstElementChild).toHaveClass('icon-emoji');
      },
    ),
  );

  it(
    'keeps unsupported emoji translation markup as text',
    withTranslationStrings(
      {
        ...en,
        preferencesOptionsEmojiReplaceDetail: '<img src="example"> :-) → [icon]',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <OptionPreferences
              propertiesRepository={createPropertiesRepositoryForTest()}
              selfUser={createSelfUserForTest()}
            />,
            translationRootProviderWrapper,
          ),
        );

        const emojiDetail = container.querySelector('.preferences-detail-intended');
        expect(emojiDetail).toHaveTextContent('<img src="example"> :-) →');
        expect(emojiDetail?.querySelector('img')).toBeNull();
        expect(emojiDetail?.querySelector('.icon-emoji')).toBeTruthy();
      },
    ),
  );
});
