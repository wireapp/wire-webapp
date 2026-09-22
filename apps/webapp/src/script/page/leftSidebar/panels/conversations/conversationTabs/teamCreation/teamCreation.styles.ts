/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react';

import {media} from '@wireapp/react-ui-kit';

export const teamUpgradeBannerHeaderCss: CSSObject = {
  lineHeight: 'var(--line-height-small-plus)',
  marginLeft: '0.5rem',
  verticalAlign: 'text-top',
  fontWeight: 'var(--font-weight-semibold)',
};

export const teamUpgradeBannerContentCss: CSSObject = {
  lineHeight: '.875rem',
  marginBottom: '0.5rem',
};

export const teamUpgradeBannerButtonCss: CSSObject = {
  margin: 0,
  height: '2.1rem',
  fontSize: 'var(--font-size-medium)',
  padding: '0.25rem 0.5rem',
  borderRadius: '12px',
  minWidth: '9rem',
};

export const iconButtonCss: CSSObject = {
  width: '2rem',
  marginBottom: '0.5rem',
  borderRadius: '0.5rem',
  background: 'var(--accent-color-50)',
  borderColor: 'var(--accent-color-500)',
  ':hover': {
    background: 'var(--accent-color-50)',
    borderColor: 'var(--accent-color-500)',
  },
  ':focus svg': {
    fill: 'var(--main-color)',
  },
  '.theme-dark &': {
    background: 'var(--accent-color-800)',
    borderColor: 'var(--accent-color-500)',
  },
};

export const teamCreationModalWrapperCss: CSSObject = {
  height: '42.5rem',
  width: '49rem',
  margin: '1rem',
  paddingBottom: '5.5rem',
  maxHeight: 'unset',
  [media.tabletSMDown]: {
    height: 'auto',
    paddingBottom: '0',
  },
};

export const teamCreationModalBodyCss: CSSObject = {
  padding: '0 3.5rem',
  margin: 'auto 0',

  [media.tabletSMDown]: {
    padding: '0 1rem',
    margin: 'auto 0',
  },
};

export const confirmLeaveModalWrapperCss: CSSObject = {
  height: '18.5rem',
  width: '20rem',
  margin: '1rem',
};

export const confirmLeaveModalBodyCss: CSSObject = {
  padding: '0 1.5rem',
};

export const confirmLeaveModalButtonsCss: CSSObject = {
  position: 'absolute',
  gap: '0.75rem',
  flexDirection: 'column',
};

export const buttonCss: CSSObject = {
  width: '100%',
  margin: 0,
};

const commonContainerCss: CSSObject = {
  padding: '0.5rem',
  borderRadius: '0.5rem',
  fill: 'var(--main-color)',

  background: 'var(--accent-color-50)',
  '.theme-dark &': {
    background: 'var(--accent-color-800)',
    boxShadow: 'none',
  },
};

export const teamUpgradeAccountBannerContainerCss: CSSObject = {
  ...commonContainerCss,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem',
  gap: '0.5rem',
  marginBottom: '2rem',
  [media.tabletDown]: {
    flexDirection: 'column',
    alignItems: 'baseline',
    gap: '0.5rem',
  },
};

export const teamUpgradeBannerContainerCss: CSSObject = {
  ...commonContainerCss,
  marginBottom: '4px',
  padding: '0.5rem',
  border: '1px solid var(--accent-color-500)',
  // fixed with the width of collapsable sidebar
  width: '203px',
};

export const bannerWrapperCss: CSSObject = {
  marginLeft: '40px',
  boxShadow: '0px 0px 12px 0px var(--background-fade-32)',
  borderRadius: '0.5rem',
};

export const bannerHeaderContainerCss: CSSObject = {
  display: 'flex',
  alignItems: 'center',
  marginBottom: '0.5rem',
};
