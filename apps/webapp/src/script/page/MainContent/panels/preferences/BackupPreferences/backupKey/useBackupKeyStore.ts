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

import {create} from 'zustand';

interface BackupKeyState {
  key?: string;
  setKey: (key: string) => void;
  clearKey: () => void;
}

/**
 * PROTOTYPE: the backup encryption key lives in memory only and is lost on reload.
 * Never log or persist the key until the storage design is decided.
 */
export const useBackupKeyStore = create<BackupKeyState>(set => ({
  key: undefined,
  setKey: key => set({key}),
  clearKey: () => set({key: undefined}),
}));
