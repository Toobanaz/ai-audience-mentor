// src/pages/Index.tsx
import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import ChatInterface from '../components/ChatInterface'
import { AudienceLevel, Mode } from '../types'

const PROJECT_DESCRIPTION = `
**AI Reverse Learning**  
An interactive learning platform where *you* teach the AI instead of just learning from it.  
The AI listens, analyzes, and asks smart questions to test your understanding and improve your explanations.  
It provides real-time feedback and suggestions—perfect for students, teachers, or anyone preparing a presentation.
`

const Index = () => {
  const [audienceLevel, setAudienceLevel] = useState<AudienceLevel>('Beginner')
  const [mode, setMode] = useState<Mode>('Explain')
  const [sessionCount, setSessionCount] = useState(1)

  const handleNewSession = () => {
    setSessionCount((c) => c + 1)
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <Sidebar
        audienceLevel={audienceLevel}
        mode={mode}
        onAudienceLevelChange={setAudienceLevel}
        onModeChange={setMode}
        onNewSession={handleNewSession}
      />

      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Show description only in Explain mode */}
        
        

        {/* Chat area */}
        <div className="flex-grow overflow-hidden">
          <ChatInterface
            key={sessionCount}
            audienceLevel={audienceLevel}
            mode={mode}
          />
        </div>
      </div>
    </div>
  )
}

export default Index
