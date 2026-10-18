import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

const host = document.getElementById('root');
if (!host) throw new Error('no #root');

// No StrictMode: it double-invokes effects, which for imperative WebGL
// resources means creating and disposing every geometry twice on mount.
// The piece has one scene and explicit disposal; the churn buys nothing.
createRoot(host).render(<App />);
