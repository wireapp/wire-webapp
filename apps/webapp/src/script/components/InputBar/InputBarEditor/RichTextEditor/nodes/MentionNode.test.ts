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
import assert from 'node:assert';
import {$createParagraphNode, $getRoot, $nodesOfType, LexicalEditor} from 'lexical';

import {createWireLexicalEditorTestHarness, WireLexicalEditorTestHarness} from '../testSupport/createWireLexicalEditorTestHarness';

import {$createMentionNode, MentionNode} from './MentionNode';

type MentionNodeDetails = {
  readonly trigger: string;
  readonly value: string;
  readonly textContent: string;
};

function appendMentionNode(editor: LexicalEditor, trigger: string, value: string): void {
  editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      paragraphNode.append($createMentionNode(trigger, value));
      $getRoot().clear().append(paragraphNode);
    },
    {discrete: true},
  );
}

function getMentionNodeDetails(editor: LexicalEditor): MentionNodeDetails {
  return editor.getEditorState().read(() => {
    const [mentionNode] = $nodesOfType(MentionNode);
    assertNotNull(mentionNode);

    return {
      trigger: mentionNode.getTrigger(),
      value: mentionNode.getValue(),
      textContent: mentionNode.getTextContent(),
    };
  });
}

function getExportedMentionElement(editor: LexicalEditor): HTMLElement {
  return editor.getEditorState().read(() => {
    const [mentionNode] = $nodesOfType(MentionNode);
    assertNotNull(mentionNode);

    const exportedDOM = mentionNode.exportDOM();
    assertNotNull(exportedDOM.element);
    assert(exportedDOM.element instanceof HTMLElement);

    return exportedDOM.element;
  });
}

describe('MentionNode', () => {
  it('serializes its trigger and value separately from its display text', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    appendMentionNode(harness.editor, '@', 'Alice');

    const serializedEditorState = harness.editor.getEditorState().toJSON();
    const expectedSerializedMention = expect.objectContaining({
      type: 'Mention',
      version: 1,
      trigger: '@',
      value: 'Alice',
    });

    expect(serializedEditorState.root.children).toEqual([
      expect.objectContaining({children: [expectedSerializedMention]}),
    ]);
    expect(harness.getTextContent()).toBe('@Alice');
  });

  it('restores its trigger, value, and display text from serialized editor state', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    appendMentionNode(harness.editor, '@', 'Alice');

    const serializedEditorState = harness.editor.getEditorState().toJSON();
    const restoredEditorState = harness.editor.parseEditorState(serializedEditorState);
    harness.editor.setEditorState(restoredEditorState);

    const actualMentionNodeDetails = getMentionNodeDetails(harness.editor);
    const expectedMentionNodeDetails: MentionNodeDetails = {
      trigger: '@',
      value: 'Alice',
      textContent: '@Alice',
    };

    expect(actualMentionNodeDetails).toEqual(expectedMentionNodeDetails);
  });

  it('exports the DOM attributes consumed when a mention is pasted', () => {
    const harness: WireLexicalEditorTestHarness = createWireLexicalEditorTestHarness();

    appendMentionNode(harness.editor, '@', 'Alice');

    const exportedMentionElement = getExportedMentionElement(harness.editor);

    expect(exportedMentionElement).toHaveAttribute('data-lexical-mention', 'true');
    expect(exportedMentionElement).toHaveAttribute('data-lexical-mention-trigger', '@');
    expect(exportedMentionElement).toHaveAttribute('data-lexical-mention-value', 'Alice');
    expect(exportedMentionElement).toHaveTextContent('@Alice');
  });
});
