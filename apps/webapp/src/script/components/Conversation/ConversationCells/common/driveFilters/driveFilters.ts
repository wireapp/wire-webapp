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
  path?: string;
}

export const hasActiveConversationDriveFilters = (filters: ConversationDriveFiltersState): boolean =>
  filters.selectedTagIds.length > 0 ||
  filters.selectedFileTypeIds.length > 0 ||
  filters.selectedCreatorIds.length > 0 ||
  filters.isSharedViaLink;

// True when at least one search-param field is set, i.e. the search call will
// actually be filtered.
// each view runs its own `to…SearchParams` mapper first, then asks this predicate.
export const hasActiveSearchParams = (params: DriveSearchParams): boolean =>
  params.tags !== undefined || params.path !== undefined;

export const hasActiveGlobalDriveFilters = (filters: GlobalDriveFiltersState): boolean =>
  hasActiveConversationDriveFilters(filters) ||
  filters.selectedConversationIds.length > 0 ||
  is.nonEmptyString(filters.path);

export const toConversationDriveSearchParams = (filters: ConversationDriveFiltersState): DriveSearchParams => ({
  tags: filters.selectedTagIds.length > 0 ? filters.selectedTagIds : undefined,
});

export const toGlobalDriveSearchParams = (filters: GlobalDriveFiltersState): DriveSearchParams => ({
  tags: filters.selectedTagIds.length > 0 ? filters.selectedTagIds : undefined,
  path: is.nonEmptyString(filters.path) ? filters.path : undefined,
});
