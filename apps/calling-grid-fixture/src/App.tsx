import {FixtureInstance} from './FixtureInstance';

export function App() {
  return (
    <div style={{height: '100%', display: 'flex', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'}}>
      <FixtureInstance initialCount={4} />
    </div>
  );
}
