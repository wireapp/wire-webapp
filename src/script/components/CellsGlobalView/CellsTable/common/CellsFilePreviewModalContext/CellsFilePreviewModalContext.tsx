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

import {createContext, ReactNode, useContext, useId, useMemo, useState} from 'react';

import {CellFile} from '../../../common/cellNode/cellNode';

interface CellsFilePreviewModalContextValue {
  id: string;
  selectedFile: CellFile | null;
  handleOpenFile: (file: CellFile) => void;
  handleCloseFile: () => void;
}

const CellsFilePreviewModalContext = createContext<CellsFilePreviewModalContextValue | null>(null);

interface FilePreviewProviderProps {
  children: ReactNode;
}

export const FilePreviewProvider = ({children}: FilePreviewProviderProps) => {
  const [selectedFile, setSelectedFile] = useState<CellFile | null>(null);

  const id = useId();

  const value = useMemo(
    () => ({
      id,
      selectedFile,
      handleOpenFile: (file: CellFile) => setSelectedFile(file),
      handleCloseFile: () => setSelectedFile(null),
    }),
    [id, selectedFile],
  );

  return <CellsFilePreviewModalContext.Provider value={value}>{children}</CellsFilePreviewModalContext.Provider>;
};

export const useCellsFilePreviewModal = () => {
  const context = useContext(CellsFilePreviewModalContext);
  if (!context) {
    throw new Error('useCellsFilePreviewModal must be used within a CellsFilePreviewModalProvider');
  }
  return context;
};
