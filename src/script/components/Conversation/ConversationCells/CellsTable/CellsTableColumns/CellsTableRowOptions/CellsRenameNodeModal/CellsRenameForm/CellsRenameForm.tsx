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

import {Button, ButtonVariant, ErrorMessage, Input, Label} from '@wireapp/react-ui-kit';

import {CellNode} from 'Components/Conversation/ConversationCells/common/cellNode/cellNode';
import {useInputAutoFocus} from 'Components/Conversation/ConversationCells/common/useInputAutoFocus/useInputAutoFocus';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {buttonStyles, buttonWrapperStyles, inputWrapperStyles} from './CellsRenameForm.styles';
import {useCellsRenameForm} from './useCellsNewNodeForm';

interface CellsRenameFormProps {
  node: CellNode;
  cellsRepository: CellsRepository;
  onSuccess: () => void;
  onSecondaryButtonClick: () => void;
  isOpen: boolean;
}

export const CellsRenameForm = ({
  cellsRepository,
  onSuccess,
  onSecondaryButtonClick,
  node,
  isOpen,
}: CellsRenameFormProps) => {
  const {inputRef} = useInputAutoFocus({enabled: isOpen});

  const {name, error, isSubmitting, handleSubmit, handleChange} = useCellsRenameForm({
    node,
    cellsRepository,
    onSuccess,
  });

  return (
    <form onSubmit={handleSubmit}>
      <div css={inputWrapperStyles}>
        <Label htmlFor="cells-new-item-name">{t('cells.newItemMenuModal.label')}</Label>
        <Input
          id="cells-new-item-name"
          value={name}
          ref={inputRef}
          placeholder="New name"
          onChange={handleChange}
          error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
        />
      </div>
      <div css={buttonWrapperStyles}>
        <Button variant={ButtonVariant.SECONDARY} type="button" onClick={onSecondaryButtonClick} css={buttonStyles}>
          {t('cells.newItemMenuModal.secondaryAction')}
        </Button>
        <Button variant={ButtonVariant.PRIMARY} type="submit" css={buttonStyles} disabled={isSubmitting}>
          {t('cells.newItemMenuModal.primaryAction')}
        </Button>
      </div>
    </form>
  );
};
