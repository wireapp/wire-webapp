/** Inline manifest types for use in the host infrastructure. These mirror @wire/extension-sdk. */

export interface ExtensionManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    icon: string;
    wireApiVersion: string;
    author?: string;
    host?: { entry: string; lifecycle: 'always-on' | 'active-only' | 'scheduled' };
    webview?: { entry: string };
    contributes?: {
        sidebarTabs?: SidebarTabContribution[];
        routes?: RouteContribution[];
        storage?: StorageContribution[];
        settings?: SettingsContribution;
        permissions?: string[];
        backgroundTasks?: BackgroundTaskContribution[];
        datasets?: DatasetContribution[];
        linkProviders?: LinkProviderContribution[];
        conversationSettings?: ConversationSettingContribution[];
        messageActions?: MessageActionContribution[];
    };
    consumes?: DatasetConsumption[];
}

export interface SidebarTabContribution {
    id: string;
    title: string;
    section: 'ai' | 'main';
    icon?: string;
    route: string;
}

export interface RouteContribution {
    path: string;
    view: string;
}

export interface StorageContribution {
    namespace: string;
    tables: string[];
    indexes?: Record<string, string>;
}

export interface SettingsContribution {
    schema: Record<string, unknown>;
    secrets?: string[];
}

export interface BackgroundTaskContribution {
    id: string;
    trigger: 'interval' | 'startup';
    intervalSeconds?: number;
}

export interface DatasetContribution {
    id: string;
    description: string;
    queryCommand: string;
}

export interface DatasetConsumption {
    from: string;
    dataset: string;
    optional?: boolean;
}

export interface LinkProviderContribution {
    id: string;
    patterns: Array<{ regex: string; captureGroup?: number }>;
    urlTemplate?: string;
    resolver?: string;
    hoverWebview?: string;
    style?: 'link' | 'pill' | 'badge';
    priority?: number;
}

export interface ConversationSettingContribution {
    id: string;
    type: 'toggle' | 'text' | 'select' | 'openPanel';
    label: string;
    storageKey?: string;
    default?: unknown;
    panel?: string;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
}

export interface MessageActionContribution {
    id: string;
    label: string;
    icon?: string;
    command: string;
    when?: string;
}

export interface InstalledExtension {
    manifest: ExtensionManifest;
    state: 'loading' | 'active' | 'error' | 'disabled';
    error?: string;
    installedAt: string;
    source: 'built-in' | 'url' | 'file';
    sourceUrl?: string;
    enabled: boolean;
}

export interface RpcRequest {
    kind: 'request';
    id: string;
    method: string;
    params: unknown;
}

export interface RpcResponse {
    kind: 'response';
    id: string;
    result?: unknown;
    error?: { code: string; message: string };
}

export interface RpcEvent {
    kind: 'event';
    channel: string;
    payload: unknown;
}

export type BridgeMessage = RpcRequest | RpcResponse | RpcEvent;
