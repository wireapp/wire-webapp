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

export type ParseAccountDeepLink =
  | {type: 'user-profile'; id: string; domain?: string}
  | {type: 'conversation-join'; key: string; code: string; domain?: string}
  | null;

const normalizePath = (pathname: string): string => pathname.replace(/\/+$/, '');

const normalizeOrigin = (url: URL): string => url.origin.toLowerCase();

export const parseAccountDeepLink = (href: string, accountBase?: string): ParseAccountDeepLink => {
  if (!href || !accountBase) {
    return null;
  }
  let linkUrl: URL;
  let accountBaseUrl: URL;

  try {
    linkUrl = new URL(href);
    accountBaseUrl = new URL(accountBase);
  } catch {
    return null;
  }

  if (normalizeOrigin(linkUrl) !== normalizeOrigin(accountBaseUrl)) {
    return null;
  }

  const pathname = normalizePath(linkUrl.pathname);

  if (pathname === '/user-profile') {
    const id = linkUrl.searchParams.get('id');
    const domain = linkUrl.searchParams.get('domain') || undefined;

    if (!id) {
      return null;
    }

    return {type: 'user-profile', id, domain};
  }
  if (pathname === '/conversation-join') {
    const key = linkUrl.searchParams.get('key');
    const code = linkUrl.searchParams.get('code');
    const domain = linkUrl.searchParams.get('domain') || undefined;

    if (!key || !code) {
      return null;
    }
    return {type: 'conversation-join', key, code, domain};
  }

  return null;
};
