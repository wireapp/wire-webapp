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

import {mapProfileAssets, updateUserEntityAssets} from 'Repositories/assets/AssetMapper';

import {ProviderData, ProviderEntity} from './ProviderEntity';
import {ServiceData, ServiceEntity} from './ServiceEntity';

export const IntegrationMapper = {
  mapProviderFromObject: (providerData: ProviderData, providerEntity = new ProviderEntity()) => {
    if (providerData) {
      const {description, email, id, name, url} = providerData;

      if (id) {
        providerEntity.id = id;
      }

      if (description) {
        providerEntity.description = description;
      }

      if (email) {
        providerEntity.email = email;
      }

      if (name) {
        providerEntity.name = name;
      }

      if (url) {
        providerEntity.url = url;
      }
    }

    return providerEntity;
  },

  mapServiceFromObject: (serviceData: ServiceData, domain: string) => {
    const serviceEntity = new ServiceEntity();
    if (serviceData) {
      const {assets, description, id, name, provider: providerId, summary, tags} = serviceData;

      if (id) {
        serviceEntity.id = id;
      }

      if (assets?.length) {
        const mappedAssets = mapProfileAssets({domain, id: serviceEntity.id}, assets);
        updateUserEntityAssets(serviceEntity, mappedAssets);
      }

      if (description) {
        serviceEntity.description = description;
      }

      if (name) {
        serviceEntity.name(name);
      }

      if (providerId) {
        serviceEntity.providerId = providerId;
      }

      if (summary) {
        serviceEntity.summary = summary;
      }

      if (tags) {
        serviceEntity.tags = tags;
      }
    }

    return serviceEntity;
  },

  mapServicesFromArray: (servicesData: ServiceData[] = [], domain: string) => {
    return servicesData
      .filter(serviceData => serviceData.enabled)
      .map(serviceData => IntegrationMapper.mapServiceFromObject(serviceData, domain));
  },
};
