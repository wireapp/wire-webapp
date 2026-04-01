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

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {t} from 'Util/localizerUtil';

import {ITEM_ALREADY_EXISTS_ERROR, getClientSideNodeNameError, getErrorStatus} from './cellsNodeFormUtils';

import {getCellsApiPath} from '../getCellsApiPath/getCellsApiPath';

interface UseCellsNewFolderFormProps {
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
}

export const useCellsNewFolderForm = ({
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
}: UseCellsNewFolderFormProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFolder = async (folderName: string) => {
    const path = getCellsApiPath({conversationQualifiedId, currentPath});

    try {
      await cellsRepository.createFolder({path, name: folderName});
      onSuccess();
    } catch (err: unknown) {
      const isAlreadyExistsError = getErrorStatus(err)
        .map(status => status === ITEM_ALREADY_EXISTS_ERROR)
        .unwrapOr(false);
      if (isAlreadyExistsError) {
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

    const trimmedName = name.trim();
    const validationError = getClientSideNodeNameError(trimmedName).unwrapOr(null);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createFolder(trimmedName);
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
