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

export const styles: {
  button: CSSObject;
  fullWidth: CSSObject;
} = {
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '12px',
    border: '1px solid var(--Border-Base-Primary, #DCE0E3)',
    background: 'var(--Background-Base-Primary, #FFFFFF)',
    color: 'var(--Content-Base-Primary, #000000)',
    cursor: 'pointer',
    outline: 'none',
    textAlign: 'left',

    '& [data-secondary-button-content="true"]': {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      flex: '1 1 auto',
      gap: '4px',
    },

    '& [data-secondary-button-title="true"]': {
      fontWeight: 'var(--font-weight-semibold, 600)',
    },

    '& [data-secondary-text="true"]': {
      color: 'var(--Content-Base-Primary, #000000)',
      fontWeight: 'var(--font-weight-regular, 400)',
    },

    '& [data-secondary-button-chevron="true"]': {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      color: 'var(--Content-Base-Primary, #000000)',
    },

    '&:hover:not(:disabled)': {
      border: '1px solid var(--accent-color-focus, var(--Border-Accent-Color-Primary, #0667C8))',
      background: 'var(--Background-Base-Secondary-focus, #E5E8EA)',
    },

    '&:focus-visible:not(:disabled)': {
      border: '1px solid var(--accent-color-focus, var(--Border-Accent-Color-Primary, #0667C8))',
      background: 'var(--Background-Base-Secondary-focus, #E5E8EA)',
      boxShadow: '0 0 0 2px var(--accent-color-100, var(--border-base-focus, #6AA4DE))',
    },

    '&:disabled': {
      border: '1px solid var(--Border-Base-Primary, #DCE0E3)',
      background: 'var(--Background-Disabled-Secondary, #EDEFF0)',
      color: 'var(--Content-Base-Primary, #676B71)',
      cursor: 'not-allowed',
    },

    'body.theme-dark &': {
      border: '1px solid var(--Border-Base-Primary, #34373D)',
      background: 'var(--Background-Base-Primary, #17181A)',
      color: 'var(--Content-Base-Primary, #FFFFFF)',

      '& [data-secondary-text="true"]': {
        color: 'var(--Content-Base-Primary, #FFFFFF)',
        fontWeight: 'var(--font-weight-regular, 400)',
      },

      '& [data-secondary-button-chevron="true"]': {
        color: 'var(--Content-Base-Primary, #FFFFFF)',
      },

      '&:hover:not(:disabled)': {
        border: '1px solid var(--accent-color-focus, var(--Border-Accent-Color-Primary, #54A6FF))',
        background: 'var(--Background-Base-Secondary-focus, #54585F)',
      },

      '&:focus-visible:not(:disabled)': {
        border: '1px solid var(--accent-color-focus, var(--Border-Accent-Color-Primary, #54A6FF))',
        background: 'var(--Background-Base-Secondary-focus, #54585F)',
        boxShadow: '0 0 0 2px var(--accent-color-100, var(--border-base-focus, #6AA4DE))',
      },

      '&:disabled': {
        border: '1px solid var(--Border-Base-Primary, #34373D)',
        background: 'var(--Background-Disabled-Secondary, #26272C)',
        color: 'var(--Content-Base-Primary, #9FA1A7)',
        cursor: 'not-allowed',
      },
    },
  },
  fullWidth: {
    width: 'var(--collection-max-section-width, 642px)',
    maxWidth: '100%',
  },
};
