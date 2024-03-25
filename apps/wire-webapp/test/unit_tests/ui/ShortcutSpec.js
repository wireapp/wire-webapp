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

import {Runtime} from '@wireapp/commons';

import {Shortcut} from 'src/script/ui/Shortcut';
import {ShortcutType} from 'src/script/ui/ShortcutType';

describe('Shortcut', () => {
  const map = Shortcut.shortcutMap;

  describe('getShortcut', () => {
    describe('webapp', () => {
      beforeEach(() => {
        spyOn(Runtime, 'isDesktopApp').and.returnValue(false);
      });

      it('can get shortcut for mac', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(true);
        const mac_shortcut = Shortcut.getShortcut(ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe(map[ShortcutType.ADD_PEOPLE].shortcut.webapp.macos);
      });

      it('can get shortcut for pc', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(false);
        const pc_shortcut = Shortcut.getShortcut(ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe(map[ShortcutType.ADD_PEOPLE].shortcut.webapp.pc);
      });
    });

    describe('electron', () => {
      beforeEach(() => {
        spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      });

      it('can get shortcut for electron mac', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(true);
        const mac_shortcut = Shortcut.getShortcut(ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe(map[ShortcutType.ADD_PEOPLE].shortcut.electron.macos);
      });

      it('can get shortcut for electron pc', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(false);
        const pc_shortcut = Shortcut.getShortcut(ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe(map[ShortcutType.ADD_PEOPLE].shortcut.electron.pc);
      });
    });
  });

  describe('getShortcutTooltip', () => {
    describe('webapp', () => {
      beforeEach(() => {
        spyOn(Runtime, 'isDesktopApp').and.returnValue(false);
      });

      it('can create a beautified tooltip for webapp mac', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(true);
        const mac_shortcut = Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe('⌘⇧K');
      });

      it('can create a beautified tooltip for webapp pc', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(false);
        const pc_shortcut = Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe('Ctrl + Shift + K');
      });
    });

    describe('electron', () => {
      beforeEach(() => {
        spyOn(Runtime, 'isDesktopApp').and.returnValue(true);
      });

      it('can create a beautified tooltip for webapp mac', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(true);
        const mac_shortcut = Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE);

        expect(mac_shortcut).toBe('⌘⇧K');
      });

      it('can create a beautified tooltip for webapp pc', () => {
        spyOn(Runtime, 'isMacOS').and.returnValue(false);
        const pc_shortcut = Shortcut.getShortcutTooltip(ShortcutType.ADD_PEOPLE);

        expect(pc_shortcut).toBe('Ctrl + Shift + K');
      });
    });
  });

  describe('getBeautifiedShortcutMac', () => {
    it('can create a beautified shortcut', () => {
      const mac_shortcut = Shortcut.getBeautifiedShortcutMac('command + q');

      expect(mac_shortcut).toBe('⌘Q');
    });
  });

  describe('get_beautified_shortcut_pc', () => {
    it('can create a beautified shortcut', () => {
      const pc_shortcut = Shortcut.getBeautifiedShortcutWin('alt + F4');

      expect(pc_shortcut).toBe('Alt + F4');
    });
  });
});
