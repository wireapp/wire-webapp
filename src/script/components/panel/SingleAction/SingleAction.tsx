/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Button, ButtonVariant, FlexBox} from '@wireapp/react-ui-kit';

import {t} from 'Util/LocalizerUtil';

export interface MenuItem {
  click: () => void;
  icon: string;
  identifier: string;
  label: string;
}

export interface SingleActionProps {
  item: MenuItem;
  onCancel: (action: any) => void;
}

const SingleAction = ({item, onCancel}: SingleActionProps) => {
  return (
    <FlexBox justify="space-evenly">
      <Button variant={ButtonVariant.SECONDARY} onClick={onCancel} data-uie-name="do-close">
        {t('modalConfirmSecondary')}
      </Button>
      <Button onClick={item.click} data-uie-name={item.identifier}>
        {item.label}
      </Button>
    </FlexBox>
  );
};

export {SingleAction};
