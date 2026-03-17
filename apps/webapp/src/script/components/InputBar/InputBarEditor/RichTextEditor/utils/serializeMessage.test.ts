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

import {$createParagraphNode, $createTextNode, $getRoot, createEditor} from 'lexical';

import {serializeMessage} from './serializeMessage';

describe('serializeMessage', () => {
  const createEditorWithParagraphs = (paragraphs: string[]) => {
    const editor = createEditor();

    editor.update(
      () => {
        const root = $getRoot();

        paragraphs.forEach(text => {
          const paragraph = $createParagraphNode();

          paragraph.append($createTextNode(text));
          root.append(paragraph);
        });
      },
      {discrete: true},
    );

    return editor;
  };

  it('preserves raw markdown markers when preview is disabled', () => {
    const editor = createEditorWithParagraphs(['**bold** _italic_']);

    const message = editor.getEditorState().read(() => serializeMessage(false));

    expect(message).toBe('**bold** _italic_');
  });

  it('preserves a single line break between paragraphs when preview is disabled', () => {
    const editor = createEditorWithParagraphs(['check this out', 'https://wire.com/']);

    const message = editor.getEditorState().read(() => serializeMessage(false));

    expect(message).toBe('check this out\nhttps://wire.com/');
  });

  it('preserves intentional empty lines when preview is disabled', () => {
    const editor = createEditorWithParagraphs(['first line', '', 'third line']);

    const message = editor.getEditorState().read(() => serializeMessage(false));

    expect(message).toBe('first line\n\nthird line');
  });

  it('uses Lexical markdown serialization when preview is enabled', () => {
    const editor = createEditorWithParagraphs(['**bold** _italic_']);

    const message = editor.getEditorState().read(() => serializeMessage(true));

    expect(message).toBe('\\*\\*bold\\*\\* \\_italic\\_');
  });
});
