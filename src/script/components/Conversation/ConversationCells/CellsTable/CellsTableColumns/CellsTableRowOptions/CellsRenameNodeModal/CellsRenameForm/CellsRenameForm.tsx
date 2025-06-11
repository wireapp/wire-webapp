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

import {ChangeEvent, FormEvent} from 'react';

import {ErrorMessage, Input, Label} from '@wireapp/react-ui-kit';

import {useInputAutoFocus} from 'Components/Conversation/ConversationCells/common/useInputAutoFocus/useInputAutoFocus';
import {t} from 'Util/LocalizerUtil';

import {formStyles} from './CellsRenameForm.styles';

interface CellsRenameFormProps {
  isOpen: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  inputValue: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
}

export const CellsRenameForm = ({isOpen, onSubmit, inputValue, onChange, error}: CellsRenameFormProps) => {
  const {inputRef} = useInputAutoFocus({enabled: isOpen});

  return (
    <form onSubmit={onSubmit} css={formStyles}>
      <Label htmlFor="cells-new-item-name">{t('cells.newItemMenuModal.label')}</Label>
      <Input
        id="cells-new-item-name"
        value={inputValue}
        ref={inputRef}
        placeholder="New name"
        onChange={onChange}
        error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
      />
    </form>
  );
};
