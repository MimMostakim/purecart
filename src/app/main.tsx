import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { AppRouter } from './router';
import App from './App';
// @ts-ignore: side-effect import of CSS without type declarations
import './styles/index.css';

createRoot(
	document.getElementById( 'purecart-react-dashboard-root' )!
).render(
	<Provider store={ store }>
		<AppRouter>
			<App />
		</AppRouter>
	</Provider>
);
