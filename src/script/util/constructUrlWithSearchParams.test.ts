/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {constructUrlWithSearchParams} from './constructUrlWithSearchParams';

const BASE_URL = 'https://google.com/api';
const BASE_URL_WITH_PARAM = `${BASE_URL}?query=cat`;
const BASE_URL_WITH_MANY_PARAMS = `${BASE_URL}?query=cat&size=big&limit=5`;

describe('constructUrlWithSearchParams', () => {
  it('does not change the url when no params provided', () => {
    const urlWithParams = constructUrlWithSearchParams(BASE_URL, {});
    expect(urlWithParams).toEqual(`${BASE_URL}`);
  });

  it('adds one param to base url', () => {
    const urlWithParams = constructUrlWithSearchParams(BASE_URL, {query: 'dog'});
    expect(urlWithParams).toEqual(`${BASE_URL}?query=dog`);
  });

  it('adds many params to base url', () => {
    const urlWithParams = constructUrlWithSearchParams(BASE_URL, {limit: '5', query: 'dog', size: 'big'});
    expect(urlWithParams).toEqual(`${BASE_URL}?limit=5&query=dog&size=big`);
  });

  it('replaces param when it was in base url before', () => {
    const urlWithParams = constructUrlWithSearchParams(BASE_URL_WITH_PARAM, {query: 'dog'});
    expect(urlWithParams).toEqual(`${BASE_URL}?query=dog`);
  });

  it('does not change not specified params', () => {
    const urlWithParams = constructUrlWithSearchParams(BASE_URL_WITH_MANY_PARAMS, {query: 'dog'});
    expect(urlWithParams).toEqual(`${BASE_URL}?query=dog&size=big&limit=5`);

    const urlWithParams2 = constructUrlWithSearchParams(BASE_URL_WITH_MANY_PARAMS, {size: 'small'});
    expect(urlWithParams2).toEqual(`${BASE_URL}?query=cat&size=small&limit=5`);
  });
});
