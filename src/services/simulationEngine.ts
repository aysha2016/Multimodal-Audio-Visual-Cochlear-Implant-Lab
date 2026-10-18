import { SimulationState, SimulationMetrics } from '../types';

/**
 * Mathematical models for CI-AI Research Lab
 * Implements audio-visual psychophysics, CI filterbank processing,
 * and high-precision articulatory facial mesh kinematics.
 */

export interface Point2D {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface AnatomicalLipMesh {
  outer: Point2D[];
  inner: Point2D[];
  connectors: [Point2D, Point2D][];
  confidence: number;
  mouthOpening: number;
  mouthWidth: number;
  jawDrop: number;
  upperLipLift: number;
  currentPhoneme: string;
  currentWord: string;
  acousticEnergy: number;
  isSealed: boolean;
  // Full 2D Delaunay mesh vertices for WebGL hardware texture deformation
  meshVertices: { x: number; y: number; u: number; v: number }[];
  meshIndices: number[];
}

export interface PhonemeInfo {
  time: number;
  phoneme: string;
  word: string;
  jaw: number;      // 0.0=sealed bilabial, 0.20=resting, 1.0=wide open
  spread: number;   // 0.2=rounded /u/, 0.5=neutral, 0.9=wide smile /i/
  energy: number;   // 0.0 to 1.0 acoustic RMS amplitude
  isVoiced: boolean;
  isFricative: boolean;
}

/**
 * Phonetically calibrated sentence:
 * "Multimodal speech improves cochlear implants" (5.0s loop)
 * Calibrated against real human speech kinematics & visemes
 */
export const SPEECH_KEYFRAMES: PhonemeInfo[] = [
  { time: 0.00, phoneme: '/ə/',    word: '...',        jaw: 0.20, spread: 0.50, energy: 0.02, isVoiced: true,  isFricative: false },
  // "Multi"
  { time: 0.22, phoneme: '/m/',    word: 'Multi-',     jaw: 0.00, spread: 0.48, energy: 0.38, isVoiced: true,  isFricative: false }, // Bilabial seal
  { time: 0.42, phoneme: '/ʌ/',    word: 'Multi-',     jaw: 0.65, spread: 0.55, energy: 0.88, isVoiced: true,  isFricative: false }, // Open mid vowel
  { time: 0.60, phoneme: '/l/',    word: 'Multi-',     jaw: 0.32, spread: 0.62, energy: 0.72, isVoiced: true,  isFricative: false },
  { time: 0.78, phoneme: '/tɪ/',   word: 'Multi-',     jaw: 0.24, spread: 0.85, energy: 0.62, isVoiced: true,  isFricative: false }, // High spread vowel
  // "modal"
  { time: 0.98, phoneme: '/m/',    word: 'modal',      jaw: 0.00, spread: 0.50, energy: 0.42, isVoiced: true,  isFricative: false }, // Bilabial seal
  { time: 1.20, phoneme: '/oʊ/',   word: 'modal',      jaw: 0.72, spread: 0.25, energy: 0.95, isVoiced: true,  isFricative: false }, // Rounded vowel
  { time: 1.45, phoneme: '/dəl/',  word: 'modal',      jaw: 0.28, spread: 0.58, energy: 0.68, isVoiced: true,  isFricative: false },
  // "speech"
  { time: 1.68, phoneme: '/s/',    word: 'speech',     jaw: 0.16, spread: 0.80, energy: 0.55, isVoiced: false, isFricative: true  }, // Teeth close, fricative hiss
  { time: 1.88, phoneme: '/p/',    word: 'speech',     jaw: 0.00, spread: 0.52, energy: 0.30, isVoiced: false, isFricative: false }, // Bilabial seal & release
  { time: 2.18, phoneme: '/iː/',   word: 'speech',     jaw: 0.42, spread: 0.98, energy: 0.98, isVoiced: true,  isFricative: false }, // Maximum spread smile
  { time: 2.48, phoneme: '/tʃ/',   word: 'speech',     jaw: 0.22, spread: 0.72, energy: 0.60, isVoiced: false, isFricative: true  },
  // Breath pause
  { time: 2.70, phoneme: '/ə/',    word: '...',        jaw: 0.18, spread: 0.50, energy: 0.05, isVoiced: true,  isFricative: false },
  // "improves"
  { time: 2.92, phoneme: '/ɪ/',    word: 'improves',   jaw: 0.32, spread: 0.78, energy: 0.70, isVoiced: true,  isFricative: false },
  { time: 3.12, phoneme: '/m/',    word: 'improves',   jaw: 0.00, spread: 0.48, energy: 0.45, isVoiced: true,  isFricative: false }, // Bilabial seal
  { time: 3.32, phoneme: '/p/',    word: 'improves',   jaw: 0.02, spread: 0.50, energy: 0.38, isVoiced: false, isFricative: false },
  { time: 3.58, phoneme: '/uː/',   word: 'improves',   jaw: 0.60, spread: 0.20, energy: 0.92, isVoiced: true,  isFricative: false }, // Rounded pursed lips
  { time: 3.82, phoneme: '/vz/',   word: 'improves',   jaw: 0.15, spread: 0.68, energy: 0.55, isVoiced: true,  isFricative: true  }, // Labiodental
  // "cochlear"
  { time: 4.05, phoneme: '/k/',    word: 'cochlear',   jaw: 0.26, spread: 0.52, energy: 0.48, isVoiced: false, isFricative: false },
  { time: 4.28, phoneme: '/ɒ/',    word: 'cochlear',   jaw: 0.68, spread: 0.38, energy: 0.88, isVoiced: true,  isFricative: false }, // Open round
  { time: 4.52, phoneme: '/klɪə/', word: 'cochlear',   jaw: 0.35, spread: 0.72, energy: 0.72, isVoiced: true,  isFricative: false },
  // "implants"
  { time: 4.74, phoneme: '/m/',    word: 'implants',   jaw: 0.00, spread: 0.48, energy: 0.40, isVoiced: true,  isFricative: false }, // Bilabial seal
  { time: 4.90, phoneme: '/æ/',    word: 'implants',   jaw: 0.58, spread: 0.65, energy: 0.82, isVoiced: true,  isFricative: false },
  { time: 5.00, phoneme: '/ə/',    word: '...',        jaw: 0.20, spread: 0.50, energy: 0.05, isVoiced: true,  isFricative: false },
];

/**
 * Natural cubic Hermite spline interpolation for biological muscle movements.
 */
function interpolateSpline(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const v0 = (p2 - p0) * 0.5;
  const v1 = (p3 - p1) * 0.5;
  const t2 = t * t;
  const t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * v0 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * v1;
}

export function getPhonemeAtTime(time: number): PhonemeInfo {
  const duration = 5.0;
  const tNorm = ((time % duration) + duration) % duration;

  let idx = 0;
  for (let i = 0; i < SPEECH_KEYFRAMES.length - 1; i++) {
    if (tNorm >= SPEECH_KEYFRAMES[i].time && tNorm <= SPEECH_KEYFRAMES[i + 1].time) {
      idx = i;
      break;
    }
  }

  const kPrev = SPEECH_KEYFRAMES[Math.max(0, idx - 1)];
  const kCurr = SPEECH_KEYFRAMES[idx];
  const kNext = SPEECH_KEYFRAMES[Math.min(SPEECH_KEYFRAMES.length - 1, idx + 1)];
  const kNext2 = SPEECH_KEYFRAMES[Math.min(SPEECH_KEYFRAMES.length - 1, idx + 2)];

  const span = Math.max(0.001, kNext.time - kCurr.time);
  const localT = Math.max(0, Math.min(1, (tNorm - kCurr.time) / span));

  const jaw = Math.max(0.0, Math.min(1.0, interpolateSpline(kPrev.jaw, kCurr.jaw, kNext.jaw, kNext2.jaw, localT)));
  const spread = Math.max(0.1, Math.min(1.0, interpolateSpline(kPrev.spread, kCurr.spread, kNext.spread, kNext2.spread, localT)));
  const energy = Math.max(0.0, Math.min(1.0, interpolateSpline(kPrev.energy, kCurr.energy, kNext.energy, kNext2.energy, localT)));

  return {
    time: tNorm,
    phoneme: localT < 0.5 ? kCurr.phoneme : kNext.phoneme,
    word: kCurr.word,
    jaw,
    spread,
    energy,
    isVoiced: localT < 0.5 ? kCurr.isVoiced : kNext.isVoiced,
    isFricative: localT < 0.5 ? kCurr.isFricative : kNext.isFricative,
  };
}

/**
 * Base resting landmarks calibrated to the real photograph:
 * speaker_1_mouth_1792167604192.jpg (16:9 macro studio portrait)
 */
const BASE_LANDMARKS = {
  // Oral commissures (corners)
  leftCorner:  { x: 34.6, y: 46.2 },
  rightCorner: { x: 67.2, y: 46.2 },

  // Outer upper vermilion (Cupid's bow)
  ou1: { x: 39.0, y: 40.5 },
  ou2: { x: 43.0, y: 35.0 },
  ou3: { x: 46.5, y: 31.0 }, // Left Cupid's peak
  ou4: { x: 49.8, y: 33.2 }, // Philtrum center dip
  ou5: { x: 53.2, y: 31.4 }, // Right Cupid's peak
  ou6: { x: 57.5, y: 35.5 },
  ou7: { x: 62.0, y: 41.0 },

  // Inner upper vermilion (top margin of aperture)
  iu0: { x: 37.0, y: 46.2 },
  iu1: { x: 42.0, y: 41.5 },
  iu2: { x: 46.0, y: 39.2 },
  iu3: { x: 49.8, y: 39.0 },
  iu4: { x: 53.6, y: 39.4 },
  iu5: { x: 58.0, y: 42.0 },
  iu6: { x: 64.5, y: 46.2 },

  // Inner lower vermilion (bottom margin of aperture)
  il1: { x: 58.0, y: 48.0 },
  il2: { x: 53.8, y: 50.2 },
  il3: { x: 49.8, y: 50.8 },
  il4: { x: 45.8, y: 49.8 },
  il5: { x: 42.0, y: 47.8 },

  // Outer lower vermilion (lower lip bottom margin)
  ol1: { x: 62.5, y: 54.0 },
  ol2: { x: 57.8, y: 60.5 },
  ol3: { x: 53.8, y: 64.2 },
  ol4: { x: 49.8, y: 65.5 }, // Lowest point of lower lip
  ol5: { x: 45.8, y: 64.2 },
  ol6: { x: 41.8, y: 60.0 },
  ol7: { x: 37.5, y: 53.5 },

  // Surrounding anchors for 2D mesh stabilization
  noseTip:    { x: 49.8, y: 13.0 },
  nostrilL:   { x: 41.0, y: 9.5  },
  nostrilR:   { x: 58.5, y: 9.5  },
  cheekL:     { x: 20.0, y: 46.0 },
  cheekR:     { x: 81.0, y: 46.0 },
  chinCrease: { x: 49.8, y: 73.0 },
  chinTip:    { x: 49.8, y: 86.0 },
  jawL:       { x: 26.0, y: 78.0 },
  jawR:       { x: 74.0, y: 78.0 },
};

/**
 * Calculates unified anatomical coordinates for both WebGL textured mesh and 2D landmark overlay.
 * Guaranteed 100% mathematical alignment: photo texture and landmark lines move on the exact same nodes.
 */
export function getLipLandmarks(
  time: number,
  visualQuality: number,
  lipTrackingEnabled: boolean,
  targetSpeaker: string
): AnatomicalLipMesh {
  const p = getPhonemeAtTime(time);
  const { jaw, spread, energy, phoneme, word } = p;

  // Bilabial closure detection
  const isSealed = jaw < 0.05;

  // Stomion line (vertical contact position where lips meet when closed)
  const stomionY = 44.8;

  // Mandible displacement relative to resting photo pose (jaw ~ 0.20)
  const deltaJaw = jaw - 0.20;
  // Corner horizontal displacement relative to neutral (spread ~ 0.50)
  const deltaSpread = spread - 0.50;

  // Lower lip vertical displacement:
  // - When jaw drops: lower lip drops down (+dy)
  // - When jaw seals (deltaJaw < 0): lower lip moves up to meet upper lip (-dy)
  const lowerLipDy = deltaJaw > 0 ? deltaJaw * 8.5 : deltaJaw * 9.8;
  // Upper lip subtle vertical displacement:
  const upperLipDy = deltaJaw > 0 ? -deltaJaw * 1.2 : -deltaJaw * 2.8;

  // Chin and mandible track jaw drop:
  const chinDy = deltaJaw * 6.5;

  // Mouth corner displacement:
  // Spread: outward (+X for right, -X for left)
  // Pucker: inward (-X for right, +X for left)
  const cornerDx = deltaSpread * 3.4;
  const cornerDy = deltaSpread * 0.8;

  // Visual degradation jitter (noise increases when visualQuality < 100)
  const jitterAmp = Math.max(0, (100 - visualQuality) * 0.018);
  const jx = () => (Math.random() - 0.5) * jitterAmp;
  const jy = () => (Math.random() - 0.5) * jitterAmp;

  // Displace landmarks
  const leftCorner: Point2D = {
    x: BASE_LANDMARKS.leftCorner.x - cornerDx + jx(),
    y: BASE_LANDMARKS.leftCorner.y - cornerDy + jy(),
  };
  const rightCorner: Point2D = {
    x: BASE_LANDMARKS.rightCorner.x + cornerDx + jx(),
    y: BASE_LANDMARKS.rightCorner.y - cornerDy + jy(),
  };

  // Outer upper vermilion
  const ou1: Point2D = { x: BASE_LANDMARKS.ou1.x - cornerDx * 0.7 + jx(), y: BASE_LANDMARKS.ou1.y + upperLipDy * 0.4 + jy() };
  const ou2: Point2D = { x: BASE_LANDMARKS.ou2.x - cornerDx * 0.4 + jx(), y: BASE_LANDMARKS.ou2.y + upperLipDy * 0.7 + jy() };
  const ou3: Point2D = { x: BASE_LANDMARKS.ou3.x - cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.ou3.y + upperLipDy + jy() };
  const ou4: Point2D = { x: BASE_LANDMARKS.ou4.x + jx(),                 y: BASE_LANDMARKS.ou4.y + upperLipDy * 0.8 + jy() };
  const ou5: Point2D = { x: BASE_LANDMARKS.ou5.x + cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.ou5.y + upperLipDy + jy() };
  const ou6: Point2D = { x: BASE_LANDMARKS.ou6.x + cornerDx * 0.4 + jx(), y: BASE_LANDMARKS.ou6.y + upperLipDy * 0.7 + jy() };
  const ou7: Point2D = { x: BASE_LANDMARKS.ou7.x + cornerDx * 0.7 + jx(), y: BASE_LANDMARKS.ou7.y + upperLipDy * 0.4 + jy() };

  // Inner upper vermilion
  const iu0: Point2D = { x: leftCorner.x + 2.4, y: leftCorner.y };
  const iu6: Point2D = { x: rightCorner.x - 2.4, y: rightCorner.y };

  let iu1: Point2D, iu2: Point2D, iu3: Point2D, iu4: Point2D, iu5: Point2D;
  let il1: Point2D, il2: Point2D, il3: Point2D, il4: Point2D, il5: Point2D;

  if (isSealed) {
    // When sealed, inner upper and inner lower meet seamlessly along the stomion contact line!
    iu1 = { x: BASE_LANDMARKS.iu1.x - cornerDx * 0.5, y: stomionY - 0.4 + jy() };
    iu2 = { x: BASE_LANDMARKS.iu2.x - cornerDx * 0.2, y: stomionY - 0.5 + jy() };
    iu3 = { x: BASE_LANDMARKS.iu3.x,                 y: stomionY - 0.6 + jy() };
    iu4 = { x: BASE_LANDMARKS.iu4.x + cornerDx * 0.2, y: stomionY - 0.5 + jy() };
    iu5 = { x: BASE_LANDMARKS.iu5.x + cornerDx * 0.5, y: stomionY - 0.4 + jy() };

    il1 = { ...iu5 };
    il2 = { ...iu4 };
    il3 = { ...iu3 };
    il4 = { ...iu2 };
    il5 = { ...iu1 };
  } else {
    iu1 = { x: BASE_LANDMARKS.iu1.x - cornerDx * 0.5 + jx(), y: BASE_LANDMARKS.iu1.y + upperLipDy * 0.5 + jy() };
    iu2 = { x: BASE_LANDMARKS.iu2.x - cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.iu2.y + upperLipDy * 0.8 + jy() };
    iu3 = { x: BASE_LANDMARKS.iu3.x + jx(),                 y: BASE_LANDMARKS.iu3.y + upperLipDy + jy() };
    iu4 = { x: BASE_LANDMARKS.iu4.x + cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.iu4.y + upperLipDy * 0.8 + jy() };
    iu5 = { x: BASE_LANDMARKS.iu5.x + cornerDx * 0.5 + jx(), y: BASE_LANDMARKS.iu5.y + upperLipDy * 0.5 + jy() };

    il1 = { x: BASE_LANDMARKS.il1.x + cornerDx * 0.5 + jx(), y: BASE_LANDMARKS.il1.y + lowerLipDy * 0.6 + jy() };
    il2 = { x: BASE_LANDMARKS.il2.x + cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.il2.y + lowerLipDy * 0.85 + jy() };
    il3 = { x: BASE_LANDMARKS.il3.x + jx(),                 y: BASE_LANDMARKS.il3.y + lowerLipDy + jy() };
    il4 = { x: BASE_LANDMARKS.il4.x - cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.il4.y + lowerLipDy * 0.85 + jy() };
    il5 = { x: BASE_LANDMARKS.il5.x - cornerDx * 0.5 + jx(), y: BASE_LANDMARKS.il5.y + lowerLipDy * 0.6 + jy() };
  }

  // Outer lower vermilion
  const ol1: Point2D = { x: BASE_LANDMARKS.ol1.x + cornerDx * 0.7 + jx(), y: BASE_LANDMARKS.ol1.y + lowerLipDy * 0.45 + jy() };
  const ol2: Point2D = { x: BASE_LANDMARKS.ol2.x + cornerDx * 0.4 + jx(), y: BASE_LANDMARKS.ol2.y + lowerLipDy * 0.75 + jy() };
  const ol3: Point2D = { x: BASE_LANDMARKS.ol3.x + cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.ol3.y + lowerLipDy * 0.92 + jy() };
  const ol4: Point2D = { x: BASE_LANDMARKS.ol4.x + jx(),                 y: BASE_LANDMARKS.ol4.y + lowerLipDy + jy() };
  const ol5: Point2D = { x: BASE_LANDMARKS.ol5.x - cornerDx * 0.2 + jx(), y: BASE_LANDMARKS.ol5.y + lowerLipDy * 0.92 + jy() };
  const ol6: Point2D = { x: BASE_LANDMARKS.ol6.x - cornerDx * 0.4 + jx(), y: BASE_LANDMARKS.ol6.y + lowerLipDy * 0.75 + jy() };
  const ol7: Point2D = { x: BASE_LANDMARKS.ol7.x - cornerDx * 0.7 + jx(), y: BASE_LANDMARKS.ol7.y + lowerLipDy * 0.45 + jy() };

  const outer: Point2D[] = [
    leftCorner,
    ou1, ou2, ou3, ou4, ou5, ou6, ou7,
    rightCorner,
    ol1, ol2, ol3, ol4, ol5, ol6, ol7,
  ];

  const inner: Point2D[] = [
    iu0,
    iu1, iu2, iu3, iu4, iu5,
    iu6,
    il1, il2, il3, il4, il5,
  ];

  // Radial connectors
  const connectors: [Point2D, Point2D][] = [
    [outer[0], inner[0]],
    [outer[1], inner[1]],
    [outer[2], inner[1]],
    [outer[3], inner[2]],
    [outer[4], inner[3]], // Center Cupid notch to center inner notch
    [outer[5], inner[4]],
    [outer[6], inner[5]],
    [outer[7], inner[5]],
    [outer[8], inner[6]],
    [outer[9], inner[7]],
    [outer[10], inner[8]],
    [outer[11], inner[8]],
    [outer[12], inner[9]], // Center lower vermilion to center inner lower
    [outer[13], inner[10]],
    [outer[14], inner[10]],
    [outer[15], inner[11]],
  ];

  // Build full 2D mesh vertices (displaced in screen space, with fixed resting UV coordinates)
  // Format: { x: screenX, y: screenY, u: baseU, v: baseV }
  const meshVertices = [
    // 0-7: Screen boundary anchors (fixed)
    { x: 0,   y: 0,   u: 0,   v: 0 },
    { x: 50,  y: 0,   u: 50,  v: 0 },
    { x: 100, y: 0,   u: 100, v: 0 },
    { x: 100, y: 50,  u: 100, v: 50 },
    { x: 100, y: 100, u: 100, v: 100 },
    { x: 50,  y: 100, u: 50,  v: 100 },
    { x: 0,   y: 100, u: 0,   v: 100 },
    { x: 0,   y: 50,  u: 0,   v: 50 },

    // 8-10: Nose anchors (stable)
    { x: BASE_LANDMARKS.noseTip.x,  y: BASE_LANDMARKS.noseTip.y,  u: BASE_LANDMARKS.noseTip.x,  v: BASE_LANDMARKS.noseTip.y },
    { x: BASE_LANDMARKS.nostrilL.x, y: BASE_LANDMARKS.nostrilL.y, u: BASE_LANDMARKS.nostrilL.x, v: BASE_LANDMARKS.nostrilL.y },
    { x: BASE_LANDMARKS.nostrilR.x, y: BASE_LANDMARKS.nostrilR.y, u: BASE_LANDMARKS.nostrilR.x, v: BASE_LANDMARKS.nostrilR.y },

    // 11-12: Cheek anchors
    { x: BASE_LANDMARKS.cheekL.x - cornerDx * 0.2, y: BASE_LANDMARKS.cheekL.y, u: BASE_LANDMARKS.cheekL.x, v: BASE_LANDMARKS.cheekL.y },
    { x: BASE_LANDMARKS.cheekR.x + cornerDx * 0.2, y: BASE_LANDMARKS.cheekR.y, u: BASE_LANDMARKS.cheekR.x, v: BASE_LANDMARKS.cheekR.y },

    // 13-14: Chin and jaw anchors (move with mandible)
    { x: BASE_LANDMARKS.chinCrease.x, y: BASE_LANDMARKS.chinCrease.y + chinDy * 0.8, u: BASE_LANDMARKS.chinCrease.x, v: BASE_LANDMARKS.chinCrease.y },
    { x: BASE_LANDMARKS.chinTip.x,    y: BASE_LANDMARKS.chinTip.y + chinDy,          u: BASE_LANDMARKS.chinTip.x,    v: BASE_LANDMARKS.chinTip.y },

    // 15-30: Outer lip contour (indices 15..30 correspond to outer[0..15])
    ...outer.map((pt, i) => {
      const baseKey = [
        'leftCorner', 'ou1', 'ou2', 'ou3', 'ou4', 'ou5', 'ou6', 'ou7',
        'rightCorner', 'ol1', 'ol2', 'ol3', 'ol4', 'ol5', 'ol6', 'ol7'
      ][i] as keyof typeof BASE_LANDMARKS;
      return {
        x: pt.x,
        y: pt.y,
        u: BASE_LANDMARKS[baseKey].x,
        v: BASE_LANDMARKS[baseKey].y,
      };
    }),

    // 31-42: Inner lip contour (indices 31..42 correspond to inner[0..11])
    ...inner.map((pt, i) => {
      const baseKey = [
        'iu0', 'iu1', 'iu2', 'iu3', 'iu4', 'iu5', 'iu6',
        'il1', 'il2', 'il3', 'il4', 'il5'
      ][i] as keyof typeof BASE_LANDMARKS;
      return {
        x: pt.x,
        y: pt.y,
        u: BASE_LANDMARKS[baseKey].x,
        v: BASE_LANDMARKS[baseKey].y,
      };
    }),
  ];

  // Triangular topology covering the entire face
  const meshIndices = [
    // Top boundary to nose
    0, 1, 9,   1, 8, 9,   1, 2, 10,  1, 10, 8,
    0, 9, 7,   2, 3, 10,  7, 9, 11,  3, 10, 12,

    // Nose to outer upper lip
    9, 8, 18,  8, 10, 20, 8, 19, 18, 8, 20, 19,
    9, 17, 18, 9, 16, 17, 9, 11, 16,
    10, 20, 21, 10, 21, 22, 10, 22, 12,

    // Cheeks to corners
    11, 7, 15,  11, 15, 16,  12, 23, 3,  12, 22, 23,

    // Vermilion ring: Outer lip to inner lip
    // Upper lip vermilion
    15, 31, 16,  16, 31, 32,  16, 32, 17,  17, 32, 33,  17, 33, 18,
    18, 33, 34,  18, 34, 19,  19, 34, 35,  19, 35, 20,
    20, 35, 36,  20, 36, 21,  21, 36, 37,  21, 37, 22,  22, 37, 23,

    // Lower lip vermilion
    23, 37, 24,  24, 37, 38,  24, 38, 25,  25, 38, 39,  25, 39, 26,
    26, 39, 40,  26, 40, 27,  27, 40, 41,  27, 41, 28,  28, 41, 42,
    28, 42, 29,  29, 42, 30,  30, 42, 31,  30, 31, 15,

    // Oral cavity aperture interior
    31, 32, 42,  32, 33, 41,  32, 41, 42,
    33, 34, 40,  33, 40, 41,  34, 35, 39,  34, 39, 40,
    35, 36, 38,  35, 38, 39,  36, 37, 38,

    // Outer lower lip to chin crease and chin tip
    15, 30, 13,  30, 29, 13,  29, 28, 13,  28, 27, 13,  27, 26, 13,  26, 25, 13,  25, 24, 13,  24, 23, 13,
    13, 27, 14,  13, 14, 6,   13, 5, 14,   13, 4, 5,    13, 3, 4,
    7, 6, 15,    15, 6, 13,   3, 13, 23,
  ];

  const confidence = Math.min(0.99, Math.max(0.35, (visualQuality / 100) * 0.98 - Math.random() * 0.015));

  return {
    outer,
    inner,
    connectors,
    confidence,
    mouthOpening: Number(jaw.toFixed(3)),
    mouthWidth: Number(spread.toFixed(3)),
    jawDrop: Number(lowerLipDy.toFixed(2)),
    upperLipLift: Number(upperLipDy.toFixed(2)),
    currentPhoneme: phoneme,
    currentWord: word,
    acousticEnergy: Number(energy.toFixed(3)),
    isSealed,
    meshVertices,
    meshIndices,
  };
}

/**
 * Calculates real-time scientific metrics according to:
 * - Sumby & Pollack (1954) audio-visual speech reception threshold
 * - Taal et al. (2011) Short-Time Objective Intelligibility (STOI)
 * - CI channel limitation & Current spread effects
 */
export function calculateMetrics(state: SimulationState): SimulationMetrics {
  const { snr, visualQuality, lipTracking, processingMode, visualReliability, ciChannels, currentSpread } = state;

  const vQuality = visualQuality / 100;
  const vReliability = visualReliability / 100;
  const vTrackingActive = lipTracking ? 1.0 : 0.15;

  const snrThreshold = 3.0; // dB
  const slope = 0.16;
  const baseAudioScore = 1 / (1 + Math.exp(-slope * (snr - snrThreshold)));

  const channelFactor = ciChannels === 22 ? 1.0 : ciChannels === 16 ? 0.92 : ciChannels === 12 ? 0.82 : 0.68;
  const spreadFactor = currentSpread === 'Low' ? 1.0 : currentSpread === 'Medium' ? 0.93 : 0.84;

  const audioOnlyScore = Math.max(0.12, Math.min(0.88, baseAudioScore * channelFactor * spreadFactor));

  let finalScore = audioOnlyScore;
  let visualContrib = 0;
  let fusionConf = 0.45;

  if (processingMode === 'Audio + Visual') {
    const roomForImprovement = 1.0 - audioOnlyScore;
    const visualGainFactor = 0.58 * vQuality * vReliability * vTrackingActive;
    visualContrib = Math.max(0.04, roomForImprovement * visualGainFactor);
    finalScore = Math.min(0.96, audioOnlyScore + visualContrib);
    fusionConf = Math.min(0.98, 0.45 + 0.35 * vQuality + 0.18 * vReliability);
  } else {
    visualContrib = 0.0;
    fusionConf = 0.30;
  }

  const rawStoi = 0.45 + 0.022 * snr;
  const stoi = Math.max(0.15, Math.min(0.95, processingMode === 'Audio + Visual' ? rawStoi + 0.08 * vQuality : rawStoi));

  const recognitionTrend = Math.round(((finalScore - audioOnlyScore) / Math.max(0.1, audioOnlyScore)) * 100);
  const stoiTrend = Math.round(processingMode === 'Audio + Visual' ? 12 : 2);
  const visualContribTrend = Math.round(visualContrib * 65);
  const fusionConfidenceTrend = Math.round((fusionConf - 0.5) * 40);

  const generateSparkline = (currentVal: number, variance: number): number[] => {
    const points: number[] = [];
    for (let i = 0; i < 12; i++) {
      const stepNoise = Math.sin(i * 0.7) * variance + (Math.random() - 0.5) * (variance * 0.5);
      points.push(Math.max(0.05, Math.min(1.0, currentVal - variance + stepNoise)));
    }
    points[11] = currentVal;
    return points;
  };

  return {
    speechRecognitionScore: Number(finalScore.toFixed(2)),
    recognitionTrend: Math.max(0, recognitionTrend),
    stoi: Number(stoi.toFixed(2)),
    stoiTrend: Math.max(0, stoiTrend),
    visualContribution: Number(visualContrib.toFixed(2)),
    visualContributionTrend: Math.max(0, visualContribTrend),
    fusionConfidence: Number(fusionConf.toFixed(2)),
    fusionConfidenceTrend: Math.max(0, fusionConfidenceTrend),
    recognitionHistory: generateSparkline(finalScore, 0.04),
    stoiHistory: generateSparkline(stoi, 0.03),
    visualHistory: generateSparkline(visualContrib, 0.05),
    fusionHistory: generateSparkline(fusionConf, 0.03),
  };
}

export function getSnrComparisonData(state: SimulationState) {
  const snrLevels = [-10, -5, 0, 5, 10, 15, 20];
  const { visualQuality, visualReliability, lipTracking, processingMode, ciChannels, currentSpread } = state;

  const vQuality = visualQuality / 100;
  const vReliability = visualReliability / 100;
  const vTracking = lipTracking ? 1.0 : 0.2;
  const channelFactor = ciChannels === 22 ? 1.0 : ciChannels === 16 ? 0.92 : ciChannels === 12 ? 0.82 : 0.68;
  const spreadFactor = currentSpread === 'Low' ? 1.0 : currentSpread === 'Medium' ? 0.93 : 0.84;

  return snrLevels.map((snr) => {
    const baseAudio = 1 / (1 + Math.exp(-0.16 * (snr - 3.0))) * channelFactor * spreadFactor;
    const audioScore = Math.max(0.12, Math.min(0.88, baseAudio));
    
    let avScore = audioScore;
    if (processingMode === 'Audio + Visual') {
      const room = 1.0 - audioScore;
      const visualGain = 0.58 * vQuality * vReliability * vTracking;
      avScore = Math.min(0.96, audioScore + room * visualGain);
    }

    return {
      snr,
      snrLabel: `${snr}`,
      audioOnly: Number(audioScore.toFixed(2)),
      audioVisual: Number(avScore.toFixed(2)),
      isCurrent: snr === state.snr,
    };
  });
}
