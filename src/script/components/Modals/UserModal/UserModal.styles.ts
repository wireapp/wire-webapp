/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {CSSObject, css} from '@emotion/react';

export const userModalStyle = css`
  .enriched-fields {
    margin: 0 0 16px 0;
  }

  .loading-wrapper {
    align-items: center;
    display: flex;
    height: 448px;
    justify-content: center;
  }

  &__wrapper {
    min-height: 0;
    overflow-x: hidden;
    transition: all 0.15s linear;

    &--max {
      min-height: 448px;
    }
  }

  .panel-participant {
    padding: 0;
  }

  .modal__body {
    padding: 0 16px;

    .classified-bar {
      margin-top: 12px;
      width: calc(100% + 32px);
    }
  }
`;

export const userModalWrapperStyle: CSSObject = {
  maxHeight: '90vh',
  padding: 0,
};
