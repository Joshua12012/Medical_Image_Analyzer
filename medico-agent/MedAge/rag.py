"""
RAG initialization and QA chain (text-only).
"""
import uuid
import logging
from pathlib import Path
from typing import List, Any, Optional
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_core.documents import Document
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_groq import ChatGroq
from unstructured.partition.pdf import partition_pdf
import torch  # For checking device if needed
from groq import Groq
from langchain_core.language_models.llms import LLM
logger = logging.getLogger(__name__)

# Global variables for vectorstore and qa_chain
vectorstore = None
qa_chain = None

# Basic PDF partitioning (text-only)
def load_pdf_text_elements(pdf_path: str):
    raw_pdf_elements = partition_pdf(
        filename=pdf_path,
        extract_images_in_pdf=False,
        chunking_strategy="by_title",
        max_characters=4000,
        new_after_n_chars=3800,
        combine_text_under_n_chars=2000,
        extract_image_block_output_dir=None,
    )
    text_elements = []
    for e in raw_pdf_elements:
        if 'CompositeElement' in repr(e):
            text_elements.append(e.text)
    return text_elements

# Wrapper LLM for Groq (keeps same interface) - but we'll use ChatGroq directly for QA
# (build_summary_chain not strictly needed for basic RAG; can use direct if no summarization)

def build_summary_chain(groq_api_key: str, model_name: str = "llama-3.1-8b-instant"):
    """
    Build a summary chain for text elements (optional for RAG preprocessing).
    """

    class GroqLLM(LLM):
        model: str
        client: Any

        def _call(self, prompt: str, stop: Optional[List[str]] = None) -> str:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1024
            )
            return response.choices[0].message.content.strip()

        @property
        def _identifying_params(self):
            return {"model": self.model}

        @property
        def _llm_type(self):
            return "groq"

    client = Groq(api_key=groq_api_key)
    groq_llm = GroqLLM(model=model_name, client=client)
    summary_prompt_template = """
Summarize the following {element_type}:
{element}
"""
    summary_template = PromptTemplate.from_template(summary_prompt_template)
    summary_chain = (
        RunnablePassthrough.assign(element_type=lambda _: "text")
        | summary_template
        | groq_llm
        | StrOutputParser()
    )
    return summary_chain

# Create vectorstore from text elements
def build_vectorstore_from_texts(text_elements: List[str], embedding_model_name="sentence-transformers/all-MiniLM-L6-v2"):
    documents = []
    for i, e in enumerate(text_elements):
        doc = Document(
            page_content=e,  # store original content
            metadata={
                "id": str(uuid.uuid4()),
                "type": "text",
                "original_content": e
            }
        )
        documents.append(doc)
    embedding_model = HuggingFaceEmbeddings(model_name=embedding_model_name)
    vectorstore = FAISS.from_documents(documents=documents, embedding=embedding_model)
    # save locally
    
    Path("faiss_index").mkdir(exist_ok=True)
    vectorstore.save_local("faiss_index")
    return vectorstore

# Main initialization function
def init_rag(groq_api_key: str, pdf_path: Optional[str] = None, embedding_model_name="sentence-transformers/all-MiniLM-L6-v2", use_summarization: bool = True):
    """
    Initialize the global vectorstore and qa_chain.
    - If pdf_path provided, loads and processes the PDF.
    - Otherwise, uses sample lung disease texts.
    - Optionally summarizes texts before embedding.
    """
    global vectorstore, qa_chain

    if vectorstore is not None:
        logger.info("📚 RAG already initialized, skipping")
        return

    # Load texts
    if pdf_path and Path(pdf_path).exists():
        logger.info(f"📄 Loading PDF: {pdf_path}")
        text_elements = load_pdf_text_elements(pdf_path)
    else:
        logger.warning(f"⚠️ No PDF found at {pdf_path}, using sample lung disease texts")
        text_elements = [
            "Pneumonia is an infection that inflames the air sacs in one or both lungs. The air sacs may fill with fluid or pus (purulent material), causing cough with phlegm or pus, fever, chills, and difficulty breathing. A variety of organisms, including bacteria, viruses and fungi, can cause pneumonia.",
            "Signs and symptoms of pneumonia may include: Chest pain when you breathe or cough, Confusion or changes in mental awareness (in adults age 65 and older), Cough, which may produce phlegm, Fatigue, Fever, sweating and shaking chills, Lower than normal body temperature (in adults older than age 65 and people with weak immune systems), Nausea, vomiting or diarrhea, Shortness of breath.",
            "Shortness of breath: Shortness of breath is a common symptom of pneumonia. It may be more noticeable when you cough or take a deep breath.",
            "Fast breathing and heart rate: Children younger than 1 month old may have fast breathing and heart rate.",
            "Coughing that produces phlegm: This is a common symptom of pneumonia caused by bacteria.",
            "When to see a doctor: See your doctor if you have difficulty breathing, chest pain, persistent fever of 102 F (39 C) or higher, or persistent cough, especially if you're older than 65.",
            "Diagnostic tests may include: Chest X-ray, Blood tests, Pulse oximetry, Sputum test, Bronchoscopy, CT scan, Pleural fluid culture.",
            "Treatment depends on the type and severity of your pneumonia. Treatment may include: Antibiotics, Cough medicine, Fever reducers/pain relievers, Hospitalization.",
            "Prevention: Get vaccinated against pneumococcal pneumonia, Get vaccinated against influenza, Practice good hygiene, Don't smoke, Practice breathing exercises."
        ]

    # Optional summarization
    texts_to_embed = text_elements
    if use_summarization and len(text_elements) > 0:
        logger.info("📝 Summarizing texts...")
        summary_chain = build_summary_chain(groq_api_key)
        # Batch summarize (simple loop for now; can parallelize)
        summarized_texts = []
        for text in text_elements:
            if text.strip():
                try:
                    summary = summary_chain.invoke({"element": text})
                    summarized_texts.append(summary)
                except Exception as e:
                    logger.warning(f"Summarization failed for chunk: {e}, using original")
                    summarized_texts.append(text)
        texts_to_embed = summarized_texts

    # Build vectorstore
    logger.info(f"🔗 Building vectorstore from {len(texts_to_embed)} texts...")
    vectorstore = build_vectorstore_from_texts(texts_to_embed, embedding_model_name)
    logger.info(f"✅ Vectorstore built with {vectorstore.index.ntotal} vectors")

    # Build QA chain using LCEL (replaces RetrievalQA)
    logger.info("🧠 Building QA chain...")
    llm_qa = ChatGroq(
        groq_api_key=groq_api_key,
        model_name="llama-3.1-8b-instant",
        temperature=0.1
    )
    qa_prompt = PromptTemplate.from_template(
        """You are a helpful assistant answering questions about lung diseases based on the context.
        Use the following context to answer the question. If you don't know the answer, say so.
        Context: {context}

        Question: {question}

        Helpful Answer:"""
    )

    # LCEL chain: question -> retrieve docs -> format context -> prompt -> llm -> parse
    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    retriever = vectorstore.as_retriever(search_type="similarity", search_kwargs={"k": 3})

    qa_chain = (
        RunnablePassthrough.assign(
            context=retriever | format_docs  # Automatically retrieve and format context
        )
        | qa_prompt
        | llm_qa
        | StrOutputParser()
    )
    logger.info("✅ QA chain built successfully (LCEL)")

# Expose globals for tools.py usage
# Note: Call init_rag() before using vectorstore/qa_chain
# Usage in tools.py: Change to result = qa_chain.invoke({"question": query})