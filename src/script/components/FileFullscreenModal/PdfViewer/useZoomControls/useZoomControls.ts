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

import {useState} from 'react';

const ZOOM_STEP = 0.1;
const MIN_ZOOM = 1.0;
const MAX_ZOOM = 2.0;
const INITIAL_ZOOM = 1.0;

export const useZoomControls = () => {
  const [scale, setScale] = useState(INITIAL_ZOOM);

  return {
    scale,
    zoomIn: () => setScale(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM)),
    zoomOut: () => setScale(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM)),
  };
};
