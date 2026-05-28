export const PluginNotFound = () => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '16px',
            color: '#9fa1a7',
        }}
    >
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div style={{fontSize: '1rem', color: '#dce0e3', fontWeight: 600}}>Extension not found</div>
        <div style={{fontSize: '0.85rem', textAlign: 'center', maxWidth: '300px'}}>
            This extension is not installed. Go to Settings → Extensions to install it.
        </div>
    </div>
);
