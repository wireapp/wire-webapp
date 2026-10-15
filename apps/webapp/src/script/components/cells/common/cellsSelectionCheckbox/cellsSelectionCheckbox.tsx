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

import {Checkbox} from '@wireapp/react-ui-kit';

import {useApplicationContext} from 'src/script/page/rootProvider';

interface CellsSelectionCheckboxProps {
  id: string;
  name: string;
  isChecked: boolean;
  onChange: (isChecked: boolean) => void;
}

export const CellsSelectionCheckbox = ({id, name, isChecked, onChange}: CellsSelectionCheckboxProps) => {
  const {translate} = useApplicationContext();

  return (
    <Checkbox
      id={`cells-selection-${id}`}
      checked={isChecked}
      aria-label={translate('cells.selection.selectItem', {name})}
      onChange={event => {
        onChange(event.currentTarget.checked);
      }}
    />
  );
};
