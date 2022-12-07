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

import {useContext, FC} from 'react';

import {IconButton, IconButtonVariant, useMatchMedia} from '@wireapp/react-ui-kit';

import {FadingScrollbar} from 'Components/FadingScrollbar';
import {RootContext} from 'src/script/page/RootProvider';
import {useAppMainState, ViewType} from 'src/script/page/state';

interface PreferencesPageProps {
  children: React.ReactNode;
  title: string;
}

const PreferencesPage: FC<PreferencesPageProps> = ({title, children}) => {
  // To be changed when design chooses a breakpoint, the conditional can be integrated to the ui-kit directly
  const smBreakpoint = useMatchMedia('max-width: 640px');

  const {currentView, setCurrentView} = useAppMainState(state => state.responsiveView);
  const isCentralColumn = currentView == ViewType.CENTRAL_COLUMN;

  const root = useContext(RootContext);

  const goHome = () => root?.content.loadPreviousContent();

  return (
    <div role="tabpanel" aria-labelledby={title} style={{display: 'flex', flexDirection: 'column', height: '100vh'}}>
      <div className="preferences-titlebar">
        {smBreakpoint && isCentralColumn && (
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            className="conversation-title-bar-icon icon-back"
            css={{marginBottom: 0}}
            onClick={() => setCurrentView(ViewType.LEFT_SIDEBAR)}
          />
        )}
        <h2 className="preferences-titlebar">{title}</h2>
        {smBreakpoint && isCentralColumn && (
          <IconButton
            variant={IconButtonVariant.SECONDARY}
            className="conversation-title-bar-icon icon-close"
            css={{marginBottom: 0}}
            onClick={goHome}
          />
        )}
      </div>
      <FadingScrollbar className="preferences-content">{children}</FadingScrollbar>
    </div>
  );
};

export {PreferencesPage};
