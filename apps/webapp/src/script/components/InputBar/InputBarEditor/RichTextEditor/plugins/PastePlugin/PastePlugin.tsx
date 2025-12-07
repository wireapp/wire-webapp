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

import {useCallback, useEffect} from 'react';

import {$generateNodesFromDOM} from '@lexical/html';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $createTextNode,
  PASTE_COMMAND,
  COMMAND_PRIORITY_LOW,
  $isRangeSelection,
  $isTextNode,
  BaseSelection,
} from 'lexical';
import {User} from 'Repositories/entity/User';

import {$createMentionNode} from '../../nodes/MentionNode';

interface PastePluginProps {
  /** Function that returns list of users that can be mentioned in the current context */
  getMentionCandidates: () => User[];
  /** Whether the preview mode (render link as formatted node or raw markdown [text](url)) is enabled */
  isPreviewMode: boolean;
}

type Selection = BaseSelection | null;

/**
 * PastePlugin handles pasting content into the editor while preserving formatting and special nodes.
 * It specifically handles:
 * 1. Lexical mentions - preserving mention nodes for users that exist in current conversation
 * 2. Formatted content - preserving text formatting (bold, italic, etc.)
 * 3. Plain text - as a fallback
 *
 * The plugin processes mentions intelligently:
 * - If a mentioned user exists in the current conversation, the mention is preserved as a MentionNode
 * - If a mentioned user doesn't exist, the mention is converted to plain text with @ symbol
 */
