/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {CloseIcon} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  clearButtonStyles,
  moveButtonStyles,
  selectionBarStyles,
  selectionCountStyles,
} from './cellsSelectionBar.styles';

interface CellsSelectionBarProps {
  selectedCount: number;
  onClear: () => void;
  onMove?: () => void;
}

export const CellsSelectionBar = ({selectedCount, onClear, onMove}: CellsSelectionBarProps) => {
  const {translate} = useApplicationContext();

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div css={selectionBarStyles} role="status" aria-live="polite">
      <button css={clearButtonStyles} type="button" aria-label={translate('cells.selection.clear')} onClick={onClear}>
        <CloseIcon aria-hidden="true" />
      </button>
      <span css={selectionCountStyles}>{translate('cells.selection.selectedCount', {count: selectedCount})}</span>
      {onMove !== undefined && (
        <button css={moveButtonStyles} type="button" aria-haspopup="dialog" onClick={onMove}>
          {translate('cells.selection.move')}
        </button>
      )}
    </div>
  );
};
