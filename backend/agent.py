from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, MessagesState, START, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, ToolMessage, AIMessage
from dotenv import load_dotenv
import os
from agents.tools import tools
load_dotenv()


class Agent:
    def __init__(self, tools):
        if not os.getenv("OPENAI_API_KEY"):
            raise ValueError("Must specify OPENAI_API_KEY in .env")
        self.llm = ChatOpenAI(model="gpt-4o-mini", api_key=os.getenv("OPENAI_API_KEY")).bind_tools(tools)

        def invoke_model(state: MessagesState):
            resp = self.llm.invoke(state["messages"])
            return {"messages": [resp]}

        def should_continue(state: MessagesState):
            last = state["messages"][-1]
            return hasattr(last, "tool_calls") and bool(last.tool_calls)

        graph = StateGraph(MessagesState)
        graph.add_edge(START, "get_response")
        graph.add_node("get_response", invoke_model)
        graph.add_node("tools", ToolNode(tools))
        graph.add_conditional_edges("get_response", should_continue, {True: "tools", False: END})
        graph.add_edge("tools", "get_response")

        memory = MemorySaver()
        self.agent = graph.compile(checkpointer=memory, interrupt_before=["tools"])

    async def clear_history(self, thread_id):
        await self.agent.checkpointer.adelete_thread(thread_id)

    def resume_with_approved_tools(self, payload):
        extended = []
        for event in self.agent.stream(None, payload["config"], stream_mode="updates"):
            for _, update in event.items():
                if "messages" in update:
                    extended.extend(update["messages"])
        return extended

    def resume_with_declined_tools(self, payload):
        snapshot = self.agent.get_state(payload["config"])
        last = snapshot.values["messages"][-1]
        declined = [
            ToolMessage(content="Tool declined by user.", tool_call_id=t["id"])
            for t in last.tool_calls
        ]
        self.agent.update_state(payload["config"], {"messages": declined})
        extended = []
        for event in self.agent.stream(None, payload["config"], stream_mode="updates"):
            for _, update in event.items():
                if "messages" in update:
                    extended.extend(update["messages"])
        return extended

    def get_response(self, payload) -> list:
        if not payload["data"]:
            return []
        extended = []
        for event in self.agent.stream(
            {"messages": [HumanMessage(content=payload["data"])]},
            payload["config"],
            stream_mode="updates",
        ):
            for _, update in event.items():
                if "messages" in update:
                    extended.extend(update["messages"])
        return extended


agent = Agent(tools=tools)
