# app.py
from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
import os, time, traceback, json, threading
import openai
import azure.cognitiveservices.speech as speechsdk
from openai import AzureOpenAI
from pydub import AudioSegment
from pydub.silence import split_on_silence
from io import BytesIO
import cv2
import mediapipe as mp
from datetime import datetime
import uuid
from dotenv import load_dotenv
from azure.cosmos import CosmosClient
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from azure.cosmos.exceptions import CosmosResourceExistsError
import sys
import traceback
import re



# ✅ Add this line just below all imports
import logging
logging.basicConfig(filename="debug.log", level=logging.DEBUG)
# --- App Initialization ---
app = Flask(__name__, static_folder="dist", static_url_path="/")
CORS(app)

# Load environment variables
load_dotenv()
# At app startup




# now pull it in from env
JWT_SECRET    = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
# --- Azure Cosmos DB Setup ---
# COSMOS_CONN_STR = os.getenv("COSMOS_CONN_STR")
# client = MongoClient(COSMOS_CONN_STR)
# db = client["General-db"]
# chat_sessions = db["Chats"]  # Collection for chat history

endpoint = os.getenv("COSMOS_DB_URI")  # Or COSMOS_CONN_STR.split("AccountEndpoint=")[1].split(";")[0]
key = os.getenv("COSMOS_DB_KEY")

client = CosmosClient(endpoint, credential=key)
# Add this:
app_db   = client.get_database_client("General-db")
chat_sessions     = app_db.get_container_client("ChatsV2")
explain_sessions  = app_db.get_container_client("ExplainSessions")


# Create or access a container (table)
# …but pull your users out of the UserAuthDB database
auth_db          = client.get_database_client("UserAuthDB")
users_container  = auth_db.get_container_client("Users")

# --- Azure Speech config ---
SPEECH_KEY = os.getenv("SPEECH_KEY")
SPEECH_ENDPOINT = os.getenv("SPEECH_ENDPOINT")

# --- Azure OpenAI config ---
openai.api_type = "azure"
openai.api_base = os.getenv("AZURE_OPENAI_ENDPOINT")
openai.api_version = os.getenv("OPENAI_API_VERSION")
openai.api_key = os.getenv("AZURE_OPENAI_KEY")
GPT_DEPLOYMENT_NAME = os.getenv("GPT_DEPLOYMENT_NAME")

# --- MediaPipe setup for Body Language ---
mp_holistic  = mp.solutions.holistic
mp_face_mesh = mp.solutions.face_mesh
mp_drawing   = mp.solutions.drawing_utils

# Metrics globals for body tracking
cap = None
frame_lock = threading.Lock()
frame_count     = 0
upright_count   = 0
nod_count       = 0
last_nod_y      = None
hand_gesture_ct = 0
last_frame = None

def camera_worker_loop():
    global cap, frame_count, upright_count, nod_count, last_nod_y, hand_gesture_ct, last_frame
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("❌ Webcam not accessible.")
        return

    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        refine_face_landmarks=True
    )

    while True:
        success, frame = cap.read()
        if not success:
            continue

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = holistic.process(image)

        annotated = frame.copy()
        if results.pose_landmarks:
            mp_drawing.draw_landmarks(annotated, results.pose_landmarks, mp_holistic.POSE_CONNECTIONS)
        if results.face_landmarks:
            mp_drawing.draw_landmarks(annotated, results.face_landmarks, mp_face_mesh.FACEMESH_TESSELATION)
        if results.left_hand_landmarks:
            mp_drawing.draw_landmarks(annotated, results.left_hand_landmarks, mp_holistic.HAND_CONNECTIONS)
        if results.right_hand_landmarks:
            mp_drawing.draw_landmarks(annotated, results.right_hand_landmarks, mp_holistic.HAND_CONNECTIONS)

        with frame_lock:
            frame_count += 1
            last_frame = annotated

            if results.pose_landmarks:
                l = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.LEFT_SHOULDER]
                r = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.RIGHT_SHOULDER]
                if abs(l.y - r.y) < 0.02:
                    upright_count += 1

                nose_y = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.NOSE].y
                if last_nod_y is not None and (last_nod_y - nose_y) > 0.03:
                    nod_count += 1
                last_nod_y = nose_y

            if results.left_hand_landmarks or results.right_hand_landmarks:
                hand_gesture_ct += 1

        time.sleep(1 / 30)  # ~30 FPS

