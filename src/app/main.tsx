import { createRoot } from 'react-dom/client';
import App from './App.tsx';
// @ts-ignore: side-effect import of CSS without type declarations
import './styles/index.css';

createRoot(
	document.getElementById( 'purecart-react-dashboard-root' )!
).render( <App /> );
