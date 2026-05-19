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

import {
  ConversationDriveFiltersState,
  GlobalDriveFiltersState,
  hasActiveConversationDriveFilters,
  hasActiveGlobalDriveFilters,
  toConversationDriveSearchParams,
  toGlobalDriveSearchParams,
} from './driveFilters';

const emptyFilters: ConversationDriveFiltersState = {
  selectedTagIds: [],
  selectedFileTypeIds: [],
  selectedCreatorIds: [],
  isSharedViaLink: false,
};

const emptyGlobalFilters: GlobalDriveFiltersState = {
  ...emptyFilters,
  selectedConversationIds: [],
  path: undefined,
};

describe('hasActiveConversationDriveFilters', () => {
  it('returns false when no filters are active', () => {
    expect(hasActiveConversationDriveFilters(emptyFilters)).toBe(false);
  });

  it.each([
    {selectedTagIds: ['tag-a']},
    {selectedFileTypeIds: ['documents']},
    {selectedCreatorIds: ['user-a']},
    {isSharedViaLink: true},
  ])('returns true when a filter is active: %#', activeFilter => {
    expect(hasActiveConversationDriveFilters({...emptyFilters, ...activeFilter})).toBe(true);
  });
});

describe('toConversationDriveSearchParams', () => {
  it('maps selected tags to search params', () => {
    expect(toConversationDriveSearchParams({...emptyFilters, selectedTagIds: ['tag-a']})).toEqual({
      tags: ['tag-a'],
    });
  });

  it('omits empty tags from search params', () => {
    expect(toConversationDriveSearchParams(emptyFilters)).toEqual({
      tags: undefined,
    });
  });
});

describe('hasActiveGlobalDriveFilters', () => {
  it('returns false when no filters are active', () => {
    expect(hasActiveGlobalDriveFilters(emptyGlobalFilters)).toBe(false);
  });

  it.each([{selectedConversationIds: ['conversation-a']}, {path: '/wire-cells-web/folder'}])(
    'returns true when a global-only filter is active: %#',
    activeFilter => {
      expect(hasActiveGlobalDriveFilters({...emptyGlobalFilters, ...activeFilter})).toBe(true);
    },
  );
});

describe('toGlobalDriveSearchParams', () => {
  it('maps backend-supported global filters to search params', () => {
    expect(
      toGlobalDriveSearchParams({
        ...emptyGlobalFilters,
        selectedTagIds: ['tag-a'],
        selectedConversationIds: ['conversation-a'],
        path: '/wire-cells-web/folder',
      }),
    ).toEqual({
      tags: ['tag-a'],
      path: '/wire-cells-web/folder',
    });
  });

  it('omits unsupported and empty global filters from search params', () => {
    expect(toGlobalDriveSearchParams({...emptyGlobalFilters, selectedConversationIds: ['conversation-a']})).toEqual({
      tags: undefined,
      path: undefined,
    });
  });
});
