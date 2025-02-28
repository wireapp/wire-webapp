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

  it('should show correct active dot', () => {
    const {getAllByTestId} = renderPagination({currentPage: 2});
    const dots = getAllByTestId(testIdentifiers.paginationItem);
    expect(dots[2]).toHaveAttribute('data-uie-status', 'active');
  });

  it('should disable previous button on first page', () => {
    const {getByTestId} = renderPagination({currentPage: 0});
    expect(getByTestId(testIdentifiers.paginationPrevious)).toBeDisabled();
  });

  it('should disable next button on last page', () => {
    const {getByTestId} = renderPagination({currentPage: 9});
    expect(getByTestId(testIdentifiers.paginationNext)).toBeDisabled();
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

  it('should adjusts visible dots for smaller total pages', () => {
    const {getAllByTestId} = renderPagination({totalPages: 3});
    expect(getAllByTestId(testIdentifiers.paginationItem)).toHaveLength(3);
  });
});
