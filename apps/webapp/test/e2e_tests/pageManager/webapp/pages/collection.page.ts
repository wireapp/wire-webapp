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

import {Locator, Page} from '@playwright/test';

/** POM for the "collection". This page is accessible by searching for a message within a conversation. */
export class CollectionPage {
  private readonly page: Page;
  readonly component: Locator;
  readonly searchResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.component = page.locator('#collection');
    this.searchResults = this.component.getByTestId('full-search-item');
  }

  get searchInput() {
    return this.component.getByRole('textbox', {name: 'Search text messages'});
  }

  get searchItems() {
    return this.component.getByTestId('full-search-item');
  }

  async searchForMessages(search: string) {
    await this.searchInput.fill(search);
  }

  getSection(type: 'Images' | 'Audio' | 'Files') {
    const section = this.component.locator('section').filter({has: this.page.locator('header', {hasText: type})});
    return Object.assign(section, {
      showAllButton: section.getByRole('button', {name: 'Show all'}),
    });
  }

  get searchBar() {
    return this.component.getByRole('textbox', {name: 'Search text messages'});
  }

  get noResultsMessage() {
    return this.component.getByText('No results.', {exact: true});
  }
}
