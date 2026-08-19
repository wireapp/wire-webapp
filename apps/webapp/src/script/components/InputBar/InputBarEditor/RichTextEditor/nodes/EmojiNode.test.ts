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
 */

import {assertNotNull} from '@sindresorhus/is';
import {$createParagraphNode, $getRoot, $nodesOfType, LexicalEditor} from 'lexical';

import {createWireLexicalEditorTestHarness, WireLexicalEditorTestHarness} from '../testSupport/createWireLexicalEditorTestHarness';

import {EmojiNode} from './EmojiNode';

function appendEmojiNode(editor: LexicalEditor, emojiText: string): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append(new EmojiNode(emojiText));
      $getRoot().clear().append(paragraphNode);
    },
    {discrete: true},
  );
}

function getEmojiNodeText(editor: LexicalEditor): string {
  return editor.getEditorState().read(() => {
    const [emojiNode] = $nodesOfType(EmojiNode);
    assertNotNull(emojiNode);
    return emojiNode.getTextContent();
  });
}

function getEmojiNodeCount(editor: LexicalEditor): number {
  return editor.getEditorState().read(() => $nodesOfType(EmojiNode).length);
}

describe('EmojiNode', () => {
  it('serializes its custom node type while preserving the emoji text', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    appendEmojiNode(harness.editor, '😀');

    const serializedEditorState = harness.editor.getEditorState().toJSON();
    const expectedSerializedEmoji = expect.objectContaining({type: 'emoji', text: '😀'});

    expect(serializedEditorState.root.children).toEqual([
      expect.objectContaining({children: [expectedSerializedEmoji]}),
    ]);
  });

  it('restores its custom node type from serialized editor state', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    appendEmojiNode(harness.editor, '🧪');

    const serializedEditorState = harness.editor.getEditorState().toJSON();
    const restoredEditorState = harness.editor.parseEditorState(serializedEditorState);
    harness.editor.setEditorState(restoredEditorState);

    expect(getEmojiNodeCount(harness.editor)).toBe(1);
    expect(getEmojiNodeText(harness.editor)).toBe('🧪');
  });

  it('exports an inserted custom emoji node as ordinary Markdown text', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    appendEmojiNode(harness.editor, '🌍');

    expect(harness.exportMarkdown()).toBe('🌍');
    expect(harness.getTextContent()).toBe('🌍');
  });

  it('renders the emoji text inside the custom DOM wrapper', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();
    const rootElement = document.createElement('div');

    harness.editor.setRootElement(rootElement);
    appendEmojiNode(harness.editor, '🎉');

    const emojiInnerElement = rootElement.querySelector('.emoji-inner');
    assertNotNull(emojiInnerElement);
    const emojiOuterElement = emojiInnerElement.parentElement;
    assertNotNull(emojiOuterElement);

    expect(emojiInnerElement).toHaveTextContent('🎉');
    expect(emojiOuterElement.tagName).toBe('SPAN');

    harness.editor.setRootElement(null);
    rootElement.remove();
  });
});
