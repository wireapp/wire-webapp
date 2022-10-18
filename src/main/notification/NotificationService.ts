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

import {APIClient} from '@wireapp/api-client';
import {TimeUtil} from '@wireapp/commons';
import * as Events from '@wireapp/api-client/src/event';
import {Notification} from '@wireapp/api-client/src/notification/';
import {CRUDEngine, error as StoreEngineError} from '@wireapp/store-engine';
import {EventEmitter} from 'events';
import logdown from 'logdown';
import {PayloadBundle, PayloadBundleSource, PayloadBundleType} from '../conversation';
import {AssetContent} from '../conversation/content';
import {ConversationMapper} from '../conversation/ConversationMapper';
import {CoreError, NotificationError} from '../CoreError';
import {CryptographyService, DecryptionError} from '../cryptography';
import {UserMapper} from '../user/UserMapper';
import {NotificationBackendRepository} from './NotificationBackendRepository';
import {NotificationDatabaseRepository} from './NotificationDatabaseRepository';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {AbortHandler} from '@wireapp/api-client/src/tcp';
import {Decoder, Encoder} from 'bazinga64';
import {QualifiedId} from '@wireapp/api-client/src/user';
import {CommitPendingProposalsParams, HandlePendingProposalsParams, LastKeyMaterialUpdateParams} from './types';
import {TaskScheduler} from '../util/TaskScheduler/TaskScheduler';
import {MLSService} from '../mls';
import {LowPrecisionTaskScheduler} from '../util/LowPrecisionTaskScheduler/LowPrecisionTaskScheduler';
import {keyPackagesStatusStore} from '../mls/keyPackagesStatusStore/keyPackagesStatusStore';
import {keyMaterialUpdatesStore} from '../mls/keyMaterialUpdatesStore';

export type HandledEventPayload = {
  event: Events.BackendEvent;
  mappedEvent?: PayloadBundle;
  decryptedData?: GenericMessage;
  decryptionError?: {code: number; message: string};
};

enum TOPIC {
  NOTIFICATION_ERROR = 'NotificationService.TOPIC.NOTIFICATION_ERROR',
}

const DEFAULT_KEYING_MATERIAL_UPDATE_THRESHOLD = 1000 * 60 * 60 * 24 * 30; //30 days

const INITIAL_NUMBER_OF_KEY_PACKAGES = 100;

export type NotificationHandler = (
  notification: Notification,
  source: PayloadBundleSource,
  progress: {done: number; total: number},
) => Promise<void>;

export interface NotificationService {
  on(event: TOPIC.NOTIFICATION_ERROR, listener: (payload: NotificationError) => void): this;
}

export class NotificationService extends EventEmitter {
  private readonly apiClient: APIClient;
  private readonly backend: NotificationBackendRepository;
  private readonly cryptographyService: CryptographyService;
  private readonly database: NotificationDatabaseRepository;
  private readonly logger = logdown('@wireapp/core/NotificationService', {
    logger: console,
    markdown: false,
  });
  public static readonly TOPIC = TOPIC;

  constructor(
    apiClient: APIClient,
    cryptographyService: CryptographyService,
    private readonly mlsService: MLSService,
    storeEngine: CRUDEngine,
  ) {
    super();
    this.apiClient = apiClient;
    this.cryptographyService = cryptographyService;
    this.backend = new NotificationBackendRepository(this.apiClient);
    this.database = new NotificationDatabaseRepository(storeEngine);
  }

  private async getAllNotifications(since: string) {
    const clientId = this.apiClient.clientId;
    return this.backend.getAllNotifications(clientId, since);
  }

  /** Should only be called with a completely new client. */
  public async initializeNotificationStream(): Promise<string> {
    const clientId = this.apiClient.clientId;
    await this.setLastEventDate(new Date(0));
    const latestNotification = await this.backend.getLastNotification(clientId);
    return this.setLastNotificationId(latestNotification);
  }

  public async hasHistory(): Promise<boolean> {
    const notificationEvents = await this.getNotificationEventList();
    return !!notificationEvents.length;
  }

  public getNotificationEventList(): Promise<Events.BackendEvent[]> {
    return this.database.getNotificationEventList();
  }

