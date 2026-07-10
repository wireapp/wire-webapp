/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {CSSProperties} from 'react';

import {CSSObject} from '@emotion/react';

const container: CSSProperties = {
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-around',
  minHeight: 428,
  maxWidth: 645,
};

const headline: CSSObject = {
  marginBottom: 16,
};

const successIcon: CSSObject = {
  alignSelf: 'center',
  marginBottom: 64,
};

const successText: CSSProperties = {
  marginBottom: 40,
};

const continueButton: CSSObject = {
  width: '70%',
};

const subheadline: CSSObject = {
  marginBottom: '24px',
};

const entropyCanvas = (pause: boolean): CSSObject => ({
  border: pause ? 'red 2px solid' : 'black 2px solid',
});

const screenReaderOnly: CSSProperties = {
  clip: 'rect(0 0 0 0)',
  height: 1,
  margin: -1,
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  width: 1,
};

export const styles = {
  container,
  headline,
  successIcon,
  successText,
  continueButton,
  subheadline,
  entropyCanvas,
  screenReaderOnly,
};
