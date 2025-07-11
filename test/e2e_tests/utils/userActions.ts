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

import {User} from '../data/user';
import {expect} from '../test.fixtures';

export const loginUser = async (user: User, pages: any) => {
  await pages.openMainPage();
  await pages.singleSignOnPage.enterEmailOnSSOPage(user.email);
  await pages.loginPage.inputPassword(user.password);
  await pages.loginPage.clickSignInButton();
  await pages.dataShareConsentModal.clickDecline();
};

export const sendMessageFromAtoB = async (pages: any, receipient: User, text: string) => {
  // Team owner opens conversation with A
  await pages.conversationListPage.openConversation(receipient.fullName);
  expect(await pages.conversationPage.isConversationOpen(receipient.fullName));

  // Team owner sends a text to A
  await pages.conversationPage.sendMessage(text);
  await pages.conversationPage.page.waitForTimeout(1000); // Wait for the message to be sent
  // TODO: Bug [WPB-18226] Message is not visible in the conversation after sending it
  await pages.refreshPage({waitUntil: 'domcontentloaded'});
  await expect(pages.conversationPage.page.getByText(text)).toBeVisible({timeout: 10000});
};
