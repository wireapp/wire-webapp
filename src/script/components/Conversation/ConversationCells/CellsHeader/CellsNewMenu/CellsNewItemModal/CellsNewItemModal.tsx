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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {
  Button,
  ButtonVariant,
  CloseIcon,
  ErrorMessage,
  IconButton,
  IconButtonVariant,
  Input,
  Label,
} from '@wireapp/react-ui-kit';

import {ModalComponent} from 'Components/Modals/ModalComponent';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {
  buttonStyles,
  buttonWrapperStyles,
  closeButtonStyles,
  headerStyles,
  headingStyles,
  inputWrapperStyles,
  wrapperStyles,
} from './CellsNewItemModal.styles';
import {useCellsNewItemForm} from './useCellsNewItemForm';

import {CellItem} from '../../../common/cellFile/cellFile';

interface CellsNewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CellItem['type'];
  cellsRepository: CellsRepository;
  conversationQualifiedId: QualifiedId;
  onRefresh: () => void;
}

export const CellsNewItemModal = ({
  isOpen,
  onClose,
  type,
  cellsRepository,
  conversationQualifiedId,
  onRefresh,
}: CellsNewItemModalProps) => {
  const {name, error, isSubmitting, handleSubmit, handleChange} = useCellsNewItemForm({
    type,
    cellsRepository,
    conversationQualifiedId,
    onSuccess: () => {
      onRefresh();
      onClose();
    },
  });

  return (
    <ModalComponent isShown={isOpen} onClosed={onClose} onBgClick={onClose}>
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <h3 css={headingStyles}>
            {t(type === 'folder' ? 'cellNewItemMenuModal.headlineFolder' : 'cellNewItemMenuModal.headlineFile')}
          </h3>
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            type="button"
            css={closeButtonStyles}
            onClick={onClose}
            aria-label={t('cellNewItemMenuModal.closeButton')}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <form onSubmit={handleSubmit}>
          <div css={inputWrapperStyles}>
            <Label htmlFor="cells-new-item-name">{t('cellNewItemMenuModal.label')}</Label>
            <Input
              id="cells-new-item-name"
              value={name}
              placeholder={
                type === 'folder'
                  ? t('cellNewItemMenuModal.placeholderFolder')
                  : t('cellNewItemMenuModal.placeholderFile')
              }
              onChange={handleChange}
              error={error ? <ErrorMessage>{error}</ErrorMessage> : undefined}
            />
          </div>
          <div css={buttonWrapperStyles}>
            <Button variant={ButtonVariant.SECONDARY} onClick={onClose} css={buttonStyles}>
              {t('cellNewItemMenuModal.secondaryAction')}
            </Button>
            <Button variant={ButtonVariant.PRIMARY} type="submit" css={buttonStyles} disabled={isSubmitting}>
              {t('cellNewItemMenuModal.primaryAction')}
            </Button>
          </div>
        </form>
      </div>
    </ModalComponent>
  );
};
