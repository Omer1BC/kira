import type { RefObject } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { History, Tool, Message } from './messages.js';
import { MessageManager } from './MessageManager.js';
import { ToolManager } from './ToolManager.js';
import { GeminiModel } from './GeminiModel.js';
import type { Model } from './Model.js';

export class Agent {
	model: Model<unknown>
	toolManager: ToolManager
	messageManager: MessageManager

	constructor(setHistory: Dispatch<SetStateAction<History[]>>, historyRef: RefObject<History[]>) {
		this.model = new GeminiModel()
		this.toolManager = new ToolManager()
		this.messageManager = new MessageManager(setHistory, historyRef)
	}

	run(userInput: string): void {
		this.messageManager.processStream(this.createStream(userInput))
	}

	async *createStream(input: string): AsyncIterable<Tool | Message> {
		yield this.messageManager.userMessage(input)

		while (true) {
			const stream = this.model.fetchAsNormalizedStream(this.messageManager.historyRef)
			try {
				for await (const chunk of stream) {
					if ('type' in chunk) yield this.toolManager.enqueue(chunk)
					else yield chunk
				}
			} catch (error) {
				this.toolManager.clearQueue()
				yield this.messageManager.terminalMessage(error instanceof Error ? error.message : String(error))
				return
			}

			if (!this.toolManager.queueLength) break

			const approvalSignal = this.model.signal
			this.toolManager.abortOn(approvalSignal)

			for (const tool of this.toolManager.queued()) {
				yield* tool.execute()
			}

			this.toolManager.clearQueue()

			if (approvalSignal.aborted) break
		}
	}
}
