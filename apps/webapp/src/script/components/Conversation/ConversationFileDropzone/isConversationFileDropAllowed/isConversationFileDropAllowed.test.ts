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

import {isConversationFileDropAllowed} from './isConversationFileDropAllowed';

describe('isConversationFileDropAllowed', () => {
  it('allows conversation guests to drop files when Cells is disabled', () => {
    const conversation = {isGuest: () => true};

    expect(isConversationFileDropAllowed({conversation, isCellsEnabled: false})).toBe(true);
  });

  it('allows conversation editors to drop files when Cells is enabled', () => {
    const conversation = {isGuest: () => false};

    expect(isConversationFileDropAllowed({conversation, isCellsEnabled: true})).toBe(true);
  });

  it('prevents conversation guests from dropping files when Cells is enabled', () => {
    const conversation = {isGuest: () => true};

    expect(isConversationFileDropAllowed({conversation, isCellsEnabled: true})).toBe(false);
  });
});
