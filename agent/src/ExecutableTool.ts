import type { Tool, Approval, ToolStub, Status } from './messages.js';
import type { FunctionDeclaration } from '@google/genai';

export interface ToolClass {
	new (stub: ToolStub): ExecutableTool
	readonly definition: FunctionDeclaration
}

export abstract class ExecutableTool {
	protected readonly stub: ToolStub
	protected value = ''
	#decision = Promise.withResolvers<{decision: Approval, reason: string}>()
	#controller = new AbortController()

	constructor(stub: ToolStub) {
		this.stub = stub
	}

	get id(): string {
		return this.stub.id
	}

	decide(decision: Approval, reason = 'user rejected this tool call'): void {
		this.#decision.resolve({decision, reason})
	}

	abort(): void {
		this.#decision.resolve({decision: 'reject', reason: 'aborted before the tool could run'})
		this.#controller.abort()
	}

	snapshot(status: Status): Tool {
		return {
			id: this.stub.id,
			role: 'tool',
			status,
			function: this.stub.function,
			time: this.stub.time,
			args: this.stub.args,
			thoughtSignature: this.stub.thoughtSignature,
			controller: this.#controller,
			value: this.value,
		}
	}

	async *execute(): AsyncGenerator<Tool> {
		yield* this.preDecision()

		const {decision, reason} = await this.#decision.promise
		if (decision === 'reject') {
			this.value = reason
			yield this.snapshot('rejected')
			return
		}
		yield this.snapshot('pending')

		yield* this.run()
		yield this.snapshot('complete')
	}

	protected abstract call(args: Record<string, unknown>, signal: AbortSignal): Promise<string>

	protected async *preDecision(): AsyncGenerator<Tool> {}

	protected async *run(): AsyncGenerator<Tool> {
		try {
			this.value = await this.call(this.stub.args, this.#controller.signal)
		} catch (error) {
			this.value = error instanceof Error ? error.message : String(error)
		}
	}
}
