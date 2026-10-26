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

import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ko from 'knockout';
import {container} from 'tsyringe';

import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConversationLabelRepository} from 'Repositories/conversation/ConversationLabelRepository';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {Core} from 'src/script/service/coreSingleton';
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
  selfUser = new User('self-user', '', translate),
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
          selfUser={selfUser}
        />,
        rootProviderWrapper,
      )}
    </div>,
  );
}

describe('ConversationTabs — team creation banner', () => {
  const core = container.resolve(Core);
  const teamState = container.resolve(TeamState);
  let configSpy: jest.SpyInstance;
  let isInTeamSpy: jest.SpyInstance;
  let originalVersion: number;

  beforeEach(() => {
    originalVersion = core.backendFeatures.version;
    core.backendFeatures.version = 7;
    isInTeamSpy = jest.spyOn(teamState, 'isInTeam').mockReturnValue(false);
    const realConfig = Config.getConfig();
    configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue({
      ...realConfig,
      FEATURE: {...realConfig.FEATURE, ENABLE_TEAM_CREATION: true},
      MIN_TEAM_CREATION_SUPPORTED_API_VERSION: 7,
    });
  });

  afterEach(() => {
    core.backendFeatures.version = originalVersion;
    configSpy.mockRestore();
    isInTeamSpy.mockRestore();
  });

  it(
    'hides the team creation banner for temporary guests',
    withTranslationStrings(en, () => {
      const selfUser = new User('self-user', '', translate);
      selfUser.isTemporaryGuest(true);
      renderConversationTabs(translationRootProviderWrapper, selfUser);
      expect(screen.queryByText('Enjoy benefits of a team')).not.toBeInTheDocument();
    }),
  );

  it(
    'shows the team creation banner for regular users',
    withTranslationStrings(en, () => {
      const selfUser = new User('self-user', '', translate);
      selfUser.isTemporaryGuest(false);
      renderConversationTabs(translationRootProviderWrapper, selfUser);
      expect(screen.queryByText('Enjoy benefits of a team')).toBeInTheDocument();
    }),
  );
});

describe('ConversationTabs', () => {
  it(
    'renders the environment disclaimer link in the tooltip and footer',
    withInternalEnvironment(
      withTranslationStrings(en, async () => {
        const {container, getByRole} = renderConversationTabs(translationRootProviderWrapper);
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
          const {container, getByRole} = renderConversationTabs(translationRootProviderWrapper);
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
    'keeps unsupported translated markup as text',
    withInternalEnvironment(
      withTranslationStrings(
        {
          ...en,
          conversationInternalEnvironmentDisclaimer: '<img src="example"> [link]{url}[/link]',
        },
        async () => {
          const {container} = renderConversationTabs(translationRootProviderWrapper);

          expect(container).toHaveTextContent(`<img src="example"> ${internalEnvironmentUrl}`);
          expect(container.querySelector('img')).toBeNull();
        },
      ),
    ),
  );
});
