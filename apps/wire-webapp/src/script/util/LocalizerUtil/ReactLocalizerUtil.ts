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

import React from 'react';

interface Replacement {
  start: string;
  end: string;
  render: (text: string) => React.ReactNode;
}

function sanitizeRegexp(text: string) {
  return text.replaceAll('[', '\\[').replaceAll(']', '\\]');
}

/**
 * Will replace all occurences of `replacements` by a React component returned by `render`.
 */
export function replaceReactComponents(html: string, replacements: Replacement[]): React.ReactNode[] {
  if (!replacements.length) {
    return [html];
  }
  const splitRegexp = new RegExp(
    `(${replacements
      .map(replacement => `${sanitizeRegexp(replacement.start)}.+?${sanitizeRegexp(replacement.end)}`)
      .join('|')})`,
    'g',
  );
  return html
    .split(splitRegexp)
    .map(node => {
      const match = replacements.find(
        replacement => node.startsWith(replacement.start) && node.endsWith(replacement.end),
      );

      if (match) {
        const text = node.substring(match.start.length, node.length - match.end.length);
        return match.render(text);
      }
      return node;
    })
    .filter(Boolean);
}
