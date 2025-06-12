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

import {createContext, useContext, ReactNode, useMemo} from 'react';

interface CellsModalContextType {
  onClose: () => void;
}

export const CellsModalContext = createContext<CellsModalContextType | null>(null);

export const useCellsModal = () => {
  const context = useContext(CellsModalContext);
  if (!context) {
    throw new Error('useCellsModal must be used within a CellsModalProvider');
  }
  return context;
};

interface CellsModalProviderProps {
  children: ReactNode;
  onClose: () => void;
}

export const CellsModalProvider = ({children, onClose}: CellsModalProviderProps) => {
  return (
    <CellsModalContext.Provider value={useMemo(() => ({onClose}), [onClose])}>{children}</CellsModalContext.Provider>
  );
};
