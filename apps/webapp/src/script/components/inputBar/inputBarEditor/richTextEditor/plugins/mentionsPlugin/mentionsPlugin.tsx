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

import {type ReactElement, MutableRefObject, useCallback, useState} from 'react';

import type {JSX} from '@emotion/react/jsx-runtime';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {MenuOption as _MenuOption, MenuRenderFn, MenuTextMatch} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {isEmptyArray, isNullOrUndefined} from '@sindresorhus/is';
import {$createTextNode, TextNode} from 'lexical';
import * as ReactDOM from 'react-dom';

import {EveryoneMentionSuggestionsItem} from './everyoneMentionSuggestionsItem';
import {MentionSuggestionsItem} from './mentionSuggestionsItem';

import {EVERYONE_MENTION_VALUE} from '../../../../../../message/mentionEntity';
import {User} from '../../../../../../repositories/entity/User';
import {FadingScrollbar} from '../../../../../fadingScrollbar';
import {IgnoreOutsideClickWrapper} from '../../../../util/clickHandlers';
import {$createMentionNode} from '../../nodes/mentionNode';
import {getSelectionInfo} from '../../utils/getSelectionInfo';
import {TypeaheadMenuPlugin} from '../typeaheadMenuPlugin/typeaheadMenuPlugin';

const mentionMenuVerticalOffsetInPixels = 24;

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

/** The target of a mention suggestion: a single user, or everyone in the conversation (`@all`). */
type MentionTarget = {type: 'user'; user: User} | {type: 'everyone'};

const everyoneMentionOptionKey = '@everyone';

export class MenuOption extends _MenuOption {
  target: MentionTarget;
  value: string;
  label: string;
  constructor(target: MentionTarget, value: string, label?: string) {
    super(target.type === 'everyone' ? everyoneMentionOptionKey : target.user.id);
    this.target = target;
    this.value = value;
    this.label = label ?? value;
  }

  get isEveryone(): boolean {
    return this.target.type === 'everyone';
  }
}

/**
 * Checks whether the mention of everyone (`@all`) matches what the user typed after `@`.
 * It matches a case-insensitive prefix of `all`, including an empty query.
 */
export const matchesEveryoneMention = (queryString: string | null | undefined): boolean => {
  return typeof queryString === 'string' && EVERYONE_MENTION_VALUE.startsWith(queryString.toLowerCase());
};

interface MentionsPluginProps {
  onSearch: (queryString?: string | null) => User[];
  openStateRef: MutableRefObject<boolean>;
  /** Whether the mention of everyone (`@all`) is offered. */
  isEveryoneMentionAvailable?: boolean;
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
}): JSX.Element {
  const {bottom, left} = getPosition();

  return (
    <IgnoreOutsideClickWrapper>
      <FadingScrollbar
        className="conversation-input-bar-mention-suggestion"
        style={{bottom, left, overflowY: 'auto'}}
        data-uie-name="list-mention-suggestions"
      >
        <div className="mention-suggestion-list">
          {options.map((menuOption, index) => {
            if (menuOption.target.type === 'everyone') {
              return (
                <EveryoneMentionSuggestionsItem
                  ref={menuOption.setRefElement}
                  key={menuOption.key}
                  isSelected={selectedIndex === index}
                  onSuggestionClick={() => {
                    setHighlightedIndex(index);
                    selectOptionAndCleanUp(menuOption);
                  }}
                  onMouseEnter={() => {
                    setHighlightedIndex(index);
                  }}
                />
              );
            }
            return (
              <MentionSuggestionsItem
                ref={menuOption.setRefElement}
                key={menuOption.key}
                suggestion={menuOption.target.user}
                isSelected={selectedIndex === index}
                onSuggestionClick={() => {
                  setHighlightedIndex(index);
                  selectOptionAndCleanUp(menuOption);
                }}
                onMouseEnter={() => {
                  setHighlightedIndex(index);
                }}
              />
            );
          })}
        </div>
      </FadingScrollbar>
    </IgnoreOutsideClickWrapper>
  );
}

export function MentionsPlugin({
  onSearch,
  openStateRef,
  isEveryoneMentionAvailable = false,
}: MentionsPluginProps): ReactElement {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>();

  const results = onSearch(queryString);

  const userOptions = results.map(result => {
    return new MenuOption({type: 'user', user: result}, result.name());
  });
  const everyoneOptions =
    isEveryoneMentionAvailable && matchesEveryoneMention(queryString)
      ? [new MenuOption({type: 'everyone'}, EVERYONE_MENTION_VALUE)]
      : [];

  // The menu is reversed, so the last option sits closest to the input. The mention of everyone comes first.
  const options = [...everyoneOptions, ...userOptions].toReversed();

  const insertMention = useCallback(
    (selectedOption: MenuOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        if (!isNullOrUndefined(nodeToReplace)) {
          const mentionNode = $createMentionNode(TRIGGER, selectedOption.value, selectedOption.isEveryone);
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
    if (isNullOrUndefined(info) || (info.isTextNode && info.wordCharAfterCursor)) {
      return null;
    }
    return checkForMentions(text);
  }, []);

  const rootElement = editor.getRootElement();

  type GetPositionResult = {bottom: number; left: number};
  const getPosition = (): GetPositionResult => {
    if (isNullOrUndefined(rootElement)) {
      return {bottom: 0, left: 0};
    }

    const boundingClientRect = rootElement.getBoundingClientRect();

    return {
      bottom: window.innerHeight - boundingClientRect.top + mentionMenuVerticalOffsetInPixels,
      left: boundingClientRect.left,
    };
  };

  const menuRenderFn: MenuRenderFn<MenuOption> = (anchorElementRef, params) => {
    if (isNullOrUndefined(anchorElementRef.current) || isEmptyArray(options)) {
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
      onClose={() => {
        return (openStateRef.current = false);
      }}
      containerId="mentions-typeahead-menu"
      isReversed
    />
  );
}
