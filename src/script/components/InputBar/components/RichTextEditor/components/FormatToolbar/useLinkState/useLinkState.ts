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
  RangeSelection,
} from 'lexical';

import {FORMAT_LINK_COMMAND} from '../../../editorConfig';
import {getSelectedNode} from '../../../utils/getSelectedNode';
import {sanitizeUrl} from '../../../utils/sanitizeUrl';

interface Link {
  text: string;
  url: string;
  node: LinkNode | null;
  selection: {
    anchor: {key: string; offset: number};
    focus: {key: string; offset: number};
  } | null;
}

interface SelectionPoint {
  key: string;
  offset: number;
}

interface SavedSelection {
  anchor: SelectionPoint;
  focus: SelectionPoint;
}

interface CreateLinkParams {
  selection: RangeSelection;
  url: string;
  text?: string;
}

export const useLinkState = () => {
  const [editor] = useLexicalComposerContext();
  const {isOpen, open, close} = useModalState();
  const {editingLink, setEditingLink, resetLinkState} = useLinkEditing();

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
        const existingLink = $findMatchingParent(node, $isLinkNode);

        if (!existingLink) {
          setEditingLink({
            text: selection.getTextContent(),
            url: '',
            node: null,
            selection: {
              anchor: {key: selection.anchor.key, offset: selection.anchor.offset},
              focus: {key: selection.focus.key, offset: selection.focus.offset},
            },
          });
          open();
          return;
        }

        if (isClickEvent) {
          setEditingLink({
            node: existingLink,
            url: existingLink.getURL(),
            text: existingLink.getTextContent(),
            selection: null,
          });
          open();
          return;
        }

        editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
      });
    },
    [editor, setEditingLink, open],
  );

  const restoreSelection = useCallback((selection: RangeSelection, savedSelection: SavedSelection) => {
    selection.anchor.key = savedSelection.anchor.key;
    selection.anchor.offset = savedSelection.anchor.offset;
    selection.focus.key = savedSelection.focus.key;
    selection.focus.offset = savedSelection.focus.offset;
    selection.dirty = true;
  }, []);

  const insertLink = useCallback(
    (url: string, text?: string) => {
      if (!editor.isEditable()) {
        return;
      }

      editor.update(() => {
        const sanitizedUrl = sanitizeUrl(url);

        if (editingLink.node && $isLinkNode(editingLink.node)) {
          editingLink.node.setURL(sanitizedUrl);
          if (text) {
            const textNode = editingLink.node.getFirstChild();
            if (textNode instanceof TextNode) {
              textNode.setTextContent(text);
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                selection.setTextNodeRange(textNode, 0, textNode, text.length);
              }
            }
          }
          resetLinkState(close);
          return;
        }

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        if (editingLink.selection) {
          restoreSelection(selection, editingLink.selection);
        }

        createNewLink({
          selection,
          url: sanitizedUrl,
          text,
        });
        resetLinkState(close);
      });
    },
    [editor, editingLink.node, editingLink.selection, resetLinkState, restoreSelection, close],
  );

  const handleLinkClick = useCallback(
    (linkNode: LinkNode) => {
      editor.update(() => {
        if (!$isLinkNode(linkNode)) {
          return;
        }

        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const textNode = linkNode.getFirstChild() as TextNode;
        selection.setTextNodeRange(textNode, 0, textNode, linkNode.getTextContent().length);
        editor.dispatchCommand(FORMAT_LINK_COMMAND, undefined);
      });
    },
    [editor],
  );

  const handleClickCommand = useCallback(
    (event: MouseEvent) => {
      const linkDomNode = (event.target as HTMLElement).closest('a');
      if (!linkDomNode) {
        return false;
      }

      event.preventDefault();

      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) {
          return;
        }

        const node = getSelectedNode(selection);
        const linkNode = $findMatchingParent(node, $isLinkNode);
        if (linkNode) {
          handleLinkClick(linkNode);
        }
      });

      return false;
    },
    [editor, handleLinkClick],
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

  useEffect(() => {
    return editor.registerCommand(CLICK_COMMAND, handleClickCommand, COMMAND_PRIORITY_LOW);
  }, [editor, handleClickCommand]);

  return {
    formatLink,
    insertLink,
    isModalOpen: isOpen,
    closeModal: close,
    selectedText: editingLink.text,
    linkUrl: editingLink.url,
    linkNode: editingLink.node,
  };
};

const useLinkEditing = () => {
  const [editingLink, setEditingLink] = useState<Link>({
    text: '',
    url: '',
    node: null,
    selection: null,
  });

  const resetLinkState = useCallback((closeModal: () => void) => {
    setEditingLink({
      text: '',
      url: '',
      node: null,
      selection: null,
    });
    closeModal();
  }, []);

  return {
    editingLink,
    setEditingLink,
    resetLinkState,
  };
};

const createNewLink = ({selection, url, text}: CreateLinkParams) => {
  const textContent = text || selection.getTextContent() || url;
  const textNode = $createTextNode(textContent);
  const linkNode = $createLinkNode(sanitizeUrl(url));
  linkNode.append(textNode);
  selection.insertNodes([linkNode]);
};

const useModalState = () => {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return {isOpen, open, close};
};
