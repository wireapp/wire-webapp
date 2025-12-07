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

import React from 'react';

export interface MenuItem {
  click: () => void;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
  identifier: string;
  label: string;
}

interface PanelActionsProps {
  items: MenuItem[];
}

export const PanelActions = ({items}: PanelActionsProps) =>
  items.map(({click, identifier, Icon, label}) => (
    <li key={identifier}>
      <button className="panel__action-item" onClick={click} data-uie-name={identifier} type="button">
        <span className="panel__action-item__icon">
          <Icon />
        </span>

        <span data-uie-name={`${identifier}-item-text`} className="panel__action-item__text">
          {label}
        </span>
      </button>
    </li>
  ));
