/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import React, {useRef} from 'react';
import Checkbox from 'Components/Checkbox';

interface PreferencesCheckboxProps {
  checked: boolean;
  details?: string | React.ReactNode;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  uieName: string;
}

const PreferencesCheckbox: React.FC<PreferencesCheckboxProps> = ({
  checked,
  disabled,
  onChange,
  label,
  details,
  uieName,
}) => {
  const {current: id} = useRef(Math.random().toString(36).slice(2));
  return (
    <>
      <div className="preferences-option">
        <Checkbox
          label={label}
          name={id}
          disabled={disabled}
          isChecked={checked}
          onCheckedChanged={() => onChange(!checked)}
          uieName={uieName}
        />
      </div>

      {details && <div className="preferences-detail preferences-detail-intended">{details}</div>}
    </>
  );
};

export default PreferencesCheckbox;