# ✅ Background thread starter: call once before first request
camera_thread_started = False
camera_thread_lock = threading.Lock()

def ensure_camera_thread_running():
    global camera_thread_started
    with camera_thread_lock:
        if not camera_thread_started:
            print("📹 Starting camera thread...")
            threading.Thread(target=camera_worker_loop, daemon=True).start()
            camera_thread_started = True


# ===== COSMOS DB CHAT HISTORY INTEGRATION =====
def generate_chat_title(transcript: str) -> str:
    """Generate a title from transcript's first meaningful sentence"""
    first_part = transcript.split('.')[0][:50]
    return f"Chat: {first_part}..."

# after (Cosmos style)
# create a new session (only if you want to allow collisions you can catch the exception)
def create_chat_session(transcript, mode, audience_level, session_id=None):
    session_id = session_id or str(uuid.uuid4())
    try:
        chat_sessions.create_item({
        "id": session_id,
        "sessionId": session_id,
        "title": generate_chat_title(transcript),
        "mode": mode,
        "audience_level": audience_level,
        "messages": [],
        "created_at": datetime.utcnow().isoformat() + "Z",
        "last_updated": datetime.utcnow().isoformat() + "Z"
    })
    except CosmosResourceExistsError:
        print(f"[⚠] Session with id {session_id} already exists. Skipping creation.")
    return session_id


# helper to fetch a session (or None)
def get_chat_history(session_id: str) -> dict | None:
    try:
        item = chat_sessions.read_item(item=session_id, partition_key=session_id)
    except CosmosResourceNotFoundError:
        return None
    # you can safely assume these keys exist now
    return {
        "id":           item["id"],
        "title":        item.get("title"),
        "mode":         item.get("mode"),
        "messages":     item.get("messages", []),
        "last_updated": item.get("last_updated"),
    }

def update_chat_session(session_id: str, message: dict, feedback: dict | None = None):
    try:
        session = chat_sessions.read_item(item=session_id, partition_key=session_id)
    except CosmosResourceNotFoundError:
        # start a fresh document if it didn't exist yet
        session = {
            "id":           session_id,
            "messages":     [],
            "created_at":   datetime.utcnow().isoformat() + "Z"
        }

    # now append & upsert
    session.setdefault("messages", []).append(message)
    session["last_updated"] = datetime.utcnow().isoformat() + "Z"
    if feedback:
        session["feedback"] = feedback

    chat_sessions.upsert_item(body=session)


# ---- Explain Session DB Functions ----

from azure.cosmos.exceptions import CosmosResourceExistsError

def create_explain_session(session_id: str):
    """Initialize a new Explain Mode session in CosmosDB"""
    try:
        explain_sessions.create_item(body={
            "id": session_id,
            "sessionId": session_id,
            "question_index": 0,
            "pending_questions": [],
            "teacher_responses": [],
            "created_at": datetime.utcnow().isoformat() + "Z",
            "last_updated": datetime.utcnow().isoformat() + "Z"
        })
    except CosmosResourceExistsError:
        print(f"[⚠] Explain session with id {session_id} already exists. Skipping creation.")



def get_explain_session(session_id: str) -> dict:
    """Retrieve an Explain Mode session"""
    try:
        return explain_sessions.read_item(
            item=session_id,
            partition_key=session_id
        )
    except Exception:
        return None


def update_explain_session(session_id: str, update_data: dict):
    # Try to fetch an existing doc, but if it doesn't exist we'll start a new one
    existing = get_explain_session(session_id) or {}
    # Build a full session body
    session = {
        "id": session_id,
        # carry forward any previously stored fields
        **existing,
        **update_data,
        "last_updated": datetime.utcnow().isoformat() + "Z"
    }
    explain_sessions.upsert_item(body=session)


