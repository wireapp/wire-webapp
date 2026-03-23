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

import {HelpIcon} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import type {BackgroundEffectSelection, BuiltinBackground} from 'Repositories/media/VideoBackgroundEffects';
import {t} from 'Util/LocalizerUtil';

import {
  backgroundSettingsHeaderStyles,
  backgroundSettingsScrollableContentStyles,
  backgroundSettingsTitleStyles,
  backgroundSettingsWrapperStyles,
  noEffectButtonStyles,
  noEffectIconStyles,
  sectionLabelStyles,
  tileButtonStyles,
  tileCheckIconStyles,
  tileCheckStyles,
  tileGridStyles,
  tileLabelStyles,
  tilePreviewStyles,
  uploadButtonStyles,
} from './VideoBackgroundSettings.styles';

interface VideoBackgroundSettingsProps {
  selectedEffect: BackgroundEffectSelection;
  backgrounds: BuiltinBackground[];
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  onAddBackground: () => void;
  onClose: () => void;
}

const isEffectSelected = (selected: BackgroundEffectSelection, candidate: BackgroundEffectSelection): boolean => {
  if (selected.type !== candidate.type) {
    return false;
  }
  if (selected.type === 'blur' && candidate.type === 'blur') {
    return selected.level === candidate.level;
  }
  if (selected.type === 'virtual' && candidate.type === 'virtual') {
    return selected.backgroundId === candidate.backgroundId;
  }
  return true;
};

interface BackgroundTileProps {
  label?: string;
  effect: BackgroundEffectSelection;
  selectedEffect: BackgroundEffectSelection;
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  previewContent?: React.ReactNode;
  previewStyle?: React.CSSProperties;
}

const BackgroundTile = ({
  label,
  effect,
  selectedEffect,
  onSelectEffect,
  previewContent,
  previewStyle,
}: BackgroundTileProps) => {
  const selected = isEffectSelected(selectedEffect, effect);
  return (
    <button
      type="button"
      css={tileButtonStyles}
      data-selected={selected}
      aria-pressed={selected}
      onClick={() => onSelectEffect(effect)}
    >
      <div css={tilePreviewStyles} style={previewStyle} className="bg-tile__preview">
        {previewContent}
        {selected && (
          <div css={tileCheckStyles}>
            <Icon.CheckIcon css={tileCheckIconStyles} />
          </div>
        )}
      </div>
      <div css={tileLabelStyles}>{label}</div>
    </button>
  );
};

export const VideoBackgroundSettings = ({
  selectedEffect,
  backgrounds,
  onSelectEffect,
  onAddBackground,
  onClose,
}: VideoBackgroundSettingsProps) => {
  const isNoneSelected = selectedEffect.type === 'none';

  return (
    <div css={backgroundSettingsWrapperStyles} data-uie-name="video-background-settings">
      <div css={backgroundSettingsHeaderStyles}>
        <span css={backgroundSettingsTitleStyles}>{t('videoCallBackgroundEffectsLabel')}</span>
        <button type="button" className="icon-button" onClick={onClose} title={t('cells.filtersModal.closeButton')}>
          <Icon.CloseIcon width={12} height={12} />
        </button>
      </div>

      <FadingScrollbar css={backgroundSettingsScrollableContentStyles}>
        {/* No background effect */}
        <button
          type="button"
          css={noEffectButtonStyles}
          aria-pressed={isNoneSelected}
          onClick={() => onSelectEffect({type: 'none'})}
        >
          <div css={noEffectIconStyles} />
          {t('videoCallBackgroundNoEffect')}
        </button>

        {/* Blur section */}
        <div>
          <div css={sectionLabelStyles}>{t('videoCallBackgroundBlurSectionLabel')}</div>
          <div css={tileGridStyles}>
            <BackgroundTile
              label={t('videoCallBackgroundBlurLow')}
              effect={{type: 'blur', level: 'low'}}
              selectedEffect={selectedEffect}
              onSelectEffect={onSelectEffect}
              previewContent={<HelpIcon />}
            />
            <BackgroundTile
              label={t('videoCallBackgroundBlurHigh')}
              effect={{type: 'blur', level: 'high'}}
              selectedEffect={selectedEffect}
              onSelectEffect={onSelectEffect}
              previewContent={<HelpIcon />}
            />
          </div>
        </div>

        {/* Virtual backgrounds section */}
        <div>
          <div css={sectionLabelStyles}>{t('videoCallBackgroundVirtualSectionLabel')}</div>
          <div css={tileGridStyles}>
            {backgrounds.map(background => (
              <BackgroundTile
                key={background.id}
                effect={{type: 'virtual', backgroundId: background.id}}
                selectedEffect={selectedEffect}
                onSelectEffect={onSelectEffect}
                previewStyle={{
                  backgroundImage: `url(${background.imageUrl}), ${background.previewGradient}`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Upload background */}
        <button type="button" css={uploadButtonStyles} onClick={onAddBackground}>
          {t('videoCallBackgroundUpload')}
        </button>
      </FadingScrollbar>
    </div>
  );
};
