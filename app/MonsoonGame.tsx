"use client";

import { FormEvent, PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef, useState } from "react";

type Screen = "intro" | "details" | "playing" | "gameover";
type Basket = { name: string; fee: string; runs: number; short: string; icon: string };
type PowerUp = "boots" | "drone" | "magnet" | "slow" | "cloud" | "door" | null;
type Platform = { x: number; y: number; w: number; h: number; basket: number | null; collected: boolean; drift: number; kind: "normal" | "breakable"; broken: boolean; powerUp: PowerUp; powerUsed: boolean; rescueCloud?: boolean; magnetX?: number; magnetY?: number };
type Villain = { id: number; x: number; y: number; baseY: number; w: number; h: number; vx: number; phase: number; alive: boolean; boss: boolean; health: number; maxHealth: number };
type Fireball = { x: number; y: number; vx: number; vy: number; targetId: number; life: number };
type FallingBoots = { x: number; y: number; vy: number; spin: number; life: number };
type MissionKind = "baskets" | "drones" | "villains" | "combo" | "worlds" | "gadgets" | "score";
type Mission = { id: MissionKind; label: string; target: number; progress: number; complete: boolean };
type SoundKind = "click" | "collect" | "jump" | "spring" | "rocket" | "break" | "level" | "start" | "fall" | "shoot";
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

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

const MISSION_POOL: Omit<Mission, "progress" | "complete">[] = [
  { id: "baskets", label: "Collect 6 baskets", target: 6 },
  { id: "drones", label: "Use 2 drone boosts", target: 2 },
  { id: "villains", label: "Defeat 3 villains", target: 3 },
  { id: "combo", label: "Build a 3× combo", target: 3 },
  { id: "worlds", label: "Visit 3 new worlds", target: 3 },
  { id: "gadgets", label: "Use 4 gadgets", target: 4 },
  { id: "score", label: "Reach 15,000 score", target: 15000 },
];

const ACHIEVEMENTS = [
  { id: "first-drone", icon: "✣", label: "First Drone Flight" },
  { id: "basket-25", icon: "🧺", label: "25 Baskets Collected" },
  { id: "five-worlds", icon: "🌍", label: "Five Worlds Visited" },
  { id: "villain-hunter", icon: "🔥", label: "Villain Hunter" },
  { id: "score-100k", icon: "★", label: "100,000-Point Run" },
  { id: "every-basket", icon: "◆", label: "Every Basket Collected" },
] as const;

const GADGET_VISUALS: Partial<Record<Exclude<PowerUp, null>, { symbol: string; label: string; fill: string; stroke: string }>> = {
  magnet: { symbol: "∪", label: "MAGNET", fill: "#e63946", stroke: "#ffd166" },
  slow: { symbol: "◷", label: "SLOW", fill: "#6d28d9", stroke: "#c4b5fd" },
  cloud: { symbol: "☁", label: "RESCUE", fill: "#087f8c", stroke: "#67e8f9" },
  door: { symbol: "▣", label: "PORTAL", fill: "#d946ef", stroke: "#f5d0fe" },
};

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
  const gadgetCycle: Exclude<PowerUp, null>[] = ["boots", "drone", "magnet", "slow", "cloud", "door"];
  const powerUp: PowerUp = index > 3 && index % 9 === 0 ? gadgetCycle[Math.floor(index / 9) % gadgetCycle.length] : null;
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

function createMissions(): Mission[] {
  return [...MISSION_POOL].sort(() => Math.random() - .5).slice(0, 3).map((mission) => ({ ...mission, progress: 0, complete: false }));
}

