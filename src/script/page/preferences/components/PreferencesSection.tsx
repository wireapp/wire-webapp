/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

interface PreferencesSectionProps extends React.HTMLProps<HTMLDivElement> {
  className?: string;
  hasSeparator?: boolean;
  title?: string;
  uieName?: string;
}

const PreferencesSection: React.FC<PreferencesSectionProps> = ({
  title,
  className = '',
  uieName,
  hasSeparator,
  children,
}) => (
  <fieldset className={`preferences-section ${className}`} data-uie-name={uieName}>
    {hasSeparator && <hr className="preferences-separator" />}
    {title && <legend className="preferences-header">{title}</legend>}
    {children}
  </fieldset>
);

export default PreferencesSection;
