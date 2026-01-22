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

import {User} from 'test/e2e_tests/data/user';
import {selectByDataAttribute} from 'test/e2e_tests/utils/selector.util';

import {ConversationPage} from '../pages/conversation.page';

export class CellsConversationPage extends ConversationPage {
  constructor(page: Page) {
    super(page);
  }

  async isMultipartMessageVisible(user: User, messageText: string): Promise<boolean> {
    const messageLocator = this.getMessage({sender: user});
    const textLocator = messageLocator.locator(`p`, {hasText: messageText});
    const imageLocator = messageLocator.locator(`[aria-label^="Image from ${user.fullName}"]`);
    await textLocator.waitFor({state: 'visible', timeout: 5000});
    await imageLocator.waitFor({state: 'visible', timeout: 5000});

    return (await textLocator.isVisible()) && (await imageLocator.isVisible());
  }

  override getImageLocator(user: User): Locator {
    return this.page.locator(
      `${selectByDataAttribute('item-message')} [aria-label^="Image from ${user.fullName}"] img`,
    );
  }

  protected getVideoLocator(user: User): Locator {
    return this.page.locator(
      `${selectByDataAttribute('item-message')} [aria-label^="Video file preview"] [aria-label^="Image from ${user.fullName}"] video`,
    );
  }

  async isVideoFromUserVisible(user: User) {
    // Wait for the video element to become visible
    const locator = this.getVideoLocator(user);

    // Wait for at least one matching element to appear
    await locator.first().waitFor({state: 'visible'});

    return await locator.first().isVisible();
  }
}
