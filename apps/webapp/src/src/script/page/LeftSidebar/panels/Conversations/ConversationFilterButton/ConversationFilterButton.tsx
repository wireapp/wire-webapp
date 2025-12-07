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

import {useState, useRef, useEffect} from 'react';

import * as Icon from 'Components/Icon';
import {Config} from 'src/script/Config';
import {ConversationFilter, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {t} from 'Util/LocalizerUtil';

import {
  dropdown,
  dropdownItem,
  activeDropdownItem,
  filterButton,
  filterButtonWrapper,
} from './ConversationFilterButton.styles';

export const ConversationFilterButton = () => {
  const {conversationFilter, setConversationFilter} = useSidebarStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  if (!Config.getConfig().FEATURE.ENABLE_ADVANCED_FILTERS) {
    return null;
  }

  const filterOptions = [
    {value: ConversationFilter.NONE, label: t('conversationFilterNone')},
    {value: ConversationFilter.UNREAD, label: t('conversationFilterUnread')},
    {value: ConversationFilter.MENTIONS, label: t('conversationFilterMentions')},
    {value: ConversationFilter.REPLIES, label: t('conversationFilterReplies')},
    {value: ConversationFilter.DRAFTS, label: t('conversationFilterDrafts')},
    {value: ConversationFilter.PINGS, label: t('conversationFilterPings')},
  ];

  const handleFilterSelect = (filter: ConversationFilter) => {
    setConversationFilter(filter);
    setIsOpen(false);
  };

  const isFilterActive = conversationFilter !== ConversationFilter.NONE;

  return (
    <div css={filterButtonWrapper}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        data-uie-name="conversation-filter-button"
        title={t('conversationFilterTooltip')}
        css={filterButton(isFilterActive)}
        type="button"
      >
        <Icon.SettingsIcon width={12} height={12} />
      </button>

      {isOpen && (
        <div ref={dropdownRef} css={dropdown} data-uie-name="conversation-filter-dropdown">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleFilterSelect(option.value)}
              css={option.value === conversationFilter ? activeDropdownItem : dropdownItem}
              data-uie-name={`filter-option-${option.value.toLowerCase()}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
