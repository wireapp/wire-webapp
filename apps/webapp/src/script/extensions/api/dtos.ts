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
