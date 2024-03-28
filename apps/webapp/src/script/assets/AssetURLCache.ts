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

const cache = new Map<string, Promise<string>>();

export const getAssetUrl = (identifier: string): Promise<string> | undefined => cache.get(identifier);

export const setAssetUrl = (identifier: string, url: Promise<string>) => {
  const isExistingUrl = getAssetUrl(identifier);

  if (!isExistingUrl) {
    cache.set(identifier, url);
  }

  return url;
};
