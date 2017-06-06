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

describe('Shortcut', function() {
  const map = z.ui.Shortcut.shortcut_map;

  describe('get_shortcut', function() {
    describe('webapp', function() {
      beforeEach(function() {
        z.util.Environment.electron = false;
      });
      it('can get shortcut for mac', function() {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.get_shortcut(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(mac_shortcut).toBe(
          map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.webapp.macos,
        );
      });

      it('can get shortcut for pc', function() {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.get_shortcut(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(pc_shortcut).toBe(
          map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.webapp.pc,
        );
      });
    });

    describe('electron', function() {
      beforeEach(function() {
        z.util.Environment.electron = true;
      });
      it('can get shortcut for electron mac', function() {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.get_shortcut(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(mac_shortcut).toBe(
          map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.electron.macos,
        );
      });

      it('can get shortcut for electron pc', function() {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.get_shortcut(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(pc_shortcut).toBe(
          map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.electron.pc,
        );
      });
    });
  });

  describe('get_shortcut_tooltip', function() {
    describe('webapp', function() {
      beforeEach(function() {
        z.util.Environment.electron = false;
      });
      it('can create a beautified tooltip for webapp mac', function() {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.get_shortcut_tooltip(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(mac_shortcut).toBe('⌘⇧K');
      });

      it('can create a beautified tooltip for webapp pc', function() {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.get_shortcut_tooltip(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(pc_shortcut).toBe('Ctrl + Shift + K');
      });
    });

    describe('electron', function() {
      beforeEach(function() {
        z.util.Environment.electron = true;
      });

      it('can create a beautified tooltip for webapp mac', function() {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.get_shortcut_tooltip(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(mac_shortcut).toBe('⌘⇧K');
      });

      it('can create a beautified tooltip for webapp pc', function() {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.get_shortcut_tooltip(
          z.ui.ShortcutType.ADD_PEOPLE,
        );
        expect(pc_shortcut).toBe('Ctrl + Shift + K');
      });
    });
  });

  describe('get_beautified_shortcut_mac', function() {
    it('can create a beautified shortcut', function() {
      const mac_shortcut = z.ui.Shortcut.get_beautified_shortcut_mac(
        'command + q',
      );
      expect(mac_shortcut).toBe('⌘Q');
    });
  });

  describe('get_beautified_shortcut_pc', function() {
    it('can create a beautified shortcut', function() {
      const pc_shortcut = z.ui.Shortcut.get_beautified_shortcut_win('alt + F4');
      expect(pc_shortcut).toBe('Alt + F4');
    });
  });
});
