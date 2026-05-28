import {getLogger} from 'Util/logger';

import {RpcRequest, RpcResponse} from '../types';
import {WorkerController} from '../runtime/WorkerController';

const log = getLogger('Extension/CommandsApiHandler');

export class CommandsApiHandler {
    /**
     * Maps `${extensionId}:${commandId}` → the WorkerController for that extension.
     * Populated when a worker calls `commands.register`.
     */
    private registeredCommands = new Map<string, WorkerController>();

    /**
     * Pending host→worker invocations keyed by invokeId.
     * Tracks targetExtensionId so we can reject them on deactivation.
     */
    private pendingInvocations = new Map<
        string,
        {resolve: (value: unknown) => void; reject: (err: Error) => void; targetExtensionId: string}
    >();

    registerCommand(extensionId: string, commandId: string, workerController: WorkerController): void {
        const key = `${extensionId}:${commandId}`;
        this.registeredCommands.set(key, workerController);
        log.debug(`Registered command: ${key}`);
    }

    /**
     * Remove all commands registered by an extension and reject any pending invocations
     * targeting it. Called when an extension is deactivated.
     */
    clearExtension(extensionId: string): void {
        for (const key of [...this.registeredCommands.keys()]) {
            if (key.startsWith(`${extensionId}:`)) {
                this.registeredCommands.delete(key);
            }
        }
        for (const [invokeId, pending] of [...this.pendingInvocations.entries()]) {
            if (pending.targetExtensionId === extensionId) {
                this.pendingInvocations.delete(invokeId);
                pending.reject(new Error(`Extension ${extensionId} was deactivated`));
            }
        }
        log.debug(`Cleared commands for deactivated extension: ${extensionId}`);
    }

    async invoke(extensionId: string, commandId: string, params: unknown): Promise<unknown> {
        const key = `${extensionId}:${commandId}`;
        const controller = this.registeredCommands.get(key);

        if (!controller) {
            throw Object.assign(
                new Error(`Command not found: ${key}`),
                {code: 'NOT_FOUND'},
            );
        }

        const invokeId = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            this.pendingInvocations.set(invokeId, {resolve, reject, targetExtensionId: extensionId});

            controller.sendToWorker({
                kind: 'request',
                id: invokeId,
                method: 'commands.invoke',
                params: {commandId, params, invokeId},
            } satisfies RpcRequest);

            setTimeout(() => {
                if (this.pendingInvocations.has(invokeId)) {
                    this.pendingInvocations.delete(invokeId);
                    reject(new Error(`Command invocation timed out: ${key}`));
                }
            }, 30_000);
        });
    }

    resolveWorkerResponse(msg: RpcResponse): void {
        const pending = this.pendingInvocations.get(msg.id);
        if (!pending) return;
        this.pendingInvocations.delete(msg.id);
        if (msg.error) {
            pending.reject(Object.assign(new Error(msg.error.message), {code: msg.error.code}));
        } else {
            pending.resolve(msg.result);
        }
    }

    async handle(method: string, params: unknown): Promise<unknown> {
        if (method === 'commands.invoke') {
            const {extensionId, commandId, params: cmdParams} = params as {
                extensionId: string;
                commandId: string;
                params: unknown;
            };
            return this.invoke(extensionId, commandId, cmdParams);
        }
        throw Object.assign(new Error(`Not implemented: ${method}`), {code: 'NOT_IMPLEMENTED'});
    }
}

let _instance: CommandsApiHandler | null = null;
export const getCommandsApiHandler = (): CommandsApiHandler => {
    if (!_instance) _instance = new CommandsApiHandler();
    return _instance;
};
