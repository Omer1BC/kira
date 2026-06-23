import React, {useState} from 'react';
import {render, Text, Box, useInput, useApp} from 'ink';
import { useStateSnapshotContext } from './contexts/stateSnapshotContext.js';
import type { History } from './messages.js';
import { newId, time } from './metadata.js';


const Bubble = ({msg}: {msg: History}) => (
	<Box flexDirection="column" marginBottom={1}>
		<Text color={msg.role === 'user' ? 'blueBright' : 'green'} bold>
			{msg.role === 'user' ? 'You' : 'AI'} <Text dimColor>{msg.time}</Text>
		</Text>
		<Text color={msg.role === 'user' ? 'blueBright' : 'white'}>{msg.value}</Text>
	</Box>
);

export const App = () => {
	const {exit} = useApp();

	const [input, setInput] = useState('');
	const {model, toolManager, messageManager,history,tools} = useStateSnapshotContext()

	
	const handleQuery = async (userInput: string) => {
		const trimmedInput = userInput.trim()
		setInput('')

		if (trimmedInput) {
			const stream = streamResponse(trimmedInput)
			processStream(stream)
		}
	}

	useInput(async (char, key) => {
		if (key.escape) {
			// exit();
			model.abort()
			return;
		}
		if (key.return) {
			handleQuery(input)
			return;
		}
		if (key.backspace || key.delete) {
			setInput(prev => prev.slice(0, -1));
			return;
		}
		if (!key.ctrl && !key.meta) {
			setInput(prev => prev + char);
		}
	});


	//multi-turn reasoning
	async function * streamResponse(input: string) {
		
		yield {id: newId(), role: 'user', value: input, time: time()}

		while (true) {
			const stream = model.fetchAsNormalizedStream(messageManager.historyRef, input)
			try {
				for await (const chunk of stream) {
					switch (chunk.role) {
						case "tool":
							toolManager.enqueue(chunk)
							break;
						case "model":
							yield chunk
							break;
						default:
							break;
					}
				}
			} catch (error) {
				yield messageManager.terminalMessage(error instanceof Error ? error.message : String(error))
				return
			}

			if (!toolManager.queueLength) break

			for await (const toolResult of toolManager.executeTools()) {
				yield toolResult
			}
			for await (const interruptedResult of toolManager.clearTools()){
				yield interruptedResult
			}
		}

	}

	const processStream =  async (stream : any) => {
		for await (const chunk of stream) {
			messageManager.updateHistory(chunk)
		}
	}

	return (
		<Box flexDirection="column" width="100%">
			{/* Chat area */}
			<Box
				flexDirection="column"
				paddingX={1}
				paddingY={1}
				minHeight={18}
			>
				{history.map((msg) => (
					<Bubble key={msg.id} msg={msg} />
				))}
			</Box>

			{/* Input bar */}
			<Box borderStyle="round" borderColor="blue" paddingX={1} width="100%">
				<Text>{input}</Text>
				<Text color="blue">▌</Text>
			</Box>

			<Box paddingX={1}>
				<Text dimColor>ESC to quit · Enter to send</Text>
			</Box>
		</Box>
	);
};

// render(<App />);
