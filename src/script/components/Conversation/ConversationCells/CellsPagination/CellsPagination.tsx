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

import React, {useCallback} from 'react';

import {FlexBox, Bold, Link, IconButton, Select} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';

import {
  pagesContainerStyles,
  numberStyles,
  numberActiveStyles,
  arrowButtonStyles,
  arrowNextIconStyles,
  arrowPreviousIconStyles,
  containerStyles,
  selectorStyles,
  pageSelectorContainer,
} from './CellsPagination.styles';

import {useCellsStore} from '../common/useCellsStore/useCellsStore';

interface CellsPaginationProps {
  currentPage?: number;
  numberOfPages?: number;
  firstRow?: number;
  lastRow?: number;
  totalRows?: number;
  goPage: (pageIndex: number) => void;
  [key: string]: any;
}

export const CellsPagination: React.FC<CellsPaginationProps> = ({
  currentPage = 0,
  numberOfPages = 1,
  goPage,
  firstRow = 1,
  lastRow,
  totalRows,
  ...props
}) => {
  const isLastPage = currentPage === numberOfPages - 1;
  const isFirstPage = currentPage === 0;

  const {pageSize, setPageSize} = useCellsStore();

  const onSizeChange = useCallback(
    (value: {value: string; label: string}) => {
      setPageSize(parseInt(value.value));
    },
    [setPageSize],
  );

  const renderPageList = () => {
    const lastPageIndex = numberOfPages - 1;
    const spanLength = 1;
    const endLength = 1;
    const skipLength = 1;
    const normalizeCount = endLength + skipLength + spanLength;

    const dots = (key: string) => (
      <Bold css={numberStyles} key={key}>
        …
      </Bold>
    );

    const renderPageNumber = (pageIndex: number) =>
      currentPage === pageIndex ? (
        <Bold key={pageIndex} css={{...numberStyles, ...numberActiveStyles}} data-uie-name="status-active-page">
          {pageIndex + 1}
        </Bold>
      ) : (
        <Link css={numberStyles} key={pageIndex} onClick={() => goPage(pageIndex)} data-uie-name="go-page">
          {pageIndex + 1}
        </Link>
      );

    const normalizedCurrent = Math.min(Math.max(currentPage, normalizeCount), lastPageIndex - normalizeCount);
    const beforeCount = normalizedCurrent - spanLength - endLength;
    const afterCount = lastPageIndex - endLength - normalizedCurrent - spanLength;

    const pages = Array.from({length: numberOfPages}, (_, index) => renderPageNumber(index));

    if (afterCount > skipLength) {
      pages.splice(normalizedCurrent + spanLength + 1, afterCount, dots('dots-end'));
    }
    if (beforeCount > skipLength) {
      pages.splice(endLength, beforeCount, dots('dots-start'));
    }

    return pages;
  };

  const options = [
    {value: '10', label: '10'},
    {value: '20', label: '20'},
    {value: '50', label: '50'},
    {value: '100', label: '100'},
  ];
  const crtValue = {value: `${pageSize}`, label: `${pageSize}`};

  // @ts-ignore
  return (
    <FlexBox css={containerStyles}>
      <div style={{flex: 1}}>
        {firstRow}-{lastRow} out of {totalRows}
      </div>
      {numberOfPages > 1 && (
        <FlexBox css={pagesContainerStyles} align="flex-end" data-uie-name="element-pagination" {...props}>
          <div className={'previous-page'}>
            {!isFirstPage && (
              <IconButton
                onClick={() => goPage(currentPage - 1)}
                data-uie-name="go-previous-page"
                css={arrowButtonStyles}
                title={'Previous page - TODO TRANSLATE ME'}
              >
                <Icon.ArrowNextIcon css={arrowPreviousIconStyles} />
              </IconButton>
            )}
          </div>

          <div className={'list-pages'} data-uie-name="list-pages">
            {renderPageList()}
          </div>

          <div className={'next-page'}>
            {!isLastPage && (
              <IconButton
                onClick={() => goPage(currentPage + 1)}
                data-uie-name="go-next-page"
                css={arrowButtonStyles}
                title={'Next page - TODO TRANSLATE ME'}
              >
                <Icon.ArrowNextIcon css={arrowNextIconStyles} />
              </IconButton>
            )}
          </div>
        </FlexBox>
      )}
      <div css={pageSelectorContainer}>
        <div className={'rows-per-page-label'}>Rows per page</div>
        <div style={{paddingTop: 20}}>
          <Select
            id={'page-size'}
            dataUieName={'row-page-size'}
            options={options}
            css={selectorStyles}
            value={crtValue}
            menuPlacement={'top'}
            // @ts-ignore
            onChange={onSizeChange}
          />
        </div>
      </div>
    </FlexBox>
  );
};
