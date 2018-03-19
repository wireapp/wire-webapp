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

'use strict';

window.z = window.z || {};
window.z.ui = z.ui || {};

z.ui.Shortcut = (() => {
  const SHORTCUT_MAP = {
    [z.ui.ShortcutType.ADD_PEOPLE]: {
      event: z.event.WebApp.SHORTCUT.ADD_PEOPLE,
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
    [z.ui.ShortcutType.ARCHIVE]: {
      event: z.event.WebApp.SHORTCUT.ARCHIVE,
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
    [z.ui.ShortcutType.CALL_REJECT]: {
      event: z.event.WebApp.SHORTCUT.CALL_REJECT,
      shortcut: {
        electron: {
          macos: 'command + .',
          pc: 'ctrl + .',
        },
        webapp: {
          macos: 'command + alt + .',
          pc: 'ctrl + alt + .',
        },
      },
    },
    [z.ui.ShortcutType.CALL_MUTE]: {
      event: z.event.WebApp.SHORTCUT.CALL_MUTE,
      shortcut: {
        electron: {
          macos: 'command + alt + m',
          pc: 'ctrl + alt + m',
        },
        webapp: {
          macos: 'command + alt + m',
          pc: 'ctrl + alt + m',
        },
      },
    },
    [z.ui.ShortcutType.PREV]: {
      event: z.event.WebApp.SHORTCUT.PREV,
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
    [z.ui.ShortcutType.NEXT]: {
      event: z.event.WebApp.SHORTCUT.NEXT,
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
    [z.ui.ShortcutType.PING]: {
      event: z.event.WebApp.SHORTCUT.PING,
      shortcut: {
        electron: {
          macos: 'command + k',
          menu: true,
          pc: 'ctrl + k',
        },
        webapp: {
          macos: 'command + alt + k',
          pc: 'ctrl + alt + k',
        },
      },
    },
    [z.ui.ShortcutType.PEOPLE]: {
      event: z.event.WebApp.SHORTCUT.PEOPLE,
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
    [z.ui.ShortcutType.SILENCE]: {
      event: z.event.WebApp.SHORTCUT.SILENCE,
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
    [z.ui.ShortcutType.START]: {
      event: z.event.WebApp.SHORTCUT.START,
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

  const _registerEvent = (platformSpecificShortcut, event) => {
    // bind also 'command + alt + n' for start shortcut
    if (z.util.StringUtil.includes(platformSpecificShortcut, 'graveaccent')) {
      const replacedShortcut = platformSpecificShortcut.replace('graveaccent', 'n');
      _registerEvent(replacedShortcut, event);
    }

    return keyboardJS.on(platformSpecificShortcut, inputEvent => {
      keyboardJS.releaseKey(inputEvent.keyCode);

      // Hotfix WEBAPP-1916
      const ignoreEvent = z.util.StringUtil.includes(platformSpecificShortcut, 'command') && !inputEvent.metaKey;
      if (!ignoreEvent) {
        inputEvent.preventDefault();
        amplify.publish(event);
      }
    });
  };

  const _getBeautifiedShortcutMac = shortcut => {
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
  };

  const _getBeautifiedShortcutWin = shortcut => {
    return shortcut
      .replace('up', '↑')
      .replace('down', '↓')
      .replace('graveaccent', 'n')
      .replace(/\w+/g, string => z.util.StringUtil.capitalize_first_char(string));
  };

  const _getShortcut = shortcutName => {
    const platform = z.util.Environment.desktop ? 'electron' : 'webapp';
    const platformShortcuts = SHORTCUT_MAP[shortcutName].shortcut[platform];
    return z.util.Environment.os.mac ? platformShortcuts.macos : platformShortcuts.pc;
  };

  const _getShortcutTooltip = shortcutName => {
    const shortcut = _getShortcut(shortcutName);
    if (shortcut) {
      return z.util.Environment.os.mac ? _getBeautifiedShortcutMac(shortcut) : _getBeautifiedShortcutWin(shortcut);
    }
  };

  const _init = () => {
    for (const shortcut in SHORTCUT_MAP) {
      const shortcutData = SHORTCUT_MAP[shortcut];
      const isMenuShortcut = z.util.Environment.desktop && shortcutData.shortcut.electron.menu;

      if (!isMenuShortcut) {
        _registerEvent(_getShortcut(shortcut), shortcutData.event);
      }
    }
  };

  _init();

  return {
    getBeautifiedShortcutMac: _getBeautifiedShortcutMac,
    getBeautifiedShortcutWin: _getBeautifiedShortcutWin,
    getShortcut: _getShortcut,
    getShortcutTooltip: _getShortcutTooltip,
    shortcutMap: SHORTCUT_MAP,
  };
})();
