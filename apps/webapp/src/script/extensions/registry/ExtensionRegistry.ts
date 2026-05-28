import {create} from 'zustand';

import {
    ExtensionManifest,
    InstalledExtension,
    SidebarTabContribution,
    LinkProviderContribution,
    ConversationSettingContribution,
} from '../types';

interface ExtensionRegistryState {
    extensions: Map<string, InstalledExtension>;
    register: (
        manifest: ExtensionManifest,
        source: 'built-in' | 'url' | 'file',
        sourceUrl?: string,
    ) => void;
    setExtensionState: (id: string, state: InstalledExtension['state'], error?: string) => void;
    getTabContributions: () => SidebarTabContribution[];
    getLinkProviders: () => LinkProviderContribution[];
    getConversationSettings: () => ConversationSettingContribution[];
    getExtension: (id: string) => InstalledExtension | undefined;
    setEnabled: (id: string, enabled: boolean) => void;
}

export const useExtensionRegistry = create<ExtensionRegistryState>()((set, get) => ({
    extensions: new Map(),

    register(manifest, source, sourceUrl) {
        set(state => {
            const updated = new Map(state.extensions);
            updated.set(manifest.id, {
                manifest,
                state: 'loading',
                installedAt: new Date().toISOString(),
                source,
                sourceUrl,
                enabled: true,
            });
            return {extensions: updated};
        });
    },

    setExtensionState(id, extState, error) {
        set(state => {
            const updated = new Map(state.extensions);
            const existing = updated.get(id);
            if (existing) {
                updated.set(id, {...existing, state: extState, error});
            }
            return {extensions: updated};
        });
    },

    getTabContributions() {
        const tabs: SidebarTabContribution[] = [];
        for (const ext of get().extensions.values()) {
            if (!ext.enabled || ext.state === 'error' || ext.state === 'disabled') continue;
            for (const tab of ext.manifest.contributes?.sidebarTabs ?? []) {
                tabs.push(tab);
            }
        }
        return tabs;
    },

    getLinkProviders() {
        const providers: LinkProviderContribution[] = [];
        for (const ext of get().extensions.values()) {
            if (!ext.enabled) continue;
            for (const lp of ext.manifest.contributes?.linkProviders ?? []) {
                providers.push(lp);
            }
        }
        return providers.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    },

    getConversationSettings() {
        const settings: ConversationSettingContribution[] = [];
        for (const ext of get().extensions.values()) {
            if (!ext.enabled) continue;
            for (const cs of ext.manifest.contributes?.conversationSettings ?? []) {
                settings.push(cs);
            }
        }
        return settings;
    },

    getExtension(id) {
        return get().extensions.get(id);
    },

    setEnabled(id, enabled) {
        set(state => {
            const updated = new Map(state.extensions);
            const existing = updated.get(id);
            if (existing) {
                updated.set(id, {...existing, enabled});
            }
            return {extensions: updated};
        });
    },
}));
