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

interface NoteTakerPanelState {
  isOpen: boolean;
  isRecording: boolean;
  panelTarget: HTMLDivElement | null;
  setOpen: (isOpen: boolean) => void;
  setRecording: (isRecording: boolean) => void;
  setPanelTarget: (panelTarget: HTMLDivElement | null) => void;
}

// Visibility and the portal target are independent of the mounted recording controller.
export const useNoteTakerPanelStore = create<NoteTakerPanelState>(set => {
  return {
    isOpen: false,
    isRecording: false,
    panelTarget: null,
    setOpen: isOpen => {
      set({isOpen});
    },
    setRecording: isRecording => {
      set({isRecording});
    },
    setPanelTarget: panelTarget => {
      set({panelTarget});
    },
  };
});
