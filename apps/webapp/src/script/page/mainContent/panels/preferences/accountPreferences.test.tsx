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
import {container} from 'tsyringe';

import {ClientRepository} from 'Repositories/client';
import {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {User} from 'Repositories/entity/User';
import {PropertiesRepository} from 'Repositories/properties/propertiesRepository';
import {TeamState} from 'Repositories/team/TeamState';
import {AppLockRepository} from 'Repositories/user/appLockRepository';
import type {UserRepository} from 'Repositories/user/userRepository';
import {Config} from 'src/script/Config';
import {withTheme} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {Core} from 'src/script/service/coreSingleton';
import {translateForTest} from 'Util/test/translateForTest';

import {AccountPreferences} from './accountPreferences';

const rootProviderWrapper = createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}));

const mockProps = {
  appLockRepository: {} as unknown as AppLockRepository,
  importFile: jest.fn(),
  clientRepository: {} as unknown as ClientRepository,
  conversationRepository: {leaveGuestRoom: jest.fn()} as unknown as ConversationRepository,
  propertiesRepository: {} as unknown as PropertiesRepository,
  switchContent: jest.fn(),
  userRepository: {} as unknown as UserRepository,
};

function renderAccountPreferences(selfUser: User): ReturnType<typeof render> {
  return render(withTheme(<AccountPreferences {...mockProps} selfUser={selfUser} />), {
    wrapper: rootProviderWrapper,
  });
}

describe('AccountPreferences — team creation header', () => {
  const core = container.resolve(Core);
  const teamState = container.resolve(TeamState);
  let configSpy: jest.SpyInstance;
  let isInTeamSpy: jest.SpyInstance;
  let originalVersion: number;

  beforeEach(() => {
    originalVersion = core.backendFeatures.version;
    core.backendFeatures.version = 7;
    isInTeamSpy = jest.spyOn(teamState, 'isInTeam').mockReturnValue(false);
    configSpy = jest.spyOn(Config, 'getConfig').mockReturnValue({
      FEATURE: {ENABLE_TEAM_CREATION: true},
      MIN_TEAM_CREATION_SUPPORTED_API_VERSION: 7,
    } as unknown as ReturnType<typeof Config.getConfig>);
  });

  afterEach(() => {
    core.backendFeatures.version = originalVersion;
    configSpy.mockRestore();
    isInTeamSpy.mockRestore();
  });

  it('hides the team creation header for temporary guests', () => {
    const selfUser = new User('test-id', '', translateForTest);
    selfUser.isTemporaryGuest(true);

    renderAccountPreferences(selfUser);

    expect(screen.queryByText('teamUpgradeBannerHeader')).not.toBeInTheDocument();
  });

  it('shows the team creation header for regular users', () => {
    const selfUser = new User('test-id', '', translateForTest);
    selfUser.isTemporaryGuest(false);

    renderAccountPreferences(selfUser);

    expect(screen.queryByText('teamUpgradeBannerHeader')).toBeInTheDocument();
  });
});
