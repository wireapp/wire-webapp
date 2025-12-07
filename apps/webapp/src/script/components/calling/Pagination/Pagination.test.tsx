/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {render, fireEvent} from '@testing-library/react';
import {withTheme} from 'src/script/auth/util/test/TestUtil';

import {Pagination} from './Pagination';

const testIdentifiers = {
  paginationItem: 'pagination-item',
  paginationPrevious: 'pagination-previous',
  paginationNext: 'pagination-next',
};

describe('Pagination', () => {
  const onChangePageMock = jest.fn();

  const renderPagination = (props = {}) =>
    render(withTheme(<Pagination totalPages={10} currentPage={0} onChangePage={onChangePageMock} {...props} />));

  beforeEach(() => {
    onChangePageMock.mockClear();
  });

  it('should render correct number of dots', () => {
    const {getAllByTestId} = renderPagination();
    expect(getAllByTestId(testIdentifiers.paginationItem)).toHaveLength(5);
  });

  it('should adjust visible dots when total pages is less than default', () => {
    const {getAllByTestId} = renderPagination({totalPages: 3});
    expect(getAllByTestId(testIdentifiers.paginationItem)).toHaveLength(3);
  });

  it('should disable previous button on first page', () => {
    const {getByTestId} = renderPagination({currentPage: 0});
    expect(getByTestId(testIdentifiers.paginationPrevious)).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    const {getByTestId} = renderPagination({currentPage: 9});
    expect(getByTestId(testIdentifiers.paginationNext)).toBeDisabled();
  });

  it('should enable both buttons when on middle page', () => {
    const {getByTestId} = renderPagination({currentPage: 5, totalPages: 10});
    expect(getByTestId(testIdentifiers.paginationPrevious)).not.toBeDisabled();
    expect(getByTestId(testIdentifiers.paginationNext)).not.toBeDisabled();
  });

  it('should calls onChangePage when dot is clicked', () => {
    const {getAllByTestId} = renderPagination();
    fireEvent.click(getAllByTestId(testIdentifiers.paginationItem)[2]);
    expect(onChangePageMock).toHaveBeenCalledWith(2);
  });

  it('should navigates to next page when clicking next button', () => {
    const {getByTestId} = renderPagination({currentPage: 4});
    fireEvent.click(getByTestId(testIdentifiers.paginationNext));
    expect(onChangePageMock).toHaveBeenCalledWith(5);
  });

  it('should navigates to previous page when clicking previous button', () => {
    const {getByTestId} = renderPagination({currentPage: 4});
    fireEvent.click(getByTestId(testIdentifiers.paginationPrevious));
    expect(onChangePageMock).toHaveBeenCalledWith(3);
  });

  it('should not call onChangePage when clicking current page dot', () => {
    const {getAllByTestId} = renderPagination({currentPage: 2});
    fireEvent.click(getAllByTestId(testIdentifiers.paginationItem)[2]);
    expect(onChangePageMock).not.toHaveBeenCalled();
  });

  it('should show correct active dot for current page', () => {
    const {getAllByTestId} = renderPagination({currentPage: 2});
    const dots = getAllByTestId(testIdentifiers.paginationItem);
    expect(dots[2]).toHaveAttribute('data-uie-status', 'active');
  });

  it('should update active dot when page changes', () => {
    const {getAllByTestId, rerender} = renderPagination({currentPage: 1});
    rerender(withTheme(<Pagination totalPages={10} currentPage={2} onChangePage={onChangePageMock} />));
    const dots = getAllByTestId(testIdentifiers.paginationItem);
    expect(dots[2]).toHaveAttribute('data-uie-status', 'active');
  });

  it('should handle single page correctly', () => {
    const {queryByTestId} = renderPagination({totalPages: 1});
    expect(queryByTestId(testIdentifiers.paginationNext)).toBeDisabled();
    expect(queryByTestId(testIdentifiers.paginationPrevious)).toBeDisabled();
  });

  it('should maintain visible range when navigating to high page numbers', () => {
    const {getAllByTestId} = renderPagination({currentPage: 8, totalPages: 10});
    const dots = getAllByTestId(testIdentifiers.paginationItem);
    expect(dots).toHaveLength(5);

    // Verify that page 8 is active
    const activeDot = dots.find(dot => dot.getAttribute('data-uie-status') === 'active');
    expect(activeDot).toBeTruthy();
    expect(Number(activeDot?.getAttribute('data-page'))).toBe(8);
  });
});
