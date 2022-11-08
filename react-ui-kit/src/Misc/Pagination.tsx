/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import * as React from 'react';

import {COLOR} from '../Identity';
import {FlexBox} from '../Layout';
import {Bold, Link} from '../Text';

interface PaginationProps<T = HTMLDivElement> extends React.PropsWithRef<React.HTMLProps<T>> {
  currentPage?: number;
  goPage?: (page: number) => void;
  nextPageComponent?: any;
  numberOfPages?: number;
  previousPageComponent?: any;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage = 0,
  numberOfPages = 1,
  goPage,
  previousPageComponent: PreviousPageComponent = () => '<',
  nextPageComponent: NextPageComponent = () => '>',
  ...props
}) => {
  const isLastPage = currentPage === numberOfPages - 1;
  const isFirstPage = currentPage === 0;

  const renderPageList = () => {
    const lastPageIndex = numberOfPages - 1;
    const spanLength = 1;
    const endLength = 1;
    const skipLength = 1;
    const normalizeCount = endLength + skipLength + spanLength;
    const dots = (key: string) => (
      <Bold key={key} fontSize={'11px'}>
        {'…'}
      </Bold>
    );
    const renderPageNumber = pageIndex =>
      currentPage === pageIndex ? (
        <Bold
          fontSize={'11px'}
          key={pageIndex}
          style={{color: COLOR.BLUE, margin: '0 8px'}}
          data-uie-name="status-active-page"
        >
          {pageIndex + 1}
        </Bold>
      ) : (
        <Link key={pageIndex} style={{margin: '0 8px'}} onClick={() => goPage(pageIndex)} data-uie-name="go-page">
          {pageIndex + 1}
        </Link>
      );

    const normalizedCurrent = Math.min(Math.max(currentPage, normalizeCount), lastPageIndex - normalizeCount);
    const beforeCount = normalizedCurrent - spanLength - endLength;
    const afterCount = lastPageIndex - endLength - normalizedCurrent - spanLength;

    const pages = Array.from(Array(numberOfPages), (_, index) => renderPageNumber(index));
    if (afterCount > skipLength) {
      pages.splice(normalizedCurrent + spanLength + 1, afterCount, dots('dots-end'));
    }
    if (beforeCount > skipLength) {
      pages.splice(endLength, beforeCount, dots('dots-start'));
    }

    return pages;
  };

  return (
    <FlexBox align="flex-end" data-uie-name="element-pagination" {...props}>
      <div css={{flexBasis: 100}}>
        {!isFirstPage && (
          <Link block onClick={() => goPage(currentPage - 1)} data-uie-name="go-previous-page">
            <PreviousPageComponent />
          </Link>
        )}
      </div>
      <div
        css={{alignItems: 'flex-end', display: 'flex', flexDirection: 'row', margin: '0 auto'}}
        data-uie-name="list-pages"
      >
        {renderPageList()}
      </div>
      <div css={{display: 'flex', flexBasis: 100, justifyContent: 'flex-end'}}>
        {!isLastPage && (
          <Link block onClick={() => goPage(currentPage + 1)} data-uie-name="go-next-page">
            <NextPageComponent />
          </Link>
        )}
      </div>
    </FlexBox>
  );
};
