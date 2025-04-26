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

# --- App Initialization ---
app = Flask(__name__, static_folder="../dist", static_url_path="/")
CORS(app)

# --- Azure Speech config ---
SPEECH_KEY      = "DN9sJDTwszwARhRJsodK9ghq0zqsELDFsueMK1MqSCoUdXWx3g3eJQQJ99BDAC5T7U2XJ3w3AAAEACOGeQlJ"
SPEECH_ENDPOINT = "https://neuralnomads-hackathon-stg-frc-ais-01.cognitiveservices.azure.com/"

# --- Azure OpenAI config ---
openai.api_type    = "azure"
openai.api_base    = "https://neuralnomads-hackathon-stg-aoai-sc-01.openai.azure.com/"
openai.api_version = "2023-05-15"
openai.api_key     = "8FxgCGfQiPPExro4qLQwqLerfydkU3CMXzZ0AJpANWnqYrqI3dmMJQQJ99BDACfhMk5XJ3w3AAABACOGvOS6"
GPT_DEPLOYMENT_NAME = "gpt-35-turbo"

# --- MediaPipe setup for Body Language ---
mp_holistic  = mp.solutions.holistic
mp_face_mesh = mp.solutions.face_mesh
mp_drawing   = mp.solutions.drawing_utils

# Metrics globals for body tracking
frame_count     = 0
upright_count   = 0
nod_count       = 0
last_nod_y      = None
hand_gesture_ct = 0
lock            = threading.Lock()

# Session memory for TTS Explain mode
session_memory = {}

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

@app.route("/transcribe", methods=["POST"])
def transcribe_audio_only():
    try:
        audio_file = request.files["audio"]
        raw_bytes  = audio_file.read()
        audio_seg  = AudioSegment.from_file(BytesIO(raw_bytes))

        chunks = split_on_silence(
            audio_seg,
            min_silence_len=500,
            silence_thresh=audio_seg.dBFS-16,
            keep_silence=250
        )

        pieces: list[str] = []
        for i, chunk in enumerate(chunks):
            fname = f"chunk_{i}.wav"
            chunk.export(fname, format="wav")
            text = azure_transcribe(fname).strip()
            if text:
                pieces.append(text)
            if i < len(chunks)-1:
                pieces.append("[silence]")

        return jsonify({ "transcript": " ".join(pieces) })

    except Exception as e:
        traceback.print_exc()
        return jsonify({ "error": str(e) }), 500

