import {App} from './replUI.js'
import { SnapshotContextProvider } from './contexts/stateSnapshotContext.js';
import { createRoot } from "@opentui/react"
import { createCliRenderer } from "@opentui/core"


const renderer = await createCliRenderer()
createRoot(renderer).render(
	<SnapshotContextProvider>
		<App />
	</SnapshotContextProvider>

);
