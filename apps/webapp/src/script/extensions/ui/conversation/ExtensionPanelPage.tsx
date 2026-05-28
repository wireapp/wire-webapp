interface ExtensionPanelPageProps {
    extensionId: string;
    panelUrl: string;
    conversationId: string;
    onClose: () => void;
    onGoBack: () => void;
}

export const ExtensionPanelPage = ({
    extensionId,
    panelUrl,
    conversationId,
    onClose,
}: ExtensionPanelPageProps) => {
    const src = `/extensions/${extensionId}/dist/${panelUrl}?conversationId=${encodeURIComponent(conversationId)}`;

    return (
        <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    padding: '8px 16px',
                    borderBottom: '1px solid #34373d',
                    flexShrink: 0,
                }}
            >
                <button
                    onClick={onClose}
                    style={{background: 'transparent', border: 'none', color: '#9fa1a7', cursor: 'pointer'}}
                    aria-label="Close panel"
                >
                    ✕
                </button>
            </div>
            <iframe
                src={src}
                sandbox="allow-scripts"
                style={{flex: 1, border: 'none', background: '#17181a'}}
                title={`Extension panel: ${extensionId}`}
            />
        </div>
    );
};
