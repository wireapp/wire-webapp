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

import {useEffect, useState} from 'react';

import * as Icon from 'Components/icon';

import {ConversationTab} from '../conversationTab';
import {SidebarTabs} from '../useSidebarStore';

type SettingsTabProps = {
  isActive: boolean;
  isDebugEnabled: boolean;
  onOpenDeveloperMenu: () => void;
  onOpenPreferences: () => void;
  settingsLabel: string;
  showNotificationsBadge: boolean;
};

export const SettingsTab = ({
  isActive,
  isDebugEnabled,
  onOpenDeveloperMenu,
  onOpenPreferences,
  settingsLabel,
  showNotificationsBadge,
}: SettingsTabProps) => {
  const [isAltKeyPressed, setIsAltKeyPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isDebugEnabled) {
      return;
    }

    const updateAltKeyPressed = (event: KeyboardEvent) => setIsAltKeyPressed(event.altKey);
    const resetAltKeyPressed = () => setIsAltKeyPressed(false);

    window.addEventListener('keydown', updateAltKeyPressed);
    window.addEventListener('keyup', updateAltKeyPressed);
    window.addEventListener('blur', resetAltKeyPressed);

    return () => {
      window.removeEventListener('keydown', updateAltKeyPressed);
      window.removeEventListener('keyup', updateAltKeyPressed);
      window.removeEventListener('blur', resetAltKeyPressed);
    };
  }, [isDebugEnabled]);

  const isDeveloperMenuTargeted = isDebugEnabled && isAltKeyPressed && (isHovered || isFocused);
  const label = isDeveloperMenuTargeted ? 'Developer Menu' : settingsLabel;

  return (
    <ConversationTab
      title={label}
      label={label}
      type={SidebarTabs.PREFERENCES}
      Icon={<Icon.SettingsIcon />}
      onClick={event => {
        if (isDeveloperMenuTargeted) {
          event.stopPropagation();
          onOpenDeveloperMenu();
          return;
        }

        onOpenPreferences();
      }}
      conversationTabIndex={1}
      dataUieName="go-preferences"
      showNotificationsBadge={showNotificationsBadge}
      isActive={isActive}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    />
  );
};