@app.route("/analyze", methods=["POST"])
def analyze_audio():
    try:
        if request.is_json:
            payload          = request.get_json()
            final_transcript = payload.get("message", "")
            audience_level   = payload.get("audienceLevel", "Beginner")
            mode             = payload.get("mode", "Presentation")
        else:
            final_transcript = azure_transcribe("temp_dynamic.wav")
            audience_level   = request.form.get("audienceLevel", "Beginner")
            mode             = request.form.get("mode", "Presentation")

        client = AzureOpenAI(
            api_key=openai.api_key,
            api_version=openai.api_version,
            azure_endpoint=openai.api_base,
        )

        if mode == "Explain":
            session_id = payload.get("sessionId", "default")
            text = final_transcript.strip()

            if session_id not in session_memory:
                session_memory[session_id] = {
                    "question_index": 0,
                    "pending_questions": [],
                    "teacher_responses": []
                }

            session = session_memory[session_id]

            if payload.get("summarize", False):
                text = payload.get("transcriptSoFar", "").strip()
                summary_prompt = (
                    f"You are a smart {audience_level.lower()}-level student summarizing what the teacher has explained.\n"
                    "Base your summary on BOTH the original explanation and your own questions + the teacher’s answers.\n"
                    "Return only JSON: {\"summary\": ..., \"keyPoints\": [...]}")

                combined_history = "\n\n".join(session["teacher_responses"])
                messages = [
                    {"role": "system", "content": summary_prompt},
                    {"role": "user", "content": f"My notes and teacher replies:\n\n{combined_history}"}
                ]
                resp = client.chat.completions.create(
                    model=GPT_DEPLOYMENT_NAME,
                    messages=messages,
                    temperature=0,
                    max_tokens=500
                )
                raw = resp.choices[0].message.content.strip()
                if raw.startswith("```"):
                    raw = "\n".join(raw.split("\n")[1:-1])
                data = json.loads(raw)
                return jsonify({
                    "message": data["summary"],
                    "feedback": { "questions": data.get("keyPoints", []) }
                })

            if not session["pending_questions"]:
                prompt = (
                    f"You are a curious student with {audience_level.lower()} level knowledge.\n"
                    "You just listened to a teacher explaining a concept.\n"
                    "Now, you must ask 3 relevant follow-up questions, based on your level of understanding:\n"
                    "- Beginner: Ask simple, basic clarification questions.\n"
                    "- Intermediate: Ask practical or conceptual questions.\n"
                    "- Expert: Ask analytical or critical thinking questions.\n\n"
                    "IMPORTANT: Return ONLY a JSON in this format: {\"questions\": [\"question1\", \"question2\", \"question3\"]}.\n"
                    "DO NOT thank the teacher. DO NOT conclude. JUST ask the 3 questions."
                )

                messages = [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Teacher says:\n\n{text}"}
                ]
                resp = client.chat.completions.create(
                    model=GPT_DEPLOYMENT_NAME,
                    messages=messages,
                    temperature=0,
                    max_tokens=300
                )
                raw = resp.choices[0].message.content.strip()
                if raw.startswith("```"):
                    raw = "\n".join(raw.split("\n")[1:-1])
                data = json.loads(raw)
                session["pending_questions"] = data.get("questions", [])
                session["question_index"] = 1
                session["teacher_responses"] = []

                first_question = session["pending_questions"][0] if session["pending_questions"] else "What would you like to explain?"
                return jsonify({ "message": first_question, "feedback": { "questions": [first_question] }})

            else:
                session["teacher_responses"].append(text)
                q_index = session["question_index"]
                questions = session["pending_questions"]

                if q_index < len(questions):
                    next_q = questions[q_index]
                    session["question_index"] += 1
                    return jsonify({ "message": next_q, "feedback": { "questions": [next_q] }})
                else:
                    thank_prompt = "You’ve now finished your questions. Send a natural, friendly thank-you message to the teacher."
                    messages = [
                        {"role": "system", "content": thank_prompt},
                        {"role": "user", "content": "Wrap up the session."}
                    ]
                    resp = client.chat.completions.create(
                        model=GPT_DEPLOYMENT_NAME,
                        messages=messages,
                        temperature=0.5,
                        max_tokens=60
                    )
                    thank_you = resp.choices[0].message.content.strip()
                    return jsonify({ "message": thank_you, "feedback": { "questions": [] }})

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
            return jsonify({
                "message": feedback_json["summary"],
                "feedback": {
                    "clarity": feedback_json["clarity"],
                    "pacing": feedback_json["pacing"],
                    "structureSuggestions": feedback_json["structureSuggestions"],
                    "deliveryTips": feedback_json["deliveryTips"],
                    "questions": feedback_json["questions"],
                    "rephrasingSuggestions": feedback_json.get("rephrasingSuggestions", [])
                }
            })

        else:
            return jsonify({ "error": f"Unknown mode {mode}" }), 400

    except Exception as e:
        traceback.print_exc()
        return jsonify({ "error": str(e) }), 500

# ----------------- Body Language Endpoints -----------------
@app.route("/bodytrack")
def bodytrack():
    cap = cv2.VideoCapture(0)
    holistic = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        enable_segmentation=False,
        refine_face_landmarks=True
    )

    def gen_frames():
        global frame_count, upright_count, nod_count, last_nod_y, hand_gesture_ct
        while True:
            success, frame = cap.read()
            if not success:
                break

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

            with lock:
                frame_count += 1
                if results.pose_landmarks:
                    l = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.LEFT_SHOULDER]
                    r = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.RIGHT_SHOULDER]
                    if abs(l.y - r.y) < 0.02:
                        upright_count += 1
                if results.pose_landmarks:
                    nose_y = results.pose_landmarks.landmark[mp_holistic.PoseLandmark.NOSE].y
                    if last_nod_y is not None and (last_nod_y - nose_y) > 0.03:
                        nod_count += 1
                    last_nod_y = nose_y
                if results.left_hand_landmarks or results.right_hand_landmarks:
                    hand_gesture_ct += 1

            ret, buf = cv2.imencode('.jpg', annotated)
            if not ret:
                continue
            frame_bytes = buf.tobytes()
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route("/bodymetrics")
def bodymetrics():
    global frame_count, upright_count, nod_count, hand_gesture_ct
    with lock:
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

# ------------- Serve Frontend -------------
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))  # Use Render's port if available
    app.run(host="0.0.0.0", port=port, debug=True)
