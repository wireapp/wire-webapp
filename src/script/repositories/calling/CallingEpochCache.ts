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

import {SubconversationEpochInfoMember} from '@wireapp/core/lib/conversation/SubconversationService/SubconversationService';

export type CallingEpochData = {
  serializedConversationId: string;
  epoch: number;
  clients: {convid: string; clients: SubconversationEpochInfoMember[]};
  secretKey: string;
};

export class CallingEpochCache {
  private isActive = false;
  private epochList: CallingEpochData[] = [];

  public isEnabled(): boolean {
    return this.isActive;
  }

  public enable(): void {
    this.isActive = true;
  }

  public disable(): void {
    this.isActive = false;
  }

  public clean() {
    this.epochList = [];
  }

  getEpochList(): CallingEpochData[] {
    return this.epochList;
  }

  store(data: CallingEpochData): number {
    return this.epochList.push(data);
  }
}
