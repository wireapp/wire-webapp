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

import {$createParagraphNode, $createTextNode, LexicalNode} from 'lexical';

import {ContentMessage} from 'src/script/entity/message/ContentMessage';

import {createNodes} from './generateNodes';

import {Text} from '../../../entity/message/Text';
import {$createMentionNode} from '../nodes/MentionNode';

function parseMarkdown(text: string): LexicalNode[] {
  const markdownPatterns = [
    {regex: /\*\*(.*?)\*\*/g, type: 'bold'},
    {regex: /\*(.*?)\*/g, type: 'italic'},
    {regex: /~~(.*?)~~/g, type: 'strikethrough'},
    {regex: /`(.*?)`/g, type: 'code'},
  ];

  const nodes: LexicalNode[] = [];
  let lastIndex = 0;

  markdownPatterns.forEach(({regex, type}) => {
    text = text.replace(regex, (match, content, offset) => {
      // Add text before the markdown
      if (offset > lastIndex) {
        nodes.push($createTextNode(text.slice(lastIndex, offset)));
      }

      // Create appropriate mark node based on type
      const markNode = $createTextNode(content);
      switch (type) {
        case 'bold':
          markNode.setFormat('bold');
          break;
        case 'italic':
          markNode.setFormat('italic');
          break;
        case 'strikethrough':
          markNode.setFormat('strikethrough');
          break;
        case 'code':
          markNode.setFormat('code');
          break;
      }

      nodes.push(markNode);
      lastIndex = offset + match.length;
      return match;
    });
  });

  // Add remaining text
  if (lastIndex < text.length) {
    nodes.push($createTextNode(text.slice(lastIndex)));
  }

  return nodes;
}

function parseMarkdownNode(text: string): LexicalNode {
  const markdownPatterns = [
    {regex: /\*\*(.*?)\*\*/g, type: 'bold'},
    {regex: /\*(.*?)\*/g, type: 'italic'},
    {regex: /~~(.*?)~~/g, type: 'strikethrough'},
    {regex: /`(.*?)`/g, type: 'code'},
  ];

  const processedText = text;
  let formattedNode = $createTextNode(text);

  markdownPatterns.forEach(({regex, type}) => {
    const matches = processedText.match(regex);

    if (matches) {
      // Extract content between markdown symbols
      const content = matches[0].replace(/^\*\*|~~|`|\*$/g, '');

      // Create node with appropriate formatting
      formattedNode = $createTextNode(content);
      switch (type) {
        case 'bold':
          formattedNode.setFormat('bold');
          break;
        case 'italic':
          formattedNode.setFormat('italic');
          break;
        case 'strikethrough':
          formattedNode.setFormat('strikethrough');
          break;
        case 'code':
          formattedNode.setFormat('code');
          break;
      }
    }
  });

  return formattedNode;
}

const markdownPatterns = [
  {regex: /\*\*(.*?)\*\*/g, type: 'bold'},
  {regex: /\*(.*?)\*/g, type: 'italic'},
  {regex: /~~(.*?)~~/g, type: 'strikethrough'},
  {regex: /`(.*?)`/g, type: 'code'},
];

function stripMarkdown(markdown: string): string {
  return (
    markdown
      // Remove headers
      .replace(/^#{1,6}\s+/gm, '')
      // Remove horizontal rules
      .replace(/^[-_*]{3,}$/gm, '')
      // Remove bold and italic syntax
      .replace(/(\*\*|__)(.*?)\1/g, '$2') // Bold
      .replace(/(\*|_)(.*?)\1/g, '$2') // Italic
      // Remove strikethrough
      .replace(/~~(.*?)~~/g, '$1')
      // Remove inline code
      .replace(/`{1,2}([^`]+)`{1,2}/g, '$1')
      // Remove blockquotes
      .replace(/^>\s?/gm, '')
      // Remove links but preserve text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Remove images but preserve alt text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Remove unordered list markers
      .replace(/^\s*[-*+]\s+/gm, '')
      // Remove ordered list markers
      .replace(/^\s*\d+\.\s+/gm, '')
      // Remove remaining special characters for Markdown
      .replace(/\\([`*_{}\[\]()#+\-.!>])/g, '$1')
  );
}

const parseMarkdownNode2 = (text: string) => {
  const node = $createTextNode(text);

  if (/\*\*(.*?)\*\*/g.test(text)) {
    const newText = stripMarkdown(text);
    return $createTextNode(newText).toggleFormat('bold');
  }

  return node;
};

export function toEditorNodes(message: ContentMessage) {
  const firstAsset = message.getFirstAsset() as Text;
  const newMentions = firstAsset.mentions().slice();

  const nodes = createNodes(newMentions, firstAsset.text);

  const paragraphs = nodes.map(node => {
    if (node.type === 'Mention') {
      return $createMentionNode('@', node.data.slice(1));
    }

    return $createTextNode(node.data);
  });

  const paragraphs2 = nodes
    .filter(node => node.type === 'Mention')
    .map(node => $createMentionNode('@', node.data.slice(1)));

  console.log({nodes, text: firstAsset.text, paragraphs2});

  if (!paragraphs2.length) {
    return;
  }

  const paragraphNode = $createParagraphNode();
  paragraphNode.append(...paragraphs);
  return paragraphNode;
}
