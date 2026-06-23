import React, {createContext, useContext, useState, useRef,} from 'react';
import type { Message, Tool, History } from '@src/messages.js';
import type { Model } from '@src/Model.js';
import { GeminiModel } from '@src/GeminiModel.js';
import { ToolManager } from '@src/ToolManager.js';
import { MessageManager } from '@src/MessageManager.js';

// define the context shape later unpacked
type stateSnapshotContext =  {
	model: Model<unknown>
	toolManager: ToolManager
	history: History[]
	tools: Tool[]
	messageManager: MessageManager
}


// create the parent node that provides the context 
const StateSnapshotContext =  createContext<stateSnapshotContext | null>(null)


export function useStateSnapshotContext() {
	const ctx = useContext(StateSnapshotContext)
	if (!ctx) {
		throw new Error("Expecting a provider for StateSnapshotContext")
	}
	return ctx

}

// wrap the provider node around its children, assigning the context values
export function SnapshotContextProvider( {children} : {children: React.ReactNode}  ) {
	const [history,setHistory] = useState<History[]>([])
	const [tools,setTools] = useState<Tool[]>([])
	const historyRef = useRef<History[]>([])
	const modelRef = useRef<Model<unknown>>(new GeminiModel())
	const toolManagerRef = useRef<ToolManager>(new ToolManager())
	const messageManagerRef = useRef<MessageManager>(new MessageManager(setTools,setHistory,historyRef))
	// const model = new GeminiModel()
	// const toolManager = new ToolManager()
	// const messageManager = new MessageManager(setTools,setHistory,historyRef)


	return <StateSnapshotContext.Provider value={{history, tools, model: modelRef.current, toolManager: toolManagerRef.current, messageManager: messageManagerRef.current}}>
		{children}
	</StateSnapshotContext.Provider> 


}




