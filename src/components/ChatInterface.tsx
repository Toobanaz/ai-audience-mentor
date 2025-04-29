import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { AudienceLevel, Message, Mode } from '../types';
import { analyzeContent } from '../utils/apiService';
import * as mpPose from '@mediapipe/pose';
import * as mpHolistic from '@mediapipe/holistic';
import { Camera } from '@mediapipe/camera_utils';
import BodyLanguageMonitor from './BodyLanguageMonitor';

interface BodyMetrics {
  postureScore: number;      // e.g. 0–100
  handGestureRate: number;   // gestures per minute
  headNodCount: number;      // nods per minute
  suggestions: string[];     // e.g. ["Sit up straighter", ...]
}

interface ChatInterfaceProps {
  audienceLevel: AudienceLevel;
  mode: Mode;
}

const ChatInterface = ({ audienceLevel, mode }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      content: `I'm your AI audience at the ${audienceLevel} level. I'll listen, ask questions, and give feedback on your explanations. What would you like to teach me today?`,
      sender: 'ai',
      timestamp: new Date(),
      feedback: {
        clarity: 'Ready to learn!',
        pacing: "Let's go at your pace",
        questions: ['What topic would you like to explain?'],
        structureSuggestions: '',
        deliveryTips: ''
      },
    },
  ]);

  const [expandedMessageIds, setExpandedMessageIds] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string>(uuidv4());
  const backendUrl = window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://neural-nomads-hackathon-prd-wa-uaen-01-ajarepe3f3hydkd3.uaenorth-01.azurewebsites.net";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // State for metrics
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);

  // Camera initialization in Presentation mode
  useEffect(() => {
    if (mode !== 'Presentation') return;

    const startCamera = async () => {
      const video = document.getElementById('camera') as HTMLVideoElement;
      if (navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          video.srcObject = stream;
        } catch (err) {
          console.error('Camera access denied', err);
        }
      }
    };

    startCamera();
  }, [mode]);

  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessageIds((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  const handleSendMessage = async (content: string) => {
    // Push the user bubble
    const userMessage: Message = {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsTyping(true);

    try {
      let aiResponse: { message: string; feedback: any };

      // Handle "summarize" request
      if (mode === 'Explain' && content.trim().toLowerCase().startsWith('summarize')) {
        const teacherTexts = messages
          .filter((m) => m.sender === 'user')
          .map((m) => m.content)
          .join('\n\n');

        const res = await fetch(`${backendUrl}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            summarize: true,
            transcriptSoFar: teacherTexts,
            audienceLevel,
            mode,
            sessionId,
          }),
        });
        if (!res.ok) throw new Error('Analysis failed');
        aiResponse = await res.json();
      } else {
        // Normal single-turn analysis
        aiResponse = await analyzeContent(content, audienceLevel, mode, sessionId);
      }

      // Append the AI bubble
      setTimeout(() => {
        const aiMessage: Message = {
          id: uuidv4(),
          content: aiResponse.message,
          sender: 'ai',
          timestamp: new Date(),
          feedback: aiResponse.feedback,
        };
        setMessages((prev) => [...prev, aiMessage]);
        setExpandedMessageIds((prev) => [...prev, aiMessage.id]);
        setIsTyping(false);
      }, 500);
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setMessages((prev) => [
        ...prev,
        {
          id: uuidv4(),
          content: "Sorry, I'm having trouble processing your request right now. Please try again later.",
          sender: 'ai',
          timestamp: new Date(),
        },
      ]);
    }
  };

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Left: fixed-width camera + metrics */}
      {mode === 'Presentation' && (
        <div className="w-80 min-w-[280px] border-r flex flex-col overflow-hidden">
          <BodyLanguageMonitor />
        </div>
      )}

      {/* Right: chat column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Message list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-16 lg:pt-4">
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              mode={mode}
              expanded={expandedMessageIds.includes(msg.id)}
              onToggleExpand={() => toggleMessageExpand(msg.id)}
            />
          ))}
          {isTyping && (
            <div className="flex items-center ml-4 mb-4">
              <div className="bg-ailearn-lightgray rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <MessageInput
          onSendMessage={handleSendMessage}
          audienceLevel={audienceLevel}
          mode={mode}
        />
      </div>
    </div>
  );
};

export default ChatInterface;
