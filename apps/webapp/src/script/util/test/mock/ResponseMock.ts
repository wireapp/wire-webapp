/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

type ResponseMockInit = {
  readonly status?: number;
  readonly statusText?: string;
};

class ResponseMock {
  public readonly ok: boolean;
  public readonly responseText: string;
  public readonly status: number;
  public readonly statusText: string;

  constructor(responseText: string = '', responseMockInit: ResponseMockInit = {}) {
    const {status = 200, statusText = 'OK'} = responseMockInit;

    this.ok = status >= 200 && status < 300;
    this.responseText = responseText;
    this.status = status;
    this.statusText = statusText;
  }

  public readonly json = jest.fn().mockImplementation(() => {
    return Promise.resolve(this.responseText ? JSON.parse(this.responseText) : {});
  });

  public readonly text = jest.fn().mockImplementation(() => {
    return Promise.resolve(this.responseText);
  });
}

Object.defineProperty(window, 'Response', {
  value: ResponseMock,
  writable: true,
});
