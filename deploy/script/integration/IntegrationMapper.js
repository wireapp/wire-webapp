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

z.integration.IntegrationMapper = (() => {
  const _mapProviderFromObject = providerData => {
    return _updateProviderFromObject(providerData);
  };

  const _mapServicesFromArray = (servicesData = []) => {
    return servicesData
      .filter(serviceData => serviceData.enabled)
      .map(serviceData => _updateServiceFromObject(serviceData));
  };

  const _mapServiceFromObject = serviceData => {
    return _updateServiceFromObject(serviceData);
  };

  const _updateProviderFromObject = (providerData, providerEntity = new z.integration.ProviderEntity()) => {
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
  };

  const _updateServiceFromObject = (serviceData, serviceEntity = new z.integration.ServiceEntity()) => {
    if (serviceData) {
      const {assets, description, id, name, provider: providerId, summary, tags} = serviceData;

      if (id) {
        serviceEntity.id = id;
      }

      if (assets && assets.length) {
        const mappedAssets = z.assets.AssetMapper.mapProfileAssets(serviceEntity.id, assets);
        z.assets.AssetMapper.updateUserEntityAssets(serviceEntity, mappedAssets);
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

      if (summary) {
        serviceEntity.summary = summary;
      }

      if (tags) {
        serviceEntity.tags = tags;
      }
    }

    return serviceEntity;
  };

  return {
    mapProviderFromObject: _mapProviderFromObject,
    mapServiceFromObject: _mapServiceFromObject,
    mapServicesFromArray: _mapServicesFromArray,
  };
})();
