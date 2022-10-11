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

import React, {useEffect} from 'react';

import {IconButton, IconButtonVariant, useMatchMedia} from '@wireapp/react-ui-kit';

import {initFadingScrollbar} from 'src/script/ui/fadingScrollbar';

import {useResponsiveViewState} from '../../../../ResponsiveViewState';

interface PreferencesPageProps {
  children: React.ReactNode;
  title: string;
}

const PreferencesPage: React.FC<PreferencesPageProps> = ({title, children}) => {
  const isScaledDown = useMatchMedia('max-width: 768px');
  const responsiveView = useResponsiveViewState(state => state.currentView);
  const setResponsiveView = useResponsiveViewState(state => state.setCurrentView);

  useEffect(() => {
    document.querySelector('#app')?.classList.add(`view-${responsiveView}`);
    return () => {
      document.querySelector('#app')?.classList.remove(`view-${responsiveView}`);
    };
  }, [responsiveView]);

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div className="preferences-titlebar">
        {isScaledDown && responsiveView !== 1 && (
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            className="conversation-title-bar-icon icon-back"
            css={{marginBottom: 0}}
            onClick={() => setResponsiveView(1)}
          />
        )}
        <h2 className="preferences-titlebar">{title}</h2>
      </div>
      <div className="preferences-content" ref={initFadingScrollbar}>
        {children}
      </div>
    </div>
  );
};

export default PreferencesPage;
