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

import {useEffect, useState} from 'react';

import useLocalStorage from 'beautiful-react-hooks/useLocalStorage';

import {ROOT_FONT_SIZE_KEY} from 'Repositories/storage';

export enum RootFontSize {
  XXS = '10px',
  XS = '12px',
  S = '14px',
  M = '16px',
  L = '18px',
  XL = '20px',
  XXL = '24px',
}

function setFontSizeToRoot(currentRootFontSize: RootFontSize) {
  const root = document.documentElement;
  root.style.fontSize = currentRootFontSize.toString();
}

export const useRootFontSize = (
  rootFontSize: RootFontSize = RootFontSize.M,
): [RootFontSize, React.Dispatch<React.SetStateAction<RootFontSize>>] => {
  const [storedRootFontSize, setStoredRootFontSize] = useLocalStorage<RootFontSize>(ROOT_FONT_SIZE_KEY, rootFontSize);
  const [currentRootFontSize, setCurrentRootFontSize] = useState<RootFontSize>(storedRootFontSize);

  useEffect(() => {
    setStoredRootFontSize(currentRootFontSize);
    setFontSizeToRoot(currentRootFontSize);
  }, [currentRootFontSize, setStoredRootFontSize]);

  return [currentRootFontSize, setCurrentRootFontSize];
};

export const useInitializeRootFontSize = () => {
  const [storedRootFontSize] = useLocalStorage<RootFontSize>(ROOT_FONT_SIZE_KEY, RootFontSize.M);
  useEffect(() => {
    setFontSizeToRoot(storedRootFontSize);
  }, []);
};
