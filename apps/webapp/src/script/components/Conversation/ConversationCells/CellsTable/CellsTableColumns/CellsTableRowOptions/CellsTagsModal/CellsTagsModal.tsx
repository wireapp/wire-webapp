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

import {ComboboxSelect, ErrorMessage} from '@wireapp/react-ui-kit';

import {CellsModal} from 'Components/Conversation/ConversationCells/common/CellsModal/CellsModal';
import {CellsRepository} from 'Repositories/cells/cellsRepository';
import {useApplicationContext} from 'src/script/page/RootProvider';

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
  const {translate} = useApplicationContext();
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
    commaValidationError: translate('cells.tagsModal.validationError.comma'),
  });

  const handleSave = async () => {
    await handleUpdateTags(uuid);
  };

  return (
    <CellsModal isOpen={isOpen} onClose={onClose} size="large">
      <CellsModal.Header>{translate('cells.tagsModal.title')}</CellsModal.Header>
      <div css={contentStyles}>
        <p css={descriptionStyles}>{translate('cells.tagsModal.description')}</p>
        <div css={selectWrapperStyles}>
          <ComboboxSelect
            id="tags"
            label={translate('cells.tagsModal.label')}
            placeholder={translate('cells.tagsModal.placeholder')}
            menuPortalTarget={document.body}
            options={allTags}
            value={selectedTags}
            menuListCSS={menuListCSS}
            isLoading={isLoadingAllTags}
            onChange={handleChange}
            onCreateOption={handleCreateOption}
            createOptionLabel={name => translate('cells.tagsModal.createOptionLabel', {name})}
            noOptionsMessage={translate('cells.tagsModal.noTagsFound')}
            loadingMessage={translate('cells.tagsModal.loading')}
          />
        </div>
        {apiError !== null && <ErrorMessage>{translate('cells.tagsModal.apiError')}</ErrorMessage>}
        {validationError !== null && <ErrorMessage>{validationError}</ErrorMessage>}
      </div>
      <CellsModal.Actions>
        <CellsModal.SecondaryButton onClick={onClose}>
          {translate('cells.tagsModal.cancelButton')}
        </CellsModal.SecondaryButton>
        <CellsModal.PrimaryButton onClick={handleSave} isDisabled={isUpdatingTags}>
          {translate('cells.tagsModal.saveButton')}
        </CellsModal.PrimaryButton>
      </CellsModal.Actions>
    </CellsModal>
  );
};
