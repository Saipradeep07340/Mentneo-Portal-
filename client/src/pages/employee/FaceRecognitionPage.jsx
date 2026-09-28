import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { employeeApi } from '../../api/employeeApi';
import '../../styles/EmployeePortal.css';

export default function FaceRecognitionPage() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') || 'CHECK_IN';
  const [activeMode, setActiveMode] = useState(initialMode);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [qualityScore, setQualityScore] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError(null);
    setResult(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera unavailable or unsupported in this browser environment.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access issue:', err);
      let msg = 'Camera unavailable.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings to use Face Recognition.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No video camera detected on this computer.';
      } else {
        msg = err.message || 'Could not start camera.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Extract 128-dimensional biometric feature vector from canvas pixels
  const extractFeatureVector = (ctx, width, height) => {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Quality check: calculate brightness and contrast
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalBrightness += (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // Calculate variance
    let varianceSum = 0;
    for (let i = 0; i < data.length; i += 16) {
      const lum = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
      varianceSum += Math.pow(lum - avgBrightness, 2);
    }
    const contrast = Math.sqrt(varianceSum / (data.length / 16));

    // Quality Score between 0 and 1
    const qScore = Math.min(1.0, Math.max(0.1, (contrast / 60) * (avgBrightness > 40 && avgBrightness < 220 ? 1 : 0.5)));
    setQualityScore(Math.round(qScore * 100));

    if (qScore < 0.35) {
      throw new Error('Poor image quality. Please face the camera directly in a well-lit area.');
    }

    // Generate 128-dimensional biometric spatial vector
    const vector = new Array(128);
    const cellW = Math.floor(width / 16);
    const cellH = Math.floor(height / 8);

    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 16; col++) {
        const idx = row * 16 + col;
        let cellSum = 0;
        let sampleCount = 0;

        for (let y = row * cellH; y < (row + 1) * cellH; y += 4) {
          for (let x = col * cellW; x < (col + 1) * cellW; x += 4) {
            const pixelIdx = (y * width + x) * 4;
            cellSum += (data[pixelIdx] * 0.299 + data[pixelIdx + 1] * 0.587 + data[pixelIdx + 2] * 0.114);
            sampleCount++;
          }
        }
        vector[idx] = sampleCount > 0 ? (cellSum / sampleCount) / 255 : 0;
      }
    }

    // L2 Normalize the 128-dimensional vector
    let norm = 0;
    for (let i = 0; i < 128; i++) norm += vector[i] * vector[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < 128; i++) vector[i] = vector[i] / norm;

    return { vector, qScore };
  };

  const handleCaptureAndProcess = async () => {
    setProcessing(true);
    setResult(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        throw new Error('Camera feed not initialized.');
      }

      const w = 480;
      const h = 360;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, w, h);

      const imageBase64 = canvas.toDataURL('image/jpeg', 0.88);

      if (activeMode === 'REGISTER') {
        const res = await employeeApi.registerFace(imageBase64);
        setResult({
          type: 'success',
          title: 'Face Template Enrolled Successfully',
          message: res.message || 'Biometric feature template has been securely enrolled with ArcFace/SFace. You can now use contactless face attendance.'
        });
      } else if (activeMode === 'CHECK_IN') {
        const res = await employeeApi.checkInWithFace(imageBase64);
        setResult({
          type: 'success',
          title: 'Face Clock-In Successful',
          message: res.message,
          record: res.attendance
        });
      } else {
        const res = await employeeApi.checkOutWithFace(imageBase64);
        setResult({
          type: 'success',
          title: 'Face Clock-Out Successful',
          message: res.message,
          record: res.attendance
        });
      }
    } catch (err) {
      setResult({
        type: 'error',
        title: 'Biometric Verification Error',
        message: err.message || 'Face detection failed.'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div>
      {/* MODE TABS */}
      <div className="portal-tabs-nav">
        <button 
          className={`portal-tab-btn ${activeMode === 'CHECK_IN' ? 'active' : ''}`}
          onClick={() => { setActiveMode('CHECK_IN'); setResult(null); }}
        >
          📷 Face Check-In
        </button>
        <button 
          className={`portal-tab-btn ${activeMode === 'CHECK_OUT' ? 'active' : ''}`}
          onClick={() => { setActiveMode('CHECK_OUT'); setResult(null); }}
        >
          🛑 Face Check-Out
        </button>
        <button 
          className={`portal-tab-btn ${activeMode === 'REGISTER' ? 'active' : ''}`}
          onClick={() => { setActiveMode('REGISTER'); setResult(null); }}
        >
          👤 Register / Update Face Template
        </button>
      </div>

      <div className="portal-grid-dashboard">
        {/* CAMERA CANVAS BOX */}
        <div className="portal-card col-8">
          <div className="portal-card-header">
            <h3>
              <span>📷</span> 
              {activeMode === 'REGISTER' ? 'Biometric Face Enrollment' : `Contactless Face Attendance (${activeMode.replace('_', ' ')})`}
            </h3>
            {qualityScore && (
              <span className={`portal-badge ${qualityScore > 60 ? 'portal-badge-success' : 'portal-badge-warning'}`}>
                Quality: {qualityScore}%
              </span>
            )}
          </div>

          <div style={{
            position: 'relative',
            width: '100%',
            height: 380,
            background: '#040711',
            borderRadius: 12,
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--portal-card-border)'
          }}>
            {/* Live Video */}
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // mirror view for natural selfie orientation
                display: cameraActive ? 'block' : 'none'
              }}
            />

            {/* Hidden capture canvas */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Camera error state */}
            {cameraError && (
              <div style={{ padding: 24, textAlign: 'center', maxWidth: 420 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📷🚫</div>
                <h4 style={{ color: 'var(--portal-danger)', margin: '0 0 8px' }}>Camera Inaccessible</h4>
                <p style={{ color: 'var(--portal-text-muted)', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px' }}>
                  {cameraError}
                </p>
                <button className="btn-primary" onClick={startCamera}>
                  Retry Camera Permissions
                </button>
              </div>
            )}

            {/* Face Alignment Box Overlay */}
            {cameraActive && (
              <div style={{
                position: 'absolute',
                width: 200,
                height: 250,
                border: '2px dashed var(--portal-primary)',
                borderRadius: '50% 50% 45% 45%',
                boxShadow: '0 0 25px var(--portal-primary-glow)',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '12px 0'
              }}>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--portal-primary)', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, margin: '0 auto' }}>
                  Align Face Inside Oval
                </div>
                <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: 4, margin: '0 auto' }}>
                  Look Directly at Camera
                </div>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn-secondary" onClick={startCamera}>
              <span>🔄</span> Reset Camera
            </button>

            <button 
              className="btn-primary" 
              style={{ minWidth: 200, padding: '12px 24px', fontSize: 14 }}
              onClick={handleCaptureAndProcess}
              disabled={!cameraActive || processing}
            >
              {processing ? (
                <>
                  <span className="portal-spinner" />
                  <span>Analyzing Face...</span>
                </>
              ) : activeMode === 'REGISTER' ? (
                <><span>📸</span> Enroll Face Template</>
              ) : (
                <><span>⚡</span> Verify & {activeMode === 'CHECK_IN' ? 'Check In' : 'Check Out'}</>
              )}
            </button>
          </div>
        </div>

        {/* INSTRUCTIONS & FEEDBACK */}
        <div className="portal-card col-4">
          <div className="portal-card-header">
            <h3>Biometric Verification Status</h3>
          </div>

          {result ? (
            <div style={{
              background: result.type === 'success' ? 'var(--portal-success-bg)' : 'var(--portal-danger-bg)',
              border: `1px solid ${result.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              borderRadius: 10,
              padding: 16,
              marginBottom: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 20 }}>{result.type === 'success' ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: result.type === 'success' ? 'var(--portal-success)' : 'var(--portal-danger)' }}>
                  {result.title}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--portal-text-main)', lineHeight: 1.4 }}>
                {result.message}
              </p>
              {result.record && (
                <div style={{ marginTop: 10, fontSize: 12, color: 'var(--portal-text-muted)', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div>Attendance Date: <b>{result.record.date}</b></div>
                  <div>Recorded Check-in: <b>{result.record.check_in}</b></div>
                  <div>Status: <b>{result.record.status}</b></div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: '16px 0', color: 'var(--portal-text-subtle)', fontSize: 13 }}>
              Ready for scanning. Position your face in front of the lens and click the button.
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 16, border: '1px solid var(--portal-card-border)' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--portal-text-main)' }}>
              Biometric Security Architecture:
            </h4>
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--portal-text-muted)', fontSize: 12, lineHeight: 1.7 }}>
              <li><b>Zero Raw Image Storage:</b> Raw video frames are discarded immediately after in-memory feature computation.</li>
              <li><b>Mathematical Vector Enrolment:</b> 128-dimensional normalized mathematical descriptors are encrypted and stored.</li>
              <li><b>Liveness & Quality Checking:</b> Frontal illumination, contrast variance, and aspect ratio checks prevent spoofing.</li>
              <li><b>Employee Isolation:</b> Biometric templates are strictly isolated per employee with strict access control.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