# ----------------- TTS Endpoints -----------------
def azure_transcribe(path: str) -> str:
    done = False
    texts: list[str] = []
    def on_final(evt):
        texts.append(evt.result.text)
    def on_done(evt):
        nonlocal done
        done = True
    cfg = speechsdk.SpeechConfig(subscription=SPEECH_KEY, endpoint=SPEECH_ENDPOINT)
    aud = speechsdk.audio.AudioConfig(filename=path)
    rec = speechsdk.SpeechRecognizer(speech_config=cfg, audio_config=aud)
    rec.recognized.connect(on_final)
    rec.session_stopped.connect(on_done)
    rec.canceled.connect(on_done)
    rec.start_continuous_recognition()
    while not done:
        time.sleep(0.2)
    rec.stop_continuous_recognition()
    return " ".join(texts)

@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio_only():
    try:
        if "audio" not in request.files:
            return jsonify({"error": "No audio file uploaded."}), 400

        audio_file = request.files["audio"]

        if audio_file.filename == "":
            return jsonify({"error": "Empty filename."}), 400

        raw_bytes = audio_file.read()

        if not raw_bytes:
            return jsonify({"error": "Uploaded file is empty."}), 400

        audio_seg = AudioSegment.from_file(BytesIO(raw_bytes))

        chunks = split_on_silence(
            audio_seg,
            min_silence_len=500,
            silence_thresh=audio_seg.dBFS - 16,
            keep_silence=250
        )

        pieces: list[str] = []
        for i, chunk in enumerate(chunks):
            fname = f"chunk_{i}.wav"
            chunk.export(fname, format="wav")
            text = azure_transcribe(fname).strip()
            if text:
                pieces.append(text)
            if i < len(chunks) - 1:
                pieces.append("[silence]")

        transcript = " ".join(pieces).strip()

        if not transcript:
            return jsonify({"error": "No speech detected. Please speak clearly."}), 400

        return jsonify({"transcript": transcript})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/api/analyze", methods=["POST"])
