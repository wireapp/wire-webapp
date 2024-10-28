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

import {Button, ButtonVariant, IconButton} from '@wireapp/react-ui-kit';

import {BannerPortal} from 'Components/BannerPortal/BannerPortal';
import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {
  iconButtonCss,
  teamUpgradeBannerButtonCss,
  teamUpgradeBannerContainerCss,
  teamUpgradeBannerContentCss,
  teamUpgradeBannerHeaderCss,
} from './TeamCreation.styles';

import {useSidebarStore} from '../../useSidebarStore';

const Banner = () => {
  return (
    <div css={teamUpgradeBannerContainerCss}>
      <Icon.InfoIcon />
      <span className="heading-h4" css={teamUpgradeBannerHeaderCss}>
        {t('teamUpgradeBannerHeader')}
      </span>
      <div className="subline" css={teamUpgradeBannerContentCss}>
        {t('teamUpgradeBannerContent')}
      </div>
      <Button css={teamUpgradeBannerButtonCss} variant={ButtonVariant.SECONDARY}>
        {t('teamUpgradeBannerButtonText')}
      </Button>
    </div>
  );
};

export const TeamCreationBanner = () => {
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [position, setPosition] = useState<{x?: number; y?: number}>({});
  const {status: sidebarStatus} = useSidebarStore();
  const clickHandler = (event: React.MouseEvent<HTMLButtonElement>) => {
    setIsBannerVisible(true);
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({x: rect.x, y: rect.y});
  };

  if (sidebarStatus === 'OPEN') {
    return <Banner />;
  }

  return (
    <>
      <IconButton css={iconButtonCss} onClick={clickHandler}>
        <Icon.InfoIcon />
      </IconButton>
      {isBannerVisible && (
        <BannerPortal
          // Position + padding
          positionX={(position.x || 0) + 40}
          positionY={(position.y || 0) + 34}
          onClose={() => setIsBannerVisible(false)}
        >
          <Banner />
        </BannerPortal>
      )}
    </>
  );
};
