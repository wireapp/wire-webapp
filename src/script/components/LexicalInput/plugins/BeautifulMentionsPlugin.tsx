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

import {useCallback, useEffect, useMemo, useState, MutableRefObject} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {MenuOption as _MenuOption, useBasicTypeaheadTriggerMatch} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {mergeRegister} from '@lexical/utils';
import {
  $createRangeSelection,
  $createTextNode,
  $getSelection,
  $isTextNode,
  $nodesOfType,
  $setSelection,
  COMMAND_PRIORITY_LOW,
  GridSelection,
  KEY_DOWN_COMMAND,
  NodeSelection,
  RangeSelection,
  TextNode,
} from 'lexical';
import * as ReactDOM from 'react-dom';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {IgnoreOutsideClickWrapper} from 'Components/InputBar/util/clickHandlers';

import {ItemProps, LexicalTypeaheadMenuPlugin} from './LexicalTypeheadMenuPlugin';

import {User} from '../../../entity/User';
import {MentionSuggestionsItem} from '../components/Mention/MentionSuggestionsItem';
import {useIsFocused} from '../hooks/useIsFocused';
import {$createBeautifulMentionNode, $isBeautifulMentionNode, BeautifulMentionNode} from '../nodes/MentionNode';
import {
  INSERT_MENTION_COMMAND,
  OPEN_MENTIONS_MENU_COMMAND,
  REMOVE_MENTIONS_COMMAND,
  RENAME_MENTIONS_COMMAND,
} from '../types/Mention';
import {
  checkForMentions,
  getNextSibling,
  getPreviousSibling,
  getSelectionInfo,
  insertMention,
  isWordChar,
} from '../utils/mention-utils';

export class MenuOption extends _MenuOption {
  user: User;
  value: string;
  label: string;
  constructor(user: User, value: string, label?: string) {
    super(value);
    this.user = user;
    this.value = value;
    this.label = label ?? value;
  }
}

interface BeautifulMentionsPluginProps {
  onSearch: (queryString?: string | null) => User[];
}

