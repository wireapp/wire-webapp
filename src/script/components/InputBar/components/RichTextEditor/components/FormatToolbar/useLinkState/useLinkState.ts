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

import {useCallback, useState, useEffect} from 'react';

import {$createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND, LinkNode} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent} from '@lexical/utils';
import {
  $getSelection,
  $isRangeSelection,
  $createTextNode,
  COMMAND_PRIORITY_LOW,
  CLICK_COMMAND,
  TextNode,
} from 'lexical';

import {FORMAT_LINK_COMMAND} from '../../../editorConfig';
import {getSelectedNode} from '../../../utils/getSelectedNode';
import {sanitizeUrl} from '../../../utils/sanitizeUrl';

export const useLinkState = () => {
  const [editor] = useLexicalComposerContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingLink, setEditingLink] = useState<{
    text: string;
    url: string;
    node: LinkNode | null;
    selection: {
      anchor: {key: string; offset: number};
      focus: {key: string; offset: number};
    } | null;
  }>({
    text: '',
    url: '',
    node: null,
    selection: null,
  });

  const formatLink = useCallback(
    (isClickEvent = false) => {
      if (!editor.isEditable()) {
        return;
      }

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const node = getSelectedNode(selection);
        const parent = $findMatchingParent(node, $isLinkNode);

        if (parent) {
          if (isClickEvent) {
            setEditingLink({
              node: parent,
              url: parent.getURL(),
              text: parent.getTextContent(),
              selection: null,
            });
            setShowCreateDialog(true);
          } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
          }
        } else {
          const selectionText = selection.getTextContent();
          setEditingLink({
            text: selectionText,
            url: '',
            node: null,
            selection: {
              anchor: {key: selection.anchor.key, offset: selection.anchor.offset},
              focus: {key: selection.focus.key, offset: selection.focus.offset},
            },
          });
          setShowCreateDialog(true);
        }
      });
    },
    [editor],
  );

  const insertLink = useCallback(
    (url: string, text?: string) => {
      if (!editor.isEditable()) {
        return;
      }

      editor.update(() => {
        if (editingLink.node) {
          if ($isLinkNode(editingLink.node)) {
            editingLink.node.setURL(sanitizeUrl(url));
            if (text) {
              const textNode = editingLink.node.getFirstChild();
              if (textNode instanceof TextNode) {
                textNode.setTextContent(text);
              }
            }
          }
        } else {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            if (editingLink.selection) {
              selection.anchor.key = editingLink.selection.anchor.key;
              selection.anchor.offset = editingLink.selection.anchor.offset;
              selection.focus.key = editingLink.selection.focus.key;
              selection.focus.offset = editingLink.selection.focus.offset;
              selection.dirty = true;
            }

            const textContent = text || selection.getTextContent() || url;
            const textNode = $createTextNode(textContent);
            const linkNode = $createLinkNode(sanitizeUrl(url));
            linkNode.append(textNode);

            selection.insertNodes([linkNode]);
          }
        }
      });

      setShowCreateDialog(false);
      setEditingLink({
        text: '',
        url: '',
        node: null,
        selection: null,
      });
    },
    [editor, editingLink],
  );

  useEffect(() => {
    return editor.registerCommand(
      FORMAT_LINK_COMMAND,
      () => {
        formatLink(true);
        return true;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, formatLink]);

  const handleLinkClick = useCallback(
    (linkNode: LinkNode) => {
      editor.update(() => {
        if ($isLinkNode(linkNode)) {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.setTextNodeRange(
              linkNode.getFirstChild() as TextNode,
              0,
              linkNode.getFirstChild() as TextNode,
              linkNode.getTextContent().length,
            );
          }
          editor.dispatchCommand(FORMAT_LINK_COMMAND, undefined);
        }
      });
    },
    [editor],
  );

  useEffect(() => {
    return editor.registerCommand(
      CLICK_COMMAND,
      event => {
        const linkDomNode = (event.target as HTMLElement).closest('a');
        if (linkDomNode) {
          event.preventDefault();

          editor.getEditorState().read(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              const node = getSelectedNode(selection);
              const linkNode = $findMatchingParent(node, $isLinkNode);
              if (linkNode) {
                handleLinkClick(linkNode);
              }
            }
          });
        }
        return false;
      },
      COMMAND_PRIORITY_LOW,
    );
  }, [editor, handleLinkClick]);

  return {
    formatLink,
    insertLink,
    showCreateDialog,
    setShowCreateDialog,
    selectedText: editingLink.text,
    linkUrl: editingLink.url,
    linkNode: editingLink.node,
  };
};
