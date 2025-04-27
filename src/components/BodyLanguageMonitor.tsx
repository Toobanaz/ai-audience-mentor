import { useEffect, useRef, useState } from "react";
import { Holistic } from "@mediapipe/holistic";
import { Camera } from "@mediapipe/camera_utils";

interface BodyMetrics {
  postureScore: number;
  handGestureRate: number;
  headNodCount: number;
  suggestions: string[];
}

const BodyLanguageMonitor = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [metrics, setMetrics] = useState<BodyMetrics>({
    postureScore: 0,
    handGestureRate: 0,
    headNodCount: 0,
    suggestions: [],
  });

  useEffect(() => {
    if (!videoRef.current) return;

    const holistic = new Holistic({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`,
    });

    holistic.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      refineFaceLandmarks: true,
    });

    let uprightCount = 0;
    let nodCount = 0;
    let frameCount = 0;
    let lastNoseY: number | null = null;
    let handGestureCount = 0;

    holistic.onResults((results) => {
      frameCount++;

      if (results.poseLandmarks) {
        const lShoulder = results.poseLandmarks[11];
        const rShoulder = results.poseLandmarks[12];
        if (Math.abs(lShoulder.y - rShoulder.y) < 0.02) {
          uprightCount++;
        }
        const nose = results.poseLandmarks[0];
        if (lastNoseY !== null && (lastNoseY - nose.y) > 0.03) {
          nodCount++;
        }
        lastNoseY = nose.y;
      }

      if (results.leftHandLandmarks || results.rightHandLandmarks) {
        handGestureCount++;
      }

      // Update metrics every 30 frames
      if (frameCount % 30 === 0) {
        const postureScore = Math.round((uprightCount / frameCount) * 100);
        const gesturesPerMin = Math.round((handGestureCount / frameCount) * 30 * 60);
        const nodsPerMin = Math.round((nodCount / frameCount) * 30 * 60);

        setMetrics({
          postureScore,
          handGestureRate: gesturesPerMin,
          headNodCount: nodsPerMin,
          suggestions: [
            "Keep your shoulders level to appear more confident.",
            "Use deliberate hand gestures—aim for about 10–15 per minute.",
            "Avoid excessive head nodding; it can distract your audience."
          ],
        });

        // Reset counters
        frameCount = 0;
        uprightCount = 0;
        handGestureCount = 0;
        nodCount = 0;
      }
    });

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await holistic.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    camera.start();

    return () => {
      camera.stop();
    };
  }, []);

  return (
    <div className="flex flex-col items-center">
      <video ref={videoRef} className="rounded-md" autoPlay muted playsInline style={{ width: 320, height: 240 }} />
      <div className="mt-2 text-sm">
        <div>Posture: {metrics.postureScore}% upright</div>
        <div>Hand gestures: {metrics.handGestureRate} per min</div>
        <div>Head nods: {metrics.headNodCount} per min</div>
        <ul className="mt-2 space-y-1">
          {metrics.suggestions.map((tip, i) => (
            <li key={i}>💡 {tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default BodyLanguageMonitor;
