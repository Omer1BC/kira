import { createCliRenderer, InputRenderable, InputRenderableEvents, RGBA, ScrollBox, SyntaxStyle, Text } from '@opentui/core';
import { useStateSnapshotContext } from './contexts/stateSnapshotContext.js';
import {useState} from 'react'
import { useKeyboard } from '@opentui/react';
import type { History, Tool } from './messages.js';

const RESPONSE_SYNTAX_STYLE = SyntaxStyle.fromStyles({
    default:   { fg: RGBA.fromHex('#E6EDF3') },
    keyword:   { fg: RGBA.fromHex('#FF7B72') },
    string:    { fg: RGBA.fromHex('#A5D6FF') },
    comment:   { fg: RGBA.fromHex('#8B949E'), italic: true },
    function:  { fg: RGBA.fromHex('#D2A8FF') },
    number:    { fg: RGBA.fromHex('#79C0FF') },
    constant:  { fg: RGBA.fromHex('#79C0FF') },
    type:      { fg: RGBA.fromHex('#FFA657') },
    operator:  { fg: RGBA.fromHex('#FF7B72') },
    'punctuation.bracket': { fg: RGBA.fromHex('#E6EDF3') },
    'markup.heading.1': { fg: RGBA.fromHex('#58A6FF'), bold: true },
    'markup.list':      { fg: RGBA.fromHex('#FF7B72') },
    'markup.raw':       { fg: RGBA.fromHex('#A5D6FF') },
  })

export const App = () => {
	const [input,setInput] = useState('')
	const {agent, history} = useStateSnapshotContext()
	const [focusedToolIndex, setFocusedToolIndex] = useState(0)

	const pendingTools = history.filter((msg): msg is Tool => msg.role === 'tool' && msg.status === 'loaded')


	const handleSubmit = () => {
		const trimmedInput = input.trim()
		setInput('')
		if (trimmedInput) agent.run(trimmedInput)
	}

	useKeyboard((key) => {
		if (pendingTools.length > 0) {

			if (key.name == 'tab') {
				setFocusedToolIndex((prev) => 
					prev = ( prev + 1 ) % pendingTools.length
				)
			}
			else if (key.name == 'y') {
				agent.toolManager.handleToolApproval(pendingTools[focusedToolIndex]?.id!,'accept')
			}
			else if (key.name == 'n') {
				agent.toolManager.handleToolApproval(pendingTools[focusedToolIndex]?.id!,'reject')
			}
		}

	})

	
	function Response({msg} : {key: string,msg : History}  )  {
		return (<box>
			{ msg.role === 'model' ? <markdown syntaxStyle={RESPONSE_SYNTAX_STYLE} content={msg.value} concealCode={false}></markdown> : <text>{msg.value}</text>}
		</box>)
	}
	
	function Tool({focused,tool } : {focused: boolean, tool: Tool}) {
		const statusColor = tool.status === 'complete' ? 'green' : tool.status === 'rejected' ? 'red' : 'gray'
		
		const argsString = JSON.stringify(tool.args);
		const MAX_ARGS_LENGTH = 50;
		const displayArgs = argsString.length > MAX_ARGS_LENGTH ? argsString.slice(0, MAX_ARGS_LENGTH) + '...' : argsString;

		return ( 
		<box style={{border: focused}}>
			<text>{`${tool.function}(${displayArgs})`}
			</text>
			<text fg={statusColor}>{tool.status}</text>
			{tool.status === 'loaded' && focused && <text>Y/N</text>}
			{tool.value && <text>{tool.value}</text>}
		</box>
		)
	}
	

	return (
			<box style={{ border: true, padding: 2, flexDirection: 'column', height: '100%', gap: 1}}>
				<scrollbox 
					style={{ flexGrow: 1}}
					contentOptions={{gap: 1}}
					stickyScroll
					stickyStart='bottom'
					focused>
					{history.map((msg) => 
						(msg.role == 'tool' ? <Tool focused={pendingTools[focusedToolIndex] !== undefined && pendingTools[focusedToolIndex].id === msg.id} tool={msg}/> 
						: <Response key={msg.id} msg={msg} /> ) )}
				</scrollbox>

				{pendingTools.length == 0 && <input
					style={{backgroundColor: '000f00'}}
					value={input}
					onInput={setInput}
					onSubmit={handleSubmit}
					placeholder='enter message'
				/>}
			</box>
				

	)

}
