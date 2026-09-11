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
 *
 */

import {render} from '@testing-library/react';

import {isNull} from '@sindresorhus/is';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import en from 'I18n/en-US.json';
import {ProtocolUpdateMessage as ProtocolUpdateMessageEntity} from 'Repositories/entity/message/protocolUpdateMessage';
import {Config} from 'src/script/Config';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import {ProtocolUpdateMessage} from './protocolUpdateMessage';

import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';

const legacyRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));
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

function withMlsSupportUrl(testFunction: TranslationTestFunction): IsolatedTranslationTestFunction {
  return async function runWithMlsSupportUrl(): Promise<void> {
    const originalConfig = Config.getConfig();
    const configWithTestValues = {
      ...originalConfig,
      URL: {
        ...originalConfig.URL,
        SUPPORT: {
          ...originalConfig.URL.SUPPORT,
          MLS_LEARN_MORE: 'https://support.example/mls',
        },
      },
    };
    const configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue(configWithTestValues);

    try {
      await testFunction();
    } finally {
      configSpy.mockRestore();
    }
  };
}

function createProtocolUpdateMessage(
  protocol: CONVERSATION_PROTOCOL.MIXED | CONVERSATION_PROTOCOL.MLS,
): ProtocolUpdateMessageEntity {
  return new ProtocolUpdateMessageEntity(protocol, translate);
}

function getSystemMessageRows(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.message-header'));
}

function getSystemMessageCaption(row: HTMLElement): HTMLElement {
  const caption = row.querySelector<HTMLElement>('.system-message-caption');

  if (isNull(caption)) {
    throw new Error('Expected a system message caption to be rendered');
  }

  return caption;
}

function getSystemMessageLink(row: HTMLElement): HTMLAnchorElement {
  const link = row.querySelector<HTMLAnchorElement>('.system-message-caption a');

  if (isNull(link)) {
    throw new Error('Expected a system message link to be rendered');
  }

  return link;
}

describe('ProtocolUpdateMessage', () => {
  it(
    'preserves two legacy HTML-rendered rows for a mixed protocol update',
    withMlsSupportUrl(
      withTranslationStrings(en, () => {
        const {container} = render(
          withThemeAndRootContext(
            <ProtocolUpdateMessage message={createProtocolUpdateMessage(CONVERSATION_PROTOCOL.MIXED)} />,
            legacyRootProviderWrapper,
          ),
        );
        const rows = getSystemMessageRows(container);

        expect(rows).toHaveLength(2);
        expect(getSystemMessageCaption(rows[0])).toHaveTextContent(
          'The standard messaging protocol is changing from Proteus to the new Messaging Layer Security (MLS). Learn more about MLS',
        );
        expect(getSystemMessageLink(rows[0])).toHaveAttribute('href', 'https://support.example/mls');
        expect(getSystemMessageCaption(rows[1])).toHaveTextContent(
          'Ensure you use the latest version of Wire to be ready for MLS and continue communicating seamlessly.',
        );
        expect(rows.every(row => row.querySelector('.message-header-icon') !== null)).toBe(true);
        expect(rows.every(row => row.getAttribute('data-uie-name') === 'element-message-system')).toBe(true);
      }),
    ),
  );

  it(
    'renders the MLS protocol update as one React link row when enabled',
    withMlsSupportUrl(
      withTranslationStrings(
        {
          ...en,
          conversationProtocolUpdatedToMLS: '[link]Read about MLS[/link] before continuing. <img src="example">',
        },
        () => {
          const {container} = render(
            withThemeAndRootContext(
              <ProtocolUpdateMessage message={createProtocolUpdateMessage(CONVERSATION_PROTOCOL.MLS)} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );
          const rows = getSystemMessageRows(container);
          const caption = getSystemMessageCaption(rows[0]);
          const link = getSystemMessageLink(rows[0]);

          expect(rows).toHaveLength(1);
          expect(caption).toHaveTextContent('Read about MLS before continuing. <img src="example">');
          expect(link).toHaveTextContent('Read about MLS');
          expect(link).toHaveAttribute('href', 'https://support.example/mls');
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'nofollow noopener noreferrer');
          expect(caption.querySelector('img')).toBeNull();
          expect(rows[0].getAttribute('data-uie-name')).toBe('element-message-system');
        },
      ),
    ),
  );

  it(
    'preserves mixed row order and renders only the first link as React when enabled',
    withMlsSupportUrl(
      withTranslationStrings(
        {
          ...en,
          conversationProtocolUpdatedToMixedPart1: 'First row: [link]Read about MLS[/link].',
          conversationProtocolUpdatedToMixedPart2: 'Second row: <meta name="example" content="value">',
        },
        () => {
          const {container} = render(
            withThemeAndRootContext(
              <ProtocolUpdateMessage message={createProtocolUpdateMessage(CONVERSATION_PROTOCOL.MIXED)} />,
              reactTranslationRenderingRootProviderWrapper,
            ),
          );
          const rows = getSystemMessageRows(container);

          expect(rows).toHaveLength(2);
          expect(getSystemMessageCaption(rows[0])).toHaveTextContent('First row: Read about MLS.');
          expect(getSystemMessageCaption(rows[1])).toHaveTextContent(
            'Second row: <meta name="example" content="value">',
          );
          expect(getSystemMessageLink(rows[0])).toHaveTextContent('Read about MLS');
          expect(getSystemMessageCaption(rows[1]).querySelector('a')).toBeNull();
          expect(getSystemMessageCaption(rows[1]).querySelector('meta')).toBeNull();
          expect(rows.every(row => row.querySelector('.message-header-icon') !== null)).toBe(true);
        },
      ),
    ),
  );
});
