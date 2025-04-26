import { useState, useRef } from 'react'
import { startRecording, stopRecording, speechToText } from '../utils/apiService'
import { Mic, MicOff, Send } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Message } from '../types'
import { AudienceLevel, Mode } from '../types'

interface Props {
  onSendMessage: (msg: string) => void      // sends raw transcript up    // for pushing AI feedback later
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // user clicks arrow or hits Enter → send raw transcript upward
  const handleSend = () => {
    if (!text.trim()) return
    onSendMessage(text)
    setText('')
  }

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false)
      const blob = await stopRecording()

      try {
        // 1️⃣ JUST transcribe (with [silence] tokens injected by your /transcribe route)
        const transcript = await speechToText(blob)
        // 2️⃣ put it in the textarea for user to review
        setText(transcript)
        textareaRef.current?.focus()
      } catch (e) {
        console.error('Transcription error:', e)
        setText("Sorry—I couldn't transcribe that.")
      }
    } else {
      await startRecording()
      setIsRecording(true)
    }
  }

  return (
    <div className="p-4 border-t">
      <div className="flex items-end space-x-2">
        <textarea
          ref={textareaRef}
          className="flex-grow p-3 border rounded resize-none"
          placeholder="Teach something to your audience…"
          rows={1}
          value={text}
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

        <button
          onClick={toggleRecording}
          className={`p-3 rounded-lg ${
            isRecording ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
          title={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording ? <MicOff /> : <Mic />}
        </button>

        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-3 rounded-lg bg-purple-500 text-white disabled:opacity-50"
        >
          <Send />
        </button>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-right">
        {isRecording ? 'Recording…' : 'Press Enter to send'}
      </div>
    </div>
  )
}
