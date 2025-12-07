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

import {MutableRefObject, useCallback, useState} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {MenuOption as _MenuOption, MenuRenderFn, MenuTextMatch} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {$createTextNode, TextNode} from 'lexical';
import * as ReactDOM from 'react-dom';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {IgnoreOutsideClickWrapper} from 'Components/InputBar/util/clickHandlers';
import {User} from 'Repositories/entity/User';

import {MentionSuggestionsItem} from './MentionSuggestionsItem';

import {$createMentionNode} from '../../nodes/MentionNode';
import {getSelectionInfo} from '../../utils/getSelectionInfo';
import {TypeaheadMenuPlugin} from '../TypeaheadMenuPlugin/TypeaheadMenuPlugin';

const TRIGGER = '@';
const triggerRegexp = new RegExp(`(^| )(${TRIGGER}(\\S*))$`);

/**
 * Will detect mentions triggers in a text
 * @param text the text in which to look for mentions triggers
 */
function checkForMentions(text: string): MenuTextMatch | null {
  const match = triggerRegexp.exec(text);

  if (match === null) {
    return null;
  }
  const [, , search, term] = match;

  return {
    leadOffset: match.index,
    matchingString: term,
    replaceableString: search,
  };
}

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

interface MentionsPluginProps {
  onSearch: (queryString?: string | null) => User[];
  openStateRef: MutableRefObject<boolean>;
}

function MentionMenu({
  getPosition,
  options,
  selectedIndex,
  selectOptionAndCleanUp,
  setHighlightedIndex,
}: {
  getPosition: () => {bottom: number; left: number};
  options: MenuOption[];
  selectedIndex: number | null;
  selectOptionAndCleanUp: (option: MenuOption) => void;
  setHighlightedIndex: (index: number) => void;
}) {
  const {bottom, left} = getPosition();

  return (
    <IgnoreOutsideClickWrapper>
      <FadingScrollbar
        className="conversation-input-bar-mention-suggestion"
        style={{bottom, left, overflowY: 'auto'}}
        data-uie-name="list-mention-suggestions"
      >
        <div className="mention-suggestion-list">
          {options.map((menuOption, index) => (
            <MentionSuggestionsItem
              ref={menuOption.setRefElement}
              key={menuOption.user.id}
              suggestion={menuOption.user}
              isSelected={selectedIndex === index}
              onSuggestionClick={() => {
                setHighlightedIndex(index);
                selectOptionAndCleanUp(menuOption);
              }}
              onMouseEnter={() => {
                setHighlightedIndex(index);
              }}
            />
          ))}
        </div>
      </FadingScrollbar>
    </IgnoreOutsideClickWrapper>
  );
}

export function MentionsPlugin({onSearch, openStateRef}: MentionsPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>();

  const results = onSearch(queryString);

  const options = results.map(result => new MenuOption(result, result.name())).reverse();

  const insertMention = useCallback(
    (selectedOption: MenuOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        if (nodeToReplace) {
          const mentionNode = $createMentionNode(TRIGGER, selectedOption.value);
          nodeToReplace.replace(mentionNode);
          mentionNode.insertAfter($createTextNode(' '));
        }
      });
      closeMenu();
    },
    [editor],
  );

  const checkForMentionMatch = useCallback((text: string) => {
    // Don't show the menu if the next character is a word character
    const info = getSelectionInfo([TRIGGER]);
    if (!info || (info.isTextNode && info.wordCharAfterCursor)) {
      return null;
    }
    return checkForMentions(text);
  }, []);

  const rootElement = editor.getRootElement();

  const getPosition = () => {
    if (!rootElement) {
      return {bottom: 0, left: 0};
    }

    const boundingClientRect = rootElement.getBoundingClientRect();

    return {bottom: window.innerHeight - boundingClientRect.top + 24, left: boundingClientRect.left};
  };

  const menuRenderFn: MenuRenderFn<MenuOption> = (anchorElementRef, params) => {
    if (!anchorElementRef.current || !options.length) {
      return null;
    }

    return ReactDOM.createPortal(<MentionMenu getPosition={getPosition} {...params} />, anchorElementRef.current);
  };

  openStateRef.current = options.length > 0;

  return (
    <TypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={insertMention}
      triggerFn={checkForMentionMatch}
      options={options}
      menuRenderFn={menuRenderFn}
      onClose={() => (openStateRef.current = false)}
      containerId="mentions-typeahead-menu"
      isReversed
    />
  );
}
