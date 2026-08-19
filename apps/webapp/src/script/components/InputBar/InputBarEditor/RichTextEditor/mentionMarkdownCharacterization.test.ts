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

import {$convertFromMarkdownString, $convertToMarkdownString, type Transformer} from '@lexical/markdown';
import {$getRoot, $nodesOfType} from 'lexical';

import {
  createWireLexicalEditorTestHarness,
  WireLexicalEditorTestHarness,
} from './testSupport/createWireLexicalEditorTestHarness';
import {MentionNode} from './nodes/MentionNode';
import {getMentionMarkdownTransformer} from './plugins/EditedMessagePlugin/getMentionMarkdownTransformer/getMentionMarkdownTransformer';
import {markdownTransformers} from './utils/markdownTransformers';

type MentionMarkdownCharacterizationTestCase = {
  readonly description: string;
  readonly inputMarkdown: string;
  readonly allowedMentions: string[];
  readonly expectedMarkdown: string;
  readonly expectedTextContent: string;
  readonly expectedMentionValues: string[];
};

const mentionMarkdownCharacterizationTestCases: readonly MentionMarkdownCharacterizationTestCase[] = [
  {
    description: 'one allowed mention between ordinary text',
    inputMarkdown: 'Hello <mention>@Alice</mention>!',
    allowedMentions: ['@Alice'],
    expectedMarkdown: 'Hello <mention>@Alice</mention>!',
    expectedTextContent: 'Hello @Alice!',
    expectedMentionValues: ['@Alice'],
  },
  {
    description: 'multiple mentions with punctuation and a line break',
    inputMarkdown: '<mention>@Alice</mention>, meet <mention>@Bob</mention>.\n<mention>@Alice</mention>',
    allowedMentions: ['@Alice', '@Bob'],
    expectedMarkdown: '<mention>@Alice</mention>, meet <mention>@Bob</mention>.\n<mention>@Alice</mention>',
    expectedTextContent: '@Alice, meet @Bob.\n@Alice',
    expectedMentionValues: ['@Alice', '@Bob', '@Alice'],
  },
  {
    description: 'a mention inside bold formatting',
    inputMarkdown: '**Hello <mention>@Alice</mention>**',
    allowedMentions: ['@Alice'],
    expectedMarkdown: '**Hello** <mention>@Alice</mention>',
    expectedTextContent: 'Hello @Alice',
    expectedMentionValues: ['@Alice'],
  },
  {
    description: 'a mention inside an unordered list item',
    inputMarkdown: '- <mention>@Alice</mention>',
    allowedMentions: ['@Alice'],
    expectedMarkdown: '- <mention>@Alice</mention>',
    expectedTextContent: '@Alice',
    expectedMentionValues: ['@Alice'],
  },
  {
    description: 'a mention that is not allowed',
    inputMarkdown: 'Hello <mention>@Unknown</mention>!',
    allowedMentions: ['@Alice'],
    expectedMarkdown: 'Hello <mention>@Unknown</mention>!',
    expectedTextContent: 'Hello <mention>@Unknown</mention>!',
    expectedMentionValues: [],
  },
  {
    description: 'mention markup with no allowed mentions',
    inputMarkdown: '<mention>@Alice</mention>',
    allowedMentions: [],
    expectedMarkdown: '<mention>@Alice</mention>',
    expectedTextContent: '<mention>@Alice</mention>',
    expectedMentionValues: [],
  },
];

type ImportMentionMarkdownOptions = {
  readonly harness: WireLexicalEditorTestHarness;
  readonly inputMarkdown: string;
  readonly allowedMentions: string[];
};

function createMentionTransformers(allowedMentions: string[]): Transformer[] {
  const mentionMarkdownTransformer = getMentionMarkdownTransformer(allowedMentions);
  return [mentionMarkdownTransformer, ...markdownTransformers];
}

function importMentionMarkdown(importMentionMarkdownOptions: ImportMentionMarkdownOptions): void {
  const {harness, inputMarkdown, allowedMentions} = importMentionMarkdownOptions;
  const transformers = createMentionTransformers(allowedMentions);

  harness.editor.update(
    function (): void {
      $getRoot().clear();
      $convertFromMarkdownString(inputMarkdown, transformers, undefined, true);
    },
    {discrete: true},
  );
}

function exportMentionMarkdown(harness: WireLexicalEditorTestHarness, allowedMentions: string[]): string {
  const transformers = createMentionTransformers(allowedMentions);

  return harness.editor.getEditorState().read(function (): string {
    return $convertToMarkdownString(transformers, undefined, true);
  });
}

function getMentionValues(harness: WireLexicalEditorTestHarness): string[] {
  return harness.editor.getEditorState().read(function (): string[] {
    return $nodesOfType(MentionNode).map(function (mentionNode: MentionNode): string {
      return mentionNode.getTextContent();
    });
  });
}

describe('Wire Lexical mention Markdown characterization', () => {
  it.each(mentionMarkdownCharacterizationTestCases)(
    'preserves the current behavior for $description',
    characterizationTestCase => {
      const harness = createWireLexicalEditorTestHarness();

      importMentionMarkdown({
        harness,
        inputMarkdown: characterizationTestCase.inputMarkdown,
        allowedMentions: characterizationTestCase.allowedMentions,
      });

      const actualMarkdown = exportMentionMarkdown(harness, characterizationTestCase.allowedMentions);
      const actualTextContent = harness.getTextContent();
      const actualMentionValues = getMentionValues(harness);
      const expectedMarkdown = characterizationTestCase.expectedMarkdown;
      const expectedTextContent = characterizationTestCase.expectedTextContent;
      const expectedMentionValues = characterizationTestCase.expectedMentionValues;

      expect(actualMarkdown).toBe(expectedMarkdown);
      expect(actualTextContent).toBe(expectedTextContent);
      expect(actualMentionValues).toEqual(expectedMentionValues);
    },
  );
});
