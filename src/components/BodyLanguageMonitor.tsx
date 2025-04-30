import React, { useRef, useEffect, useState } from 'react';

interface BodyLanguageMonitorProps {
  onConfidenceChange: (confidence: number) => void;
}

const BodyLanguageMonitor: React.FC<BodyLanguageMonitorProps> = ({ onConfidenceChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  useEffect(() => {
    // This is a placeholder for the actual implementation
    // Since we don't have the mediapipe libraries, we'll simulate random confidence values
    const interval = setInterval(() => {
      if (isMonitoring) {
        const randomConfidence = Math.random() * 100;
        onConfidenceChange(randomConfidence);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMonitoring, onConfidenceChange]);
  
  const toggleMonitoring = () => {
    setIsMonitoring(prev => !prev);
  };
  
  return (
    <div className="relative">
      {isMonitoring && (
        <div className="bg-background border rounded p-2 mb-2">
          <div className="text-xs text-muted-foreground">
            Body language monitoring active (simulated)
          </div>
          <video
            ref={videoRef}
            className="w-full h-32 bg-black rounded"
            autoPlay
            playsInline
          />
        </div>
      )}
      
      <button
        onClick={toggleMonitoring}
        className="text-xs text-muted-foreground hover:text-primary"
      >
        {isMonitoring ? 'Disable' : 'Enable'} body language monitoring
      </button>
    </div>
  );
};

export default BodyLanguageMonitor;
