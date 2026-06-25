/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {ChangeEvent, FormEvent, MouseEvent, useEffect, useState} from 'react';

import {
  CellsNewNodeFormValidationCopy,
  ITEM_ALREADY_EXISTS_ERROR,
  getClientSideNodeNameError,
  getErrorStatus,
  isClientSideNodeNameError,
} from './cellsnodeformutils';

interface UseCellsNewNodeFormBaseProps {
  createNode: (name: string) => Promise<void>;
  validationCopy: CellsNewNodeFormValidationCopy;
  normalizeNameForCreation?: (rawName: string) => string;
  isOpen?: boolean;
}

const defaultNameNormalizer = (value: string) => value;

export const useCellsNewNodeFormBase = ({
  createNode,
  validationCopy,
  normalizeNameForCreation = defaultNameNormalizer,
  isOpen = true,
}: UseCellsNewNodeFormBaseProps) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setName('');
    setError(null);
    setIsSubmitting(false);
  }, [isOpen]);

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement> | MouseEvent<HTMLButtonElement>) => {
    formEvent.preventDefault();

    if (isSubmitting) {
      return;
    }

    const trimmedName = name.trim();
    const validationError = getClientSideNodeNameError(trimmedName, validationCopy).unwrapOr(null);
    if (validationError !== null) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await createNode(normalizeNameForCreation(trimmedName));
    } catch (err: unknown) {
      const isAlreadyExistsError = getErrorStatus(err)
        .map(status => status === ITEM_ALREADY_EXISTS_ERROR)
        .unwrapOr(false);

      if (isAlreadyExistsError) {
        setError(validationCopy.alreadyExistsError);
      } else {
        setError(validationCopy.genericError);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
    if (isClientSideNodeNameError(error, validationCopy).unwrapOr(false)) {
      setError(null);
    }
  };

  const handleClear = () => {
    setName('');
    setError(null);
  };

  return {
    name,
    error,
    isSubmitting,
    handleSubmit,
    handleChange,
    handleClear,
  };
};
