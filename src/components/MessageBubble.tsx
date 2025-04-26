// src/components/MessageBubble.tsx
import { Message, Mode } from '../types';

interface MessageBubbleProps {
  message:   Message;
  expanded:  boolean;
  onToggleExpand: () => void;
  mode:      Mode;
}

export default function MessageBubble({
  message, expanded, onToggleExpand, mode
}: MessageBubbleProps) {
  const isAI = message.sender === 'ai';

  return (
    <div className={`${isAI ? 'ml-4' : 'mr-4'} mb-4`}>
      <div className={`flex ${isAI ? 'justify-start' : 'justify-end'}`}>
        <div className={`
            rounded-lg px-4 py-2 max-w-[80%]
            ${isAI
              ? 'bg-ailearn-lightgray text-ailearn-darkblue'
              : 'bg-ailearn-lightpurple text-white'}
          `}>
          
          {/* Bubble text */}
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* ONLY in Presentation mode do we show the feedback panel */}
          {isAI && mode === 'Presentation' && message.feedback && (
            <div className="mt-2">
              <button
                onClick={onToggleExpand}
                className="text-sm text-ailearn-purple hover:text-ailearn-lightpurple flex items-center"
              >
                {expanded ? 'Hide feedback' : 'Show feedback'}
                <svg
                  className={`ml-1 w-4 h-4 transform ${expanded ? 'rotate-180' : ''}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
                  {/* Clarity */}
                  <div>
                    <h4 className="text-sm font-medium text-ailearn-purple mb-1">Clarity:</h4>
                    <p className="text-sm text-gray-600">{message.feedback.clarity}</p>
                  </div>
                  {/* Pacing */}
                  <div>
                    <h4 className="text-sm font-medium text-ailearn-purple mb-1">Pacing:</h4>
                    <p className="text-sm text-gray-600">{message.feedback.pacing}</p>
                  </div>
                  {/* Structure */}
                  {message.feedback.structureSuggestions && (
                    <div>
                      <h4 className="text-sm font-medium text-ailearn-purple mb-1">Structure:</h4>
                      <p className="text-sm text-gray-600">{message.feedback.structureSuggestions}</p>
                    </div>
                  )}
                  {/* Delivery Tips */}
                  {message.feedback.deliveryTips && (
                    <div>
                      <h4 className="text-sm font-medium text-ailearn-purple mb-1">Delivery Tips:</h4>
                      <p className="text-sm text-gray-600">{message.feedback.deliveryTips}</p>
                    </div>
                  )}
                  {/* Rephrasing Suggestions */}
                  {message.feedback.rephrasingSuggestions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-ailearn-purple mb-1">Rephrasing Suggestions:</h4>
                      <ul className="list-disc pl-5 space-y-1">
                        {message.feedback.rephrasingSuggestions.map((s, i) => (
                          <li key={i} className="text-sm text-gray-600">
                            <strong className="block text-ailearn-darkblue">"{s.original}"</strong>
                            <span>↪ "{s.suggested}"</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Questions */}
                  {message.feedback.questions?.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-ailearn-purple mb-1">Questions:</h4>
                      <ul className="list-disc pl-5">
                        {message.feedback.questions.map((q,i) => (
                          <li key={i} className="text-sm text-gray-600">{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* — END presentation feedback panel — */}

        </div>
      </div>
      <div className={`text-xs text-gray-500 mt-1 ${isAI ? 'text-left' : 'text-right'}`}>
        {new Date(message.timestamp).toLocaleTimeString(undefined, {
          hour: "2-digit", minute: "2-digit"
        })}
      </div>
    </div>
  );
}
