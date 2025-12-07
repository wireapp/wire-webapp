/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {amplify} from 'amplify';
import keyboardJS from 'keyboardjs';
import {capitalizeFirstChar, includesString} from 'Util/StringUtil';

import {Runtime} from '@wireapp/commons';
import {WebAppEvents} from '@wireapp/webapp-events';

import {ShortcutType} from './ShortcutType';

interface Shortcut {
  event: string;
  shortcut: {
    electron: {
      macos: string;
      menu: boolean;
      pc: string;
    };
    webapp: {
      macos: string;
      pc: string;
    };
  };
}

const SHORTCUT_MAP: Record<string, Shortcut> = {
  [ShortcutType.ADD_PEOPLE]: {
    event: WebAppEvents.SHORTCUT.ADD_PEOPLE,
    shortcut: {
      electron: {
        macos: 'command + shift + k',
        menu: true,
        pc: 'ctrl + shift + k',
      },
      webapp: {
        macos: 'command + shift + k',
        pc: 'ctrl + shift + k',
      },
    },
  },
  [ShortcutType.ARCHIVE]: {
    event: WebAppEvents.SHORTCUT.ARCHIVE,
    shortcut: {
      electron: {
        macos: 'command + d',
        menu: true,
        pc: 'ctrl + d',
      },
      webapp: {
        macos: 'command + alt + shift + d',
        pc: 'ctrl + alt + d',
      },
    },
  },
  [ShortcutType.SEARCH]: {
    event: WebAppEvents.SHORTCUT.SEARCH,
    shortcut: {
      electron: {
        macos: 'command + k',
        menu: true,
        pc: 'ctrl + k',
      },
      webapp: {
        macos: 'command + k',
        pc: 'ctrl + alt + k',
      },
    },
  },
  [ShortcutType.PREV]: {
    event: WebAppEvents.SHORTCUT.PREV,
    shortcut: {
      electron: {
        macos: 'command + alt + down',
        menu: true,
        pc: 'alt + shift + down',
      },
      webapp: {
        macos: 'command + alt + down',
        pc: 'alt + shift + down',
      },
    },
  },
  [ShortcutType.NEXT]: {
    event: WebAppEvents.SHORTCUT.NEXT,
    shortcut: {
      electron: {
        macos: 'command + alt + up',
        menu: true,
        pc: 'alt + shift + up',
      },
      webapp: {
        macos: 'command + alt + up',
        pc: 'alt + shift + up',
      },
    },
  },
  [ShortcutType.NOTIFICATIONS]: {
    event: WebAppEvents.SHORTCUT.SILENCE,
    shortcut: {
      electron: {
        macos: 'command + alt + m',
        menu: true,
        pc: 'ctrl + alt + m',
      },
      webapp: {
        macos: 'command + alt + m',
        pc: 'ctrl + alt + m',
      },
    },
  },
  [ShortcutType.PEOPLE]: {
    event: WebAppEvents.SHORTCUT.PEOPLE,
    shortcut: {
      electron: {
        macos: 'command + i',
        menu: true,
        pc: 'ctrl + i',
      },
      webapp: {
        macos: 'command + alt + shift + i',
        pc: 'ctrl + alt + i',
      },
    },
  },
  [ShortcutType.START]: {
    event: WebAppEvents.SHORTCUT.START,
    shortcut: {
      electron: {
        macos: 'command + n',
        menu: true,
        pc: 'ctrl + n',
      },
      webapp: {
        macos: 'command + alt + graveaccent', // KeyboardJS fires this when using cmd + alt + n
        pc: 'ctrl + alt + ,',
      },
    },
  },
};

const _registerEvent = (platformSpecificShortcut: string, event: string): void => {
  // bind also 'command + alt + n' for start shortcut
  if (includesString(platformSpecificShortcut, 'graveaccent')) {
    const replacedShortcut = platformSpecificShortcut.replace('graveaccent', 'n');
    _registerEvent(replacedShortcut, event);
  }

  return keyboardJS.bind(platformSpecificShortcut, inputEvent => {
    keyboardJS.releaseKey(inputEvent.keyCode);

    // Hotfix WEBAPP-1916
    const ignoreEvent = includesString(platformSpecificShortcut, 'command') && !inputEvent.metaKey;
    if (!ignoreEvent) {
      inputEvent.preventDefault();
      amplify.publish(event);
    }
  });
};

export const Shortcut = {
  getBeautifiedShortcutMac: (shortcut: string): string => {
    return shortcut
      .replace(/\+/g, '')
      .replace(/\s+/g, '')
      .replace('alt', '⌥')
      .replace('command', '⌘')
      .replace('shift', '⇧')
      .replace('up', '↑')
      .replace('down', '↓')
      .replace('graveaccent', 'n')
      .toUpperCase();
  },

  getBeautifiedShortcutWin: (shortcut: string): string => {
    return shortcut
      .replace('up', '↑')
      .replace('down', '↓')
      .replace('graveaccent', 'n')
      .replace(/\w+/g, string => capitalizeFirstChar(string));
  },

  getShortcut: (shortcutName: string): string => {
    const platform = Runtime.isDesktopApp() ? 'electron' : 'webapp';
    const platformShortcuts = SHORTCUT_MAP[shortcutName].shortcut[platform];
    return Runtime.isMacOS() ? platformShortcuts.macos : platformShortcuts.pc;
  },

  getShortcutTooltip: (shortcutName: string): string => {
    const shortcut = Shortcut.getShortcut(shortcutName);
    return Runtime.isMacOS()
      ? Shortcut.getBeautifiedShortcutMac(shortcut)
      : Shortcut.getBeautifiedShortcutWin(shortcut);
  },

  init: (): void => {
    for (const shortcut in SHORTCUT_MAP) {
      const shortcutData = SHORTCUT_MAP[shortcut];
      const isMenuShortcut = Runtime.isDesktopApp() && shortcutData.shortcut.electron.menu;

      if (!isMenuShortcut) {
        _registerEvent(Shortcut.getShortcut(shortcut), shortcutData.event);
      }
    }
  },
  shortcutMap: SHORTCUT_MAP,
};

Shortcut.init();
