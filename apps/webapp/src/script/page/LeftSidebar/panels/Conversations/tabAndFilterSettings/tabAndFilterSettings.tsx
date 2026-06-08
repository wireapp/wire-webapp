/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useCallback, useEffect, useId, useRef, useState} from 'react';

import {Checkbox, CheckboxLabel, TabIndex} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/icon';
import {Config} from 'src/script/Config';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {useApplicationContext} from 'src/script/page/RootProvider';
import {handleEscDown, isEnterKey, isKey, isSpaceKey, KEY} from 'Util/keyboardUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {
  checkboxLabel,
  dropdown,
  dropdownCheckboxItem,
  dropdownDivider,
  dropdownHeader,
  filterButton,
  filterButtonWrapper,
  roundCheckbox,
} from './tabAndFilterSettings.styles';

const CHANNEL_TAB_INSERT_INDEX = 2;

export const TabAndFilterSettings = () => {
  const {translate} = useApplicationContext();
  const {visibleTabs, toggleTabVisibility} = useSidebarStore();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const menuId = useId();

  const {shouldShowChannelTab} = useChannelsFeatureFlag();

  const defaultTabs = [
    {type: SidebarTabs.FAVORITES, label: translate('conversationLabelFavorites')},
    {type: SidebarTabs.GROUPS, label: translate('conversationLabelGroups')},
    {type: SidebarTabs.DIRECTS, label: translate('conversationLabelDirects')},
    {type: SidebarTabs.FOLDER, label: translate('folderViewTooltip')},
    {type: SidebarTabs.ARCHIVES, label: translate('conversationFooterArchive')},
    {type: SidebarTabs.UNREAD, label: translate('conversationLabelUnread')},
    {type: SidebarTabs.MENTIONS, label: translate('conversationLabelMentions')},
    {type: SidebarTabs.REPLIES, label: translate('conversationLabelReplies')},
    {type: SidebarTabs.DRAFTS, label: translate('conversationLabelDrafts')},
    {type: SidebarTabs.PINGS, label: translate('conversationLabelPings')},
  ];
  const availableTabs = shouldShowChannelTab
    ? defaultTabs.toSpliced(CHANNEL_TAB_INSERT_INDEX, 0, {
        type: SidebarTabs.CHANNELS,
        label: translate('conversationLabelChannels'),
      })
    : defaultTabs;

  const handleMenuKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Handle Escape
      handleEscDown(event, () => {
        setIsOpen(false);
        buttonRef.current?.focus();
      });

      // Handle arrow navigation
      if (isKey(event, KEY.ARROW_DOWN)) {
        event.preventDefault();
        setFocusedIndex(prev => (prev + 1) % availableTabs.length);
      } else if (isKey(event, KEY.ARROW_UP)) {
        event.preventDefault();
        setFocusedIndex(prev => (prev - 1 + availableTabs.length) % availableTabs.length);
      }
    },
    [availableTabs],
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!event.target) {
        return;
      }

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

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleMenuKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleMenuKeyDown);
    };
  }, [isOpen, handleMenuKeyDown]);

  // Focus the item when focusedIndex changes
  useEffect(() => {
    if (isOpen && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Reset focused index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0);
    }
  }, [isOpen]);

  if (!Config.getConfig().FEATURE.ENABLE_ADVANCED_FILTERS) {
    return null;
  }

  return (
    <div css={filterButtonWrapper}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        data-uie-name="tabs-filter-button"
        title={translate('tabsFilterTooltip')}
        css={filterButton(isOpen)}
        type="button"
        aria-label={translate('tabsFilterTooltip')}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={menuId}
      >
        <Icon.SettingsIcon width={12} height={12} />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          css={dropdown}
          data-uie-name="tabs-filter-dropdown"
          id={menuId}
          role="menu"
          aria-label={translate('tabsFilterTooltip')}
        >
          <div css={dropdownHeader}>{translate('tabsFilterHeader')}</div>
          <div css={dropdownDivider} />
          {availableTabs.map((tab, index) => (
            <div key={tab.type}>
              <div
                ref={el => (itemRefs.current[index] = el)}
                css={dropdownCheckboxItem}
                role="menuitemcheckbox"
                aria-checked={visibleTabs.includes(tab.type)}
                tabIndex={index === focusedIndex ? TabIndex.FOCUSABLE : TabIndex.UNFOCUSABLE}
                onKeyDown={event => {
                  if (isEnterKey(event) || isSpaceKey(event)) {
                    event.preventDefault();
                    toggleTabVisibility(tab.type);
                  }
                }}
              >
                <Checkbox
                  wrapperCSS={roundCheckbox}
                  checked={visibleTabs.includes(tab.type)}
                  onChange={() => toggleTabVisibility(tab.type)}
                >
                  <CheckboxLabel css={checkboxLabel}>{tab.label}</CheckboxLabel>
                </Checkbox>
              </div>
              {index < availableTabs.length - 1 && <div css={dropdownDivider} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
