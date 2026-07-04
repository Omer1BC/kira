import { GoogleGenAI } from '@google/genai';
import type { RefObject } from 'react';
import type { Tool, ToolStub, Message, History } from './messages.js';
import { time, newId } from './metadata.js';
import { Model } from './Model.js';
import type { Content, Part, GenerateContentResponse } from '@google/genai';
import { definitions } from './Tools.js';

const MODEL =  "gemini-3.1-flash-lite"
export class GeminiModel extends Model<Content> {


	#client: GoogleGenAI;

	constructor() {
		super();
		this.#client = new GoogleGenAI({
			apiKey: process.env.GOOGLE_API_KEY ?? ""
		});


	}

	async *fetchAsNormalizedStream(historyRef: RefObject<History[]>): AsyncIterable<ToolStub | Message> {
		try {
			const stream =  await this.#client.models.generateContentStream({
				model: MODEL,
				contents: this.normalizeHistory(historyRef.current),
				config: {abortSignal: super.signal,
					tools:[{functionDeclarations: definitions}] 
				}

		 	})
			const respId = newId()
			for await (const chunk of stream ) {
				const fnParts = chunk.candidates?.[0]?.content?.parts?.filter(p => p.functionCall) ?? []
				if (fnParts.length)
					for (const part of fnParts) {
						yield this.getToolStub(newId(), part)
					}
				else if (chunk.text) {
					yield this._normalizeResponseChunk(respId,chunk)
				}
			}
		}
		catch (error) {
			throw error;
		}
	}

	_normalizeResponseChunk(id:string,chunk: GenerateContentResponse): Message {
		return {id,role: 'model',value: chunk.text!,time: time()}
	}

	getToolStub(id: string, part: Part): ToolStub {
		return { type: 'toolStub', id, time: time(), function: part.functionCall!.name!, args: part.functionCall!.args!, thoughtSignature: part.thoughtSignature }
	}

	normalizeHistory(history: History[]): Content[] {
		const filtered = this.filterHistory(history)
			.filter(elem => elem.role !== 'tool' || ['complete', 'rejected'].includes((elem as Tool).status))

		const result: Content[] = []
		let i = 0
		while (i < filtered.length) {
			const elem = filtered[i]!
			if (elem.role === 'tool') {
				const group: Tool[] = []
				while (i < filtered.length && filtered[i]!.role === 'tool') {
					group.push(filtered[i] as Tool)
					i++
				}
				result.push({ role: 'model', parts: group.map(t => ({ functionCall: { name: t.function, args: t.args }, ...(t.thoughtSignature !== undefined && { thoughtSignature: t.thoughtSignature }) })) })
				result.push({ role: 'user',  parts: group.map(t => ({ functionResponse: { name: t.function, response: { result: t.value } } })) })
			} else {
				result.push({ role: elem.role as 'user' | 'model', parts: [{ text: elem.value }] })
				i++
			}
		}
		return result
	}






	


}
