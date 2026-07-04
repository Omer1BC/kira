import type { FunctionDeclaration } from '@google/genai';
import { exec } from 'child_process';
import { promisify } from 'util';

import { readFile, writeFile, stat } from 'fs/promises'
import { resolve } from 'path'

import { ExecutableTool } from './ExecutableTool.js';
import type { ToolClass } from './ExecutableTool.js';
import type { Tool } from './messages.js';

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport';
class RollDiceTool extends ExecutableTool {
	static readonly definition: FunctionDeclaration = {
		name: 'roll_dice',
		description: 'Rolls a dice with the given number of sides and returns the result',
		parametersJsonSchema: {
			type: 'object',
			properties: {
				sides: { type: 'number', description: 'Number of sides on the dice' }
			},
			required: ['sides']
		}
	}

	protected async call(args: Record<string, unknown>): Promise<string> {
		const sides = args.sides as number
		const result = Math.floor(Math.random() * sides) + 1
		return `Rolled a ${sides}-sided dice: ${result}`
	}
}

class WordCountTool extends ExecutableTool {
	static readonly definition: FunctionDeclaration = {
		name: 'word_count',
		description: 'Counts the number of words in a given text',
		parametersJsonSchema: {
			type: 'object',
			properties: {
				text: { type: 'string', description: 'The text to count words in' }
			},
			required: ['text']
		}
	}

	protected async call(args: Record<string, unknown>): Promise<string> {
		const text = args.text as string
		const count = text.trim().split(/\s+/).filter(Boolean).length
		return `Word count: ${count}`
	}
}

class ReadTool extends ExecutableTool {
	static readonly definition: FunctionDeclaration = {
		name: "read",
		description: "read the contents of a file",
		parametersJsonSchema : {
			type: 'object',
			properties: {
				path: {type: "string", description: 'path of the file to read'}
			},
			required: ['path']
		}
	}

	protected async call(args: Record<string, unknown>, signal: AbortSignal): Promise<string> {
		const path = args.path as string
		return await readFile(path,{encoding: 'utf-8', signal})
	}
}

function isValidPath(path: string): boolean {
	if (!/^[A-Za-z]:[\\/]/.test(path)) return false
	const rest = path.slice(3)
	if (/[<>:"|?*]/.test(rest)) return false
	const file = rest.split(/[\\/]/).pop()!
	if (!/\.\w+$/.test(file)) return false
	return true
}

class WriteTool extends ExecutableTool {

	static readonly definition: FunctionDeclaration = {
		name: 'write',
		description: 'Replaces the original file with contents with content to a file',
		parametersJsonSchema : {
			type: 'object',
			properties: {
				path : {type: 'string', description: 'path of the file to write'},
				content: {type: 'string', description: 'content to write'}
			},
			required: ["path", "content"]
		}
	}
	protected async * preDecision(): AsyncGenerator<Tool> {
		const client = new Client({name: "client", version: "1.0.0"})
		const transport = new StreamableHTTPClientTransport(new URL("http://localhost:3000/mcp"))
		client.connect(transport as Transport)
		const path = resolve(this.stub.args.path as string)
		if (!isValidPath(path)) {
			this.decide("reject",'Path does not follow the criteria')
			return
		}
		const exists = await stat(path).then(s => s.isFile(), () => false)
		if (!exists) {
			this.decide("reject",'Path does not point to an existing file')
			return
		}
		await client.callTool({
			name: "showDiff",
			arguments: {
			filePath: path,
			change: this.stub.args.content,
			}
		})
	}

	protected async call(args: Record<string, unknown>, signal: AbortSignal): Promise<string> {
		const path = args.path as string
		await writeFile(path,args.content as string,{signal})
		return "success!"
	}
}

class ShellTool extends ExecutableTool {
	static readonly definition: FunctionDeclaration = {
		name: 'shell',
		description: 'Execute bash commands',
		parametersJsonSchema : {
			type: 'object',
			properties : {
				command: {type: 'string', description: "command as a complete string eg 'ls -a' "},

			},
			required: ["command"]
		}
	}

	protected async call(args: Record<string, unknown>, signal: AbortSignal): Promise<string> {
		const execPromised = promisify(exec)
		const {stdout,stderr}= await execPromised(args.command as string,{shell: "C:\\Program Files\\Git\\bin\\bash.exe", signal })
		return ` ${args.command} | ${stdout}`
	}
}

export const tools: ToolClass[] = [RollDiceTool, WordCountTool, ReadTool, WriteTool, ShellTool]

export const definitions: FunctionDeclaration[] = tools.map(t => t.definition)

export const toolRegistry = new Map(tools.map(t => [t.definition.name!, t] as const))
