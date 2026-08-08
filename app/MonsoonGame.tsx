"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

type Screen = "intro" | "details" | "playing" | "gameover";
type Basket = { name: string; fee: string; runs: number; short: string; icon: string };
type PowerUp = "spring" | "rocket" | null;
type Platform = { x: number; y: number; w: number; h: number; basket: number | null; collected: boolean; drift: number; kind: "normal" | "breakable"; broken: boolean; powerUp: PowerUp; powerUsed: boolean };
type Villain = { id: number; x: number; y: number; baseY: number; w: number; h: number; vx: number; phase: number; alive: boolean };
type Fireball = { x: number; y: number; vx: number; vy: number; targetId: number; life: number };
type SoundKind = "click" | "collect" | "jump" | "spring" | "rocket" | "break" | "level" | "start" | "fall" | "shoot";

const SOUND_FILES: Partial<Record<SoundKind, string>> = {
  start: "/audio/game-start.mp3",
  jump: "/audio/jump.mp3",
  collect: "/audio/basket-collected.mp3",
  spring: "/audio/spring.mp3",
  rocket: "/audio/rocket.mp3",
  level: "/audio/level-unlocked.mp3",
  fall: "/audio/game-over.mp3",
};

const SCORE_GATES = {
  movingBoards: 10000,
  breakableBoards: 20000,
  villains: 30000,
  worldChange: 10000,
  fullDifficulty: 50000,
} as const;

const BASKETS: Basket[] = [
  { name: "HNI Prime–Growth at a Fair Price Asset Allocation", fee: "₹1,00,000", runs: 200, short: "HNI", icon: "◆" },
  { name: "Core Consumption Compounders Fundamental", fee: "₹70,800", runs: 140, short: "CORE", icon: "◉" },
  { name: "NRI–Core Consumption Compounders Fundamental", fee: "₹70,800", runs: 140, short: "NRI-C", icon: "⬡" },
  { name: "NRI Select – Omni Sector Rotation Quant", fee: "₹50,000", runs: 100, short: "OMNI", icon: "✦" },
  { name: "Alpha Bluechip Fixed Fee Fundamental", fee: "₹50,000", runs: 85, short: "ABF", icon: "▲" },
  { name: "Alpha Master of the Street Fixed Fee Fundamental", fee: "₹50,000", runs: 85, short: "AMS", icon: "★" },
  { name: "Gulaq Prime Quant", fee: "₹29,000", runs: 60, short: "GPQ", icon: "●" },
  { name: "Alpha Generator Quant", fee: "₹25,000", runs: 42, short: "AGQ", icon: "⚡" },
  { name: "NRI Select – Value & Momentum Model", fee: "₹20,000", runs: 40, short: "NRI-V", icon: "⬢" },
  { name: "HDFC Premium Basket Fundamental", fee: "₹70,000", runs: 32, short: "HDFC-P", icon: "▰" },
  { name: "Lotusdew Listed Venture Capital HNI Theme", fee: "₹14,986", runs: 25, short: "LOTUS", icon: "✿" },
  { name: "Equity Select Smart Beta", fee: "₹14,750", runs: 25, short: "ESSB", icon: "◇" },
  { name: "Value & Momentum Model", fee: "₹12,000", runs: 24, short: "V&M", icon: "↗" },
  { name: "GEM-Q Model", fee: "₹12,000", runs: 24, short: "GEM-Q", icon: "◆" },
  { name: "Quality Smallcap Quant", fee: "₹12,000", runs: 24, short: "QSQ", icon: "✦" },
  { name: "CWA All Caps 35 Quant", fee: "₹11,800", runs: 23, short: "CWA", icon: "◫" },
  { name: "HDFC NRI Basket Fundamental", fee: "₹50,000", runs: 22, short: "HDFC-N", icon: "▣" },
  { name: "GoalFi Growth & Value Flexi Cap Model – Cash Only", fee: "₹14,999", runs: 12, short: "GOALFI", icon: "◎" },
  { name: "One 4 You – Asset Allocation", fee: "₹25,000", runs: 11, short: "O4Y", icon: "4" },
  { name: "Gulaq HDFC Gear 6 Quant", fee: "₹5,900", runs: 10, short: "GEAR6", icon: "⚙" },
  { name: "GoalFi Large Cap Balanced Multi Asset Model – Cash Only", fee: "₹12,000", runs: 10, short: "GLCB", icon: "◒" },
  { name: "Large Cap Legends – Fundamental", fee: "₹5,000", runs: 2, short: "LCL", icon: "♜" },
  { name: "Nucleus Small-Cap Portfolio Fundamental", fee: "₹5,000", runs: 2, short: "NSC", icon: "✺" },
];

const SLABS = [
  { runs: 500, points: 50000 },
  { runs: 650, points: 65000 },
  { runs: 800, points: 80000 },
  { runs: 900, points: 90000 },
];

const WORLDS = [
  { name: "Aurora", icon: "🌌", scene: 1 },
  { name: "Metro City", icon: "🏙️", scene: 0 },
  { name: "Kashmir", icon: "🏔️", scene: 2 },
  { name: "Pacific Ocean", icon: "🌊", scene: 4 },
  { name: "Milky Way", icon: "🪐", scene: 5 },
  { name: "Thar Dunes", icon: "🏜️", scene: 3 },
  { name: "Monsoon Forest", icon: "🌧️", scene: 0 },
  { name: "Ladakh Sunrise", icon: "🌄", scene: 3 },
  { name: "Miami", icon: "🏖️", scene: 6 },
];

function platformExtras(index: number, score = 0) {
  const powerUp: PowerUp = index > 3 && index % 13 === 0 ? "rocket" : index > 2 && index % 8 === 0 ? "spring" : null;
  const breakFrequency = score < SCORE_GATES.breakableBoards ? 0 : score < SCORE_GATES.villains ? 11 : score < 40000 ? 9 : score < SCORE_GATES.fullDifficulty ? 8 : 7;
  return { kind: breakFrequency && index > 4 && index % breakFrequency === 0 ? "breakable" as const : "normal" as const, broken: false, powerUp, powerUsed: false };
}

