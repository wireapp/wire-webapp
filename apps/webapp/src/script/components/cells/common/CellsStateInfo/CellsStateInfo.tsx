/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {SearchIcon} from '@wireapp/react-ui-kit';

import {
  headingStyles,
  paragraphStyles,
  searchHeadingStyles,
  searchIconStyles,
  searchParagraphStyles,
  searchStateWrapperStyles,
  searchTextWrapperStyles,
  searchWrapperStyles,
  wrapperStyles,
} from './CellsStateInfo.styles';

type DefaultCellsStateInfoProps = {
  heading?: string;
  description: string;
  variant?: 'default';
};

type SearchCellsStateInfoProps = {
  heading: string;
  description: string;
  variant: 'search';
};

type CellsStateInfoProps = DefaultCellsStateInfoProps | SearchCellsStateInfoProps;

export const CellsStateInfo = ({heading, description, variant = 'default'}: CellsStateInfoProps) => {
  if (variant === 'search') {
    return (
      <div css={searchStateWrapperStyles} role="status">
        <div css={searchWrapperStyles}>
          <SearchIcon css={searchIconStyles} aria-hidden="true" />
          <div css={searchTextWrapperStyles}>
            {heading !== undefined && heading.length > 0 && <h3 css={searchHeadingStyles}>{heading}</h3>}
            <p css={searchParagraphStyles}>{description}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div css={wrapperStyles}>
      {heading !== undefined && heading.length > 0 && <h3 css={headingStyles}>{heading}</h3>}
      <p css={paragraphStyles}>{description}</p>
    </div>
  );
};
