import { useState, useRef } from 'react'
import { startRecording, stopRecording, speechToText } from '../utils/apiService'
import { Mic, MicOff, Send, Loader2 } from 'lucide-react' // 👈 Import a spinner
import { v4 as uuidv4 } from 'uuid'
import { Message } from '../types'
import { AudienceLevel, Mode } from '../types'

interface Props {
  onSendMessage: (msg: string) => void
  audienceLevel: AudienceLevel
  mode: Mode
}

export default function MessageInput({
  onSendMessage,
  audienceLevel,
  mode,
}: Props) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false) // 👈 New state
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = () => {
    if (!text.trim()) return
    onSendMessage(text)
    setText('')
  }

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false)
      setIsTranscribing(true) // 👈 Start loading
      
      const blob = await stopRecording()

      try {
        const transcript = await speechToText(blob)
        setText(transcript)
        textareaRef.current?.focus()
      } catch (e) {
        console.error('Transcription error:', e)
        setText("Sorry—I couldn't transcribe that.")
      } finally {
        setIsTranscribing(false) // 👈 End loading
      }
    } else {
      await startRecording()
      setIsRecording(true)
    }
  }

  return (
    <div className="p-4 border-t bg-white dark:bg-gray-900">
      <div className="flex items-end space-x-2">
        <div className="flex-grow relative">
          <textarea
            ref={textareaRef}
            className="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 dark:bg-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all disabled:opacity-70"
            placeholder={isTranscribing ? "Transcribing your voice..." : "Teach something to your audience…"}
            rows={1}
            value={text}
            disabled={isTranscribing} // 👈 Disable typing while loading
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            style={{ minHeight: 44, maxHeight: 200 }}
            onInput={e => {
              const t = e.currentTarget
              t.style.height = 'auto'
              t.style.height = Math.min(t.scrollHeight, 200) + 'px'
            }}
          />

          {/* Spinner inside textarea */}
          {isTranscribing && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-gray-900/70 rounded-xl">
              <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
            </div>
          )}
        </div>

        <button
          onClick={toggleRecording}
          disabled={isTranscribing} // 👈 Disable mic while transcribing
          className={`p-3 rounded-xl transition-all shadow-md ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
          } ${isTranscribing ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        <button
          onClick={handleSend}
          disabled={!text.trim() || isTranscribing}
          className="p-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-all shadow-md disabled:opacity-50"
        >
          <Send size={20} />
        </button>
      </div>

      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
        {isTranscribing
          ? '🛠 Transcribing your voice...'
          : isRecording
          ? '🎙 Recording…'
          : '↵ Press Enter to send'}
      </div>
    </div>
  )
}
