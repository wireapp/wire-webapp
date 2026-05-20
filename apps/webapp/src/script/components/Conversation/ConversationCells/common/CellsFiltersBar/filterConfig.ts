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

import type {ActiveFilterType} from '../driveFilters/driveFilters';
import {FilterItem} from '../FilterPopover/FilterPopover';

export type {FilterItem};

export type PopoverFilterConfig = {
  type: 'popover';
  id: ActiveFilterType;
  label: string;
  items: FilterItem[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  disabled?: boolean;
  singleSelect?: boolean;
};

export type ToggleFilterConfig = {
  type: 'toggle';
  id: ActiveFilterType;
  label: string;
  isActive: boolean;
  onToggle: () => void;
  disabled?: boolean;
};

export type FilterConfig = PopoverFilterConfig | ToggleFilterConfig;
