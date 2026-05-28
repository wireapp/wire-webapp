import {container} from 'tsyringe';
import {liveQuery} from 'dexie';

import {ConversationState} from 'Repositories/conversation/ConversationState';
import {DexieDatabase} from 'Repositories/storage/dexieDatabase';

const INCLUDED_EVENT_TYPES = new Set([
    'conversation.message-add',
    'conversation.asset-add',
    'conversation.knock',
    'conversation.reaction',
    'conversation.delete-everywhere',
]);

const mapType = (koType: number): ConversationDto['type'] => {
    switch (koType) {
        case 1: return 'group';
        case 2: return 'oneOnOne';
        case 3: return 'connect';
        default: return 'self';
    }
};

type SendEventFn = (channel: string, payload: unknown) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ConvItem = any;

export class ConversationsApiHandler {
    private readonly conversationState: ConversationState;
    private readonly db: DexieDatabase;

    /** Live KO subscriptions keyed by watchId for conversations.watch. */
    private readonly conversationWatchers = new Map<string, {dispose: () => void}>();

    /** Live Dexie subscriptions keyed by watchId for events.watch. */
    private readonly eventWatchers = new Map<string, {unsubscribe: () => void}>();

    constructor(db: DexieDatabase) {
        this.conversationState = container.resolve(ConversationState);
        this.db = db;
    }

    async handle(method: string, params: unknown, _extId?: string, sendEvent?: SendEventFn): Promise<unknown> {
        switch (method) {
            case 'conversations.list': {
                const {filter} = params as {filter?: Record<string, unknown>};
                return this.listConversations(filter);
            }

            case 'conversations.get': {
                const {id} = params as {id: string};
                const conv = this.conversationState.findConversation({id, domain: ''});
                return conv ? this.toDto(conv) : null;
            }

            case 'conversations.watch': {
                const {watchId, filter} = params as {watchId: string; filter?: Record<string, unknown>};
                if (!sendEvent) throw Object.assign(new Error('watch requires sendEvent'), {code: 'INTERNAL_ERROR'});

                // Subscribe to KO observable changes on the conversation list
                const koSubscription = (this.conversationState.conversations as unknown as {subscribe: (fn: (v: ConvItem[]) => void) => {dispose: () => void}}).subscribe(
                    (newConvs: ConvItem[]) => {
                        const filtered = this.applyConvFilter(newConvs, filter);
                        sendEvent(`conversations:watch:${watchId}`, filtered.map((c: ConvItem) => this.toDto(c)));
                    },
                );
                this.conversationWatchers.set(watchId, {dispose: () => koSubscription.dispose()});

                // Return the current snapshot immediately
                return this.listConversations(filter);
            }

            case 'conversations.unwatch': {
                const {watchId} = params as {watchId: string};
                const watcher = this.conversationWatchers.get(watchId);
                if (watcher) {
                    watcher.dispose();
                    this.conversationWatchers.delete(watchId);
                }
                return null;
            }

            case 'events.list': {
                const {conversationId, filter = {}} = params as {
                    conversationId: string;
                    filter?: {types?: string[]; from?: number; to?: number; limit?: number};
                };
                let events = await this.db.events
                    .where('[conversation+time]')
                    .between([conversationId, filter.from ?? 0], [conversationId, filter.to ?? Infinity])
                    .toArray();

                if (filter.types && filter.types.length > 0) {
                    const allowedTypes = new Set(filter.types);
                    events = events.filter(e => allowedTypes.has(e.type));
                } else {
                    events = events.filter(e => INCLUDED_EVENT_TYPES.has(e.type));
                }

                if (filter.limit) events = events.slice(0, filter.limit);
                return events.map(e => this.eventToDto(e as Record<string, unknown>));
            }

            case 'events.watch': {
                const {watchId, conversationId, filter = {}} = params as {
                    watchId: string;
                    conversationId: string;
                    filter?: {types?: string[]};
                };
                if (!sendEvent) throw Object.assign(new Error('watch requires sendEvent'), {code: 'INTERNAL_ERROR'});

                const allowedTypes = filter.types?.length
                    ? new Set(filter.types)
                    : INCLUDED_EVENT_TYPES;

                const subscription = liveQuery(() =>
                    this.db.events
                        .where('[conversation+time]')
                        .between([conversationId, 0], [conversationId, Infinity])
                        .toArray(),
                ).subscribe(rows => {
                    const filtered = rows
                        .filter(e => allowedTypes.has(e.type))
                        .map(e => this.eventToDto(e as Record<string, unknown>));
                    sendEvent(`events:watch:${watchId}`, filtered);
                });

                this.eventWatchers.set(watchId, {unsubscribe: () => subscription.unsubscribe()});
                return null;
            }

            case 'events.unwatch': {
                const {watchId} = params as {watchId: string};
                const watcher = this.eventWatchers.get(watchId);
                if (watcher) {
                    watcher.unsubscribe();
                    this.eventWatchers.delete(watchId);
                }
                return null;
            }

            default:
                throw Object.assign(new Error(`Not implemented: ${method}`), {code: 'NOT_IMPLEMENTED'});
        }
    }

