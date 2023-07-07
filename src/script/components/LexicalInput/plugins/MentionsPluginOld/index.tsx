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

import {useCallback, useMemo, useState} from 'react';

import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  MenuTextMatch,
  useBasicTypeaheadTriggerMatch,
} from '@lexical/react/LexicalTypeaheadMenuPlugin';
import {TextNode} from 'lexical';
import * as ReactDOM from 'react-dom';

import {Avatar, AVATAR_SIZE} from 'Components/Avatar';
import {isEnterKey} from 'Util/KeyboardUtil';

import {User} from '../../../../entity/User';
// import {$createMentionNode} from '../../nodes/MentionNode';

const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
const NAME = `\\b[A-Z][^\\s${PUNCTUATION}]`;

const DocumentMentionsRegex = {
  NAME,
  PUNCTUATION,
};

const CapitalizedNameMentionsRegex = new RegExp(`(^|[^#])((?:${DocumentMentionsRegex.NAME}{${1},})$)`);

const PUNC = DocumentMentionsRegex.PUNCTUATION;

const TRIGGERS = ['@'].join('');

// Chars we expect to see in a mention (non-space, non-punctuation).
const VALID_CHARS = `[^${TRIGGERS}${PUNC}\\s]`;

// Non-standard series of chars. Each series must be preceded and followed by
// a valid char.
const VALID_JOINS =
  `(?:` +
  `\\.[ |$]|` + // E.g. "r. " in "Mr. Smith"
  ` |` + // E.g. " " in "Josh Duck"
  `[${PUNC}]|` + // E.g. "-' in "Salier-Hellendag"
  `)`;

const LENGTH_LIMIT = 75;

const AtSignMentionsRegex = new RegExp(
  `(^|\\s|\\()(` + `[${TRIGGERS}]` + `((?:${VALID_CHARS}${VALID_JOINS}){0,${LENGTH_LIMIT}})` + `)$`,
);

// 50 is the longest alias length limit.
const ALIAS_LENGTH_LIMIT = 50;

// Regex used to match alias.
const AtSignMentionsRegexAliasRegex = new RegExp(
  `(^|\\s|\\()(` + `[${TRIGGERS}]` + `((?:${VALID_CHARS}){0,${ALIAS_LENGTH_LIMIT}})` + `)$`,
);

// At most, 5 suggestions are shown in the popup.
const SUGGESTION_LIST_LENGTH_LIMIT = 5;

function checkForCapitalizedNameMentions(text: string, minMatchLength: number): MenuTextMatch | null {
  const match = CapitalizedNameMentionsRegex.exec(text);

  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];
    const matchingString = match[2];

    if (matchingString != null && matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: matchingString,
      };
    }
  }
  return null;
}

function checkForAtSignMentions(text: string, minMatchLength: number): MenuTextMatch | null {
  let match = AtSignMentionsRegex.exec(text);

  if (match === null) {
    match = AtSignMentionsRegexAliasRegex.exec(text);
  }

  if (match !== null) {
    // The strategy ignores leading whitespace but we need to know it's
    // length to add it to the leadOffset
    const maybeLeadingWhitespace = match[1];
    const matchingString = match[3];

    if (matchingString.length >= minMatchLength) {
      return {
        leadOffset: match.index + maybeLeadingWhitespace.length,
        matchingString,
        replaceableString: match[2],
      };
    }
  }
  return null;
}

function getPossibleQueryMatch(text: string): MenuTextMatch | null {
  const match = checkForAtSignMentions(text, 1);
  return match === null ? checkForCapitalizedNameMentions(text, 3) : match;
}

export class MentionTypeaheadOption extends MenuOption {
  name: string;
  picture: JSX.Element;
  id: string;
  domain?: string;
  readonly length: number;

  constructor(id: string, name: string, picture: JSX.Element, domain?: string) {
    super(name);
    this.name = name;
    this.picture = picture;
    this.id = id;
    // -1 because @ sign on beggining of name
    this.length = name.length - 1;

    if (domain) {
      this.domain = domain;
    }
  }
}

const MentionsTypeaheadMenuItem = ({
  index,
  isSelected,
  onClick,
  onMouseEnter,
  option,
}: {
  index: number;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  option: MentionTypeaheadOption;
}) => {
  let className = 'item';
  if (isSelected) {
    className += ' selected';
  }
  return (
    <li
      key={option.key}
      tabIndex={-1}
      className={className}
      ref={option.setRefElement}
      role="option"
      aria-selected={isSelected}
      id={`typeahead-item-${index}`}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      onKeyDown={event => {
        if (isEnterKey(event)) {
          onClick();
        }
      }}
    >
      {option.picture}
      <span className="text">{option.name}</span>
    </li>
  );
};

interface NewMentionsPluginProps {
  onAddMention: (arg: any) => void;
  onSearch: (query: string) => User[];
}

export const NewMentionsPlugin = ({onAddMention, onSearch}: NewMentionsPluginProps) => {
  const [editor] = useLexicalComposerContext();
  const [queryString, setQueryString] = useState<string | null>('');

  const results = onSearch(queryString || '');

  const checkForSlashTriggerMatch = useBasicTypeaheadTriggerMatch('/', {
    minLength: 0,
  });

  const options = useMemo(
    () =>
      results
        .map(
          result =>
            new MentionTypeaheadOption(
              result.id,
              result.name(),
              (
                <Avatar
                  participant={result}
                  avatarSize={AVATAR_SIZE.XXX_SMALL}
                  className="mention-suggestion-list__item__avatar"
                />
              ),
              result.domain,
            ),
        )
        .slice(0, SUGGESTION_LIST_LENGTH_LIMIT),
    [results],
  );

  const onSelectOption = useCallback(
    (selectedOption: MentionTypeaheadOption, nodeToReplace: TextNode | null, closeMenu: () => void) => {
      editor.update(() => {
        // const mentionNode = $createMentionNode(`@${selectedOption.name}`);

        if (nodeToReplace) {
          // nodeToReplace.replace(mentionNode);
        }
        // mentionNode.select();
        closeMenu();
      });
    },
    [editor],
  );

  const checkForMentionMatch = useCallback(
    (text: string) => {
      const slashMatch = checkForSlashTriggerMatch(text, editor);

      if (slashMatch !== null) {
        return null;
      }

      return getPossibleQueryMatch(text);
    },
    [checkForSlashTriggerMatch, editor],
  );

  return (
    <LexicalTypeaheadMenuPlugin
      onQueryChange={setQueryString}
      onSelectOption={onSelectOption}
      triggerFn={checkForMentionMatch}
      options={options}
      menuRenderFn={(anchorElementRef, {selectedIndex, selectOptionAndCleanUp, setHighlightedIndex}) =>
        anchorElementRef.current && results.length
          ? ReactDOM.createPortal(
              <div className="typeahead-popover mentions-menu">
                <ul>
                  {options.map((option, index: number) => (
                    <MentionsTypeaheadMenuItem
                      index={index}
                      isSelected={selectedIndex === index}
                      onClick={() => {
                        setHighlightedIndex(index);
                        selectOptionAndCleanUp(option);
                        onAddMention(option);
                      }}
                      onMouseEnter={() => {
                        setHighlightedIndex(index);
                      }}
                      key={option.key}
                      option={option}
                    />
                  ))}
                </ul>
              </div>,
              anchorElementRef.current,
            )
          : null
      }
    />
  );
};
