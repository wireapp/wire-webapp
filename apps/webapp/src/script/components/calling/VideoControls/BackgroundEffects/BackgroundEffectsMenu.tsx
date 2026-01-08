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
} from '../VideoControls.styles';
import {selectGroupStyles} from '../VideoControlsSelect/VideoControlsSelect.styles';

type SelectProps = React.ComponentProps<typeof Select<false>>;

/**
 * Props for the BackgroundEffectsMenu component.
 */
interface BackgroundEffectsMenuProps {
  /** Whether the menu is currently open. */
  isOpen: boolean;
  /** Whether to display the header with title and close button. */
  showHeader?: boolean;
  /** Callback invoked when the menu should be closed. */
  onClose?: () => void;
  /** Options for the camera selection dropdown. */
  cameraOptions: SelectProps['options'];
  /** Currently selected camera option value. */
  selectedCameraOptions: SelectProps['value'];
  /** Callback invoked when camera selection changes. */
  onCameraChange: SelectProps['onChange'];
  /** Optional keyboard event handler for camera selection. */
  onCameraKeyDown?: SelectProps['onKeyDown'];
  /** Whether background effects feature is enabled. */
  isBackgroundEffectsEnabled: boolean;
  /** Currently selected background effect. */
  selectedEffect: BackgroundEffectSelection;
  /** Array of builtin background options available for selection. */
  backgrounds: BuiltinBackground[];
  /** Callback invoked when a background effect is selected. */
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  /** Callback invoked when the user wants to add a custom background. */
  onAddBackground: () => void;
}

/**
 * Menu component for selecting camera and background effects in video calls.
 *
 * This component provides a two-view interface:
 * - Root view: Camera selection dropdown and navigation to background effects
 * - Backgrounds view: Background effects picker with blur and virtual background options
 *
 * The component manages view state internally and resets to root view when closed.
 * It conditionally renders a header with back/close buttons based on props.
 *
 * @param props - Component props.
 * @returns React component tree.
 */
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
