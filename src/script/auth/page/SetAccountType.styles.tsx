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

import {CSSObject} from '@emotion/react';

import {WIDTH} from '@wireapp/react-ui-kit';

const breakpoints = [WIDTH.TABLET_MAX, WIDTH.DESKTOP_MAX];

const [mediaQueryTablet, mediaQueryDesktop] = breakpoints.map(bp => `@media (max-width: ${bp}px)`);

export const styles: {
  container: CSSObject;
  button: CSSObject;
  header: CSSObject;
  headerText: CSSObject;
  featureIcon: CSSObject;
  featureText: CSSObject;
  option: CSSObject;
  optionWrapper: CSSObject;
  optionContainer: CSSObject;
  optionFeatureContainer: CSSObject;
  optionHeading: CSSObject;
  optionDescription: CSSObject;
  featureList: CSSObject;
  optionButton: CSSObject;
} = {
  container: {
    width: '100%',
    padding: '38px',
    maxWidth: '1000px',
    margin: 'auto',
    marginBottom: '10vw',
    flexDirection: 'column',
    [mediaQueryTablet]: {
      padding: '18px',
    },
  },
  button: {
    position: 'absolute',
    bottom: '6px',
    right: '24px',
    left: '24px',
  },
  header: {
    alignItems: 'center',
    marginBottom: '24px',
    width: '100%',
  },
  headerText: {
    justifyContent: 'center',
    flex: 1,
    fontSize: '24px',
    fontWeight: 500,
  },
  featureIcon: {
    height: 20,
    width: 16,
    alignSelf: 'start',
    fill: 'var(--success-color)',
  },
  featureText: {
    textAlign: 'left',
  },
  option: {
    width: '100%',
  },
  optionWrapper: {
    gap: '3%',
    [mediaQueryDesktop]: {
      display: 'block',
      width: '100%',
    },
  },
  optionContainer: {
    padding: '24px',
    borderRadius: 12,
    border: '1px solid #DCE0E3',
    flex: 1,
    height: 360,
    position: 'relative',
    [mediaQueryDesktop]: {
      margin: '16px 0',
    },
  },
  optionFeatureContainer: {
    gap: '8px',
  },
  optionHeading: {
    color: '#0667C8',
    fontSize: '14px',
    fontWeight: 500,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: '16px',
    fontWeight: 600,
    textAlign: 'center',
  },
  featureList: {
    padding: '8px 24px',
  },
  optionButton: {
    position: 'absolute',
    bottom: '6px',
    right: '24px',
    left: '24px',
  },
};
