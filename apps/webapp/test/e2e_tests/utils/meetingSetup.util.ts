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

import {expect, type Page} from '@playwright/test';
import type {User} from '../data/user';
import {PageManager} from '../pageManager';

export const prepareMeetingParticipantProfiles = async (
  ownerPage: Page,
  memberPage: Page,
  member: User,
  options: {profileImagePath: string; longName: string},
): Promise<void> => {
  const {pages: ownerPages, components: ownerComponents} = PageManager.from(ownerPage).webapp;
  const {pages: memberPages, components: memberComponents} = PageManager.from(memberPage).webapp;

  // Upload the organizer's picture and confirm the save succeeded.
  await ownerComponents.conversationSidebar().clickPreferencesButton();
  await ownerPages.settings().clickAccountButton();

  const ownerAccount = ownerPages.account();

  const [pictureResponse] = await Promise.all([
    ownerAccount.waitForProfilePictureSave(),
    ownerAccount.uploadProfilePicture(options.profileImagePath),
  ]);

  expect(pictureResponse.ok(), 'The organizer profile picture should save successfully').toBe(true);

  // Give the viewing member a long name.
  // This newly created account keeps its default state without a picture.
  await memberComponents.conversationSidebar().clickPreferencesButton();
  await memberPages.settings().clickAccountButton();

  const memberAccount = memberPages.account();

  await memberAccount.changeName(options.longName);
  await expect(memberAccount.nameDisplay).toHaveText(options.longName);

  // Keep the test data consistent with the updated account name.
  member.fullName = options.longName;

  // Refresh the organizer's view before selecting meeting participants.
  await ownerPage.reload();
};
