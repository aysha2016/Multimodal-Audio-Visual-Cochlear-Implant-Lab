import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Maximize2, Volume2, VolumeX, Sliders } from 'lucide-react';
import { SimulationState } from '../types';
import { getLipLandmarks, AnatomicalLipMesh } from '../services/simulationEngine';
import { speechAudioEngine } from '../services/speechAudioEngine';

interface AnimatedSpeakerVideoProps {
  state: SimulationState;
  onUpdateState: (updates: Partial<SimulationState>) => void;
  webcamActive: boolean;
  onToggleWebcam: () => void;
  webcamVideoRef: React.RefObject<HTMLVideoElement | null>;
}

// Textured 2D mesh vertex shader: maps dynamic screen positions to resting photo UV coordinates
const VS_SOURCE = `
  attribute vec2 a_position; // screen coordinates in clip space [-1.0, 1.0]
  attribute vec2 a_texCoord; // normalized UV coordinates [0.0, 1.0]
  varying vec2 v_texCoord;

  void main() {
    v_texCoord = a_texCoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

// Fragment shader: high-fidelity texture sampling with degradation simulation
const FS_SOURCE = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_blur;
  uniform float u_cavityDarkness;
  varying vec2 v_texCoord;

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);

    // Visual quality blur degradation simulation
    if (u_blur > 0.0) {
      vec2 off = vec2(u_blur * 0.0016, u_blur * 0.0022);
      vec4 b1 = texture2D(u_image, v_texCoord + off);
      vec4 b2 = texture2D(u_image, v_texCoord - off);
      vec4 b3 = texture2D(u_image, v_texCoord + vec2(off.x, -off.y));
      vec4 b4 = texture2D(u_image, v_texCoord - vec2(off.x, -off.y));
      color = (color + b1 + b2 + b3 + b4) * 0.2;
    }

    gl_FragColor = color;
  }
`;

