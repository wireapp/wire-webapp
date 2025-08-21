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

import {useState} from 'react';

import {amplify} from 'amplify';

import {Button, ButtonVariant, IconButton} from '@wireapp/react-ui-kit';
import {WebAppEvents} from '@wireapp/webapp-events';

import {BannerPortal} from 'Components/BannerPortal/BannerPortal';
import * as Icon from 'Components/Icon';
import {EventName} from 'Repositories/tracking/EventName';
import {Segmentation} from 'Repositories/tracking/Segmentation';
import {t} from 'Util/LocalizerUtil';

import {
  bannerHeaderContainerCss,
  bannerWrapperCss,
  iconButtonCss,
  teamUpgradeBannerButtonCss,
  teamUpgradeBannerContainerCss,
  teamUpgradeBannerContentCss,
  teamUpgradeBannerHeaderCss,
} from './TeamCreation.styles';
import {useTeamCreationModal} from './useTeamCreationModal';

import {SidebarStatus, useSidebarStore} from '../../useSidebarStore';

const Banner = ({onClick}: {onClick: () => void}) => {
  return (
    <div css={teamUpgradeBannerContainerCss}>
      <div css={bannerHeaderContainerCss}>
        <Icon.InfoIcon />
        <span className="heading-h4" css={teamUpgradeBannerHeaderCss}>
          {t('teamUpgradeBannerHeader')}
        </span>
      </div>
      <div className="subline" css={teamUpgradeBannerContentCss}>
        {t('teamUpgradeBannerContent')}
      </div>
      <Button css={teamUpgradeBannerButtonCss} variant={ButtonVariant.SECONDARY} onClick={onClick}>
        {t('teamUpgradeBannerButtonText')}
      </Button>
    </div>
  );
};

const PADDING_Y = 34;

export const TeamCreationBanner = () => {
  const {showModal} = useTeamCreationModal();
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [position, setPosition] = useState<{x: number; y: number}>({x: 0, y: 0});
  const {status: sidebarStatus} = useSidebarStore();
  const openHandler = (event: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement>) => {
    setIsBannerVisible(true);
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({x: rect.x, y: rect.y});
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.UI.CLICKED.SETTINGS_MIGRATION);
  };

  const bannerBtnClickHandler = () => {
    setIsBannerVisible(false);
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.UI.CLICKED.PERSONAL_MIGRATION_CTA, {
      step: Segmentation.TEAM_CREATION_STEP.CLICKED_CREATE_TEAM,
    });
    showModal();
  };

  const portalCloseHandler = () => {
    setIsBannerVisible(false);
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.UI.CLICKED.PERSONAL_MIGRATION_CTA, {
      step: Segmentation.TEAM_CREATION_STEP.CLICKED_DISMISS_CTA,
    });
  };

  if (sidebarStatus === SidebarStatus.OPEN) {
    return <Banner onClick={bannerBtnClickHandler} />;
  }

  return (
    <>
      <IconButton css={iconButtonCss} onClick={openHandler} onMouseOver={openHandler}>
        <Icon.InfoIcon />
      </IconButton>
      {isBannerVisible && (
        <BannerPortal
          // Position + padding
          positionX={position.x}
          positionY={position.y + PADDING_Y}
          onClose={portalCloseHandler}
        >
          <div css={bannerWrapperCss}>
            <Banner onClick={bannerBtnClickHandler} />
          </div>
        </BannerPortal>
      )}
    </>
  );
};
