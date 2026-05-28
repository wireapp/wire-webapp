import {getLogger} from 'Util/logger';

import {BridgeMessage, RpcRequest, RpcResponse} from '../../types';
import {StorageApiHandler} from '../../api/StorageApiHandler';
import {ConversationsApiHandler} from '../../api/ConversationsApiHandler';
import {LlmApiHandler} from '../../api/LlmApiHandler';
import {HttpApiHandler} from '../../api/HttpApiHandler';
import {SettingsApiHandler} from '../../api/SettingsApiHandler';
import {NavigationApiHandler} from '../../api/NavigationApiHandler';
import {CommandsApiHandler, getCommandsApiHandler} from '../../api/CommandsApiHandler';
import {DatasetsApiHandler} from '../../api/DatasetsApiHandler';
import {checkPermission} from '../../permissions/PermissionGate';
import {useExtensionRegistry} from '../../registry/ExtensionRegistry';
import {getExtensionStorageManager} from '../../storage/ExtensionStorageManager';
import {WorkerController} from '../WorkerController';
import {getDb} from '../../getDb';

const log = getLogger('Extension/HostSideBridge');

/**
 * sendEvent callback type: pushes a push-event back to the caller (worker or iframe).
 */
type SendEventFn = (channel: string, payload: unknown) => void;

/**
 * All handler functions receive sendEvent so they can push live updates back.
 * This eliminates the need for storage.watch to be special-cased outside the map.
 */
type HandlerFn = (
    method: string,
    params: unknown,
    extId: string,
    sendEvent: SendEventFn,
) => Promise<unknown>;

/**
 * Main-thread message router. Receives RpcRequest messages from workers and iframes,
 * dispatches to the correct API handler, and sends back RpcResponse.
 */
export class HostSideBridge {
    private readonly commandsHandler: CommandsApiHandler;
    private readonly handlerMap = new Map<string, HandlerFn>();

    /** Map of extensionId → its WorkerController, for routing command registrations. */
    private readonly workerControllers = new Map<string, WorkerController>();

    constructor() {
        this.commandsHandler = getCommandsApiHandler();
        this.buildHandlerMap();
    }

    registerWorkerController(extensionId: string, controller: WorkerController): void {
        this.workerControllers.set(extensionId, controller);
    }

    private buildHandlerMap(): void {
        const db = getDb();
        const storageManager = getExtensionStorageManager();
        const conversationsHandler = new ConversationsApiHandler(db);
        const llmHandler = new LlmApiHandler();
        const navigationHandler = new NavigationApiHandler();

        this.handlerMap.set('storage', (method, params, extId, sendEvent) => {
            const h = new StorageApiHandler(storageManager, extId, sendEvent);
            return h.handle(method, params);
        });

        this.handlerMap.set('conversations', (method, params, extId, sendEvent) =>
            conversationsHandler.handle(method, params, extId, sendEvent),
        );
        this.handlerMap.set('events', (method, params, extId, sendEvent) =>
            conversationsHandler.handle(method, params, extId, sendEvent),
        );

        this.handlerMap.set('llm', async (method, params, extId) => {
            const settingsHandler = new SettingsApiHandler(storageManager, extId);
            const getSettings = async (): Promise<Record<string, unknown>> =>
                (await settingsHandler.handle('settings.getAll', {})) as Record<string, unknown>;
            return llmHandler.handle(method, params, extId, getSettings);
        });

        this.handlerMap.set('http', (method, params) => {
            const h = new HttpApiHandler();
            return h.handle(method, params);
        });

        this.handlerMap.set('settings', (method, params, extId) => {
            const h = new SettingsApiHandler(storageManager, extId);
            return h.handle(method, params);
        });

        this.handlerMap.set('navigation', (method, params) =>
            navigationHandler.handle(method, params),
        );

        this.handlerMap.set('commands', (method, params) =>
            this.commandsHandler.handle(method, params),
        );

        this.handlerMap.set('datasets', (method, params, extId, sendEvent) => {
            const h = new DatasetsApiHandler(extId, sendEvent);
            return h.handle(method, params);
        });
    }

    /**
     * Process a raw message from a worker or iframe.
     * @param msg         The incoming BridgeMessage
     * @param extensionId Which extension sent it
     * @param reply       Callback to send the RpcResponse back to the caller
     * @param sendEvent   Callback to push events back to the caller (for live watches)
     */
    async process(
        msg: BridgeMessage,
        extensionId: string,
        reply: (response: RpcResponse) => void,
        sendEvent: SendEventFn,
    ): Promise<void> {
        if (msg.kind !== 'request') return;

        const request = msg as RpcRequest;
        const {id, method, params} = request;

        try {
            const manifest = useExtensionRegistry.getState().getExtension(extensionId)?.manifest;

            if (method.startsWith('lifecycle.')) {
                reply({kind: 'response', id, result: null});
                return;
            }

            // Permission check runs before all method handling, including commands.register.
            checkPermission(manifest, method, params);

            // commands.register is handled here rather than in CommandsApiHandler.handle()
            // because it needs access to workerControllers, which lives on this class.
            if (method === 'commands.register') {
                const {commandId} = params as {commandId: string};
                const controller = this.workerControllers.get(extensionId);
                if (controller) {
                    this.commandsHandler.registerCommand(extensionId, commandId, controller);
                }
                reply({kind: 'response', id, result: null});
                return;
            }

            const prefix = method.split('.')[0];
            const handler = this.handlerMap.get(prefix);

            if (!handler) {
                reply({
                    kind: 'response',
                    id,
                    error: {code: 'NOT_IMPLEMENTED', message: `No handler for method: ${method}`},
                });
                return;
            }

            const result = await handler(method, params, extensionId, sendEvent);
            reply({kind: 'response', id, result});
        } catch (err: unknown) {
            const code = (err as {code?: string}).code ?? 'INTERNAL_ERROR';
            const message = err instanceof Error ? err.message : String(err);
            log.error(`Error handling ${method} for ${extensionId}:`, err);
            reply({kind: 'response', id, error: {code, message}});
        }
    }
}

let _instance: HostSideBridge | null = null;

export const getHostSideBridge = (): HostSideBridge => {
    if (!_instance) _instance = new HostSideBridge();
    return _instance;
};
