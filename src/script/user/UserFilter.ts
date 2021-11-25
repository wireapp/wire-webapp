import {QualifiedId} from '@wireapp/api-client/src/user';
import {matchQualifiedIds} from 'Util/QualifiedId';
import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

export class UserFilter {
  static isParticipant(conversationEntity: Conversation, userId: QualifiedId) {
    const index = conversationEntity
      .participating_user_ets()
      .findIndex((user: User) => matchQualifiedIds(userId, user));
    return index !== -1;
  }
}
