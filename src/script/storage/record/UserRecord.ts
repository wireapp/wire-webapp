import {Availability} from '@wireapp/protocol-messaging';

export interface UserRecord {
  availability: Availability.Type;
  id: string;
}
