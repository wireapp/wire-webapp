/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

const TargetURLKey = 'E2EIdentity_OIDCService_TargetURL';
const RefreshTokenKey = 'E2EIdentity_OIDCService_RefreshToken';
const OIDCServiceStore = {
  store: {
    targetURL: (url: string) => localStorage.setItem(TargetURLKey, url),
    refreshToken: (refreshToken: string) => localStorage.setItem(RefreshTokenKey, refreshToken),
  },
  get: {
    targetURL: () => localStorage.getItem(TargetURLKey),
    refreshToken: () => localStorage.getItem(RefreshTokenKey),
  },
  has: {
    targetURL: () => localStorage.getItem(TargetURLKey) !== null,
    refreshToken: localStorage.getItem(RefreshTokenKey) !== null,
  },
  clear: {
    targetURL: () => localStorage.removeItem(TargetURLKey),
    refreshToken: () => localStorage.removeItem(RefreshTokenKey),
    all: () => {
      OIDCServiceStore.clear.targetURL();
      OIDCServiceStore.clear.refreshToken();
    },
  },
};

export {OIDCServiceStore};
