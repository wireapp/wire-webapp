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

window.z = window.z || {};
window.z.integration = z.integration || {};

z.integration.ServiceEntity = class ServiceEntity {
  constructor(serviceData = {}) {
    const {description, id, name, provider: providerId, summary, tags} = serviceData;

    this.id = id || '';

    this.description = description || '';
    this.name = name || '';
    this.providerId = providerId || '';
    this.providerName = ko.observable(' ');
    this.summary = summary || '';
    this.tags = tags || [];

    this.mediumPictureResource = ko.observable();
    this.previewPictureResource = ko.observable();
  }
};
