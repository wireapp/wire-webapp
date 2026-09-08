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

import en from 'I18n/en-US.json';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import {CompleteFailureToSendWarning} from './completeFailureToSend';

const legacyRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));
const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled(featureToggleName) {
      return featureToggleName === reactTranslationRenderingFeatureToggleName;
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

function getWarningTextContainer(container: HTMLElement): HTMLElement {
  const warningTextContainer = container.querySelector<HTMLElement>('p > span');

  if (isNull(warningTextContainer)) {
    throw new Error('Expected the complete send failure warning text to be rendered');
  }

  return warningTextContainer;
}

describe('CompleteFailureToSendWarning', () => {
  it(
    'preserves legacy rendering when React translation rendering is disabled',
    withTranslationStrings(en, () => {
      const {container, getByTestId, getByText} = render(
        withThemeAndRootContext(
          <CompleteFailureToSendWarning
            isMessageFocused={false}
            onRetry={jest.fn()}
            unreachableDomain="example.test"
          />,
          legacyRootProviderWrapper,
        ),
      );
      const warningTextContainer = getWarningTextContainer(container);

      expect(warningTextContainer).toHaveTextContent(
        'Message could not be sent as the back-end of example.test could not be reached.',
      );
      expect(warningTextContainer.querySelectorAll('strong')).toHaveLength(1);
      expect(getByTestId('go-offline-backend')).not.toBeNull();
      expect(getByText('Retry')).not.toBeNull();
    }),
  );

  it(
    'renders the translated warning with React formatting when enabled',
    withTranslationStrings(en, () => {
      const {container, getByTestId} = render(
        withThemeAndRootContext(
          <CompleteFailureToSendWarning
            isMessageFocused={false}
            onRetry={jest.fn()}
            unreachableDomain="example.test"
          />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const warningTextContainer = getWarningTextContainer(container);

      expect(warningTextContainer).toHaveTextContent(
        'Message could not be sent as the back-end of example.test could not be reached.',
      );
      expect(warningTextContainer.querySelectorAll('strong')).toHaveLength(1);
      expect(getByTestId('go-offline-backend')).not.toBeNull();
    }),
  );

  it(
    'renders an HTML-looking runtime domain as text',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <CompleteFailureToSendWarning isMessageFocused={false} onRetry={jest.fn()} unreachableDomain="R&D <Test>" />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const warningTextContainer = getWarningTextContainer(container);

      expect(warningTextContainer).toHaveTextContent(
        'Message could not be sent as the back-end of R&D <Test> could not be reached.',
      );
      expect(warningTextContainer.querySelector('test')).toBeNull();
      expect(warningTextContainer.querySelectorAll('strong')).toHaveLength(1);
    }),
  );

  it(
    'keeps a translation-looking runtime domain literal',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <CompleteFailureToSendWarning
            isMessageFocused={false}
            onRetry={jest.fn()}
            unreachableDomain="[bold]example[/bold]"
          />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const warningTextContainer = getWarningTextContainer(container);

      expect(warningTextContainer).toHaveTextContent(
        'Message could not be sent as the back-end of [bold]example[/bold] could not be reached.',
      );
      expect(warningTextContainer.querySelectorAll('strong')).toHaveLength(1);
    }),
  );

  it(
    'renders a runtime domain outside translation-authored formatting',
    withTranslationStrings(
      {
        ...en,
        messageCouldNotBeSentBackEndOffline: 'Backend {domain} is unavailable.',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <CompleteFailureToSendWarning
              isMessageFocused={false}
              onRetry={jest.fn()}
              unreachableDomain="example.test"
            />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const warningTextContainer = getWarningTextContainer(container);

        expect(warningTextContainer).toHaveTextContent('Backend example.test is unavailable.');
        expect(warningTextContainer.querySelectorAll('strong')).toHaveLength(0);
      },
    ),
  );

  it(
    'keeps unsupported translation markup as text',
    withTranslationStrings(
      {
        ...en,
        messageCouldNotBeSentBackEndOffline:
          '<img src="example">Message could not be sent as the back-end of [bold]{domain}[/bold] could not be reached.',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <CompleteFailureToSendWarning
              isMessageFocused={false}
              onRetry={jest.fn()}
              unreachableDomain="example.test"
            />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const warningTextContainer = getWarningTextContainer(container);

        expect(warningTextContainer).toHaveTextContent(
          '<img src="example">Message could not be sent as the back-end of example.test could not be reached.',
        );
        expect(warningTextContainer.querySelector('img')).toBeNull();
        expect(warningTextContainer.querySelectorAll('strong')).toHaveLength(1);
      },
    ),
  );

  it(
    'renders the connectivity warning without an offline backend link',
    withTranslationStrings(en, () => {
      const {container, queryByTestId} = render(
        withThemeAndRootContext(
          <CompleteFailureToSendWarning isMessageFocused={false} onRetry={jest.fn()} />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );

      expect(container).toHaveTextContent('Message could not be sent due to connectivity issues.');
      expect(queryByTestId('go-offline-backend')).toBeNull();
    }),
  );
});
