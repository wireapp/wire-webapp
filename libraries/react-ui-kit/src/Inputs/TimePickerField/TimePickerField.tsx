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

import {useMemo} from 'react';

import {CSSObject} from '@emotion/react';
import is from '@sindresorhus/is';

import {
  timePickerWrapperStyles,
  timeSelectContainerStyles,
  timeSelectLabelVisuallyHiddenStyles,
  timeSelectMenuPortalStyles,
  timeSelectMenuStyles,
  timeSelectStyles,
} from './TimePickerField.styles';
import {buildTimeOptions} from './timePickerUtils';

import {Theme} from '../../Identity/Theme';
import {InputLabel} from '../InputLabel';
import {Option, Select} from '../Select';

export interface TimePickerFieldProps {
  /** Controlled time value using the shared Select `Option` type (15-minute intervals). */
  value: Option | null;
  onChange: (value: Option | null) => void;
  id: string;
  dataUieName: string;
  label?: string;
  /** Used when no visible label is provided. */
  ariaLabel?: string;
  markInvalid?: boolean;
  disabled?: boolean;
  menuPortalTarget?: HTMLElement;
  menuPlacement?: 'top' | 'bottom' | 'auto';
  maxMenuHeight?: number;
  wrapperCSS?: CSSObject;
}

export const TimePickerField = ({
  value,
  onChange,
  id,
  dataUieName,
  label,
  ariaLabel,
  markInvalid = false,
  disabled = false,
  menuPortalTarget,
  menuPlacement = 'bottom',
  maxMenuHeight = 200,
  wrapperCSS = {},
}: TimePickerFieldProps) => {
  const timeOptions = useMemo(() => buildTimeOptions(), []);
  const portalTarget = menuPortalTarget ?? (typeof document !== 'undefined' ? document.body : undefined);
  const labelId = `${id}-label`;

  return (
    <div
      css={(theme: Theme) => ({
        marginBottom: markInvalid ? '2px' : '20px',
        ...timePickerWrapperStyles,
        '&:focus-within label': {
          color: theme.general.primaryColor,
        },
        ...wrapperCSS,
      })}
      data-uie-name={dataUieName}
    >
      {is.nonEmptyString(label) ? (
        <InputLabel htmlFor={id} markInvalid={markInvalid} id={labelId}>
          {label}
        </InputLabel>
      ) : (
        <label htmlFor={id} css={timeSelectLabelVisuallyHiddenStyles} id={labelId}>
          {ariaLabel}
        </label>
      )}

      <Select
        id={id}
        dataUieName={dataUieName}
        options={timeOptions}
        value={value ?? undefined}
        isDisabled={disabled}
        markInvalid={markInvalid}
        menuMatchControlWidth
        wrapperCSS={{marginBottom: 0}}
        selectContainerCSS={timeSelectContainerStyles}
        selectControlCSS={timeSelectStyles}
        selectMenuCSS={timeSelectMenuStyles}
        menuPlacement={menuPlacement}
        maxMenuHeight={maxMenuHeight}
        {...(portalTarget !== null && portalTarget !== undefined ? {menuPortalTarget: portalTarget} : {})}
        menuPosition="fixed"
        menuShouldScrollIntoView={false}
        selectMenuPortalCSS={timeSelectMenuPortalStyles}
        onChange={option => {
          onChange(option !== null && option !== undefined ? (option as Option) : null);
        }}
      />
    </div>
  );
};
