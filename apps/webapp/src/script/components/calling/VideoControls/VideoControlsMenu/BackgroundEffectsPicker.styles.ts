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

import {css, CSSObject} from '@emotion/react';

import {media} from '@wireapp/react-ui-kit';

/**
 * Container styles for the background effects picker.
 *
 * Flexbox layout with vertical stacking and gap spacing between sections.
 */
export const backgroundPickerStyles: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

/**
 * Styles for section title headings (e.g., "Background Effects", "Backgrounds").
 *
 * Small uppercase text with letter spacing for visual hierarchy.
 */
export const backgroundSectionTitleStyles: CSSObject = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--gray-70)',
};

/**
 * Grid layout styles for background effect tiles.
 *
 * Responsive grid: 3 columns on desktop, 2 columns on mobile.
 * Uses minmax(0, 1fr) to ensure equal column widths.
 */
export const backgroundTileGridStyles: CSSObject = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,

  [media.mobile]: {
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
};

/**
 * Button styles for background effect tiles.
 *
 * Removes default button styling and provides hover/focus/active states.
 * Selected state is indicated via data-selected attribute styling.
 * Includes focus-visible outline for keyboard navigation accessibility.
 */
export const backgroundTileButtonStyles = css`
  background: none;
  border: none;
  color: var(--main-color);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0;
  text-align: left;

  &:focus-visible .background-effects__preview {
    outline: 2px solid var(--accent-color-focus);
    outline-offset: 2px;
  }

  &[data-selected='true'] .background-effects__preview {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 2px var(--accent-color);
  }

  &:hover .background-effects__preview {
    transform: translateY(-1px);
  }

  &:active .background-effects__preview {
    transform: translateY(0);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
  }
`;

/**
 * Preview area styles for background effect tiles.
 *
 * 16:9 aspect ratio container with rounded corners and border.
 * Supports background images and custom content. Includes transition
 * animations for hover/selection state changes.
 */
export const backgroundTilePreviewStyles: CSSObject = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  borderRadius: 10,
  border: '1px solid var(--inactive-call-button-border)',
  backgroundColor: 'var(--gray-20)',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  overflow: 'hidden',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

/**
 * Label text styles for background effect tiles.
 *
 * Small, medium-weight text centered below the preview area.
 */
export const backgroundTileLabelStyles: CSSObject = {
  fontSize: 11,
  fontWeight: 500,
  textAlign: 'center',
  color: 'var(--main-color)',
};

/**
 * Checkmark indicator styles for selected background effect tiles.
 *
 * Circular badge positioned in the top-right corner of the preview area.
 * Uses accent color background with shadow for visibility.
 */
export const backgroundTileCheckStyles: CSSObject = {
  position: 'absolute',
  top: 6,
  right: 6,
  width: 18,
  height: 18,
  borderRadius: '50%',
  backgroundColor: 'var(--accent-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.2)',
};

/**
 * Icon styles for the checkmark indicator.
 *
 * Small checkmark icon centered within the check badge.
 */
export const backgroundTileCheckIconStyles: CSSObject = {
  width: 12,
  height: 12,
  fill: 'var(--app-bg-secondary)',
};

/**
 * Backdrop styles for blur effect tile previews.
 *
 * Gradient background used behind the human outline icon in blur tiles.
 * Positioned absolutely to cover the entire preview area.
 */
export const backgroundTileBlurBackdropStyles: CSSObject = {
  position: 'absolute',
  inset: 0,
  backgroundImage: 'linear-gradient(135deg, #f4f6f8 0%, #dfe5ec 100%)',
};

/**
 * SVG container styles for the human outline icon.
 *
 * Sizes the icon to 78% of the preview area and positions it relatively
 * for proper centering. Uses currentColor for stroke color inheritance.
 */
export const backgroundTileHumanOutlineStyles: CSSObject = {
  position: 'relative',
  width: '78%',
  height: '78%',
  color: 'var(--gray-70)',
  zIndex: 1,
};

/**
 * Stroke styles for the human outline SVG paths.
 *
 * Defines stroke appearance (no fill, rounded line caps/joins) for
 * the silhouette icon used in effect previews.
 */
export const backgroundTileHumanStrokeStyles: CSSObject = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

/**
 * Pattern overlay styles for blur effect tile previews.
 *
 * Diagonal repeating gradient pattern positioned absolutely over the
 * preview area. Used to visually represent blur effect in preview tiles.
 */
export const backgroundTileBlurPatternStyles: CSSObject = {
  position: 'absolute',
  inset: 0,
  backgroundImage: 'repeating-linear-gradient(135deg, rgba(0, 0, 0, 0.14) 0 6px, rgba(255, 255, 255, 0.8) 6px 12px)',
};

/**
 * Preview styles for the "Add Background" tile.
 *
 * Dashed border and lighter background to distinguish it from
 * selectable background options.
 */
export const backgroundTileAddStyles: CSSObject = {
  borderStyle: 'dashed',
  backgroundColor: 'var(--gray-10)',
};

/**
 * Icon styles for the plus icon in the "Add Background" tile.
 *
 * Medium-sized plus icon with gray fill color.
 */
export const backgroundTileAddIconStyles: CSSObject = {
  width: 16,
  height: 16,
  fill: 'var(--gray-70)',
};
