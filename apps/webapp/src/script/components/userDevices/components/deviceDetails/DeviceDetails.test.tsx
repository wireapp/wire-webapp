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

import type {ComponentProps} from 'react';

import {render} from '@testing-library/react';

import en from 'I18n/en-US.json';
import {ClientEntity} from 'Repositories/client/ClientEntity';
import type {ClientRepository} from 'Repositories/client';
import type {CryptographyRepository} from 'Repositories/cryptography/CryptographyRepository';
import {User} from 'Repositories/entity/User';
import type {MessageRepository} from 'Repositories/conversation/MessageRepository';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {setStrings, translate} from 'Util/localizerUtil';
import type {Logger} from 'Util/logger';
import {translateForTest} from 'Util/test/translateForTest';

import {Config} from '../../../../Config';

import {DeviceDetails} from './DeviceDetails';

const legacyTranslationRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate}),
);
const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled(featureName) {
      return featureName === reactTranslationRenderingFeatureToggleName;
    },
    translate,
  }),
);

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

function createDeviceForTest(): ClientEntity {
  return new ClientEntity(false, '', 'device-id');
}

function createUserForTest(userName: string): User {
  const user = new User('user-id', '', translateForTest);
  user.name(userName);
  return user;
}

function createDeviceDetailsPropertiesForTest(userName: string): ComponentProps<typeof DeviceDetails> {
  return {
    clickToShowSelfFingerprint: jest.fn(),
    clientRepository: {} as unknown as ClientRepository,
    conversationState: {
      activeConversation: jest.fn().mockReturnValue(undefined),
    } as unknown as ConversationState,
    cryptographyRepository: {
      getRemoteFingerprint: jest.fn().mockResolvedValue(undefined),
    } as unknown as CryptographyRepository,
    device: createDeviceForTest(),
    logger: {} as unknown as Logger,
    messageRepository: {} as unknown as MessageRepository,
    noPadding: false,
    user: createUserForTest(userName),
  };
}

function getDeviceDetailsHeadline(container: HTMLElement): HTMLElement {
  const headline = container.querySelector<HTMLElement>('.panel__info-text > span');

  if (headline === null) {
    throw new Error('Expected the device details headline to be rendered');
  }

  return headline;
}

describe('DeviceDetails', () => {
  it(
    'preserves the legacy headline rendering when React translation rendering is disabled',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <DeviceDetails {...createDeviceDetailsPropertiesForTest('Alice')} />,
          legacyTranslationRootProviderWrapper,
        ),
      );
      const headline = getDeviceDetailsHeadline(container);

      expect(headline).toHaveTextContent('Verify that this matches the fingerprint shown on Alice’s device.');
      expect(headline.querySelector('strong')).toHaveTextContent('Alice’s device');
    }),
  );

  it(
    'renders the headline with translation-controlled strong content when enabled',
    withTranslationStrings(
      {
        ...en,
        participantDevicesDetailHeadline: 'Verify [bold]the fingerprint for {user} today[/bold].',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <DeviceDetails {...createDeviceDetailsPropertiesForTest('Alice')} />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const headline = getDeviceDetailsHeadline(container);
        const strong = headline.querySelector('strong');

        expect(headline).toHaveTextContent('Verify the fingerprint for Alice today.');
        expect(strong).toHaveTextContent('the fingerprint for Alice today');
      },
    ),
  );

  it(
    'allows the translation to move the user outside the bold region',
    withTranslationStrings(
      {
        ...en,
        participantDevicesDetailHeadline: '{user}: [bold]verify this device fingerprint[/bold]',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <DeviceDetails {...createDeviceDetailsPropertiesForTest('Alice')} />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const headline = getDeviceDetailsHeadline(container);
        const strong = headline.querySelector('strong');

        expect(headline).toHaveTextContent('Alice: verify this device fingerprint');
        expect(strong).toHaveTextContent('verify this device fingerprint');
      },
    ),
  );

  it(
    'keeps an HTML-looking user name opaque in the React headline',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <DeviceDetails {...createDeviceDetailsPropertiesForTest('R&D <Test>')} />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const headline = getDeviceDetailsHeadline(container);

      expect(headline).toHaveTextContent('Verify that this matches the fingerprint shown on R&D <Test>’s device.');
      expect(headline.querySelector('test')).toBeNull();
    }),
  );

  it(
    'keeps translation-looking user names literal without nested strong elements',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <DeviceDetails {...createDeviceDetailsPropertiesForTest('[bold]Admin[/bold]')} />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const headline = getDeviceDetailsHeadline(container);

      expect(headline).toHaveTextContent(
        'Verify that this matches the fingerprint shown on [bold]Admin[/bold]’s device.',
      );
      expect(headline.querySelectorAll('strong')).toHaveLength(1);
      expect(headline.querySelector('strong')).toHaveTextContent('[bold]Admin[/bold]’s device');
      expect(headline.querySelector('strong strong')).toBeNull();
    }),
  );

  it(
    'keeps unsupported translation markup as text',
    withTranslationStrings(
      {
        ...en,
        participantDevicesDetailHeadline: '<img src="example">Verify {user}',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <DeviceDetails {...createDeviceDetailsPropertiesForTest('Alice')} />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const headline = getDeviceDetailsHeadline(container);

        expect(headline).toHaveTextContent('<img src="example">Verify Alice');
        expect(headline.querySelector('img')).toBeNull();
      },
    ),
  );

  it(
    'does not leak the audited malformed bold marker ordering',
    withTranslationStrings(
      {
        ...en,
        participantDevicesDetailHeadline: 'Verify the device [/bold] of [bold]{user}.',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <DeviceDetails {...createDeviceDetailsPropertiesForTest('Alice')} />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const headline = getDeviceDetailsHeadline(container);
        const actualText = headline.textContent;

        expect(actualText).toBe('Verify the device  of Alice.');
        expect(headline.querySelector('strong')).toHaveTextContent('Alice.');
        expect(headline).not.toHaveTextContent('__wire_react_translation_');
      },
    ),
  );

  it(
    'keeps the existing how-to link unchanged',
    withTranslationStrings(en, () => {
      const {getByText} = render(
        withThemeAndRootContext(
          <DeviceDetails {...createDeviceDetailsPropertiesForTest('Alice')} />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const howToLink = getByText('How do I do that?');
      const supportUrl = Config.getConfig().URL.SUPPORT.PRIVACY_VERIFY_FINGERPRINT;

      expect(howToLink.getAttribute('href') ?? undefined).toBe(supportUrl);
      expect(howToLink).toHaveAttribute('rel', 'nofollow noopener noreferrer');
      expect(howToLink).toHaveAttribute('target', '_blank');
      expect(howToLink).toHaveClass('participant-devices__link', 'accent-text');
    }),
  );
});
