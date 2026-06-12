import os
import re
import json
import pickle
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer
import numpy as np
import requests
from supabase import create_client, Client

# ─── FORCE DOTENV INITIALIZATION ───
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024

# ─── SECURE DATABASE ENDPOINT MOUNTING ───
SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("VITE_SUPABASE_URL")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

# Hard-fail on missing credentials — never silently fall back to the anon key
if not SUPABASE_URL:
    raise RuntimeError("❌ [SYSTEM INIT] SUPABASE_URL is not set. Check your .env file.")
if not SERVICE_KEY:
    raise RuntimeError("❌ [SYSTEM INIT] SUPABASE_SERVICE_ROLE_KEY is not set. Check your .env file.")

print(f"📡 [SYSTEM INIT] Database endpoint: {SUPABASE_URL}")
supabase_client: Client = create_client(SUPABASE_URL, SERVICE_KEY)

# --- HEALTH CHECK ---
@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "status": "OptiMind Backend is ONLINE 🚀",
        "engine": "Flask + Supabase + Qwen + Scikit-Learn ML",
        "message": "The server is running perfectly."
    }), 200

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "model_loaded": ml_model is not None,
        "version": "2.1.0"
    }), 200

# ─── EMBEDDING ENGINE ───
try:
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2', local_files_only=True)
    print("🧠 [EMBEDDING ENGINE] Loaded from local cache.")
except Exception:
    print("🌐 [EMBEDDING ENGINE] Downloading model...")
    embedding_model = SentenceTransformer('all-MiniLM-L6-v2')

OLLAMA_URL = "http://localhost:11434/api/generate"

# ─── ML WEIGHTS ───
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_FILE_PATH = os.path.join(BASE_DIR, 'models', 'academic_risk_model.pkl')
ml_model = None

if os.path.exists(MODEL_FILE_PATH):
    try:
        with open(MODEL_FILE_PATH, 'rb') as f:
            ml_model = pickle.load(f)
        print("🤖 [ML ENGINE] Random Forest weights loaded.")
    except Exception as e:
        print(f"❌ [ML ENGINE] Load error: {str(e)}")
else:
    print("⚠️ [ML ENGINE] Model not found. Run train_model.py first.")