export default function MonsoonGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const runSpriteRef = useRef<HTMLImageElement | null>(null);
  const tintedSpriteCacheRef = useRef<Map<string, HTMLCanvasElement>>(new Map());
  const audioRef = useRef<AudioContext | null>(null);
  const clipRefs = useRef<Partial<Record<SoundKind, HTMLAudioElement>>>({});
  const mutedRef = useRef(false);
  const orientationHandlerRef = useRef<((event: DeviceOrientationEvent) => void) | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const basketToastTimerRef = useRef<number | null>(null);
  const worldToastTimerRef = useRef<number | null>(null);
  const gameRef = useRef({
    player: { x: 180, y: 500, vx: 0, vy: -10, w: 34, h: 44 },
    platforms: [] as Platform[], input: 0, pointerX: null as number | null,
    score: 0, runs: 0, distance: 0, basketCursor: 0, lastTime: 0, width: 390, height: 700,
    collectionCounts: Array(BASKETS.length).fill(0) as number[], droneUntil: 0, bootsJumpsRemaining: 0, fallingBoots: [] as FallingBoots[], magnetUntil: 0, slowUntil: 0, cloudCharges: 0, lastHudUpdate: 0, lastMissionScore: -250,
    combo: 0, bestCombo: 0, missions: [] as Mission[], achievements: [] as string[], worldIndex: 0, worldStage: 0, nearbyBasket: -1, isFalling: false, fallStarted: 0, resultSubmitted: false,
    villains: [] as Villain[], fireballs: [] as Fireball[], nextVillainAt: 0, nextBossScore: 50000, villainCursor: 0, villainsDefeated: 0,
  });
  const [screen, setScreen] = useState<Screen>("intro");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [branch, setBranch] = useState("");
  const [score, setScore] = useState(0);
  const [runs, setRuns] = useState(0);
  const [best, setBest] = useState(0);
  const [control, setControl] = useState("Touch / keys ready");
  const [toast, setToast] = useState<{ basket: Basket; awarded: number; multiplier: number } | null>(null);
  const [collectionCounts, setCollectionCounts] = useState<number[]>(() => Array(BASKETS.length).fill(0));
  const [worldIndex, setWorldIndex] = useState(0);
  const [worldToast, setWorldToast] = useState(false);
  const [nearbyBasket, setNearbyBasket] = useState(1);
  const [muted, setMuted] = useState(false);
  const [falling, setFalling] = useState(false);
  const [villainsDefeated, setVillainsDefeated] = useState(0);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resultStatus, setResultStatus] = useState<"idle" | "sending" | "sent" | "local" | "error">("idle");
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installNote, setInstallNote] = useState("");
  const [isInstalled, setIsInstalled] = useState(false);
  const [showTiltGuide, setShowTiltGuide] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [showMissions, setShowMissions] = useState(false);
  const [celebration, setCelebration] = useState("");
  const [achievements, setAchievements] = useState<string[]>([]);
  const [calibrationMessage, setCalibrationMessage] = useState("");

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      setBest(Number(localStorage.getItem("monsoon-bonanza-best") || 0));
      try {
        const savedPlayer = JSON.parse(localStorage.getItem("monsoon-bonanza-player") || "null") as { name?: unknown; mobile?: unknown; branch?: unknown } | null;
        if (savedPlayer && typeof savedPlayer.name === "string" && typeof savedPlayer.mobile === "string" && typeof savedPlayer.branch === "string") {
          setName(savedPlayer.name); setMobile(savedPlayer.mobile); setBranch(savedPlayer.branch);
        }
      } catch { /* Ignore incomplete or manually edited device data. */ }
      try {
        const savedAchievements = JSON.parse(localStorage.getItem("doremon-jump-achievements") || "[]") as unknown;
        if (Array.isArray(savedAchievements)) { const unlocked = savedAchievements.filter((id): id is string => typeof id === "string"); gameRef.current.achievements = unlocked; setAchievements(unlocked); }
      } catch { /* Ignore incomplete or manually edited achievement data. */ }
      const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
      setIsInstalled(standalone);
    }, 0);
    const image = new Image(); image.src = "/doraemon-sprite.png"; spriteRef.current = image;
    const runImage = new Image(); runImage.src = "/doraemon-run.png"; runSpriteRef.current = runImage;
    for (const [kind, source] of Object.entries(SOUND_FILES) as [SoundKind, string][]) {
      const clip = new Audio(source); clip.preload = "auto"; clipRefs.current[kind] = clip;
    }
    if ("serviceWorker" in navigator) void navigator.serviceWorker.register("/sw.js");
    const captureInstall = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const markInstalled = () => { setIsInstalled(true); setInstallPrompt(null); setInstallNote("Installed — open Doremon Jump from your home screen."); };
    window.addEventListener("beforeinstallprompt", captureInstall);
    window.addEventListener("appinstalled", markInstalled);
    return () => { window.clearTimeout(hydrateTimer); window.removeEventListener("beforeinstallprompt", captureInstall); window.removeEventListener("appinstalled", markInstalled); if (orientationHandlerRef.current) window.removeEventListener("deviceorientation", orientationHandlerRef.current); if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current); if (basketToastTimerRef.current) window.clearTimeout(basketToastTimerRef.current); if (worldToastTimerRef.current) window.clearTimeout(worldToastTimerRef.current); };
  }, []);

  const installApp = async () => {
    if (isInstalled) return;
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") setInstallNote("Installing Doremon Jump…");
      else setInstallNote("Installation cancelled. You can try again anytime.");
      setInstallPrompt(null); return;
    }
    const isiPhone = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setInstallNote(isiPhone ? "On iPhone: open in Safari, tap Share, then Add to Home Screen." : "Open your browser menu and choose Install app or Add to Home screen.");
  };

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
    const audio = audioRef.current ?? new AudioCtor(); audioRef.current = audio;
    const playToneSequence = () => {
      const tone = (frequency: number, delay: number, duration: number, type: OscillatorType = "sine", endFrequency?: number, volume = .075) => {
        const oscillator = audio.createOscillator(); const gain = audio.createGain(); const start = audio.currentTime + delay;
        oscillator.type = type; oscillator.frequency.setValueAtTime(frequency, start); if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        gain.gain.setValueAtTime(.0001, start); gain.gain.exponentialRampToValueAtTime(volume, start + .012); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(start); oscillator.stop(start + duration + .02);
      };
      if (kind === "click") tone(420, 0, .07, "triangle", 520, .035);
      if (kind === "break") { tone(135, 0, .1, "square", 70, .045); tone(90, .06, .14, "triangle", 45, .035); }
      if (kind === "shoot") { tone(1180, 0, .2, "sawtooth", 230, .2); tone(760, .025, .18, "square", 170, .14); tone(1560, .055, .12, "triangle", 420, .1); }
    };
    if (audio.state === "suspended") void audio.resume().then(playToneSequence).catch(() => { /* The next direct tap will retry audio. */ });
    else playToneSequence();
  }, []);

  const celebrate = useCallback((message: string) => {
    setCelebration(message);
    if (celebrationTimerRef.current) window.clearTimeout(celebrationTimerRef.current);
    celebrationTimerRef.current = window.setTimeout(() => setCelebration(""), 950);
  }, []);

  const updateMission = useCallback((kind: MissionKind, value = 1, absolute = false) => {
    let completedLabel = ""; let changed = false;
    const updated = gameRef.current.missions.map((mission) => {
      if (mission.id !== kind || mission.complete) return mission;
      const nextValue = absolute && kind === "score" ? Math.floor(value / 250) * 250 : value;
      const progress = Math.min(mission.target, absolute ? nextValue : mission.progress + value);
      if (progress === mission.progress) return mission;
      changed = true;
      const complete = progress >= mission.target;
      if (complete && !mission.complete) completedLabel = mission.label;
      return { ...mission, progress, complete };
    });
    if (!changed) return;
    gameRef.current.missions = updated; setMissions([...updated]);
    if (completedLabel) { celebrate(`MISSION COMPLETE · ${completedLabel}`); playSfx("level"); }
  }, [celebrate, playSfx]);

  const unlockAchievement = useCallback((id: string) => {
    const game = gameRef.current;
    if (game.achievements.includes(id)) return;
    game.achievements.push(id); const unlocked = [...game.achievements]; setAchievements(unlocked); localStorage.setItem("doremon-jump-achievements", JSON.stringify(unlocked));
    const achievement = ACHIEVEMENTS.find((item) => item.id === id); if (achievement) celebrate(`ACHIEVEMENT · ${achievement.label}`);
  }, [celebrate]);

  const makePlatforms = useCallback((width: number, height: number) => {
    const items: Platform[] = [{ x: width / 2 - 52, y: height - 75, w: 104, h: 13, basket: null, collected: true, drift: 0, ...platformExtras(0) }];
    let y = height - 155;
    let previousX = width / 2 - 50;
    for (let i = 0; i < 13; i += 1) {
      const w = 94 + Math.random() * 24;
      const reach = Math.min(108, width * 0.28);
      const x = clamp(previousX + (Math.random() - 0.5) * reach * 2, 12, width - w - 12);
      const extras = platformExtras(i, 0);
      const platform: Platform = { x, y, w, h: 13, basket: i % 3 === 1 && !extras.powerUp ? i % BASKETS.length : null, collected: false, drift: 0, ...extras };
      items.push(platform);
      if (i % 6 === 3) items.push(sideBoard(platform, width));
      previousX = x;
      y -= 70 + Math.random() * 8;
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
    const runMissions = createMissions();
    game.collectionCounts = Array(BASKETS.length).fill(0); game.droneUntil = 0; game.bootsJumpsRemaining = 0; game.fallingBoots = []; game.magnetUntil = 0; game.slowUntil = 0; game.cloudCharges = 0; game.lastHudUpdate = 0; game.lastMissionScore = -250; game.combo = 0; game.bestCombo = 0; game.missions = runMissions; game.worldIndex = firstWorld; game.worldStage = 0; game.nearbyBasket = 1; game.isFalling = false; game.fallStarted = 0; game.resultSubmitted = false;
    game.villains = []; game.fireballs = []; game.nextVillainAt = 0; game.nextBossScore = 50000; game.villainCursor = 0; game.villainsDefeated = 0;
    setScore(0); setRuns(0); setToast(null); setCollectionCounts(Array(BASKETS.length).fill(0)); setWorldIndex(firstWorld); setWorldToast(false); setNearbyBasket(1); setFalling(false); setVillainsDefeated(0); setResultStatus("idle"); setShowTiltGuide(true); setCombo(0); setBestCombo(0); setMissions(runMissions); setShowMissions(false);
    window.setTimeout(() => setShowMissions(true), 4700);
    window.setTimeout(() => setShowMissions(false), 8900);
  }, [makePlatforms]);

  const enableMotion = useCallback(async () => {
    try {
      const Orientation = DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
      if (typeof Orientation.requestPermission === "function") {
        const permission = await Orientation.requestPermission();
        if (permission !== "granted") { setControl("Touch / keys active"); return; }
      }
      if (orientationHandlerRef.current) window.removeEventListener("deviceorientation", orientationHandlerRef.current);
      const samples: number[] = []; let center = 0; let calibrating = true;
      const handler = (event: DeviceOrientationEvent) => {
        if (event.gamma == null) return;
        if (calibrating) { samples.push(event.gamma); return; }
        const tilt = event.gamma - center; gameRef.current.input = clamp(tilt / 24, -1, 1); setControl("Tilt calibrated");
        if (Math.abs(tilt) > 2) setShowTiltGuide(false);
      };
      orientationHandlerRef.current = handler;
      window.addEventListener("deviceorientation", handler, { passive: true });
      await new Promise<void>((resolve) => window.setTimeout(() => { center = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0; calibrating = false; setControl(samples.length ? "Tilt calibrated" : "Touch / keys active"); resolve(); }, 1300));
    } catch { setControl("Touch / keys active"); }
  }, []);

  const submitResult = useCallback(async (finalScore: number, finalRuns: number, counts: number[], defeated: number, finalWorld: number) => {
    const goodies = counts.reduce((sum, count) => sum + count, 0);
    const result = {
      name: name.trim(), mobile, branch: branch.trim(), campaign: "Doremon Jump",
      score: String(finalScore), runs: String(finalRuns), rewardPoints: String(rewardPoints(finalRuns)),
      goodiesCollected: String(goodies), villainsDefeated: String(defeated), worldReached: WORLDS[finalWorld].name,
      bestCombo: String(gameRef.current.bestCombo), missionsCompleted: String(gameRef.current.missions.filter((mission) => mission.complete).length), achievementsUnlocked: String(gameRef.current.achievements.length),
      basketBreakdown: JSON.stringify(BASKETS.flatMap((basket, index) => counts[index] > 0 ? [{ basket: basket.name, count: counts[index], runs: basket.runs * counts[index] }] : [])),
      completedAt: new Date().toISOString(),
    };
    localStorage.setItem("doremon-jump-last-result", JSON.stringify(result)); setResultStatus("sending");
    const viteEndpoint = (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_LEAD_FORM_ENDPOINT;
    const endpoint = viteEndpoint ?? (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_LEAD_FORM_ENDPOINT : undefined);
    if (!endpoint) { setResultStatus("local"); return; }
    const isNetlify = endpoint === "/";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": isNetlify ? "application/x-www-form-urlencoded" : "application/json" },
      body: isNetlify
        ? new URLSearchParams({ "form-name": "doremon-jump-leads", ...result }).toString()
        : JSON.stringify(result),
    });
    if (!response.ok) throw new Error(`Score submission failed with ${response.status}`);
    setResultStatus("sent");
  }, [name, mobile, branch]);

  const startGame = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) { setFormError("Please enter your name."); return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { setFormError("Enter a valid 10-digit Indian mobile number."); return; }
    if (!branch.trim()) { setFormError("Please enter your branch."); return; }
    setSubmitting(true); setFormError(""); setCalibrationMessage("Hold your phone naturally while controls calibrate…");
    localStorage.setItem("monsoon-bonanza-player", JSON.stringify({ name: name.trim(), mobile, branch: branch.trim(), campaign: "Doremon Jump" }));
    await enableMotion();
    setCalibrationMessage(""); playSfx("start"); resetGame(); setScreen("playing"); setSubmitting(false);
  };

  useEffect(() => {
    if (screen !== "playing" || !showTiltGuide) return;
    const timer = window.setTimeout(() => setShowTiltGuide(false), 4500);
    return () => window.clearTimeout(timer);
  }, [screen, showTiltGuide]);

  useEffect(() => {
    if (screen !== "playing") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      const game = gameRef.current;
      if (game.width > 0 && Math.abs(game.width - rect.width) > 1) {
        const xScale = rect.width / game.width;
        game.player.x *= xScale;
        for (const platform of game.platforms) { platform.x *= xScale; platform.w *= xScale; if (platform.magnetX != null) platform.magnetX *= xScale; }
        for (const villain of game.villains) { villain.x *= xScale; villain.w *= xScale; }
        for (const fireball of game.fireballs) fireball.x *= xScale;
        for (const boots of game.fallingBoots) boots.x *= xScale;
      }
      if (game.height > 0 && Math.abs(game.height - rect.height) > 1) {
        const yScale = rect.height / game.height;
        game.player.y *= yScale;
        for (const platform of game.platforms) { platform.y *= yScale; if (platform.magnetY != null) platform.magnetY *= yScale; }
        for (const villain of game.villains) { villain.y *= yScale; villain.baseY *= yScale; villain.h *= yScale; }
        for (const fireball of game.fireballs) fireball.y *= yScale;
        for (const boots of game.fallingBoots) boots.y *= yScale;
      }
      game.width = rect.width; game.height = rect.height;
    };
    resize();
    const observer = new ResizeObserver(resize); observer.observe(canvas);

    const keyDown = (event: KeyboardEvent) => {
      if (["ArrowLeft", "a", "A"].includes(event.key)) { gameRef.current.input = -1; setShowTiltGuide(false); }
      if (["ArrowRight", "d", "D"].includes(event.key)) { gameRef.current.input = 1; setShowTiltGuide(false); }
    };
    const keyUp = (event: KeyboardEvent) => {
      if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) gameRef.current.input = 0;
    };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);

    const pulseWorldChip = () => {
      setWorldToast(false);
      if (worldToastTimerRef.current) window.clearTimeout(worldToastTimerRef.current);
      window.requestAnimationFrame(() => { setWorldToast(true); worldToastTimerRef.current = window.setTimeout(() => setWorldToast(false), 1400); });
    };

    let cachedWorld = -1; let cachedWorldHeight = 0; let cachedBackground: CanvasGradient | null = null;
    let cachedPlanetWidth = 0; let cachedPlanet: CanvasGradient | null = null;
    const drawWorld = (world: number, time: number, width: number, height: number) => {
      const gradients = [
        ["#73c9ff", "#2774a8"], ["#111936", "#35295e"], ["#dff5ff", "#7ba6c5"],
        ["#ffbf69", "#d46b38"], ["#0fb8bd", "#07577a"], ["#07051d", "#24134f"], ["#70d6ff", "#087f8c"],
      ];
      if (!cachedBackground || cachedWorld !== world || cachedWorldHeight !== height) { cachedBackground = context.createLinearGradient(0, 0, 0, height); cachedBackground.addColorStop(0, gradients[world][0]); cachedBackground.addColorStop(1, gradients[world][1]); cachedWorld = world; cachedWorldHeight = height; }
      context.fillStyle = cachedBackground; context.fillRect(0, 0, width, height);

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
        for (let i = 0; i < 40; i += 1) { const x = (i * 71 + time * .02) % width; const y = (i * 103 + time * .07) % height; context.beginPath(); context.arc(x, y, 1.5 + i % 3, 0, Math.PI * 2); context.fill(); }
      } else if (world === 3) {
        context.fillStyle = "#fff0a8"; context.beginPath(); context.arc(width - 62, 118, 38, 0, Math.PI * 2); context.fill();
        context.fillStyle = "rgba(190,77,37,.5)"; context.beginPath(); context.moveTo(0, height); context.quadraticCurveTo(width * .35, height - 160, width, height - 45); context.lineTo(width, height); context.fill();
        context.strokeStyle = "rgba(35,91,54,.7)"; context.lineWidth = 8; for (let x = 45; x < width; x += 150) { context.beginPath(); context.moveTo(x, height - 50); context.lineTo(x, height - 130); context.moveTo(x, height - 95); context.lineTo(x - 18, height - 113); context.stroke(); }
      } else if (world === 4) {
        context.strokeStyle = "rgba(182,255,246,.28)"; context.lineWidth = 2;
        for (let i = 0; i < 26; i += 1) { const x = (i * 97 + Math.sin(time / 900 + i) * 12) % width; const y = height - ((i * 83 + time * .035) % height); context.beginPath(); context.arc(x, y, 2 + i % 5, 0, Math.PI * 2); context.stroke(); }
        context.fillStyle = "rgba(0,46,54,.5)"; for (let x = 18; x < width; x += 55) { context.beginPath(); context.moveTo(x, height); context.quadraticCurveTo(x + 22, height - 80, x + 4, height - 155); context.quadraticCurveTo(x - 18, height - 70, x, height); context.fill(); }
      } else if (world === 5) {
        context.fillStyle = "rgba(255,255,255,.9)"; for (let i = 0; i < 46; i += 1) context.fillRect((i * 67) % width, 80 + ((i * 113) % (height - 110)), i % 7 === 0 ? 2.2 : 1, i % 7 === 0 ? 2.2 : 1);
        if (!cachedPlanet || cachedPlanetWidth !== width) { cachedPlanet = context.createRadialGradient(width - 80, 142, 5, width - 80, 142, 48); cachedPlanet.addColorStop(0, "#ffbd79"); cachedPlanet.addColorStop(1, "#8c4cc8"); cachedPlanetWidth = width; } context.fillStyle = cachedPlanet; context.beginPath(); context.arc(width - 80, 142, 46, 0, Math.PI * 2); context.fill();
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
        game.isFalling = true; game.fallStarted = time; game.input = 0; game.pointerX = null; game.platforms = []; game.villains = []; game.fireballs = []; game.droneUntil = 0; game.bootsJumpsRemaining = 0; game.fallingBoots = [];
        player.y = height * .4; player.vy = 1.6; setToast(null); setFalling(true); playSfx("fall");
      };
      if (!game.isFalling && game.pointerX != null) game.input = clamp((game.pointerX - (player.x + player.w / 2)) / 90, -1, 1);
      if (!game.isFalling) { player.vx += game.input * 0.6 * dt; player.vx *= Math.pow(0.9, dt); player.vx = clamp(player.vx, -6.7, 6.7); }
      else player.vx *= Math.pow(.985, dt);
      const previousBottom = player.y + player.h;
      const droning = time < game.droneUntil;
      const wearingSpringBoots = game.bootsJumpsRemaining > 0;
      const worldSpeed = time < game.slowUntil ? .38 : 1;
      player.x += player.vx * dt; player.vy += (game.isFalling ? .16 : droning ? 0.12 : 0.48) * dt; player.y += player.vy * dt;
      if (player.x < -player.w * .45) player.x = width - player.w * .55;
      if (player.x > width - player.w * .55) player.x = -player.w * .45;

      const collectBasket = (platform: Platform) => {
        if (platform.basket == null || platform.collected) return;
        platform.collected = true;
        const basket = BASKETS[platform.basket]; const multiplier = game.combo + 1; game.bestCombo = Math.max(game.bestCombo, multiplier); const awardedRuns = basket.runs * multiplier; game.runs += awardedRuns; game.score += awardedRuns * 10; game.combo = multiplier === 5 ? 0 : multiplier;
        game.collectionCounts[platform.basket] += 1;
        setScore(game.score); setRuns(game.runs); setCombo(game.combo); setBestCombo(game.bestCombo); setCollectionCounts([...game.collectionCounts]); setToast({ basket, awarded: awardedRuns, multiplier }); playSfx("collect"); if (basketToastTimerRef.current) window.clearTimeout(basketToastTimerRef.current); basketToastTimerRef.current = window.setTimeout(() => setToast(null), 1800);
        updateMission("baskets"); updateMission("combo", game.bestCombo, true); updateMission("score", game.score, true);
        const collectedTotal = game.collectionCounts.reduce((sum, count) => sum + count, 0); if (collectedTotal >= 25) unlockAchievement("basket-25"); if (game.collectionCounts.every((count) => count > 0)) unlockAchievement("every-basket");
      };

      for (const platform of game.platforms) {
        if (game.isFalling) break;
        if (platform.drift) { platform.x += platform.drift * dt * worldSpeed; if (platform.x < 8 || platform.x + platform.w > width - 8) platform.drift *= -1; }
        if (platform.basket != null && !platform.collected) {
          const labelX = clamp(platform.x + platform.w / 2 - 54, 5, width - 113);
          const touchesGoodie = player.x + player.w > labelX && player.x < labelX + 108 && player.y + player.h > platform.y - 57 && player.y < platform.y - 7;
          const magnetActive = time < game.magnetUntil && platform.y > -70 && platform.y < height + 45;
          if (magnetActive) {
            platform.magnetX ??= platform.x + platform.w / 2; platform.magnetY ??= platform.y - 28;
            const targetX = player.x + player.w / 2, targetY = player.y + player.h / 2; const dx = targetX - platform.magnetX, dy = targetY - platform.magnetY; const pull = Math.min(.3, .105 * dt + .055);
            platform.magnetX += dx * pull; platform.magnetY += dy * pull;
            if (Math.hypot(dx, dy) < 17) collectBasket(platform);
          } else {
            platform.magnetX = undefined; platform.magnetY = undefined;
            if (touchesGoodie) collectBasket(platform);
          }
        }
        if (platform.broken) { platform.y += 5.4 * dt; continue; }
        const newBottom = player.y + player.h;
        if (player.vy > 0 && previousBottom <= platform.y + 4 && newBottom >= platform.y && player.x + player.w > platform.x && player.x < platform.x + platform.w) {
          player.y = platform.y - player.h;
          if (platform.powerUp === "drone" && !platform.powerUsed) { player.vy = -23; game.droneUntil = time + 1100; platform.powerUsed = true; playSfx("rocket"); updateMission("drones"); updateMission("gadgets"); unlockAchievement("first-drone"); celebrate("DRONE BOOST!"); }
          else {
            let usedDoor = false;
            if (platform.powerUp && !platform.powerUsed) {
              platform.powerUsed = true; updateMission("gadgets");
              if (platform.powerUp === "boots") { game.bootsJumpsRemaining = 5; celebrate("SPRING BOOTS · 5 JUMPS"); }
              if (platform.powerUp === "magnet") { game.magnetUntil = time + 8000; celebrate("BASKET MAGNET · 8 SECONDS"); playSfx("collect"); }
              if (platform.powerUp === "slow") { game.slowUntil = time + 7000; celebrate("TIME BELL · WORLD SLOWED"); playSfx("level"); }
              if (platform.powerUp === "cloud") { game.cloudCharges = 1; celebrate("RESCUE CLOUD · SAVES YOUR NEXT FALL"); playSfx("level"); }
              if (platform.powerUp === "door") {
                const choices = WORLDS.map((_, index) => index).filter((index) => index !== game.worldIndex); const nextWorld = choices[Math.floor(Math.random() * choices.length)]; game.worldIndex = nextWorld; game.worldStage += 1; setWorldIndex(nextWorld); pulseWorldChip(); player.vy = -20; usedDoor = true; updateMission("worlds"); if (game.worldStage >= 5) unlockAchievement("five-worlds"); celebrate("ANYWHERE DOOR · NEW WORLD"); playSfx("level");
              }
            }
            if (usedDoor) { /* The door supplies this jump. */ }
            else if (game.bootsJumpsRemaining > 0) {
              player.vy = -16.3; game.bootsJumpsRemaining -= 1; playSfx("spring");
              if (game.bootsJumpsRemaining === 0) game.fallingBoots.push({ x: player.x + player.w / 2, y: player.y + player.h - 4, vy: 1.8, spin: 0, life: 95 });
            } else { player.vy = -11.5; playSfx("jump"); }
          }
          if (platform.kind === "breakable") { platform.broken = true; playSfx("break"); }
        }
      }

      if (!game.isFalling && player.vy > 0) {
        const visibleBoards = game.platforms.filter((platform) => !platform.broken && platform.y + platform.h >= 0 && platform.y <= height);
        const lowestVisibleBoard = visibleBoards.reduce<Platform | null>((lowest, platform) => !lowest || platform.y > lowest.y ? platform : lowest, null);
        const fellBelowLastBoard = lowestVisibleBoard ? player.y > lowestVisibleBoard.y + lowestVisibleBoard.h + 18 : player.y > height + 24;
        if (fellBelowLastBoard && game.cloudCharges > 0) { game.cloudCharges -= 1; const rescueY = Math.min(height - 70, player.y + player.h + 12); game.platforms.push({ x: clamp(player.x - 34, 8, width - 96), y: rescueY, w: 96, h: 13, basket: null, collected: true, drift: 0, kind: "normal", broken: false, powerUp: null, powerUsed: true, rescueCloud: true }); player.y = rescueY - player.h; player.vy = -14.5; celebrate("RESCUE CLOUD CAUGHT YOU!"); playSfx("level"); }
        else if (fellBelowLastBoard) beginFall();
      }

      if (!game.isFalling && player.y < height * 0.4 && player.vy < 0) {
        const shift = height * 0.4 - player.y; player.y = height * 0.4; game.distance += shift;
        for (const platform of game.platforms) { platform.y += shift; if (platform.magnetY != null) platform.magnetY += shift; }
        for (const boots of game.fallingBoots) boots.y += shift;
        game.score = Math.max(game.score, Math.floor(game.distance * 2));
        if (time - game.lastHudUpdate >= 80) { game.lastHudUpdate = time; setScore(game.score); }
      }
      const missedGoodie = game.platforms.some((platform) => platform.y >= height + 40 && platform.basket != null && !platform.collected);
      if (missedGoodie && game.combo > 0) { game.combo = 0; setCombo(0); }
      game.platforms = game.platforms.filter((platform) => platform.y < height + 40);
      while (!game.isFalling && Math.min(...game.platforms.map((platform) => platform.y)) > -160) {
        const top = Math.min(...game.platforms.map((platform) => platform.y));
        const difficulty = clamp(game.score / SCORE_GATES.fullDifficulty, 0, 1);
        const w = 98 - difficulty * 16 + Math.random() * 22; const previous = game.platforms.reduce((a, b) => a.y < b.y ? a : b);
        const x = clamp(previous.x + (Math.random() - 0.5) * Math.min(205 + difficulty * 30, width * (.5 + difficulty * .08)), 10, width - w - 10);
        const extras = platformExtras(game.basketCursor, game.score);
        const withBasket = game.basketCursor % 3 !== 0 && !extras.powerUp;
        const gap = 66 + difficulty * 17 + Math.random() * (8 + difficulty * 7);
        const platform: Platform = { x, y: top - gap, w, h: 13, basket: withBasket ? game.basketCursor % BASKETS.length : null, collected: false, drift: platformDrift(game.basketCursor, game.score), ...extras };
        game.platforms.push(platform);
        if (platform.kind === "breakable" || game.basketCursor % (game.score < SCORE_GATES.breakableBoards ? 6 : 5) === 0) game.platforms.push(sideBoard(platform, width));
        game.basketCursor += 1;
      }

      if (!game.isFalling && game.score >= SCORE_GATES.villains) {
        if (game.score >= game.nextBossScore && !game.villains.some((villain) => villain.alive && villain.boss)) {
          const fromLeft = game.villainCursor % 2 === 0; const baseY = 210 + Math.random() * Math.max(100, height * .28);
          game.villains.push({ id: game.villainCursor, x: fromLeft ? -96 : width + 12, y: baseY, baseY, w: 82, h: 70, vx: (fromLeft ? 1 : -1) * .48, phase: Math.random() * Math.PI * 2, alive: true, boss: true, health: 3, maxHealth: 3 });
          game.villainCursor += 1; game.nextBossScore += 50000; celebrate("BOSS INCOMING · 3 HITS!"); playSfx("level");
        }
        if (time >= game.nextVillainAt && game.villains.filter((villain) => villain.alive).length < 2) {
          const fromLeft = game.villainCursor % 2 === 0;
          const baseY = 185 + Math.random() * Math.max(130, height * .42);
          game.villains.push({ id: game.villainCursor, x: fromLeft ? -58 : width + 8, y: baseY, baseY, w: 48, h: 42, vx: (fromLeft ? 1 : -1) * (.72 + Math.random() * .35), phase: Math.random() * Math.PI * 2, alive: true, boss: false, health: 1, maxHealth: 1 });
          game.villainCursor += 1; game.nextVillainAt = time + 4200 + Math.random() * 2400;
        }
        for (const villain of game.villains) { villain.x += villain.vx * dt * worldSpeed; villain.y = villain.baseY + Math.sin(time / (villain.boss ? 620 : 480) + villain.phase) * (villain.boss ? 12 : 17); }
        game.villains = game.villains.filter((villain) => villain.alive && villain.x > -130 && villain.x < width + 130);
        for (const fireball of game.fireballs) {
          const target = game.villains.find((villain) => villain.id === fireball.targetId && villain.alive);
          if (!target) { fireball.life = 0; continue; }
          const dx = target.x + target.w / 2 - fireball.x; const dy = target.y + target.h / 2 - fireball.y; const distance = Math.hypot(dx, dy);
          fireball.vx = dx / Math.max(distance, 1) * 11; fireball.vy = dy / Math.max(distance, 1) * 11;
          fireball.x += fireball.vx * dt; fireball.y += fireball.vy * dt; fireball.life -= dt;
          if (distance < (target.boss ? 36 : 24)) {
            target.health -= 1; fireball.life = 0;
            if (target.health <= 0) {
              target.alive = false; game.villainsDefeated += 1; game.score += target.boss ? 2000 : 250;
              if (target.boss) { game.runs += 50; setRuns(game.runs); celebrate("BOSS DEFEATED · +50 RUNS!"); playSfx("level"); }
              setVillainsDefeated(game.villainsDefeated); setScore(game.score); updateMission("villains"); updateMission("score", game.score, true); if (game.villainsDefeated >= 5) unlockAchievement("villain-hunter");
            } else celebrate(`BOSS HIT · ${target.health} LEFT`);
          }
        }
        game.fireballs = game.fireballs.filter((fireball) => fireball.life > 0);
        const collision = game.villains.find((villain) => villain.alive && player.x + player.w > villain.x + 5 && player.x < villain.x + villain.w - 5 && player.y + player.h > villain.y + 5 && player.y < villain.y + villain.h - 5);
        if (collision) beginFall();
      }

      const targetWorldStage = Math.floor(game.score / SCORE_GATES.worldChange);
      if (!game.isFalling && targetWorldStage > game.worldStage) {
        game.worldStage = targetWorldStage;
        const choices = WORLDS.map((_, index) => index).filter((index) => index !== game.worldIndex);
        const nextWorld = choices[Math.floor(Math.random() * choices.length)];
        game.worldIndex = nextWorld; setWorldIndex(nextWorld); pulseWorldChip(); playSfx("level");
        updateMission("worlds"); if (game.worldStage >= 5) unlockAchievement("five-worlds");
      }
      if (game.score - game.lastMissionScore >= 250) { game.lastMissionScore = Math.floor(game.score / 250) * 250; updateMission("score", game.score, true); }
      if (game.score >= 100000) unlockAchievement("score-100k");

      let candidate: Platform | undefined; let candidateDistance = Number.POSITIVE_INFINITY;
      for (const platform of game.platforms) { if (platform.basket == null || platform.collected || platform.broken) continue; const distance = Math.abs(platform.y - player.y); if (distance < candidateDistance) { candidate = platform; candidateDistance = distance; } }
      if (candidate?.basket != null && candidate.basket !== game.nearbyBasket) { game.nearbyBasket = candidate.basket; setNearbyBasket(candidate.basket); }
      for (const boots of game.fallingBoots) { boots.vy += .22 * dt; boots.y += boots.vy * dt; boots.spin += .13 * dt; boots.life -= dt; }
      game.fallingBoots = game.fallingBoots.filter((boots) => boots.life > 0 && boots.y < height + 60);
      drawWorld(WORLDS[game.worldIndex].scene, time, width, height);

      for (const platform of game.platforms) {
        if (platform.rescueCloud) {
          const cx = platform.x + platform.w / 2; context.save(); context.translate(cx, platform.y + 3);
          context.fillStyle = "rgba(226,251,255,.96)"; context.strokeStyle = "#48bfc7"; context.lineWidth = 2;
          context.beginPath(); context.arc(-29, 0, 14, 0, Math.PI * 2); context.arc(-13, -8, 18, 0, Math.PI * 2); context.arc(8, -10, 21, 0, Math.PI * 2); context.arc(29, 0, 15, 0, Math.PI * 2); context.roundRect(-39, -2, 78, 18, 9); context.fill(); context.stroke();
          context.fillStyle = "#07506b"; context.font = "900 8px system-ui"; context.textAlign = "center"; context.fillText("RESCUE", 0, 7); context.restore();
        } else {
          context.fillStyle = platform.kind === "breakable" ? "#ce6258" : "#dca52b"; context.beginPath(); context.roundRect(platform.x, platform.y, platform.w, platform.h, 7); context.fill();
          context.fillStyle = "rgba(255,255,255,.45)"; context.beginPath(); context.roundRect(platform.x + 8, platform.y + 2, platform.w - 16, 2, 2); context.fill();
        }
        if (platform.kind === "breakable") { context.strokeStyle = "rgba(70,12,24,.75)"; context.lineWidth = 1.5; context.beginPath(); context.moveTo(platform.x + platform.w * .48, platform.y + 1); context.lineTo(platform.x + platform.w * .58, platform.y + 7); context.lineTo(platform.x + platform.w * .45, platform.y + 12); context.stroke(); }
        if (platform.powerUp === "boots" && !platform.powerUsed) {
          const cx = platform.x + platform.w / 2; context.save(); context.translate(cx, platform.y - 3);
          for (const side of [-1, 1]) {
            const bx = side * 11; context.strokeStyle = "#ffd166"; context.lineWidth = 2.4; context.beginPath(); context.moveTo(bx - 4, 0); context.lineTo(bx + 4, -5); context.lineTo(bx - 4, -10); context.lineTo(bx + 4, -15); context.stroke();
            context.fillStyle = "#db2777"; context.strokeStyle = "#fbcfe8"; context.lineWidth = 1.2; context.beginPath(); context.roundRect(bx - 8, -25, 16, 11, 4); context.fill(); context.stroke(); context.fillStyle = "#351040"; context.beginPath(); context.roundRect(bx - 7, -18, 18, 5, 2); context.fill();
          }
          context.restore();
        }
        if (platform.powerUp === "drone" && !platform.powerUsed) {
          const cx = platform.x + platform.w / 2; context.save(); context.translate(cx, platform.y - 24); context.lineCap = "round";
          const rotors = [[-25, -10], [-25, 10], [25, -10], [25, 10]];
          context.strokeStyle = "#334155"; context.lineWidth = 4; for (const [rx, ry] of rotors) { context.beginPath(); context.moveTo(Math.sign(rx) * 9, Math.sign(ry) * 4); context.lineTo(rx, ry); context.stroke(); context.fillStyle = "#0f172a"; context.beginPath(); context.arc(rx, ry, 7, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#22d3ee"; context.lineWidth = 1.5; context.stroke(); context.save(); context.translate(rx, ry); context.rotate(time / 42 * Math.sign(rx * ry)); context.strokeStyle = "#f8fafc"; context.lineWidth = 2.2; context.beginPath(); context.moveTo(-10, 0); context.lineTo(10, 0); context.moveTo(0, -10); context.lineTo(0, 10); context.stroke(); context.restore(); }
          context.fillStyle = "#1d4ed8"; context.strokeStyle = "#67e8f9"; context.lineWidth = 2; context.beginPath(); context.roundRect(-12, -13, 24, 26, 7); context.fill(); context.stroke(); context.fillStyle = "#fbbf24"; context.beginPath(); context.roundRect(-7, -7, 14, 5, 2); context.fill(); context.fillStyle = "#22c55e"; context.beginPath(); context.arc(0, 6, 3, 0, Math.PI * 2); context.fill(); context.restore();
        }
        if (platform.powerUp && !platform.powerUsed && GADGET_VISUALS[platform.powerUp]) { const visual = GADGET_VISUALS[platform.powerUp]!; const cx = platform.x + platform.w / 2; context.save(); context.shadowBlur = 9; context.shadowColor = visual.stroke; context.fillStyle = visual.fill; context.strokeStyle = visual.stroke; context.lineWidth = 2; context.beginPath(); context.roundRect(cx - 19, platform.y - 45, 38, 34, 9); context.fill(); context.stroke(); context.shadowBlur = 0; context.fillStyle = "#fff"; context.font = "900 19px system-ui"; context.textAlign = "center"; context.fillText(visual.symbol, cx, platform.y - 26); context.fillStyle = visual.stroke; context.font = "900 6px system-ui"; context.fillText(visual.label, cx, platform.y - 15); context.restore(); }
        if (platform.basket != null && !platform.collected) {
          const basket = BASKETS[platform.basket]; const cx = platform.x + platform.w / 2;
          if (platform.magnetX != null && platform.magnetY != null) {
            const orbColors = ["#22d3ee", "#fbbf24", "#f472b6", "#a78bfa"]; const orbColor = orbColors[platform.basket % orbColors.length]; const targetX = player.x + player.w / 2, targetY = player.y + player.h / 2; const dx = targetX - platform.magnetX, dy = targetY - platform.magnetY;
            context.save(); context.strokeStyle = `${orbColor}88`; context.lineWidth = 1.5; context.setLineDash([3, 7]); context.beginPath(); context.moveTo(platform.magnetX, platform.magnetY); context.quadraticCurveTo(platform.magnetX - dy * .12, platform.magnetY + dx * .12, targetX, targetY); context.stroke(); context.setLineDash([]);
            for (let trail = 1; trail <= 2; trail += 1) { context.globalAlpha = .42 / trail; context.fillStyle = orbColor; context.beginPath(); context.arc(platform.magnetX - dx * .055 * trail, platform.magnetY - dy * .055 * trail, 5 - trail, 0, Math.PI * 2); context.fill(); }
            context.globalAlpha = 1; context.shadowBlur = 14; context.shadowColor = orbColor; context.fillStyle = orbColor; context.beginPath(); context.arc(platform.magnetX, platform.magnetY, 10, 0, Math.PI * 2); context.fill(); context.shadowBlur = 0; context.strokeStyle = "#fff"; context.lineWidth = 2; context.stroke(); context.fillStyle = "#07111f"; context.font = "900 11px system-ui"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(basket.icon, platform.magnetX, platform.magnetY + .5); context.restore();
          } else {
            const labelX = clamp(cx - 54, 5, width - 113);
            context.fillStyle = "rgba(4,18,31,.94)"; context.beginPath(); context.roundRect(labelX, platform.y - 53, 108, 43, 10); context.fill();
            context.strokeStyle = "#b9fff0"; context.lineWidth = 2; context.stroke();
            context.fillStyle = "#0cd8ba"; context.font = "900 18px system-ui"; context.textAlign = "left"; context.fillText(basket.icon, labelX + 9, platform.y - 27);
            context.fillStyle = "#fff"; context.font = "900 10px system-ui"; context.fillText(basket.short, labelX + 32, platform.y - 31);
            context.fillStyle = "#ffe17c"; context.font = "800 8px system-ui"; context.fillText(`+${basket.runs} RUNS`, labelX + 32, platform.y - 18);
          }
        }
      }

      for (const boots of game.fallingBoots) {
        context.save(); context.translate(boots.x, boots.y); context.rotate(boots.spin);
        for (const side of [-1, 1]) { const bx = side * 10; context.strokeStyle = "#dffcff"; context.lineWidth = 2; context.beginPath(); context.moveTo(bx - 4, -5); context.lineTo(bx + 4, 0); context.lineTo(bx - 4, 5); context.lineTo(bx + 4, 10); context.stroke(); context.fillStyle = "#0cd8ba"; context.beginPath(); context.roundRect(bx - 8, 8, 18, 8, 3); context.fill(); }
        context.restore();
      }

      for (const fireball of game.fireballs) {
        context.save(); context.translate(fireball.x, fireball.y); context.rotate(Math.atan2(fireball.vy, fireball.vx));
        for (let i = 0; i < 4; i += 1) { const trail = 10 + i * 7; context.fillStyle = i < 2 ? "rgba(255,176,0,.82)" : "rgba(255,55,20,.48)"; context.beginPath(); context.ellipse(-trail, Math.sin(time / 45 + i) * 4, 11 - i * 1.6, 6 - i, 0, 0, Math.PI * 2); context.fill(); }
        const flame = context.createRadialGradient(0, 0, 1, 0, 0, 18); flame.addColorStop(0, "#fffde0"); flame.addColorStop(.28, "#ffe14c"); flame.addColorStop(.62, "#ff7a18"); flame.addColorStop(1, "rgba(215,25,18,0)");
        context.fillStyle = flame; context.beginPath(); context.arc(0, 0, 18, 0, Math.PI * 2); context.fill();
        context.fillStyle = "#fffbea"; context.beginPath(); context.arc(0, 0, 5.5, 0, Math.PI * 2); context.fill(); context.restore();
      }
      for (const villain of game.villains) {
        if (!villain.alive) continue;
        context.save(); context.translate(villain.x + villain.w / 2, villain.y + villain.h / 2); if (villain.boss) context.scale(1.55, 1.55);
        const wing = 9 + Math.sin(time / 85 + villain.phase) * 5;
        context.fillStyle = "rgba(55,12,75,.9)"; context.strokeStyle = "#ff365d"; context.lineWidth = 2;
        for (const side of [-1, 1]) { context.beginPath(); context.moveTo(side * 17, -7); context.lineTo(side * 36, -wing); context.lineTo(side * 29, 0); context.lineTo(side * 38, wing); context.lineTo(side * 16, 11); context.closePath(); context.fill(); context.stroke(); }
        context.fillStyle = "#1d102d"; context.strokeStyle = "#ff365d"; context.lineWidth = 2.5; context.beginPath(); context.roundRect(-21, -19, 42, 39, 12); context.fill(); context.stroke();
        context.fillStyle = "#d51d42"; context.beginPath(); context.moveTo(-17, -15); context.lineTo(-12, -31); context.lineTo(-4, -18); context.moveTo(4, -18); context.lineTo(12, -31); context.lineTo(17, -15); context.fill();
        context.fillStyle = "#fff"; context.beginPath(); context.moveTo(-16, -7); context.lineTo(-3, -3); context.lineTo(-15, 2); context.closePath(); context.moveTo(16, -7); context.lineTo(3, -3); context.lineTo(15, 2); context.closePath(); context.fill();
        context.fillStyle = "#ff163f"; context.beginPath(); context.arc(-9, -3, 2.7, 0, Math.PI * 2); context.arc(9, -3, 2.7, 0, Math.PI * 2); context.fill();
        context.fillStyle = "#fff"; context.beginPath(); context.moveTo(-10, 8); context.lineTo(-4, 16); context.lineTo(0, 8); context.lineTo(5, 16); context.lineTo(11, 8); context.closePath(); context.fill();
        if (villain.boss) { context.fillStyle = "rgba(5,10,24,.86)"; context.beginPath(); context.roundRect(-23, 24, 46, 6, 3); context.fill(); context.fillStyle = "#ff365d"; context.beginPath(); context.roundRect(-22, 25, 44 * (villain.health / villain.maxHealth), 4, 2); context.fill(); }
        context.restore();
      }

      const px = player.x, py = player.y;
      context.save(); context.translate(px + player.w / 2, py + player.h / 2); context.rotate(game.isFalling ? (time - game.fallStarted) / 240 : clamp(player.vx / 34, -.17, .17)); if (player.vx < 0) context.scale(-1, 1);
      const upgradeTier = Math.min(game.worldStage, 5);
      const outfitColors = ["#0cd8ba", "#ff9f1c", "#9b5de5", "#ef476f", "#00bbf9", "#ffe17c"];
      const doremonColors = ["#169fe3", "#7657e8", "#10bfa5", "#ef476f", "#f2a51a", "#37b45b", "#e456b4", "#465ce8"];
      const outfitColor = outfitColors[game.worldStage % outfitColors.length]; const accessoryMode = game.worldStage % 5;
      const colorPhase = game.worldStage % doremonColors.length; const doremonColor = doremonColors[colorPhase];
      if (time < game.magnetUntil) { context.save(); context.strokeStyle = "rgba(255,209,102,.92)"; context.lineWidth = 2.5; context.beginPath(); context.arc(0, 0, 38 + Math.sin(time / 120) * 3, 0, Math.PI * 2); context.stroke(); context.strokeStyle = "rgba(230,57,70,.68)"; context.lineWidth = 1.5; context.beginPath(); context.arc(0, 0, 44 + Math.cos(time / 140) * 3, 0, Math.PI * 2); context.stroke(); for (let i = 0; i < 4; i += 1) { const angle = time / 310 + i * Math.PI / 2; context.fillStyle = i % 2 ? "#ffd166" : "#e63946"; context.beginPath(); context.arc(Math.cos(angle) * 42, Math.sin(angle) * 35, 3, 0, Math.PI * 2); context.fill(); } context.restore(); }
      if (droning) {
        context.save(); context.lineCap = "round"; const rotors = [[-31, -14], [-31, 12], [31, -14], [31, 12]];
        context.strokeStyle = "#1e3a8a"; context.lineWidth = 5; for (const [rx, ry] of rotors) { context.beginPath(); context.moveTo(Math.sign(rx) * 8, Math.sign(ry) * 5); context.lineTo(rx, ry); context.stroke(); context.fillStyle = "#0f172a"; context.beginPath(); context.arc(rx, ry, 8, 0, Math.PI * 2); context.fill(); context.strokeStyle = "#22d3ee"; context.lineWidth = 1.5; context.stroke(); context.save(); context.translate(rx, ry); context.rotate(time / 30 * Math.sign(rx * ry)); context.strokeStyle = "rgba(255,255,255,.95)"; context.lineWidth = 2.5; context.beginPath(); context.moveTo(-12, 0); context.lineTo(12, 0); context.moveTo(0, -12); context.lineTo(0, 12); context.stroke(); context.restore(); }
        context.fillStyle = "#1d4ed8"; context.strokeStyle = "#67e8f9"; context.lineWidth = 2; context.beginPath(); context.roundRect(-13, -16, 26, 34, 8); context.fill(); context.stroke(); context.fillStyle = "#fbbf24"; context.beginPath(); context.roundRect(-8, -10, 16, 6, 2); context.fill(); context.fillStyle = "#22c55e"; context.beginPath(); context.arc(-4, 7, 2.5, 0, Math.PI * 2); context.fill(); context.fillStyle = "#ef4444"; context.beginPath(); context.arc(4, 7, 2.5, 0, Math.PI * 2); context.fill(); context.restore();
      }
      const moving = Math.abs(player.vx) > 1.05;
      const sprite = game.isFalling ? (Math.floor(time / 105) % 2 === 0 ? runSpriteRef.current : spriteRef.current) : moving ? runSpriteRef.current : spriteRef.current;
      if (sprite?.complete && sprite.naturalWidth > 0) {
        if (colorPhase === 0) context.drawImage(sprite, -33, -38, 66, 66);
        else {
          const tintKey = `${sprite.src}|${doremonColor}`; let tintCanvas = tintedSpriteCacheRef.current.get(tintKey);
          if (!tintCanvas) {
            tintCanvas = document.createElement("canvas"); tintCanvas.width = 66; tintCanvas.height = 66; const tintContext = tintCanvas.getContext("2d", { willReadFrequently: true }); tintContext?.drawImage(sprite, 0, 0, 66, 66);
            if (tintContext) { const pixels = tintContext.getImageData(0, 0, 66, 66); const target = [Number.parseInt(doremonColor.slice(1, 3), 16), Number.parseInt(doremonColor.slice(3, 5), 16), Number.parseInt(doremonColor.slice(5, 7), 16)]; for (let i = 0; i < pixels.data.length; i += 4) { const red = pixels.data[i], green = pixels.data[i + 1], blue = pixels.data[i + 2]; if (blue > 105 && blue > red * 1.28 && blue > green * 1.08) { const shade = .56 + ((red + green + blue) / 765) * .62; pixels.data[i] = Math.min(255, target[0] * shade); pixels.data[i + 1] = Math.min(255, target[1] * shade); pixels.data[i + 2] = Math.min(255, target[2] * shade); } } tintContext.putImageData(pixels, 0, 0); }
            tintedSpriteCacheRef.current.set(tintKey, tintCanvas);
          }
          context.drawImage(tintCanvas, -33, -38, 66, 66);
        }
      }
      else { context.fillStyle = "#169fe3"; context.beginPath(); context.arc(0, 0, 20, 0, Math.PI * 2); context.fill(); }
      if (droning) { context.strokeStyle = "#67e8f9"; context.lineWidth = 2; context.beginPath(); context.arc(-10, 2, 7, -Math.PI / 2, Math.PI / 2); context.moveTo(10, -5); context.arc(10, 2, 7, -Math.PI / 2, Math.PI / 2, true); context.stroke(); context.fillStyle = "#1d4ed8"; context.strokeStyle = "#fbbf24"; context.lineWidth = 1.4; context.beginPath(); context.roundRect(-8, 8, 16, 9, 3); context.fill(); context.stroke(); }
      if (upgradeTier >= 1 && accessoryMode === 1) { context.fillStyle = outfitColor; context.beginPath(); context.roundRect(-16, 4, 32, 8, 4); context.fill(); context.beginPath(); context.moveTo(10, 8); context.lineTo(22, 19); context.lineTo(10, 15); context.closePath(); context.fill(); }
      if (wearingSpringBoots) { for (const side of [-1, 1]) { const bx = side * 11; context.strokeStyle = "#dffcff"; context.lineWidth = 2; context.beginPath(); context.moveTo(bx - 4, 22); context.lineTo(bx + 4, 26); context.lineTo(bx - 4, 30); context.lineTo(bx + 4, 34); context.stroke(); context.fillStyle = "#0cd8ba"; context.beginPath(); context.roundRect(bx - 8, 31, 18, 8, 3); context.fill(); } }
      if (upgradeTier >= 3 && accessoryMode === 3) { context.fillStyle = "#ffe17c"; context.strokeStyle = "#9d6616"; context.lineWidth = 1.4; context.beginPath(); context.moveTo(-13, -29); context.lineTo(-9, -40); context.lineTo(-2, -33); context.lineTo(3, -42); context.lineTo(9, -33); context.lineTo(14, -40); context.lineTo(13, -28); context.closePath(); context.fill(); context.stroke(); }
      if (upgradeTier >= 4 && accessoryMode === 4) { context.strokeStyle = "#f4c64f"; context.lineCap = "round"; context.lineWidth = 2.2; context.beginPath(); context.moveTo(17, 8); context.lineTo(25, -4); context.stroke(); context.fillStyle = outfitColor; context.beginPath(); context.arc(27, -7, 4, 0, Math.PI * 2); context.fill(); context.fillStyle = "#fff7a8"; context.beginPath(); context.arc(27, -7, 1.4, 0, Math.PI * 2); context.fill(); }
      if (upgradeTier >= 5 && accessoryMode === 0) { context.fillStyle = "#fff7a8"; for (let i = 0; i < 3; i += 1) { const angle = time / 560 + i * Math.PI * 2 / 3; context.beginPath(); context.arc(Math.cos(angle) * 38, Math.sin(angle) * 30, 1.8, 0, Math.PI * 2); context.fill(); } }
      if (game.cloudCharges > 0) { context.save(); context.translate(-25, 30); context.fillStyle = "rgba(232,252,255,.96)"; context.strokeStyle = "#48bfc7"; context.lineWidth = 1.5; context.beginPath(); context.arc(-7, 1, 6, 0, Math.PI * 2); context.arc(1, -3, 9, 0, Math.PI * 2); context.arc(11, 1, 7, 0, Math.PI * 2); context.roundRect(-12, 0, 28, 9, 5); context.fill(); context.stroke(); context.fillStyle = "#f4b91f"; context.beginPath(); context.arc(15, -7, 7, 0, Math.PI * 2); context.fill(); context.fillStyle = "#08223a"; context.font = "900 8px system-ui"; context.textAlign = "center"; context.fillText("1", 15, -4); context.restore(); }
      context.restore();

      if (game.isFalling && time - game.fallStarted > 1650) {
        const finalScore = Math.floor(game.score); setScore(finalScore); setRuns(game.runs);
        if (!game.resultSubmitted) {
          game.resultSubmitted = true;
          void submitResult(finalScore, game.runs, [...game.collectionCounts], game.villainsDefeated, game.worldIndex).catch(() => setResultStatus("error"));
        }
        const nextBest = Math.max(best, finalScore); setBest(nextBest); localStorage.setItem("monsoon-bonanza-best", String(nextBest)); setFalling(false); setScreen("gameover"); return;
      }
      frameRef.current = requestAnimationFrame(draw);
    };
    frameRef.current = requestAnimationFrame(draw);
    return () => { observer.disconnect(); window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp); if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [screen, best, playSfx, submitResult, celebrate, updateMission, unlockAchievement]);

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
      <header className="brand-bar"><span className="brand-mark">☔</span><span>MONSOON BONANZA</span><span className="rain-status">● LIVE</span></header>

      {screen === "intro" && <section className="intro-panel">
        <div className="campaign-date">☔ 1 JUL — 31 AUG 2026</div>
        <p className="audience-line">Relationship Managers <span>Internal Contest</span></p>
        <h1 className="campaign-title"><span>MONSOON</span> BONANZA</h1>
        <div className="game-title-lockup"><img src="/doraemon-sprite.png" alt="" /><div><span>THE GAME</span><strong>DOREMON JUMP</strong></div></div>
        <p className="intro-copy">Collect as many basket goodies as you can, score more Runs and build your reward points.</p>
        <button className="play-button hero-play" onClick={() => { playSfx("click"); setFormError(""); setScreen("details"); }}>PLAY NOW <span aria-hidden="true">▶</span></button>
        <div className="install-app"><button type="button" disabled={isInstalled} onClick={installApp}>{isInstalled ? "✓ APP INSTALLED" : "＋ INSTALL APP"}</button>{installNote && <p role="status">{installNote}</p>}</div>

        <div className="quick-rules" aria-label="How to play">
          <span>↔ <b>Tilt to move</b></span>
          <span>🧺 <b>Collect baskets</b></span>
          <span>☁ <b>Cloud saves one fall</b></span>
        </div>

        <div className="intro-details">
          <details className="reward-track">
            <summary><span>REWARD TRACK</span><strong>500 Runs → 50,000 points</strong><b aria-hidden="true">＋</b></summary>
            <div className="reward-rows">
              {SLABS.map((slab, index) => <div className="reward-row" key={slab.runs}><span>Slab {index + 1} · {slab.runs} Runs</span><strong>{slab.points.toLocaleString("en-IN")} points</strong></div>)}
              <p>After 900 Runs: +5,000 points for every extra 50 Runs.</p>
            </div>
          </details>

          <details className="basket-list">
            <summary><span>ELIGIBLE BASKETS</span><strong>{BASKETS.length} goodies · Up to +200 Runs</strong><b aria-hidden="true">＋</b></summary>
            <div>{BASKETS.map((basket) => <article key={basket.name}><i>{basket.icon}</i><p><strong>{basket.name}</strong><span>Fee {basket.fee}</span></p><b>+{basket.runs}<small> Runs</small></b></article>)}</div>
          </details>
        </div>
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
          {calibrationMessage && <p className="calibration-note" role="status">📱 {calibrationMessage}</p>}
          <button className="play-button" disabled={submitting}>{submitting ? "CALIBRATING…" : "START GAME  ▶"}</button>
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
          <div className="control-note">{control}</div>
          <div className={`world-chip ${worldToast ? "is-new" : ""}`}>{WORLDS[worldIndex].icon} {WORLDS[worldIndex].name}</div>
          <button className="sound-toggle" aria-label={muted ? "Turn sound on" : "Mute sound"} onClick={() => { const next = !muted; mutedRef.current = next; setMuted(next); if (next && "speechSynthesis" in window) window.speechSynthesis.cancel(); if (!next) playSfx("click"); }}>{muted ? "🔇" : "🔊"}</button>
          <div className="nearby-goodie" title={BASKETS[nearbyBasket].name}><span>NEXT</span><strong>{BASKETS[nearbyBasket].short}</strong><b>+{BASKETS[nearbyBasket].runs} Runs</b></div>
          <button className="mission-toggle" aria-expanded={showMissions} onClick={() => setShowMissions((current) => !current)}>MISSIONS <b>{missions.filter((mission) => mission.complete).length}/3</b></button>
          {showMissions && <div className="mission-panel" role="status">{missions.map((mission) => <div className={mission.complete ? "is-complete" : ""} key={mission.id}><span>{mission.complete ? "✓" : "○"}</span><p><strong>{mission.label}</strong><b>{Math.min(mission.progress, mission.target).toLocaleString("en-IN")} / {mission.target.toLocaleString("en-IN")}</b></p></div>)}</div>}
          {combo > 1 && <div className="combo-chip">🔥 {combo}× COMBO</div>}
          {score >= SCORE_GATES.villains && <div className="shoot-tip">🔥 TAP A VILLAIN TO SHOOT <b>{villainsDefeated} defeated</b></div>}
        </>}
        {celebration && <div className="celebration-toast" role="status">{celebration}</div>}
        {showTiltGuide && !falling && <div className="tilt-guide" role="status"><span className="tilt-phone" aria-hidden="true">📱</span><div><strong>TILT TO MOVE DOREMON</strong><p>Move your phone left or right</p></div></div>}
        <canvas ref={canvasRef} tabIndex={0} aria-label="Jumping game. Tilt your phone, drag, or use arrow keys to move. After 30,000 points, tap flying villains to shoot." onPointerDown={(event) => { setShowTiltGuide(false); if (shootAtVillain(event)) return; event.currentTarget.setPointerCapture(event.pointerId); pointerMove(event); }} onPointerMove={(event) => { if (event.buttons) pointerMove(event); }} onPointerUp={() => { gameRef.current.pointerX = null; gameRef.current.input = 0; }} />
        {toast && <div className="basket-toast" role="status"><i>{toast.basket.icon}</i><div className="toast-copy"><span>GOODIE COLLECTED{toast.multiplier > 1 ? ` · ${toast.multiplier}× COMBO` : ""}</span><strong>{toast.basket.name}</strong><b>+{toast.awarded} Runs</b><dl><div><dt>SUBSCRIPTION FEE</dt><dd>{toast.basket.fee} / year</dd></div></dl></div></div>}
      </section>}

      {screen === "gameover" && <section className="gameover-panel">
        <div className="storm-medal">☔</div><p>THE CLOUDS CAUGHT UP</p><h1>Great run,<br/><span>{name.split(" ")[0]}!</span></h1>
        <div className="final-stats"><div><span>Score</span><strong>{score.toLocaleString("en-IN")}</strong></div><div><span>Runs scored</span><strong>{runs}</strong></div><div><span>Reward points</span><strong>{rewardPoints(runs).toLocaleString("en-IN")}</strong></div><div><span>Goodies</span><strong>{totalGoodies}</strong></div></div>
        <p className="gameover-copy">{runs >= 900 ? "You cleared every slab. Each additional 50 Runs now unlocks another 5,000 points." : nextSlab ? `${nextSlab.runs - runs} more Runs to reach the next reward slab.` : "Keep climbing to unlock more campaign rewards."}</p>
        <p className={`result-status is-${resultStatus}`} role="status">{resultStatus === "sending" ? "Saving your score…" : resultStatus === "sent" ? "✓ Score recorded successfully" : resultStatus === "local" ? "Score saved on this device (form endpoint not connected)." : resultStatus === "error" ? "Score saved on this device; online submission could not be completed." : ""}</p>
        <button className="play-button" onClick={() => { playSfx("click"); resetGame(); setScreen("playing"); }}>PLAY AGAIN  ↻</button>
        <section className="mission-results" aria-label="Mission results"><div><span>BEST COMBO</span><strong>{bestCombo || 1}×</strong></div><div><span>MISSIONS</span><strong>{missions.filter((mission) => mission.complete).length} / 3</strong></div></section>
        <section className="achievement-collection" aria-label="Achievement collection"><h2>ACHIEVEMENTS</h2><div>{ACHIEVEMENTS.map((achievement) => <article className={achievements.includes(achievement.id) ? "is-unlocked" : ""} key={achievement.id}><i>{achievements.includes(achievement.id) ? achievement.icon : "?"}</i><span>{achievement.label}</span></article>)}</div></section>
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
