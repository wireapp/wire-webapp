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

import is from '@sindresorhus/is';

import {FILE_TYPE_CATALOG} from './filetypecatalog';

export interface ConversationDriveFiltersState {
  selectedTagIds: string[];
  selectedFileTypeIds: string[];
  selectedCreatorIds: string[];
  isSharedViaLink: boolean;
}

export interface GlobalDriveFiltersState extends ConversationDriveFiltersState {
  selectedConversationIds: string[];
  path?: string;
}

export interface DriveSearchParams {
  tags?: string[];
  mimeTypes?: string[];
  hasPublicLink?: boolean;
  creatorIds?: string[];
  path?: string;
}

const FILE_TYPE_MIME_TERMS: Record<string, readonly string[]> = Object.fromEntries(
  FILE_TYPE_CATALOG.map(entry => [entry.id, entry.mimeTerms]),
);

export const hasActiveConversationDriveFilters = (filters: ConversationDriveFiltersState): boolean =>
  filters.selectedTagIds.length > 0 ||
  filters.selectedFileTypeIds.length > 0 ||
  filters.selectedCreatorIds.length > 0 ||
  filters.isSharedViaLink;

// True when at least one search-param field is set, i.e. the search call will
// actually be filtered. Each view runs its own `to…SearchParams` mapper first,
// then asks this predicate.
export const hasActiveSearchParams = (params: DriveSearchParams): boolean =>
  params.tags !== undefined ||
  params.mimeTypes !== undefined ||
  params.hasPublicLink !== undefined ||
  params.creatorIds !== undefined ||
  params.path !== undefined;

export const hasActiveGlobalDriveFilters = (filters: GlobalDriveFiltersState): boolean =>
  hasActiveConversationDriveFilters(filters) ||
  filters.selectedConversationIds.length > 0 ||
  is.nonEmptyString(filters.path);

export type ActiveFilterType = 'tags' | 'fileType' | 'createdBy' | 'sharedViaLink' | 'conversation';

export const getActiveConversationDriveFilterType = (
  filters: ConversationDriveFiltersState,
): ActiveFilterType | null => {
  if (filters.selectedTagIds.length > 0) {
    return 'tags';
  }
  if (filters.selectedFileTypeIds.length > 0) {
    return 'fileType';
  }
  if (filters.selectedCreatorIds.length > 0) {
    return 'createdBy';
  }
  if (filters.isSharedViaLink) {
    return 'sharedViaLink';
  }
  return null;
};

export const getActiveGlobalDriveFilterType = (filters: GlobalDriveFiltersState): ActiveFilterType | null =>
  filters.selectedConversationIds.length > 0 ? 'conversation' : getActiveConversationDriveFilterType(filters);

export const isFilterTypeDisabled = (filterType: ActiveFilterType, active: ActiveFilterType | null): boolean =>
  active !== null && active !== filterType;

const toMimeTypes = (selectedFileTypeIds: string[]): string[] | undefined => {
  if (selectedFileTypeIds.length === 0) {
    return undefined;
  }
  const mimeTerms = [...new Set(selectedFileTypeIds.flatMap(id => FILE_TYPE_MIME_TERMS[id] ?? []))];
  return mimeTerms.length > 0 ? mimeTerms : undefined;
};

// The conversation filter is single-select; the selected id is a stringified qualified id
// (`<id>@<domain>`), which is also the conversation's cells path root. Using it as the search
// path scopes the recursive search to that conversation only.
const toConversationPath = (selectedConversationIds: string[]): string | undefined => {
  const [stringifiedQualifiedId] = selectedConversationIds;
  return is.nonEmptyString(stringifiedQualifiedId) ? stringifiedQualifiedId : undefined;
};

const toGlobalSearchRootPath = ({
  selectedConversationIds,
  path,
}: Pick<GlobalDriveFiltersState, 'selectedConversationIds' | 'path'>): string | undefined => {
  const conversationPath = toConversationPath(selectedConversationIds);
  return conversationPath ?? (is.nonEmptyString(path) ? path : undefined);
};

export const toConversationDriveSearchParams = (filters: ConversationDriveFiltersState): DriveSearchParams => ({
  tags: filters.selectedTagIds.length > 0 ? filters.selectedTagIds : undefined,
  mimeTypes: toMimeTypes(filters.selectedFileTypeIds),
  hasPublicLink: filters.isSharedViaLink ? true : undefined,
  creatorIds: filters.selectedCreatorIds.length > 0 ? filters.selectedCreatorIds : undefined,
});

export const toGlobalDriveSearchParams = (filters: GlobalDriveFiltersState): DriveSearchParams => ({
  tags: filters.selectedTagIds.length > 0 ? filters.selectedTagIds : undefined,
  mimeTypes: toMimeTypes(filters.selectedFileTypeIds),
  hasPublicLink: filters.isSharedViaLink ? true : undefined,
  creatorIds: filters.selectedCreatorIds.length > 0 ? filters.selectedCreatorIds : undefined,
  path: toGlobalSearchRootPath(filters),
});
