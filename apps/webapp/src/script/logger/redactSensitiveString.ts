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

const redactedValue = '[REDACTED]';
const loggableUrlPattern = /\b(?:wss?|https?):\/\/[^\s"'<>]+/giu;
const sensitiveQueryParameterPattern =
  /\b(access_token|sync_marker|marker_token|token|client|client_id)=([^&\s"']*)/giu;
const bearerCredentialPattern = /\b(authorization\s*:\s*)?bearer\s+[^\s,;]+/giu;
const cookieHeaderPattern = /\b(?:set-cookie|cookie)\s*:\s*[^;\s]*(?:;[^\r\n]*)?/giu;
const jsonWebTokenPattern = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu;

function sanitizeUrlForLog(urlValue: string): string {
  try {
    const url = new URL(urlValue);
    return url.search.length > 0 ? `${url.origin}${url.pathname}?${redactedValue}` : `${url.origin}${url.pathname}`;
  } catch {
    return urlValue;
  }
}

export function redactSensitiveString(value: string): string {
  const valueWithSanitizedUrls = value.replace(loggableUrlPattern, sanitizeUrlForLog);
  const valueWithSanitizedQueryParameters = valueWithSanitizedUrls.replace(
    sensitiveQueryParameterPattern,
    `$1=${redactedValue}`,
  );
  const valueWithSanitizedHeaders = valueWithSanitizedQueryParameters
    .replace(bearerCredentialPattern, (_matchedValue, authorizationPrefix: string | undefined) => {
      return `${authorizationPrefix ?? ''}Bearer ${redactedValue}`;
    })
    .replace(cookieHeaderPattern, `Cookie: ${redactedValue}`);

  return valueWithSanitizedHeaders.replace(jsonWebTokenPattern, redactedValue);
}
