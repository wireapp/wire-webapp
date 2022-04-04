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
import {t} from 'Util/LocalizerUtil';
import type {ClientRepository} from '../../../client/ClientRepository';

interface LogoutSectionProps {
  clientRepository: ClientRepository;
}

const LogoutSection: React.FC<LogoutSectionProps> = ({clientRepository}) => (
  <section className="preferences-section">
    <button
      className="preferences-link accent-text"
      onClick={() => clientRepository.logoutClient()}
      data-uie-name="do-logout"
      type="button"
    >
      {t('preferencesAccountLogOut')}
    </button>
  </section>
);

export default LogoutSection;
