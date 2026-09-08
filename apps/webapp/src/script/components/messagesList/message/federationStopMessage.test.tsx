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
import {FederationStopMessage as FederationStopMessageEntity} from 'Repositories/entity/message/federationStopMessage';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import {FederationStopMessage} from './federationStopMessage';

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

function createFederationStopMessage(domains: string[]): FederationStopMessageEntity {
  return new FederationStopMessageEntity(domains, 0, translate);
}

function getTranslationTextContainer(container: HTMLElement): HTMLElement {
  const translationTextContainer = container.querySelector<HTMLElement>('.message-header-label > span');
  if (isNull(translationTextContainer)) {
    throw new Error('Expected the federation translation text container to be rendered');
  }
  return translationTextContainer;
}

describe('FederationStopMessage', () => {
  it(
    'preserves legacy rendering when React translation rendering is disabled',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <FederationStopMessage message={createFederationStopMessage(['example.test'])} isMessageFocused={false} />,
          legacyRootProviderWrapper,
        ),
      );
      const translationTextContainer = getTranslationTextContainer(container);

      expect(translationTextContainer).toHaveTextContent('Your backend stopped federating with example.test.');
      expect(translationTextContainer.querySelectorAll('strong')).toHaveLength(2);
    }),
  );

  it(
    'renders the one-domain translation with React formatting when enabled',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <FederationStopMessage message={createFederationStopMessage(['example.test'])} isMessageFocused={false} />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const translationTextContainer = getTranslationTextContainer(container);

      expect(translationTextContainer).toHaveTextContent('Your backend stopped federating with example.test.');
      expect(translationTextContainer.querySelectorAll('strong')).toHaveLength(2);
    }),
  );

  it(
    'renders the two-domain translation with React formatting when enabled',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <FederationStopMessage
            message={createFederationStopMessage(['example-one.test', 'example-two.test'])}
            isMessageFocused={false}
          />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const translationTextContainer = getTranslationTextContainer(container);

      expect(translationTextContainer).toHaveTextContent(
        'The backends example-one.test and example-two.test stopped federating.',
      );
      expect(translationTextContainer.querySelectorAll('strong')).toHaveLength(2);
    }),
  );

  it(
    'renders HTML-looking runtime domains as text',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <FederationStopMessage message={createFederationStopMessage(['R&D <Test>'])} isMessageFocused={false} />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const translationTextContainer = getTranslationTextContainer(container);

      expect(translationTextContainer).toHaveTextContent('Your backend stopped federating with R&D <Test>.');
      expect(translationTextContainer.querySelector('test')).toBeNull();
      expect(translationTextContainer.querySelectorAll('strong')).toHaveLength(2);
    }),
  );

  it(
    'keeps translation-looking runtime domains literal',
    withTranslationStrings(en, () => {
      const {container} = render(
        withThemeAndRootContext(
          <FederationStopMessage
            message={createFederationStopMessage(['[bold]example[/bold]'])}
            isMessageFocused={false}
          />,
          reactTranslationRenderingRootProviderWrapper,
        ),
      );
      const translationTextContainer = getTranslationTextContainer(container);

      expect(translationTextContainer).toHaveTextContent('Your backend stopped federating with [bold]example[/bold].');
      expect(translationTextContainer.querySelectorAll('strong')).toHaveLength(2);
    }),
  );

  it(
    'renders a runtime domain outside translation-authored formatting',
    withTranslationStrings(
      {
        ...en,
        federationDelete: '{backendUrl} stopped federating with [bold]Wire[/bold].',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <FederationStopMessage message={createFederationStopMessage(['example.test'])} isMessageFocused={false} />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const translationTextContainer = getTranslationTextContainer(container);

        expect(translationTextContainer).toHaveTextContent('example.test stopped federating with Wire.');
        expect(translationTextContainer.querySelectorAll('strong')).toHaveLength(1);
        expect(translationTextContainer.querySelector('strong')).toHaveTextContent('Wire');
      },
    ),
  );

  it(
    'keeps unsupported translation markup as text',
    withTranslationStrings(
      {
        ...en,
        federationDelete:
          '<img src="example">[bold]Your backend[/bold] stopped federating with [bold]{backendUrl}.[/bold]',
      },
      () => {
        const {container} = render(
          withThemeAndRootContext(
            <FederationStopMessage message={createFederationStopMessage(['example.test'])} isMessageFocused={false} />,
            reactTranslationRenderingRootProviderWrapper,
          ),
        );
        const translationTextContainer = getTranslationTextContainer(container);

        expect(translationTextContainer).toHaveTextContent(
          '<img src="example">Your backend stopped federating with example.test.',
        );
        expect(translationTextContainer.querySelector('img')).toBeNull();
        expect(translationTextContainer.querySelectorAll('strong')).toHaveLength(2);
      },
    ),
  );
});
