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

import {FC} from 'react';
import {t} from 'Util/LocalizerUtil';
import Icon from 'Components/Icon';
import {showSearchVisibilityModal} from '../team/TeamSearchVisibilitySetting';
import {FeatureList} from '@wireapp/api-client/src/team';

interface UserSearchInputInfoButtonProps {
  teamFeatures: FeatureList;
}

const UserSearchInputInfoButton: FC<UserSearchInputInfoButtonProps> = ({teamFeatures}) => {
  const openSearchVisibilityStatusModal = () => {
    showSearchVisibilityModal(teamFeatures);
  };
  return (
    <button
      onClick={openSearchVisibilityStatusModal}
      type="button"
      className="button-reset-default start-ui-header-user-info-button"
      aria-label={t('featureConfigSearchVisibilityHeadline')}
      data-uie-name="open-search-visibility-config-status"
    >
      <Icon.Info />
    </button>
  );
};

export default UserSearchInputInfoButton;
