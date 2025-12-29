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

import React, {useEffect, useState} from 'react';

import {Select} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import type {BackgroundEffectSelection, BuiltinBackground} from 'Repositories/media/VideoBackgroundEffects';
import {t} from 'Util/LocalizerUtil';

import {BackgroundEffectsPicker} from './BackgroundEffectsPicker';
import {
  videoOptionsBackButtonStyles,
  videoOptionsRowButtonStyles,
  videoOptionsRowIconStyles,
  videoOptionsSelectGroupHeadingStyles,
  videoOptionsSelectMenuStyles,
  videoOptionsSheetHeaderStyles,
  videoOptionsSheetTitleStyles,
} from './VideoControls.styles';
import {selectGroupStyles} from './VideoControlsSelect/VideoControlsSelect.styles';

type SelectProps = React.ComponentProps<typeof Select<false>>;

interface BackgroundEffectsMenuProps {
  isOpen: boolean;
  showHeader?: boolean;
  onClose?: () => void;
  cameraOptions: SelectProps['options'];
  selectedCameraOptions: SelectProps['value'];
  onCameraChange: SelectProps['onChange'];
  onCameraKeyDown?: SelectProps['onKeyDown'];
  isBackgroundEffectsEnabled: boolean;
  selectedEffect: BackgroundEffectSelection;
  backgrounds: BuiltinBackground[];
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  onAddBackground: () => void;
}

export const BackgroundEffectsMenu = ({
  isOpen,
  showHeader = false,
  onClose,
  cameraOptions,
  selectedCameraOptions,
  onCameraChange,
  onCameraKeyDown,
  isBackgroundEffectsEnabled,
  selectedEffect,
  backgrounds,
  onSelectEffect,
  onAddBackground,
}: BackgroundEffectsMenuProps) => {
  const [view, setView] = useState<'root' | 'backgrounds'>('root');

  useEffect(() => {
    if (!isOpen) {
      setView('root');
    }
  }, [isOpen]);

  return (
    <>
      {showHeader && (
        <div css={videoOptionsSheetHeaderStyles}>
          {view === 'backgrounds' ? (
            <button css={videoOptionsBackButtonStyles} type="button" onClick={() => setView('root')}>
              <Icon.ChevronIcon css={{...videoOptionsRowIconStyles, transform: 'rotate(90deg)'}} />
              {t('videoCallMenuMoreCameraSettings')}
            </button>
          ) : (
            <span css={videoOptionsSheetTitleStyles}>{t('videoCallMenuMoreVideoSettings')}</span>
          )}
          {onClose && (
            <button className="icon-button" type="button" aria-label={t('cells.modal.closeButton')} onClick={onClose}>
              <Icon.CloseIcon width={12} height={12} />
            </button>
          )}
        </div>
      )}

      {view === 'root' ? (
        <>
          <Select
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            value={selectedCameraOptions}
            onChange={onCameraChange}
            onKeyDown={onCameraKeyDown}
            id="select-camera"
            dataUieName="select-camera"
            controlShouldRenderValue={false}
            isClearable={false}
            backspaceRemovesValue={false}
            hideSelectedOptions={false}
            options={cameraOptions}
            menuIsOpen={isOpen}
            menuPlacement="bottom"
            overlayMenu={false}
            menuCSS={{...videoOptionsSelectMenuStyles, width: '100%', minWidth: 'initial'}}
            selectGroupHeadingCSS={videoOptionsSelectGroupHeadingStyles}
            wrapperCSS={!showHeader ? {marginBottom: 0} : undefined}
            hideControl
            selectGroupCSS={selectGroupStyles}
          />
          {isBackgroundEffectsEnabled && (
            <button type="button" css={videoOptionsRowButtonStyles} onClick={() => setView('backgrounds')}>
              <span css={videoOptionsSelectGroupHeadingStyles}>{t('videoCallBackgroundEffectsLabel')}</span>
              <Icon.ChevronIcon css={{...videoOptionsRowIconStyles, transform: 'rotate(270deg)'}} />
            </button>
          )}
        </>
      ) : (
        <>
          {!showHeader && (
            <button css={videoOptionsBackButtonStyles} type="button" onClick={() => setView('root')}>
              <Icon.ChevronIcon css={{...videoOptionsRowIconStyles, transform: 'rotate(90deg)'}} />
              {t('videoCallMenuMoreCameraSettings')}
            </button>
          )}
          <BackgroundEffectsPicker
            selectedEffect={selectedEffect}
            backgrounds={backgrounds}
            onSelectEffect={onSelectEffect}
            onAddBackground={onAddBackground}
          />
        </>
      )}
    </>
  );
};
