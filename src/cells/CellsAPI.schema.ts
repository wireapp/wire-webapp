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

const ActivityObjectSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    '@context': z.string().optional(),
    accuracy: z.number().optional(),
    actor: ActivityObjectSchema.optional(),
    altitude: z.number().optional(),
    anyOf: ActivityObjectSchema.optional(),
    attachment: ActivityObjectSchema.optional(),
    attributedTo: ActivityObjectSchema.optional(),
    audience: ActivityObjectSchema.optional(),
    bcc: ActivityObjectSchema.optional(),
    bto: ActivityObjectSchema.optional(),
    cc: ActivityObjectSchema.optional(),
    closed: z.string().optional(),
  }),
);

const RestLockInfoSchema = z.object({
  IsLocked: z.boolean().optional(),
  Owner: z.string().optional(),
});

const RestContextWorkspaceSchema = z.object({
  Description: z.string().optional(),
  IsRoot: z.boolean().optional(),
  IsVirtualRoot: z.boolean().optional(),
  Label: z.string().optional(),
  Permissions: z.string().optional(),
  Quota: z.string().optional(),
  QuotaUsage: z.string().optional(),
  Scope: z.string().optional(),
  SkipRecycle: z.boolean().optional(),
  Slug: z.string(),
  Syncable: z.boolean().optional(),
  Uuid: z.string(),
});

const RestDataSourceFeaturesSchema = z.object({
  Encrypted: z.boolean().optional(),
  Versioned: z.boolean().optional(),
});

const RestPreSignedURLSchema = z.object({
  ExpiresAt: z.string().optional(),
  Url: z.string().optional(),
});

const RestCountMetaSchema = z.object({
  Namespace: z.string(),
  Value: z.number(),
});

const RestImageMetaSchema = z.object({
  Height: z.number().optional(),
  JsonEXIF: z.string().optional(),
  Orientation: z.number().optional(),
  Width: z.number().optional(),
});

const RestJsonMetaSchema = z.object({
  Namespace: z.string(),
  Value: z.string(),
});

const RestModeSchema = z.enum(['Default', 'NodeReadOnly', 'NodeWriteOnly', 'LevelReadOnly']);

const RestFilePreviewSchema = z.object({
  Bucket: z.string().optional(),
  ContentType: z.string().optional(),
  Dimension: z.number().optional(),
  Error: z.boolean().optional(),
  Key: z.string().optional(),
  PreSignedURL: RestPreSignedURLSchema.optional(),
  PreSignedGET: RestPreSignedURLSchema.optional(),
  Processing: z.boolean().optional(),
});

const RestShareLinkAccessTypeSchema = z.enum(['NoAccess', 'Preview', 'Download', 'Upload']);

const RestShareLinkSchema = z.object({
  AccessEnd: z.string().optional(),
  AccessStart: z.string().optional(),
  CurrentDownloads: z.string().optional(),
  Description: z.string().optional(),
  Label: z.string().optional(),
  LinkHash: z.string().optional(),
  LinkUrl: z.string().optional(),
  MaxDownloads: z.string().optional(),
  PasswordRequired: z.boolean().optional(),
  Permissions: z.array(RestShareLinkAccessTypeSchema).optional(),
  Policies: z.array(z.unknown()).optional(),
  PoliciesContextEditable: z.boolean().optional(),
});

const ActivitySubscriptionSchema = z.object({
  Events: z.array(z.string()).optional(),
  ObjectId: z.string().optional(),
  ObjectType: z.string().optional(),
  UserId: z.string().optional(),
});

const TreeNodeTypeSchema = z.enum(['UNKNOWN', 'LEAF', 'COLLECTION']);

const RestUserMetaSchema = z.object({
  Editable: z.boolean().optional(),
  JsonValue: z.string(),
  Namespace: z.string(),
  NodeUuid: z.string().optional(),
});

const RestVersionMetaSchema = z.object({
  Description: z.string().optional(),
  IsDraft: z.boolean().optional(),
  IsHead: z.boolean().optional(),
  OwnerUuid: z.string().optional(),
  VersionId: z.string(),
});

const RestVersionSchema = z.object({
  ContentHash: z.string().optional(),
  Description: z.string().optional(),
  Draft: z.boolean().optional(),
  ETag: z.string().optional(),
  EditorURLs: z.record(z.string(), RestPreSignedURLSchema).optional(),
  EditorURLsKeys: z.array(z.string()).optional(),
  FilePreviews: z.array(RestFilePreviewSchema).optional(),
  IsHead: z.boolean().optional(),
  MTime: z.string().optional(),
  OwnerName: z.string().optional(),
  OwnerUuid: z.string().optional(),
  PreSignedGET: RestPreSignedURLSchema.optional(),
  Size: z.string().optional(),
  VersionId: z.string(),
});

/**
 * Zod schema for REST node
 * Used for validating API responses from getNode and similar endpoints
 */
export const RestNodeSchema = z.object({
  /** Activities */
  Activities: z.array(ActivityObjectSchema).optional(),
  /** Content hash */
  ContentHash: z.string().optional(),
  /** Content lock information */
  ContentLock: RestLockInfoSchema.optional(),
  /** Content type */
  ContentType: z.string().optional(),
  /** Context workspace */
  ContextWorkspace: RestContextWorkspaceSchema.optional(),
  /** Data source features */
  DataSourceFeatures: RestDataSourceFeaturesSchema.optional(),
  /** Editor URLs */
  EditorURLs: z.record(z.string(), RestPreSignedURLSchema).optional(),
  /** Editor URLs keys */
  EditorURLsKeys: z.array(z.string()).optional(),
  /** Folder metadata */
  FolderMeta: z.array(RestCountMetaSchema).optional(),
  /** Hashing method */
  HashingMethod: z.string().optional(),
  /** Image metadata */
  ImageMeta: RestImageMetaSchema.optional(),
  /** Is bookmarked flag */
  IsBookmarked: z.boolean().optional(),
  /** Is draft flag */
  IsDraft: z.boolean().optional(),
  /** Is recycle bin flag */
  IsRecycleBin: z.boolean().optional(),
  /** Is recycled flag */
  IsRecycled: z.boolean().optional(),
  /** Metadata */
  Metadata: z.array(RestJsonMetaSchema).optional(),
  /** Node mode/permissions */
  Mode: RestModeSchema.optional(),
  /** Modification timestamp */
  Modified: z.string().optional(),
  /** Node path */
  Path: z.string(),
  /** Pre-signed GET URL */
  PreSignedGET: RestPreSignedURLSchema.optional(),
  /** File previews */
  Previews: z.array(RestFilePreviewSchema).optional(),
  /** Share links */
  Shares: z.array(RestShareLinkSchema).optional(),
  /** Node size in bytes */
  Size: z.string().optional(),
  /** Storage ETag */
  StorageETag: z.string().optional(),
  /** Subscriptions */
  Subscriptions: z.array(ActivitySubscriptionSchema).optional(),
  Type: TreeNodeTypeSchema.optional(),
  /** User metadata */
  UserMetadata: z.array(RestUserMetaSchema).optional(),
  /** Node UUID */
  Uuid: z.string(),
  /** Version metadata */
  VersionMeta: RestVersionMetaSchema.optional(),
  /** Versions */
  Versions: z.array(RestVersionSchema).optional(),
});

export type Node = z.infer<typeof RestNodeSchema>;