def analyze_audio():
    try:
        payload = request.get_json() if request.is_json else {}
        session_id = payload.get("sessionId")
        audience_level = payload.get("audienceLevel", "Beginner")
        mode = payload.get("mode", "Presentation")
        final_transcript = payload.get("message", "")

        if not session_id:
            return jsonify({"error": "Missing sessionId"}), 400

        # 🔥 Auto-create when missing
        session_chat = get_chat_history(session_id)

        if not session_chat:
            _ = create_chat_session(
                transcript=final_transcript,
                mode=mode,
                audience_level=audience_level,
                session_id=session_id
            )

        
        
        # 3) Record user’s message
        update_chat_session(
            session_id,
            {
                "type": "user",
                "content": final_transcript,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
        )
        client = AzureOpenAI(
            api_key=openai.api_key,
            api_version=openai.api_version,
            azure_endpoint=openai.api_base,
        )

        if mode == "Explain":
            text = final_transcript.strip()

            # ⬅️ Only run this block if it's a summarize request
            if payload.get("summarize"):
                session_chat = get_chat_history(session_id)
                if session_chat is None:
                    return jsonify({"error": "No chat session found for summary."}), 500

                all_messages = session_chat.get("messages", [])
                teacher_explanation = None
                teacher_explanation = next(
                    (
                        msg["content"].strip()
                        for msg in reversed(all_messages)
                        if (
                            msg["type"] == "user"
                            and not msg["content"].lower().startswith("summarize")
                            and len(msg["content"].strip().split()) > 10  # <- ignore short answers
                        )
                    ),
                    None
                )


                if not teacher_explanation or teacher_explanation.strip().lower() in ["none", "null", ""]:
                    print("⚠️ No valid teacher explanation found before 'summarize'")
                    return jsonify({
                        "error": "No explanation found before summarize command.",
                        "message": "Please provide an explanation before summarizing."
                    }), 200





                qa_pairs = []
                current_q_idx = 0
                for msg in all_messages:
                    if msg["type"] == "assistant" and msg["content"].strip().endswith("?"):
                        question = msg["content"].strip()
                        for next_msg in all_messages:
                            if next_msg["timestamp"] > msg["timestamp"] and next_msg["type"] == "user":
                                answer = next_msg["content"].strip()
                                qa_pairs.append((question, answer))
                                break
                        current_q_idx += 1
                        if current_q_idx >= 3:
                            break

                combined_history = f"Teacher explained:\n{teacher_explanation}\n\n"
                for idx, (q, a) in enumerate(qa_pairs, 1):
                    combined_history += f"Question {idx}: {q}\nAnswer: {a}\n\n"

                summary_prompt = f"""
                You are a {audience_level.lower()} level student summarizing the teacher's explanation.
                You must base your final summary on BOTH the teacher's main explanation and your answers to the three questions.
                Focus on connecting ideas, giving examples, and explaining clearly to a {audience_level.lower()} audience.

                Return ONLY JSON: {{"summary": "...", "keyPoints": ["...", "...", "..."]}}.

                ⚠️ Important: Absolutely no extra commentary, no markdown formatting, no code block fences (no ```), and no explanations.
                Return ONLY the raw JSON object, starting with {{ and ending with }}.
                If you are unsure, return:
                {{
                "summary": "I'm not sure how to summarize this.",
                "keyPoints": ["No questions identified."]
                }}
                """


                print("🧪 DEBUG — Starting summarize block")
                print("🧪 Session ID:", session_id)
                print("🧪 teacher_explanation:", repr(teacher_explanation))
                print("🧪 All messages count:", len(all_messages))

                print("🧪 Combined history being sent to GPT:")
                print(combined_history)
                try:
                    resp = client.chat.completions.create(
                        model=GPT_DEPLOYMENT_NAME,
                        messages=[
                            {"role": "system", "content": summary_prompt},
                            {"role": "user", "content": combined_history}
                        ],
                        temperature=0,
                        max_tokens=500
                    )
                except Exception as e:
                    print("🔴 GPT call failed!")
                    traceback.print_exc(file=sys.stdout)  # ← this shows the error clearly
                    return jsonify({"error": "OpenAI request failed", "details": str(e)}), 500


                raw = resp.choices[0].message.content.strip()
                # Remove markdown fences and "json" tags
                if raw.startswith("```"):
                    raw = raw.strip("```").strip()
                    raw = "\n".join(line for line in raw.splitlines() if not line.strip().startswith("json")).strip()

                # Clean extra trailing characters like a rogue ]
                if raw.endswith("]"):
                    raw = raw[:-1].strip()

                # Fallback: Extract the first valid JSON object using regex
                match = re.search(r'\{[\s\S]+\}', raw)
                if match:
                    raw = match.group(0)

                # Try parsing
                try:
                    data = json.loads(raw)
                    assert isinstance(data, dict), "Not a dict"
                    assert "summary" in data, "Missing summary"
                except Exception as e:
                    print("⚠️ JSON parsing error:", e)
                    print("🔴 Raw returned content:\n", raw)
                    return jsonify({"error": "Model returned invalid or incomplete JSON."}), 500


                update_chat_session(
                    session_id,
                    {"type": "assistant", "content": data["summary"], "timestamp": datetime.utcnow().isoformat() + "Z"},
                    feedback={"questions": data.get("keyPoints", [])}
                )

                return jsonify({
                    "message": data["summary"],
                    "feedback": {"questions": data.get("keyPoints", [])},
                    "sessionId": session_id
                })

            # ⬇️ Continue with normal question flow (Q1–Q3)
            explain_session = get_explain_session(session_id)
            if not explain_session:
                create_explain_session(session_id)
                explain_session = get_explain_session(session_id)

            explain_session = explain_session or {}

            pending = explain_session.get("pending_questions", [])
            current_q = explain_session.get("question_index", 0)
            teacher_responses = explain_session.get("teacher_responses", [])

            if not pending:
                update_explain_session(session_id, {"original_text": text})

                prompt = f"""
                You are a curious student with {audience_level.lower()} level knowledge.
                After hearing the teacher's explanation, ask exactly 3 relevant follow-up questions.
                ⚠️ Important: You must return exactly 3 clear and non-repetitive questions. No less and no more.
                Return ONLY JSON: {{"questions": ["q1", "q2", "q3"]}}.
                """

                resp = client.chat.completions.create(
                    model=GPT_DEPLOYMENT_NAME,
                    messages=[
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": f"Teacher says:\n\n{text}"}
                    ],
                    temperature=0,
                    max_tokens=300
                )
                raw = resp.choices[0].message.content.strip()
                if raw.startswith("```"):
                    raw = "\n".join(raw.split("\n")[1:-1]).strip()
                questions = (json.loads(raw).get("questions") or [])[:3]

                update_explain_session(session_id, {
                    "pending_questions": questions,
                    "teacher_responses": [],
                    "question_index": 0
                })

                first_question = questions[0]
                update_chat_session(
                    session_id,
                    {"type": "assistant", "content": first_question, "timestamp": datetime.utcnow().isoformat() + "Z"}
                )
                return jsonify({
                    "message": first_question,
                    "feedback": {"questions": [first_question]},
                    "sessionId": session_id
                })

            # Answering Q2 and Q3
            teacher_responses = teacher_responses + [text]
            update_explain_session(session_id, {"teacher_responses": teacher_responses})

            if current_q + 1 < len(pending):
                next_q = pending[current_q + 1]
                update_explain_session(session_id, {"question_index": current_q + 1})

                update_chat_session(
                    session_id,
                    {"type": "assistant", "content": next_q, "timestamp": datetime.utcnow().isoformat() + "Z"}
                )
                return jsonify({
                    "message": next_q,
                    "feedback": {"questions": [next_q]},
                    "sessionId": session_id
                })

            # After Q3
            thank_you_message = (
                "Thank you for answering all three questions! 🎉\n"
                "When you're ready for the final summary, please type **summarize**."
            )
            update_explain_session(session_id, {"question_index": current_q + 1})
            update_chat_session(
                session_id,
                {"type": "assistant", "content": thank_you_message, "timestamp": datetime.utcnow().isoformat() + "Z"}
            )
            return jsonify({
                "message": thank_you_message,
                "sessionId": session_id
            })



        elif mode == "Presentation":
            system_prompt = f"""You are an AI presentation coach analyzing a student's transcript.

Context:
- Audience Level: {audience_level}
  Audience Level refers to the expertise level of the listeners and influences how the content should be delivered and reviewed:

  • Beginner:
    - Has little to no prior exposure to the topic.
    - Needs clear definitions, simple explanations, and analogies.
    - Avoids technical jargon unless clearly explained.
    - Example: A high school student learning about AI for the first time.

  • Intermediate:
    - Has some background knowledge or education on the topic.
    - Expects a structured explanation with relevant examples, context, and logical flow.
    - Some technical terms are okay if integrated smoothly.
    - Example: A college undergraduate with introductory coursework in the field.

  • Expert:
    - Highly knowledgeable; often has formal education or professional experience.
    - Expects advanced depth, critical analysis, theoretical insights, and domain-specific vocabulary.
    - Prefers concise yet rich content with minimal simplification.
    - Example: A PhD holder or a subject matter expert attending a technical talk.

- Mode: {mode}

Tasks:
1. Detect filler words (um, uh, like, you know, etc.) and quantify frequency.
2. Identify [silence] markers as hesitations/pauses.
3. Analyze the overall structure: note strengths/weaknesses and propose a clearer outline.
4. Give specific tips to reduce fillers and improve pacing.
5. Generate three tailored comprehension questions for a {audience_level} audience:
   - Beginner: Focus on basic recall, definitions, or simple concepts of the presentation.
   - Intermediate: Test applied understanding or explanation of key points.
   - Expert: Include questions requiring synthesis, critique, or deeper analysis.

6. Adjust the depth and tone of your critique to suit the audience level:
   - Beginner:
     • Provide feedback in a simple, positive, and supportive manner.
     • Focus on building foundational speaking skills (clarity, confidence, pacing).
     • Avoid technical or critical language that might overwhelm the student.
   - Intermediate:
     • Deliver clear and constructive critique that builds on presentation fundamentals.
     • Introduce analytical language and point out logical or structural gaps.
     • Offer practical improvement suggestions.
   - Expert:
     • Use precise, professional, and analytical feedback.
     • Assume familiarity with presentation techniques and content delivery norms.
     • Highlight subtle or high-level presentation weaknesses and refinements.

7. Suggest 1–3 sentences from the student's transcript that could be rephrased, and provide clearer or more professional alternatives.
Tone: Supportive, motivational, and professional. Focus on helping the student improve.

RETURN **ONLY** the raw JSON, with absolutely no explanation, markdown, or extra text.
{{
  "summary": "...",                      // REQUIRED: Summary of the talk
  "clarity": "...",                      // REQUIRED: Clarity feedback
  "pacing": "...",                       // REQUIRED: Pacing feedback
  "structureSuggestions": "...",         // REQUIRED: Suggestions to improve structure
  "deliveryTips": "...",                 // REQUIRED: Tips for delivery
  "questions": ["...", "...", "..."]     // REQUIRED: Comprehension questions
  "rephrasingSuggestions": [
    {{ "original": "...", "suggested": "..." }},
    {{ "original": "...", "suggested": "..." }}
  ]
}}
"""

            resp = client.chat.completions.create(
                model=GPT_DEPLOYMENT_NAME,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Transcript:\n\n{final_transcript}"}
                ],
                temperature=0,
                max_tokens=1000
            )
            raw = resp.choices[0].message.content.strip()
            if raw.startswith("```"):
                raw = "\n".join(raw.split("\n")[1:-1])

            feedback_json = json.loads(raw)
        
            update_chat_session(
                session_id=session_id,
                message={
                    "type": "assistant",
                    "content": feedback_json["summary"],
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                },
                feedback={
                    "clarity": feedback_json["clarity"],
                    "pacing": feedback_json["pacing"],
                    "structure": feedback_json["structureSuggestions"],
                    "deliveryTips": feedback_json["deliveryTips"],
                    "questions": feedback_json["questions"],
                    "rephrasing": feedback_json.get("rephrasingSuggestions", [])
                }
            )
            return jsonify({
                "message": feedback_json.get("summary", ""),
                "feedback": {
                    "clarity": feedback_json.get("clarity", ""),
                    "pacing": feedback_json.get("pacing", ""),
                   "structureSuggestions": [feedback_json.get("structureSuggestions", "")],
                    "deliveryTips": [feedback_json.get("deliveryTips", "")],
                    "questions": feedback_json.get("questions", []),
                    "rephrasingSuggestions": feedback_json.get("rephrasingSuggestions", [])
                }
            })

            

        else:
            return jsonify({ "error": f"Unknown mode {mode}" }), 400

    except Exception as e:
        print("="*30)
        print("🔥 Caught final exception in analyze_audio")
        print("🔥 Exception:", e)
        traceback.print_exc(file=sys.stdout)  # ✅ Shows full traceback
        logging.exception("🔥 Error in /api/analyze:")
        print("="*30)
        return jsonify({ "error": "Internal Server Error", "details": str(e) }), 500





