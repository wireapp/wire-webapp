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

import {pendingOnboardingStatusFeatureToggleName} from '../../../../src/script/featureToggles/startupFeatureToggleNames';
import {User} from '../../data/user';
import {PageManager} from '../../pageManager';
import {expect, test, withLogin} from '../../test.fixtures';

test.describe('Pending onboarding status', () => {
  let owner: User;
  let pendingMember: User;

  // The member never logs in, so they have no client and the backend reports them as non-contactable
  test.beforeEach(async ({createTeam, createUser}) => {
    pendingMember = await createUser();
    const team = await createTeam('Pending Onboarding Team', {users: [pendingMember]});
    owner = team.owner;
  });

  test(
    'I want to see that a team member is pending onboarding and cannot start a conversation with them',
    {tag: ['@regression']},
    async ({createPage}) => {
      const ownerPage = await createPage(
        withLogin(owner, {startupFeatureToggles: {[pendingOnboardingStatusFeatureToggleName]: true}}),
      );
      const {pages, components, modals} = PageManager.from(ownerPage).webapp;

      await components.conversationSidebar().clickConnectButton();
      await pages.startUI().searchInput.fill(pendingMember.username);
      const searchResult = pages.startUI().searchResults.filter({hasText: pendingMember.fullName});
      await expect(searchResult.getByTestId('status-pending-onboarding')).toBeVisible();

      await searchResult.click();
      await expect(modals.userProfile().modal).toBeVisible();
      await expect(modals.userProfile().startConversationButton).toBeDisabled();
      await expect(modals.userProfile().modal.getByTestId('status-pending-onboarding-info')).toBeVisible();
    },
  );

  test(
    'I want to start a conversation with a pending team member when the pending onboarding status is disabled',
    {tag: ['@regression']},
    async ({createPage}) => {
      const ownerPage = await createPage(
        withLogin(owner, {startupFeatureToggles: {[pendingOnboardingStatusFeatureToggleName]: false}}),
      );
      const {pages, components, modals} = PageManager.from(ownerPage).webapp;

      await components.conversationSidebar().clickConnectButton();
      await pages.startUI().searchInput.fill(pendingMember.username);
      const searchResult = pages.startUI().searchResults.filter({hasText: pendingMember.fullName});
      await expect(searchResult).toBeVisible();
      await expect(searchResult.getByTestId('status-pending-onboarding')).toHaveCount(0);

      await searchResult.click();
      await expect(modals.userProfile().modal).toBeVisible();
      await expect(modals.userProfile().startConversationButton).toBeEnabled();
      await expect(modals.userProfile().modal.getByTestId('status-pending-onboarding-info')).toHaveCount(0);
    },
  );
});
