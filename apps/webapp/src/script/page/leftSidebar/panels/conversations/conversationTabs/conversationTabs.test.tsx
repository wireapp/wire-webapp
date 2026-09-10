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
import userEvent from '@testing-library/user-event';
import ko from 'knockout';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationLabelRepository} from 'Repositories/conversation/ConversationLabelRepository';
import {User} from 'Repositories/entity/User';
import {reactTranslationRenderingFeatureToggleName} from 'src/script/featureToggles/startupFeatureToggleNames';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import * as DataDog from 'Util/dataDog';
import * as Environment from 'Util/environment';
import {setStrings, translate} from 'Util/localizerUtil';

import en from 'I18n/en-US.json';

import {ConversationTabs} from './conversationTabs';
import {SidebarTabs} from '../useSidebarStore';

const internalEnvironmentUrl = 'https://app.wire.com';
const conversationRepository = {
  conversationLabelRepository: {
    getLabelConversations: jest.fn().mockReturnValue([]),
    labels: ko.observableArray([]),
  } as unknown as ConversationLabelRepository,
} as unknown as ConversationRepository;
const legacyRootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate}));
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

function withInternalEnvironment(testFunction: TranslationTestFunction): IsolatedTranslationTestFunction {
  return async function runInternalEnvironmentTest(): Promise<void> {
    const environmentSpy = jest.spyOn(Environment, 'getWebEnvironment').mockReturnValue({
      isDev: false,
      isEdge: false,
      isInternal: true,
      isLinked: false,
      isLocalhost: false,
      isProduction: false,
      isStaging: false,
      name: 'Internal Environment',
    });
    const dataDogSpy = jest.spyOn(DataDog, 'isDataDogEnabled').mockReturnValue(true);

    try {
      await testFunction();
    } finally {
      environmentSpy.mockRestore();
      dataDogSpy.mockRestore();
    }
  };
}

function renderConversationTabs(
  rootProviderWrapper: ReturnType<typeof createRootProviderWrapperForTest>,
): ReturnType<typeof render> {
  return render(
    <div id="wire-app">
      {withThemeAndRootContext(
        <ConversationTabs
          unreadConversations={[]}
          favoriteConversations={[]}
          archivedConversations={[]}
          groupConversations={[]}
          directConversations={[]}
          channelConversations={[]}
          draftConversations={[]}
          conversationRepository={conversationRepository}
          onChangeTab={jest.fn()}
          currentTab={SidebarTabs.RECENT}
          onClickPreferences={jest.fn()}
          showNotificationsBadge={false}
          selfUser={new User('self-user', '', translate)}
        />,
        rootProviderWrapper,
      )}
    </div>,
  );
}

describe('ConversationTabs', () => {
  it(
    'keeps the legacy environment disclaimer rendering when React translation rendering is disabled',
    withInternalEnvironment(
      withTranslationStrings(en, () => {
        const {container, getByRole} = renderConversationTabs(legacyRootProviderWrapper);
        const disclaimerLink = container.querySelector(`a[href="${internalEnvironmentUrl}"]`);

        expect(disclaimerLink).toHaveTextContent(internalEnvironmentUrl);
        expect(disclaimerLink).toHaveAttribute('target', '_blank');
        expect(disclaimerLink).toHaveAttribute('rel', 'nofollow noopener noreferrer');
        expect(getByRole('presentation')).toBeInTheDocument();
      }),
    ),
  );

  it(
    'renders the environment disclaimer link as React content in the tooltip and footer',
    withInternalEnvironment(
      withTranslationStrings(en, async () => {
        const {container, getByRole} = renderConversationTabs(reactTranslationRenderingRootProviderWrapper);
        const disclaimerLink = container.querySelector(`a[href="${internalEnvironmentUrl}"]`);
        const user = userEvent.setup();

        expect(disclaimerLink).toHaveTextContent(internalEnvironmentUrl);
        expect(disclaimerLink).toHaveAttribute('target', '_blank');
        expect(disclaimerLink).toHaveAttribute('rel', 'nofollow noopener noreferrer');

        await user.hover(getByRole('presentation'));

        const tooltipContent = document.querySelector('[data-testid="tooltip-content"]');
        const tooltipLink = tooltipContent?.querySelector(`a[href="${internalEnvironmentUrl}"]`);
        expect(tooltipLink).toHaveTextContent(internalEnvironmentUrl);
        expect(tooltipLink).toHaveAttribute('target', '_blank');
        expect(tooltipLink).toHaveAttribute('rel', 'nofollow noopener noreferrer');
      }),
    ),
  );

  it(
    'keeps translated link and URL positions controlled by the translation',
    withInternalEnvironment(
      withTranslationStrings(
        {
          ...en,
          conversationInternalEnvironmentDisclaimer: 'Open [link]{url}[/link] instead.',
        },
        async () => {
          const {container, getByRole} = renderConversationTabs(reactTranslationRenderingRootProviderWrapper);
          const disclaimerLink = container.querySelector(`a[href="${internalEnvironmentUrl}"]`);
          const user = userEvent.setup();

          expect(container).toHaveTextContent(`Open ${internalEnvironmentUrl} instead.`);
          expect(disclaimerLink).toHaveTextContent(internalEnvironmentUrl);

          await user.hover(getByRole('presentation'));

          const tooltipContent = document.querySelector('[data-testid="tooltip-content"]');
          const tooltipLink = tooltipContent?.querySelector(`a[href="${internalEnvironmentUrl}"]`);
          expect(tooltipLink).toHaveTextContent(internalEnvironmentUrl);
        },
      ),
    ),
  );

  it(
    'keeps unsupported translated markup as text when React translation rendering is enabled',
    withInternalEnvironment(
      withTranslationStrings(
        {
          ...en,
          conversationInternalEnvironmentDisclaimer: '<img src="example"> [link]{url}[/link]',
        },
        async () => {
          const {container} = renderConversationTabs(reactTranslationRenderingRootProviderWrapper);

          expect(container).toHaveTextContent(`<img src="example"> ${internalEnvironmentUrl}`);
          expect(container.querySelector('img')).toBeNull();
        },
      ),
    ),
  );
});
