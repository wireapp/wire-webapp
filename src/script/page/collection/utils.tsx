import {ContentMessage} from 'src/script/entity/message/ContentMessage';
import {MessageCategory} from '../../message/MessageCategory';

export type Category = 'images' | 'links' | 'files' | 'audio';

export const isOfCategory = (category: Category, message: ContentMessage) => {
  switch (category) {
    case 'images':
      return message.category & MessageCategory.IMAGE && !(message.category & MessageCategory.GIF);
    case 'links':
      return message.category & MessageCategory.LINK_PREVIEW;
    case 'audio':
      return message.category & MessageCategory.FILE && message.getFirstAsset()?.isAudio();
    case 'files':
      return (
        message.category & MessageCategory.FILE &&
        (message.getFirstAsset()?.isFile() || message.getFirstAsset()?.isVideo())
      );
    default:
      return false;
  }
};