    private listConversations(filter?: Record<string, unknown>) {
        const convs = this.conversationState.conversations() as ConvItem[];
        return this.applyConvFilter(convs, filter).map((c: ConvItem) => this.toDto(c));
    }

    private applyConvFilter(convs: ConvItem[], filter?: Record<string, unknown>): ConvItem[] {
        let result = convs;
        if (filter?.type) {
            const typeMap: Record<string, string> = {oneOnOne: '2', group: '1', self: '0', connect: '3'};
            const typeCode = typeMap[filter.type as string];
            if (typeCode) result = result.filter((c: ConvItem) => String(c.type()) === typeCode);
        }
        if (filter?.archived !== undefined) {
            const archived = filter.archived as boolean;
            result = result.filter((c: ConvItem) => c.is_archived() === archived);
        }
        if (filter?.ids && Array.isArray(filter.ids)) {
            const ids = new Set(filter.ids as string[]);
            result = result.filter((c: ConvItem) => ids.has(c.id));
        }
        return result;
    }

    private toDto(conv: ConvItem): ConversationDto {
        return {
            id: conv.id,
            domain: conv.domain ?? null,
            name: conv.display_name() ?? null,
            type: mapType(conv.type() as unknown as number),
            protocol: (conv.protocol as string | undefined) === 'mls' ? 'mls' : 'proteus',
            teamId: conv.teamId ?? null,
            participantIds: (conv.participating_user_ids() as Array<{id: string; domain: string}> ?? []).map(
                uid => ({id: uid.id, domain: uid.domain ?? ''}),
            ),
            archived: conv.is_archived(),
            muted: conv.muted_state() !== 0,
            lastEventTimestamp: conv.last_event_timestamp() ?? 0,
        };
    }

    private eventToDto(event: Record<string, unknown>): EventDto {
        const data = (event.data as Record<string, unknown> | undefined) ?? {};
        return {
            id: event.id as string,
            conversationId: event.conversation as string,
            type: event.type as string,
            senderId: event.from as string,
            senderName: undefined,
            timestamp: typeof event.time === 'string'
                ? new Date(event.time).getTime()
                : (event.time as number ?? 0),
            text: data.content as string | undefined,
            assetName: data.info ? (data.info as Record<string, unknown>).name as string | undefined : undefined,
            assetMimeType: data.content_type as string | undefined,
        };
    }
}

export interface ConversationDto {
    id: string;
    domain: string | null;
    name: string | null;
    type: 'oneOnOne' | 'group' | 'self' | 'connect';
    protocol: 'proteus' | 'mls';
    teamId: string | null;
    participantIds: Array<{id: string; domain: string}>;
    archived: boolean;
    muted: boolean;
    lastEventTimestamp: number;
}

export interface EventDto {
    id: string;
    conversationId: string;
    type: string;
    senderId: string;
    senderName?: string;
    timestamp: number;
    text?: string;
    assetName?: string;
    assetMimeType?: string;
}
