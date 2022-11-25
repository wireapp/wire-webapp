/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import create from 'zustand';

export enum RootFontSize {
  XXS = '10px',
  XS = '12px',
  S = '14px',
  M = '16px',
  L = '18px',
  XL = '20px',
  XXL = '24px',
  // XXXL = '30px',
  // XXXXL = '36px',
}

type FontSizeState = {
  rootFontSize: {
    currentRootFontSize: RootFontSize;
    setCurrentRootFontSize: (rootFontSize: RootFontSize) => void;
  };
};

const useFontSizeState = create<FontSizeState>(
  // const useFontSizeState = create(
  //   persist<FontSizeState>(
  (set, get) => ({
    rootFontSize: {
      currentRootFontSize: RootFontSize.M,
      setCurrentRootFontSize: (rootFontSize: RootFontSize) =>
        set(state => ({...state, rootFontSize: {...state.rootFontSize, currentRootFontSize: rootFontSize}})),
    },
  }),
  //     {
  //       name: 'root-font-size',
  //     },
  //   ),
);

export {useFontSizeState};
