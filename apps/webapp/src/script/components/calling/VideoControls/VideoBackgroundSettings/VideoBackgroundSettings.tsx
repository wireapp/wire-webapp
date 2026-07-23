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

import {CSSProperties, ReactNode, useEffect, useId, useRef} from 'react';

import {match} from 'ts-pattern';

import {BlurHighIcon, BlurLowIcon, CircleIcon} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/fadingScrollbar';
import * as Icon from 'Components/icon';
import {RadioGroup} from 'Components/Radio';
import type {BackgroundEffectSelection, BuiltinBackground} from 'Repositories/media/VideoBackgroundEffects';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  backgroundEffectPanelHintStyles,
  backgroundSettingsHeaderStyles,
  backgroundSettingsScrollableContentStyles,
  backgroundSettingsTitleStyles,
  backgroundSettingsWrapperStyles,
  closeButtonStyles,
  sectionLabelStyles,
  tileButtonStyles,
  tileGridStyles,
  tilePreviewContentStyles,
  tilePreviewStyles,
} from './VideoBackgroundSettings.styles';

import {Config} from '../../../../Config';

interface VideoBackgroundSettingsProps {
  selectedEffect: BackgroundEffectSelection;
  backgrounds: BuiltinBackground[];
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  backgroundEffectsQuality: BackgroundEffectsQuality;
  onBackgroundEffectsQualityChange: (quality: BackgroundEffectsQuality) => void;
  onClose: () => void;
  isWebGLAvailable: boolean;
}

export type BackgroundEffectsQuality = 'best' | 'balanced' | 'performance';

export const getBackgroundEffectsQuality = (
  highQualityBlurAllowed: boolean,
  performanceEnhancementEnabled: boolean,
): BackgroundEffectsQuality => {
  if (highQualityBlurAllowed) {
    return 'best';
  }

  return performanceEnhancementEnabled ? 'performance' : 'balanced';
};

export const getBackgroundEffectsQualitySettings = (quality: BackgroundEffectsQuality) => ({
  highQualityBlurAllowed: quality === 'best',
  performanceEnhancementEnabled: quality === 'performance',
});

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

type Translate = ReturnType<typeof useApplicationContext>['translate'];

export const getBackgroundEffectLabel = (
  effect: BackgroundEffectSelection,
  backgrounds: BuiltinBackground[],
  translate: Translate,
): string => {
  return match(effect)
    .with({type: 'none'}, () => translate('videoCallBackgroundNoEffect'))
    .with({type: 'blur', level: 'low'}, () => translate('videoCallBackgroundBlurLow'))
    .with({type: 'blur', level: 'high'}, () => translate('videoCallBackgroundBlurHigh'))
    .with({type: 'virtual'}, ({backgroundId}: {backgroundId: string}) => {
      const background = backgrounds.find(({id}) => id === backgroundId);

      return background ? translate(background.labelKey) : translate('videoCallBackgroundVirtual');
    })
    .with({type: 'custom'}, () => translate('videoCallBackgroundCustom'))
    .exhaustive();
};

interface BackgroundTileProps {
  effect: BackgroundEffectSelection;
  selectedEffect: BackgroundEffectSelection;
  onSelectEffect: (effect: BackgroundEffectSelection) => void;
  ariaLabel: string;
  previewContent?: ReactNode;
  previewStyle?: CSSProperties;
  disabled?: boolean;
}

const BackgroundTile = ({
  effect,
  selectedEffect,
  onSelectEffect,
  ariaLabel,
  previewContent,
  previewStyle,
  disabled,
}: BackgroundTileProps) => {
  const selected = isEffectSelected(selectedEffect, effect);
  return (
    <button
      type="button"
      css={tileButtonStyles}
      data-selected={selected}
      role="radio"
      disabled={disabled}
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={() => onSelectEffect(effect)}
    >
      <div css={tilePreviewStyles} style={previewStyle} className="bg-tile__preview">
        {previewContent}
      </div>
    </button>
  );
};

const WebGLNotAvailableHint = ({translate}: {translate: Translate}) => (
  <p css={backgroundEffectPanelHintStyles}>
    {translate('videoCallBackgroundNoWebGLHint')}{' '}
    <a href={Config.getConfig().URL.SUPPORT.BACKGROUND_EFFECTS} rel="nofollow noopener noreferrer" target="_blank">
      {translate('warningLearnMore')}
    </a>
  </p>
);

