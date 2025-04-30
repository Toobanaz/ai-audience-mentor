// Dashboard.tsx
import { useState, useEffect } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { DraggableSidebar } from '../components/DraggableSidebar'
import ChatInterface from '../components/ChatInterface'
import { AudienceLevel, Mode } from '../types'
import { useTheme } from '@/contexts/ThemeContext'

const Dashboard = () => {
  const [audienceLevel, setAudienceLevel] = useState<AudienceLevel>('Beginner')
  const [mode, setMode] = useState<Mode>('Explain')
  const { sidebarPosition } = useTheme()
  

  // 1️⃣ Generate your own sessionId
  const [sessionId, setSessionId] = useState<string>('')
  useEffect(() => {
    if (!sessionId) {
      setSessionId(uuidv4()); // Only set it once on initial load
    }
  }, []);
  
  const handleNewSession = () => {
    setSessionId(uuidv4());
  };

  const getContentStyle = () => {
    switch (sidebarPosition) {
      case 'left': return { marginLeft: '16rem' }
      case 'right': return { marginRight: '16rem' }
      case 'top': return { marginTop: '16rem' }
      case 'bottom': return { marginBottom: '16rem' }
      default: return {}
    }
  }

  return (
    <div className="flex h-screen">
      <DraggableSidebar
        audienceLevel={audienceLevel}
        mode={mode}
        onAudienceLevelChange={(level) => {
          setAudienceLevel(level);
          setSessionId(uuidv4()); // 🔥 create new session when changing level
        }}
        
        onModeChange={(mode) => {
          setMode(mode);
          setSessionId(uuidv4()); // 🔥 create new session when changing mode
        }}
        
        // 2️⃣ “New Session” just makes a fresh UUID
        onNewSession={handleNewSession}
        onChatSelect={() => {}}
        currentChatId={sessionId}
      />

      <div className="flex-grow flex flex-col" style={getContentStyle()}>
        <ChatInterface
          audienceLevel={audienceLevel}
          mode={mode}
          sessionId={sessionId}         // pass it along
        />
      </div>
    </div>
  )
}

export default Dashboard