# ----------------- Body Language Endpoints -----------------
# ✅ MJPEG live stream endpoint
@app.route("/api/bodytrack")
def bodytrack():
    def gen_frames():
        global last_frame
        while True:
            with frame_lock:
                frame = last_frame.copy() if last_frame is not None else None
            if frame is None:
                continue
            ret, buf = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + buf.tobytes() + b'\r\n')
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')


# ✅ Metric endpoint (polled every 5s by frontend)
@app.route("/api/bodymetrics")
def bodymetrics():
    global frame_count, upright_count, nod_count, hand_gesture_ct
    with frame_lock:
        fc = frame_count or 1
        up = upright_count
        nd = nod_count
        hg = hand_gesture_ct
        frame_count = 0
        upright_count = 0
        nod_count = 0
        hand_gesture_ct = 0

    posture_score    = int((up / fc) * 100)
    gestures_per_min = int((hg / fc) * 30 * 60)
    nods_per_min     = int((nd / fc) * 30 * 60)

    return jsonify({
        "postureScore": posture_score,
        "handGestureRate": gestures_per_min,
        "headNodCount": nods_per_min,
        "suggestions": [
            "Keep your shoulders level to appear more confident.",
            "Use deliberate hand gestures—aim for about 10–15 per minute.",
            "Avoid excessive head nodding; it can distract your audience."
        ]
    })