export const VideoBackgroundSettings = ({
  selectedEffect,
  backgrounds,
  onSelectEffect,
  backgroundEffectsQuality,
  onBackgroundEffectsQualityChange,
  onClose,
  isWebGLAvailable = true,
}: VideoBackgroundSettingsProps) => {
  const {translate} = useApplicationContext();
  const titleId = useId();
  const blurSectionId = useId();
  const virtualSectionId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const noneEffect: BackgroundEffectSelection = {type: 'none'};
  const lowBlurEffect: BackgroundEffectSelection = {type: 'blur', level: 'low'};
  const highBlurEffect: BackgroundEffectSelection = {type: 'blur', level: 'high'};

  return (
    <div
      css={backgroundSettingsWrapperStyles}
      data-uie-name="video-background-settings"
      role="region"
      aria-labelledby={titleId}
    >
      <div css={backgroundSettingsHeaderStyles}>
        <h2 id={titleId} css={backgroundSettingsTitleStyles}>
          {translate('videoCallBackgroundEffectsLabel')}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          css={closeButtonStyles}
          className="icon-button"
          onClick={onClose}
          aria-label={translate('modalCloseButton')}
          title={translate('modalCloseButton')}
        >
          <Icon.CloseIcon width={12} height={12} />
        </button>
      </div>

      <FadingScrollbar css={backgroundSettingsScrollableContentStyles}>
        {/* No background effect — full-width tile */}
        <BackgroundTile
          effect={noneEffect}
          selectedEffect={selectedEffect}
          onSelectEffect={onSelectEffect}
          disabled={!isWebGLAvailable}
          ariaLabel={getBackgroundEffectLabel(noneEffect, backgrounds, translate)}
          previewContent={
            <div css={tilePreviewContentStyles}>
              <CircleIcon />
              {translate('videoCallBackgroundNoEffect')}
            </div>
          }
        />

        {!isWebGLAvailable ? (
          <WebGLNotAvailableHint translate={translate} />
        ) : (
          <>
            {/* Blur section */}
            <div>
              <h3 id={blurSectionId} css={sectionLabelStyles}>
                {translate('videoCallBackgroundBlurSectionLabel')}
              </h3>
              <div css={tileGridStyles} role="radiogroup" aria-labelledby={blurSectionId}>
                <BackgroundTile
                  effect={lowBlurEffect}
                  selectedEffect={selectedEffect}
                  onSelectEffect={onSelectEffect}
                  ariaLabel={getBackgroundEffectLabel(lowBlurEffect, backgrounds, translate)}
                  previewContent={
                    <div css={tilePreviewContentStyles}>
                      <BlurLowIcon />
                      {translate('videoCallBackgroundBlurLow')}
                    </div>
                  }
                />
                <BackgroundTile
                  effect={highBlurEffect}
                  selectedEffect={selectedEffect}
                  onSelectEffect={onSelectEffect}
                  ariaLabel={getBackgroundEffectLabel(highBlurEffect, backgrounds, translate)}
                  previewContent={
                    <div css={tilePreviewContentStyles}>
                      <BlurHighIcon />
                      {translate('videoCallBackgroundBlurHigh')}
                    </div>
                  }
                />
              </div>
            </div>

            <div>
              <h3 id="background-effects-quality-label" css={sectionLabelStyles}>
                {translate('videoCallBackgroundEffectsQualitySectionLabel')}
              </h3>
              <RadioGroup
                ariaLabelledBy="background-effects-quality-label"
                name="background-effects-quality"
                selectedValue={backgroundEffectsQuality}
                onChange={onBackgroundEffectsQualityChange}
                uieName="background-effects-quality"
                options={[
                  {
                    value: 'best' as const,
                    label: translate('videoCallBackgroundEffectsQualityBest'),
                    optionUieName: 'background-effects-quality-best',
                  },
                  {
                    value: 'balanced' as const,
                    label: translate('videoCallBackgroundEffectsQualityBalanced'),
                    optionUieName: 'background-effects-quality-balanced',
                  },
                  {
                    value: 'performance' as const,
                    label: translate('videoCallBackgroundEffectsQualityPerformance'),
                    optionUieName: 'background-effects-quality-performance',
                  },
                ]}
              />
            </div>

            {/* Virtual backgrounds section */}
            <div>
              <h3 id={virtualSectionId} css={sectionLabelStyles}>
                {translate('videoCallBackgroundVirtualSectionLabel')}
              </h3>
              <div css={tileGridStyles} role="radiogroup" aria-labelledby={virtualSectionId}>
                {backgrounds.map(background => {
                  const virtualEffect: BackgroundEffectSelection = {type: 'virtual', backgroundId: background.id};

                  return (
                    <BackgroundTile
                      key={background.id}
                      effect={virtualEffect}
                      selectedEffect={selectedEffect}
                      onSelectEffect={onSelectEffect}
                      ariaLabel={getBackgroundEffectLabel(virtualEffect, backgrounds, translate)}
                      previewStyle={{
                        backgroundImage: `url(${background.imageUrl}), ${background.previewGradient}`,
                      }}
                    />
                  );
                })}
              </div>
            </div>
          </>
        )}
      </FadingScrollbar>
    </div>
  );
};
