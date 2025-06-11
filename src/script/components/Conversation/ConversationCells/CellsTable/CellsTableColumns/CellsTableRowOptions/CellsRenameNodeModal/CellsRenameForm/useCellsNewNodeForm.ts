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

import {ChangeEvent, FormEvent, useState} from 'react';

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';
import {isAxiosError} from 'Util/TypePredicateUtil';

interface UseCellsRenameFormProps {
  node: CellNode;
  cellsRepository: CellsRepository;
  onSuccess: () => void;
}

const ITEM_ALREADY_EXISTS_ERROR = 409;

export const useCellsRenameForm = ({node, cellsRepository, onSuccess}: UseCellsRenameFormProps) => {
  const [name, setName] = useState(node.name);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const renameNode = async (name: string) => {
    try {
      await cellsRepository.renameNode({currentPath: node.path, newName: name});
      onSuccess();
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === ITEM_ALREADY_EXISTS_ERROR) {
        setError(t('cells.newItemMenuModalForm.alreadyExistsError'));
      } else {
        setError(t('cells.newItemMenuModalForm.genericError'));
      }
    }
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
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
      await renameNode(name);
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
