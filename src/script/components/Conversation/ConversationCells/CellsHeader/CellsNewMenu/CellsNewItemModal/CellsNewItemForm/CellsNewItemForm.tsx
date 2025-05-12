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

import {CellItem} from 'Components/Conversation/ConversationCells/common/cellFile/cellFile';
import {t} from 'Util/LocalizerUtil';

import {formStyles, inputWrapperStyles} from './CellsNewItemForm.styles';

interface CellsNewItemFormProps {
  type: CellItem['type'];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
}
export const CellsNewItemForm = ({type, onSubmit, value, onChange, error}: CellsNewItemFormProps) => {
  return (
    <form css={formStyles} onSubmit={onSubmit}>
      <div css={inputWrapperStyles}>
        <Label htmlFor="cells-new-item-name">{t('cellNewItemMenuModal.label')}</Label>
        <Input
          id="cells-new-item-name"
          value={value}
          placeholder={
            type === 'folder' ? t('cellNewItemMenuModal.placeholderFolder') : t('cellNewItemMenuModal.placeholderFile')
          }
          onChange={onChange}
          error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
        />
      </div>
    </form>
  );
};
