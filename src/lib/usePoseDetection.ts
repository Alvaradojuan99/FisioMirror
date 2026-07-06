import { useRef, useState, useCallback, useEffect } from 'react';

export interface PoseLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseData {
  landmarks: PoseLandmark[] | null;
  ready: boolean;
  error: string | null;
}

export interface ExerciseInfo {
  targetAngle?: number;
  tolerance?: number;
  direction?: 'up' | 'down';
}

function calculateAngleFromLandmarks(a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * (180 / Math.PI));
  if (angle > 180) angle = 360 - angle;
  return Math.round(angle);
}

export function usePoseDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const [poseData, setPoseData] = useState<PoseData>({ landmarks: null, ready: false, error: null });
  const [cameraActive, setCameraActive] = useState(false);

  const drawSkeleton = useCallback((landmarks: PoseLandmark[], exerciseInfo?: { targetAngle?: number; tolerance?: number; direction?: 'up' | 'down' }) => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Pose connections (MediaPipe Pose landmark indices)
    const connections = [
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
      [11, 23], [12, 24], [23, 24],
      [23, 25], [25, 27], [24, 26], [26, 28],
      [27, 29], [29, 31], [27, 31], [28, 30], [30, 32], [28, 32],
      [0, 11], [0, 12],
    ];

    // Calculate arm angles for feedback
    let rightArmAngle: number | null = null;
    let leftArmAngle: number | null = null;
    let activeArm: 'right' | 'left' | null = null;

    // Right arm angle (shoulder 12, elbow 14, wrist 16)
    if (landmarks[12] && landmarks[14] && landmarks[16] &&
        landmarks[12].visibility > 0.5 && landmarks[14].visibility > 0.5 && landmarks[16].visibility > 0.5) {
      rightArmAngle = calculateAngleFromLandmarks(landmarks[12], landmarks[14], landmarks[16]);
      activeArm = 'right';
    }
    // Left arm angle (shoulder 11, elbow 13, wrist 15)
    if (landmarks[11] && landmarks[13] && landmarks[15] &&
        landmarks[11].visibility > 0.5 && landmarks[13].visibility > 0.5 && landmarks[15].visibility > 0.5) {
      leftArmAngle = calculateAngleFromLandmarks(landmarks[11], landmarks[13], landmarks[15]);
      if (!activeArm) activeArm = 'left';
    }

    // Determine quality color based on angle
    const getQualityColor = (angle: number | null) => {
      if (angle === null) return '#67dbad';
      const targetAngle = exerciseInfo?.targetAngle ?? 90;
      const tolerance = exerciseInfo?.tolerance ?? 20;
      const diff = Math.abs(angle - targetAngle);
      if (diff <= tolerance) return '#4ade80'; // Green - correct
      if (diff <= tolerance * 1.5) return '#fbbf24'; // Yellow - close
      return '#ef4444'; // Red - needs adjustment
    };

    const currentAngle = rightArmAngle ?? leftArmAngle;
    const qualityColor = getQualityColor(currentAngle);

    // Draw glow effect behind skeleton
    ctx.shadowColor = qualityColor;
    ctx.shadowBlur = 15;

    // Draw connections with gradient
    ctx.lineWidth = 5;
    for (const [a, b] of connections) {
      const la = landmarks[a];
      const lb = landmarks[b];
      if (la && lb && la.visibility > 0.5 && lb.visibility > 0.5) {
        // Create gradient for line
        const gradient = ctx.createLinearGradient(la.x * w, la.y * h, lb.x * w, lb.y * h);
        gradient.addColorStop(0, qualityColor);
        gradient.addColorStop(1, qualityColor + '88');
        ctx.strokeStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(la.x * w, la.y * h);
        ctx.lineTo(lb.x * w, lb.y * h);
        ctx.stroke();
      }
    }
    ctx.shadowBlur = 0;

    // Draw joints with pulsing effect
    const time = Date.now() / 1000;
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      if (lm.visibility < 0.5) continue;
      const x = lm.x * w;
      const y = lm.y * h;

      // Pulse effect for key joints
      const isKeyJoint = [11, 12, 13, 14, 15, 16].includes(i);
      const pulseFactor = isKeyJoint ? 1 + Math.sin(time * 3) * 0.2 : 1;
      const radius = 8 * pulseFactor;

      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
      ctx.fillStyle = qualityColor + '40';
      ctx.fill();

      // Main joint
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = qualityColor;
      ctx.fill();

      // Inner highlight
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.6, 0, 2 * Math.PI);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }

    // Draw angle arc at elbow for active arm
    if (currentAngle !== null && activeArm) {
      const shoulder = activeArm === 'right' ? landmarks[12] : landmarks[11];
      const elbow = activeArm === 'right' ? landmarks[14] : landmarks[13];
      const wrist = activeArm === 'right' ? landmarks[16] : landmarks[15];

      if (shoulder && elbow && wrist) {
        const ex = elbow.x * w;
        const ey = elbow.y * h;

        // Draw angle arc
        ctx.beginPath();
        const startAngle = Math.atan2(shoulder.y * h - ey, shoulder.x * w - ex);
        const endAngle = Math.atan2(wrist.y * h - ey, wrist.x * w - ex);
        ctx.arc(ex, ey, 40, startAngle, endAngle);
        ctx.strokeStyle = qualityColor + 'aa';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw angle text
        ctx.font = 'bold 16px Inter';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${Math.round(currentAngle)}°`, ex, ey - 50);

        // Draw direction arrow
        if (exerciseInfo?.direction) {
          const arrowLen = 50;
          const arrowDir = exerciseInfo.direction === 'up' ? -1 : 1;
          const arrowX = wrist.x * w;
          const arrowY = wrist.y * h + (arrowDir * arrowLen);

          ctx.beginPath();
          ctx.moveTo(wrist.x * w, wrist.y * h);
          ctx.lineTo(arrowX, arrowY);
          ctx.strokeStyle = qualityColor;
          ctx.lineWidth = 4;
          ctx.stroke();

          // Arrowhead
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY);
          ctx.lineTo(arrowX - 10, arrowY - (arrowDir * 15));
          ctx.lineTo(arrowX + 10, arrowY - (arrowDir * 15));
          ctx.closePath();
          ctx.fillStyle = qualityColor;
          ctx.fill();
        }
      }
    }
  }, []);

  const onResults = useCallback((results: any, exerciseInfo?: ExerciseInfo) => {
    if (results.poseLandmarks) {
      setPoseData({ landmarks: results.poseLandmarks as PoseLandmark[], ready: true, error: null });
      drawSkeleton(results.poseLandmarks as PoseLandmark[], exerciseInfo);
    }
  }, [drawSkeleton]);

  const startCamera = useCallback(async () => {
    try {
      if (!window.Pose) {
        setPoseData((p) => ({ ...p, error: 'MediaPipe no está cargado. Recarga la página.' }));
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      // Set canvas size to match video display
      canvas.width = 640;
      canvas.height = 480;

      // Create Pose instance
      if (!poseRef.current) {
        poseRef.current = new window.Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });
        poseRef.current.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        poseRef.current.onResults(onResults);
      }

      // Create Camera instance
      cameraRef.current = new window.Camera(video, {
        onFrame: async () => {
          if (poseRef.current && video.readyState >= 2) {
            await poseRef.current.send({ image: video });
          }
        },
        width: 640,
        height: 480,
      });

      await cameraRef.current.start();
      setCameraActive(true);
      setPoseData((p) => ({ ...p, ready: true, error: null }));
    } catch (err) {
      setPoseData((p) => ({ ...p, error: 'No se pudo acceder a la cámara. Permite el acceso en tu navegador.' }));
    }
  }, [onResults]);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setCameraActive(false);
    setPoseData({ landmarks: null, ready: false, error: null });
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (cameraRef.current) cameraRef.current.stop();
      if (poseRef.current) poseRef.current.close();
    };
  }, []);

  return { videoRef, canvasRef, poseData, cameraActive, startCamera, stopCamera, drawSkeleton };
}
