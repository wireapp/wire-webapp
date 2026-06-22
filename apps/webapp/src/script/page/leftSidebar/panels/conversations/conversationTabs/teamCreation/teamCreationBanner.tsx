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
import * as Icon from 'Components/icon';
import {EventName} from 'Repositories/tracking/eventName';
import {Segmentation} from 'Repositories/tracking/segmentation';
import {useApplicationContext} from 'src/script/page/rootProvider';

import {
  bannerHeaderContainerCss,
  bannerWrapperCss,
  iconButtonCss,
  teamUpgradeBannerButtonCss,
  teamUpgradeBannerContainerCss,
  teamUpgradeBannerContentCss,
  teamUpgradeBannerHeaderCss,
} from './teamCreation.styles';
import {useTeamCreationModal} from './useTeamCreationModal';

import {SidebarStatus, useSidebarStore} from '../../useSidebarStore';

const Banner = ({onClick}: {onClick: () => void}) => {
  const {translate} = useApplicationContext();

  return (
    <div css={teamUpgradeBannerContainerCss}>
      <div css={bannerHeaderContainerCss}>
        <Icon.InfoIcon />
        <span className="heading-h4" css={teamUpgradeBannerHeaderCss}>
          {translate('teamUpgradeBannerHeader')}
        </span>
      </div>
      <div className="subline" css={teamUpgradeBannerContentCss}>
        {translate('teamUpgradeBannerContent')}
      </div>
      <Button css={teamUpgradeBannerButtonCss} variant={ButtonVariant.SECONDARY} onClick={onClick}>
        {translate('teamUpgradeBannerButtonText')}
      </Button>
    </div>
  );
};

const PADDING_Y = 34;
const INITIAL_POSITION_X = 0;
const INITIAL_POSITION_Y = 0;

export const TeamCreationBanner = () => {
  const {showModal} = useTeamCreationModal();
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [position, setPosition] = useState<{positionX: number; positionY: number}>({
    positionX: INITIAL_POSITION_X,
    positionY: INITIAL_POSITION_Y,
  });
  const {status: sidebarStatus} = useSidebarStore();
  const openHandler = (event: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement>) => {
    setIsBannerVisible(true);
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({positionX: rect.x, positionY: rect.y});
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
          positionX={position.positionX}
          positionY={position.positionY + PADDING_Y}
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
