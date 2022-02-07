import {User} from 'src/script/entity/User';
import {createRandomUuid} from 'Util/util';
import ClassifiedBar from './ClassifiedBar';
import {render} from '@testing-library/react';

describe('ClassifiedBar', () => {
  const classifiedDomains = ['same.domain', 'classified.domain', 'other-classified.domain'];
  const sameDomainUser = new User(createRandomUuid(), 'same.domain');
  const classifiedDomainUser = new User(createRandomUuid(), 'classified.domain');
  const otherDomainUser = new User(createRandomUuid(), 'other.domain');

  it.each([[[sameDomainUser]], [[sameDomainUser, otherDomainUser]]])('is empty if no domains are given', users => {
    const {container} = render(ClassifiedBar({users}));

    expect(container.querySelector('[data-uie-name=classified-label]')).toBe(null);
  });

  it.each([[[sameDomainUser]], [[classifiedDomainUser]], [[sameDomainUser, classifiedDomainUser]]])(
    'returns classified if all users in the classified domains',
    users => {
      const {getByText, queryByText} = render(ClassifiedBar({classifiedDomains, users}));

      expect(getByText('conversationClassified')).not.toBe(null);
      expect(queryByText('conversationNotClassified')).toBe(null);
    },
  );

  it.each([
    [[sameDomainUser, otherDomainUser]],
    [[classifiedDomainUser, otherDomainUser]],
    [[sameDomainUser, classifiedDomainUser, otherDomainUser]],
  ])('returns non-classified if a single user is from another domain', users => {
    const {queryByText, getByText} = render(ClassifiedBar({classifiedDomains, users}));

    expect(queryByText('conversationClassified')).toBe(null);
    expect(getByText('conversationNotClassified')).not.toBe(null);
  });
});
