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

import {isNonEmptyArray, isNonEmptyString, isNullOrUndefined} from '@sindresorhus/is';
import {UserType} from '@wireapp/api-client/lib/user';

import {mapProfileAssets, updateUserEntityAssets} from 'Repositories/assets/assetMapper';
import {User} from 'Repositories/entity/User';

import {ProviderData, ProviderEntity} from './ProviderEntity';
import {ServiceData, ServiceEntity} from './ServiceEntity';

export const IntegrationMapper = {
  mapProviderFromObject: (providerData: ProviderData, providerEntity = new ProviderEntity()) => {
    if (!isNullOrUndefined(providerData)) {
      const {description, email, id, name, url} = providerData;

      if (isNonEmptyString(id)) {
        providerEntity.id = id;
      }

      if (isNonEmptyString(description)) {
        providerEntity.description = description;
      }

      if (isNonEmptyString(email)) {
        providerEntity.email = email;
      }

      if (isNonEmptyString(name)) {
        providerEntity.name = name;
      }

      if (isNonEmptyString(url)) {
        providerEntity.url = url;
      }
    }

    return providerEntity;
  },

  mapServiceFromObject: (serviceData: ServiceData, domain: string) => {
    const serviceEntity = new ServiceEntity();
    if (!isNullOrUndefined(serviceData)) {
      const {assets, description, id, name, provider: providerId, summary, tags} = serviceData;

      if (isNonEmptyString(id)) {
        serviceEntity.id = id;
      }

      if (isNonEmptyArray(assets)) {
        const mappedAssets = mapProfileAssets({domain, id: serviceEntity.id}, assets);
        updateUserEntityAssets(serviceEntity, mappedAssets);
      }

      if (isNonEmptyString(description)) {
        serviceEntity.description = description;
      }

      if (isNonEmptyString(name)) {
        serviceEntity.name(name);
      }

      if (isNonEmptyString(providerId)) {
        serviceEntity.providerId = providerId;
      }

      if (isNonEmptyString(summary)) {
        serviceEntity.summary = summary;
      }

      if (!isNullOrUndefined(tags)) {
        serviceEntity.tags = tags;
      }
    }

    return serviceEntity;
  },

  mapServiceFromUser: (user: User) => {
    const serviceEntity = new ServiceEntity();

    if (user.type === UserType.APP) {
      const {id, qualifiedId, name, description, category, previewPictureResource, mediumPictureResource} = user;

      Object.assign(serviceEntity, {
        id,
        qualifiedId,
        name,
        description,
        category,
        previewPictureResource,
        mediumPictureResource,
      });
      serviceEntity.type = 'App';
    }

    return serviceEntity;
  },

  mapServicesFromArray: (servicesData: ServiceData[] = [], domain: string) => {
    return servicesData
      .filter(serviceData => serviceData.enabled === true)
      .map(serviceData => IntegrationMapper.mapServiceFromObject(serviceData, domain));
  },
};