  public async setLastEventDate(eventDate: Date): Promise<Date> {
    let databaseLastEventDate: Date | undefined;

    try {
      databaseLastEventDate = await this.database.getLastEventDate();
    } catch (error) {
      if (
        error instanceof StoreEngineError.RecordNotFoundError ||
        (error as Error).constructor.name === StoreEngineError.RecordNotFoundError.name
      ) {
        return this.database.createLastEventDate(eventDate);
      }
      throw error;
    }

    if (databaseLastEventDate && eventDate > databaseLastEventDate) {
      return this.database.updateLastEventDate(eventDate);
    }

    return databaseLastEventDate;
  }

  public async setLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.database.updateLastNotificationId(lastNotification);
  }

  public async processNotificationStream(
    notificationHandler: NotificationHandler,
    onMissedNotifications: (notificationId: string) => void,
    abortHandler: AbortHandler,
  ): Promise<{total: number; error: number; success: number}> {
    const lastNotificationId = await this.database.getLastNotificationId();
    const {notifications, missedNotification} = await this.getAllNotifications(lastNotificationId);
    if (missedNotification) {
      onMissedNotifications(missedNotification);
    }

    const results = {total: notifications.length, error: 0, success: 0};
    const logMessage =
      notifications.length > 0
        ? `Start processing ${notifications.length} notifications since notification id ${lastNotificationId}`
        : `No notification to process from the stream`;
    this.logger.log(logMessage);
    for (const [index, notification] of notifications.entries()) {
      if (abortHandler.isAborted()) {
        /* Stop handling notifications if the websocket has been disconnected.
         * Upon reconnecting we are going to restart handling the notification stream for where we left of
         */
        this.logger.warn(`Stop processing notifications as connection to websocket was closed`);
        return results;
      }
      try {
        await notificationHandler(notification, PayloadBundleSource.NOTIFICATION_STREAM, {
          done: index + 1,
          total: notifications.length,
        });
        results.success++;
      } catch (error) {
        const message = error instanceof Error ? error.message : error;
        this.logger.error(`Error while processing notification ${notification.id}: ${message}`, error);
        results.error++;
      }
    }
    return results;
  }

  /**
   * Checks if an event should be ignored.
   * An event that has a date prior to that last event that we have parsed should be ignored
   *
   * @param event
   * @param source
   * @param lastEventDate?
   */
  private isOutdatedEvent(event: {time: string}, source: PayloadBundleSource, lastEventDate?: Date) {
    const isFromNotificationStream = source === PayloadBundleSource.NOTIFICATION_STREAM;
    const shouldCheckEventDate = !!event.time && isFromNotificationStream && lastEventDate;

    if (shouldCheckEventDate) {
      /** This check prevents duplicated "You joined" system messages. */
      const isOutdated = lastEventDate.getTime() >= new Date(event.time).getTime();
      return isOutdated;
    }
    return false;
  }

  public async *handleNotification(
    notification: Notification,
    source: PayloadBundleSource,
    dryRun: boolean = false,
  ): AsyncGenerator<HandledEventPayload> {
    for (const event of notification.payload) {
      this.logger.log(`Handling event of type "${event.type}" for notification with ID "${notification.id}"`, event);
      let lastEventDate: Date | undefined = undefined;
      try {
        lastEventDate = await this.database.getLastEventDate();
      } catch {}
      if ('time' in event && this.isOutdatedEvent(event, source, lastEventDate)) {
        this.logger.info(`Ignored outdated event type: '${event.type}'`);
        continue;
      }
      try {
        const data = await this.handleEvent(event, source, dryRun);
        if (typeof data !== 'undefined') {
          yield {
            ...data,
            mappedEvent: data.mappedEvent ? this.cleanupPayloadBundle(data.mappedEvent) : undefined,
          };
        }
      } catch (error) {
        this.logger.error(
          `There was an error with notification ID "${notification.id}": ${(error as Error).message}`,
          error,
        );
        const notificationError: NotificationError = {
          error: error as Error,
          notification,
          type: CoreError.NOTIFICATION_ERROR,
        };
        this.emit(NotificationService.TOPIC.NOTIFICATION_ERROR, notificationError);
      }
    }
    if (!dryRun && !notification.transient) {
      // keep track of the last handled notification for next time we fetch the notification stream
      await this.setLastNotificationId(notification);
    }
  }

  private cleanupPayloadBundle(payload: PayloadBundle): PayloadBundle {
    switch (payload.type) {
      case PayloadBundleType.ASSET: {
        const assetContent = payload.content as AssetContent;
        const isMetaData = !!assetContent?.original && !assetContent?.uploaded;
        const isAbort = !!assetContent.abortReason || (!assetContent.original && !assetContent.uploaded);

        if (isMetaData) {
          payload.type = PayloadBundleType.ASSET_META;
        } else if (isAbort) {
          payload.type = PayloadBundleType.ASSET_ABORT;
        }
        return payload;
      }
      default:
        return payload;
    }
  }

  /**
   * Will process one event
   * @param event The backend event to process
   * @param source The source of the event (websocket or notication stream)
   * @param dryRun Will not try to decrypt if true
   * @return the decrypted payload and the raw event. Returns `undefined` when the payload is a coreCrypto-only system message
   */
  private async handleEvent(
    event: Events.BackendEvent,
    source: PayloadBundleSource,
    dryRun: boolean = false,
  ): Promise<HandledEventPayload | undefined> {
    switch (event.type) {
      case Events.CONVERSATION_EVENT.MLS_WELCOME_MESSAGE:
        const data = Decoder.fromBase64(event.data).asBytes;
        // We extract the groupId from the welcome message and let coreCrypto store this group
        const newGroupId = await this.mlsService.processWelcomeMessage(data);
        const groupIdStr = Encoder.toBase64(newGroupId).asString;
        // The groupId can then be sent back to the consumer
        return {
          event: {...event, data: groupIdStr},
          mappedEvent: ConversationMapper.mapConversationEvent({...event, data: groupIdStr}, source),
        };

      case Events.CONVERSATION_EVENT.MLS_MESSAGE_ADD:
        const encryptedData = Decoder.fromBase64(event.data).asBytes;

        const groupId = await this.getGroupIdFromConversationId(
          event.qualified_conversation ?? {id: event.conversation, domain: ''},
        );
        const groupIdBytes = Decoder.fromBase64(groupId).asBytes;

        const {proposals, commitDelay, message} = await this.mlsService.decryptMessage(groupIdBytes, encryptedData);
        // Check if the message includes proposals
        if (typeof commitDelay === 'number' || proposals.length > 0) {
          // we are dealing with a proposal, add a task to process this proposal later on
          // Those proposals are stored inside of coreCrypto and will be handled after a timeout
          await this.handlePendingProposals({
            groupId,
            delayInMs: commitDelay ?? 0,
            eventTime: event.time,
          });
          // This is not a text message, there is nothing more to do
          return undefined;
        }

        if (!message) {
          const newEpoch = await this.mlsService.getEpoch(groupIdBytes);
          this.logger.log(`Received commit message for group "${groupId}". New epoch is "${newEpoch}"`);
          return undefined;
        }
        const decryptedData = GenericMessage.decode(message);
        /**
         * @todo Find a proper solution to add mappedEvent to this return
         * otherwise event.data will be base64 raw data of the received event
         */
        return {event, decryptedData};

      // Encrypted Proteus events
      case Events.CONVERSATION_EVENT.OTR_MESSAGE_ADD: {
        if (dryRun) {
          // In case of a dry run, we do not want to decrypt messages
          // We just return the raw event to the caller
          return {event};
        }
        try {
          const decryptedData = await this.cryptographyService.decryptMessage(event);
          return {
            mappedEvent: this.cryptographyService.mapGenericMessage(event, decryptedData, source),
            event,
            decryptedData,
          };
        } catch (error) {
          return {event, decryptionError: error as DecryptionError};
        }
      }
      // Meta events
      case Events.CONVERSATION_EVENT.MEMBER_JOIN:
        // As of today (07/07/2022) the backend sends `WELCOME` message to the user's own conversation (not the actual conversation that the welcome should be part of)
        // So in order to map conversation Ids and groupId together, we need to first fetch the conversation and get the groupId linked to it.
        const conversation = await this.apiClient.api.conversation.getConversation(
          event.qualified_conversation ?? {id: event.conversation, domain: ''},
        );
        if (!conversation) {
          throw new Error('no conv');
        }

      case Events.CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE:
      case Events.CONVERSATION_EVENT.RENAME:
      case Events.CONVERSATION_EVENT.TYPING: {
        const {conversation, from} = event;
        const metaEvent = {...event, conversation, from};
        return {mappedEvent: ConversationMapper.mapConversationEvent(metaEvent, source), event};
      }
      // User events
      case Events.USER_EVENT.CONNECTION:
      case Events.USER_EVENT.CLIENT_ADD:
      case Events.USER_EVENT.UPDATE:
      case Events.USER_EVENT.CLIENT_REMOVE: {
        return {mappedEvent: UserMapper.mapUserEvent(event, this.apiClient.context!.userId, source), event};
      }
    }
    return {event};
  }

  /**
   * ## MLS only ##
   * If there is a matching conversationId => groupId pair in the database,
   * we can find the groupId and return it as a string
   *
   * @param conversationQualifiedId
   */
  private async getGroupIdFromConversationId(conversationQualifiedId: QualifiedId): Promise<string> {
    const {id: conversationId, domain: conversationDomain} = conversationQualifiedId;
    const groupId = await this.mlsService.groupIdFromConversationId?.(conversationQualifiedId);

    if (!groupId) {
      throw new Error(`Could not find a group_id for conversation ${conversationId}@${conversationDomain}`);
    }
    return groupId;
  }

  /**
   * ## MLS only ##
   * If there are pending proposals, we need to either process them,
   * or save them in the database for later processing
   *
   * @param groupId groupId of the mls conversation
   * @param delayInMs delay in ms before processing proposals
   * @param eventTime time of the event that had the proposals
   */
  private async handlePendingProposals({delayInMs, groupId, eventTime}: HandlePendingProposalsParams) {
    if (delayInMs > 0) {
      const eventDate = new Date(eventTime);
      const firingDate = eventDate.setTime(eventDate.getTime() + delayInMs);
      try {
        await this.database.storePendingProposal({
          groupId,
          firingDate,
        });
      } catch (error) {
        this.logger.error('Could not store pending proposal', error);
      } finally {
        TaskScheduler.addTask({
          task: () => this.commitPendingProposals({groupId}),
          firingDate,
          key: groupId,
        });
      }
    } else {
      await this.commitPendingProposals({groupId, skipDelete: true});
    }
  }

  /**
   * ## MLS only ##
   * Commit all pending proposals for a given groupId
   *
   * @param groupId groupId of the conversation
   * @param skipDelete if true, do not delete the pending proposals from the database
   */
  public async commitPendingProposals({groupId, skipDelete = false}: CommitPendingProposalsParams) {
    try {
      await this.mlsService.commitPendingProposals(Decoder.fromBase64(groupId).asBytes);

      if (!skipDelete) {
        TaskScheduler.cancelTask(groupId);
        await this.database.deletePendingProposal({groupId});
      }
    } catch (error) {
      this.logger.error(`Error while committing pending proposals for groupId ${groupId}`, error);
    }
  }

  /**
   * ## MLS only ##
   * Get all pending proposals from the database and schedule them
   * Function must only be called once, after application start
   *
   */
  public async checkExistingPendingProposals() {
    try {
      const pendingProposals = await this.database.getStoredPendingProposals();
      if (pendingProposals.length > 0) {
        pendingProposals.forEach(({groupId, firingDate}) =>
          TaskScheduler.addTask({
            task: () => this.commitPendingProposals({groupId}),
            firingDate,
            key: groupId,
          }),
        );
      }
    } catch (error) {
      this.logger.error('Could not get pending proposals', error);
    }
  }

  /**
   * ## MLS only ##
   * Store groupIds with last key material update dates.
   *
   * @param {groupId} params.groupId - groupId of the mls conversation
   * @param {previousUpdateDate} params.previousUpdateDate - date of the previous key material update
   */
  public async storeLastKeyMaterialUpdateDate(params: LastKeyMaterialUpdateParams) {
    keyMaterialUpdatesStore.storeLastKeyMaterialUpdateDate(params);
    await this.scheduleTaskToRenewKeyMaterial(params);
  }

  /**
   * ## MLS only ##
   * Renew key material for a given groupId
   *
   * @param groupId groupId of the conversation
   */
  private async renewKeyMaterial({groupId}: Omit<LastKeyMaterialUpdateParams, 'previousUpdateDate'>) {
    try {
      const groupConversationExists = await this.mlsService.conversationExists(Decoder.fromBase64(groupId).asBytes);

      if (!groupConversationExists) {
        keyMaterialUpdatesStore.deleteLastKeyMaterialUpdateDate({groupId});
        return;
      }

      const groupIdDecodedFromBase64 = Decoder.fromBase64(groupId).asBytes;
      await this.mlsService.updateKeyingMaterial(groupIdDecodedFromBase64);

      const keyRenewalTime = new Date().getTime();
      const keyMaterialUpdateDate = {groupId, previousUpdateDate: keyRenewalTime};
      await this.storeLastKeyMaterialUpdateDate(keyMaterialUpdateDate);
    } catch (error) {
      this.logger.error(`Error while renewing key material for groupId ${groupId}`, error);
    }
  }

  private createKeyMaterialUpdateTaskSchedulerId(groupId: string) {
    return `renew-key-material-update-${groupId}`;
  }

  private async scheduleTaskToRenewKeyMaterial({groupId, previousUpdateDate}: LastKeyMaterialUpdateParams) {
    //given period of time (30 days by default) after last update date renew key material
    const keyingMaterialUpdateThreshold =
      this.mlsService.config?.keyingMaterialUpdateThreshold || DEFAULT_KEYING_MATERIAL_UPDATE_THRESHOLD;

    const firingDate = previousUpdateDate + keyingMaterialUpdateThreshold;

    const key = this.createKeyMaterialUpdateTaskSchedulerId(groupId);

    LowPrecisionTaskScheduler.addTask({
      task: () => this.renewKeyMaterial({groupId}),
      intervalDelay: TimeUtil.TimeInMillis.MINUTE,
      firingDate,
      key,
    });
  }

  /**
   * ## MLS only ##
   * Get all keying material last update dates and schedule tasks for renewal
   * Function must only be called once, after application start
   *
   */
  public async checkForKeyMaterialsUpdate() {
    try {
      const keyMaterialUpdateDates = keyMaterialUpdatesStore.getAllUpdateDates();
      keyMaterialUpdateDates.forEach(date => this.scheduleTaskToRenewKeyMaterial(date));
    } catch (error) {
      this.logger.error('Could not get last key material update dates', error);
    }
  }

  private scheduleKeyPackagesSync(firingDate: number) {
    TaskScheduler.addTask({
      firingDate,
      key: 'try-key-packages-backend-sync',
      task: () => this.syncKeyPackages(),
    });
  }

  private async syncKeyPackages() {
    const validKeyPackagesCount = await this.mlsService.clientValidKeypackagesCount();

    const lastQueryDate = new Date().getTime();

    await keyPackagesStatusStore.saveState({lastQueryDate});

    const minAllowedNumberOfKeyPackages = INITIAL_NUMBER_OF_KEY_PACKAGES / 2;

    if (validKeyPackagesCount <= minAllowedNumberOfKeyPackages) {
      const clientId = this.apiClient.validatedClientId;

      //check numbers of keys on backend
      const backendKeyPackagesCount = await this.apiClient.api.client.getMLSKeyPackageCount(clientId);

      if (backendKeyPackagesCount <= minAllowedNumberOfKeyPackages) {
        //upload new keys
        const newKeyPackages = await this.mlsService.clientKeypackages(INITIAL_NUMBER_OF_KEY_PACKAGES);

        await this.mlsService.uploadMLSKeyPackages(newKeyPackages, clientId);
      }
    }

    //schedule new task after next 24h
    const nextKeyPackagesQueryDate = lastQueryDate + TimeUtil.TimeInMillis.DAY;
    this.scheduleKeyPackagesSync(nextKeyPackagesQueryDate);
  }

  /**
   * ## MLS only ##
   * Get date of last key packages count query and schedule a task to sync it with backend
   * Function must only be called once, after application start
   *
   */
  public async checkForKeyPackagesBackendSync() {
    const {lastQueryDate} = keyPackagesStatusStore.getState();

    //schedule a task lastKeyPackagesQueryDate + 24H
    const nextKeyPackagesQueryDate = lastQueryDate + TimeUtil.TimeInMillis.DAY;
    this.scheduleKeyPackagesSync(nextKeyPackagesQueryDate);
  }
}
