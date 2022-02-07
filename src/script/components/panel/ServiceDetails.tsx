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

import React from 'react';

import type {ServiceEntity} from '../../integration/ServiceEntity';

import {registerReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import Avatar, {AVATAR_SIZE} from 'Components/Avatar';

export interface ServiceDetailsProps {
  service: ServiceEntity;
}

const ServiceDetails: React.FC<ServiceDetailsProps> = ({service}) => {
  const {providerName, name} = useKoSubscribableChildren(service, ['providerName', 'name']);
  return (
    <div className="panel-participant">
      <div className="panel-participant__name" data-uie-name="status-service-name">
        {name}
      </div>
      <div className="panel-participant__provider-name" data-uie-name="status-service-provider">
        {providerName}
      </div>
      <Avatar
        className="panel-participant__avatar"
        participant={service}
        avatarSize={AVATAR_SIZE.X_LARGE}
        data-uie-name="status-profile-picture"
      />
      <div className="panel-participant__service-description" data-uie-name="status-service-description">
        {service.description}
      </div>
    </div>
  );
};

export default ServiceDetails;

registerReactComponent('panel-service-details', {
  component: ServiceDetails,
  template: '<div data-bind="react: {service: ko.unwrap(service)}"></div>',
});
