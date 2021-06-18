/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import React, {Fragment} from 'react';

import {registerReactComponent} from 'Util/ComponentUtil';
import Icon from '../Icon';

export interface MenuItem {
  click: () => void;
  icon: string;
  identifier: string;
  label: string;
}

export interface PanelActionsProps {
  items?: MenuItem[];
}

const PanelActions: React.FC<PanelActionsProps> = ({items}) => {
  return (
    <Fragment>
      {items.map(({click, identifier, icon, label}) => (
        <div className="panel__action-item" key={identifier} onClick={click} data-uie-name={identifier}>
          <div className="panel__action-item__icon">
            <Icon name={icon} />
          </div>
          <div data-uie-name={`${identifier}-item-text`} className="panel__action-item__text">
            {label}
          </div>
        </div>
      ))}
    </Fragment>
  );
};

export default PanelActions;

registerReactComponent('panel-actions', {
  component: PanelActions,
  template: '<div class="panel-actions" data-bind="react: {items: ko.unwrap(items)}"></div>',
});
