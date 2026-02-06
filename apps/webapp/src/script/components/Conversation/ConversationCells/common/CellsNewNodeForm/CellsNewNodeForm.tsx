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

import {ErrorMessage, Input, Label, Select} from '@wireapp/react-ui-kit';

import {CellNode} from 'src/script/types/cellNode';
import {t} from 'Util/LocalizerUtil';

import {inputWrapperStyles, selectStyles, selectWrapperStyles} from './CellsNewNodeForm.styles';

import {useInputAutoFocus} from '../useInputAutoFocus/useInputAutoFocus';

interface CellsNewNodeFormProps {
  type: CellNode['type'];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  inputValue: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  error: string | null;
  isOpen: boolean;
  fileTypeOptions?: Array<{value: string; label: string}>;
  selectedFileType?: {value: string; label: string};
  onFileTypeChange?: (option: {value: string; label: string}) => void;
}

export const CellsNewNodeForm = ({
  type,
  onSubmit,
  inputValue,
  onChange,
  error,
  isOpen,
  fileTypeOptions,
  selectedFileType,
  onFileTypeChange,
}: CellsNewNodeFormProps) => {
  const {inputRef} = useInputAutoFocus({enabled: isOpen});

  return (
    <form onSubmit={onSubmit}>
      <div css={inputWrapperStyles}>
        {type === 'file' && fileTypeOptions && selectedFileType && onFileTypeChange && (
          <>
            <Label htmlFor="cells-new-item-type">{t('cells.newItemMenuModal.typeLabel')}</Label>
            <div css={selectWrapperStyles}>
              <Select
                id="cells-new-item-type"
                dataUieName="cells-new-item-type"
                options={fileTypeOptions}
                value={selectedFileType}
                selectContainerCSS={selectStyles}
                selectControlCSS={selectStyles}
                onChange={option => {
                  if (option) {
                    onFileTypeChange(option as {value: string; label: string});
                  }
                }}
              />
            </div>
          </>
        )}
        <Label htmlFor="cells-new-item-name">{t('cells.newItemMenuModal.label')}</Label>
        <Input
          id="cells-new-item-name"
          value={inputValue}
          ref={inputRef}
          placeholder={
            type === 'folder'
              ? t('cells.newItemMenuModal.placeholderFolder')
              : t('cells.newItemMenuModal.placeholderFile')
          }
          onChange={onChange}
          error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
        />
      </div>
    </form>
  );
};
