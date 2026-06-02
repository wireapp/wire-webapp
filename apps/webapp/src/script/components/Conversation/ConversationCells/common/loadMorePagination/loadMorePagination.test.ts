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

import {getLoadMoreOffset} from './loadMorePagination';

describe('getLoadMoreOffset', () => {
  it('returns null when pagination is missing', () => {
    expect(getLoadMoreOffset(null)).toBeNull();
  });

  it('returns null when next offset is missing', () => {
    expect(getLoadMoreOffset({currentPage: 1, totalPages: 2})).toBeNull();
  });

  it('returns next offset when page count is not available', () => {
    expect(getLoadMoreOffset({nextOffset: 30})).toBe(30);
  });

  it('returns next offset when another page is available', () => {
    expect(getLoadMoreOffset({nextOffset: 50, currentPage: 1, totalPages: 2})).toBe(50);
  });

  it('returns null when the current page is the last page', () => {
    expect(getLoadMoreOffset({nextOffset: 50, currentPage: 2, totalPages: 2})).toBeNull();
  });
});
