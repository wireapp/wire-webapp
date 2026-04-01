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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CellsRepository} from 'Repositories/cells/cellsRepository';

import {useCellsNewNodeFormBase} from './useCellsNewNodeFormBase';

import {getCellsApiPath} from '../getCellsApiPath/getCellsApiPath';

interface UseCellsNewFolderFormProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
  isOpen: boolean;
}

export const useCellsNewFolderForm = ({
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
  isOpen,
}: UseCellsNewFolderFormProps) => {
  const createFolder = async (name: string) => {
    const path = getCellsApiPath({conversationQualifiedId, currentPath});
    await cellsRepository.createFolder({path, name});
    onSuccess();
  };

  return useCellsNewNodeFormBase({createNode: createFolder, isOpen});
};
