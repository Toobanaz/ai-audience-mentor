
# AI Reverse Learning

AI Reverse Learning is an innovative application that allows you to practice your teaching or presentation skills with an AI that simulates different audience levels. The AI plays the role of a simulated audience (Beginner, Intermediate, or Expert) and provides feedback on your explanations.

## Features

- **ChatGPT-style interface**: Clean, intuitive chat interface similar to ChatGPT.
- **Audience Level Selection**: Choose from Beginner, Intermediate, or Expert audience levels.
- **Two Modes**: 
  - Explain Mode: For teaching concepts and receiving feedback.
  - Presentation Mode: For practicing presentations and delivery.
- **Voice Input**: Record your voice for transcription and analysis.
- **Detailed Feedback**: Get insights on your clarity, pacing, and areas for improvement.
- **AI-Generated Questions**: Receive questions from the perspective of your selected audience level.

## Running the Project

1. First, install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. In a separate terminal, start the backend server:
```bash
node src/server.js
```

## Integration Points

This prototype includes placeholder functions for integration with:

- Azure OpenAI for smart questions and feedback
- Azure Cognitive Services for speech-to-text functionality

## Technical Implementation

- Frontend: React with TypeScript
- Backend: Express.js
- Styling: Tailwind CSS
- Icons: Lucide React

## Future Enhancements

- Audio clip upload and analysis
- Session history and progress tracking
- More detailed analytics on teaching performance
- Custom audience personas
