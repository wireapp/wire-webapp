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

import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {CellNode} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';
import {getFileExtension, trimFileExtension} from 'Util/util';

interface UseCellsRenameFormProps {
  node: CellNode;
  cellsRepository: CellsRepository;
  onSuccess: () => void;
}

const INVALID_CHARACTERS = ['/', '.'];

export const useCellsRenameForm = ({node, cellsRepository, onSuccess}: UseCellsRenameFormProps) => {
  const [name, setName] = useState(trimFileExtension(node.name));
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasInvalidCharacters = INVALID_CHARACTERS.some(char => name.includes(char));
  const isDisabled = isSubmitting || name === node.name || !name.trim();

  const renameNode = async (name: string) => {
    try {
      await cellsRepository.renameNode({currentPath: node.path, newName: `${name}.${getFileExtension(node.name)}`});
      onSuccess();
    } catch (error) {
      setError(t('cells.renameNodeModal.error'));
    }
  };

  const handleRename = async (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (isDisabled) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    if (!name.trim()) {
      setError(t('cells.renameNodeModal.nameRequired'));
      setIsSubmitting(false);
      return;
    }

    if (hasInvalidCharacters) {
      setError(t('cells.renameNodeModal.invalidCharacters'));
      setIsSubmitting(false);
      return;
    }

    try {
      await renameNode(name);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
    if (error === t('cells.renameNodeModal.nameRequired') || error === t('cells.renameNodeModal.invalidCharacters')) {
      setError(null);
    }
  };

  const handleClearName = () => {
    setName('');
    setError(null);
  };

  return {
    name,
    error,
    isSubmitting,
    isDisabled,
    handleRename,
    handleNameChange,
    handleClearName,
  };
};
