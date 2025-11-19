import logging
from typing import Dict, Any, List
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_groq import ChatGroq
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from MedAge.tools import search_medical_info, great_brain_specialist, lung_disease_rag
from MedAge.rag import init_rag  # Import the init function
from MedAge.config import GROQ_API_KEY, GROQ_MODEL

logger = logging.getLogger(__name__)

# Bind tools to LLM
llm = ChatGroq(
    model_name=GROQ_MODEL,
    api_key=GROQ_API_KEY,
    temperature=0.1,
)

# Bind tools
tools = [search_medical_info, great_brain_specialist, lung_disease_rag]
llm_with_tools = llm.bind_tools(tools)

# System prompt for the assistant (updated to guide image parsing)
system_prompt = """
You are a helpful medical analysis assistant. Analyze user queries about medical images or text using the available tools.

User message format: "Question: [query]\nImages: [list of paths or 'None']"

Instructions:
- For any assessment request, ALWAYS call 'great_brain_specialist' first with:
  - 'query': The full question from the user.
  - 'images': If Images is a list (e.g., "['/path/img.jpg']"), pass it as an array of strings.
  - If Images: None or empty, pass images: [] (empty array) – do NOT omit the parameter.
- Use 'search_medical_info' if external web info is needed to ground the response.
- Use 'lung_disease_rag' for lung-specific queries if relevant docs are available.
- After tool calls, summarize: Start with key findings, then details, risks, recommendations.
- Be concise, evidence-based, and advise consulting a doctor.
- Do not diagnose; provide analysis only.
"""

# Prompt template
prompt = ChatPromptTemplate.from_messages([
    ("system", system_prompt),
    MessagesPlaceholder(variable_name="messages"),
])

# Assistant node: LLM decides tools or final response
def assistant_node(state: Dict[str, List[BaseMessage]]) -> Dict[str, List[BaseMessage]]:
    logger.info("🤖 ASSISTANT NODE: Processing...")
    latest_msg = state["messages"][-1]
    logger.info(f"📨 Latest user message: {latest_msg.content[:100]}...")
    chain = prompt | llm_with_tools
    response = chain.invoke({"messages": state["messages"]})
    logger.info(f"✅ Agent Response: {response.response_metadata.get('finish_reason', 'unknown')}")
    if hasattr(response, 'tool_calls') and response.tool_calls:
        logger.info(f"Tool calls detected: {len(response.tool_calls)}")
        for i, tc in enumerate(response.tool_calls, 1):
            logger.info(f"{i}. {tc['name']} Args: {tc.get('args', {})}")
    return {"messages": [response]}

# Tools node (prebuilt)
tool_node = ToolNode(tools)

# Conditional edge: tools or end
def should_continue(state: Dict[str, List[BaseMessage]]) -> str:
    last_msg = state["messages"][-1]
    if hasattr(last_msg, 'tool_calls') and last_msg.tool_calls:
        logger.info("🔄 Continuing to tools...")
        return "tools"
    logger.info("🏁 Ending with final answer")
    return END

# Build graph
workflow = StateGraph(state_schema=Dict[str, List[BaseMessage]])
workflow.add_node("assistant", assistant_node)
workflow.add_node("tools", tool_node)
workflow.set_entry_point("assistant")
workflow.add_conditional_edges("assistant", should_continue, {"tools": "tools", END: END})
workflow.add_edge("tools", "assistant")

# Compile
graph = workflow.compile()

# For RAG init (call once at app startup, e.g., in api.py)
def init_agent_rag(pdf_path: str = None):
    """
    Initialize RAG for the agent. Call this at application startup.
    """
    init_rag(GROQ_API_KEY, pdf_path=pdf_path)
    logger.info("🤖 Agent and RAG fully initialized")