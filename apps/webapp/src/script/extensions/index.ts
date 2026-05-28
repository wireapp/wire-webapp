import {getLogger} from 'Util/logger';

import {BUILT_IN_EXTENSIONS} from './registry/BuiltInExtensions';
import {validateManifest} from './registry/ManifestValidator';
import {useExtensionRegistry} from './registry/ExtensionRegistry';
import {getExtensionHost} from './runtime/ExtensionHost';
import {registerLinkProviders} from './contributions/LinkProviderRegistry';
import {registerConversationSettings} from './contributions/ConversationSettingsRegistry';
const log = getLogger('Extensions/Bootstrap');

export const bootstrapExtensions = async (): Promise<void> => {
    const host = getExtensionHost();
    const registry = useExtensionRegistry.getState();

    for (const {id, basePath} of BUILT_IN_EXTENSIONS) {
        try {
            const response = await fetch(`${basePath}plugin.json`);
            if (!response.ok) {
                log.warn(`Failed to load manifest for ${id}: ${response.status}`);
                continue;
            }
            const raw = await response.json() as unknown;
            const {valid, errors, manifest} = validateManifest(raw);

            if (!valid || !manifest) {
                log.error(`Invalid manifest for ${id}:`, errors);
                continue;
            }

            registry.register(manifest, 'built-in', basePath);

            // Register contributions before activating worker
            if (manifest.contributes?.linkProviders) {
                registerLinkProviders(manifest.contributes.linkProviders);
            }
            if (manifest.contributes?.conversationSettings) {
                registerConversationSettings(id, manifest.contributes.conversationSettings);
            }

            // Activate always-on workers immediately
            if (manifest.host?.lifecycle === 'always-on') {
                host.activate(manifest);
            }

            registry.setExtensionState(id, 'active');
            log.info(`Extension bootstrapped: ${id}`);
        } catch (err) {
            log.error(`Error bootstrapping extension ${id}:`, err);
            registry.setExtensionState(id, 'error', err instanceof Error ? err.message : String(err));
        }
    }
};
