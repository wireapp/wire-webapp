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

import {Select} from '@wireapp/react-ui-kit';

import {selectGroupStyles} from 'Components/calling/VideoControls/VideoControlsSelect/VideoControlsSelect.styles';
import * as Icon from 'Components/Icon';
import {t} from 'Util/localizerUtil';

import {
  videoOptionInlineMenuStyles,
  videoOptionLabelIconStyles,
  videoOptionLabelStyles,
  videoOptionLabelTextStyles,
  videoOptionsInlineWrapperStyles,
  videoOptionsSelectGroupHeadingStyles,
  videoOptionsSelectMenuStyles,
  videoOptionsSheetHeaderStyles,
  videoOptionsSheetTitleStyles,
} from '../VideoControls.styles';

type SelectProps = React.ComponentProps<typeof Select<false>>;
type SelectOption = SelectProps['options'] extends Array<infer T> ? T : never;

type BaseSelectProps = Pick<
  SelectProps,
  | 'value'
  | 'id'
  | 'dataUieName'
  | 'options'
  | 'onChange'
  | 'onMenuClose'
  | 'menuIsOpen'
  | 'menuPlacement'
  | 'onKeyDown'
  | 'wrapperCSS'
  | 'menuCSS'
  | 'isOptionSelected'
  | 'overlayMenu'
>;

export type VideoControlsSelectProps = BaseSelectProps & {
  showHeader?: boolean;
  onClose?: () => void;
};

type VideoOptionLabelProps = {
  option: SelectOption & {
    icon?: React.ReactNode;
    label: React.ReactNode;
  };
};

const VideoOptionLabel = ({option}: VideoOptionLabelProps) => {
  if (!option.icon) {
    return <>{option.label}</>;
  }

  return (
    <div css={videoOptionLabelStyles}>
      <span css={videoOptionLabelTextStyles}>{option.label}</span>
      <span css={videoOptionLabelIconStyles}>{option.icon}</span>
    </div>
  );
};

export const VideoControlsSelect = ({
  value,
  id,
  dataUieName,
  options,
  onChange,
  onKeyDown,
  onMenuClose,
  menuIsOpen,
  menuPlacement,
  wrapperCSS,
  menuCSS,
  overlayMenu,
  showHeader,
  onClose,
  isOptionSelected,
}: VideoControlsSelectProps) => {
  const isInlineMenu = overlayMenu === false;
  const menuCssWithInlineMenu = isInlineMenu
    ? {
        ...videoOptionsSelectMenuStyles,
        ...videoOptionInlineMenuStyles,
      }
    : menuCSS;

  return (
    <>
      {showHeader && (
        <div css={videoOptionsSheetHeaderStyles}>
          <span css={videoOptionsSheetTitleStyles}>{t('videoCallMenuMoreVideoSettings')}</span>
          {onClose && (
            <button className="icon-button" type="button" aria-label={t('cells.modal.closeButton')} onClick={onClose}>
              <Icon.CloseIcon width={12} height={12} />
            </button>
          )}
        </div>
      )}

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
        menuPlacement={isInlineMenu ? 'bottom' : (menuPlacement ?? 'top')}
        menuIsOpen={menuIsOpen}
        overlayMenu={overlayMenu}
        menuCSS={menuCssWithInlineMenu}
        selectGroupHeadingCSS={isInlineMenu ? videoOptionsSelectGroupHeadingStyles : undefined}
        wrapperCSS={isInlineMenu ? (!showHeader ? videoOptionsInlineWrapperStyles : undefined) : wrapperCSS}
        hideControl
        selectGroupCSS={selectGroupStyles}
        isOptionSelected={isOptionSelected}
        formatOptionLabel={
          isInlineMenu ? option => <VideoOptionLabel option={option as VideoOptionLabelProps['option']} /> : undefined
        }
      />
    </>
  );
};
