/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

/** @jsx jsx */
import {jsx} from '@emotion/core';
import {COLOR} from '../Identity';
import {INPUT_CLASSNAME} from './Input';
import {INPUT_SUBMIT_COMBO_CLASSNAME} from './InputSubmitCombo';

const InputBlock = (props: React.HTMLProps<HTMLDivElement>) => (
  <div
    css={{
      backgroundColor: COLOR.GRAY_LIGHTEN_88,
      borderRadius: '4px',
      boxShadow: `inset 16px 16px 0 ${COLOR.WHITE}, inset -16px -16px 0 ${COLOR.WHITE}`,
      marginBottom: '16px',
      [`& > ${INPUT_CLASSNAME}`]: {
        margin: 0,
      },
      [`& > ${INPUT_CLASSNAME} + ${INPUT_CLASSNAME}, & > ${INPUT_CLASSNAME} + ${INPUT_SUBMIT_COMBO_CLASSNAME}`]: {
        margin: '1px 0 0',
      },
    }}
    {...props}
  />
);

export {InputBlock};
