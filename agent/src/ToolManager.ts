import type { Approval, ToolStub, Tool } from './messages.js';
import type { ExecutableTool } from './ExecutableTool.js';
import { toolRegistry } from './Tools.js';

export class ToolManager {
	#tools: Map<string, ExecutableTool>

	constructor() {
		this.#tools = new Map()
	}

	get queueLength(): number {
		return this.#tools.size;
	}

	enqueue(stub: ToolStub): Tool {
		const Ctor = toolRegistry.get(stub.function)!
		const tool = new Ctor(stub)
		this.#tools.set(tool.id, tool)
		return tool.snapshot('loaded')
	}

	clearQueue(): void {
		this.#tools.clear()
	}

	handleToolApproval(id: string, decision: Approval, reason?: string): void {
		this.#tools.get(id)?.decide(decision, reason)
	}

	abortOn(signal: AbortSignal): void {
		const abortAll = () => { for (const tool of this.#tools.values()) tool.abort() }
		if (signal.aborted) {
			abortAll()
			return
		}
		signal.addEventListener('abort', abortAll, {once: true})
	}

	queued(): ExecutableTool[] {
		return [...this.#tools.values()]
	}
}
