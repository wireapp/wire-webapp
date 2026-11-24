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

/** map of all the features that the backend supports (depending on the backend api version number) */
export type BackendFeatures = {
  /** The actual version used to communicate with backend */
  version: number;
  /** Does the backend API support federated endpoints */
  federationEndpoints: boolean;
  /** Is the backend actually talking to other federated domains */
  isFederated: boolean;
  /** Does the backend API support MLS features */
  supportsMLS: boolean;
  /** Does the backend API support creating guest links with password */
  supportsGuestLinksWithPassword: boolean;
  domain: string;
};
