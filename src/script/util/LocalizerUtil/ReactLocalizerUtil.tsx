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

interface ComponentReplacement {
  start: string;
  end: string;
  render: (text: string) => React.ReactNode;
}

interface StringReplacement {
  exactMatch: string;
  render: () => React.ReactNode | string;
}

type Replacement = ComponentReplacement | StringReplacement;

function sanitizeRegexp(text: string) {
  return text.replaceAll('[', '\\[').replaceAll(']', '\\]');
}

/**
 * Will replace all occurences of `replacements` by a React component returned by `render`.
 */
export function replaceReactComponents(html: string, replacements: Replacement[]): React.ReactNode[] {
  const [stringReplacements, componentReplacements] = replacements.reduce(
    (acc, replacement) => {
      if ('exactMatch' in replacement) {
        acc[0].push(replacement);
      } else {
        acc[1].push(replacement);
      }
      return acc;
    },
    [[], []] as [StringReplacement[], ComponentReplacement[]],
  );

  if (!componentReplacements.length && !stringReplacements.length) {
    return [html];
  }

  const componentsSplitRegexpStr = componentReplacements.length
    ? `(${componentReplacements
        .map(replacement => `${sanitizeRegexp(replacement.start)}.+?${sanitizeRegexp(replacement.end)}`)
        .join('|')})`
    : null;

  const stringSplitRegexpStr = stringReplacements.length
    ? `(${stringReplacements.map(replacement => sanitizeRegexp(replacement.exactMatch)).join('|')})`
    : null;

  const regexpStr = [componentsSplitRegexpStr, stringSplitRegexpStr].filter(Boolean).join('|');

  const splitRegexp = new RegExp(regexpStr, 'g');

  return html
    .split(splitRegexp)
    .map(node => {
      if (!node) {
        return false;
      }
      const componentsReplacementMatch = componentReplacements.find(
        replacement => node.startsWith(replacement.start) && node.endsWith(replacement.end),
      );

      if (componentsReplacementMatch) {
        const text = node.substring(
          componentsReplacementMatch.start.length,
          node.length - componentsReplacementMatch.end.length,
        );

        // There is a special case where we have a string replacement inside a component replacement.
        if (stringSplitRegexpStr) {
          const regexp = new RegExp(stringSplitRegexpStr, 'g');
          const split = text.split(regexp);
          return split
            .map(node => {
              const stringReplacementMatch = stringReplacements.find(replacement => node === replacement.exactMatch);
              if (stringReplacementMatch) {
                return stringReplacementMatch.render();
              }
              return componentsReplacementMatch.render(node);
            })
            .filter(Boolean)
            .map((node, index) => <React.Fragment key={index}>{node}</React.Fragment>);
        }

        return componentsReplacementMatch.render(text);
      }

      const stringReplacementMatch = stringReplacements.find(replacement => node === replacement.exactMatch);

      if (stringReplacementMatch) {
        return stringReplacementMatch.render();
      }

      return node;
    })
    .filter(Boolean)
    .map((node, index) => <React.Fragment key={index}>{node}</React.Fragment>); // Make sure we have a different key for each node.
}
