/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import type {ChangeEvent} from 'react';

import {Checkbox, CheckboxLabel} from '@wireapp/react-ui-kit';

interface CheckboxOptionProps {
  isChecked: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  label: string;
}

export const CheckboxOption = ({label, isChecked, onChange}: CheckboxOptionProps) => {
  return (
    <div className="modal-option">
      <Checkbox checked={isChecked} data-uie-name="modal-option-checkbox" id="clear-data-checkbox" onChange={onChange}>
        <CheckboxLabel className="label-xs" htmlFor="clear-data-checkbox">
          {label}
        </CheckboxLabel>
      </Checkbox>
    </div>
  );
};
