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

import {z} from 'zod';

/**
 * Zod schema for REST node
 * Used for validating API responses from getNode and similar endpoints
 * Fields are optional to handle various response scenarios
 */
export const RestNodeSchema = z.object({
  /** Node UUID */
  Uuid: z.string().optional(),
  /** Node path */
  Path: z.string().optional(),
  /** Node type (LEAF for file, COLLECTION for folder) */
  Type: z.string().optional(),
  /** Node size in bytes */
  Size: z.string().optional(),
  /** Modification timestamp */
  MTime: z.string().optional(),
  /** Node mode/permissions */
  Mode: z.string().optional(),
  /** Node ETag */
  Etag: z.string().optional(),
  /** User metadata */
  MetaStore: z.record(z.string(), z.string()).optional(),
  /** Pre-signed URL for direct access */
  PresignedUrl: z.string().optional(),
  /** Resource UUID */
  ResourceUuid: z.string().optional(),
  /** Version ID */
  VersionId: z.string().optional(),
});

export type Node = z.infer<typeof RestNodeSchema>;
