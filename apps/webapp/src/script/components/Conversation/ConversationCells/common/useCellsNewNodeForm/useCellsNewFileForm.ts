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

import {ITEM_ALREADY_EXISTS_ERROR} from './cellsNodeFormUtils';
import {useCellsNewNodeFormBase} from './useCellsNewNodeFormBase';

import {getCellsApiPath} from '../getCellsApiPath/getCellsApiPath';

export type CellsFileType = 'document' | 'spreadsheet' | 'presentation';

const FILE_EXTENSION_BY_TYPE: Record<CellsFileType, string> = {
  document: 'docx',
  spreadsheet: 'xlsx',
  presentation: 'pptx',
};

const FILE_TEMPLATE_ID_BY_TYPE: Record<CellsFileType, string> = {
  document: '01-Microsoft Word.docx',
  spreadsheet: '02-Microsoft Excel.xlsx',
  presentation: '03-Microsoft PowerPoint.pptx',
};

// TO-DO Replace hard coded values with server values when GET /templates endpoint ready
const getTemplateUuidByType = (fileType: CellsFileType): string => {
  return FILE_TEMPLATE_ID_BY_TYPE[fileType];
};

const createAlreadyExistsError = () => {
  const error = new Error('File already exists') as Error & {response: {status: number}};
  error.response = {status: ITEM_ALREADY_EXISTS_ERROR};
  return error;
};

export const getFileExtensionByType = (fileType: CellsFileType): string => {
  return FILE_EXTENSION_BY_TYPE[fileType];
};

interface UseCellsNewFileFormProps {
  fileType: CellsFileType;
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
  isOpen: boolean;
}

export const useCellsNewFileForm = ({
  fileType,
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
  isOpen,
}: UseCellsNewFileFormProps) => {
  const normalizeNameForCreation = (rawName: string): string => {
    const extension = getFileExtensionByType(fileType);
    return `${rawName}.${extension}`;
  };

  const createFile = async (name: string) => {
    const path = getCellsApiPath({conversationQualifiedId, currentPath});
    const templateUuid = getTemplateUuidByType(fileType);
    const fileAlreadyExists = await cellsRepository.checkFileAlreadyExists({path, name});
    if (fileAlreadyExists) {
      throw createAlreadyExistsError();
    }

    await cellsRepository.createFile({path, name, templateUuid});
    onSuccess();
  };

  return useCellsNewNodeFormBase({createNode: createFile, normalizeNameForCreation, isOpen});
};
