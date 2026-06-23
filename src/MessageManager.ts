
// claude --resume 76063420-199b-48a0-847d-81772430c59c
import type {Dispatch, SetStateAction, RefObject} from 'react';
import type { Message, Role, Tool, History } from './messages.js';
import { time, newId } from './metadata.js';

export class MessageManager{

	#setTools: Dispatch<SetStateAction<Tool[]>>;
	#setHistory: Dispatch<SetStateAction<History[]>>;
	#messageStore: Map<string,History>;
	historyRef: RefObject<History[]>;

	constructor(setTools: Dispatch<SetStateAction<Tool[]>>, setHistory : Dispatch<SetStateAction<History[]>>, historyRef: RefObject<History[]>) {
		this.#setTools = setTools;
		this.#setHistory = setHistory
		this.#messageStore = new Map<string,History>()
		this.historyRef = historyRef
	}

	// add seperate method for tools 
	// make this functional: returns updatees 
	updateHistory(chunk: Tool | Message) {
		if (chunk.role == 'tool' && chunk.status == 'pending') {
			this.#setTools(prev => [
				...prev,
				chunk
				]	
			)
		}
		else {
			this.#setHistory(() => {
				const updated = this._appendOrExtend(chunk)
				this.historyRef.current = updated
				return updated
			})
		}
	}


	_appendOrExtend(chunk: Tool | Message) {
		if (chunk.role !== 'tool' && this.#messageStore.has(chunk.id)) {
			return this._extend(chunk)
		}
		else {
			return this._append(chunk)
		}
	}

	_append(chunk:Tool | Message) {
		this.#messageStore.set(chunk.id, chunk)
		return [...this.#messageStore.values()]		
	}

	_extend(chunk: Message) {
		const target = this.#messageStore.get(chunk.id)!
		this.#messageStore.set(chunk.id,{...target,value: target.value + chunk.value})
		return [...this.#messageStore.values()]		
	}

	terminalMessage(error: string): Message {
		return {id: newId(), role: 'terminal', value: error, time: time()};
	}
	
	userMessage(input: string): Message {
		return {id: newId(), role: 'terminal', value: input, time: time()};
	}
}
