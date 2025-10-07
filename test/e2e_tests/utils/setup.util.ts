/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {addCreatedTeam, addCreatedUser} from './tearDown.util';
import {inviteMembers, loginUser} from './userActions';

import {ApiManagerE2E} from '../backend/apiManager.e2e';
import {User} from '../data/user';
import {PageManager} from '../pageManager';

/**
 * add an team with owner and given members
 */
export const bootstrapTeamForTesting = async (api: ApiManagerE2E, members: User[], owner: User, teamName: string) => {
  const user = await api.createTeamOwner(owner, teamName);
  // register credentials for cleanup later
  addCreatedTeam(user, user.teamId);
  await inviteMembers(members, user, api);

  for (const [, user] of members.entries()) {
    addCreatedUser(user);
  }
  return user;
};

export const completeLogin = async (pageManager: PageManager, user: User) => {
  const {components, modals, pages} = pageManager.webapp;
  await pageManager.openMainPage();
  await loginUser(user, pageManager);

  if (await pages.historyInfo().isButtonVisible()) {
    await pages.historyInfo().clickConfirmButton();
  }
  await components.conversationSidebar().isPageLoaded();

  if (await modals.dataShareConsent().isModalPresent()) {
    await modals.dataShareConsent().clickDecline();
  }
};
