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

describe('Shortcut', () => {
  const map = z.ui.Shortcut.shortcutMap;

  describe('getShortcut', () => {
    describe('webapp', () => {
      beforeEach(() => {
        z.util.Environment.electron = false;
      });

      it('can get shortcut for mac', () => {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.getShortcut(z.ui.ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe(map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.webapp.macos);
      });

      it('can get shortcut for pc', () => {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.getShortcut(z.ui.ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe(map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.webapp.pc);
      });
    });

    describe('electron', () => {
      beforeEach(() => {
        z.util.Environment.electron = true;
      });

      it('can get shortcut for electron mac', () => {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.getShortcut(z.ui.ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe(map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.electron.macos);
      });

      it('can get shortcut for electron pc', () => {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.getShortcut(z.ui.ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe(map[z.ui.ShortcutType.ADD_PEOPLE].shortcut.electron.pc);
      });
    });
  });

  describe('getShortcutTooltip', () => {
    describe('webapp', () => {
      beforeEach(() => {
        z.util.Environment.electron = false;
      });

      it('can create a beautified tooltip for webapp mac', () => {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe('⌘⇧K');
      });

      it('can create a beautified tooltip for webapp pc', () => {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe('Ctrl + Shift + K');
      });
    });

    describe('electron', () => {
      beforeEach(() => {
        z.util.Environment.electron = true;
      });

      it('can create a beautified tooltip for webapp mac', () => {
        z.util.Environment.os.mac = true;
        const mac_shortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe('⌘⇧K');
      });

      it('can create a beautified tooltip for webapp pc', () => {
        z.util.Environment.os.mac = false;
        const pc_shortcut = z.ui.Shortcut.getShortcutTooltip(z.ui.ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe('Ctrl + Shift + K');
      });
    });
  });

  describe('getBeautifiedShortcutMac', () => {
    it('can create a beautified shortcut', () => {
      const mac_shortcut = z.ui.Shortcut.getBeautifiedShortcutMac('command + q');

      expect(mac_shortcut).toBe('⌘Q');
    });
  });

  describe('get_beautified_shortcut_pc', () => {
    it('can create a beautified shortcut', () => {
      const pc_shortcut = z.ui.Shortcut.getBeautifiedShortcutWin('alt + F4');

      expect(pc_shortcut).toBe('Alt + F4');
    });
  });
});
