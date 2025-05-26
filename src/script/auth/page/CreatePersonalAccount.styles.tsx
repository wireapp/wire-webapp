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

const container: CSSObject = {
  maxWidth: '420px',
  padding: '0 30px',
  margin: '0 auto',
  flexDirection: 'column',
  position: 'relative',
};

const backButtonContainer: CSSObject = {
  position: 'absolute',
  top: '9px',
  left: '6px',
};

const header: CSSObject = {
  fontSize: '24px',
  fontWeight: '500',
  width: '100%',
  textAlign: 'center',
};

const footer: CSSObject = {
  textAlign: 'center',
  width: '100%',
  marginBottom: '0px',
};

const teamCreateButton: CSSObject = {
  textAlign: 'center',
  width: '100%',
  color: 'black',
  fontWeight: '500',
};

export const styles = {
  container,
  backButtonContainer,
  header,
  footer,
  teamCreateButton,
};
