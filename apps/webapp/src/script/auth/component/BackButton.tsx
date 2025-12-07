/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {useNavigate} from 'react-router';
import {t} from 'Util/LocalizerUtil';

import {ArrowIcon, COLOR} from '@wireapp/react-ui-kit';

export const BackButton = () => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      aria-label={t('createPersonalAccount.goBack')}
      data-uie-name="go-index"
      css={{background: 'none', border: 'none', cursor: 'pointer'}}
    >
      <ArrowIcon direction="left" aria-hidden="true" focusable="false" color={COLOR.TEXT} />
    </button>
  );
};
