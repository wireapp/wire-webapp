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

import type {CSSObject} from '@emotion/react';

import * as Icon from 'Components/Icon';
import type {BackgroundEffectSelection, BuiltinBackground} from 'Repositories/media/VideoBackgroundEffects';
import {t} from 'Util/LocalizerUtil';

import {
  backgroundPickerStyles,
  backgroundSectionTitleStyles,
  backgroundTileAddIconStyles,
  backgroundTileAddStyles,
  backgroundTileButtonStyles,
  backgroundTileCheckIconStyles,
  backgroundTileCheckStyles,
  backgroundTileBlurPatternStyles,
  backgroundTileGridStyles,
  backgroundTileHumanOutlineStyles,
  backgroundTileHumanStrokeStyles,
  backgroundTileLabelStyles,
  backgroundTilePreviewStyles,
} from './BackgroundEffectsPicker.styles';

interface BackgroundEffectsPickerProps {
  selectedEffect: BackgroundEffectSelection;
  backgrounds: BuiltinBackground[];
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  onAddBackground: () => void;
  isDisabled?: boolean;
}

const isEffectSelected = (selected: BackgroundEffectSelection, candidate: BackgroundEffectSelection) => {
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

export const BackgroundEffectsPicker = ({
  selectedEffect,
  backgrounds,
  onSelectEffect,
  onAddBackground,
  isDisabled = false,
}: BackgroundEffectsPickerProps) => {
  return (
    <div css={backgroundPickerStyles}>
      <div>
        <div css={backgroundSectionTitleStyles}>{t('videoCallBackgroundEffectsLabel')}</div>
        <div css={backgroundTileGridStyles}>
          <BackgroundTile
            label={t('videoCallBackgroundNone')}
            effect={{type: 'none'}}
            selectedEffect={selectedEffect}
            onSelectEffect={onSelectEffect}
            isDisabled={isDisabled}
            previewContent={<HumanOutline />}
          />
          <BackgroundTile
            label={t('videoCallBackgroundBlurLow')}
            effect={{type: 'blur', level: 'low'}}
            selectedEffect={selectedEffect}
            onSelectEffect={onSelectEffect}
            isDisabled={isDisabled}
            previewContent={
              <>
                <div css={{...backgroundTileBlurPatternStyles, filter: 'blur(2px)'}} />
                <HumanOutline />
              </>
            }
          />
          <BackgroundTile
            label={t('videoCallBackgroundBlurHigh')}
            effect={{type: 'blur', level: 'high'}}
            selectedEffect={selectedEffect}
            onSelectEffect={onSelectEffect}
            isDisabled={isDisabled}
            previewContent={
              <>
                <div css={{...backgroundTileBlurPatternStyles, filter: 'blur(4px)'}} />
                <HumanOutline />
              </>
            }
          />
        </div>
      </div>

      <div>
        <div css={backgroundSectionTitleStyles}>{t('videoCallBackgroundsLabel')}</div>
        <div css={backgroundTileGridStyles}>
          {backgrounds.map(background => (
            <BackgroundTile
              key={background.id}
              label={t(background.labelKey)}
              effect={{type: 'virtual', backgroundId: background.id}}
              selectedEffect={selectedEffect}
              onSelectEffect={onSelectEffect}
              isDisabled={isDisabled}
              previewStyle={{
                backgroundImage: `url(${background.imageUrl}), ${background.previewGradient}`,
              }}
            />
          ))}
          <BackgroundTile
            label={t('videoCallBackgroundAdd')}
            effect={{type: 'custom'}}
            selectedEffect={selectedEffect}
            onSelectEffect={_effect => onAddBackground()}
            isDisabled={isDisabled}
            previewStyle={backgroundTileAddStyles}
            previewContent={<Icon.PlusIcon css={backgroundTileAddIconStyles} />}
          />
        </div>
      </div>
    </div>
  );
};

const HumanOutline = () => (
  <svg viewBox="0 0 64 64" css={backgroundTileHumanOutlineStyles} aria-hidden="true" focusable="false">
    <circle cx="32" cy="20" r="10" css={backgroundTileHumanStrokeStyles} />
    <path d="M14 52c2.5-10.5 10-18 18-18s15.5 7.5 18 18" css={backgroundTileHumanStrokeStyles} />
    <path d="M22 52v-4" css={backgroundTileHumanStrokeStyles} />
    <path d="M42 52v-4" css={backgroundTileHumanStrokeStyles} />
  </svg>
);

interface BackgroundTileProps {
  label: string;
  effect: BackgroundEffectSelection;
  selectedEffect: BackgroundEffectSelection;
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  isDisabled?: boolean;
  previewStyle?: CSSObject;
  previewContent?: React.ReactNode;
}

const BackgroundTile = ({
  label,
  effect,
  selectedEffect,
  onSelectEffect,
  isDisabled = false,
  previewStyle,
  previewContent,
}: BackgroundTileProps) => {
  const selected = isEffectSelected(selectedEffect, effect);
  return (
    <button
      type="button"
      css={backgroundTileButtonStyles}
      data-selected={selected}
      aria-pressed={selected}
      onClick={() => onSelectEffect(effect)}
      disabled={isDisabled}
    >
      <div css={{...backgroundTilePreviewStyles, ...previewStyle}} className="background-effects__preview">
        {previewContent}
        {selected && (
          <div css={backgroundTileCheckStyles}>
            <Icon.CheckIcon css={backgroundTileCheckIconStyles} />
          </div>
        )}
      </div>
      <div css={backgroundTileLabelStyles}>{label}</div>
    </button>
  );
};
