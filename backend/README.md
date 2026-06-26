# AAkar - Backend

The robust Python-based backend for **AAkar**. It connects to a **Neo4j Knowledge Graph**, exposes RESTful APIs using **FastAPI**, processes PDF voter lists via highly-optimised **OCR pipelines**, and effortlessly translates natural language into secure Cypher queries using **Ollama**.

---

## Tech Stack

- **Framework**: FastAPI (Asynchronous, fast, and highly performant)
- **Database**: Neo4j (Graph Database for profound relationship tracking)
- **Authentication**: SQLite (via SQLModel) & JWT (Zero-dependency local authentication)
- **NLP/LLM**: Ollama (Locally hosted `qwen2.5:7b`, 7b models supported)
- **Data Extractor**: OpenCV, Tesseract OCR, pdf2image (for multi-threaded PDF ingest)
- **Testing**: Pytest

---

## Architecture

```text
backend/
 ├── app/
 │   ├── api/             # FastAPI Route Handlers (Admin, Ask, Upload)
 │   ├── core/            # Configuration & Settings
 │   ├── domain/          # Business Logic, OCR Services (pdf_converter), Graph Encoders
 │   ├── infrastructure/  # Neo4j Driver Connection & LLM Output Parsers
 │   └── main.py          # Application Entry Point & Auto-Sync Watcher
 ├── data/                # Uploaded datasets (voters.csv, complaints.csv)
 ├── scripts/             # Utility scripts
 ├── tests/               # Backend Pytest suite (coverage for endpoints and safe LLM gen)
 ├── .env                 # Environment variables (Neo4j URI, Passwords)
 ├── requirements.txt     # Python dependencies
 └── README.md            # Backend Documentation
```

---

## Getting Started

### 1. Prerequisites
- **Python 3.9+**
- **Neo4j Database**: You can use Neo4j Desktop, Neo4j Aura (Cloud), or a local Docker instance.
- **Ollama**: Install [Ollama](https://ollama.ai/) and pull your required model (e.g., `ollama run qwen2.5:7b`).
- **OCR System Dependencies**:  
  You must install Tesseract and Poppler on your host system to process PDF uploads natively:
  ```bash
  sudo pacman -S tesseract-data-eng tesseract-data-hin poppler
  ```

### 2. Installation Setup

Navigate to your backend directory and set up a virtual environment:

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Or .venv\Scripts\activate on Windows

# Install the dependencies
pip install -r requirements.txt
```

### 3. Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
JWT_SECRET_KEY=your_secure_jwt_secret_key
WHATSAPP_TOKEN=your_meta_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=any_string_you_make_up
```

### 3.1 WhatsApp Webhook Setup (Local Development)

To test WhatsApp integrations locally, you have two options:

**Option A: The Fast Way (Simulation)**
You do not need a Meta account. Simply run the provided simulation script in a separate terminal while your backend is running:
```bash
python scripts/test/simulate_webhook.py
```
This bypasses Meta entirely and sends production-accurate JSON payloads directly to your local endpoint.

**Option B: The Full Way (Meta Dashboard & Ngrok)**
If you need to test with a physical phone:
1. Go to the [Meta Developer Dashboard](https://developers.facebook.com/) and create a "Business" app.
2. Add the **WhatsApp** product to your app.
3. Expose your local server using ngrok: `ngrok http 8000`.
4. In the Meta Dashboard under **WhatsApp -> Configuration**, set your Callback URL to `https://<your-ngrok-url>/api/v1/whatsapp/webhook`.
5. Subscribe to the `messages` webhook field.
*Note: Meta's sandbox test numbers often block inbound messages from physical phones while an app is unpublished. If physical tests fail, use Option A.*

### 4. Running the Development Server

Start the FastAPI application natively using `uvicorn`:

```bash
uvicorn app.main:app --reload
```

The API will be accessible at: `http://localhost:8000`  
Swagger UI Documentation: `http://localhost:8000/docs`

Note: The backend application contains an auto-update watcher that will instantly re-seed the graph database whenever changes to `data/uploads/voters.csv` or complaints are detected.

---

## Key Functionalities

- **Automated Data Ingestion**: Endpoints securely receive heavy PDF voter manifests, converting them to tabular CSV data using multi-threaded image preprocessing and dual-language OCR engines, automatically seeding the graph database.
- **Live Graph Analytics**: Executes complex calculations against Neo4j to continuously update Booth Risk metrics and automatically resolve discrepancy matrices in complaint resolution statuses.
- **LLM Cypher Generation**: Evaluates natural language dynamically by polling current Neo4j schema states, returning execution plans to Ollama to generate strictly read-only Cypher queries. 
- **Safety Middleware**: Hard-blocks mutating outputs (CREATE, DELETE, DETACH) natively via regex filters and XML-bounded extraction mechanics before touching the Neo4j API.
- **Unit Testing**: Contains a robust `pytest` suite simulating Edge-Cases and ensuring the integrity of the predictive Booth Logic calculation engines.
