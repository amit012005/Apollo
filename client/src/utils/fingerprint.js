/**
 * Browser Fingerprinting Utility
 * Creates a unique fingerprint based on browser characteristics
 * This helps prevent multiple votes from the same device/browser
 */

// Simple hash function
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

// Get canvas fingerprint
function getCanvasFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 200;
    canvas.height = 50;
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Browser fingerprint 🎨', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('Browser fingerprint 🎨', 4, 17);
    
    return canvas.toDataURL();
  } catch (e) {
    return 'canvas-unsupported';
  }
}

// Get WebGL fingerprint
function getWebGLFingerprint() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return 'webgl-unsupported';
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      return {
        vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
        renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      };
    }
    return 'webgl-no-debug';
  } catch (e) {
    return 'webgl-error';
  }
}

// Get audio fingerprint
function getAudioFingerprint() {
  return new Promise((resolve) => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
      
      gainNode.gain.value = 0; // Mute output
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.start(0);
      
      scriptProcessor.onaudioprocess = (event) => {
        const output = event.inputBuffer.getChannelData(0);
        const hash = Array.from(output.slice(0, 100))
          .map(x => x.toString(36))
          .join('');
        oscillator.stop();
        audioContext.close();
        resolve(hash.substring(0, 20));
      };
    } catch (e) {
      resolve('audio-unsupported');
    }
  });
}

// Get browser characteristics
function getBrowserFingerprint() {
  const nav = navigator;
  const screen = window.screen;
  
  const components = [
    nav.userAgent,
    nav.language,
    nav.languages?.join(','),
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    screen.pixelDepth,
    new Date().getTimezoneOffset(),
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    nav.hardwareConcurrency || 'unknown',
    nav.deviceMemory || 'unknown',
    nav.platform,
    nav.cookieEnabled ? 'cookies-yes' : 'cookies-no',
    nav.doNotTrack || 'dnt-unknown',
    window.localStorage ? 'localStorage-yes' : 'localStorage-no',
    window.sessionStorage ? 'sessionStorage-yes' : 'sessionStorage-no',
    window.indexedDB ? 'indexedDB-yes' : 'indexedDB-no',
    getCanvasFingerprint(),
    JSON.stringify(getWebGLFingerprint()),
  ];

  return components.join('|');
}

// Generate fingerprint with audio (async) with timeout
export async function generateFingerprint() {
  const browserFp = getBrowserFingerprint();
  
  // Try to get audio fingerprint with timeout
  let audioFp = 'audio-timeout';
  try {
    audioFp = await Promise.race([
      getAudioFingerprint(),
      new Promise((resolve) => setTimeout(() => resolve('audio-timeout'), 2000)) // 2 second timeout
    ]);
  } catch (e) {
    audioFp = 'audio-error';
  }
  
  const fullFingerprint = browserFp + '|audio:' + audioFp;
  const fingerprintHash = hashString(fullFingerprint);
  
  // Store in localStorage for persistence
  const storedFp = localStorage.getItem('browser_fingerprint');
  if (storedFp) {
    return storedFp;
  }
  
  localStorage.setItem('browser_fingerprint', fingerprintHash);
  return fingerprintHash;
}

// Generate fingerprint synchronously (fallback)
export function generateFingerprintSync() {
  const browserFp = getBrowserFingerprint();
  const fingerprintHash = hashString(browserFp);
  
  // Store in localStorage for persistence
  const storedFp = localStorage.getItem('browser_fingerprint');
  if (storedFp) {
    return storedFp;
  }
  
  localStorage.setItem('browser_fingerprint', fingerprintHash);
  return fingerprintHash;
}

// Generate a simple UUID-like ID
function generateId() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Get or create device ID (combines fingerprint with UUID)
export function getDeviceId() {
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = generateId();
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
}

// Combined fingerprint (fingerprint + device ID) with timeout
export async function getCombinedFingerprint() {
  try {
    // Add overall timeout of 3 seconds
    const fingerprint = await Promise.race([
      generateFingerprint(),
      new Promise((resolve) => setTimeout(() => resolve('timeout-fallback'), 3000))
    ]);
    
    // If timeout, use sync version
    if (fingerprint === 'timeout-fallback') {
      return generateFingerprintSync() + '|' + getDeviceId();
    }
    
    const deviceId = getDeviceId();
    return hashString(fingerprint + '|' + deviceId);
  } catch (error) {
    // Fallback to sync version on any error
    console.warn('Fingerprint generation failed, using sync fallback:', error);
    return generateFingerprintSync() + '|' + getDeviceId();
  }
}
