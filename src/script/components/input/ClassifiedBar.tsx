/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {CSSObject} from '@emotion/react';
import cx from 'classnames';

import {Icon} from 'Components/Icon';
import {User} from 'src/script/entity/User';
import {t} from 'Util/LocalizerUtil';

function isClassified(users: User[], classifiedDomains: string[], conversationDomain?: string): boolean {
  // if a conversation is hosted on an unclassified domain it is not considered classified
  if (conversationDomain && !classifiedDomains.includes(conversationDomain)) {
    return false;
  }
  // if a conversation has any temporary guests then it is not considered classified
  if (users.some(user => !classifiedDomains.includes(user.domain) || user.isTemporaryGuest())) {
    return false;
  }
  return true;
}

interface ClassifiedBarProps {
  classifiedDomains?: string[];
  style?: CSSObject;
  users: User[];
  conversationDomain?: string;
}

const ClassifiedBar: React.FC<ClassifiedBarProps> = ({users, classifiedDomains, conversationDomain, style}) => {
  if (typeof classifiedDomains === 'undefined') {
    return null;
  }

  const classified = isClassified(users, classifiedDomains, conversationDomain);
  const text = classified ? t('conversationClassified') : t('conversationNotClassified');

  return (
    <div
      className={cx('classified-bar', {green: classified, red: !classified})}
      data-uie-name="classified-label"
      css={{...style}}
    >
      {classified ? <Icon.Check /> : <Icon.Info />}
      {text}
    </div>
  );
};

export {ClassifiedBar};