export const PastePlugin = ({getMentionCandidates, isPreviewMode}: PastePluginProps): JSX.Element | null => {
  const [editor] = useLexicalComposerContext();

  /**
   * Extracts and validates a username from a mention element.
   * @param mention - The mention DOM element
   * @param availableUsers - List of users that can be mentioned
   * @returns Object containing validation result and username if valid
   */
  const validateMention = useCallback(
    (mention: Element, availableUsers: User[]): {isValid: boolean; username?: string} => {
      const value = mention.getAttribute('data-lexical-mention-value');
      if (typeof value !== 'string') {
        return {isValid: false};
      }

      const username = value.startsWith('@') ? value.substring(1) : value;
      const userExists = availableUsers.some(user => user.name() === username);

      return {
        isValid: userExists,
        username,
      };
    },
    [],
  );

  /**
   * Handles pasted content that contains Lexical mentions.
   * Processes the DOM before generating Lexical nodes to ensure proper mention handling.
   * @param doc - The parsed HTML document
   * @param selection - Current editor selection
   * @param availableUsers - List of users that can be mentioned in current context
   * @returns boolean - True if mentions were handled successfully
   */
  const handleLexicalMentions = useCallback(
    (doc: Document, selection: Selection, availableUsers: User[]): boolean => {
      if (!selection) {
        return false;
      }

      const lexicalMentions = doc.querySelectorAll('[data-lexical-mention="true"]');
      if (lexicalMentions.length === 0) {
        return false;
      }

      // Process mentions in the DOM before generating nodes
      lexicalMentions.forEach(mention => {
        const {isValid, username} = validateMention(mention, availableUsers);

        if (!username) {
          return;
        }

        // Only convert to plain text if the mention is invalid
        if (!isValid) {
          const parent = mention.parentNode;
          if (!parent) {
            return;
          }

          const textNode = doc.createTextNode(`@${username}`);
          parent.replaceChild(textNode, mention);
        }
      });

      const nodes = $generateNodesFromDOM(editor, doc);
      if (nodes.length === 0) {
        return false;
      }

      selection.insertNodes(nodes);
      return true;
    },
    [editor, validateMention],
  );

  /**
   * Handles pasted content with formatting (bold, italic, etc.).
   * Converts HTML content to Lexical nodes while preserving formatting.
   * @param doc - The parsed HTML document
   * @param selection - Current editor selection
   * @returns boolean - True if formatted content was handled successfully
   */
  const handleFormattedContent = useCallback(
    (doc: Document, selection: Selection): boolean => {
      if (!selection) {
        return false;
      }

      const nodes = $generateNodesFromDOM(editor, doc);
      if (nodes.length === 0) {
        return false;
      }

      selection.insertNodes(nodes);
      return true;
    },
    [editor],
  );

  /**
   * Processes links in pasted content, converting them to markdown format.
   * @param text - The text containing links
   * @param links - NodeList of link elements
   * @returns string - Processed text with markdown links
   */
  const processLinks = (text: string, links: NodeListOf<Element>): string => {
    return Array.from(links).reduce((processedText, link) => {
      const href = link.getAttribute('href');
      const linkText = link.textContent?.trim();

      if (!href || !linkText) {
        return processedText;
      }

      const linkMarkdown = `[${linkText}](${href})`;
      return processedText.replace(new RegExp(`\\b${linkText}\\b`), linkMarkdown);
    }, text);
  };

  /**
   * Processes mentions in pasted content that aren't in Lexical format.
   * Converts valid mentions to MentionNodes and preserves their position in text.
   * @param selection - Current editor selection
   * @param mentions - NodeList of mention elements
   * @param availableUsers - List of users that can be mentioned in current context
   */
  const processMentions = useCallback(
    (selection: Selection, mentions: NodeListOf<Element>, availableUsers: User[]) => {
      if (!selection) {
        return;
      }

      mentions.forEach(mention => {
        const {isValid, username} = validateMention(mention, availableUsers);
        if (!username || !isValid) {
          return;
        }

        const mentionText = `@${username}`;
        const content = selection.getTextContent();
        const startOffset = content.indexOf(mentionText);

        if (startOffset !== -1 && $isRangeSelection(selection)) {
          const node = selection.anchor.getNode();
          if (!node || !$isTextNode(node)) {
            return;
          }
          selection.setTextNodeRange(node, startOffset, node, startOffset + mentionText.length);
          selection.insertNodes([$createMentionNode('@', username), $createTextNode(' ')]);
        }
      });
    },
    [validateMention],
  );

  /**
   * Main paste handler that orchestrates the processing of pasted content.
   * Tries different handling strategies in order:
   * 1. Lexical mentions
   * 2. Formatted content
   * 3. Manual processing of links and mentions
   * Falls back to plain text if all else fails.
   * @param event - Clipboard event containing pasted content
   * @returns boolean - True if paste was handled
   */
  const handlePaste = useCallback(
    (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        return false;
      }

      const htmlContent = clipboardData.getData('text/html');
      const plainText = clipboardData.getData('text/plain');
      const availableUsers = getMentionCandidates();

      editor.update(() => {
        try {
          const selection = $getSelection();
          if (!selection) {
            $getSelection()?.insertText(plainText);
            return false;
          }

          if (!htmlContent) {
            selection.insertText(plainText);
            return false;
          }

          const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

          // Try handling lexical mentions first
          if (handleLexicalMentions(doc, selection, availableUsers)) {
            return true;
          }

          const mentions = doc.querySelectorAll('[data-lexical-mention]');
          const links = doc.querySelectorAll('a');

          // Try handling formatted content if no special elements
          if (
            mentions.length === 0 &&
            (isPreviewMode || links.length === 0) &&
            handleFormattedContent(doc, selection)
          ) {
            return true;
          }

          // Transform links to markdown ([text](url)) only if the preview mode is disabled
          if (!isPreviewMode) {
            const processedText = processLinks(plainText, links);
            selection.insertText(processedText);
          } else {
            selection.insertText(plainText);
          }

          processMentions(selection, mentions, availableUsers);

          return true;
        } catch (error) {
          console.error('Error handling paste:', error);
          $getSelection()?.insertText(plainText);
          return false;
        }
      });

      event.preventDefault();
      return true;
    },
    [editor, getMentionCandidates, handleLexicalMentions, handleFormattedContent, processMentions],
  );

  useEffect(() => {
    return editor.registerCommand(PASTE_COMMAND, handlePaste, COMMAND_PRIORITY_LOW);
  }, [editor, handlePaste]);

  return null;
};
