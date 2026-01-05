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

import {Page} from '@playwright/test';

import {User} from 'test/e2e_tests/data/user';

export const FullScreenCallPage = (page: Page) => {
  const component = page.locator('.video-calling-wrapper');

  const reactButton = component.getByTitle('Reactions');

  /* Press the react button and click the given emoji within the opened toolbar */
  const sendReaction = async (emoji: '👍') => {
    await reactButton.click();
    const emojiPicker = component.getByRole('toolbar').and(component.getByLabel('Reactions'));

    await emojiPicker.getByRole('button', {name: emoji}).click();
  };

  /**
   * Get the locator for a sent reaction
   * @param options.emoji Optional emoji to filter for
   * @param options.sender Optional filter for the user who sent the emoji
   */
  const getReaction = (options?: {emoji?: '👍'; sender?: Pick<User, 'fullName'>}) => {
    return component.getByRole('img', {
      name: new RegExp(`Emoji ${options?.emoji ?? '.*'} from ${options?.sender?.fullName ?? '.*'}`),
    });
  };

  return {
    sendReaction,
    getReaction,
  };
};
