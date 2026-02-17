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
  readonly page: Page;
  readonly component: Locator;

  constructor(page: Page) {
    this.page = page;
    this.component = page.locator('#collection');
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

  get imagesSection() {
    return this.component.locator('section').filter({has: this.page.locator('header', {hasText: 'Images'})});
  }

  get audioSection() {
    return this.component.locator('section').filter({has: this.page.locator('header', {hasText: 'Audio'})});
  }

  get filesSection() {
    return this.component.locator('section').filter({has: this.page.locator('header', {hasText: 'Files'})});
  }

  get overviewImagesButton() {
    return this.imagesSection.getByRole('button', {name: /Show all/i});
  }

  get overviewFilesButton() {
    return this.filesSection.getByRole('button', {name: /Show all/i});
  }

  get fullSearchBar() {
    return this.component.getByRole('textbox', {name: 'Search text messages'});
  }

  get noResultsMessage() {
    return this.component.getByText('No results.', {exact: true});
  }

  /**
   * Returns a locator for the highlighted (marked) text within the search results.
   * @param searchTerm The text you expect to be highlighted.
   */
  getMarkedSearchResult(searchTerm: string): Locator {
    return this.component.locator('mark').filter({hasText: searchTerm});
  }

  /** Locates the text content of every search result item */
  get resultTexts() {
    return this.component.locator('[data-uie-name="full-search-item-text"]');
  }

  /** Gets all result texts as an array of strings */
  async getAllResultTexts(): Promise<string[]> {
    return await this.resultTexts.allInnerTexts();
  }
}
