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

import {MenuTextMatch} from '@lexical/react/LexicalTypeaheadMenuPlugin';

import {TRIGGERS, VALID_CHARS, VALID_JOINS, LENGTH_LIMIT} from 'Components/LexicalInput/utils/getSelectionInfo';

function createEmojisRegex(triggers: string[], allowSpaces: boolean) {
  return new RegExp(
    `(^|(?<!\\\\s))(${TRIGGERS(triggers)}((?:${
      VALID_CHARS(triggers) + (allowSpaces ? VALID_JOINS : '')
    }){0,${LENGTH_LIMIT}})` + `)$`,
  );
}

export function checkForEmojis(text: string, triggers: string[], allowSpaces: boolean): MenuTextMatch | null {
  const match = createEmojisRegex(triggers, allowSpaces).exec(text);

  if (match !== null) {
    // The strategy ignores leading whitespace, but we need to know its
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];
    const matchingStringWithTrigger = match[2];
    const matchingString = match[3];

    if (matchingStringWithTrigger.length >= 1) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString: matchingString,
        replaceableString: matchingStringWithTrigger,
      };
    }
  }

  return null;
}
