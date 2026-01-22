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

import {createContext, ReactNode, useContext} from 'react';

interface FileCardContextValue {
  variant: 'small' | 'large';
  extension: string;
  name: string;
  size?: string;
}

const FileCardContext = createContext<FileCardContextValue | null>(null);

interface FileCardContextProviderProps {
  value: FileCardContextValue;
  children: ReactNode;
}

export const FileCardContextProvider = ({value, children}: FileCardContextProviderProps) => {
  return <FileCardContext.Provider value={value}>{children}</FileCardContext.Provider>;
};

export const useFileCardContext = () => {
  const context = useContext(FileCardContext);
  if (!context) {
    throw new Error('useFileCardContext must be used within a FileCardRoot');
  }
  return context;
};
