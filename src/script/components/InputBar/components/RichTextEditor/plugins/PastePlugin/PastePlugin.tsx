/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useEffect} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$getSelection, $createTextNode, PASTE_COMMAND, COMMAND_PRIORITY_LOW} from 'lexical';

import {User} from 'src/script/entity/User';

import {$createMentionNode} from '../../nodes/MentionNode';

interface PastePluginProps {
  getMentionCandidates: () => User[];
}

interface Segment {
  /** Type of the segment - either plain text, mention, or link */
  type: 'text' | 'mention' | 'link';
  /** Content of the segment */
  content: string;
  /** URL for link segments */
  url?: string;
}

/**
 * Plugin that handles pasting text with mentions into the editor.
 * It preserves mentions for users that exist in the current context and
 * converts mentions of non-existent users to plain text.
 */
export const PastePlugin = ({getMentionCandidates}: PastePluginProps) => {
  const [editor] = useLexicalComposerContext();

  /**
   * Processes a mention element from pasted HTML content.
   * Creates a mention node if the user exists in the current context,
   * otherwise converts it to plain text.
   */
  const handleMentionFromHtml = (mentionElem: Element, availableUsers: User[]) => {
    const value = mentionElem.getAttribute('data-lexical-mention-value');
    if (!value) {
      return;
    }

    const username = value.startsWith('@') ? value.substring(1) : value;
    const selection = $getSelection();

    if (!selection) {
      return;
    }

    const userExists = availableUsers.some(user => user.name() === username);

    if (!userExists) {
      selection.insertText(`@${username}`);
      return;
    }

    const mentionNode = $createMentionNode('@', username);

    selection.insertNodes([mentionNode, $createTextNode(' ')]);
  };

  /**
   * Creates a segment object with the specified type and content.
   * Used to standardize segment creation throughout the plugin.
   */
  const createSegment = (type: Segment['type'], content: string, url?: string): Segment => ({
    type,
    content,
    ...(url && {url}),
  });

  /**
   * Processes plain text content and splits it into segments.
   * Each segment is either a mention, link, or plain text.
   * Preserves the original text structure including spaces and formatting.
   */
  const processPlainTextSegments = (text: string, availableUsers: User[]): Segment[] => {
    const segments: Segment[] = [];
    let lastIndex = 0;

    // First, find all URLs and create segments
    const urlMatches = Array.from(text.matchAll(URL_REGEX));
    urlMatches.forEach(match => {
      const url = match[0];
      const urlIndex = match.index!;

      // Add text before URL if exists
      if (urlIndex > lastIndex) {
        const textBefore = text.slice(lastIndex, urlIndex);
        const mentionSegments = processMentionSegments(textBefore, availableUsers);
        segments.push(...mentionSegments);
      }

      // Add URL segment
      segments.push(createSegment('link', url, url));
      lastIndex = urlIndex + url.length;
    });

    // Process remaining text for mentions
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      const mentionSegments = processMentionSegments(remainingText, availableUsers);
      segments.push(...mentionSegments);
    }

    return segments;
  };

  /**
   * Processes text for mentions and returns segments
   */
  const processMentionSegments = (text: string, availableUsers: User[]): Segment[] => {
    const mentions = text.match(/@[\w]+/g) || [];
    if (mentions.length === 0) {
      return [createSegment('text', text)];
    }

    return mentions.reduce<{segments: Segment[]; lastIndex: number}>(
      (acc, mention) => {
        const mentionIndex = text.indexOf(mention, acc.lastIndex);
        const segments = [...acc.segments];

        if (mentionIndex > acc.lastIndex) {
          segments.push(createSegment('text', text.slice(acc.lastIndex, mentionIndex)));
        }

        const username = mention.substring(1);
        const userExists = availableUsers.some(user => user.name() === username);
        segments.push(createSegment(userExists ? 'mention' : 'text', userExists ? username : mention));

        return {
          segments,
          lastIndex: mentionIndex + mention.length,
        };
      },
      {segments: [], lastIndex: 0},
    ).segments;
  };

  /**
   * Inserts a list of segments into the editor at the current selection.
   * Handles both text and mention segments appropriately.
   */
  const insertSegments = (segments: Segment[]) => {
    const selection = $getSelection();
    if (!selection) {
      return;
    }

    segments.forEach(segment => {
      switch (segment.type) {
        case 'text':
          selection.insertText(segment.content);
          break;
        case 'mention':
          const mentionNode = $createMentionNode('@', segment.content);
          selection.insertNodes([mentionNode, $createTextNode(' ')]);
          break;
        case 'link':
          selection.insertText(createMarkdownLink(segment.url!, segment.content));
          break;
      }
    });
  };

  /**
   * Processes HTML links from pasted content.
   * Creates markdown links preserving both href and text content.
   */
  const handleLinksFromHtml = (doc: Document): boolean => {
    const links = doc.querySelectorAll('a');
    if (links.length === 0) {
      return false;
    }

    const selection = $getSelection();
    if (!selection) {
      return false;
    }

    links.forEach(link => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();

      if (href && text) {
        selection.insertText(createMarkdownLink(href, text));
        selection.insertText(' ');
      }
    });

    return true;
  };

  /**
   * Handles the paste event by processing both HTML and plain text content.
   * Attempts to preserve rich text structure when possible, falling back to
   * plain text processing when needed.
   */
  const handlePaste = (event: ClipboardEvent) => {
    const clipboardData = event.clipboardData;
    if (!clipboardData) {
      return false;
    }

    const htmlContent = clipboardData.getData('text/html');
    const plainText = clipboardData.getData('text/plain');
    const availableUsers = getMentionCandidates();

    editor.update(() => {
      try {
        if (htmlContent) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');

          const mentions = doc.querySelectorAll('[data-lexical-mention]');
          const handledMentions = mentions.length > 0;
          const handledLinks = handleLinksFromHtml(doc);

          if (handledMentions || handledLinks) {
            mentions.forEach(mention => handleMentionFromHtml(mention, availableUsers));
            return true;
          }
        }

        const segments = processPlainTextSegments(plainText, availableUsers);
        insertSegments(segments);
      } catch (error) {
        console.error('Error handling paste:', error);
        const selection = $getSelection();
        selection?.insertText(plainText);
      }
    });

    return true;
  };

  useEffect(() => {
    return editor.registerCommand(PASTE_COMMAND, handlePaste, COMMAND_PRIORITY_LOW);
  }, [editor, getMentionCandidates]);

  return null;
};

// URL regex that matches most common URL formats
const URL_REGEX =
  /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/gi;

/**
 * Creates a markdown link from a URL and optional text
 */
const createMarkdownLink = (url: string, text?: string): string => {
  return `[${text || url}](${url})`;
};
