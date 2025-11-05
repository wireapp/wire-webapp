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

import {
  ACCESS_TYPE,
  CONVERSATION_PROTOCOL,
  FEATURE_KEY,
  FEATURE_LOCK_STATUS,
  FEATURE_STATUS,
} from './FeatureList.types';

/**
 * Runtime validation schemas for the Wire backend feature flags API according to
 * https://staging-nginz-https.zinfra.io/v12/api/swagger-ui/#/default/get-all-feature-configs-for-user
 *
 * These schemas validate feature flag responses but are designed to be
 * LENIENT to maintain backwards and forwards compatibility across API versions:
 *
 * - Missing features (older API versions) → Allowed via optional fields
 * - Unknown features (newer API versions) → Allowed via .passthrough()
 * - Invalid feature data → Logged as error, not thrown as errors
 *
 * This ensures the API client works reliably regardless of backend version.
 */

// Core feature flag field schemas

const featureStatusSchema = z.nativeEnum(FEATURE_STATUS);
const featureLockStatusSchema = z.nativeEnum(FEATURE_LOCK_STATUS);
const accessTypeSchema = z.nativeEnum(ACCESS_TYPE);
const conversationProtocolSchema = z.nativeEnum(CONVERSATION_PROTOCOL);

/**
 * TTL (Time To Live) can be either:
 * - The string "unlimited" (no expiration)
 * - A number (seconds until expiration)
 */
const timeToLiveSchema = z.union([z.literal('unlimited'), z.number()]);

/**
 * Base schema for features without configuration objects.
 * Many features only have status/lockStatus/ttl without additional config.
 */
const baseFeatureWithoutConfigSchema = z.object({
  status: featureStatusSchema,
  lockStatus: featureLockStatusSchema.optional(),
  ttl: timeToLiveSchema.optional(),
});

// Feature-specific configuration schemas

const appLockConfigSchema = z.object({
  enforceAppLock: z.boolean(),
  inactivityTimeoutSecs: z.number(),
});

const allowedGlobalOperationsConfigSchema = z.object({
  mlsConversationReset: z.boolean().optional(),
});

const channelsConfigSchema = z.object({
  allowed_to_create_channels: accessTypeSchema,
  allowed_to_open_channels: accessTypeSchema,
});

const selfDeletingMessagesConfigSchema = z.object({
  enforcedTimeoutSeconds: z.number(),
});

const enforceFileDownloadLocationConfigSchema = z.object({
  enforcedDownloadLocation: z.string(),
});

const classifiedDomainsConfigSchema = z.object({
  domains: z.array(z.string()),
});

const conferenceCallingConfigSchema = z.object({
  useSFTForOneToOneCalls: z.boolean().optional(),
});

const mlsConfigSchema = z.object({
  allowedCipherSuites: z.array(z.number()),
  defaultCipherSuite: z.number(),
  defaultProtocol: conversationProtocolSchema,
  protocolToggleUsers: z.array(z.string()),
  supportedProtocols: z.array(conversationProtocolSchema),
});

const mlsE2EIdConfigSchema = z.object({
  verificationExpiration: z.number(),
  acmeDiscoveryUrl: z.string().optional(),
  crlProxy: z.string().optional(),
  useProxyOnMobile: z.boolean().optional(),
});

const mlsMigrationConfigSchema = z.object({
  startTime: z.string().optional(),
  finaliseRegardlessAfter: z.string().optional(),
});

/**
 * Helper to create a feature schema that includes both base fields
 * (status, lockStatus, ttl) and a feature-specific config object.
 */
const createFeatureSchemaWithConfig = <TConfig extends z.ZodTypeAny>(featureSpecificConfigSchema: TConfig) =>
  baseFeatureWithoutConfigSchema.extend({
    config: featureSpecificConfigSchema,
  });

// Complete feature schemas combining base fields + config

const appLockFeatureSchema = createFeatureSchemaWithConfig(appLockConfigSchema).optional();
const allowedGlobalOperationsFeatureSchema = createFeatureSchemaWithConfig(
  allowedGlobalOperationsConfigSchema,
).optional();
const channelsFeatureSchema = createFeatureSchemaWithConfig(channelsConfigSchema).optional();
const classifiedDomainsFeatureSchema = createFeatureSchemaWithConfig(classifiedDomainsConfigSchema).optional();
const conferenceCallingFeatureSchema = createFeatureSchemaWithConfig(conferenceCallingConfigSchema).optional();
const enforceFileDownloadLocationFeatureSchema = createFeatureSchemaWithConfig(
  enforceFileDownloadLocationConfigSchema,
).optional();
const selfDeletingMessagesFeatureSchema = createFeatureSchemaWithConfig(selfDeletingMessagesConfigSchema).optional();
const mlsFeatureSchema = createFeatureSchemaWithConfig(mlsConfigSchema).optional();
const mlsE2EIdFeatureSchema = createFeatureSchemaWithConfig(mlsE2EIdConfigSchema).optional();
const mlsMigrationFeatureSchema = createFeatureSchemaWithConfig(mlsMigrationConfigSchema).optional();

/**
 * Complete feature list schema for the /feature-configs endpoint.
 *
 * Design decisions for API version compatibility:
 *
 * 1. All features are .optional() to support older backend versions
 *    that may not include newer features
 *
 * 2. Schema uses .passthrough() to allow unknown feature keys from
 *    newer backend versions without validation failures
 *
 * 3. Validation uses safeParse() (not parse()) to log issues without
 *    throwing errors and breaking the application
 *
 * This "validate but don't enforce" approach ensures the client works
 * across different Wire backend API versions while still providing
 * validation warnings for debugging.
 */
