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

import {sortIconStyles} from './CellsSortIcon.styles';

export type CellsSortDirection = 'asc' | 'desc';

interface CellsSortIconProps {
  direction?: CellsSortDirection;
}

export const CellsSortIcon = ({direction}: CellsSortIconProps) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      css={sortIconStyles}
      aria-hidden="true"
      data-uie-name="cells-sort-icon"
      data-uie-value={direction ?? 'none'}
    >
      {direction === 'desc' && (
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M11.1562 9.7373L12.6611 8.2334L13.5889 9.16113L10.5 12.25L7.41113 9.16113L8.33887 8.2334L9.84375 9.7373V2.13477H11.1562V9.7373ZM2.625 11.375H0.694336L0 11.3711V9.84766L0.694336 9.84375H2.625V11.375ZM4.375 7.875H0V6.34375H4.375V7.875ZM6.125 4.375H0V2.84375H6.125V4.375Z"
          fill="currentColor"
        />
      )}
      {direction === 'asc' && (
        <>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M6.125 11.375H0V9.84375H6.125V11.375ZM4.375 7.875H0V6.34375H4.375V7.875ZM2.625 4.375H0.694336L0 4.37109V2.84766L0.694336 2.84375H2.625V4.375Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M13.5889 5.22363L12.6611 6.15137L11.1562 4.64648V12.25H9.84375V4.64648L8.33887 6.15137L7.41113 5.22363L10.5 2.13477L13.5889 5.22363Z"
            fill="currentColor"
          />
        </>
      )}
      {direction === undefined && (
        <>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.7451 9.7373L12.25 8.2334L13.1777 9.16113L10.0889 12.25L7 9.16113L7.92773 8.2334L9.43262 9.7373V2.13477H10.7451V9.7373Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M3.30762 4.64648L1.80273 6.15137L0.875001 5.22363L3.96387 2.13477L7.05273 5.22363L6.125 6.15137L4.62012 4.64648L4.62012 12.25L3.30762 12.25L3.30762 4.64648Z"
            fill="currentColor"
          />
        </>
      )}
    </svg>
  );
};
