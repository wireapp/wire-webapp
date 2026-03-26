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

import type {DebugMode} from '../backgroundEffectsWorkerTypes';

/**
 * Array of all valid debug mode values.
 *
 * Debug modes provide visualization tools for inspecting the segmentation mask:
 * - 'off': Normal rendering with background effects applied
 * - 'maskOverlay': Overlays a semi-transparent green tint on mask areas (foreground)
 * - 'maskOnly': Displays only the segmentation mask as a grayscale image
 * - 'edgeOnly': Highlights the edges of the mask using smoothstep edge detection
 * - 'classOverlay': Overlays class colors from multiclass segmentation
 * - 'classOnly': Shows class colors only (no video)
 */
export const DebugModeValues: DebugMode[] = ['off', 'maskOverlay', 'maskOnly', 'edgeOnly', 'classOverlay', 'classOnly'];

/**
 * Type guard function that checks if a string value is a valid DebugMode.
 *
 * This function provides runtime type safety when parsing debug mode values
 * from external sources (e.g., URL parameters, user input, configuration files).
 *
 * @param value - The string value to check.
 * @returns True if the value is a valid DebugMode, false otherwise.
 */
export function isDebugMode(value: string): value is DebugMode {
  return (DebugModeValues as string[]).includes(value);
}
