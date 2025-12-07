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

const form: CSSObject = {
  display: 'flex',
  flexDirection: 'column',
};

const formBody: CSSObject = {
  textAlign: 'left',
};

const passwordInfo = (hasValidationErrors: boolean): CSSObject => ({
  display: hasValidationErrors ? 'none' : 'block',
  marginTop: '-18px',
  marginBottom: '20px',
  fontSize: '12px',
});

const checkbox: CSSObject = {
  marginBottom: '6px',
  '& label': {
    alignItems: 'flex-start',
    '& > svg': {
      top: '12px !important',
    },
  },
};

const checkboxLabel: CSSObject = {
  fontSize: '14px',
  lineHeight: '16px',
};

const checkboxLink: CSSObject = {
  color: 'black',
};

const submitButton: CSSObject = {
  margin: '16px auto',
  width: '100%',
};

export const styles = {
  form,
  formBody,
  passwordInfo,
  checkbox,
  checkboxLabel,
  checkboxLink,
  submitButton,
};