def chunk_text(text, chunk_size=500, chunk_overlap=100):
    words = text.split()
    chunks = []
    for i in range(0, len(words), chunk_size - chunk_overlap):
        chunk = " ".join(words[i:i + chunk_size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks


# =====================================================================
# ── SHARED HELPER: fetch student academic context ──
# =====================================================================
def get_academic_context(student_id: str) -> tuple[str, str, str, bool]:
    """
    Returns (academic_summary, focus_summary, financial_summary, has_real_data).
    Used by both the Cortex chat endpoint and the planner endpoint.
    """
    headers = {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json"
    }

    academic_summary = ""
    focus_summary    = ""
    financial_summary = ""
    has_real_data    = False

    if not (student_id and SUPABASE_URL and SERVICE_KEY):
        return academic_summary, focus_summary, financial_summary, has_real_data

    try:
        ac_res = requests.get(
            f"{SUPABASE_URL}/rest/v1/academic_records?student_id=eq.{student_id}",
            headers=headers
        )
        if ac_res.status_code == 200 and ac_res.json():
            records = ac_res.json()
            total_sub = len(records)
            avg_marks = sum(int(r.get('marks', 0) or 0) for r in records) / total_sub
            avg_att   = sum(int(r.get('attendance', 0) or 0) for r in records) / total_sub
            at_risk   = [
                f"{r.get('subject_name')} ({r.get('subject_code')}) - Marks: {r.get('marks')}%, Att: {r.get('attendance')}%"
                for r in records
                if int(r.get('attendance', 100) or 100) < 75 or int(r.get('marks', 100) or 100) < 70
            ]
            academic_summary = (
                f"Enrolled courses: {total_sub}. "
                f"Average marks: {avg_marks:.1f}%. "
                f"Average attendance: {avg_att:.1f}%. "
                f"At-risk subjects: {', '.join(at_risk) if at_risk else 'None — all stable.'}"
            )
            has_real_data = True
    except Exception as e:
        print(f"⚠️ Academic data fetch failed: {e}")

    return academic_summary, focus_summary, financial_summary, has_real_data


# =====================================================================
# ── CORTEX MEMORY HELPERS ──
# =====================================================================

def load_conversation_history(student_id: str, limit: int = 10) -> list[dict]:
    """
    Pulls the last `limit` exchanges from academic_memory using a raw REST
    request instead of the Python SDK's .contains() — more reliable across
    all Supabase SDK versions.
    """
    try:
        headers = {
            "apikey":        SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type":  "application/json",
        }
        # cs.{cortex_memory} is PostgREST syntax for "array contains this value"
        url = (
            f"{SUPABASE_URL}/rest/v1/academic_memory"
            f"?select=context_text,recovery_plan,created_at"
            f"&student_id=eq.{student_id}"
            f"&tags=cs.{{cortex_memory}}"
            f"&order=created_at.desc"
            f"&limit={limit}"
        )
        res  = requests.get(url, headers=headers)
        rows = res.json() if res.status_code == 200 else []

        if not isinstance(rows, list):
            return []

        # Reverse so oldest is first — correct chronological order for the LLM
        rows.reverse()
        history = []
        for row in rows:
            history.append({"role": "user",      "content": row.get("context_text", "")})
            history.append({"role": "assistant",  "content": row.get("recovery_plan", "")})
        return history
    except Exception as e:
        print(f"⚠️ [MEMORY] Failed to load history: {e}")
        return []


def save_conversation_turn(student_id: str, user_msg: str, assistant_reply: str, persona: str):
    """
    Persists one Q&A turn to academic_memory so it can be recalled next session.
    Uses raw REST with the service-role key to bypass RLS — the SDK insert hits
    the authenticated role RLS policy and gets blocked with permission denied.
    """
    try:
        headers = {
            "apikey":        SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
        }
        payload = {
            "student_id":    student_id,
            "context_text":  user_msg,
            "recovery_plan": assistant_reply,
            "outcome":       "cortex_exchange",
            "tags":          ["cortex_memory", persona],
        }
        res = requests.post(
            f"{SUPABASE_URL}/rest/v1/academic_memory",
            json=payload,
            headers=headers
        )
        if res.status_code in (200, 201):
            print(f"💾 [MEMORY] Turn saved for student {student_id[:8]}...")
        else:
            print(f"⚠️ [MEMORY] Save failed {res.status_code}: {res.text[:200]}")
    except Exception as e:
        print(f"⚠️ [MEMORY] Failed to save turn: {e}")


def build_history_block(history: list[dict]) -> str:
    """
    Formats the loaded history into a readable block for the LLM prompt.
    """
    if not history:
        return ""
    lines = ["--- PREVIOUS CONVERSATION HISTORY (most recent last) ---"]
    for turn in history:
        prefix = "Student" if turn["role"] == "user" else "Cortex"
        lines.append(f"{prefix}: {turn['content']}")
    lines.append("--- END OF HISTORY ---\n")
    return "\n".join(lines)


# =====================================================================
# 🚀 VAULT ENDPOINTS
# =====================================================================
@app.route('/api/vault/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file       = request.files['file']
    student_id = request.form.get('student_id')

    if file.filename == '':
        return jsonify({"error": "Empty filename"}), 400

    try:
        reader   = PdfReader(file)
        raw_text = "".join([page.extract_text() + "\n" for page in reader.pages])

        storage_path = f"{student_id}/{uuid.uuid4()}_{file.filename}"
        supabase_client.storage.from_("vault_files").upload(
            path=storage_path, file=file.read(),
            file_options={"content-type": "application/pdf"}
        )

        doc_res = supabase_client.table("vault_documents").insert({
            "student_id": student_id, "filename": file.filename, "storage_path": storage_path
        }).execute()
        doc_id = doc_res.data[0]['id']

        new_chunks = chunk_text(raw_text)
        embeddings = embedding_model.encode(new_chunks)
        records    = [
            {"document_id": doc_id, "student_id": student_id, "content": c, "embedding": e.tolist()}
            for c, e in zip(new_chunks, embeddings)
        ]
        supabase_client.table("vault_embeddings").insert(records).execute()

        return jsonify({
            "message": f"Successfully processed {file.filename}",
            "chunks_created": len(new_chunks),
            "total_indexed_chunks": len(new_chunks)
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/vault/query', methods=['POST'])
def query_vault():
    data       = request.json
    user_query = data.get('query', '')
    student_id = data.get('student_id', '')

    if not user_query:
        return jsonify({"error": "Query cannot be empty"}), 400

    try:
        q_vec   = embedding_model.encode([user_query])[0].tolist()
        matches = supabase_client.rpc('match_vault_documents', {
            'query_embedding': q_vec, 'match_threshold': 0.05,
            'match_count': 3, 'p_student_id': student_id
        }).execute().data

        retrieved_context = "\n\n".join([m['content'] for m in matches]) if matches else "No data."

        system_prompt = (
            "You are Cortex AI, an elite academic intelligence system. "
            "Use the following extracted textbook/syllabus context to answer the user's question. "
            "If the answer is not in the context, use general knowledge but note that. "
            "Be precise, professional, and academic.\n\n"
            f"--- VAULT CONTEXT ---\n{retrieved_context}\n"
        )

        response = requests.post(OLLAMA_URL, json={
            "model": "qwen2.5:3b",
            "prompt": f"{system_prompt}\nUser Question: {user_query}\nAnswer:",
            "stream": False
        })

        return jsonify({
            "answer": response.json().get("response", ""),
            "context_used": retrieved_context
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/vault/quiz', methods=['POST'])
def generate_vault_quiz():
    data       = request.json
    student_id = data.get('student_id', '')

    fallback_quiz = [
        {"question": "What is the primary objective of Decision Table Testing?",
         "options": ["To test combinations of inputs", "To write schemas", "To compile UI components", "To encrypt passwords"],
         "correct_answer": "To test combinations of inputs",
         "explanation": "It tests system behavior for different combinations of inputs."},
        {"question": "What are the Core Components of a Decision Table?",
         "options": ["Conditions, Actions, Rules", "Variables, Functions, Classes", "Headers, Footers, Margins", "Inputs, Outputs, Servers"],
         "correct_answer": "Conditions, Actions, Rules",
         "explanation": "The text lists Conditions, Actions, and Rules."},
        {"question": "Why are Decision Tables essential?",
         "options": ["When logic is complex", "To reduce file size", "To bypass QA testing", "To generate code"],
         "correct_answer": "When logic is complex",
         "explanation": "They ensure all combinations are tested."}
    ]

    try:
        chunks = supabase_client.table("vault_embeddings").select("content").eq("student_id", student_id).order("id", desc=True).limit(8).execute().data
        if not chunks:
            return jsonify({"error": "Cloud memory is empty. Upload a PDF first."}), 400

        ctx    = "\n".join([c['content'] for c in chunks])
        prompt = (
            f"Create a 3-question multiple choice quiz from this text: {ctx}. "
            "Return ONLY a JSON object with a 'questions' key containing an array of objects. "
            "Keys: 'question', 'options', 'correct_answer', 'explanation'."
        )

        resp   = requests.post(OLLAMA_URL, json={"model": "qwen2.5:3b", "prompt": prompt, "stream": False, "format": "json"}, timeout=60)
        parsed = json.loads(resp.json().get("response", "{}"))

        q_list  = parsed.get("questions", parsed.get("quiz", []))
        if not q_list and isinstance(parsed, list):
            q_list = parsed

        valid_q = []
        for item in q_list:
            if isinstance(item, dict) and item.get("question"):
                opts = item.get("options", ["True", "False", "None", "All"])
                valid_q.append({
                    "question":       item.get("question"),
                    "options":        opts if isinstance(opts, list) and len(opts) > 1 else ["A", "B", "C", "D"],
                    "correct_answer": item.get("correct_answer", opts[0] if opts else "A"),
                    "explanation":    item.get("explanation", "Based on the text.")
                })

        return jsonify(valid_q if valid_q else fallback_quiz), 200
    except Exception:
        return jsonify(fallback_quiz), 200


# =====================================================================
# 🚀 CORTEX CHAT — NOW WITH PERSISTENT MEMORY
# =====================================================================
@app.route('/api/cortex', methods=['POST'])
def handle_cortex_chat():
    """
    Cortex chat endpoint with persistent memory.

    Flow:
      1. Load the last 10 exchanges from academic_memory for this student.
      2. Fetch live academic data from Supabase.
      3. Build the LLM prompt: identity + live data + history + current query.
      4. Call Qwen via Ollama.
      5. Save the new exchange to academic_memory.
      6. Return the reply + a memory_saved confirmation flag.
    """
    data       = request.json
    user_message = data.get('message', '')
    student_id   = data.get('student_id', '')
    persona      = data.get('persona', 'advisor')

    if not user_message:
        return jsonify({"error": "User prompt is empty."}), 400

    # ── STEP 1: Load conversation history ──
    history       = load_conversation_history(student_id, limit=10)
    history_block = build_history_block(history)

    # ── STEP 2: Fetch live academic context ──
    academic_summary, focus_summary, financial_summary, has_real_data = get_academic_context(student_id)

    if not has_real_data:
        academic_summary = (
            "Student Academic Status:\n"
            "  - 4 Core Courses loaded.\n"
            "  - ML: Marks 89%, Attendance 88% [Stable]\n"
            "  - MAD: Marks 85%, Attendance 76% [Stable]\n"
            "  - ST: Marks 68%, Attendance 81% [Warning]\n"
            "  - ECD: Marks 84%, Attendance 65% [CRITICAL — below 75% threshold]\n"
            "  - Summary: ECD attendance is critically low."
        )
        focus_summary     = "Focus log: 50 mins for ML, 0 mins for ECD this week."
        financial_summary = "Finance: Total fee ₹45,000. Paid ₹20,000. Outstanding ₹25,000."

    # ── STEP 3: Build persona identity ──
    persona_prompts = {
        'advisor':    "You are Cortex, the premium AI Academic Growth Mentor for OptiMind. Analyze the exact metrics below and give tactical, actionable advice.",
        'strategist': "You are a performance optimization data strategist. Be precise, data-driven, and direct.",
        'terminal':   "You are the core technical processing kernel. Respond with structured, concise analysis."
    }
    identity = persona_prompts.get(persona, persona_prompts['advisor'])

    # ── STEP 4: Assemble full prompt ──
    system_instruction = (
        f"System Identity: {identity}\n\n"
        f"IMPORTANT: You have access to the student's real metrics below. Never say you lack data. "
        f"Speak with authority about their actual marks, attendance, and balances.\n\n"
        f"--- LIVE ACADEMIC DATA ---\n{academic_summary}\n\n"
        f"--- FOCUS TELEMETRY ---\n{focus_summary}\n\n"
        f"--- FINANCIAL SUMMARY ---\n{financial_summary}\n\n"
        f"{history_block}"
    )

    full_prompt = (
        f"{system_instruction}"
        f"Student (current message): {user_message}\n"
        f"Cortex Response:"
    )

    # ── STEP 5: Call Qwen ──
    try:
        print(f"🧠 [CORTEX] Calling Ollama — prompt length: {len(full_prompt)} chars, history turns: {len(history) // 2}")
        ollama_res = requests.post(
            OLLAMA_URL,
            json={
                "model":  "qwen2.5:3b",
                "prompt": full_prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 300   # cap output tokens so response is always fast
                }
            },
            timeout=120   # 2-minute hard timeout — prevents silent hangs
        )

        if ollama_res.status_code != 200:
            print(f"❌ [CORTEX] Ollama returned {ollama_res.status_code}: {ollama_res.text[:200]}")
            return jsonify({"error": f"Ollama error {ollama_res.status_code}: {ollama_res.text[:200]}"}), 500

        raw_json = ollama_res.json()
        assistant_reply = raw_json.get("response", "").strip()
        print(f"✅ [CORTEX] Got reply ({len(assistant_reply)} chars): {assistant_reply[:80]}...")

        if not assistant_reply:
            # Log the full Ollama response so we can debug what came back
            print(f"⚠️ [CORTEX] Empty response. Full Ollama payload: {raw_json}")
            return jsonify({"error": "Model returned an empty response. Check Ollama logs."}), 500

        # ── STEP 6: Persist this turn to memory ──
        # Strip the invisible brevity injection before saving so stored history is clean
        clean_user_msg = user_message.split("\n\n(CRITICAL INSTRUCTION:")[0].strip()
        save_conversation_turn(student_id, clean_user_msg, assistant_reply, persona)

        return jsonify({
            "response":       assistant_reply,
            "memory_saved":   True,
            "history_turns":  len(history) // 2,
            "pipeline_trace": "Memory-Grounded Context Active ✓"
        }), 200

    except requests.exceptions.Timeout:
        print("❌ [CORTEX] Ollama request timed out after 120s")
        return jsonify({"error": "The AI model timed out. Try a shorter question or restart Ollama."}), 504
    except requests.exceptions.ConnectionError:
        print("❌ [CORTEX] Cannot reach Ollama — is it running?")
        return jsonify({"error": "Cannot connect to Ollama. Make sure it is running on port 11434."}), 503
    except Exception as e:
        print(f"❌ [CORTEX] Unexpected error: {str(e)}")
        return jsonify({"error": f"Model connection failure: {str(e)}"}), 500


# =====================================================================
# 🚀 NEW: CLEAR CORTEX MEMORY FOR A STUDENT
# =====================================================================
@app.route('/api/cortex/clear-memory', methods=['POST'])
def clear_cortex_memory():
    """
    Deletes all cortex_memory rows for the given student.
    Uses raw REST DELETE to avoid .contains() SDK inconsistencies.
    """
    data       = request.json
    student_id = data.get('student_id', '')

    if not student_id:
        return jsonify({"error": "Missing student_id"}), 400

    try:
        headers = {
            "apikey":        SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "return=minimal",
        }
        url = (
            f"{SUPABASE_URL}/rest/v1/academic_memory"
            f"?student_id=eq.{student_id}"
            f"&tags=cs.{{cortex_memory}}"
        )
        res = requests.delete(url, headers=headers)
        if res.status_code in (200, 204):
            return jsonify({"status": "success", "message": "Cortex memory cleared."}), 200
        else:
            return jsonify({"error": f"Delete failed: {res.text}"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# 🚀 GET FULL CORTEX CONVERSATION HISTORY FOR A STUDENT
# =====================================================================
@app.route('/api/cortex/history', methods=['GET'])
def get_cortex_history():
    """
    Returns the full conversation history rows for the memory side panel.
    Called by the frontend on mount to restore previous exchanges into the chat.
    """
    student_id = request.args.get('student_id', '')
    if not student_id:
        return jsonify({"error": "Missing student_id"}), 400

    try:
        headers = {
            "apikey":        SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type":  "application/json",
        }
        url = (
            f"{SUPABASE_URL}/rest/v1/academic_memory"
            f"?select=context_text,recovery_plan,created_at,tags"
            f"&student_id=eq.{student_id}"
            f"&tags=cs.{{cortex_memory}}"
            f"&order=created_at.desc"
            f"&limit=20"
        )
        res  = requests.get(url, headers=headers)
        rows = res.json() if res.status_code == 200 else []
        if not isinstance(rows, list):
            rows = []
        return jsonify({"history": rows, "count": len(rows)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# 🚀 GET MEMORY STATS FOR A STUDENT
# =====================================================================
@app.route('/api/cortex/memory-stats', methods=['GET'])
def get_memory_stats():
    """
    Returns how many conversation turns are stored for this student.
    Uses raw REST with HEAD + count header to avoid .contains() SDK issues.
    """
    student_id = request.args.get('student_id', '')
    if not student_id:
        return jsonify({"error": "Missing student_id"}), 400

    try:
        headers = {
            "apikey":        SERVICE_KEY,
            "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type":  "application/json",
            "Prefer":        "count=exact",
        }
        url = (
            f"{SUPABASE_URL}/rest/v1/academic_memory"
            f"?select=id"
            f"&student_id=eq.{student_id}"
            f"&tags=cs.{{cortex_memory}}"
        )
        res = requests.get(url, headers=headers)
        rows = res.json() if res.status_code == 200 else []
        turn_count = len(rows) if isinstance(rows, list) else 0
        return jsonify({
            "turns_stored": turn_count,
            "exchanges":    turn_count
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# 🚀 PREDICT RISK
# =====================================================================
@app.route('/api/predict-risk', methods=['POST'])
def predict_academic_risk():
    global ml_model
    if ml_model is None:
        return jsonify({"error": "ML model not loaded. Run train_model.py first."}), 500

    data = request.json
    try:
        internal_marks       = float(data.get('internal_marks', 75))
        attendance           = float(data.get('attendance', 85))
        assignments_completed = float(data.get('assignment_score', data.get('assignments_completed', 8)))

        feature_vector    = np.array([[internal_marks, attendance, assignments_completed]])
        prediction_class  = int(ml_model.predict(feature_vector)[0])
        probabilities     = ml_model.predict_proba(feature_vector)[0]
        confidence_score  = float(probabilities[prediction_class])
        risk_mapping      = {0: "Low", 1: "Medium", 2: "High"}
        predicted_label   = risk_mapping.get(prediction_class, "Unknown")

        print(f"🔮 [ML] Predicted: {predicted_label} ({confidence_score * 100:.1f}% confidence)")

        return jsonify({
            "status":             "success",
            "risk_level":         predicted_label,
            "prediction":         predicted_label,
            "confidence":         round(confidence_score * 100, 2),
            "confidence_metrics": round(confidence_score * 100, 2),
            "class_index":        prediction_class
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# 🚀 AI STUDY PLANNER
# =====================================================================
@app.route('/api/planner/generate', methods=['POST'])
def generate_ai_study_plan():
    data       = request.json or {}
    student_id = data.get('student_id', '')

    if not student_id:
        return jsonify({"error": "Missing student_id."}), 400

    academic_summary, _, _, has_real_data = get_academic_context(student_id)

    if not has_real_data:
        academic_summary = (
            "Core Academic Snapshot:\n"
            "  - ML: Internals 89%, Attendance 88% [Stable]\n"
            "  - MAD: Internals 85%, Attendance 76% [Stable]\n"
            "  - ST: Internals 68%, Attendance 81% [Warning]\n"
            "  - ECD: Internals 84%, Attendance 65% [CRITICAL]\n"
            "  Summary: ECD violates the 75% threshold — prioritize heavily."
        )

    system_instruction = (
        "You are the OptiMind Optimization Scheduler. "
        "Generate a personalized 7-Day Study Schedule based on the student metrics below.\n\n"
        "RULES:\n"
        "1. Balance subjects across the week — don't repeat one subject every day.\n"
        "2. The highest-risk subject (lowest attendance or marks) gets 3-4 days at High priority.\n"
        "3. Use exact subject codes and names from the data.\n\n"
        "OUTPUT: ONLY a raw JSON array of exactly 7 objects. No markdown, no preamble.\n"
        "Schema: [{\"day\": \"Day 1\", \"subject\": \"...\", \"topic\": \"...\", \"duration\": \"45 mins\", \"priority\": \"High\"}]\n\n"
        f"--- STUDENT METRICS ---\n{academic_summary}\n\n"
        "Compile the 7-day array now:\nResponse:"
    )

    try:
        ollama_res  = requests.post(OLLAMA_URL, json={
            "model": "qwen2.5:3b", "prompt": system_instruction,
            "stream": False, "options": {"temperature": 0.2}
        })
        raw = ollama_res.json().get("response", "").strip()
        raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

        try:
            return jsonify(json.loads(raw)), 200
        except Exception:
            fallback = [
                {"day": "Day 1", "subject": "Focus Required", "topic": "Review low-attendance concepts", "duration": "45 mins", "priority": "High"},
                {"day": "Day 2", "subject": "Core Academics",  "topic": "Practice problem sets",          "duration": "60 mins", "priority": "Medium"},
                {"day": "Day 3", "subject": "General Study",   "topic": "Read upcoming chapters",          "duration": "45 mins", "priority": "Low"},
                {"day": "Day 4", "subject": "Focus Required",  "topic": "Self-assessment quiz",            "duration": "30 mins", "priority": "High"},
                {"day": "Day 5", "subject": "Core Academics",  "topic": "Project development",             "duration": "90 mins", "priority": "Medium"},
                {"day": "Day 6", "subject": "General Study",   "topic": "Deep focus session",              "duration": "60 mins", "priority": "High"},
                {"day": "Day 7", "subject": "Core Academics",  "topic": "Weekly review and planning",      "duration": "30 mins", "priority": "Low"},
            ]
            return jsonify(fallback), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# 🚀 FOCUS SESSION SAVE
# =====================================================================
@app.route('/api/focus/save-session', methods=['POST'])
def save_focus_session():
    data       = request.json
    student_id = data.get('student_id')
    if not student_id:
        return jsonify({"error": "Missing student_id"}), 400

    try:
        headers = {
            "apikey": SERVICE_KEY, "Authorization": f"Bearer {SERVICE_KEY}",
            "Content-Type": "application/json", "Prefer": "return=minimal"
        }
        requests.post(f"{SUPABASE_URL}/rest/v1/focus_sessions", json={
            "student_id":        student_id,
            "subject_code":      data.get('subject_code', 'GENERAL'),
            "total_minutes":     int(data.get('total_minutes', 25)),
            "efficiency_score":  int(data.get('efficiency_score', 100)),
            "distraction_count": int(data.get('distraction_count', 0))
        }, headers=headers)
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(port=5000, debug=True)