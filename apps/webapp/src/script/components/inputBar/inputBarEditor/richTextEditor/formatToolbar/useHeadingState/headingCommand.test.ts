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

import {$convertToMarkdownString} from '@lexical/markdown';
import {$createParagraphNode, $createTextNode, $getRoot} from 'lexical';

import {createWireLexicalEditorTestHarness} from '../../testSupport/createWireLexicalEditorTestHarness';
import {markdownTransformers} from '../../utils/markdownTransformers';
import {headingCommand} from './headingCommand';

type HeadingCommandResult = {
  readonly wasHandled: boolean;
  readonly markdown: string;
};

function executeHeadingCommand(paragraphText: string, selectParagraphText: boolean): HeadingCommandResult {
  const harness = createWireLexicalEditorTestHarness();
  let wasHandled = false;

  harness.editor.update(
    () => {
      const paragraphNode = $createParagraphNode();
      const textNode = $createTextNode(paragraphText);
      paragraphNode.append(textNode);
      $getRoot().clear().append(paragraphNode);

      if (selectParagraphText) {
        textNode.select(0, paragraphText.length);
      }

      wasHandled = headingCommand();
    },
    {discrete: true},
  );

  const markdown = harness.editor.getEditorState().read(() => {
    return $convertToMarkdownString(markdownTransformers, undefined, true);
  });

  return {wasHandled, markdown};
}

describe('headingCommand', () => {
  it('converts the selected paragraph to an H1 heading', () => {
    const actualResult = executeHeadingCommand('Heading text', true);

    expect(actualResult).toEqual({wasHandled: true, markdown: '# Heading text'});
  });

  it('returns handled without changing a document that has no range selection', () => {
    const actualResult = executeHeadingCommand('Plain text', false);

    expect(actualResult).toEqual({wasHandled: true, markdown: 'Plain text'});
  });
});