function platformDrift(index: number, score: number) {
  if (score < SCORE_GATES.movingBoards) return 0;
  const progress = clamp((score - SCORE_GATES.movingBoards) / (SCORE_GATES.fullDifficulty - SCORE_GATES.movingBoards), 0, 1);
  const frequency = score < 15000 ? 6 : score < SCORE_GATES.breakableBoards ? 5 : 4;
  return index % frequency === 0 ? .15 + progress * .24 : 0;
}

function sideBoard(platform: Platform, width: number): Platform {
  const w = Math.max(68, Math.min(84, platform.w * .86));
  const goRight = platform.x + platform.w / 2 < width / 2;
  const x = goRight ? clamp(platform.x + platform.w + 24, 8, width - w - 8) : clamp(platform.x - w - 24, 8, width - w - 8);
  return { x, y: platform.y + 17, w, h: 13, basket: null, collected: true, drift: 0, kind: "normal", broken: false, powerUp: null, powerUsed: false };
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function rewardPoints(runs: number) {
  if (runs < 500) return 0;
  if (runs < 650) return 50000;
  if (runs < 800) return 65000;
  if (runs < 900) return 80000;
  return 90000 + Math.floor((runs - 900) / 50) * 5000;
}

export default function MonsoonGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const runSpriteRef = useRef<HTMLImageElement | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const clipRefs = useRef<Partial<Record<SoundKind, HTMLAudioElement>>>({});
  const mutedRef = useRef(false);
  const gameRef = useRef({
    player: { x: 180, y: 500, vx: 0, vy: -10, w: 34, h: 44 },
    platforms: [] as Platform[], input: 0, pointerX: null as number | null,
    score: 0, runs: 0, distance: 0, basketCursor: 0, lastTime: 0, width: 390, height: 700,
    collectionCounts: Array(BASKETS.length).fill(0) as number[], rocketUntil: 0, worldIndex: 0, worldStage: 0, nextWorldChangeAt: 0, nearbyBasket: -1, isFalling: false, fallStarted: 0,
    villains: [] as Villain[], fireballs: [] as Fireball[], nextVillainAt: 0, villainCursor: 0, villainsDefeated: 0,
  });
  const [screen, setScreen] = useState<Screen>("intro");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [branch, setBranch] = useState("");
  const [score, setScore] = useState(0);
  const [runs, setRuns] = useState(0);
  const [best, setBest] = useState(0);
  const [control, setControl] = useState("Touch / keys ready");
  const [toast, setToast] = useState<Basket | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<number[]>(() => Array(BASKETS.length).fill(0));
  const [worldIndex, setWorldIndex] = useState(0);
  const [worldToast, setWorldToast] = useState(false);
  const [nearbyBasket, setNearbyBasket] = useState(1);
  const [muted, setMuted] = useState(false);
  const [falling, setFalling] = useState(false);
  const [villainsDefeated, setVillainsDefeated] = useState(0);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setBest(Number(localStorage.getItem("monsoon-bonanza-best") || 0));
    const image = new Image(); image.src = "/doraemon-sprite.png"; spriteRef.current = image;
    const runImage = new Image(); runImage.src = "/doraemon-run.png"; runSpriteRef.current = runImage;
    for (const [kind, source] of Object.entries(SOUND_FILES) as [SoundKind, string][]) {
      const clip = new Audio(source); clip.preload = "auto"; clipRefs.current[kind] = clip;
    }
  }, []);

  const playSfx = useCallback((kind: SoundKind) => {
    if (mutedRef.current || typeof window === "undefined") return;
    const clip = clipRefs.current[kind];
    if (clip) {
      if (kind === "collect") {
        const levelClip = clipRefs.current.level;
        if (levelClip) { levelClip.pause(); levelClip.currentTime = 0; }
      }
      clip.pause(); clip.currentTime = 0; clip.volume = kind === "jump" ? .42 : .78;
      void clip.play().catch(() => { /* A browser can defer audio until its first user gesture. */ });
      return;
    }
    const AudioCtor = window.AudioContext || (window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const audio = audioRef.current ?? new AudioCtor(); audioRef.current = audio; void audio.resume();
    const tone = (frequency: number, delay: number, duration: number, type: OscillatorType = "sine", endFrequency?: number, volume = .075) => {
      const oscillator = audio.createOscillator(); const gain = audio.createGain(); const start = audio.currentTime + delay;
      oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
      gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .015); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
      oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
    };
    if (kind === "click") tone(420, 0, .07, "triangle", 520, .035);
    if (kind === "break") { tone(135, 0, .1, "square", 70, .045); tone(90, .06, .14, "triangle", 45, .035); }
    if (kind === "shoot") { tone(720, 0, .16, "sawtooth", 210, .055); tone(980, .03, .1, "triangle", 420, .035); }
  }, []);

  const makePlatforms = useCallback((width: number, height: number) => {
    const items: Platform[] = [{ x: width / 2 - 52, y: height - 75, w: 104, h: 13, basket: null, collected: true, drift: 0, ...platformExtras(0) }];
    let y = height - 155;
    let previousX = width / 2 - 50;
    for (let i = 0; i < 15; i += 1) {
      const w = 94 + Math.random() * 24;
      const reach = Math.min(108, width * 0.28);
      const x = clamp(previousX + (Math.random() - 0.5) * reach * 2, 12, width - w - 12);
      const extras = platformExtras(i, 0);
      const platform: Platform = { x, y, w, h: 13, basket: i % 3 === 1 && !extras.powerUp ? i % BASKETS.length : null, collected: false, drift: 0, ...extras };
      items.push(platform);
      if (i % 4 === 0) items.push(sideBoard(platform, width));
      previousX = x;
      y -= 62 + Math.random() * 10;
    }
    return items;
  }, []);

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    const width = canvas?.clientWidth || 390;
    const height = canvas?.clientHeight || 700;
    const game = gameRef.current;
    game.width = width; game.height = height;
    game.player = { x: width / 2 - 17, y: height - 130, vx: 0, vy: -11, w: 34, h: 44 };
    game.platforms = makePlatforms(width, height);
    game.input = 0; game.pointerX = null; game.score = 0; game.runs = 0; game.distance = 0; game.basketCursor = 4; game.lastTime = 0;
    const firstWorld = Math.floor(Math.random() * WORLDS.length);
    game.collectionCounts = Array(BASKETS.length).fill(0); game.rocketUntil = 0; game.worldIndex = firstWorld; game.worldStage = 0; game.nextWorldChangeAt = 0; game.nearbyBasket = 1; game.isFalling = false; game.fallStarted = 0;
    game.villains = []; game.fireballs = []; game.nextVillainAt = 0; game.villainCursor = 0; game.villainsDefeated = 0;
    setScore(0); setRuns(0); setToast(null); setCollectionCounts(Array(BASKETS.length).fill(0)); setWorldIndex(firstWorld); setWorldToast(false); setNearbyBasket(1); setFalling(false); setVillainsDefeated(0);
  }, [makePlatforms]);

  const enableMotion = useCallback(async () => {
    try {
      const Orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
      if (typeof Orientation.requestPermission === "function") {
        const permission = await Orientation.requestPermission();
        if (permission !== "granted") { setControl("Touch / keys active"); return; }
      }
      const handler = (event: DeviceOrientationEvent) => {
        if (event.gamma == null) return;
        gameRef.current.input = clamp(event.gamma / 24, -1, 1);
        setControl("Tilt active");
      };
      window.addEventListener("deviceorientation", handler, { passive: true });
      window.setTimeout(() => setControl((current) => current === "Tilt active" ? current : "Touch / keys active"), 1200);
    } catch { setControl("Touch / keys active"); }
  }, []);

  const submitLead = async () => {
    const lead = { name: name.trim(), mobile, branch: branch.trim(), campaign: "Doremon Jump", createdAt: new Date().toISOString() };
    localStorage.setItem("monsoon-bonanza-player", JSON.stringify(lead));
    const viteEndpoint = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_LEAD_FORM_ENDPOINT;
    const endpoint = viteEndpoint ?? (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LEAD_FORM_ENDPOINT : undefined);
    if (!endpoint) return;
    const isNetlify = endpoint === "/";
    await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": isNetlify ? "application/x-www-form-urlencoded" : "application/json" },
      body: isNetlify
        ? new URLSearchParams({ "form-name": "doremon-jump-leads", ...lead }).toString()
        : JSON.stringify(lead),
    });
  };

  const startGame = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setFormError("Please enter your name."); return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { setFormError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!branch.trim()) { setFormError("Please enter your branch."); return; }
    setSubmitting(true); setFormError("");
    try { await submitLead(); } catch { /* The local copy still allows play when the optional endpoint is unavailable. */ }
    await enableMotion();
    playSfx("start"); resetGame(); setScreen("playing"); setSubmitting(false);
  };

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const game = gameRef.current;
      if (game.width > 0 && Math.abs(game.width - rect.width) > 1) {
        const xScale = rect.width / game.width;
        game.player.x *= xScale;
        for (const platform of game.platforms) { platform.x *= xScale; platform.w *= xScale; }
        for (const villain of game.villains) { villain.x *= xScale; villain.w *= xScale; }
        for (const fireball of game.fireballs) fireball.x *= xScale;
      }
      if (game.height > 0 && Math.abs(game.height - rect.height) > 1) {
        const yScale = rect.height / game.height;
        game.player.y *= yScale;
        for (const platform of game.platforms) platform.y *= yScale;
        for (const villain of game.villains) { villain.y *= yScale; villain.baseY *= yScale; villain.h *= yScale; }
        for (const fireball of game.fireballs) fireball.y *= yScale;
      }
      game.width = rect.width; game.height = rect.height;
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(canvas);

    const keyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "a", "A"].includes(event.key)) gameRef.current.input = -1;
      if (["ArrowRight", "d", "D"].includes(event.key)) gameRef.current.input = 1;
    };
    const keyUp = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) gameRef.current.input = 0;
    };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);

    const drawWorld = (world: number, time: number, width: number, height: number) => {
      const gradients = [
        ["#73c9ff", "#2774a8"], ["#111936", "#35295e"], ["#dff5ff", "#7ba6c5"],
        ["#ffbf69", "#d46b38"], ["#0fb8bd", "#07577a"], ["#07051d", "#24134f"], ["#70d6ff", "#087f8c"],
      ];
      const gradient = context.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, gradients[world][0]); gradient.addColorStop(1, gradients[world][1]);
      context.fillStyle = gradient; context.fillRect(0, 0, width, height);

      if (world === 0) {
        context.fillStyle = "#ffe37a"; context.beginPath(); context.arc(width - 62, 116, 34, 0, Math.PI * 2); context.fill();
        context.fillStyle = "rgba(255,255,255,.72)";
        for (let i = 0; i < 4; i += 1) { const x = (i * 137 + 40) % width; const y = 150 + (i % 2) * 110; context.beginPath(); context.ellipse(x, y, 42, 14, 0, 0, Math.PI * 2); context.fill(); }
        context.fillStyle = "rgba(19,85,74,.45)"; context.beginPath(); context.moveTo(0, height); context.quadraticCurveTo(width * .4, height - 180, width, height - 45); context.lineTo(width, height); context.fill();
      } else if (world === 1) {
        context.fillStyle = "#f4f0c8"; context.beginPath(); context.arc(width - 66, 120, 29, 0, Math.PI * 2); context.fill();
        context.fillStyle = "rgba(255,255,255,.8)";
        for (let i = 0; i < 44; i += 1) context.fillRect((i * 83) % width, 90 + ((i * 47) % (height - 170)), i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
        context.fillStyle = "rgba(3,8,24,.56)"; for (let x = 0; x < width; x += 44) context.fillRect(x, height - 45 - (x * 13 % 100), 39, 150);
      } else if (world === 2) {
        context.fillStyle = "rgba(255,255,255,.88)"; context.beginPath(); context.moveTo(0, height); context.lineTo(width * .28, height - 210); context.lineTo(width * .52, height); context.lineTo(width * .73, height - 270); context.lineTo(width, height); context.fill();
        for (let i = 0; i < 54; i += 1) { const x = (i * 71 + time * .02) % width; const y = (i * 103 + time * .07) % height; context.beginPath(); context.arc(x, y, 1.5 + i % 3, 0, Math.PI * 2); context.fill(); }
      } else if (world === 3) {
        context.fillStyle = "#fff0a8"; context.beginPath(); context.arc(width - 62, 118, 38, 0, Math.PI * 2); context.fill();
        context.fillStyle = "rgba(190,77,37,.5)"; context.beginPath(); context.moveTo(0, height); context.quadraticCurveTo(width * .35, height - 160, width, height - 45); context.lineTo(width, height); context.fill();
        context.strokeStyle = "rgba(35,91,54,.7)"; context.lineWidth = 8; for (let x = 45; x < width; x += 150) { context.beginPath(); context.moveTo(x, height - 50); context.lineTo(x, height - 130); context.moveTo(x, height - 95); context.lineTo(x - 18, height - 113); context.stroke(); }
      } else if (world === 4) {
        context.strokeStyle = "rgba(182,255,246,.28)"; context.lineWidth = 2;
        for (let i = 0; i < 34; i += 1) { const x = (i * 97 + Math.sin(time / 900 + i) * 12) % width; const y = height - ((i * 83 + time * .035) % height); context.beginPath(); context.arc(x, y, 2 + i % 5, 0, Math.PI * 2); context.stroke(); }
        context.fillStyle = "rgba(0,46,54,.5)"; for (let x = 18; x < width; x += 55) { context.beginPath(); context.moveTo(x, height); context.quadraticCurveTo(x + 22, height - 80, x + 4, height - 155); context.quadraticCurveTo(x - 18, height - 70, x, height); context.fill(); }
      } else if (world === 5) {
        context.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 62; i += 1) context.fillRect((i * 67) % width, 80 + ((i * 113) % (height - 110)), i % 7 === 0 ? 2.2 : 1, i % 7 === 0 ? 2.2 : 1);
        const planet = context.createRadialGradient(width - 80, 142, 5, width - 80, 142, 48); planet.addColorStop(0, "#ffbd79"); planet.addColorStop(1, "#8c4cc8"); context.fillStyle = planet; context.beginPath(); context.arc(width - 80, 142, 46, 0, Math.PI * 2); context.fill();
        context.strokeStyle = "rgba(255,226,168,.7)"; context.lineWidth = 8; context.beginPath(); context.ellipse(width - 80, 142, 70, 18, -.25, 0, Math.PI * 2); context.stroke();
      } else {
        context.fillStyle = "#ffe58b"; context.beginPath(); context.arc(width - 62, 112, 36, 0, Math.PI * 2); context.fill();
        context.fillStyle = "rgba(255,255,255,.88)"; for (let i = 0; i < 3; i += 1) { context.beginPath(); context.ellipse(54 + i * 150, 170 + (i % 2) * 54, 42, 13, 0, 0, Math.PI * 2); context.fill(); }
        context.fillStyle = "rgba(255,236,178,.8)"; context.fillRect(0, height - 116, width, 116);
        context.strokeStyle = "rgba(224,255,251,.7)"; context.lineWidth = 3;
        for (let y = height - 165; y < height - 110; y += 15) { context.beginPath(); context.moveTo(0, y); for (let x = 0; x <= width; x += 24) context.quadraticCurveTo(x + 12, y - 8, x + 24, y); context.stroke(); }
        context.strokeStyle = "#276749"; context.lineWidth = 8; context.beginPath(); context.moveTo(48, height - 106); context.lineTo(68, height - 205); context.stroke();
        context.fillStyle = "#1f9d68"; for (let i = 0; i < 7; i += 1) { context.save(); context.translate(68, height - 203); context.rotate((i - 3) * .42); context.beginPath(); context.ellipse(0, -23, 8, 30, 0, 0, Math.PI * 2); context.fill(); context.restore(); }
      }
    };

    const draw = (time: number) => {
      const game = gameRef.current;
      const dt = Math.min((time - (game.lastTime || time)) / 16.667, 1.8); game.lastTime = time;
      const { player, width, height } = game;
      const beginFall = () => {
        if (game.isFalling) return;
        game.isFalling = true; game.fallStarted = time; game.input = 0; game.pointerX = null; game.platforms = []; game.villains = []; game.fireballs = []; game.rocketUntil = 0;
        player.y = height * .4; player.vy = 1.6; setToast(null); setFalling(true); playSfx("fall");
      };
      if (!game.isFalling && game.pointerX != null) game.input = clamp((game.pointerX - (player.x + player.w / 2)) / 90, -1, 1);
      if (!game.isFalling) { player.vx += game.input * 0.6 * dt; player.vx *= Math.pow(0.9, dt); player.vx = clamp(player.vx, -6.7, 6.7); }
      else player.vx *= Math.pow(.985, dt);
      const previousBottom = player.y + player.h;
      const rocketing = time < game.rocketUntil;
      player.x += player.vx * dt; player.vy += (game.isFalling ? .16 : rocketing ? 0.12 : 0.48) * dt; player.y += player.vy * dt;
      if (player.x < -player.w * .45) player.x = width - player.w * .55;
      if (player.x > width - player.w * .55) player.x = -player.w * .45;

      const collectBasket = (platform: Platform) => {
        if (platform.basket == null || platform.collected) return;
        platform.collected = true;
        const basket = BASKETS[platform.basket]; game.runs += basket.runs; game.score += basket.runs * 10;
        game.collectionCounts[platform.basket] += 1;
        game.nextWorldChangeAt = Math.max(game.nextWorldChangeAt, time + 1900);
        setScore(game.score); setRuns(game.runs); setCollectionCounts([...game.collectionCounts]); setToast(basket); playSfx("collect"); window.setTimeout(() => setToast(null), 2200);
      };

      for (const platform of game.platforms) {
        if (game.isFalling) break;
        if (platform.drift) { platform.x += platform.drift * dt; if (platform.x < 8 || platform.x + platform.w > width - 8) platform.drift *= -1; }
        if (platform.basket != null && !platform.collected) {
          const labelX = clamp(platform.x + platform.w / 2 - 54, 5, width - 113);
          const touchesGoodie = player.x + player.w > labelX && player.x < labelX + 108 && player.y + player.h > platform.y - 57 && player.y < platform.y - 7;
          if (touchesGoodie) collectBasket(platform);
        }
        if (platform.broken) { platform.y += 5.4 * dt; continue; }
        const newBottom = player.y + player.h;
        if (player.vy > 0 && previousBottom <= platform.y + 4 && newBottom >= platform.y && player.x + player.w > platform.x && player.x < platform.x + platform.w) {
          player.y = platform.y - player.h;
          if (platform.powerUp === "rocket" && !platform.powerUsed) { player.vy = -23; game.rocketUntil = time + 1100; platform.powerUsed = true; playSfx("rocket"); }
          else if (platform.powerUp === "spring" && !platform.powerUsed) { player.vy = -17; platform.powerUsed = true; playSfx("spring"); }
          else { player.vy = -11.5; playSfx("jump"); }
          if (platform.kind === "breakable") { platform.broken = true; playSfx("break"); }
        }
      }

      if (!game.isFalling && player.vy > 0) {
        const visibleBoards = game.platforms.filter((platform) => !platform.broken && platform.y + platform.h >= 0 && platform.y <= height);
        const lowestVisibleBoard = visibleBoards.reduce<Platform | null>((lowest, platform) => !lowest || platform.y > lowest.y ? platform : lowest, null);
        const fellBelowLastBoard = lowestVisibleBoard ? player.y > lowestVisibleBoard.y + lowestVisibleBoard.h + 18 : player.y > height + 24;
        if (fellBelowLastBoard) beginFall();
      }

      if (!game.isFalling && player.y < height * 0.4 && player.vy < 0) {
        const shift = height * 0.4 - player.y; player.y = height * 0.4; game.distance += shift;
        for (const platform of game.platforms) platform.y += shift;
        game.score = Math.max(game.score, Math.floor(game.distance * 2)); setScore(game.score);
      }
      game.platforms = game.platforms.filter((platform) => platform.y < height + 40);
      while (!game.isFalling && Math.min(...game.platforms.map((platform) => platform.y)) > -160) {
        const top = Math.min(...game.platforms.map((platform) => platform.y));
        const difficulty = clamp(game.score / SCORE_GATES.fullDifficulty, 0, 1);
        const w = 98 - difficulty * 16 + Math.random() * 22; const previous = game.platforms.reduce((a, b) => a.y < b.y ? a : b);
        const x = clamp(previous.x + (Math.random() - 0.5) * Math.min(205 + difficulty * 30, width * (.5 + difficulty * .08)), 10, width - w - 10);
        const extras = platformExtras(game.basketCursor, game.score);
        const withBasket = game.basketCursor % 3 !== 0 && !extras.powerUp;
        const gap = 62 + difficulty * 17 + Math.random() * (9 + difficulty * 7);
        const platform: Platform = { x, y: top - gap, w, h: 13, basket: withBasket ? game.basketCursor % BASKETS.length : null, collected: false, drift: platformDrift(game.basketCursor, game.score), ...extras };
        game.platforms.push(platform);
        if (platform.kind === "breakable" || game.basketCursor % (game.score < SCORE_GATES.breakableBoards ? 4 : 5) === 0) game.platforms.push(sideBoard(platform, width));
        game.basketCursor += 1;
      }

      if (!game.isFalling && game.score >= SCORE_GATES.villains) {
        if (time >= game.nextVillainAt && game.villains.filter((villain) => villain.alive).length < 2) {
          const fromLeft = game.villainCursor % 2 === 0;
          const baseY = 185 + Math.random() * Math.max(130, height * .42);
          game.villains.push({ id: game.villainCursor, x: fromLeft ? -58 : width + 8, y: baseY, baseY, w: 48, h: 42, vx: (fromLeft ? 1 : -1) * (.72 + Math.random() * .35), phase: Math.random() * Math.PI * 2, alive: true });
          game.villainCursor += 1; game.nextVillainAt = time + 4200 + Math.random() * 2400;
        }
        for (const villain of game.villains) { villain.x += villain.vx * dt; villain.y = villain.baseY + Math.sin(time / 480 + villain.phase) * 17; }
        game.villains = game.villains.filter((villain) => villain.alive && villain.x > -90 && villain.x < width + 90);
        for (const fireball of game.fireballs) {
          const target = game.villains.find((villain) => villain.id === fireball.targetId && villain.alive);
          if (!target) { fireball.life = 0; continue; }
          const dx = target.x + target.w / 2 - fireball.x; const dy = target.y + target.h / 2 - fireball.y; const distance = Math.hypot(dx, dy);
          fireball.vx = dx / Math.max(distance, 1) * 11; fireball.vy = dy / Math.max(distance, 1) * 11;
          fireball.x += fireball.vx * dt; fireball.y += fireball.vy * dt; fireball.life -= dt;
          if (distance < 24) { target.alive = false; fireball.life = 0; game.villainsDefeated += 1; game.score += 250; setVillainsDefeated(game.villainsDefeated); setScore(game.score); }
        }
        game.fireballs = game.fireballs.filter((fireball) => fireball.life > 0);
        if (game.villains.some((villain) => villain.alive && player.x + player.w > villain.x + 5 && player.x < villain.x + villain.w - 5 && player.y + player.h > villain.y + 5 && player.y < villain.y + villain.h - 5)) beginFall();
      }

      const targetWorldStage = Math.floor(game.score / SCORE_GATES.worldChange);
      if (!game.isFalling && targetWorldStage > game.worldStage && time >= game.nextWorldChangeAt) {
        game.worldStage += 1; game.nextWorldChangeAt = time + 1500;
        const choices = WORLDS.map((_, index) => index).filter((index) => index !== game.worldIndex);
        const nextWorld = choices[Math.floor(Math.random() * choices.length)];
        game.worldIndex = nextWorld; setWorldIndex(nextWorld); setWorldToast(true); playSfx("level"); window.setTimeout(() => setWorldToast(false), 1400);
      }

      const candidate = game.platforms.filter((platform) => platform.basket != null && !platform.collected && !platform.broken).sort((a, b) => Math.abs(a.y - player.y) - Math.abs(b.y - player.y))[0];
      if (candidate?.basket != null && candidate.basket !== game.nearbyBasket) { game.nearbyBasket = candidate.basket; setNearbyBasket(candidate.basket); }
      drawWorld(WORLDS[game.worldIndex].scene, time, width, height);

      for (const platform of game.platforms) {
        const grad = context.createLinearGradient(platform.x, platform.y, platform.x, platform.y + 14);
        if (platform.kind === "breakable") { grad.addColorStop(0, "#ff9b79"); grad.addColorStop(1, "#9d3d43"); } else { grad.addColorStop(0, "#ffe17c"); grad.addColorStop(1, "#c37b17"); }
        context.fillStyle = grad; context.beginPath(); context.roundRect(platform.x, platform.y, platform.w, platform.h, 7); context.fill();
        context.fillStyle = "rgba(255,255,255,.45)"; context.beginPath(); context.roundRect(platform.x + 8, platform.y + 2, platform.w - 16, 2, 2); context.fill();
        if (platform.kind === "breakable") { context.strokeStyle = "rgba(70,12,24,.75)"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(platform.x + platform.w * .48, platform.y + 1); context.lineTo(platform.x + platform.w * .58, platform.y + 7); context.lineTo(platform.x + platform.w * .45, platform.y + 12); context.stroke(); }
        if (platform.powerUp === "spring" && !platform.powerUsed) { const cx = platform.x + platform.w / 2; context.strokeStyle = "#eaffff"; context.lineWidth = 2.3; context.beginPath(); context.moveTo(cx - 10, platform.y); context.lineTo(cx + 9, platform.y - 6); context.lineTo(cx - 9, platform.y - 12); context.lineTo(cx + 7, platform.y - 18); context.stroke(); context.fillStyle = "#0cd8ba"; context.beginPath(); context.roundRect(cx - 13, platform.y - 22, 26, 5, 3); context.fill(); }
        if (platform.powerUp === "rocket" && !platform.powerUsed) { context.font = "25px system-ui"; context.textAlign = "center"; context.fillText("🚀", platform.x + platform.w / 2, platform.y - 8); }
        if (platform.basket != null && !platform.collected) {
          const basket = BASKETS[platform.basket]; const cx = platform.x + platform.w / 2;
          const labelX = clamp(cx - 54, 5, width - 113);
          context.fillStyle = "rgba(4,18,31,.94)"; context.beginPath(); context.roundRect(labelX, platform.y - 53, 108, 43, 10); context.fill();
          context.strokeStyle = "#b9fff0"; context.lineWidth = 2; context.stroke();
          context.fillStyle = "#0cd8ba"; context.font = "900 18px system-ui"; context.textAlign = "left"; context.fillText(basket.icon, labelX + 9, platform.y - 27);
          context.fillStyle = "#fff"; context.font = "900 10px system-ui"; context.fillText(basket.short, labelX + 32, platform.y - 31);
          context.fillStyle = "#ffe17c"; context.font = "800 8px system-ui"; context.fillText(`+${basket.runs} RUNS`, labelX + 32, platform.y - 18);
        }
      }

      for (const fireball of game.fireballs) {
        const flame = context.createRadialGradient(fireball.x, fireball.y, 1, fireball.x, fireball.y, 14); flame.addColorStop(0, "#fff8b5"); flame.addColorStop(.4, "#ffb000"); flame.addColorStop(1, "rgba(255,65,20,0)");
        context.fillStyle = flame; context.beginPath(); context.arc(fireball.x, fireball.y, 14, 0, Math.PI * 2); context.fill();
        context.fillStyle = "#fff4a3"; context.beginPath(); context.arc(fireball.x, fireball.y, 5, 0, Math.PI * 2); context.fill();
      }
      for (const villain of game.villains) {
        if (!villain.alive) continue;
        context.save(); context.translate(villain.x + villain.w / 2, villain.y + villain.h / 2);
        const wing = 8 + Math.sin(time / 95 + villain.phase) * 5;
        context.fillStyle = "rgba(213,225,255,.72)"; context.beginPath(); context.ellipse(-24, 0, 13, wing, -.3, 0, Math.PI * 2); context.ellipse(24, 0, 13, wing, .3, 0, Math.PI * 2); context.fill();
        context.fillStyle = "#5b2c83"; context.strokeStyle = "#e7b7ff"; context.lineWidth = 2; context.beginPath(); context.roundRect(-20, -18, 40, 36, 13); context.fill(); context.stroke();
        context.fillStyle = "#ffdd57"; context.beginPath(); context.moveTo(-15, -15); context.lineTo(-9, -28); context.lineTo(-3, -16); context.moveTo(4, -16); context.lineTo(11, -28); context.lineTo(16, -14); context.fill();
        context.fillStyle = "white"; context.beginPath(); context.ellipse(-8, -3, 6, 7, 0, 0, Math.PI * 2); context.ellipse(8, -3, 6, 7, 0, 0, Math.PI * 2); context.fill();
        context.fillStyle = "#d62645"; context.beginPath(); context.arc(-7, -2, 2.5, 0, Math.PI * 2); context.arc(7, -2, 2.5, 0, Math.PI * 2); context.fill();
        context.strokeStyle = "#fff"; context.lineWidth = 2; context.beginPath(); context.arc(0, 6, 8, .15, Math.PI - .15); context.stroke(); context.restore();
      }

      const px = player.x, py = player.y;
      context.save(); context.translate(px + player.w / 2, py + player.h / 2); context.rotate(game.isFalling ? (time - game.fallStarted) / 240 : clamp(player.vx / 34, -.17, .17)); if (player.vx < 0) context.scale(-1, 1);
      if (rocketing) { context.fillStyle = "#ffda55"; context.beginPath(); context.moveTo(-8, 26); context.lineTo(0, 50 + Math.random() * 12); context.lineTo(8, 26); context.fill(); context.fillStyle = "#ff6d3a"; context.beginPath(); context.moveTo(-4, 25); context.lineTo(0, 43); context.lineTo(4, 25); context.fill(); }
      const moving = Math.abs(player.vx) > 1.05;
      const sprite = game.isFalling ? (Math.floor(time / 105) % 2 === 0 ? runSpriteRef.current : spriteRef.current) : moving ? runSpriteRef.current : spriteRef.current;
      if (sprite?.complete && sprite.naturalWidth > 0) context.drawImage(sprite, -33, -38, 66, 66);
      else { context.fillStyle = "#169fe3"; context.beginPath(); context.arc(0, 0, 20, 0, Math.PI * 2); context.fill(); }
      context.restore();

      if (game.isFalling && time - game.fallStarted > 1650) {
        const finalScore = Math.floor(game.score); setScore(finalScore); setRuns(game.runs);
        const nextBest = Math.max(best, finalScore); setBest(nextBest); localStorage.setItem("monsoon-bonanza-best", String(nextBest)); setFalling(false); setScreen("gameover"); return;
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { observer.disconnect(); window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [screen, best, playSfx]);

  const pointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect(); gameRef.current.pointerX = event.clientX - rect.left;
  };

  const shootAtVillain = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const game = gameRef.current;
    if (game.score < SCORE_GATES.villains || game.isFalling) return false;
    const rect = event.currentTarget.getBoundingClientRect(); const x = event.clientX - rect.left; const y = event.clientY - rect.top;
    const target = [...game.villains].reverse().find((villain) => villain.alive && x >= villain.x - 12 && x <= villain.x + villain.w + 12 && y >= villain.y - 12 && y <= villain.y + villain.h + 12);
    if (!target) return false;
    game.fireballs.push({ x: game.player.x + game.player.w / 2, y: game.player.y + game.player.h / 2, vx: 0, vy: -8, targetId: target.id, life: 100 }); playSfx("shoot");
    return true;
  };

  const nextSlab = SLABS.find((slab) => runs < slab.runs);
  const progressStart = runs < 500 ? 0 : runs < 650 ? 500 : runs < 800 ? 650 : runs < 900 ? 800 : 900 + Math.floor((runs - 900) / 50) * 50;
  const progressEnd = nextSlab?.runs ?? progressStart + 50;
  const progress = clamp(((runs - progressStart) / (progressEnd - progressStart)) * 100, 0, 100);
  const totalGoodies = collectionCounts.reduce((sum, count) => sum + count, 0);

  return (
    <main className={`campaign-shell screen-${screen} ${screen === "playing" ? "is-playing" : ""}`}>
      <header className="brand-bar"><span className="brand-mark">☔</span><span>DOREMON JUMP</span><span className="rain-status">● LIVE</span></header>

      {screen === "intro" && <section className="intro-panel">
        <div className="campaign-date">☔ 1 JUL — 31 AUG 2026</div>
        <p className="audience-line">Relationship Managers <span>Internal Contest</span></p>
        <p className="launch-copy">THE REWARD RUN IS LIVE</p>
        <h1>CLIMB. COLLECT.<br/><span>CONQUER.</span></h1>
        <p className="intro-copy">Guide Doremon through surprise worlds, collect eligible basket goodies and turn every jump into Runs. Every 10,000 score points unlocks a new destination.</p>
        <button className="play-button hero-play" onClick={() => { playSfx("click"); setFormError(""); setScreen("details"); }}>PLAY NOW <span aria-hidden="true">▶</span></button>

        <div className="how-to">
          <div><strong>↔</strong><span>Tilt, drag or use arrow keys</span></div>
          <div><strong>◆</strong><span>Collect basket goodies</span></div>
          <div><strong>🚀</strong><span>Hit springs and rocket boosts</span></div>
          <div><strong>🔥</strong><span>Tap villains after 30,000 points</span></div>
        </div>

        <section className="reward-track" aria-label="Reward slabs">
          <h2>YOUR RUNS REWARD TRACK</h2>
          {SLABS.map((slab, index) => <div className="reward-row" key={slab.runs}><span>Slab {index + 1} · {slab.runs} Runs</span><strong>{slab.points.toLocaleString("en-IN")} points</strong></div>)}
          <p>After 900 Runs: +5,000 points for every extra 50 Runs.</p>
        </section>

        <section className="basket-list" aria-label="Eligible basket goodies"><div className="basket-heading"><span>ALL {BASKETS.length} ELIGIBLE BASKETS</span><strong>BASKET DETAILS · RUNS</strong></div><div>{BASKETS.map((basket) => <article key={basket.name}><i>{basket.icon}</i><p><strong>{basket.name}</strong><span>Fee {basket.fee}</span></p><b>+{basket.runs}<small> Runs</small></b></article>)}</div></section>
      </section>}

      {screen === "details" && <section className="details-panel">
        <div className="player-token"><img src="/doraemon-sprite.png" alt="Doremon ready to jump" /></div>
        <p className="step-label">PLAYER CHECK-IN · STEP 2 OF 2</p>
        <h1>READY TO<br/><span>JUMP?</span></h1>
        <p className="details-copy">Enter your contest details to save your run and begin the climb.</p>
        <form className="lead-form" onSubmit={startGame} data-netlify="true" name="doremon-jump-leads">
          <input type="hidden" name="form-name" value="doremon-jump-leads" />
          <label><span>Your name</span><input name="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Enter your full name" /></label>
          <label><span>Mobile number</span><div className="phone-field"><b>+91</b><input name="mobile" inputMode="numeric" autoComplete="tel" maxLength={10} value={mobile} onChange={(event) => setMobile(event.target.value.replace(/\D/g, ""))} placeholder="10-digit number" /></div></label>
          <label><span>Branch</span><input name="branch" autoComplete="organization" value={branch} onChange={(event) => setBranch(event.target.value)} placeholder="Enter your branch name or code" /></label>
          {formError && <p className="form-error" role="alert">⚠ {formError}</p>}
          <button className="play-button" disabled={submitting}>{submitting ? "Preparing your run…" : "START GAME  ▶"}</button>
          <p className="privacy-note">By starting, you agree that the contest team may use these details to record and contact you about your participation.</p>
        </form>
        <button className="text-button" onClick={() => { setFormError(""); setScreen("intro"); }}>← Back to contest details</button>
      </section>}

      {screen === "playing" && <section className="game-wrap" aria-label="Doremon Jump game">
        {!falling && <>
          <div className="hud">
            <div><span>SCORE</span><strong>{score.toLocaleString("en-IN")}</strong></div>
            <div className="slab-meter"><span>{nextSlab ? `TO ${nextSlab.runs} RUNS` : "BONUS CLIMB"}</span><div><i style={{ width: `${progress}%` }} /></div><b>{runs} RUNS SCORED</b></div>
            <div><span>POINTS</span><strong>{rewardPoints(runs).toLocaleString("en-IN")}</strong></div>
          </div>
          <div className="control-note">{control} · {score < SCORE_GATES.movingBoards ? "fixed-board warm-up" : score < SCORE_GATES.breakableBoards ? "moving boards unlocked" : score < SCORE_GATES.villains ? "breakable boards unlocked" : "villain zone"}</div>
          <div className={`world-chip ${worldToast ? "is-new" : ""}`}>{WORLDS[worldIndex].icon} {WORLDS[worldIndex].name}</div>
          <button className="sound-toggle" aria-label={muted ? "Turn sound on" : "Mute sound"} onClick={() => { const next = !muted; mutedRef.current = next; setMuted(next); if (next && "speechSynthesis" in window) window.speechSynthesis.cancel(); if (!next) playSfx("click"); }}>{muted ? "🔇" : "🔊"}</button>
          <div className="nearby-goodie"><span>NEXT GOODIE</span><strong>{BASKETS[nearbyBasket].name}</strong><b>+{BASKETS[nearbyBasket].runs} Runs</b></div>
          {score >= SCORE_GATES.villains && <div className="shoot-tip">🔥 TAP A VILLAIN TO SHOOT <b>{villainsDefeated} defeated</b></div>}
        </>}
        <canvas ref={canvasRef} tabIndex={0} aria-label="Jumping game. Tilt your phone, drag, or use arrow keys to move. After 30,000 points, tap flying villains to shoot." onPointerDown={(event) => { if (shootAtVillain(event)) return; event.currentTarget.setPointerCapture(event.pointerId); pointerMove(event); }} onPointerMove={(event) => { if (event.buttons) pointerMove(event); }} onPointerUp={() => { gameRef.current.pointerX = null; gameRef.current.input = 0; }} />
        {toast && <div className="basket-toast" role="status"><i>{toast.icon}</i><div className="toast-copy"><span>GOODIE COLLECTED</span><strong>{toast.name}</strong><b>+{toast.runs} Runs</b><dl><div><dt>SUBSCRIPTION FEE</dt><dd>{toast.fee} / year</dd></div></dl></div></div>}
      </section>}

      {screen === "gameover" && <section className="gameover-panel">
        <div className="storm-medal">☔</div><p>THE CLOUDS CAUGHT UP</p><h1>Great run,<br/><span>{name.split(" ")[0]}!</span></h1>
        <div className="final-stats"><div><span>Score</span><strong>{score.toLocaleString("en-IN")}</strong></div><div><span>Runs scored</span><strong>{runs}</strong></div><div><span>Reward points</span><strong>{rewardPoints(runs).toLocaleString("en-IN")}</strong></div><div><span>Goodies</span><strong>{totalGoodies}</strong></div></div>
        <p className="gameover-copy">{runs >= 900 ? "You cleared every slab. Each additional 50 Runs now unlocks another 5,000 points." : nextSlab ? `${nextSlab.runs - runs} more Runs to reach the next reward slab.` : "Keep climbing to unlock more campaign rewards."}</p>
        <button className="play-button" onClick={() => { playSfx("click"); resetGame(); setScreen("playing"); }}>PLAY AGAIN  ↻</button>
        <section className="run-ledger" aria-label="Collected basket summary">
          <div className="ledger-heading"><div><span>RUN SUMMARY</span><strong>{WORLDS[worldIndex].icon} {WORLDS[worldIndex].name} reached</strong></div><b>{totalGoodies} collected</b></div>
          {totalGoodies === 0 ? <p className="empty-ledger">No basket goodies collected this run. Try steering toward the labelled boards.</p> : <div className="ledger-list">
            {BASKETS.map((basket, index) => collectionCounts[index] > 0 && <article key={basket.name}>
              <i>{basket.icon}</i><p><strong>{basket.name}</strong><span>{basket.fee} fee · {basket.runs} Runs each</span></p><div><b>× {collectionCounts[index]}</b><span>{(basket.runs * collectionCounts[index]).toLocaleString("en-IN")} Runs</span></div>
            </article>)}
          </div>}
          <div className="ledger-total"><span>TOTAL</span><strong>{totalGoodies} goodies · {runs.toLocaleString("en-IN")} Runs · {rewardPoints(runs).toLocaleString("en-IN")} points{villainsDefeated > 0 ? ` · ${villainsDefeated} villains defeated` : ""}</strong></div>
        </section>
        <button className="text-button" onClick={() => { setFormError(""); setScreen("details"); }}>Change player</button>
        <p className="best-score">Personal best · {best.toLocaleString("en-IN")}</p>
      </section>}
      <footer>For internal circulation only · 1 Run = ₹100 redemption value</footer>
    </main>
  );
}
