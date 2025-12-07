/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Button, ButtonVariant} from '@wireapp/react-ui-kit';

import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {
  bannerHeaderContainerCss,
  teamUpgradeAccountBannerContainerCss,
  teamUpgradeBannerButtonCss,
  teamUpgradeBannerHeaderCss,
} from './TeamCreation.styles';
import {useTeamCreationModal} from './useTeamCreationModal';

export const TeamCreationAccountHeader = () => {
  const {showModal} = useTeamCreationModal();

  return (
    <div css={teamUpgradeAccountBannerContainerCss}>
      <div css={{flex: '1'}}>
        <div css={bannerHeaderContainerCss}>
          <Icon.InfoIcon />
          <span className="heading-h4" css={teamUpgradeBannerHeaderCss}>
            {t('teamUpgradeBannerHeader')}
          </span>
        </div>
        <div className="subline">{t('teamUpgradeBannerContent')}</div>
      </div>
      <Button css={teamUpgradeBannerButtonCss} variant={ButtonVariant.SECONDARY} onClick={showModal}>
        {t('teamUpgradeBannerButtonText')}
      </Button>
    </div>
  );
};
