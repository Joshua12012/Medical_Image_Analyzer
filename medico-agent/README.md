# MEDICO-AGENT — Medical Image Analysis: 

**MEDICO-AGENT** is a modular prototype designed for analyzing medical queries through text, images, or a combination of both. It integrates Groq’s high‑speed LLMs API for agentic reasoning, fine‑tuned vision models for clinical text‑image interpretation (e.g., X‑rays, CT scans), a local RAG system for lung‑disease knowledge retrieval, and Tavily Search for web‑grounded medical facts. LangSmith provides full traceability and observability across the pipeline, making the system ideal for rapid prototyping in healthcare AI applications.

---

![Architecture Diagram](architecture.png)

---

## Highlights

- **Chat-style API supporting**:
  - JSON-based requests (text and explicit image paths)
  - Swagger-friendly upload endpoint (multi-file uploads)
- **Tooling**:
  - `great_brain_specialist` - Finetuned VLM for medical image analysis.
  - `search_medical_info` - Ground answers with web search (Tavily Search API)
  - `lung_disease_rag` - Local RAG-based retrieval for lung-specific docs
- **Agent-based workflow** using LangChain adapters

---

## Quickstart (local)

1. Create a virtualenv and install deps:

   ```bash
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Set environment variables (or use a `.env` loader)

3. Start the server (reload for development):

   ```bash
   python main.py
   ```

4. Open the interactive docs:  
   http://localhost:8000/docs

---

## Endpoints

### POST /chat (JSON)

**Request model**: `MedAge.schemas.QueryRequest`

- `question`: string
- `image_paths`: optional array of filesystem paths (strings)
- `session_id`: optional

### POST /chat/upload (UI Swagger)

**Form fields**:

- `question` (string, required)
- `session_id` (string, optional)
- `files` (multi-file upload, optional) — use the file chooser; do **NOT** type filenames into the array editor

**Response**: `AnalysisResponse` (success, session_id, assessment, totals, search_results)

---

## Project Structure (important files)

- `MedAge/agent.py` - Graph workflow, prompts, and tool binding
- `MedAge/api.py` - FastAPI endpoints and upload handling
- `MedAge/config.py` - Paths, API keys, device settings
- `MedAge/multi_model.py` - (Medical Finetuned multi-modal helper)
- `MedAge/rag.py` - RAG initialization / QA chain
- `MedAge/schemas.py` - Pydantic models for requests/responses
- `MedAge/tools.py` - Tool wrappers that the agent calls

- `MedAge/utils.py` - Upload saving utility


---

## Info on Finetuned VLM Model

The project utilizes a **Qwen-VL-based Vision-Language Model (VLM)** fine-tuned specifically for medical image analysis and Visual Question Answering (VQA) tasks. This adaptation enhances performance on descriptive (open-ended) and closed-ended (e.g., Yes/No, multiple-choice) medical queries by improving medical term comprehension, reducing hallucinations, and boosting generalization across imaging modalities like X-rays, CT scans, and MRIs.

### Model Details
- **Base Model**: Qwen-VL variants (e.g., Qwen 8B Instruct, Qwen2-VL-7B, Qwen-VL-2B-BNB-4bit with 4-bit quantization for efficiency).
- **Fine-Tuning Technique**: Low-Rank Adaptation (LoRA) via the Unsloth library for memory-efficient training (e.g., 4-bit BNB quantization, 8-bit AdamW optimizer).

- **Model Link**: [Haider584/lora_model on Hugging Face](https://huggingface.co/Haider584)

### Training Process
- **Key Insight**: Pre-train on **open-ended VQA** (descriptive questions) before closed-ended ones to build semantic understanding and minimize errors. Direct closed-ended training leads to poor medical concept grasp and high hallucination rates.
- **Datasets**:
  - **Fine-Tuning**: 
    - Combined: 12,149 samples from `robailleo/medical-vision-llm-dataset`, ImageClef-2019-VQA-Med, and `alvinl29/medical-imaging-combined`.
    - PubMed Vision Dataset: 6,666 points with multi-image questions, rich explanations, and diverse modalities for complex scenarios.
  - **Evaluation**: VQA-RAD (2,248 test samples) and `flaviagiammarino/VQA-RAD` (451 samples).

---

For full training scripts, configs, and loss visualizations, see the [GitHub repo](https://github.com/MdSufiyan005/Medical_Image_Analysis).

