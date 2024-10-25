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

import {CSSObject} from '@emotion/react';

import {Button, ButtonVariant, IconButton} from '@wireapp/react-ui-kit';

import {BannerPortal} from 'Components/BannerPortal/BannerPortal';
import * as Icon from 'Components/Icon';
import {t} from 'Util/LocalizerUtil';

import {useSidebarStore} from '../useSidebarStore';

const Banner = () => {
  return (
    <div css={teamUpgradeBannerContainerCss}>
      <Icon.InfoIcon />
      <span css={teamUpgradeBannerHeaderCss}>{t('teamUpgradeBannerHeader')}</span>
      <div css={teamUpgradeBannerContentCss}>{t('teamUpgradeBannerContent')}</div>
      <Button css={teamUpgradeBannerButtonCss} variant={ButtonVariant.SECONDARY}>
        {t('teamUpgradeBannerButtonText')}
      </Button>
    </div>
  );
};

export const TeamUpgradeBanner = () => {
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

const teamUpgradeBannerContainerCss: CSSObject = {
  border: '1px solid var(--accent-color-500)',
  padding: '0.5rem',
  background: 'var(--accent-color-50)',
  borderRadius: '0.5rem',
  maxWidth: '13rem',
  minWidth: '12.5rem',
};

const teamUpgradeBannerHeaderCss: CSSObject = {
  fontSize: '.75rem',
  lineHeight: '.875rem',
  fontWeight: 'bold',
  marginLeft: '0.5rem',
  verticalAlign: 'text-top',
};

const teamUpgradeBannerContentCss: CSSObject = {
  fontSize: '.75rem',
  lineHeight: '.875rem',
  marginBottom: '0.5rem',
};

const teamUpgradeBannerButtonCss: CSSObject = {
  margin: 0,
  height: '2.1rem',
  fontSize: '0.875rem',
  padding: '0.25rem 0.5rem',
  borderRadius: '12px',
};

const iconButtonCss: CSSObject = {
  width: '2rem',
  marginBottom: '0.5rem',
};
