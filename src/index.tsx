import React, {useState} from 'react';
import {render, Text, Box, useInput, useApp} from 'ink';
import axios from 'axios'
import {GoogleGenAI} from '@google/genai'
type Role = 'user' | 'model';

type Message = {
	id: number;
	text: string;
	role: Role;
	time: string;
};

type StreamChunk = {
	event_type: string;
	delta?: string;
};

const client = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY ?? ""
});

const getTime = () =>
	new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

const Bubble = ({msg}: {msg: Message}) => (
	<Box
		flexDirection="column"
		alignItems={msg.role === 'user' ? 'flex-end' : 'flex-start'}
		marginBottom={1}
		>
		<Box
			borderStyle="round"
			borderColor={msg.role === 'user' ? 'blue' : 'gray'}
			paddingX={1}
		>
			<Text color={msg.role === 'user' ? 'blueBright' : 'white'}>{msg.text}</Text>
		</Box>
		<Text dimColor>{msg.time}</Text>
	</Box>
);

const App = () => {
	const {exit} = useApp();
	const [messages, setMessages] = useState<Message[]>([
	]);
	const [input, setInput] = useState('');


	const updateHistory =  async (stream : any) => {

		for await (const chunk of stream) {

			switch (chunk.event_type) {
				case "step.start":
					if (chunk.step?.type === 'model_output') {
						setMessages((prev) => [
							...prev,
							{id: prev.length+1,text: "", role: 'model',time: getTime()}
						])
					}
					break;
				case "step.delta":
					setMessages((prev) => {
						const updated = [...prev]
						const last = updated[updated.length-1]
						if (!last) return prev

						const delta = chunk.delta?.type === 'text' ? chunk.delta.text : ''

						updated[updated.length-1] = {
							...last,
							text: last.text + delta
						};

						return updated
					})
					break;
				default:
					break;	
			}
		}
	}

	async function * streamResponse(userInput: string) {
		const stream = await client.interactions.create({
		model: "gemini-3.5-flash",
		input: userInput,
		stream: true,
		});

		for await (const chunk of stream) {
			yield chunk
		}

	}
	
	const handleQuery = async (userInput: string) => {
		const trimmedInput = userInput.trim()
		setInput('')

		if (trimmedInput) {
		setMessages((prev) => [
			...prev,
			{id: prev.length+1,text: trimmedInput, role: 'user',time: getTime()}
		])
			const stream = streamResponse(trimmedInput)
			updateHistory(stream)
		}


	}

	useInput(async (char, key) => {
		if (key.escape) {
			exit();
			return;
		}
		if (key.return) {
			await handleQuery(input)
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

	const visible = messages.slice(-8);

	return (
		<Box flexDirection="column" width={60}>
			{/* Header */}
			<Box
				borderStyle="single"
				borderColor="blue"
				justifyContent="center"
				paddingX={1}
			>
				<Text bold color="blueBright">
					John Doe
				</Text>
			</Box>

			{/* Chat area */}
			<Box
				flexDirection="column"
				borderStyle="single"
				borderColor="gray"
				paddingX={1}
				paddingY={1}
				minHeight={18}
			>
				{visible.map(msg => (
					<Bubble key={msg.id} msg={msg} />
				))}
			</Box>

			{/* Input bar */}
			<Box borderStyle="round" borderColor="blue" paddingX={1}>
				<Text dimColor>iMessage  </Text>
				<Text>{input}</Text>
				<Text color="blue">▌</Text>
			</Box>
			

			<Box paddingX={1}>
				<Text dimColor>ESC to quit · Enter to send</Text>
			</Box>
		</Box>
	);
};

render(<App />);
