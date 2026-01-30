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

import {ChangeEvent, FormEvent, MouseEvent, useState} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';
import {RestNode} from 'cells-sdk-ts';

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellFile} from 'src/script/types/cellNode';
import {CellNode} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';
import {isAxiosError} from 'Util/TypePredicateUtil';
import {getFileExtension} from 'Util/util';

import {transformDataToCellsNodes} from '../../useGetAllCellsNodes/transformDataToCellsNodes';
import {getCellsApiPath} from '../getCellsApiPath/getCellsApiPath';

interface UseCellsNewItemFormProps {
  type: CellNode['type'];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
  fileExtension?: string;
  onCreatedFile?: (file: CellFile) => void;
}

const ITEM_ALREADY_EXISTS_ERROR = 409;

export const useCellsNewItemForm = ({
  type,
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
  fileExtension,
  onCreatedFile,
}: UseCellsNewItemFormProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resolveFileName = (rawName: string) => {
    if (type !== 'file' || !fileExtension) {
      return rawName;
    }

    const currentExtension = getFileExtension(rawName);
    if (currentExtension.toLowerCase() === fileExtension.toLowerCase()) {
      return rawName;
    }

    return `${rawName}.${fileExtension}`;
  };

  const createNode = async (name: string) => {
    const path = getCellsApiPath({conversationQualifiedId, currentPath});
    const resolvedName = resolveFileName(name);
    const filePath = `${path || ''}/${resolvedName}`;

    try {
      if (type === 'folder') {
        await cellsRepository.createFolder({path, name: resolvedName});
      } else {
        await cellsRepository.createFile({path, name: resolvedName});
      }
      onSuccess();
      if (type === 'file' && onCreatedFile) {
        try {
          const createdNode = (await cellsRepository.lookupNodeByPath({path: filePath})) as RestNode;
          const [createdFile] = transformDataToCellsNodes({nodes: [createdNode], users: []});
          if (createdFile?.type === 'file') {
            onCreatedFile(createdFile as CellFile);
          }
        } catch (err) {
          // Ignore lookup failures; the file is already created and listed.
        }
      }
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === ITEM_ALREADY_EXISTS_ERROR) {
        setError(t('cells.newItemMenuModalForm.alreadyExistsError'));
      } else {
        setError(t('cells.newItemMenuModalForm.genericError'));
      }
    }
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
    formEvent.preventDefault();

    if (isSubmitting) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError(t('cells.newItemMenuModalForm.nameRequired'));
      setIsSubmitting(false);
      return;
    }

    try {
      await createNode(trimmedName);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
    if (error === t('cells.newItemMenuModalForm.nameRequired')) {
      setError(null);
    }
  };

  return {
    name,
    error,
    isSubmitting,
    handleSubmit,
    handleChange,
  };
};