# ===== NEW CHAT PANEL ENDPOINTS =====
from azure.cosmos.exceptions import CosmosResourceNotFoundError

@app.route("/api/chats", methods=["GET"])
def list_chat_sessions():
    # pull the 20 most recently‐updated sessions
    query = """
    SELECT c.id, c.sessionId, c.title, c.mode, c.created_at, c.last_updated
    FROM c
    ORDER BY c.last_updated DESC
    OFFSET 0 LIMIT 20
    """

    items = list(
      chat_sessions.query_items(
        query=query,
        enable_cross_partition_query=True
      )
    )
    return jsonify([
      {
        "id":      item["id"],
        "sessionId": item["sessionId"],
        "title":   item["title"],
        "mode":    item["mode"],
        "created": item["created_at"],   # already an ISO string
        "updated": item["last_updated"],
      }
      for item in items
    ])

@app.route("/api/chats/<session_id>", methods=["GET"])
def get_chat_session(session_id: str):
    """Get full chat history for main panel"""
    session = get_chat_history(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    
    return jsonify(session)

@app.route("/api/chats/<session_id>", methods=["DELETE"])
def delete_chat_session(session_id: str):
    try:
        # deletes the item whose /id == session_id
        chat_sessions.delete_item(
          item=session_id,
          partition_key=session_id
        )
        return jsonify({"success": True})
    except CosmosResourceNotFoundError:
        return jsonify({"error": "Session not found"}), 404


# Temporary in-memory users (for demo purposes)
users = {}

@app.route("/api/signup", methods=["POST"])
def signup():
    data     = request.get_json()
    email    = data["email"]
    password = data["password"]

    # 1) create user document
    user_id = str(uuid.uuid4())
    user_doc = {
      "id":       user_id,
      "email":    email,
      "password": generate_password_hash(password),
      # we'll fill in token next…
    }
    users_container.create_item(body=user_doc)

    # 2) build a JWT whose sub=that new user_id
    payload = {"sub": user_id, "email": email}
    token   = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    # 3) persist it on the user record
    user_doc["token"] = token
    users_container.upsert_item(body=user_doc)

    # 4) return it
    return jsonify({"message": "Signup successful!", "token": token}), 200



@app.route("/api/login", methods=["POST"])
def login():
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    # fetch user from Cosmos
    query = f"SELECT * FROM c WHERE c.email = '{email}'"
    users = list(
      users_container.query_items(
        query=query,
        enable_cross_partition_query=True
      )
    )
    if not users or not check_password_hash(users[0]["password"], password):
        return jsonify({"message": "Invalid email or password"}), 401

    user = users[0]

    # pull the token we generated at signup
    token = user.get("token")
    if not token:
        # (in case you’re migrating old users who didn’t get one yet...)
        payload = {"sub": user["id"], "email": user["email"]}
        token   = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        user["token"] = token
        users_container.upsert_item(body=user)

    return jsonify({"message": "Login successful!", "token": token}), 200



# ------------- Serve Frontend -------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True, threaded=False)

