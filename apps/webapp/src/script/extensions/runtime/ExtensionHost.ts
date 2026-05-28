import {getLogger} from 'Util/logger';

import {ExtensionManifest} from '../types';
import {WorkerController} from './WorkerController';
import {WorkerBridge} from './bridge/WorkerBridge';
import {getWebviewBridge} from './bridge/WebviewBridge';
import {useExtensionRegistry} from '../registry/ExtensionRegistry';
import {getCommandsApiHandler} from '../api/CommandsApiHandler';
import {getExtensionStorageManager} from '../storage/ExtensionStorageManager';

const log = getLogger('Extension/Host');

/**
 * Singleton that manages the lifecycle of all extension workers and webviews.
 */
export class ExtensionHost {
    private readonly workers = new Map<string, WorkerController>();

    activate(manifest: ExtensionManifest): void {
        const {id} = manifest;

        if (this.workers.has(id)) {
            log.debug(`Extension ${id} already active`);
            return;
        }

        if (!manifest.host) {
            log.debug(`Extension ${id} has no host worker`);
            return;
        }

        const basePath = useExtensionRegistry.getState().getExtension(id)?.sourceUrl ?? `/extensions/${id}/`;
        const controller = new WorkerController(manifest, basePath);
        this.workers.set(id, controller);
        controller.spawn();
        new WorkerBridge(controller);
        controller.activate();

        log.info(`Activated extension: ${id}`);
    }

    deactivate(extensionId: string): void {
        const controller = this.workers.get(extensionId);
        if (controller) {
            controller.terminate();
            this.workers.delete(extensionId);
            // Clear stale command registrations and reject any pending invocations
            getCommandsApiHandler().clearExtension(extensionId);
            // Cancel all live storage watches belonging to this extension
            getExtensionStorageManager().unwatchAll(extensionId);
            log.info(`Deactivated extension: ${extensionId}`);
        }
    }

    registerWebviewIframe(extensionId: string, iframe: HTMLIFrameElement): void {
        getWebviewBridge().registerIframe(extensionId, iframe);

        // Deliver the current sub-path to the newly mounted iframe
        const path = window.location.hash.replace('#', '') || '/';
        const match = path.match(/^\/plugins\/[^/]+(\/.*)?$/);
        const subPath = match?.[1] ?? '/';

        getWebviewBridge().sendToWebview(extensionId, {
            kind: 'event',
            channel: 'router.navigate',
            payload: {path: subPath},
        });
    }

    unregisterWebviewIframe(extensionId: string): void {
        getWebviewBridge().unregisterIframe(extensionId);
    }
}

let _instance: ExtensionHost | null = null;

export const getExtensionHost = (): ExtensionHost => {
    if (!_instance) _instance = new ExtensionHost();
    return _instance;
};
