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
import {CSSObject} from '@emotion/core';
import {registerReactComponent} from 'Util/ComponentUtil';
import {User} from 'src/script/entity/User';

function isClassified(users: User[], classifiedDomains: string[]): boolean {
  if (users.some(user => !classifiedDomains.includes(user.domain))) {
    return false;
  }
  return true;
}

interface ClassifiedBarProps {
  classifiedDomains?: string[];
  users: User[];
}

const barStyle = (highContrast: boolean): CSSObject => ({
  alignItems: 'center',
  backgroundColor: `var(--${highContrast ? 'background' : 'app-bg-secondary'})`,
  borderColor: 'var(--foreground)',
  borderStyle: highContrast ? 'none' : 'solid',
  borderWidth: '1px 0',
  display: 'flex',
  color: `var(--${highContrast ? 'app-bg' : 'background'})`,
  fontSize: 16,
  fontWeight: 600,
  height: 32,
  justifyContent: 'center',
  textTransform: 'uppercase',
  width: '100%',
});

const ClassifiedBar: React.FC<ClassifiedBarProps> = ({users, classifiedDomains}) => {
  if (typeof classifiedDomains === 'undefined') {
    return undefined;
  }
  const classified = isClassified(users, classifiedDomains);
  const text = classified ? 'Security level: VS-NfD' : 'Security level: Not classified';
  const highContrast = classified;
  return (
    <div data-uie-name="classified-label" css={barStyle(highContrast)}>
      {text}
    </div>
  );
};

export default ClassifiedBar;

registerReactComponent('classified-bar', {
  component: ClassifiedBar,
  template: '<div data-bind="react: {users: ko.unwrap(users), classifiedDomains: ko.unwrap(classifiedDomains)}"></div>',
});
