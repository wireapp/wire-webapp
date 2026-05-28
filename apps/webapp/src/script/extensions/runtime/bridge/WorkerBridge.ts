import {getLogger} from 'Util/logger';

import {BridgeMessage, RpcEvent, RpcResponse} from '../../types';
import {WorkerController} from '../WorkerController';
import {getHostSideBridge} from './HostSideBridge';
import {getCommandsApiHandler} from '../../api/CommandsApiHandler';

const log = getLogger('Extension/WorkerBridge');

/**
 * Sets up message routing between a Web Worker and the HostSideBridge.
 */
export class WorkerBridge {
    constructor(private readonly workerController: WorkerController) {
        this.attach();
    }

    private attach(): void {
        const bridge = getHostSideBridge();
        const extensionId = this.workerController.extensionId;

        bridge.registerWorkerController(extensionId, this.workerController);

        this.workerController.setMessageHandler((msg: BridgeMessage) => {
            if (msg.kind === 'request') {
                void bridge.process(
                    msg,
                    extensionId,
                    (response: RpcResponse) => {
                        this.workerController.sendToWorker(response);
                    },
                    (channel: string, payload: unknown) => {
                        const event: RpcEvent = {kind: 'event', channel, payload};
                        this.workerController.sendToWorker(event);
                    },
                );
            } else if (msg.kind === 'response') {
                getCommandsApiHandler().resolveWorkerResponse(msg as RpcResponse);
            } else if (msg.kind === 'event') {
                log.debug(`Worker event from ${extensionId}: ${msg.channel}`);
            }
        });
    }
}