export const allFeaturesResponseSchema = z
  .object({
    [FEATURE_KEY.APPLOCK]: appLockFeatureSchema,
    [FEATURE_KEY.ALLOWED_GLOBAL_OPERATIONS]: allowedGlobalOperationsFeatureSchema,
    [FEATURE_KEY.APPS]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.ASSET_AUDIT_LOG]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.CELLS]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.CHANNELS]: channelsFeatureSchema,
    [FEATURE_KEY.CHAT_BUBBLES]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.CLASSIFIED_DOMAINS]: classifiedDomainsFeatureSchema,
    [FEATURE_KEY.CONFERENCE_CALLING]: conferenceCallingFeatureSchema,
    [FEATURE_KEY.CONSUMABLE_NOTIFICATIONS]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.CONVERSATION_GUEST_LINKS]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.DIGITAL_SIGNATURES]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.DOMAIN_REGISTRATION]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.ENFORCE_DOWNLOAD_PATH]: enforceFileDownloadLocationFeatureSchema,
    [FEATURE_KEY.EXPOSE_INVITATION_URLS_TO_TEAM_ADMIN]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.FILE_SHARING]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.LEGALHOLD]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.LIMITED_EVENT_FANOUT]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.MLS]: mlsFeatureSchema,
    [FEATURE_KEY.MLSE2EID]: mlsE2EIdFeatureSchema,
    [FEATURE_KEY.MLS_MIGRATION]: mlsMigrationFeatureSchema,
    [FEATURE_KEY.OUTLOOK_CAL_INTEGRATION]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.SEARCH_VISIBILITY]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.SEARCH_VISIBILITY_INBOUND]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.SELF_DELETING_MESSAGES]: selfDeletingMessagesFeatureSchema,
    [FEATURE_KEY.SIMPLIFIED_USER_CONNECTION_REQUEST_QR_CODE]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.SND_FACTOR_PASSWORD]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.SSO]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.STEALTH_USERS]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.VALIDATE_SAML_EMAILS]: baseFeatureWithoutConfigSchema.optional(),
    [FEATURE_KEY.VIDEO_CALLING]: baseFeatureWithoutConfigSchema.optional(),
  })
  .passthrough(); // Allow unknown features from newer backend versions

/**
 * Validated FeatureList type inferred from the Zod schema.
 * This type represents a feature list that has passed runtime validation.
 */
export type ValidatedFeatureList = z.infer<typeof allFeaturesResponseSchema>;

/**
 * Individual feature types derived from Zod schemas.
 * These are the canonical TypeScript types for Wire feature flags,
 * replacing the legacy types from Feature.ts.
 *
 * All types are derived from the Zod schemas above using z.infer<>,
 * ensuring runtime validation and compile-time types stay in sync.
 */
export type FeatureAppLock = z.infer<typeof appLockFeatureSchema>;
export type FeatureAllowedGlobalOperations = z.infer<typeof allowedGlobalOperationsFeatureSchema>;
export type FeatureChannels = z.infer<typeof channelsFeatureSchema>;
export type FeatureClassifiedDomains = z.infer<typeof classifiedDomainsFeatureSchema>;
export type FeatureConferenceCalling = z.infer<typeof conferenceCallingFeatureSchema>;
export type FeatureDownloadPath = z.infer<typeof enforceFileDownloadLocationFeatureSchema>;
export type FeatureSelfDeletingMessages = z.infer<typeof selfDeletingMessagesFeatureSchema>;
export type FeatureMLS = z.infer<typeof mlsFeatureSchema>;
export type FeatureMLSE2EId = z.infer<typeof mlsE2EIdFeatureSchema>;
export type FeatureMLSMigration = z.infer<typeof mlsMigrationFeatureSchema>;
export type FeatureWithoutConfig = z.infer<typeof baseFeatureWithoutConfigSchema>;

// Additional feature types that use baseFeatureWithoutConfigSchema
export type FeatureApps = FeatureWithoutConfig;
export type FeatureAssetAuditLog = FeatureWithoutConfig;
export type FeatureCells = FeatureWithoutConfig;
export type FeatureChatBubbles = FeatureWithoutConfig;
export type FeatureConsumableNotifications = FeatureWithoutConfig;
export type FeatureConversationGuestLink = FeatureWithoutConfig;
export type FeatureDigitalSignature = FeatureWithoutConfig;
export type FeatureDomainRegistration = FeatureWithoutConfig;
export type FeatureExposeInvitationURLsToTeamAdmin = FeatureWithoutConfig;
export type FeatureFileSharing = FeatureWithoutConfig;
export type FeatureLegalhold = FeatureWithoutConfig;
export type FeatureLimitedEventFanout = FeatureWithoutConfig;
export type FeatureOutlookCalIntegration = FeatureWithoutConfig;
export type FeatureSearchVisibility = FeatureWithoutConfig;
export type FeatureSearchVisibilityInbound = FeatureWithoutConfig;
export type FeatureSimplifiedUserConnectionRequestQRCode = FeatureWithoutConfig;
export type FeatureSndFactorPassword = FeatureWithoutConfig;
export type FeatureSSO = FeatureWithoutConfig;
export type FeatureStealthUsers = FeatureWithoutConfig;
export type FeatureValidateSAMLEmails = FeatureWithoutConfig;
export type FeatureVideoCalling = FeatureWithoutConfig;