export const BeautifulMentionsPlugin = ({onSearch}: BeautifulMentionsPluginProps) => {
  const isEditorFocused = useIsFocused();
  const triggers = useMemo(() => ['@'], []);
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<string | null>(null);

  const results = onSearch(queryString);

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });
  const [oldSelection, setOldSelection] = useState<RangeSelection | NodeSelection | GridSelection | null>(null);

  const options = useMemo(() => {
    // Add options from the lookup service
    return results.map(result => new MenuOption(result, result.name()));
  }, [results]);

  const handleClose = useCallback(() => {
    setTrigger(null);
  }, []);

  const handleSelectOption = useCallback(
    (selectedOption: MenuOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        if (!trigger) {
          return;
        }
        const mentionNode = $createBeautifulMentionNode(trigger, selectedOption.value);
        if (nodeToReplace) {
          nodeToReplace.replace(mentionNode);
        }
        closeMenu();
      });
    },
    [editor, trigger],
  );

  const checkForMentionMatch = useCallback(
    (text: string) => {
      // Don't show the menu if the next character is a word character
      const info = getSelectionInfo(triggers);
      if (info?.isTextNode && info.wordCharAfterCursor) {
        return null;
      }

      const slashMatch = checkForSlashTriggerMatch(text, editor);
      if (slashMatch !== null) {
        return null;
      }

      const queryMatch = checkForMentions(text, triggers, true);
      if (queryMatch) {
        const {replaceableString, matchingString} = queryMatch;
        const index = replaceableString.lastIndexOf(matchingString);
        const trigger =
          index === -1
            ? replaceableString
            : replaceableString.substring(0, index) + replaceableString.substring(index + matchingString.length);
        setTrigger(trigger || null);
        if (queryMatch.replaceableString) {
          return queryMatch;
        }
      } else {
        setTrigger(null);
      }
      return null;
    },
    [checkForSlashTriggerMatch, editor, triggers],
  );

  const insertTextAsMention = useCallback(() => {
    const info = getSelectionInfo(triggers);
    if (!info || !info.isTextNode) {
      return false;
    }
    const {node} = info;
    const textContent = node.getTextContent();
    const queryMatch = checkForMentions(textContent, triggers, false);
    if (queryMatch && queryMatch.replaceableString.length > 1) {
      const trigger = triggers.find(trigger => queryMatch.replaceableString.startsWith(trigger));
      const end = textContent.search(new RegExp(`${queryMatch.replaceableString}\\s?$`));
      if (trigger && end !== -1) {
        const mentionNode = $createBeautifulMentionNode(trigger, queryMatch.matchingString);
        node.setTextContent(textContent.substring(0, end));
        node.insertAfter(mentionNode);
        mentionNode.selectNext();
      }
      return true;
    }
    return false;
  }, [triggers]);

  const setSelection = useCallback(() => {
    const selection = $getSelection();
    if (!selection) {
      $setSelection(oldSelection || $createRangeSelection());
    }
    if (oldSelection) {
      setOldSelection(null);
    }
  }, [oldSelection]);

  const archiveSelection = useCallback(() => {
    const selection = $getSelection();
    if (selection) {
      setOldSelection(selection);
      $setSelection(null);
    }
  }, []);

  const rootElement = editor.getRootElement();

  useEffect(() => {
    return mergeRegister(
      editor.registerCommand(
        KEY_DOWN_COMMAND,
        event => {
          const {key, metaKey, ctrlKey} = event;
          const simpleKey = key.length === 1;
          const isTrigger = triggers.some(trigger => key === trigger);
          const wordChar = isWordChar(key, triggers);
          const selectionInfo = getSelectionInfo(triggers);
          if (!simpleKey || (!wordChar && !isTrigger) || !selectionInfo || metaKey || ctrlKey) {
            return false;
          }
          const {
            node,
            offset,
            isTextNode,
            textContent,
            prevNode,
            nextNode,
            wordCharAfterCursor,
            cursorAtStartOfNode,
            cursorAtEndOfNode,
          } = selectionInfo;
          if (isTextNode && cursorAtStartOfNode && $isBeautifulMentionNode(prevNode)) {
            node.insertBefore($createTextNode(' '));
            return true;
          }
          if (isTextNode && cursorAtEndOfNode && $isBeautifulMentionNode(nextNode)) {
            node.insertAfter($createTextNode(' '));
            return true;
          }
          if (isTextNode && isTrigger && wordCharAfterCursor) {
            const content = `${textContent.substring(0, offset)} ${textContent.substring(offset)}`;
            node.setTextContent(content);
            return true;
          }
          if ($isBeautifulMentionNode(node) && nextNode === null) {
            node.insertAfter($createTextNode(' '));
            return true;
          }
          return false;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        INSERT_MENTION_COMMAND,
        ({trigger, value, focus = true}) => {
          setSelection();
          const result = insertMention(triggers, trigger, value);
          if (!focus) {
            archiveSelection();
          }
          return result;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        REMOVE_MENTIONS_COMMAND,
        ({trigger, value, focus}) => {
          let removed = false;
          setSelection();
          const mentions = $nodesOfType(BeautifulMentionNode);
          for (const mention of mentions) {
            const sameTrigger = mention.getTrigger() === trigger;
            const sameValue = mention.getValue() === value;
            if (sameTrigger && (sameValue || !value)) {
              const prev = getPreviousSibling(mention);
              const next = getNextSibling(mention);
              mention.remove();
              removed = true;
              // Prevent double spaces
              if (prev?.getTextContent().endsWith(' ') && next?.getTextContent().startsWith(' ')) {
                prev.setTextContent(prev.getTextContent().slice(0, -1));
              }
              // Remove trailing space
              if (next === null && $isTextNode(prev) && prev.getTextContent().endsWith(' ')) {
                prev.setTextContent(prev.getTextContent().trimEnd());
              }
            }
          }
          if (removed && !focus) {
            archiveSelection();
          }
          return removed;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        RENAME_MENTIONS_COMMAND,
        ({trigger, value, newValue, focus}) => {
          let renamed = false;
          setSelection();
          const mentions = $nodesOfType(BeautifulMentionNode);
          for (const mention of mentions) {
            const sameTrigger = mention.getTrigger() === trigger;
            const sameValue = mention.getValue() === value;
            if (sameTrigger && (sameValue || !value)) {
              renamed = true;
              mention.setValue(newValue);
            }
          }
          if (renamed && !focus) {
            archiveSelection();
          }
          return renamed;
        },
        COMMAND_PRIORITY_LOW,
      ),
      editor.registerCommand(
        OPEN_MENTIONS_MENU_COMMAND,
        ({trigger}) => insertMention(triggers, trigger),
        COMMAND_PRIORITY_LOW,
      ),
    );
  }, [editor, triggers, isEditorFocused, insertTextAsMention, setSelection, archiveSelection]);

  const getPosition = () => {
    if (!rootElement) {
      return {bottom: 0, left: 0};
    }

    const boundingClientRect = rootElement.getBoundingClientRect();

    return {bottom: window.innerHeight - boundingClientRect.top + 24, left: boundingClientRect.left};
  };

  const menuRenderFn = (
    anchorElementRef: MutableRefObject<HTMLElement | null>,
    {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex}: ItemProps<MenuOption>,
  ) => {
    if (!anchorElementRef.current || !options.length) {
      return null;
    }

    const {bottom, left} = getPosition();

    return ReactDOM.createPortal(
      <IgnoreOutsideClickWrapper>
        <FadingScrollbar
          className="conversation-input-bar-mention-suggestion"
          style={{bottom, left, overflowY: 'auto'}}
          data-uie-name="list-mention-suggestions"
        >
          <div className="mention-suggestion-list">
            {options
              .map((option, index) => {
                const selected = selectedIndex === index;
                return (
                  <MentionSuggestionsItem
                    ref={option.setRefElement}
                    key={option.user.id}
                    suggestion={option.user}
                    isSelected={selected}
                    onSuggestionClick={() => {
                      setHighlightedIndex(index);
                      selectOptionAndCleanUp(option);
                    }}
                    onMouseEnter={() => {
                      setHighlightedIndex(index);
                    }}
                  />
                );
              })
              .reverse()}
          </div>
        </FadingScrollbar>
      </IgnoreOutsideClickWrapper>,
      anchorElementRef.current,
    );
  };

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={handleSelectOption}
      triggerFn={checkForMentionMatch}
      options={options}
      onClose={handleClose}
      menuRenderFn={menuRenderFn}
    />
  );
};
