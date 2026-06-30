/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

import {SVGIcon, SVGIconProps} from './SVGIcon';

export const HideIcon = (props: SVGIconProps) => (
  <SVGIcon realWidth={16} realHeight={11} {...props}>
    <path d="M8 2.667A3.334 3.334 0 0111.333 6c0 .433-.086.84-.24 1.22l1.947 1.947A7.88 7.88 0 0015.327 6c-1.154-2.927-4-5-7.334-5-.933 0-1.826.167-2.653.467l1.44 1.44c.38-.154.787-.24 1.22-.24zM1.333.847l1.52 1.52.307.306A7.867 7.867 0 00.667 6c1.153 2.927 4 5 7.333 5 1.033 0 2.02-.2 2.92-.56l.28.28 1.953 1.947.847-.847L2.18 0l-.847.847zM5.02 4.533l1.033 1.034C6.02 5.707 6 5.853 6 6c0 1.107.893 2 2 2 .147 0 .293-.02.433-.053L9.467 8.98c-.447.22-.94.353-1.467.353A3.334 3.334 0 014.667 6c0-.527.133-1.02.353-1.467zm2.873-.52l2.1 2.1.014-.106c0-1.107-.894-2-2-2l-.114.006z" />
  </SVGIcon>
);
