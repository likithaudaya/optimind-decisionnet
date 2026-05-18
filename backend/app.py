import os
import pickle
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv

# Load system configuration keys
load_dotenv()

app = Flask(__name__)

# Enable CORS to communicate securely with your React frontend server
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# ── LOAD THE TRAINED ML MODEL LAYER ──
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'risk_classifier.pkl')

try:
    with open(MODEL_PATH, 'rb') as f:
        risk_model = pickle.load(f)
    print("✓ Successfully loaded Random Forest Risk Classifier into memory context.")
except Exception as e:
    risk_model = None
    print(f"⚠️ Model loading error or file missing: {str(e)}")


@app.route('/')
def home():
    return "OptiMind DecisionNet API Server is Running!"


@app.route('/api/health', methods=['GET'])
def health_check():
    """
    Verification ping checkpoint for your React application context
    """
    return jsonify({
        "status": "healthy",
        "engine": "OptiMind Python Core Core",
        "version": "1.0.0",
        "model_loaded": risk_model is not None
    }), 200


@app.route('/api/predict-risk', methods=['POST'])
def predict_academic_risk():
    """
    Processes runtime parameters using the scikit-learn binary
    to output an analytical risk classification.
    """
    if not risk_model:
        return jsonify({"error": "ML model kernel is not initialized on the server."}), 500

    data = request.json or {}
    
    # Extract structural metrics sent by the frontend interface
    try:
        internal_marks = float(data.get('internal_marks', 0))
        attendance = float(data.get('attendance', 0))
        assignment_score = float(data.get('assignment_score', 0))
        
        # Format feature array for Scikit-Learn input mapping requirements
        # Shape must match exactly: [[internal_marks, attendance, assignment_score]]
        features = [[internal_marks, attendance, assignment_score]]
        
        # Execute the classification prediction model
        prediction = risk_model.predict(features)[0]
        
        # Compute alternative test probability arrays to map performance depth indexes
        probabilities = risk_model.predict_proba(features)[0]
        classes = risk_model.classes_
        prob_mapping = {classes[i]: round(probabilities[i] * 100, 2) for i in range(len(classes))}

        return jsonify({
            "status": "success",
            "prediction": prediction,
            "confidence_metrics": prob_mapping,
            "processed_inputs": {
                "internal_marks": internal_marks,
                "attendance": attendance,
                "assignment_score": assignment_score
            }
        }), 200

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Failed to compute operational prediction matrix: {str(e)}"
        }), 400

@app.route('/api/cortex/chat', methods=['POST'])
def cortex_llm_stream():
    """
    Connects directly to your locally running Ollama architecture 
    to process queries via the qwen2.5:3b model engine.
    """
    import requests

    data = request.json or {}
    user_query = data.get("message", "")
    persona = data.get("persona", "advisor")

    if not user_query:
        return jsonify({"status": "error", "message": "Payload query string is empty."}), 400

    # Define system persona configuration prompts to give the AI its unique behavior
    persona_prompts = {
        "advisor": "You are a helpful college academic advisor. Focus on helping the student optimize their marks, balance their attendance constraints, and reduce academic risk indices. Keep answers actionable and encouraging.",
        "tutor": "You are a brilliant computer science teacher. Use the Socratic method to break down complex computing concepts, code logic, or database structures step by step so the student truly understands.",
        "critic": "You are a strict college examiner. Evaluate the user's understanding critically, highlight technical gaps in their logic, and focus on formatting answers precisely for technical university standards."
    }

    system_prompt = persona_prompts.get(persona, persona_prompts["advisor"])

    # Target endpoint mapping to your local Ollama port setup
    ollama_url = "http://localhost:11434/api/generate"
    
    payload = {
        "model": "qwen2.5:3b",
        "prompt": f"System Directive: {system_prompt}\n\nUser Question: {user_query}",
        "stream": False # Set to False to return a single structured JSON block smoothly
    }

    try:
        # Pushing the request straight to your running Ollama engine background service
        response = requests.post(ollama_url, json=payload, timeout=30)
        response_data = response.json()
        ai_response = response_data.get("response", "Inference matrix extraction failure.")

        return jsonify({
            "status": "success",
            "response": ai_response,
            "pipeline": f"Ollama Stream Pipeline · Engine: qwen2.5:3b · Persona: {persona}"
        }), 200

    except requests.exceptions.ConnectionError:
        return jsonify({
            "status": "partial_success",
            "response": f"Cortex UI successfully processed your token strings! However, I couldn't reach Ollama on your system. Make sure you open a terminal and run 'ollama run qwen2.5:3b' to initialize the engine.",
            "pipeline": "Flask Bridge Failure Fallback"
        }), 200
    except Exception as e:
        return jsonify({"status": "error", "message": f"Pipeline failure: {str(e)}"}), 500
def cortex_llm_stream():
    """
    Future home of your local Ollama / Qwen model orchestration endpoint.
    """
    data = request.json or {}
    user_query = data.get("message", "")
    return jsonify({
        "status": "stub_active",
        "response": f"Cortex received target query: '{user_query}'. Local LLM pipeline binding pending.",
        "pipeline": "Mock Stream Active"
    }), 200


if __name__ == '__main__':
    # App running on standard internal development port 5000
    app.run(host='0.0.0.0', port=5000, debug=True)