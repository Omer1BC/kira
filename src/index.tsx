import {render} from 'ink';
import {App} from './ui.js'
import { SnapshotContextProvider } from './contexts/stateSnapshotContext.js';



render(
	<SnapshotContextProvider>
		<App />
	</SnapshotContextProvider>

);
