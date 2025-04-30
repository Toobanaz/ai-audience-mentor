import { AudienceLevel, Feedback, Mode } from '../types';

// Base URL for all API endpoints
const backendUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;

/**
 * Signup a new user and receive a JWT token
 */
export const signup = async (
  email: string,
  password: string
): Promise<{ token: string; message: string }> => {
  const res = await fetch(`${backendUrl}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Signup failed');
  return data;
};

/**
 * Login an existing user and receive a JWT token
 */
export const login = async (
  email: string,
  password: string
): Promise<{ token: string; message: string }> => {
  const res = await fetch(`${backendUrl}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
};

interface AnalyzeOpts {
  message?: string;
  audienceLevel: AudienceLevel;
  mode: Mode;
  sessionId: string;
  summarize?: boolean;
  transcriptSoFar?: string;
}

/**
 * Send transcript (or teacher summary) to the /analyze endpoint
 */
export const analyzeContent = async ({
  message,
  audienceLevel,
  mode,
  sessionId,
  summarize,
  transcriptSoFar
}: AnalyzeOpts): Promise<{ message: string; feedback: Feedback }> => {
  const body: any = { audienceLevel, mode, sessionId , message};
  if (summarize) {
    body.summarize = true;
    body.transcriptSoFar = transcriptSoFar;
  } else {
    body.message = message;
  }
  const res = await fetch(`${backendUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error('Analysis failed');
  return res.json() as Promise<{ message: string; feedback: Feedback }>;
};

/**
 * Transcribe an audio blob via /transcribe
 */
export const speechToText = async (audioBlob: Blob): Promise<string> => {
  const form = new FormData();
  form.append('audio', audioBlob, 'recorded.wav');
  const res = await fetch(`${backendUrl}/transcribe`, {
    method: 'POST',
    body: form
  });
  if (!res.ok) throw new Error('Transcription failed');
  const { transcript } = await res.json();
  return transcript;
};

// -------- Audio Recording Helpers --------
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export const startRecording = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        mediaRecorder.addEventListener('dataavailable', e => audioChunks.push(e.data));
        mediaRecorder.addEventListener('start', () => resolve());
        mediaRecorder.addEventListener('error', err => reject(err));
        mediaRecorder.start();
      })
      .catch(reject);
  });
};

export const stopRecording = (): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) return reject(new Error('No active recording'));
    mediaRecorder.addEventListener('stop', () => {
      const blob = new Blob(audioChunks, { type: 'audio/wav' });
      resolve(blob);
    });
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(t => t.stop());
    mediaRecorder = null;
  });
};

/**
 * Directly analyze raw audio (just transcription)
 */
export const analyzeAudio = async (
  audioBlob: Blob,
  audienceLevel: AudienceLevel,
  mode: Mode
): Promise<{ transcript: string }> => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recorded.wav');
  const res = await fetch(`${backendUrl}/transcribe`, { method: 'POST', body: formData });
  if (!res.ok) throw new Error('Transcription failed');
  return res.json();
};
