import {Conversation} from '../entity/Conversation';
import {User} from '../entity/User';

export class UserFilter {
  static isParticipant(conversationEntity: Conversation, userId: string, domain: string | null) {
    const index = conversationEntity.participating_user_ets().findIndex((user: User) => {
      const matchesDomain = domain ? user.domain == domain : true;
      const matchesId = user.id === userId;
      return matchesDomain && matchesId;
    });
    return index !== -1;
  }
}
