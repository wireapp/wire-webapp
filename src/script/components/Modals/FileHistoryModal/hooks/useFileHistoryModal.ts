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

import {create} from 'zustand';

/**
 * Type representing the state of the File History Modal.
 */
type FileHistoryModalState = {
  isOpen: boolean;
  nodeUuid?: string;
  onRestore?: () => void;
  showModal: (nodeUuid: string, onRestore?: () => void) => void;
  hideModal: () => void;
};

/**
 * Initial state of the File History Modal.
 */
const initialState: Omit<FileHistoryModalState, 'showModal' | 'hideModal'> = {
  isOpen: false,
  nodeUuid: undefined,
  onRestore: undefined,
};

/**
 * Hook to manage the state of the File History Modal.
 */
export const useFileHistoryModal = create<FileHistoryModalState>(set => ({
  ...initialState,
  showModal: (nodeUuid: string, onRestore?: () => void) =>
    set({
      isOpen: true,
      nodeUuid,
      onRestore,
    }),
  hideModal: () => set(() => ({...initialState})),
}));
