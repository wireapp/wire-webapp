## Reflecting challenge conditions
> Giving yourself a timebox of 4-6 hours (at most), investigate how the webapp is currently handling replies and come up with a solution for how to implement threading given the current architecture. Some code examples or other visualization may be helpful to properly explain your thought process.

At first I explored 
1. https://github.com/wireapp/wire-webapp/issues
2. https://github.com/wireapp/wire-webapp/pulls

I checked `EventBuilder` https://github.com/wireapp/wire-webapp/blob/dev/src/script/conversation/EventBuilder.ts#L128 - It's quite clear, some common structure and some event type.

I tried to find some features requests related to **threads** or may be channels. I saw that repository exist from at least 2016 and was surprised that there were no requests about **threads**

I quickly figured out that `Conversation` is one of the backbone. It's a `Conversation` when it's 1:1 or in group, it's the same entity, just different `CONVERSATION_TYPE`. **Threads** also will be a new type of `Conversation`. slightly different but the same in common. 

To create a **Thread** we minimally need 3 things:
1. **Thread** technically will be a new `Conversation` with a new type.
2. We need a `quoted message` that contains a link to this **Thread**
3. **Thread** will contain a link to the quoted message

At the same moment when we are able to create quoted message we need to have an option to create a linked `Conversation` type **Thread**

## Code point of view

From technical point of view there is a need for at least
1. New menu item **Threads** in a sidebar menu
2. New `CONVERSATION_TYPE`
3. Represent those new type of conversations in `Conversations` list
4. create new action for creating this new type of `Conversation`
5. We need some alteration of a single message so it could be linked to a **Thread** 
6. This also will trigger some changes in backend and other files to provide an opportunity for this
7. Update some backend part to be ready to handle those new type of conversations
8. Update single `Conversation` view to be capable of representing new type of conversation
9. Update behaviour of `Message actions`
10. Update localisation

I put `TODO: ` comments in corresponding parts of the app




## Arised qustions

### User experience
1. will we keep current **reply** and add brand new **reply in a thread** or we will only replace old **reply** with a new **reply in thread** ?
2. Will we give an option to a user to change `ConversationDetails` for a `Conversation` with type `thread`, or we will inherit all the settings from a parent `Conversation`?
3. Is it possible to create a thread within another thread (nested thread)?
4. Is it possible to invite users in a thread if they are not invited to a parent `Conversation`
5. Is it possible to change notifications or other setting in a thread only or in a parent only? or changing some settings in a parent will trigger same change in setting of a thread conversation?

I think this questions are debatable and at this moment I don't have a strong opinion on that. 
Personally I would prefer keeping existing quotes functionality and add a brand new threads.

### Technical
From https://datatracker.ietf.org/doc/html/rfc9420#name-required-capabilities:

>At a minimum, all members of the group need to support the cipher suite and protocol version in use." - I think this is about backward compatibility between different versions of the product/APIs etc.

From https://datatracker.ietf.org/doc/html/rfc9420#name-reinitialization

>A group may be reinitialized by creating a new group with the same membership and different parameters, and linking it to the old group via a resumption PSK.

As we are introducing a new technical case **linked conversation**, we need to

1. Convey a way of handling `ConversationDetails`
2. Ensure that parent `Conversation` and **Thread** `Conversation` using compatible protocol/version

I started to explore dependencies and was amazed by "Architecture overview" from https://github.com/wireapp/wire-avs but after some exploring I have some open questions

1. If we need to reinitialize conversations - will we reinitialize all parent and child conversations at the same time?
2. Is it possible that parent and thread conversation support different "protocol/version"?

## Conclusion

1. As a complex feature it requires some debates / collaboration
2. Some technical parts are already nailed down such as new `CONVERSATION_TYPE` alterations and some other parts of the code
3. Some user experience questions needs to be decided such as: Can we invite a user into a **Thread** which is not invited in parent conversation? or: Is it possible to have nested thread? Answers to this question will influence feature implementation 
4. Some such as compatible protocol/version, reinitialization needs to be communicated with other departments or require more time for investigation


## Other thoughts 

1. I explored https://datatracker.ietf.org/doc/html/rfc9420#name-group-creation - I'm very much excited about MLS. Such an amazing structure, I'd happy working on being part of developing following such a high standards. 
2. https://wire.com/en/blog/admin-privilege-model-is-broken - When it comes to sensitive data I very much like and support "Zero trust" idea
3. I started to explore dependencies and was amazed by "Architecture overview" from https://github.com/wireapp/wire-avs

## Other ideas notes and improvement suggestion

1. Explored little bit a group creating thinking about channels creation which are also yet not implemented `src/script/components/Modals/GroupCreation/GroupCreationModal.tsx`
2. Add some useful information to the `Conversations` displaying for example some part of the last message
3. Split settings->options into **Appearance**, **Notifications** and **Sounds**
4. Move **Set a profile color** from a **Profile** to newly created **appearance** tab.
5. Give more deep settings in newly created **sounds** tab. Different sounds on different events, or customised sounds for example
6. Setup different notifications on different users/groups/1:1/threads, for example I want to snooze notification from users a,b,c but have notifications from users d,e,f
7. In `Notifications` `src/script/page/RightSidebar/Notifications/Notifications.tsx` setting give user more options for more granular settings
8. Add icons in `Context menu` (`src/script/ui/ContextMenu.tsx`)
9. Sometimes it was a bit not intuitive to figure out without reading articles https://support.wire.com/hc/en-us/articles/360002855557-Add-a-conversation-to-your-favourites-folder - I believe in a good interface everything should be clear without it.