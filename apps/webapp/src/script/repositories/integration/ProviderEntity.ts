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

export interface ProviderData {
  description?: string;
  email?: string;
  id?: string;
  name?: string;
  url?: string;
}

export class ProviderEntity {
  description: string;
  email: string;
  id: string;
  name: string;
  url: string;

  constructor(providerData: ProviderData = {}) {
    const {description, id, name, url, email} = providerData;

    this.id = id !== null && id !== undefined && id.length > 0 ? id : '';

    this.description = description !== null && description !== undefined && description.length > 0 ? description : '';
    this.email = email !== null && email !== undefined && email.length > 0 ? email : '';
    this.name = name !== null && name !== undefined && name.length > 0 ? name : '';
    this.url = url !== null && url !== undefined && url.length > 0 ? url : '';
  }
}
