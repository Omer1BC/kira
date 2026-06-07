import React, {useState} from 'react';
import {render, Text, Box, useInput, useApp} from 'ink';
import axios from 'axios'

type Message = {
	id: number;
	text: string;
	fromMe: boolean;
	time: string;
};

const getTime = () =>
	new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

async function getResponse(input:string) {
    const resp = await axios.post("http://localhost:8000/api/v1/threads/1/runs/prompt",{
        data: input

    }
    )
    return resp.data.data.responses[0].data
} 

const Bubble = ({msg}: {msg: Message}) => (
	<Box
		flexDirection="column"
		alignItems={msg.fromMe ? 'flex-end' : 'flex-start'}
		marginBottom={1}
	>
		<Box
			borderStyle="round"
			borderColor={msg.fromMe ? 'blue' : 'gray'}
			paddingX={1}
		>
			<Text color={msg.fromMe ? 'blueBright' : 'white'}>{msg.text}</Text>
		</Box>
		<Text dimColor>{msg.time}</Text>
	</Box>
);

const App = () => {
	const {exit} = useApp();
	const [messages, setMessages] = useState<Message[]>([
	]);
	const [input, setInput] = useState('');

	useInput(async (char, key) => {
		if (key.escape) {
			exit();
			return;
		}
		if (key.return) {
            const trimmedInput = input.trim()
			if (trimmedInput) {
				setMessages(prev => [
					...prev,
					{id: prev.length + 1, text:trimmedInput, fromMe: true, time: getTime()},

				]);


            
                const res = await getResponse(trimmedInput)
                setMessages(prev => [
                    ...prev,
                    {id: prev.length+2, text: res,fromMe: false,time:getTime()}
                    ]
                )

				setInput('');
			}
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