export const AnimatedSpeakerVideo: React.FC<AnimatedSpeakerVideoProps> = ({
  state,
  onUpdateState,
  webcamActive,
  onToggleWebcam,
  webcamVideoRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const baseImgRef = useRef<HTMLImageElement | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [volume, setVolume] = useState(0.85);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  // WebGL references
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);
  const textureRef = useRef<WebGLTexture | null>(null);
  const posBufferRef = useRef<WebGLBuffer | null>(null);
  const uvBufferRef = useRef<WebGLBuffer | null>(null);
  const indexBufferRef = useRef<WebGLBuffer | null>(null);
  const uniformsRef = useRef<{
    image: WebGLUniformLocation | null;
    blur: WebGLUniformLocation | null;
    cavityDarkness: WebGLUniformLocation | null;
  } | null>(null);

  const {
    currentTime,
    duration,
    isPlaying,
    visualQuality,
    lipTracking,
    targetSpeaker,
  } = state;

  const speakerImgSrc = targetSpeaker === 'Speaker 2'
    ? '/src/assets/images/speaker_2_mouth_1792167604471.jpg'
    : '/src/assets/images/speaker_1_mouth_1792167604192.jpg';

  // Compute unified anatomical lip coordinates and 2D mesh kinematics
  const lipMesh: AnatomicalLipMesh = getLipLandmarks(
    currentTime,
    visualQuality,
    lipTracking,
    targetSpeaker
  );

  // Initialize Audio Engine on first interaction
  const initAudio = () => {
    speechAudioEngine.init();
    speechAudioEngine.resume();
  };

  // Sync state to speechAudioEngine
  useEffect(() => {
    speechAudioEngine.setMuted(isAudioMuted);
    speechAudioEngine.setVolume(volume);
    speechAudioEngine.update(state);
  }, [state, isAudioMuted, volume]);

  // Initialize WebGL context and shaders
  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', { antialias: true, alpha: false, preserveDrawingBuffer: false });
    } catch {
      gl = null;
    }

    if (!gl) return;
    glRef.current = gl;

    const createShader = (type: number, src: string) => {
      const s = gl!.createShader(type);
      if (!s) return null;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };

    const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    programRef.current = program;

    posBufferRef.current = gl.createBuffer();
    uvBufferRef.current = gl.createBuffer();
    indexBufferRef.current = gl.createBuffer();

    uniformsRef.current = {
      image: gl.getUniformLocation(program, 'u_image'),
      blur: gl.getUniformLocation(program, 'u_blur'),
      cavityDarkness: gl.getUniformLocation(program, 'u_cavityDarkness'),
    };

    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    textureRef.current = texture;
  }, []);

  // Load the speaker image into the WebGL texture
  useEffect(() => {
    setImageLoaded(false);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = speakerImgSrc;
    img.onload = () => {
      baseImgRef.current = img;
      setImageLoaded(true);

      const gl = glRef.current;
      const texture = textureRef.current;
      if (gl && texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      }
    };
  }, [speakerImgSrc]);

  // Render WebGL frame: hardware-accelerated 2D triangular mesh warping
  useEffect(() => {
    const gl = glRef.current;
    const program = programRef.current;
    const uniforms = uniformsRef.current;

    if (!gl || !program || !uniforms || !imageLoaded) return;

    if (webcamActive && webcamVideoRef.current && webcamVideoRef.current.readyState >= 2) {
      const texture = textureRef.current;
      if (texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, webcamVideoRef.current);
      }
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(program);

    // Prepare vertex positions in clip space [-1.0, 1.0]
    // WebGL clip space: X in [-1, 1], Y in [-1, 1] (where +1 is top, -1 is bottom)
    const positions: number[] = [];
    const texCoords: number[] = [];

    lipMesh.meshVertices.forEach((v) => {
      // Screen X [0..100] -> Clip X [-1..1]
      const clipX = (v.x / 100) * 2 - 1;
      // Screen Y [0..100] -> Clip Y [1..-1]
      const clipY = 1 - (v.y / 100) * 2;
      positions.push(clipX, clipY);

      // Texture UV coordinates [0..1]
      const u = v.u / 100;
      const vCoord = v.v / 100;
      texCoords.push(u, vCoord);
    });

    const posBuffer = posBufferRef.current;
    const uvBuffer = uvBufferRef.current;
    const idxBuffer = indexBufferRef.current;

    if (posBuffer && uvBuffer && idxBuffer) {
      // Upload positions
      gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
      const aPos = gl.getAttribLocation(program, 'a_position');
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      // Upload UVs
      gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texCoords), gl.STATIC_DRAW);
      const aTex = gl.getAttribLocation(program, 'a_texCoord');
      gl.enableVertexAttribArray(aTex);
      gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 0, 0);

      // Upload triangle indices
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lipMesh.meshIndices), gl.STATIC_DRAW);

      // Uniforms
      gl.uniform1f(uniforms.blur, visualQuality < 100 ? (100 - visualQuality) * 0.08 : 0.0);
      gl.uniform1f(uniforms.cavityDarkness, lipMesh.mouthOpening > 0.3 ? (lipMesh.mouthOpening - 0.3) * 0.8 : 0.0);

      // Draw all triangles
      gl.drawElements(gl.TRIANGLES, lipMesh.meshIndices.length, gl.UNSIGNED_SHORT, 0);
    }
  }, [currentTime, imageLoaded, visualQuality, lipMesh, webcamActive]);

  // Render Exact Landmark Mesh on top overlay canvas (guaranteed exact match to photo deformation)
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    if (lipTracking && lipMesh.outer.length > 0) {
      ctx.save();

      // Outer vermilion polygon (soft purple tint with glowing outline)
      ctx.beginPath();
      const p0 = lipMesh.outer[0];
      ctx.moveTo((p0.x / 100) * width, (p0.y / 100) * height);
      for (let i = 1; i < lipMesh.outer.length; i++) {
        const pt = lipMesh.outer[i];
        ctx.lineTo((pt.x / 100) * width, (pt.y / 100) * height);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
      ctx.fill();
      ctx.strokeStyle = '#C084FC';
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Inner mouth aperture polygon
      if (lipMesh.inner.length > 0 && !lipMesh.isSealed) {
        ctx.beginPath();
        const in0 = lipMesh.inner[0];
        ctx.moveTo((in0.x / 100) * width, (in0.y / 100) * height);
        for (let i = 1; i < lipMesh.inner.length; i++) {
          const pt = lipMesh.inner[i];
          ctx.lineTo((pt.x / 100) * width, (pt.y / 100) * height);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(236, 72, 153, 0.16)';
        ctx.fill();
        ctx.strokeStyle = '#F472B6';
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }

      // Transverse radial connector lattice lines
      ctx.strokeStyle = 'rgba(233, 213, 255, 0.55)';
      ctx.lineWidth = 0.9;
      lipMesh.connectors.forEach(([outerPt, innerPt]) => {
        ctx.beginPath();
        ctx.moveTo((outerPt.x / 100) * width, (outerPt.y / 100) * height);
        ctx.lineTo((innerPt.x / 100) * width, (innerPt.y / 100) * height);
        ctx.stroke();
      });

      // Outer landmark node dots
      lipMesh.outer.forEach((pt) => {
        const px = (pt.x / 100) * width;
        const py = (pt.y / 100) * height;

        ctx.beginPath();
        ctx.arc(px, py, 3.4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#9333EA';
        ctx.lineWidth = 1.8;
        ctx.stroke();
      });

      // Inner landmark node dots
      lipMesh.inner.forEach((pt) => {
        const px = (pt.x / 100) * width;
        const py = (pt.y / 100) * height;

        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#EC4899';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      ctx.restore();
    }
  }, [lipTracking, lipMesh]);

  const togglePlay = () => {
    initAudio();
    const nextPlaying = !isPlaying;
    onUpdateState({ isPlaying: nextPlaying });
    if (nextPlaying) {
      speechAudioEngine.speakUtterance(targetSpeaker === 'Speaker 2' ? 'male' : 'female');
    } else {
      speechAudioEngine.stop();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    initAudio();
    onUpdateState({ currentTime: parseFloat(e.target.value) });
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const toggleAudio = () => {
    initAudio();
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    if (!nextMuted && isPlaying) {
      speechAudioEngine.speakUtterance(targetSpeaker === 'Speaker 2' ? 'male' : 'female');
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={initAudio}
      className="relative bg-slate-950 rounded-xl overflow-hidden aspect-16/10 flex flex-col justify-between shadow-inner group border border-slate-900 select-none"
    >
      {/* Top Overlay Badges */}
      <div className="relative z-20 flex items-center justify-between p-3 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <span className="px-2.5 py-0.5 rounded-md bg-black/65 backdrop-blur-xs text-white text-xs font-semibold tracking-wide">
            Video Input
          </span>
          {lipTracking && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-black/75 backdrop-blur-xs border border-purple-500/30 text-purple-200 text-[11px] font-mono">
              <span className="font-semibold text-white">Word: "{lipMesh.currentWord}"</span>
              <span className="text-purple-400">·</span>
              <span className="text-emerald-300 font-bold">Viseme: {lipMesh.currentPhoneme}</span>
              {lipMesh.isSealed && (
                <span className="text-amber-300 text-[10px] bg-amber-950/60 px-1 rounded border border-amber-500/40 font-sans">
                  Bilabial Seal
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quick Voice Play button */}
          <button
            onClick={() => {
              initAudio();
              setIsAudioMuted(false);
              speechAudioEngine.speakUtterance(targetSpeaker === 'Speaker 2' ? 'male' : 'female');
            }}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 text-purple-300 hover:text-white border border-purple-500/40 text-[11px] font-medium transition-colors cursor-pointer"
            title="Play spoken voice"
          >
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Play Speech</span>
          </button>

          {/* Prominent Audio Toggle & Volume Control */}
          <div className="relative flex items-center">
            <button
              onClick={toggleAudio}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all backdrop-blur-xs cursor-pointer shadow-xs ${
                !isAudioMuted
                  ? 'bg-purple-600 hover:bg-purple-500 text-white border border-purple-400 shadow-purple-900/50'
                  : 'bg-black/60 text-slate-300 hover:text-white border border-white/20'
              }`}
              title={isAudioMuted ? 'Click to Enable Speech Sound' : 'Click to Mute Audio'}
            >
              {!isAudioMuted ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-pulse text-purple-200" />
                  <span className="text-[11px] font-semibold">Sound ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[11px]">Unmute</span>
                </>
              )}
            </button>

            {/* Quick volume slider trigger */}
            <button
              onClick={() => setShowVolumeSlider(!showVolumeSlider)}
              className="ml-1 p-1 rounded-full bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Adjust Volume"
            >
              <Sliders className="w-3 h-3" />
            </button>

            {showVolumeSlider && (
              <div className="absolute top-8 right-0 bg-slate-900/95 border border-slate-700/80 rounded-lg p-2.5 shadow-xl flex items-center gap-2 z-30 min-w-32">
                <span className="text-[10px] text-slate-300 font-mono">Vol:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => {
                    initAudio();
                    setVolume(parseFloat(e.target.value));
                    setIsAudioMuted(false);
                  }}
                  className="w-20 h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-[10px] text-slate-200 font-mono">{Math.round(volume * 100)}%</span>
              </div>
            )}
          </div>

          {/* Mode Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/65 backdrop-blur-xs text-white text-xs font-medium">
            <span
              className={`w-2 h-2 rounded-full ${
                webcamActive ? 'bg-emerald-500 animate-pulse' : 'bg-purple-500'
              }`}
            />
            <span>{webcamActive ? 'Live Camera' : 'Unified Model'}</span>
          </div>
        </div>
      </div>

      {/* Main Continuous Deformed Canvas (WebGL Hardware-Accelerated 2D Mesh) */}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <canvas
          ref={glCanvasRef}
          width={1376}
          height={768}
          className="w-full h-full object-cover block"
        />
        {/* Transparent Landmark Overlay Canvas (100% synchronized with WebGL vertices) */}
        <canvas
          ref={overlayCanvasRef}
          width={1376}
          height={768}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />
      </div>

      {/* Hidden Webcam Video for Frame Grabbing */}
      <video
        ref={webcamVideoRef}
        autoPlay
        playsInline
        muted
        className="hidden"
      />

      {/* Bottom Video Controls Bar */}
      <div className="relative z-20 p-3 bg-gradient-to-t from-black/85 via-black/45 to-transparent flex items-center gap-3 text-white text-xs">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        {/* Scrub slider */}
        <input
          type="range"
          min="0"
          max={duration}
          step="0.05"
          value={currentTime}
          onChange={handleSeek}
          className="flex-1 h-1.5 bg-white/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />

        {/* Time display: 0:02 / 0:05 */}
        <span className="font-mono text-[11px] tabular-nums shrink-0 text-slate-200">
          0:0{Math.floor(currentTime)} / 0:0{Math.floor(duration)}
        </span>

        {/* Fullscreen Button */}
        <button
          onClick={handleFullscreen}
          className="p-1 hover:text-purple-300 transition-colors cursor-pointer"
          title="Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
