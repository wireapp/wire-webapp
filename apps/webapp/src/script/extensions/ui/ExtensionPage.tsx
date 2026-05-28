/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {useEffect, useRef} from 'react';

import {getExtensionHost} from '../runtime/ExtensionHost';
import {useExtensionRegistry} from '../registry/ExtensionRegistry';

interface ExtensionPageProps {
    extensionId: string;
    subPath: string;
}

export const ExtensionPage = ({extensionId, subPath}: ExtensionPageProps) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const ext = useExtensionRegistry(state => state.getExtension(extensionId));
    const host = getExtensionHost();

    useEffect(() => {
        if (!ext) return;
        host.activate(ext.manifest);
    }, [extensionId, ext]);

    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe) return;
        host.registerWebviewIframe(extensionId, iframe);
        return () => { host.unregisterWebviewIframe(extensionId); };
    }, [extensionId]);

    // When subPath changes, notify the iframe (after it's mounted)
    useEffect(() => {
        const iframe = iframeRef.current;
        if (!iframe?.contentWindow) return;
        iframe.contentWindow.postMessage(
            {kind: 'event', channel: 'router.navigate', payload: {path: subPath}},
            '*',
        );
    }, [subPath]);

    if (!ext) {
        return (
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9fa1a7'}}>
                Extension not found: {extensionId}
            </div>
        );
    }

    // manifest.webview.entry is relative to dist/ — build the full URL from the
    // extension's served base (sourceUrl, e.g. "/extensions/reports/").
    const webviewEntry = ext.manifest.webview?.entry ?? 'src/webview/index.html';
    const base = (ext.sourceUrl ?? `/extensions/${extensionId}/`).replace(/\/$/, '');
    const src = `${base}/dist/${webviewEntry}`;

    return (
        <iframe
            ref={iframeRef}
            src={src}
            sandbox="allow-scripts"
            style={{width: '100%', height: '100%', border: 'none', background: '#17181a'}}
            title={ext.manifest.name}
        />
    );
};
