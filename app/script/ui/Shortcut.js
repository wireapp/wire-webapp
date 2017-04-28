/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

(function() {
  const shortcut_map = {};

  shortcut_map[z.ui.ShortcutType.ADD_PEOPLE] = {
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
  };

  shortcut_map[z.ui.ShortcutType.ARCHIVE] = {
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
  };

  shortcut_map[z.ui.ShortcutType.CALL_REJECT] = {
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
  };

  shortcut_map[z.ui.ShortcutType.CALL_MUTE] = {
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
  };

  shortcut_map[z.ui.ShortcutType.PREV] = {
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
  };

  shortcut_map[z.ui.ShortcutType.NEXT] = {
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
  };

  shortcut_map[z.ui.ShortcutType.PING] = {
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
  };

  shortcut_map[z.ui.ShortcutType.PEOPLE] = {
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
  };

  shortcut_map[z.ui.ShortcutType.SILENCE] = {
    event: z.event.WebApp.SHORTCUT.SILENCE,
    shortcut: {
      electron: {
        macos: 'command + alt + s',
        menu: true,
        pc: 'ctrl + alt + s',
      },
      webapp: {
        macos: 'command + alt + s',
        pc: 'ctrl + alt + s',
      },
    },
  };

  shortcut_map[z.ui.ShortcutType.START] = {
    event: z.event.WebApp.SHORTCUT.START,
    shortcut: {
      electron: {
        macos: 'command + n',
        menu: true,
        pc: 'ctrl + n',
      },
      webapp: {
        macos: 'command + alt + graveaccent', // KeyboardJS fires this when using cmd + alt + n
        pc: 'ctrl + alt + graveaccent',
      },
    },
  };

  function _register_event(platform_specific_shortcut, event) {
    // bind also 'command + alt + n' for start shortcut
    if (z.util.StringUtil.includes(platform_specific_shortcut, 'graveaccent')) {
      const replaced_shortcut = platform_specific_shortcut.replace('graveaccent', 'n');
      _register_event(replaced_shortcut, event);
    }

    return keyboardJS.on(platform_specific_shortcut, function(inputEvent) {
      keyboardJS.releaseKey(inputEvent.keyCode);

      // hotfix WEBAPP-1916
      if (z.util.StringUtil.includes(platform_specific_shortcut, 'command') && !inputEvent.metaKey) {
        return;
      }

      inputEvent.preventDefault();
      amplify.publish(event);
    });
  }

  function get_beautified_shortcut_mac(shortcut) {
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
  }

  function get_beautified_shortcut_win(shortcut) {
    return shortcut
      .replace('up', '↑')
      .replace('down', '↓')
      .replace('graveaccent', 'n')
      .replace(/\w+/g, (string) => z.util.StringUtil.capitalize_first_char(string));
  }

  function get_shortcut(shortcut_name) {
    const platform = z.util.Environment.electron ? 'electron' : 'webapp';
    const platform_shortcuts = shortcut_map[shortcut_name].shortcut[platform];
    return z.util.Environment.os.mac ? platform_shortcuts.macos : platform_shortcuts.pc;
  }

  function get_shortcut_tooltip(shortcut_name) {
    const shortcut = get_shortcut(shortcut_name);
    if (shortcut) {
      if (z.util.Environment.os.mac) {
        return get_beautified_shortcut_mac(shortcut);
      }
      return get_beautified_shortcut_win(shortcut);
    }
  }

  function _init() {
    for (const shortcut in shortcut_map) {
      const data = shortcut_map[shortcut];
      if (z.util.Environment.electron && shortcut_map[shortcut].shortcut.electron.menu) {
        continue;
      }
      _register_event(get_shortcut(shortcut), data['event']);
    }
  }

  _init();

  z.ui.Shortcut = {
    get_beautified_shortcut_mac: get_beautified_shortcut_mac,
    get_beautified_shortcut_win: get_beautified_shortcut_win,
    get_shortcut: get_shortcut,
    get_shortcut_tooltip: get_shortcut_tooltip,
    shortcut_map: shortcut_map,
  };
})();
