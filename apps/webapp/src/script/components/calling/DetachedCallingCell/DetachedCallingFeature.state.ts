/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Runtime} from '@wireapp/commons';

type DetachedCallingFeatureState = {
  isEnabled: boolean;
  isSupported: () => boolean;
  toggle: (shouldEnable: boolean) => void;
};

//TODO: This is a temporary solution for PoC to enable detached calling cell feature
export const useDetachedCallingFeatureState = create<DetachedCallingFeatureState>((set, get) => ({
  isEnabled: false,
  isSupported: () => !Runtime.isDesktopApp() && get().isEnabled,
  toggle: shouldOpen => set({isEnabled: shouldOpen}),
}));
