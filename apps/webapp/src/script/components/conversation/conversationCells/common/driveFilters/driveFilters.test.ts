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
  type ConversationDriveFiltersState,
  getActiveConversationDriveFilterType,
  getActiveGlobalDriveFilterType,
  type GlobalDriveFiltersState,
  hasActiveConversationDriveFilters,
  hasActiveGlobalDriveFilters,
  isFilterTypeDisabled,
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

  it('maps a single file-type category to its MIME terms', () => {
    expect(toConversationDriveSearchParams({...emptyFilters, selectedFileTypeIds: ['pdfs']})).toEqual({
      mimeTypes: ['application/pdf'],
    });
  });

  it('flattens multiple file-type categories into a single MIME term list', () => {
    expect(toConversationDriveSearchParams({...emptyFilters, selectedFileTypeIds: ['pictures', 'videos']})).toEqual({
      mimeTypes: ['image/*', 'video/*'],
    });
  });

  it('dedupes overlapping MIME terms across categories', () => {
    expect(
      toConversationDriveSearchParams({...emptyFilters, selectedFileTypeIds: ['spreadsheets', 'spreadsheets']}),
    ).toEqual({
      mimeTypes: ['*spreadsheet*', '*excel*'],
    });
  });

  it('maps shared-via-link toggle to hasPublicLink: true', () => {
    expect(toConversationDriveSearchParams({...emptyFilters, isSharedViaLink: true})).toEqual({
      hasPublicLink: true,
    });
  });

  it('omits unset params from search params', () => {
    expect(toConversationDriveSearchParams(emptyFilters)).toEqual({});
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

describe('getActiveConversationDriveFilterType', () => {
  it('returns null when no filter type is active', () => {
    expect(getActiveConversationDriveFilterType(emptyFilters)).toBeNull();
  });

  it('returns tags when tags are selected', () => {
    expect(getActiveConversationDriveFilterType({...emptyFilters, selectedTagIds: ['tag-a']})).toBe('tags');
  });
});

describe('getActiveGlobalDriveFilterType', () => {
  it('returns null when no filter type is active', () => {
    expect(getActiveGlobalDriveFilterType(emptyGlobalFilters)).toBeNull();
  });

  it('returns "conversation" when the global-only conversation filter type is active', () => {
    expect(getActiveGlobalDriveFilterType({...emptyGlobalFilters, selectedConversationIds: ['conv-a']})).toBe(
      'conversation',
    );
  });

  it('returns tags when tags are selected globally', () => {
    expect(getActiveGlobalDriveFilterType({...emptyGlobalFilters, selectedTagIds: ['tag-a']})).toBe('tags');
  });
});

describe('isFilterTypeDisabled', () => {
  it('returns false for every filter type when none is active', () => {
    expect(isFilterTypeDisabled('tags', null)).toBe(false);
    expect(isFilterTypeDisabled('fileType', null)).toBe(false);
    expect(isFilterTypeDisabled('createdBy', null)).toBe(false);
    expect(isFilterTypeDisabled('sharedViaLink', null)).toBe(false);
  });

  it('returns false for the active filter type itself', () => {
    expect(isFilterTypeDisabled('tags', 'tags')).toBe(false);
  });

  it('returns true for any other filter type when one is active', () => {
    expect(isFilterTypeDisabled('fileType', 'tags')).toBe(true);
    expect(isFilterTypeDisabled('createdBy', 'tags')).toBe(true);
    expect(isFilterTypeDisabled('sharedViaLink', 'tags')).toBe(true);
    expect(isFilterTypeDisabled('conversation', 'tags')).toBe(true);
  });
});

describe('toGlobalDriveSearchParams', () => {
  it('maps backend-supported global filters to search params', () => {
    expect(
      toGlobalDriveSearchParams({
        ...emptyGlobalFilters,
        selectedTagIds: ['tag-a'],
        selectedFileTypeIds: ['documents'],
        isSharedViaLink: true,
        path: '/wire-cells-web/folder',
      }),
    ).toEqual({
      tags: ['tag-a'],
      mimeTypes: ['*word*'],
      hasPublicLink: true,
      path: '/wire-cells-web/folder',
    });
  });

  it('maps the selected conversation id to the conversation cells path', () => {
    expect(
      toGlobalDriveSearchParams({
        ...emptyGlobalFilters,
        selectedConversationIds: ['conv-uuid@staging.zinfra.io'],
      }),
    ).toEqual({
      path: 'conv-uuid@staging.zinfra.io',
    });
  });

  it('uses the selected conversation as the global search root when both path sources are set', () => {
    expect(
      toGlobalDriveSearchParams({
        ...emptyGlobalFilters,
        selectedConversationIds: ['conv-uuid@staging.zinfra.io'],
        path: '/wire-cells-web/folder',
      }),
    ).toEqual({
      path: 'conv-uuid@staging.zinfra.io',
    });
  });

  it('omits empty global filters from search params', () => {
    expect(toGlobalDriveSearchParams(emptyGlobalFilters)).toEqual({});
  });
});
