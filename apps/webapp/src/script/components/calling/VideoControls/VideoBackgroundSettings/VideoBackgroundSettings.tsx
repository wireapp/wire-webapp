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

import {ChangeEvent, CSSProperties, ReactNode} from 'react';

import {BlurHighIcon, BlurLowIcon, Checkbox, CheckboxLabel, CircleIcon} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import * as Icon from 'Components/Icon';
import type {BackgroundEffectSelection, BuiltinBackground} from 'Repositories/media/VideoBackgroundEffects';
import {t} from 'Util/localizerUtil';

import {
  backgroundSettingsHeaderStyles,
  backgroundSettingsScrollableContentStyles,
  backgroundSettingsTitleStyles,
  backgroundSettingsWrapperStyles,
  sectionLabelStyles,
  tileButtonStyles,
  tileGridStyles,
  tilePreviewContentStyles,
  tilePreviewStyles,
} from './VideoBackgroundSettings.styles';

interface VideoBackgroundSettingsProps {
  selectedEffect: BackgroundEffectSelection;
  backgrounds: BuiltinBackground[];
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  onEnableHighQualityBlur: (event: ChangeEvent<HTMLInputElement>) => void;
  onClose: () => void;
  highQualityBlurAllowed: boolean;
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
  effect: BackgroundEffectSelection;
  selectedEffect: BackgroundEffectSelection;
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  previewContent?: ReactNode;
  previewStyle?: CSSProperties;
}

const BackgroundTile = ({
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
      </div>
    </button>
  );
};

export const VideoBackgroundSettings = ({
  selectedEffect,
  backgrounds,
  onSelectEffect,
  highQualityBlurAllowed,
  onEnableHighQualityBlur,
  onClose,
}: VideoBackgroundSettingsProps) => {
  const handleEnableHighQualityBlur = (event: ChangeEvent<HTMLInputElement>) => {
    onEnableHighQualityBlur(event);
  };

  return (
    <div css={backgroundSettingsWrapperStyles} data-uie-name="video-background-settings">
      <div css={backgroundSettingsHeaderStyles}>
        <span css={backgroundSettingsTitleStyles}>{t('videoCallBackgroundEffectsLabel')}</span>
        <button type="button" className="icon-button" onClick={onClose} title={t('modalCloseButton')}>
          <Icon.CloseIcon width={12} height={12} />
        </button>
      </div>

      <FadingScrollbar css={backgroundSettingsScrollableContentStyles}>
        {/* No background effect — full-width tile */}
        <BackgroundTile
          effect={{type: 'none'}}
          selectedEffect={selectedEffect}
          onSelectEffect={onSelectEffect}
          previewContent={
            <div css={tilePreviewContentStyles}>
              <CircleIcon />
              {t('videoCallBackgroundNoEffect')}
            </div>
          }
        />

        {/* Blur section */}
        <div>
          <div css={sectionLabelStyles}>{t('videoCallBackgroundBlurSectionLabel')}</div>
          <div css={tileGridStyles}>
            <BackgroundTile
              effect={{type: 'blur', level: 'low'}}
              selectedEffect={selectedEffect}
              onSelectEffect={onSelectEffect}
              previewContent={
                <div css={tilePreviewContentStyles}>
                  <BlurLowIcon />
                  {t('videoCallBackgroundBlurLow')}
                </div>
              }
            />
            <BackgroundTile
              effect={{type: 'blur', level: 'high'}}
              selectedEffect={selectedEffect}
              onSelectEffect={onSelectEffect}
              previewContent={
                <div css={tilePreviewContentStyles}>
                  <BlurHighIcon />
                  {t('videoCallBackgroundBlurHigh')}
                </div>
              }
            />
          </div>
        </div>

        <div>
          <Checkbox
            id="enable-high-quality-blur"
            checked={highQualityBlurAllowed}
            onChange={(event: ChangeEvent<HTMLInputElement>) => handleEnableHighQualityBlur(event)}
          >
            <CheckboxLabel htmlFor="enable-high-quality-blur">
              {t('videoCallBackgroundEnableHighQualityBlur')}
            </CheckboxLabel>
          </Checkbox>
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
      </FadingScrollbar>
    </div>
  );
};
