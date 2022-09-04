import {ListViewModel} from '../../../../view_model/ListViewModel';
import LeftSidebar from '../../../../page/LeftSidebar';
import {t} from 'Util/LocalizerUtil';
import {User} from '../../../../entity/User';
import cx from 'classnames';

export const LeftColumn: React.FC<{listViewModel: ListViewModel; selfUser: User}> = ({listViewModel, selfUser}) => {
  return (
    <div
      data-bind="with: list"
      className={cx('left-column', {'left-column--light-theme': !selfUser.isTemporaryGuest()})}
    >
      <header>
        <h1 className="visually-hidden">{t('accessibility.headings.sidebar')}</h1>
      </header>
      <LeftSidebar listViewModel={listViewModel} selfUser={selfUser} />
    </div>
  );
};
