import {css} from '@emotion/react';

export const performancePanelContainerStyles = css({
  position: 'fixed',
  top: 16,
  left: 16,
  zIndex: 9999,
});

export const performancePanelStyles = css({
  background: '#fff',
  borderRadius: 12,
  padding: 16,
  minWidth: 220,
  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
});

export const performancePanelButtonStyles = css({
  marginBottom: 8,
});

export const performancePanelSelectStyles = css({
  width: '100%',
  marginBottom: 12,
});

export const buttonBaseStyles = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',

  height: 40,
  padding: '0 16px',

  borderRadius: 9999, // pill shape
  border: 'none',

  fontSize: 14,
  fontWeight: 500,

  cursor: 'pointer',
  transition: 'all 0.15s ease',

  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
});

export const buttonNeutralStyles = css({
  background: '#fff',
  color: '#000',

  '&:hover': {
    background: '#f2f2f2',
  },
});

export const buttonPrimaryStyles = css({
  background: '#111',
  color: '#fff',

  '&:hover': {
    background: '#000',
  },
});

export const buttonDangerStyles = css({
  background: '#e53935',
  color: '#fff',

  '&:hover': {
    background: '#c62828',
  },
});

export const buttonIconOnlyStyles = css({
  width: 40,
  padding: 0,
});

export const buttonRowStyles = css({
  display: 'flex',
  gap: 8, // Abstand zwischen Buttons
  marginTop: 12,
});

export const metricsListStyles = css({
  marginTop: 12,
  padding: 12,
  background: '#f7f7f7',
  borderRadius: 8,
  fontSize: 12,
});

export const metricsRowStyles = css({
  display: 'flex',
  justifyContent: 'space-between',
  marginBottom: 4,
});

export const metricsLabelStyles = css({
  color: '#666',
});

export const metricsValueStyles = css({
  fontWeight: 500,
});
