import type { Tool,Message } from './messages.js';

export class ToolManager {
	private controller;
	private queue : Tool[];

	constructor () {
		this.controller = new AbortController();
		this.queue = []
	}

	get signal(): AbortSignal {
		return this.controller.signal;
	}

	get queueLength(): number {
		return this.queue.length;
	}

	enqueue(chunk : Tool): void {
		this.queue.push(chunk)
	}

	// completes tools
	async *executeTools(): AsyncIterable<Tool> {

	}

	async *clearTools(): AsyncIterable<Tool> {}

	getToolRequest(_chunk: string): void {}


}
