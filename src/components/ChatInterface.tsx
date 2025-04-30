import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import { AudienceLevel, Message, Mode } from '../types';
import { analyzeContent, speechToText /*, signup, login if needed */ } from '../utils/apiService';

interface BodyMetrics {
  postureScore: number;      // e.g. 0–100
  handGestureRate: number;   // gestures per minute
  headNodCount: number;      // nods per minute
  suggestions: string[];     // e.g. ["Sit up straighter", ...]
}

interface ChatInterfaceProps {
  audienceLevel: AudienceLevel;
  mode: Mode;
  sessionId?: string; // Optional prop to pass sessionId
}


const ChatInterface = ({ audienceLevel, mode, sessionId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uuidv4(),
      content: `I'm your AI audience at the ${audienceLevel} level. I'll listen, ask questions, and give feedback on your explanations. What would you like to teach me today?`,
      sender: 'ai',
      timestamp: new Date(),
      feedback: {
        id: uuidv4(),
        summary: '',
        type: 'neutral',
        clarity: 'Ready to learn!',
        pacing: "Let's go at your pace",
        structureSuggestions: [],
        deliveryTips: [],
        questions: ['What topic would you like to explain?'],
      },
    },
  ]);

  const [expandedMessageIds, setExpandedMessageIds] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const backendUrl = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : `${window.location.origin}/api`;
  const [imgSrc, setImgSrc] = useState(`${backendUrl}/bodytrack`);

  useEffect(() => {
    if (mode === 'Presentation') {
      setImgSrc(`${backendUrl}/bodytrack`); // ✅ only set once
    } else {
      setImgSrc(""); // Clear image in Explain mode
    }
  }, [mode]);
  

  useEffect(() => {
    setMessages([
      {
        id: uuidv4(),
        content: `I'm your AI audience at the ${audienceLevel} level. I'll listen, ask questions, and give feedback on your explanations. What would you like to teach me today?`,
        sender: 'ai',
        timestamp: new Date(),
        feedback: {
          id: uuidv4(),
          summary: '',
          type: 'neutral',
          clarity: 'Ready to learn!',
          pacing: "Let's go at your pace",
          structureSuggestions: [],
          deliveryTips: [],
          questions: ['What topic would you like to explain?'],
        },
      },
    ])
    setIsTyping(false); // Stop any previous typing state
    setExpandedMessageIds([]); // Collapse old messages
  }, [audienceLevel, mode, sessionId])
  
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ➊ state for metrics
  const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics | null>(null);

  // ➋ a useEffect that fetches every 5s in Presentation mode
  useEffect(() => {
    if (mode !== 'Presentation') return;
    
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`${backendUrl}/bodymetrics`);
        if (!res.ok) throw new Error();
        setBodyMetrics(await res.json());
      } catch (e) {
        console.error('bodymetrics fetch failed', e);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [mode]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  const toggleMessageExpand = (messageId: string) => {
    setExpandedMessageIds(prev =>
      prev.includes(messageId)
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

 
  

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
  
    
    const userMessage: Message = {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
  
    setIsTyping(true);
    
    try {
      const isSummarize = mode === 'Explain' && content.trim().toLowerCase().startsWith('summarize');
      const transcriptSoFar = isSummarize
        ? messages.filter(m => m.sender === 'user').map(m => m.content).join('\n\n')
        : undefined;
  
      const payload: any = {
        audienceLevel,
        mode,
        sessionId,
        summarize: isSummarize,
      };
      payload.message = content; // Always set this
      if (isSummarize && transcriptSoFar) {
        payload.transcriptSoFar = transcriptSoFar;
      }

      if (!sessionId) {
        console.warn('Missing sessionId when sending message!');
        return;
      }
      
      const aiResponse = await analyzeContent(payload);
      console.log("✅ AI Response received:", aiResponse);

      setTimeout(() => {
        const aiMessage: Message = {
          id: uuidv4(),
          content: aiResponse.message,
          sender: 'ai',
          timestamp: new Date(),
          feedback: aiResponse.feedback ? {
            id: uuidv4(),
            summary: aiResponse.feedback.summary || '',
            type: aiResponse.feedback.type || 'neutral',
            clarity: aiResponse.feedback.clarity || '',
            pacing: aiResponse.feedback.pacing || '',
            structureSuggestions: aiResponse.feedback.structureSuggestions || [],
            deliveryTips: aiResponse.feedback.deliveryTips || [],
            rephrasingSuggestions: aiResponse.feedback.rephrasingSuggestions || [],
            questions: aiResponse.feedback.questions || [],
          } : undefined
        };
        setMessages(prev => [...prev, aiMessage]);
        setExpandedMessageIds(prev => [...prev, aiMessage.id]);
        setIsTyping(false);
      }, 500);
  
    } catch (err) {
      console.error(err);
      setIsTyping(false);
      setMessages(prev => [
        ...prev,
        {
          id: uuidv4(),
          content: "Sorry, I'm having trouble processing your request right now. Please try again later.",
          sender: 'ai',
          timestamp: new Date(),
        }
      ]);
    }
  };
  

  return (
    <div className="flex h-full bg-white overflow-hidden">
      {/* Left: fixed-width camera + metrics */}
      {mode === 'Presentation' && (
        <div className="w-80 min-w-[280px] border-r flex flex-col overflow-hidden">
          <h4 className="p-2 text-sm font-medium">Body Language Monitor</h4>
          <img
            src={imgSrc}
            alt="Live pose stream"
            className="w-full h-48 object-cover"
          />


          <div className="flex-grow overflow-y-auto p-2">
            <h5 className="text-sm font-medium mb-2">Analytics & Suggestions</h5>
            {bodyMetrics ? (
              <ul className="text-sm space-y-1">
                <li>Posture: {bodyMetrics.postureScore}% upright</li>
                <li>Hand gestures: {bodyMetrics.handGestureRate} /min</li>
                <li>Head nods: {bodyMetrics.headNodCount} /min</li>
                {bodyMetrics.suggestions.map((s, i) => (
                  <li key={i}>💡 {s}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-500">Analyzing…</p>
            )}
          </div>
        </div>
      )}

      {/* Right: chat column */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* message list */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-16 lg:pt-4">
          {messages.map(msg => (
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
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* input bar */}
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
export { ChatInterface };