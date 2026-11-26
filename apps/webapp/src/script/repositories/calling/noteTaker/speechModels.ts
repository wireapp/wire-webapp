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

export const speechModelIds = ['tiny', 'base', 'small'] as const;
export type SpeechModelId = (typeof speechModelIds)[number];
export const speechModelBasePath = '/assets/noteTakerModels/';

export const speechModelRevisions: Record<SpeechModelId, string> = {
  tiny: 'ff4177021cc41f7db950912b73ea4fdf7d01d8e7',
  base: '27a07b4b52b3a4c5886134bb4320e93e1a4bbc7c',
  small: '36050c46d777d46dc4b5f43f6d90574fc38f8732',
};

export function speechModelDirectory(modelId: SpeechModelId): string {
  return `${modelId}/${speechModelRevisions[modelId]}`;
}
