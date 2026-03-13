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

import {User} from 'Repositories/entity/User';

import {$createMentionNode, MentionNode} from '../nodes/MentionNode';

import {parseMentions} from './parseMentions';
import {serializeMessage} from './serializeMessage';

describe('parseMentions', () => {
  it('keeps multiline mention offsets aligned with preview-off serialization', () => {
    const editor = createEditor({nodes: [MentionNode]});

    editor.update(
      () => {
        const root = $getRoot();

        const firstParagraph = $createParagraphNode();
        firstParagraph.append($createTextNode('hello '), $createMentionNode('@', 'Alice'));

        const secondParagraph = $createParagraphNode();
        secondParagraph.append($createTextNode('https://wire.com/'));

        root.append(firstParagraph, secondParagraph);
      },
      {discrete: true},
    );

    const user = new User('11111111-1111-4111-8111-111111111111', 'wire.test');
    user.name('Alice');

    const serializedMessage = editor.getEditorState().read(() => serializeMessage(false));
    const mentions = parseMentions(editor, serializedMessage, [user]);

    expect(serializedMessage).toBe('hello @Alice\nhttps://wire.com/');
    expect(mentions).toHaveLength(1);
    expect(mentions[0].startIndex).toBe(6);
    expect(mentions[0].length).toBe(6);
    expect(mentions[0].userId).toBe('11111111-1111-4111-8111-111111111111');
    expect(mentions[0].domain).toBe('wire.test');
  });

  it('keeps mention offsets aligned after an intentional empty line', () => {
    const editor = createEditor({nodes: [MentionNode]});

    editor.update(
      () => {
        const root = $getRoot();

        const firstParagraph = $createParagraphNode();
        firstParagraph.append($createTextNode('first line'));

        const emptyParagraph = $createParagraphNode();

        const thirdParagraph = $createParagraphNode();
        thirdParagraph.append($createMentionNode('@', 'Alice'));

        root.append(firstParagraph, emptyParagraph, thirdParagraph);
      },
      {discrete: true},
    );

    const user = new User('11111111-1111-4111-8111-111111111111', 'wire.test');
    user.name('Alice');

    const serializedMessage = editor.getEditorState().read(() => serializeMessage(false));
    const mentions = parseMentions(editor, serializedMessage, [user]);

    expect(serializedMessage).toBe('first line\n\n@Alice');
    expect(mentions).toHaveLength(1);
    expect(mentions[0].startIndex).toBe(12);
  });
});