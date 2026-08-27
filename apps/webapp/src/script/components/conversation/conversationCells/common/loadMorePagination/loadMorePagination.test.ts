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
  it('returns Nothing when pagination is missing', () => {
    expect(getLoadMoreOffset(null).isNothing).toBe(true);
  });

  it('returns Nothing when next offset is missing', () => {
    expect(getLoadMoreOffset({currentPage: 1, totalPages: 2}).isNothing).toBe(true);
  });

  it('returns Just(nextOffset) when page count is not available', () => {
    const result = getLoadMoreOffset({nextOffset: 30});
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(-1)).toBe(30);
  });

  it('returns Just(nextOffset) when another page is available', () => {
    const result = getLoadMoreOffset({nextOffset: 50, currentPage: 1, totalPages: 2});
    expect(result.isJust).toBe(true);
    expect(result.unwrapOr(-1)).toBe(50);
  });

  it('returns Nothing when the current page is the last page', () => {
    expect(getLoadMoreOffset({nextOffset: 50, currentPage: 2, totalPages: 2}).isNothing).toBe(true);
  });
});
