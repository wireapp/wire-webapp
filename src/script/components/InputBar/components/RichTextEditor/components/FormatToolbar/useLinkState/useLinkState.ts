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

import {$createLinkNode, $isLinkNode, TOGGLE_LINK_COMMAND} from '@lexical/link';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {$findMatchingParent} from '@lexical/utils';
import {$getSelection, $isRangeSelection, $createTextNode, COMMAND_PRIORITY_LOW} from 'lexical';

import {FORMAT_LINK_COMMAND} from '../../../editorConfig';
import {getSelectedNode} from '../../../utils/getSelectedNode';
import {sanitizeUrl} from '../../../utils/sanitizeUrl';

export const useLinkState = () => {
  const [editor] = useLexicalComposerContext();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [savedSelection, setSavedSelection] = useState<{
    anchor: {key: string; offset: number};
    focus: {key: string; offset: number};
  } | null>(null);
  const [linkNode, setLinkNode] = useState<any>(null);
  const [linkUrl, setLinkUrl] = useState('');

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
            setLinkNode(parent);
            setLinkUrl(parent.getURL());
            setSelectedText(parent.getTextContent());
            setShowCreateDialog(true);
          } else {
            editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
          }
        } else {
          // Even if no text is selected, we can still create a link
          const selectionText = selection.getTextContent();
          setSavedSelection({
            anchor: {key: selection.anchor.key, offset: selection.anchor.offset},
            focus: {key: selection.focus.key, offset: selection.focus.offset},
          });
          setSelectedText(selectionText);
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
        if (linkNode) {
          // Editing existing link
          if ($isLinkNode(linkNode)) {
            linkNode.setURL(sanitizeUrl(url));
            if (text) {
              const textNode = linkNode.getFirstChild();
              if (textNode) {
                textNode.setTextContent(text);
              }
            }
          }
        } else {
          // Creating new link
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            if (savedSelection) {
              selection.anchor.key = savedSelection.anchor.key;
              selection.anchor.offset = savedSelection.anchor.offset;
              selection.focus.key = savedSelection.focus.key;
              selection.focus.offset = savedSelection.focus.offset;
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
      setSavedSelection(null);
      setLinkNode(null);
      setLinkUrl('');
    },
    [editor, savedSelection, linkNode],
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

  return {
    formatLink,
    insertLink,
    showCreateDialog,
    setShowCreateDialog,
    selectedText,
    linkUrl,
    linkNode,
  };
};
