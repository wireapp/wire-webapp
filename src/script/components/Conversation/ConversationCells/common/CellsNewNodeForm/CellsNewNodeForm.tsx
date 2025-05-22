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

import {useEffect, useRef} from 'react';

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {Button, ButtonVariant, ErrorMessage, Input, Label} from '@wireapp/react-ui-kit';

import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {buttonStyles, buttonWrapperStyles, inputWrapperStyles} from './CellsNewNodeForm.styles';
import {useCellsNewItemForm} from './useCellsNewNodeForm';

import {CellNode} from '../cellNode/cellNode';

interface CellsNewNodeFormProps {
  type: CellNode['type'];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onSuccess: () => void;
  onSecondaryButtonClick: () => void;
  currentPath: string;
}

export const CellsNewNodeForm = ({
  type,
  cellsRepository,
  conversationQualifiedId,
  onSuccess,
  onSecondaryButtonClick,
  currentPath,
}: CellsNewNodeFormProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const {name, error, isSubmitting, handleSubmit, handleChange} = useCellsNewItemForm({
    type,
    cellsRepository,
    conversationQualifiedId,
    onSuccess,
    currentPath,
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit}>
      <div css={inputWrapperStyles}>
        <Label htmlFor="cells-new-item-name">{t('cellNewItemMenuModal.label')}</Label>
        <Input
          id="cells-new-item-name"
          value={name}
          ref={inputRef}
          placeholder={
            type === 'folder' ? t('cellNewItemMenuModal.placeholderFolder') : t('cellNewItemMenuModal.placeholderFile')
          }
          onChange={handleChange}
          error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
        />
      </div>
      <div css={buttonWrapperStyles}>
        <Button variant={ButtonVariant.SECONDARY} onClick={onSecondaryButtonClick} css={buttonStyles}>
          {t('cellNewItemMenuModal.secondaryAction')}
        </Button>
        <Button variant={ButtonVariant.PRIMARY} type="submit" css={buttonStyles} disabled={isSubmitting}>
          {t('cellNewItemMenuModal.primaryAction')}
        </Button>
      </div>
    </form>
  );
};
