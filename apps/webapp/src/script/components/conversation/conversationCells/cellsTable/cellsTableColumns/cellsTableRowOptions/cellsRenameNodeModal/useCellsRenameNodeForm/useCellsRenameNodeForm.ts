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

import {isNonEmptyString} from '@sindresorhus/is';

import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {CellNode, CellNodeType} from 'src/script/types/cellNode';
import {getFileExtension, trimFileExtension} from 'Util/util';

import {isValidCellsNodeName} from '../../../../../common/cellsNodeNameValidator';

interface UseCellsRenameFormProps {
  node: CellNode;
  cellsRepository: CellsRepository;
  onSuccess: () => void;
  renameNodeCopy: {
    readonly error: string;
    readonly invalidCharacters: string;
    readonly nameRequired: string;
  };
}

type UseCellsRenameFormResult = {
  name: string;
  error: string | null;
  isSubmitting: boolean;
  isDisabled: boolean;
  handleRename: (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => Promise<void>;
  handleNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleClearName: () => void;
};
export const useCellsRenameForm = ({
  node,
  cellsRepository,
  onSuccess,
  renameNodeCopy,
}: UseCellsRenameFormProps): UseCellsRenameFormResult => {
  const originalName = node.type === CellNodeType.FILE ? trimFileExtension(node.name) : node.name;
  const [name, setName] = useState(originalName);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedName = name.trim();
  const hasInvalidCharacters = !isValidCellsNodeName(normalizedName);
  const isDisabled = isSubmitting || normalizedName === originalName || normalizedName.length === 0;

  const buildNewName = (baseName: string): string => {
    if (node.type === CellNodeType.FOLDER) {
      return baseName;
    }

    const extension = getFileExtension(node.name);
    return isNonEmptyString(extension) ? `${baseName}.${extension}` : baseName;
  };

  const renameNode = async (name: string): Promise<void> => {
    try {
      await cellsRepository.renameNode({currentPath: node.path, newName: buildNewName(name)});
      onSuccess();
    } catch {
      setError(renameNodeCopy.error);
    }
  };

  const handleRename = async (event: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>): Promise<void> => {
    event.preventDefault();

    if (isDisabled) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    if (normalizedName.length === 0) {
      setError(renameNodeCopy.nameRequired);
      setIsSubmitting(false);
      return;
    }

    if (hasInvalidCharacters) {
      setError(renameNodeCopy.invalidCharacters);
      setIsSubmitting(false);
      return;
    }

    try {
      await renameNode(normalizedName);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setName(event.currentTarget.value);
    if (error === renameNodeCopy.nameRequired || error === renameNodeCopy.invalidCharacters) {
      setError(null);
    }
  };

  const handleClearName = (): void => {
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
