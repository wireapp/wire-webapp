import {getLogger} from 'Util/logger';

import {useExtensionRegistry} from '../registry/ExtensionRegistry';
import {BridgeMessage, ExtensionManifest} from '../types';

const log = getLogger('Extension/WorkerController');

export class WorkerController {
    private worker: Worker | null = null;
    private taskIntervals = new Map<string, ReturnType<typeof setInterval>>();
    readonly extensionId: string;
    private messageHandler: ((msg: BridgeMessage) => void) | null = null;

    /**
     * @param manifest - the extension manifest
     * @param basePath - served base URL of the extension (e.g. "/extensions/reports/"),
     *                   authoritative location from the registry; host.entry is relative to dist/
     */
    constructor(readonly manifest: ExtensionManifest, private readonly basePath: string) {
        this.extensionId = manifest.id;
    }

    spawn(): void {
        if (!this.manifest.host?.entry) return;

        const base = this.basePath.endsWith('/') ? this.basePath : `${this.basePath}/`;
        const workerUrl = `${base}dist/${this.manifest.host.entry}`;
        try {
            this.worker = new Worker(workerUrl, {type: 'module'});
            this.worker.addEventListener('message', (e: MessageEvent<BridgeMessage>) => {
                this.messageHandler?.(e.data);
            });
            this.worker.addEventListener('error', err => {
                log.error(`Worker error for ${this.extensionId}:`, err);
                this.handleCrash();
            });
            log.info(`Spawned worker for ${this.extensionId}`);
        } catch (err) {
            log.error(`Failed to spawn worker for ${this.extensionId}:`, err);
        }
    }

    setMessageHandler(handler: (msg: BridgeMessage) => void): void {
        this.messageHandler = handler;
    }

    sendToWorker(msg: BridgeMessage): void {
        this.worker?.postMessage(msg);
    }

    activate(): void {
        this.sendToWorker({
            kind: 'event',
            channel: 'lifecycle.activate',
            payload: {extensionId: this.extensionId},
        });
        this.scheduleBackgroundTasks();
    }

    private scheduleBackgroundTasks(): void {
        for (const task of this.manifest.contributes?.backgroundTasks ?? []) {
            if (task.trigger === 'startup') {
                // Run immediately after a short delay
                setTimeout(() => {
                    this.sendToWorker({
                        kind: 'event',
                        channel: 'backgroundTask.run',
                        payload: {taskId: task.id},
                    });
                }, 2000);
            } else if (task.trigger === 'interval' && task.intervalSeconds) {
                const interval = setInterval(() => {
                    this.sendToWorker({
                        kind: 'event',
                        channel: 'backgroundTask.run',
                        payload: {taskId: task.id},
                    });
                }, task.intervalSeconds * 1000);
                this.taskIntervals.set(task.id, interval);
            }
        }
    }

    private handleCrash(): void {
        for (const interval of this.taskIntervals.values()) {
            clearInterval(interval);
        }
        this.taskIntervals.clear();
        this.worker = null;
        useExtensionRegistry.getState().setExtensionState(this.extensionId, 'error', 'Worker crashed unexpectedly');
    }

    terminate(): void {
        for (const interval of this.taskIntervals.values()) {
            clearInterval(interval);
        }
        this.taskIntervals.clear();
        this.worker?.terminate();
        this.worker = null;
    }
}
