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

import {CellsModal} from 'Components/Conversation/ConversationCells/common/CellsModal/CellsModal';
import {CellsRepository} from 'Repositories/cells/CellsRepository';
import {t} from 'Util/LocalizerUtil';

import {ComboboxSelect, ErrorMessage} from '@wireapp/react-ui-kit';

import {contentStyles, descriptionStyles, menuListCSS, selectWrapperStyles} from './CellsTagsModal.styles';
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
    isLoadingAllTags,
    isUpdatingTags,
    apiError,
    validationError,
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
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>{t('cells.tagsModal.title')}</CellsModal.Header>
      <div css={contentStyles}>
        <p css={descriptionStyles}>{t('cells.tagsModal.description')}</p>
        <div css={selectWrapperStyles}>
          <ComboboxSelect
            id="tags"
            label={t('cells.tagsModal.label')}
            placeholder={t('cells.tagsModal.placeholder')}
            menuPortalTarget={document.body}
            options={allTags}
            value={selectedTags}
            menuListCSS={menuListCSS}
            isLoading={isLoadingAllTags}
            onChange={handleChange}
            onCreateOption={handleCreateOption}
            createOptionLabel={name => t('cells.tagsModal.createOptionLabel', {name})}
            noOptionsMessage={t('cells.tagsModal.noTagsFound')}
            loadingMessage={t('cells.tagsModal.loading')}
          />
        </div>
        {apiError && <ErrorMessage>{t('cells.tagsModal.apiError')}</ErrorMessage>}
        {validationError && <ErrorMessage>{validationError}</ErrorMessage>}
      </div>
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>{t('cells.tagsModal.cancelButton')}</CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={handleSave} isDisabled={isUpdatingTags}>
          {t('cells.tagsModal.saveButton')}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
