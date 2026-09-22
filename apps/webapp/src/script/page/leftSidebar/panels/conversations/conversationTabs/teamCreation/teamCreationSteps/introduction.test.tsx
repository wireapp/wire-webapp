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

import en from 'I18n/en-US.json';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import {Introduction} from './introduction';

const translationRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));

type TranslationTestFunction = () => void | Promise<void>;
type IsolatedTranslationTestFunction = () => Promise<void>;
type RenderIntroductionOptions = {
  readonly rootProviderWrapper: ReturnType<typeof createRootProviderWrapperForTest>;
};

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

function renderIntroduction(options: RenderIntroductionOptions): ReturnType<typeof render> {
  const {rootProviderWrapper} = options;

  return render(
    withThemeAndRootContext(
      <Introduction
        onNextStep={jest.fn()}
        onPreviousStep={jest.fn()}
        onSuccess={jest.fn()}
        teamName=""
        setTeamName={jest.fn()}
        userName="test-user"
        goToFirstStep={jest.fn()}
      />,
      rootProviderWrapper,
    ),
  );
}

describe('Introduction', () => {
  it(
    'renders translated bold formatting as React elements',
    withTranslationStrings(en, () => {
      const {container} = renderIntroduction({rootProviderWrapper: translationRootProviderWrapper});
      const listItems = container.querySelectorAll('[data-uie-name="team-creation-intro-list-item"]');

      expect(listItems).toHaveLength(5);
      expect(listItems[0]).toHaveTextContent('Admin Console: Invite team members and manage settings.');
      expect(listItems[0].querySelectorAll('strong')).toHaveLength(1);
      expect(listItems[0].querySelector('strong')).toHaveTextContent('Admin Console:');
    }),
  );

  it(
    'keeps unsupported translation markup as text',
    withTranslationStrings(
      {
        ...en,
        teamCreationIntroListItem1: '<img src="example">[bold]Admin Console:[/bold] Invite team members.',
      },
      () => {
        const {container} = renderIntroduction({rootProviderWrapper: translationRootProviderWrapper});
        const listItems = container.querySelectorAll('[data-uie-name="team-creation-intro-list-item"]');

        expect(listItems[0]).toHaveTextContent('<img src="example">Admin Console: Invite team members.');
        expect(listItems[0].querySelectorAll('strong')).toHaveLength(1);
        expect(listItems[0].querySelector('img')).toBeNull();
      },
    ),
  );
});
