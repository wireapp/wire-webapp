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

type ParsedQualifiedId = {
  id: string;
  domain?: string;
};

const parseQualifiedUserId = (value: string): ParsedQualifiedId => {
  const atIndex = value.lastIndexOf('@');
  if (atIndex <= 0) {
    return {id: value};
  }

  return {
    id: value.slice(0, atIndex),
    domain: value.slice(atIndex + 1) || undefined,
  };
};

const normalizePath = (pathname: string): string => {
  let end = pathname.length;

  while (end > 0 && pathname[end - 1] === '/') {
    end--;
  }

  return pathname.slice(0, end);
};

const normalizeOrigin = (url: URL): string => url.origin.toLowerCase();

export const parseAccountDeepLink = (href: string, accountBase?: string): ParseAccountDeepLink => {
  if (href.length === 0 || accountBase === undefined || accountBase.length === 0) {
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
    const rawId = linkUrl.searchParams.get('id');
    const explicitDomain = linkUrl.searchParams.get('domain');

    if (rawId === null || rawId.length === 0) {
      return null;
    }

    const qualified = parseQualifiedUserId(rawId);
    const resolvedDomain = explicitDomain === null || explicitDomain.length === 0 ? qualified.domain : explicitDomain;

    return {type: 'user-profile', id: qualified.id, domain: resolvedDomain};
  }

  if (pathname === '/conversation-join') {
    const key = linkUrl.searchParams.get('key');
    const code = linkUrl.searchParams.get('code');
    const domainQueryParameter = linkUrl.searchParams.get('domain');
    const domain =
      domainQueryParameter === null || domainQueryParameter.length === 0 ? undefined : domainQueryParameter;

    if (key === null || key.length === 0 || code === null || code.length === 0) {
      return null;
    }
    return {type: 'conversation-join', key, code, domain};
  }

  return null;
};
