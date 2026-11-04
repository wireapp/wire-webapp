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

import {normalizeCellsPath} from './normalizeCellsPath';

describe('normalizeCellsPath', () => {
  const conversationQualifiedId = {id: 'conversation-id', domain: 'wire.com'};

  it('removes the current conversation prefix from a nested path', () => {
    expect(normalizeCellsPath('conversation-id@wire.com/folder/file.txt', conversationQualifiedId)).toBe(
      'folder/file.txt',
    );
  });

  it('represents the current conversation root as an empty path', () => {
    expect(normalizeCellsPath('/conversation-id@wire.com/', conversationQualifiedId)).toBe('');
  });

  it('leaves a path qualified to another conversation unchanged for validation', () => {
    expect(normalizeCellsPath('another-id@wire.com/folder', conversationQualifiedId)).toBe(
      'another-id@wire.com/folder',
    );
  });
});
