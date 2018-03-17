import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/index';
import APIClient = require('@wireapp/api-client');
import {Notification} from '@wireapp/api-client/dist/commonjs/notification/index';
import {RecordNotFoundError} from '@wireapp/store-engine/dist/commonjs/engine/error';

export default class NotificationService {
  public static STORES = {
    AMPLIFY: 'amplify',
  };

  public static KEYS = {
    PRIMARY_KEY_LAST_EVENT: 'z.storage.StorageKey.EVENT.LAST_DATE',
    PRIMARY_KEY_LAST_NOTIFICATION: 'z.storage.StorageKey.NOTIFICATION.LAST_ID',
  };

  constructor(private apiClient: APIClient, private storeEngine: CRUDEngine) {}

  public initializeNotificationStream(clientId: string): Promise<string> {
    return this.setLastEventDate(new Date(0))
      .then(() => this.getLastNotification(clientId))
      .then(notification => this.setLastNotificationId(notification));
  }

  private setLastEventDate(eventDate: Date): Promise<Date> {
    return this.getLastEventDate()
      .catch(error => {
        if (error instanceof RecordNotFoundError) {
          return new Date(-1);
        }
        throw error;
      })
      .then(databaseLastEventDate => {
        if (eventDate > databaseLastEventDate) {
          this.storeEngine.create(NotificationService.STORES.AMPLIFY, NotificationService.KEYS.PRIMARY_KEY_LAST_EVENT, {
            value: eventDate.toISOString(),
          });
          return eventDate;
        }
        return databaseLastEventDate;
      });
  }

  private getLastEventDate(): Promise<Date> {
    return this.storeEngine
      .read<{value: string}>(NotificationService.STORES.AMPLIFY, NotificationService.KEYS.PRIMARY_KEY_LAST_EVENT)
      .then(({value}) => new Date(value));
  }

  private getLastNotification(clientId: string): Promise<Notification> {
    return this.apiClient.notification.api.getLastNotification(clientId);
  }

  private setLastNotificationId(lastNotification: Notification): Promise<string> {
    return this.storeEngine.create(
      NotificationService.STORES.AMPLIFY,
      NotificationService.KEYS.PRIMARY_KEY_LAST_NOTIFICATION,
      {value: lastNotification.id}
    );
  }
}
