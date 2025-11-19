"""
Tool wrappers exposed to the agent.
"""
import logging
from typing import List, Any, Optional
from langchain_core.tools import tool
from langchain_tavily import TavilySearch
from MedAge.multi_model import (
    load_multi_model,
    _load_multiple_images,
    _prepare_model_inputs_multiple,
    _generate_answer,
    _decode_answer
)
# from MedAge.rag import build_summary_chain
from MedAge.config import GROQ_API_KEY, DEVICE
# from langchain_core.runnables import RunnablePassthrough
logger = logging.getLogger(__name__)

# Keep track of search results globally (same behaviour as original)
search_results_store: dict = {}

@tool
def search_medical_info(query: str) -> List[str]:
    """
    Search for grounded medical information using TavilySearch.
    """
    logger.info("🔍 TOOL CALLED: search_medical_info")
    logger.info(f"📝 Query: {query}")
    search = TavilySearch(max_results=3, search_depth="advanced")
    try:
        search_results = search.invoke({"query": query})
    except Exception as e:
        logger.exception("TavilySearch invocation failed")
        return [f"Search failed: {e}"]
    results: List[str] = []
    if isinstance(search_results, dict) and 'result' in search_results:
        for i in search_results['result']:
            if isinstance(i, dict) and 'content' in i:
                results.append(i['content'])
    elif isinstance(search_results, list):
        for item in search_results:
            if isinstance(item, dict) and 'content' in item:
                results.append(item['content'])
            elif isinstance(item, str):
                results.append(item)
    else:
        results.append(str(search_results))
    logger.info(f"✅ Tool executed successfully. Found {len(results)} results.")
    return results

@tool
def great_brain_specialist(query: str, images: Optional[List[str]] = None) -> str:
    """
    Fine-tuned vision model tool for medical image analysis.
    Accepts a query and optional list of image file paths. If no images provided, defaults to text-only analysis.
    """
    if images is None:
        images = []
    logger.info("🧠 TOOL CALLED: great_brain_specialist")
    logger.info(f"📝 Query: {query}")
    logger.info(f"🖼️ Images: {len(images)}")
    # Determine whether this is image+text or text-only
    is_image_flow = bool(images)
    # For text-only: always use Groq fallback (no vision model needed)
    if not is_image_flow:
        logger.info("📝 Text-only query: Using Groq fallback (no vision model needed)")
        try:
            from groq import Groq
            client = Groq(api_key=GROQ_API_KEY)
            resp = client.chat.completions.create(
                model="llama-3.1-8b-instant",
                messages=[{"role": "user", "content": query}],
                max_tokens=512,
                temperature=0.1
            )
            return resp.choices[0].message.content.strip()
        except Exception as ge:
            logger.exception("Groq fallback failed")
            return f"Error: Unable to process query: {ge}"
    # image + text flow (only load the vision model now that we know images are present)
    try:
        model, tokenizer = load_multi_model()
    except Exception as e:
        logger.exception("Failed to load vision model for image flow")
        return f"Error loading vision model: {e}"
    try:
        pil_images = _load_multiple_images(images)
        logger.info("🔄 Preparing model inputs...")
        inputs, input_text = _prepare_model_inputs_multiple(query, pil_images, tokenizer)
        logger.info("🔄 Generating analysis...")
        output = _generate_answer(model, inputs)
        answer = _decode_answer(output, tokenizer, input_text)
        logger.info(f"✅ Analysis generated successfully ({len(answer)} chars)")
        return answer
    except FileNotFoundError as e:
        logger.error(str(e))
        return f"Error: {str(e)}"
    except ValueError as e:
        logger.error(str(e))
        return f"Error: {str(e)}"
    except Exception as e:
        logger.exception("Error in great_brain_specialist")
        return f"Error in great_brain_specialist: {str(e)}"

@tool
def lung_disease_rag(query: str) -> str:
    """
    Retrieve and answer questions based on the local RAG vectorstore (text-only docs).
    The vectorstore and qa_chain are expected to be attached to this module at runtime.
    """
    logger.info("📚 TOOL CALLED: lung_disease_rag")
    logger.info(f"📝 Query: {query}")
    try:
        from MedAge import rag as rag_module # local import to avoid circular at module import time
        vectorstore = getattr(rag_module, "vectorstore", None)
        qa_chain = getattr(rag_module, "qa_chain", None)
        if vectorstore is None or qa_chain is None:
            return "Error: RAG is not initialized."
        relevant_docs = vectorstore.similarity_search(query)
        context = ""
        for d in relevant_docs:
            if d.metadata.get('type') == 'text':
                context += "[text]" + d.metadata.get('original_content', "")
        result = qa_chain.invoke({"context": context, "question": query})
        logger.info(f"✅ RAG query executed successfully ({len(result)} chars)")
        return result
    except Exception as e:
        logger.exception("Error in lung_disease_rag")
        return f"Error in RAG processing: {str(e)}"