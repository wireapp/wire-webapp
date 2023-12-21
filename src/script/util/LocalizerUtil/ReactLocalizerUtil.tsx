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

type Replacement =
  | {
      start: string;
      end: string;
      render: (text: string) => React.ReactNode;
    }
  | {
      start: string;
      render: () => React.ReactNode;
    };

function sanitizeRegexp(text: string) {
  return text.replaceAll('[', '\\[').replaceAll(']', '\\]');
}

export const generateLinkReplacement = (href: string, className: string = '', uieName: string = ''): Replacement => {
  return {
    start: '[link]',
    end: '[/link]',
    render: content => (
      <a href={href} data-uie-name={uieName} className={className} rel="nofollow noopener noreferrer" target="_blank">
        {content}
      </a>
    ),
  };
};

const defaultReplacements: Replacement[] = [
  {
    start: '[br]',
    render: () => <br />,
  },
];

/**
 * Will replace all occurences of `replacements` by a React component returned by `render`.
 */

export function replaceReactComponents(html: string, replacements: Replacement[]): React.ReactNode[] {
  const allReplacements = replacements.concat(defaultReplacements);

  const splitRegexp = new RegExp(
    `(${allReplacements
      .map(replacement =>
        'end' in replacement
          ? `${sanitizeRegexp(replacement.start)}.+?${sanitizeRegexp(replacement.end)}`
          : sanitizeRegexp(replacement.start),
      )
      .join('|')})`,
    'g',
  );

  return html
    .split(splitRegexp)
    .map(node => {
      const match = allReplacements.find(
        replacement =>
          node.startsWith(replacement.start) && (!('end' in replacement) || node.endsWith(replacement.end)),
      );

      if (match) {
        const length = 'end' in match ? node.length - match.end.length : node.length;
        const text = node.substring(match.start.length, length);
        return match.render(text);
      }
      return node;
    })
    .filter(Boolean);
}
