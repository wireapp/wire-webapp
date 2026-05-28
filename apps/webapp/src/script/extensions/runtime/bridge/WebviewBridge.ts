import {BridgeMessage, RpcEvent, RpcResponse} from '../../types';
import {getHostSideBridge} from './HostSideBridge';

/**
 * Sets up message routing between extension iframes and the HostSideBridge.
 *
 * All extension assets are served from the same origin as the webapp, so we
 * send postMessages with the specific app origin rather than '*' for defence-in-depth.
 */
export class WebviewBridge {
    private readonly appOrigin: string;
    private readonly activeIframes = new Map<string, HTMLIFrameElement>();

    constructor() {
        this.appOrigin = window.location.origin;
        window.addEventListener('message', this.handleMessage.bind(this));
    }

    registerIframe(extensionId: string, iframe: HTMLIFrameElement): void {
        this.activeIframes.set(extensionId, iframe);
    }

    unregisterIframe(extensionId: string): void {
        this.activeIframes.delete(extensionId);
    }

    sendToWebview(extensionId: string, msg: BridgeMessage): void {
        const iframe = this.activeIframes.get(extensionId);
        iframe?.contentWindow?.postMessage(msg, this.appOrigin);
    }

    private handleMessage(e: MessageEvent<BridgeMessage>): void {
        const msg = e.data;
        if (!msg || typeof msg !== 'object' || !('kind' in msg)) return;

        // Reject messages from unexpected origins
        if (e.origin !== this.appOrigin) return;

        // Identify which extension sent the message
        let extensionId: string | null = null;
        for (const [id, iframe] of this.activeIframes) {
            if (iframe.contentWindow === e.source) {
                extensionId = id;
                break;
            }
        }

        if (!extensionId) return;

        if (msg.kind === 'request') {
            const bridge = getHostSideBridge();
            void bridge.process(
                msg,
                extensionId,
                (response: RpcResponse) => {
                    this.sendToWebview(extensionId!, response);
                },
                (channel: string, payload: unknown) => {
                    const event: RpcEvent = {kind: 'event', channel, payload};
                    this.sendToWebview(extensionId!, event);
                },
            );
        } else if (msg.kind === 'event' && msg.channel === 'router.changed') {
            // Webview navigated internally — sync browser URL so the address bar reflects
            // the extension's sub-route and back/forward navigation works.
            const {path} = (msg.payload ?? {}) as {path?: string};
            if (path && extensionId) {
                const newHash = `#/plugins/${extensionId}${path}`;
                if (window.location.hash !== newHash) {
                    window.history.pushState(null, '', newHash);
                }
            }
        }
    }
}

let _instance: WebviewBridge | null = null;

export const getWebviewBridge = (): WebviewBridge => {
    if (!_instance) _instance = new WebviewBridge();
    return _instance;
};
