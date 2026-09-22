/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {COLOR_V2} from '@wireapp/react-ui-kit';

export const styles: {
  container: CSSObject;
  heading: CSSObject;
  subHeading: CSSObject;
  link: CSSObject;
} = {
  container: {
    maxWidth: '390px',
    flexDirection: 'column',
    alignItems: 'center',
    margin: 'auto',
    gap: '16px',
    padding: '24px',
  },
  heading: {
    fontSize: '24px',
    fontWeight: 500,
    marginBottom: '8px',
    width: '100%',
  },
  subHeading: {
    fontSize: '16px',
    width: '100%',
  },
  link: {
    fontWeight: 500,
    letterSpacing: '0.05px',
    lineHeight: '24px',
    textDecoration: 'underline',
    color: COLOR_V2.BLACK,
  },
};
