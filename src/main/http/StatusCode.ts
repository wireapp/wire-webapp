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

export enum StatusCode {
  ACCEPTED = 202,
  BAD_GATEWAY = 502,
  BAD_REQUEST = 400,
  CONFLICT = 409,
  CONNECTIVITY_PROBLEM = 0,
  CREATED = 201,
  FORBIDDEN = 403,
  INTERNAL_SERVER_ERROR = 500,
  NO_CONTENT = 204,
  NOT_FOUND = 404,
  OK = 200,
  PRECONDITION_FAILED = 412,
  REQUEST_TIMEOUT = 408,
  REQUEST_TOO_LARGE = 413,
  TOO_MANY_REQUESTS = 429,
  UNAUTHORIZED = 401,
  UNKNOWN = -1,
}
