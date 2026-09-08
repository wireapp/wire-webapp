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

import {rootHomeIconStyles} from './cellsHeader.styles';

export const CellsRootHomeIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 14 14"
      fill="none"
      css={rootHomeIconStyles}
      aria-hidden="true"
      data-uie-name="cells-root-home-icon"
    >
      <path
        d="M1.08221 6.25145C1.08217 6.06387 1.12305 5.87854 1.202 5.70838C1.28095 5.53823 1.39608 5.38735 1.53935 5.26627L6.05263 1.39838C6.28537 1.20167 6.58027 1.09375 6.885 1.09375C7.18974 1.09375 7.48464 1.20167 7.71738 1.39838L12.2307 5.26627C12.3739 5.38735 12.4891 5.53823 12.568 5.70838C12.647 5.87854 12.6878 6.06387 12.6878 6.25145V12.0542C12.6878 12.3962 12.5519 12.7242 12.3101 12.9661C12.0683 13.2079 11.7403 13.3438 11.3983 13.3438H2.37172C2.02972 13.3438 1.70173 13.2079 1.4599 12.9661C1.21807 12.7242 1.08221 12.3962 1.08221 12.0542V6.25145Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.03125 13.6778H8.89978V8.51975C8.89978 8.34875 8.83185 8.18476 8.71093 8.06384C8.59002 7.94293 8.42602 7.875 8.25502 7.875H5.676C5.50501 7.875 5.34101 7.94293 5.22009 8.06384C5.09918 8.18476 5.03125 8.34875 5.03125 8.51975V13.6778Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
