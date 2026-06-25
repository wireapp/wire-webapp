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

import {CircleCloseIcon, SearchIcon} from '@wireapp/react-ui-kit';

import {
  clearButtonStyles,
  searchFieldStyles,
  searchIconStyles,
  searchNativeInputStyles,
} from './cellssearchinput.styles';

interface CellsSearchInputProps {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onFocus?: () => void;
  ariaLabel?: string;
  clearAriaLabel?: string;
  uieName?: string;
}

export const CellsSearchInput = ({
  value,
  placeholder,
  onChange,
  onClear,
  onFocus,
  ariaLabel,
  clearAriaLabel,
  uieName,
}: CellsSearchInputProps) => (
  <div css={searchFieldStyles}>
    <SearchIcon css={searchIconStyles} />
    <input
      css={searchNativeInputStyles}
      type="text"
      value={value}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder}
      onFocus={onFocus}
      onChange={event => onChange(event.currentTarget.value)}
      data-uie-name={uieName}
    />
    {value && (
      <button type="button" css={clearButtonStyles} aria-label={clearAriaLabel} onClick={onClear}>
        <CircleCloseIcon color="currentColor" />
      </button>
    )}
  </div>
);
