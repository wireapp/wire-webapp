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

import {useMemo} from 'react';

import {t} from 'Util/LocalizerUtil';

import {Select} from '@wireapp/react-ui-kit';

import {wrapperStyles, labelStyles, selectWrapperStyles, selectStyles} from './CellsPageSizeSelect.styles';

const options = [
  {value: '10', label: '10'},
  {value: '20', label: '20'},
  {value: '50', label: '50'},
  {value: '100', label: '100'},
];

interface CellsPageSizeSelectProps {
  pageSize: number;
  onSizeChange: ({value}: {value: string}) => void;
}

export const CellsPageSizeSelect = ({pageSize, onSizeChange}: CellsPageSizeSelectProps) => {
  const currentOption = useMemo(() => ({value: `${pageSize}`, label: `${pageSize}`}), [pageSize]);

  return (
    <div css={wrapperStyles}>
      <div css={labelStyles}>{t('cells.pagination.rowsPerPage')}</div>
      <div css={selectWrapperStyles}>
        <Select
          id={'page-size'}
          dataUieName={'row-page-size'}
          options={options}
          selectContainerCSS={selectStyles}
          selectControlCSS={selectStyles}
          value={currentOption}
          menuPlacement={'top'}
          onChange={change => {
            onSizeChange({value: change?.value as string});
          }}
        />
      </div>
    </div>
  );
};
