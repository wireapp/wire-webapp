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

import {$createAutoLinkNode, $createLinkNode} from '@lexical/link';
import {createEditor} from 'lexical';

import {LINK_WITH_UNESCAPED_UNDERSCORES} from './linkWithUnescapedUnderscoresTransformer';

describe('LINK_WITH_UNESCAPED_UNDERSCORES', () => {
  const runInEditor = (assertion: () => void) => {
    const editor = createEditor();

    editor.update(assertion, {discrete: true});
  };

  it('exports a markdown link with unescaped underscores in the url', () => {
    runInEditor(() => {
      const linkNode = $createLinkNode('https://example.com/path\\_with\\_underscores');
      const exportChildren = () => 'Example';

      const exported = LINK_WITH_UNESCAPED_UNDERSCORES.export?.(linkNode, exportChildren, () => '');

      expect(exported).toBe('[Example](https://example.com/path_with_underscores)');
    });
  });

  it('preserves link title while unescaping underscores in the url', () => {
    runInEditor(() => {
      const linkNode = $createLinkNode('https://example.com/path\\_with\\_underscores', {title: 'My title'});
      const exportChildren = () => 'Example';

      const exported = LINK_WITH_UNESCAPED_UNDERSCORES.export?.(linkNode, exportChildren, () => '');

      expect(exported).toBe('[Example](https://example.com/path_with_underscores "My title")');
    });
  });

  it('does not export autolink nodes', () => {
    runInEditor(() => {
      const autoLinkNode = $createAutoLinkNode('https://example.com/path\\_with\\_underscores');
      const exportChildren = () => 'https://example.com/path_with_underscores';

      const exported = LINK_WITH_UNESCAPED_UNDERSCORES.export?.(autoLinkNode, exportChildren, () => '');

      expect(exported).toBeNull();
    });
  });
});
