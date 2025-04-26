
import { AudienceLevel, Feedback, Mode } from '../types';
// Placeholder for Azure OpenAI API integration
// only analysis (GPT feedback) — called after user clicks send
export const analyzeContent = async (
  message: string,
  audienceLevel: AudienceLevel,
  mode: Mode,
  sessionId: string
): Promise<{ message: string; feedback: Feedback }> => {
  const res = await fetch('http://localhost:5000/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, audienceLevel, mode, sessionId })
  })
  if (!res.ok) throw new Error('Analysis failed')
  return res.json() as Promise<{ message: string; feedback: Feedback }>;
}

// Placeholder for Azure Cognitive Services speech-to-text integration
// just transcription (silence‐tagging done server‐side in /transcribe)
export const speechToText = async (audioBlob: Blob): Promise<string> => {
  const form = new FormData()
  form.append('audio', audioBlob, 'recorded.wav')

  const res = await fetch('http://localhost:5000/transcribe', {
    method: 'POST',
    body: form
  })
  if (!res.ok) throw new Error('Transcription failed')
  const { transcript } = await res.json()
  return transcript
}


// Placeholder for audio recording functionality
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

export const startRecording = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];
        
        mediaRecorder.addEventListener('dataavailable', (event) => {
          audioChunks.push(event.data);
        });
        
        mediaRecorder.addEventListener('start', () => {
          resolve();
        });
        
        mediaRecorder.addEventListener('error', (error) => {
          reject(error);
        });
        
        mediaRecorder.start();
      })
      .catch(error => {
        reject(error);
      });
  });
};

export const stopRecording = (): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) {
      reject(new Error('No active recording'));
      return;
    }
    
    mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
      resolve(audioBlob);
    });
    
    mediaRecorder.stop();
    
    // Stop all tracks in the stream
    const stream = mediaRecorder.stream;
    stream.getTracks().forEach(track => track.stop());
    mediaRecorder = null;
  });
};

// utils/apiService.ts

export const analyzeAudio = async (
  audioBlob: Blob,
  audienceLevel: AudienceLevel, // these two will be ignored by the /transcribe endpoint
  mode: Mode
): Promise<{ transcript: string }> => {
  const formData = new FormData()
  formData.append('audio', audioBlob, 'recorded.wav')
  // we don’t actually need to send audienceLevel/mode to /transcribe
  const res = await fetch('http://localhost:5000/transcribe', {
    method: 'POST',
    body: formData
  })
  if (!res.ok) throw new Error('Transcription failed')
  return await res.json()  // { transcript: "..." }
}