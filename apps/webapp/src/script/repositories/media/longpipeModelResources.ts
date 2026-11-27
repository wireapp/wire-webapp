/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

export const MODEL_WEIGHTS_BASE_URL = '/assets/longpipe/models/v0.0.5';

// Small is the usual starting preset; include every adaptive preset and both GPU dtypes.
const MODEL_FILES = ['small', 'xs', 'medium', 'large'].flatMap(preset => {
  return [`model_${preset}.f16.bin`, `model_${preset}.bin`];
});

let preloading: Promise<void> | undefined;

export const preloadLongpipeModels = (): Promise<void> => {
  preloading ??= (async () => {
    for (const file of MODEL_FILES) {
      const response = await fetch(`${MODEL_WEIGHTS_BASE_URL}/${file}`, {cache: 'force-cache'});
      if (!response.ok) {
        throw new Error(`Could not preload Longpipe model ${file}: ${response.status}`);
      }
      // Consume the response so the complete file reaches the HTTP cache, without retaining it.
      await response.arrayBuffer();
    }
  })().catch((error: unknown) => {
    preloading = undefined;
    throw error;
  });
  return preloading;
};
