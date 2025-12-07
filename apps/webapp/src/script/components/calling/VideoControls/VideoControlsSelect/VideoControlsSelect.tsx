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

import React from 'react';

import {selectGroupStyles} from 'Components/calling/VideoControls/VideoControlsSelect/VideoControlsSelect.styles';

import {Select} from '@wireapp/react-ui-kit';

type VideoControlsSelectProps = Pick<
  React.ComponentProps<typeof Select<false>>,
  | 'value'
  | 'id'
  | 'dataUieName'
  | 'options'
  | 'onChange'
  | 'onMenuClose'
  | 'menuIsOpen'
  | 'onKeyDown'
  | 'wrapperCSS'
  | 'menuCSS'
>;

export const VideoControlsSelect = ({
  value,
  id,
  dataUieName,
  options,
  onChange,
  onKeyDown,
  onMenuClose,
  menuIsOpen,
  wrapperCSS,
  menuCSS,
}: VideoControlsSelectProps) => {
  return (
    <Select
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus
      value={value}
      id={id}
      dataUieName={dataUieName}
      controlShouldRenderValue={false}
      isClearable={false}
      backspaceRemovesValue={false}
      hideSelectedOptions={false}
      options={options}
      onChange={onChange}
      onKeyDown={onKeyDown}
      onMenuClose={onMenuClose}
      menuPlacement="top"
      menuIsOpen={menuIsOpen}
      wrapperCSS={wrapperCSS}
      menuCSS={menuCSS}
      hideControl
      selectGroupCSS={selectGroupStyles}
    />
  );
};
