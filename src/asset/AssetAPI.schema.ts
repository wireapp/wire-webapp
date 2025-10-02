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

import {z} from 'zod';

/**
 * Zod schema for validating POST /assets response (201 Created)
 * Based on backend API specification
 */
export const PostAssetsResponseSchema = z.object({
  /** Asset domain (example.com) */
  domain: z.string().optional(),
  /** ISO 8601 formatted expiration date */
  expires: z.string().datetime(),
  /** Asset key (e.g., "3-1-47de4580-ae51-4650-acbb-d10c028cb0ac") */
  key: z.string().min(1),
  /** Base64 encoded token (e.g., "aGVsbG8") */
  token: z.string().min(1),
});

export type AssetUploadData = z.infer<typeof PostAssetsResponseSchema>;
