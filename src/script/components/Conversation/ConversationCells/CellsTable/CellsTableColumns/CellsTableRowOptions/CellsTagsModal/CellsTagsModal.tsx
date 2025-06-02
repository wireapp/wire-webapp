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

import {
  Button,
  ButtonVariant,
  ComboboxSelect,
  ErrorMessage,
  IconButton,
  IconButtonVariant,
} from '@wireapp/react-ui-kit';

import {CloseIcon} from 'Components/Icon';
import {ModalComponent} from 'Components/Modals/ModalComponent';
import {CellsRepository} from 'src/script/cells/CellsRepository';
import {handleEscDown} from 'Util/KeyboardUtil';
import {t} from 'Util/LocalizerUtil';

import {
  actionsWrapperStyles,
  buttonStyles,
  closeButtonStyles,
  contentStyles,
  descriptionStyles,
  headerStyles,
  headingStyles,
  menuListCSS,
  modalStyles,
  selectWrapperStyles,
  wrapperStyles,
} from './CellsTagsModal.styles';
import {useTagsManagement} from './useTagsManagement/useTagsManagement';

interface CellsTagsModalProps {
  uuid: string;
  isOpen: boolean;
  onClose: () => void;
  cellsRepository: CellsRepository;
  selectedTags: string[];
  onRefresh: () => void;
}

export const CellsTagsModal = ({
  uuid,
  isOpen,
  onClose,
  cellsRepository,
  selectedTags: initialSelectedTags,
  onRefresh,
}: CellsTagsModalProps) => {
  const {
    allTags,
    selectedTags,
    isLoading: isLoadingTags,
    error,
    handleCreateOption,
    handleChange,
    handleUpdateTags,
  } = useTagsManagement({
    cellsRepository,
    fetchTagsEnabled: isOpen,
    initialSelectedTags,
    onSuccess: () => {
      onClose();
      onRefresh();
    },
  });

  const handleSave = async () => {
    await handleUpdateTags(uuid);
  };

  return (
    <ModalComponent
      isShown={isOpen}
      onClosed={onClose}
      onBgClick={onClose}
      wrapperCSS={modalStyles}
      onKeyDown={event => handleEscDown(event, onClose)}
    >
      <div css={wrapperStyles}>
        <header css={headerStyles}>
          <h3 css={headingStyles}>{t('cells.tagsModal.title')}</h3>
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            type="button"
            css={closeButtonStyles}
            onClick={onClose}
            aria-label={t('cells.tagsModal.closeButton')}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <div css={contentStyles}>
          <p css={descriptionStyles}>{t('cells.tagsModal.description')}</p>
          <div css={selectWrapperStyles}>
            <ComboboxSelect
              id="tags"
              label={t('cells.tagsModal.label')}
              placeholder={t('cells.tagsModal.placeholder')}
              menuPotralTarget={document.body}
              options={allTags}
              value={selectedTags}
              menuListCSS={menuListCSS}
              isLoading={isLoadingTags}
              onChange={handleChange}
              onCreateOption={handleCreateOption}
              createOptionLabel={name => t('cells.tagsModal.createOptionLabel', {name})}
              noOptionsMessage={t('cells.tagsModal.noTagsFound')}
              loadingMessage={t('cells.tagsModal.loading')}
            />
          </div>
          {error && <ErrorMessage>{t('cells.tagsModal.error')}</ErrorMessage>}
        </div>
        <div css={actionsWrapperStyles}>
          <Button variant={ButtonVariant.SECONDARY} onClick={onClose} css={buttonStyles}>
            {t('cells.tagsModal.cancelButton')}
          </Button>
          <Button variant={ButtonVariant.PRIMARY} css={buttonStyles} onClick={handleSave}>
            {t('cells.tagsModal.saveButton')}
          </Button>
        </div>
      </div>
    </ModalComponent>
  );
};
