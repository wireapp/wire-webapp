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

interface ClassifiedBarProps {
  text?: string;
  highContrast?: boolean;
}

const barStyle = (highContrast: boolean): CSSObject => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  height: 32,
  fontSize: 16,
  fontWeight: 600,
  textTransform: 'uppercase',
  backgroundColor: `var(--${highContrast ? 'background' : 'app-bg-secondary'})`,
  color: `var(--${highContrast ? 'app-bg' : 'background'})`,
  borderColor: 'var(--foreground)',
  borderWidth: '1px 0',
  borderStyle: highContrast ? 'none' : 'solid',
});

const ClassifiedBar: React.FC<ClassifiedBarProps> = ({text, highContrast = false}) => {
  return text ? (
    <div data-uie-name="classified-label" css={barStyle(highContrast)}>
      {text}
    </div>
  ) : null;
};

export default ClassifiedBar;

registerReactComponent('classified-bar', {
  component: ClassifiedBar,
  template: '<div data-bind="react: {text: ko.unwrap(text), highContrast: ko.unwrap(highContrast)}"></div>',
});
