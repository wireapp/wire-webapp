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

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode} from 'src/types/cellNode';
import {t} from 'Util/LocalizerUtil';
import {isAxiosError} from 'Util/TypePredicateUtil';

import {getCellsApiPath} from '../getCellsApiPath/getCellsApiPath';

interface UseCellsNewItemFormProps {
  type: CellNode['type'];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  currentPath: string;
}

const ITEM_ALREADY_EXISTS_ERROR = 409;

export const useCellsNewItemForm = ({
  type,
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  currentPath,
}: UseCellsNewItemFormProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createNode = async (name: string) => {
    const path = getCellsApiPath({conversationQualifiedId, currentPath});

    try {
      if (type === 'folder') {
        await cellsRepository.createFolder({path, name});
      } else {
        await cellsRepository.createFile({path, name});
      }
      onSuccess();
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

    if (!name.trim()) {
      setError(t('cells.newItemMenuModalForm.nameRequired'));
      setIsSubmitting(false);
      return;
    }

    try {
      await createNode(name);
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
