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
import {registerReactComponent} from 'Util/ComponentUtil';
import {User} from 'src/script/entity/User';
import {t} from 'Util/LocalizerUtil';

function isClassified(users: User[], classifiedDomains: string[]): boolean {
  if (users.some(user => !classifiedDomains.includes(user.domain))) {
    return false;
  }
  return true;
}

interface ClassifiedBarProps {
  classifiedDomains?: string[];
  style?: CSSObject;
  users: User[];
}

const barStyle = (highContrast: boolean): CSSObject => ({
  alignItems: 'center',
  backgroundColor: `var(--${highContrast ? 'background' : 'app-bg-secondary'})`,
  borderColor: 'var(--foreground-fade-40)',
  borderStyle: highContrast ? 'none' : 'solid',
  borderWidth: '1px 0',
  color: `var(--${highContrast ? 'app-bg' : 'background'})`,
  display: 'flex',
  fontSize: 11,
  fontWeight: 600,
  height: '16px',
  justifyContent: 'center',
  textTransform: 'uppercase',
  width: '100%',
});

const ClassifiedBar: React.FC<ClassifiedBarProps> = ({users, classifiedDomains, style}) => {
  if (typeof classifiedDomains === 'undefined') {
    return null;
  }
  const classified = isClassified(users, classifiedDomains);
  const text = classified ? t('conversationClassified') : t('conversationNotClassified');
  const highContrast = !classified;
  return (
    <div data-uie-name="classified-label" css={{...barStyle(highContrast), ...style}}>
      {text}
    </div>
  );
};

export default ClassifiedBar;

registerReactComponent('classified-bar', {
  component: ClassifiedBar,
  template: '<div data-bind="react: {users: ko.unwrap(users), classifiedDomains: ko.unwrap(classifiedDomains)}"></div>',
});
