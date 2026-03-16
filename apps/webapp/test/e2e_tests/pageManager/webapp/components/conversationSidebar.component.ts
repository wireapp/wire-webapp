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

import {Page, Locator} from '@playwright/test';

export class ConversationSidebar {
  readonly pageLoadingTimeout = 60_000;
  private readonly page: Page;
  readonly navigation: Locator;
  readonly personalStatusLabel: Locator;
  readonly personalStatusIcon: Locator;
  readonly personalStatusName: Locator;
  readonly personalUserName: Locator;
  readonly preferencesButton: Locator;
  readonly allConverationsButton: Locator;
  readonly connectButton: Locator;
  readonly archiveButton: Locator;
  readonly manageTeamButton: Locator;
  readonly sidebar: Locator;
  readonly supportButton: Locator;

  constructor(page: Page) {
    this.page = page;

    this.navigation = page.getByRole('navigation');
    this.personalStatusLabel = page.getByTestId('status-availability');
    this.personalStatusIcon = this.navigation.getByTestId('status-availability-icon');
    this.personalStatusName = page.getByTestId('status-name');
    this.personalUserName = page.getByTestId('user-handle');
    this.preferencesButton = page.getByTestId('go-preferences');
    this.allConverationsButton = page.getByTestId('go-recent-view');
    this.connectButton = page.getByTestId('go-people');
    this.archiveButton = page.getByTestId('go-archive');
    this.manageTeamButton = page.getByTestId('go-team-management');
    this.sidebar = page.locator(`.conversations-sidebar-items`);
    this.supportButton = page.getByRole('link', {name: 'Support'});
  }

  async clickPreferencesButton() {
    await this.preferencesButton.click();
  }

  async clickAllConversationsButton() {
    await this.allConverationsButton.click();
  }

  async clickConnectButton() {
    await this.connectButton.click();
  }

  async isPageLoaded() {
    await this.preferencesButton.waitFor({state: 'visible', timeout: this.pageLoadingTimeout});
  }

  async clickArchive() {
    await this.archiveButton.click();
  }

  async openStatusMenu(userFullName: string) {
    await this.navigation.getByRole('button', {name: userFullName}).click();
  }

  async setStatus(status: 'None' | 'Available' | 'Busy' | 'Away') {
    await this.page.getByRole('menu').getByRole('menuitem', {name: status}).click();
  }
}
