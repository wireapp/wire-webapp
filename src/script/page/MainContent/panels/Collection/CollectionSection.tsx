import React from 'react';
import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {t} from 'Util/LocalizerUtil';
import CollectionItem from './CollectionItem';

const CollectionSection: React.FC<{
  children: React.ReactNode;
  label: string;
  limit: number;
  messages: ContentMessage[];
  onSelect: () => void;
  uieName: string;
}> = ({messages, limit, uieName, onSelect, children, label}) => {
  if (messages.length === 0) {
    return null;
  }
  const hasExtra = true || messages.length > limit;
  const topMessages = messages.slice(0, limit);

  return (
    <section className="collection-section" data-uie-collection-size={messages.length} data-uie-name={uieName}>
      <header>
        {children}
        <span className="label-bold-xs">{label}</span>
        {hasExtra && (
          <button className="collection-header-all accent-text" onClick={() => onSelect()}>
            <span data-uie-name="collection-show-all">{t('collectionShowAll', messages.length)}</span>
            &nbsp;<span className="icon-forward font-size-xxs"></span>
          </button>
        )}
      </header>
      <div className="collection-images">
        {topMessages.map(message => (
          <CollectionItem message={message} allMessages={[]} key={message.id} />
        ))}
      </div>
    </section>
  );
};

export default CollectionSection;
