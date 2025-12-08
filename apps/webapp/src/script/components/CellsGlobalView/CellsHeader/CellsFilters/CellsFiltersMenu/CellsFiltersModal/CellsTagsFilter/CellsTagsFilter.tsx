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

import {ComboboxSelect, ComboboxSelectOption} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

import {wrapperStyles, menuListCSS} from './CellsTagsFilter.styles';

interface CellsTagsFilterProps {
  allTags: string[];
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export const CellsTagsFilter = ({allTags, selectedTags, onTagsChange}: CellsTagsFilterProps) => {
  const handleChange = (value: ComboboxSelectOption | ComboboxSelectOption[]) => {
    onTagsChange(Array.isArray(value) ? value.map(option => option.value as string) : []);
  };

  return (
    <div css={wrapperStyles}>
      <ComboboxSelect
        id="tags"
        label={t('cells.filtersModal.tags.label')}
        labelVisuallyHidden
        placeholder={t('cells.filtersModal.tags.placeholder')}
        menuPortalTarget={document.body}
        options={transformTags(allTags)}
        value={transformTags(selectedTags)}
        menuListCSS={menuListCSS}
        isLoading={false}
        onChange={handleChange}
        noOptionsMessage={t('cells.filtersModal.tags.noTagsFound')}
        loadingMessage={t('cells.filtersModal.tags.loading')}
      />
    </div>
  );
};

const transformTags = (tags: string[]) => {
  return tags.map(tag => ({label: tag, value: tag}));
};
