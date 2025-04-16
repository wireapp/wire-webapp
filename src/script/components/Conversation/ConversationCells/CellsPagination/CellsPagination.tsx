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

import {useCallback} from 'react';

import {FlexBox, IconButton} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {CellsPageList} from './CellsPageList/CellsPageList';
import {CellsPageSizeSelect} from './CellsPageSizeSelect/CellsPageSizeSelect';
import {
  pagesContainerStyles,
  arrowButtonStyles,
  arrowNextIconStyles,
  arrowPreviousIconStyles,
  containerStyles,
  previousPageStyles,
  nextPageStyles,
  pageResultStyles,
} from './CellsPagination.styles';

interface CellsPaginationProps {
  currentPage?: number;
  numberOfPages?: number;
  firstRow?: number;
  lastRow?: number;
  totalRows?: number;
  goToPage: (pageIndex: number) => void;
  pageSize: number;
  setPageSize: (page: number) => void;
}

export const CellsPagination = ({
  currentPage = 0,
  numberOfPages = 1,
  goToPage,
  firstRow = 1,
  lastRow,
  totalRows,
  pageSize,
  setPageSize,
}: CellsPaginationProps) => {
  const isLastPage = currentPage === numberOfPages - 1;
  const isFirstPage = currentPage === 0;

  const onSizeChange = useCallback(
    ({value}: {value: string}) => {
      setPageSize(parseInt(value));
    },
    [setPageSize],
  );

  return (
    <FlexBox css={containerStyles}>
      <p css={pageResultStyles}>
        {totalRows && lastRow
          ? t('cellsGlobalView.pagination.resultsOutOf', {start: firstRow, end: lastRow, total: totalRows})
          : null}
      </p>
      {numberOfPages > 1 && (
        <FlexBox css={pagesContainerStyles} align="flex-end" data-uie-name="element-pagination">
          <div css={previousPageStyles}>
            {!isFirstPage && (
              <IconButton
                onClick={() => goToPage(currentPage - 1)}
                data-uie-name="go-previous-page"
                css={arrowButtonStyles}
                aria-label={t('cellsGlobalView.pagination.previousPage')}
                title={t('cellsGlobalView.pagination.previousPage')}
              >
                <Icon.ArrowNextIcon css={arrowPreviousIconStyles} />
              </IconButton>
            )}
          </div>

          <CellsPageList currentPage={currentPage} numberOfPages={numberOfPages} goToPage={goToPage} />

          <div css={nextPageStyles}>
            {!isLastPage && (
              <IconButton
                onClick={() => goToPage(currentPage + 1)}
                data-uie-name="go-next-page"
                css={arrowButtonStyles}
                aria-label={t('cellsGlobalView.pagination.nextPage')}
                title={t('cellsGlobalView.pagination.nextPage')}
              >
                <Icon.ArrowNextIcon css={arrowNextIconStyles} />
              </IconButton>
            )}
          </div>
        </FlexBox>
      )}
      <CellsPageSizeSelect pageSize={pageSize} onSizeChange={onSizeChange} />
    </FlexBox>
  );
};
