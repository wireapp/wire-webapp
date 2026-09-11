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
import {isNull, isUndefined} from '@sindresorhus/is';

import en from 'I18n/en-US.json';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {setStrings, translate} from 'Util/localizerUtil';

import {ConversationFeature} from './ConversationFeature';

import {ConversationType} from '../types';

const legacyTranslationRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate}),
);
const reactTranslationRenderingRootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    isFeatureToggleEnabled(featureName): boolean {
      return featureName === reactTranslationRenderingFeatureToggleName;
    },
    translate,
  }),
);

type TranslationTestFunction = () => void | Promise<void>;
type IsolatedTranslationTestFunction = () => Promise<void>;
type RootProviderWrapper = ReturnType<typeof createRootProviderWrapperForTest>;
type ExpectFeatureIconCountsOptions = {
  readonly checkIconCount: number;
  readonly container: HTMLElement;
  readonly shieldIconCount: number;
};

function withTranslationStrings(
  translationOverrides: Partial<typeof en>,
  testFunction: TranslationTestFunction,
): IsolatedTranslationTestFunction {
  return async function runTranslationTest(): Promise<void> {
    setStrings({en: {...en, ...translationOverrides}});

    try {
      await testFunction();
    } finally {
      setStrings({});
    }
  };
}

function renderConversationFeature(
  conversationType: ConversationType,
  rootProviderWrapper: RootProviderWrapper,
): ReturnType<typeof render> {
  return render(
    withThemeAndRootContext(<ConversationFeature conversationType={conversationType} />, rootProviderWrapper),
  );
}

function getFeatureItems(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>('[data-uie-name="team-creation-intro-list-item"]'));
}

function getFeatureItem(featureItems: readonly HTMLElement[], itemIndex: number): HTMLElement {
  const featureItem = featureItems[itemIndex];

  if (isUndefined(featureItem)) {
    throw new Error(`Expected feature item at index ${itemIndex}`);
  }

  return featureItem;
}

function expectFeatureIconCounts(options: ExpectFeatureIconCountsOptions): void {
  const {checkIconCount, container, shieldIconCount} = options;

  expect(container.querySelectorAll('svg[viewBox="0 0 16 12"]')).toHaveLength(checkIconCount);
  expect(container.querySelectorAll('svg[viewBox="0 0 16 16"]')).toHaveLength(shieldIconCount);
}

function expectLastFeatureHasShieldIcon(featureItems: readonly HTMLElement[]): void {
  const lastFeatureItem = featureItems[featureItems.length - 1];

  if (isUndefined(lastFeatureItem)) {
    throw new Error('Expected at least one feature item');
  }

  const lastFeatureContainer = lastFeatureItem.parentElement;

  if (isNull(lastFeatureContainer)) {
    throw new Error('Expected the last feature item to have a parent container');
  }

  expect(lastFeatureContainer.querySelector('svg[viewBox="0 0 16 16"]')).not.toBeNull();
  expect(lastFeatureContainer.querySelector('svg[viewBox="0 0 16 12"]')).toBeNull();
}

describe('ConversationFeature', () => {
  it(
    'renders the group features through the legacy HTML path',
    withTranslationStrings({}, () => {
      const {container} = renderConversationFeature(ConversationType.Group, legacyTranslationRootProviderWrapper);
      const featureItems = getFeatureItems(container);

      expect(featureItems).toHaveLength(3);
      expect(featureItems.map(featureItem => featureItem.textContent)).toEqual([
        'Up to 500 people',
        'Video conferencing',
        'Messages and calls are always end-to-end encrypted',
      ]);
      expectFeatureIconCounts({checkIconCount: 2, container, shieldIconCount: 1});
      expectLastFeatureHasShieldIcon(featureItems);
      expect(getFeatureItem(featureItems, 0)).toHaveAttribute('class', 'subline');
    }),
  );

  it(
    'renders the channel features through the legacy HTML path',
    withTranslationStrings({}, () => {
      const {container} = renderConversationFeature(ConversationType.Channel, legacyTranslationRootProviderWrapper);
      const featureItems = getFeatureItems(container);

      expect(featureItems).toHaveLength(5);
      expect(featureItems.map(featureItem => featureItem.textContent)).toEqual([
        'Up to 2000 people',
        'Public or private channels',
        'Conversation history',
        'Video conferencing',
        'Messages and calls are always end-to-end encrypted',
      ]);
      expectFeatureIconCounts({checkIconCount: 4, container, shieldIconCount: 1});
      expectLastFeatureHasShieldIcon(featureItems);
    }),
  );

  it(
    'renders group feature translations with an opaque capacity and literal unsupported markup',
    withTranslationStrings(
      {
        conversationCommonFeature1: '<meta name="example" content="value">[bold]Up to {capacity} people[/bold]',
        conversationCommonFeature2: 'Video conferencing',
        conversationCommonFeature3: 'Messages and calls are always end-to-end encrypted',
      },
      () => {
        const {container} = renderConversationFeature(
          ConversationType.Group,
          reactTranslationRenderingRootProviderWrapper,
        );
        const featureItems = getFeatureItems(container);
        const firstFeatureItem = getFeatureItem(featureItems, 0);

        expect(featureItems).toHaveLength(3);
        expect(featureItems.map(featureItem => featureItem.textContent)).toEqual([
          '<meta name="example" content="value">Up to 500 people',
          'Video conferencing',
          'Messages and calls are always end-to-end encrypted',
        ]);
        expect(firstFeatureItem.querySelectorAll('strong')).toHaveLength(1);
        expect(firstFeatureItem.querySelector('strong')).toHaveTextContent('Up to 500 people');
        expect(firstFeatureItem.querySelector('meta')).toBeNull();
        expect(firstFeatureItem).toHaveAttribute('data-uie-name', 'team-creation-intro-list-item');
        expect(firstFeatureItem).toHaveAttribute('class', 'subline');
        expectFeatureIconCounts({checkIconCount: 2, container, shieldIconCount: 1});
        expectLastFeatureHasShieldIcon(featureItems);
      },
    ),
  );

  it(
    'renders channel feature translations in order with moved capacity and multiple bold regions',
    withTranslationStrings(
      {
        conversationCommonFeature1: '{capacity} participants [bold]maximum[/bold]',
        channelConversationFeature1: '[bold]Public[/bold] or [bold]private[/bold] channels',
        channelConversationFeature2: '[bold]Conversation[/bold] history',
        conversationCommonFeature2: 'Video conferencing',
        conversationCommonFeature3: 'Messages and calls are always end-to-end encrypted',
      },
      () => {
        const {container} = renderConversationFeature(
          ConversationType.Channel,
          reactTranslationRenderingRootProviderWrapper,
        );
        const featureItems = getFeatureItems(container);

        expect(featureItems).toHaveLength(5);
        expect(featureItems.map(featureItem => featureItem.textContent)).toEqual([
          '2000 participants maximum',
          'Public or private channels',
          'Conversation history',
          'Video conferencing',
          'Messages and calls are always end-to-end encrypted',
        ]);
        expect(getFeatureItem(featureItems, 0).querySelector('strong')).toHaveTextContent('maximum');
        expect(getFeatureItem(featureItems, 1).querySelectorAll('strong')).toHaveLength(2);
        expect(getFeatureItem(featureItems, 2).querySelectorAll('strong')).toHaveLength(1);
        expect(container.querySelector('img')).toBeNull();
        expectFeatureIconCounts({checkIconCount: 4, container, shieldIconCount: 1});
        expectLastFeatureHasShieldIcon(featureItems);
      },
    ),
  );
});
