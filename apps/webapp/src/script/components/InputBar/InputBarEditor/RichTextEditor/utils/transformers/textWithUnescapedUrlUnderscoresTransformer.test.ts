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

import {$createTextNode, createEditor} from 'lexical';

import {TEXT_WITH_UNESCAPED_URL_UNDERSCORES} from './textWithUnescapedUrlUnderscoresTransformer';

describe('unescaping URL underscores transformer', () => {
  const runInEditor = (assertion: () => void) => {
    const editor = createEditor();

    editor.update(assertion, {discrete: true});
  };

  it('unescapes underscores in URL tokens', () => {
    runInEditor(() => {
      const textNode = $createTextNode('https://example.com/path_with_underscores');

      const exported = TEXT_WITH_UNESCAPED_URL_UNDERSCORES.export?.(
        textNode,
        () => '',
        (_node, textContent) => textContent.replace(/_/g, '\\_'),
      );

      expect(exported).toBe('https://example.com/path_with_underscores');
    });
  });

  it('keeps non-url escaped underscores unchanged', () => {
    runInEditor(() => {
      const textNode = $createTextNode('this_is_not_a_url');

      const exported = TEXT_WITH_UNESCAPED_URL_UNDERSCORES.export?.(
        textNode,
        () => '',
        (_node, textContent) => textContent.replace(/_/g, '\\_'),
      );

      expect(exported).toBe('this\\_is\\_not\\_a\\_url');
    });
  });
});
