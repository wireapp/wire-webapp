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

import {EventRecord} from 'Repositories/storage/record/EventRecord';

/** Enum for different confirmation types */
export enum StatusType {
  DELIVERED = 3,
  FAILED = 0,
  FEDERATION_ERROR = 5,
  SEEN = 4,
  SENDING = 1,
  SENT = 2,
  UNSPECIFIED = -1,
}

type FailedEventRecord = Omit<EventRecord, 'status'> & {
  status: StatusType.FAILED;
};
type EventRecordWithFederationError = Omit<EventRecord, 'status'> & {
  status: StatusType.FEDERATION_ERROR;
};

export const isEventRecordFailed = (event: any): event is FailedEventRecord =>
  'status' in event && event.status === StatusType.FAILED;
export const isEventRecordWithFederationError = (event: any): event is EventRecordWithFederationError =>
  'status' in event && event.status === StatusType.FEDERATION_ERROR;
