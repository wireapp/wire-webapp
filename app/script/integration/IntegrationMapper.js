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

'use strict';

window.z = window.z || {};
window.z.integration = z.integration || {};

z.integration.IntegrationMapper = class IntegrationMapper {
  constructor() {
    this.logger = new z.util.Logger('z.integration.IntegrationMapper', z.config.LOGGER.OPTIONS);
  }

  mapProviderFromObject(providerData) {
    return this.updateProviderFromObject(providerData);
  }

  mapServicesFromArray(servicesData) {
    return servicesData.map(serviceData => this.updateServiceFromObject(serviceData));
  }

  mapServiceFromObject(serviceData) {
    return this.updateServiceFromObject(serviceData);
  }

  updateProviderFromObject(providerData, providerEntity = new z.integration.ProviderEntity()) {
    if (providerData) {
      const {description, id, name, url, email} = providerData;

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

      return providerEntity;
    }
  }

  updateServiceFromObject(serviceData, serviceEntity = new z.integration.ServiceEntity()) {
    if (serviceData) {
      const {assets, description, id, name, provider: providerId, tags} = serviceData;

      if (id) {
        serviceEntity.id = id;
      }

      if (assets && assets.length) {
        this._mapAssets(serviceEntity, assets);
      }

      if (description) {
        serviceEntity.description = description;
      }

      if (name) {
        serviceEntity.name = name;
      }

      if (providerId) {
        serviceEntity.providerId = providerId;
      }

      if (tags) {
        serviceEntity.tags = tags;
      }

      return serviceEntity;
    }
  }

  _mapAssets(serviceEntity, assets) {
    return assets.filter(asset => asset.type === 'image').map(asset => {
      switch (asset.size) {
        case 'preview':
          serviceEntity.previewPictureResource(z.assets.AssetRemoteData.v3(asset.key, true));
          break;
        case 'complete':
          serviceEntity.mediumPictureResource(z.assets.AssetRemoteData.v3(asset.key, true));
          break;
        default:
          break;
      }
    });
  }
};
