import {VIEWPORT_CONFIGS} from './constants';
import {FixtureInstance} from './FixtureInstance';

export function App() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0c0c0c',
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        gap: 64,
      }}
    >
      <div>
        <h1 style={{color: '#fff', fontSize: 18, fontFamily: 'monospace', marginBottom: 4}}>
          Fluid Video Grid — Fixture
        </h1>
        <p style={{color: '#666', fontSize: 12, fontFamily: 'monospace'}}>
          Edit <code style={{color: '#aaa'}}>constants.ts</code> to tune layout parameters. HMR will update all instances.
        </p>
      </div>

      {VIEWPORT_CONFIGS.map(viewport => (
        <FixtureInstance
          key={viewport.label}
          viewport={viewport}
          initialCount={viewport.width >= 1280 ? 4 : 2}
        />
      ))}
    </div>
  );
}
