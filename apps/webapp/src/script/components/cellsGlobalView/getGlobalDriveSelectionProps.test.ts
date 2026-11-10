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

import {getGlobalDriveSelectionProps} from './getGlobalDriveSelectionProps';

const activeFilters = {
  selectedTagIds: ['tag-id'],
  selectedFileTypeIds: [],
  selectedCreatorIds: [],
  selectedConversationIds: [],
  isSharedViaLink: false,
};

describe('getGlobalDriveSelectionProps', () => {
  it('keeps selection enabled for filter-only browsing and scopes selection to active filters', () => {
    const selectionProps = getGlobalDriveSelectionProps('', activeFilters);

    expect(selectionProps.selectionEnabled).toBe(true);
    expect(selectionProps.selectionScopeKey).toBe(JSON.stringify(activeFilters));
  });

  it('disables selection while text search is active', () => {
    const selectionProps = getGlobalDriveSelectionProps('report', activeFilters);

    expect(selectionProps.selectionEnabled).toBe(false);
  });

  it('changes the scope key when filters change', () => {
    const original = getGlobalDriveSelectionProps('', activeFilters);
    const changed = getGlobalDriveSelectionProps('', {...activeFilters, selectedTagIds: ['other-tag']});

    expect(changed.selectionEnabled).toBe(true);
    expect(changed.selectionScopeKey).not.toBe(original.selectionScopeKey);
  });
});
