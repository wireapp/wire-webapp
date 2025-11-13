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

import {useState, useRef, useEffect, useId} from 'react';

import {container} from 'tsyringe';

import {Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {TeamState} from 'Repositories/team/TeamState';
import {Config} from 'src/script/Config';
import {SidebarTabs, useSidebarStore} from 'src/script/page/LeftSidebar/panels/Conversations/useSidebarStore';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {handleEscDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';
import {useChannelsFeatureFlag} from 'Util/useChannelsFeatureFlag';

import {dropdown, dropdownCheckboxItem, filterButton, filterButtonWrapper} from './TabsFilterButton.styles';

export const TabsFilterButton = () => {
  const {visibleTabs, toggleTabVisibility} = useSidebarStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const {isChannelsEnabled} = useChannelsFeatureFlag();
  const teamState = container.resolve(TeamState);
  const {isCellsEnabled: isCellsEnabledForTeam} = useKoSubscribableChildren(teamState, ['isCellsEnabled']);

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
    const handleKeyDown = (event: KeyboardEvent) => {
      handleEscDown(event, () => {
        setIsOpen(false);
        buttonRef.current?.focus();
      });
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!Config.getConfig().FEATURE.ENABLE_ADVANCED_FILTERS) {
    return null;
  }

  const showCells = Config.getConfig().FEATURE.ENABLE_CELLS && isCellsEnabledForTeam;

  const availableTabs = [
    {type: SidebarTabs.FAVORITES, label: t('conversationLabelFavorites')},
    {type: SidebarTabs.GROUPS, label: t('conversationLabelGroups')},
    {type: SidebarTabs.DIRECTS, label: t('conversationLabelDirects')},
    {type: SidebarTabs.FOLDER, label: t('folderViewTooltip')},
    {type: SidebarTabs.ARCHIVES, label: t('conversationFooterArchive')},
    {type: SidebarTabs.UNREAD, label: t('conversationLabelUnread')},
    {type: SidebarTabs.MENTIONS, label: t('conversationLabelMentions')},
    {type: SidebarTabs.REPLIES, label: t('conversationLabelReplies')},
    {type: SidebarTabs.DRAFTS, label: t('conversationLabelDrafts')},
    {type: SidebarTabs.PINGS, label: t('conversationLabelPings')},
  ];

  if (isChannelsEnabled) {
    availableTabs.splice(2, 0, {type: SidebarTabs.CHANNELS, label: t('conversationLabelChannels')});
  }

  if (showCells) {
    availableTabs.push({type: SidebarTabs.CELLS, label: t('cells.sidebar.title')});
  }

  return (
    <div css={filterButtonWrapper}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        data-uie-name="tabs-filter-button"
        title={t('tabsFilterTooltip')}
        css={filterButton(isOpen)}
        type="button"
        aria-label={t('tabsFilterTooltip')}
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
          aria-label={t('tabsFilterTooltip')}
        >
          {availableTabs.map(tab => (
            <div
              key={tab.type}
              css={dropdownCheckboxItem}
              role="menuitemcheckbox"
              aria-checked={visibleTabs.includes(tab.type)}
            >
              <Checkbox checked={visibleTabs.includes(tab.type)} onChange={() => toggleTabVisibility(tab.type)}>
                <CheckboxLabel>{tab.label}</CheckboxLabel>
              </Checkbox>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
