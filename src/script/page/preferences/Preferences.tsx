import React from 'react';
import {t} from 'Util/LocalizerUtil';

import {Runtime} from '@wireapp/commons';
import Icon from 'Components/Icon';
import {registerStaticReactComponent, useKoSubscribableChildren} from 'Util/ComponentUtil';
import {ListViewModel} from '../../view_model/ListViewModel';
import {ContentViewModel} from '../../view_model/ContentViewModel';
import {Transition} from 'react-transition-group';

type PreferencesProps = {
  contentViewModel: ContentViewModel;
  listViewModel: ListViewModel;
};

const PreferenceItem: React.FC<{IconComponent: React.FC; isSelected: boolean; label: string; onSelect: () => void}> = ({
  onSelect,
  isSelected,
  label,
  IconComponent,
}) => {
  return (
    <li className="left-list-item">
      <button
        className={`left-list-item-button ${isSelected && 'accent-text accent-fill'}`}
        onClick={onSelect}
        data-uie-name="go-account"
      >
        <span className="left-column-icon">
          <IconComponent />
        </span>
        <span className="center-column">{label}</span>
      </button>
    </li>
  );
};

const Preferences: React.FC<PreferencesProps> = ({listViewModel, contentViewModel}) => {
  const {state: listState} = useKoSubscribableChildren(listViewModel, ['state']);
  const {state: contentState} = useKoSubscribableChildren(contentViewModel, ['state']);

  const supportsCalling = true;
  const isDesktop = true || Runtime.isDesktopApp();

  const isVisible = listState === ListViewModel.STATE.PREFERENCES;
  const close = () => {
    listViewModel.switchList(ListViewModel.STATE.CONVERSATIONS);
  };

  const items = [
    {
      IconComponent: Icon.Profile,
      id: ContentViewModel.STATE.PREFERENCES_ACCOUNT,
      label: t('preferencesAccount'),
    },
    {
      IconComponent: Icon.Devices,
      id: ContentViewModel.STATE.PREFERENCES_DEVICES,
      label: t('preferencesDevices'),
    },
    {
      IconComponent: Icon.Options,
      id: ContentViewModel.STATE.PREFERENCES_OPTIONS,
      label: t('preferencesOptions'),
    },
    {
      IconComponent: Icon.Av,
      hidden: !supportsCalling,
      id: ContentViewModel.STATE.PREFERENCES_AV,
      label: t('preferencesAV'),
    },
    {
      IconComponent: Icon.About,
      hidden: !isDesktop,
      id: ContentViewModel.STATE.PREFERENCES_ABOUT,
      label: t('preferencesAbout'),
    },
  ];

  return (
    <Transition in={isVisible} timeout={300}>
      <div
        id="preferences"
        className={`left-list left-list-preferences ${isVisible && 'left-list-is-visible'}`}
        aria-hidden={isVisible ? 'false' : 'true'}
      >
        <div className="left-list-header">
          <span className="left-list-header-text">{t('preferencesHeadline')}</span>
          <button
            className="left-list-header-close-button button-icon-large icon-close"
            onClick={close}
            title={t('tooltipSearchClose')}
            data-uie-name="do-close-preferences"
          ></button>
        </div>
        <div className="left-list-center">
          <ul className="left-list-items preferences-list-items">
            {items
              .filter(item => !item.hidden)
              .map(item => (
                <PreferenceItem
                  key={item.id}
                  label={item.label}
                  onSelect={() => contentViewModel.switchContent(item.id)}
                  isSelected={contentState === item.id}
                  IconComponent={item.IconComponent}
                />
              ))}
          </ul>
        </div>
      </div>
    </Transition>
  );
};

export default Preferences;

registerStaticReactComponent('preferences', Preferences);
