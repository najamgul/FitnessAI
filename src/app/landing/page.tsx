'use client';

import React, { useRef, useState, useEffect, Suspense, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import Link from 'next/link';
import * as THREE from 'three';

/* ═══════════════════ CONTEXT-RELEVANT ANIMATED SVG ICONS ═══════════════════ */

// AI Brain with food scanning beam
const IconAI = () => (
  <motion.svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <motion.circle cx="32" cy="28" r="16" fill="#d1fae5" stroke="#059669" strokeWidth="2"
      animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 3, repeat: Infinity }} />
    <motion.path d="M24 24 Q28 18 32 24 Q36 18 40 24" stroke="#047857" strokeWidth="2" fill="none" strokeLinecap="round"
      animate={{ d: ["M24 24 Q28 18 32 24 Q36 18 40 24", "M24 26 Q28 20 32 26 Q36 20 40 26", "M24 24 Q28 18 32 24 Q36 18 40 24"] }}
      transition={{ duration: 2, repeat: Infinity }} />
    <motion.path d="M26 30 Q32 36 38 30" stroke="#047857" strokeWidth="2" fill="none" strokeLinecap="round" />
    {/* Scanning rays */}
    {[-20, 0, 20].map((angle, i) => (
      <motion.line key={i} x1="32" y1="44" x2={32 + Math.sin(angle * Math.PI / 180) * 16} y2={56}
        stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"
        animate={{ opacity: [0.2, 0.8, 0.2] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }} />
    ))}
    <motion.circle cx="32" cy="56" r="3" fill="#f59e0b" animate={{ scale: [0.8, 1.2, 0.8] }} transition={{ duration: 1.5, repeat: Infinity }} />
  </motion.svg>
);

// Plate with fork, knife, and portioned food
const IconMeal = () => (
  <motion.svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    {/* Plate */}
    <motion.ellipse cx="32" cy="36" rx="22" ry="18" fill="#ecfdf5" stroke="#059669" strokeWidth="2"
      animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3.5, repeat: Infinity }} />
    <ellipse cx="32" cy="36" rx="15" ry="12" fill="#d1fae5" strokeDasharray="3 3" stroke="#34d399" strokeWidth="1" />
    {/* Food portions */}
    <motion.circle cx="26" cy="33" r="5" fill="#34d399" animate={{ y: [0, -1.5, 0] }} transition={{ duration: 2, repeat: Infinity }} />
    <motion.circle cx="37" cy="31" r="4" fill="#fbbf24" animate={{ y: [0, -1.5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.3 }} />
    <motion.circle cx="32" cy="40" r="3.5" fill="#f87171" animate={{ y: [0, -1.5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.6 }} />
    {/* Fork */}
    <motion.path d="M10 18 L10 48 M8 18 L8 26 M10 18 L10 26 M12 18 L12 26" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round"
      animate={{ rotate: [-5, 0, -5] }} transition={{ duration: 4, repeat: Infinity }} style={{ transformOrigin: '10px 48px' }} />
    {/* Knife */}
    <motion.path d="M54 18 L54 48 M54 18 Q58 28 54 32" stroke="#6b7280" strokeWidth="1.5" strokeLinecap="round" fill="none"
      animate={{ rotate: [5, 0, 5] }} transition={{ duration: 4, repeat: Infinity }} style={{ transformOrigin: '54px 48px' }} />
    {/* Steam */}
    <motion.path d="M28 20 Q30 16 28 12" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" fill="none"
      animate={{ opacity: [0.3, 0.8, 0.3], y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }} />
    <motion.path d="M36 18 Q38 14 36 10" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" fill="none"
      animate={{ opacity: [0.3, 0.8, 0.3], y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.4 }} />
  </motion.svg>
);

// Water glass with fill level
const IconWater = () => (
  <motion.svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    {/* Glass outline */}
    <path d="M18 12 L14 52 Q14 56 32 56 Q50 56 50 52 L46 12 Z" fill="#ecfdf5" stroke="#059669" strokeWidth="2" />
    {/* Water fill — animated level */}
    <motion.path d="M16 30 L15 52 Q15 55 32 55 Q49 55 49 52 L48 30 Z" fill="#34d399" fillOpacity={0.4}
      animate={{ d: ["M16 34 L15 52 Q15 55 32 55 Q49 55 49 52 L48 34 Z", "M16 28 L15 52 Q15 55 32 55 Q49 55 49 52 L48 28 Z", "M16 34 L15 52 Q15 55 32 55 Q49 55 49 52 L48 34 Z"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
    {/* Wave */}
    <motion.path d="M16 30 Q24 26 32 30 Q40 34 48 30" stroke="#10b981" strokeWidth="1.5" fill="none"
      animate={{ d: ["M16 34 Q24 30 32 34 Q40 38 48 34", "M16 28 Q24 32 32 28 Q40 24 48 28", "M16 34 Q24 30 32 34 Q40 38 48 34"] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} />
    {/* Measurement marks */}
    {[22, 30, 38, 46].map((y, i) => (
      <line key={i} x1={46 - (y - 12) * 0.43} y1={y} x2={46 - (y - 12) * 0.43 + 4} y2={y} stroke="#a7f3d0" strokeWidth="1" />
    ))}
    {/* Droplets */}
    <motion.circle cx="32" cy="8" r="2.5" fill="#34d399" animate={{ y: [0, 10, 0], opacity: [1, 0, 1] }} transition={{ duration: 2, repeat: Infinity }} />
  </motion.svg>
);

// Health chart with heartbeat line
const IconChart = () => (
  <motion.svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    <rect x="8" y="8" width="48" height="48" rx="8" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
    {/* Bars */}
    {[{ x: 14, h: 20, c: '#34d399' }, { x: 23, h: 28, c: '#10b981' }, { x: 32, h: 18, c: '#fbbf24' }, { x: 41, h: 32, c: '#059669' }].map((b, i) => (
      <motion.rect key={i} x={b.x} width="7" rx="2" fill={b.c}
        initial={{ y: 50, height: 0 }} animate={{ y: 50 - b.h, height: b.h }}
        transition={{ duration: 1, delay: i * 0.15, repeat: Infinity, repeatDelay: 5 }} />
    ))}
    {/* Heartbeat / trend line */}
    <motion.polyline points="12,36 20,36 24,28 28,40 32,32 36,36 40,24 44,30 52,30" 
      stroke="#ef4444" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ duration: 2, delay: 0.8, repeat: Infinity, repeatDelay: 4.5 }} />
  </motion.svg>
);

// Chat bubble with nutrition question
const IconChat = () => (
  <motion.svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    {/* Main bubble */}
    <motion.rect x="6" y="8" width="38" height="28" rx="8" fill="#d1fae5" stroke="#059669" strokeWidth="2"
      animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity }} />
    <path d="M16 36 L12 46 L24 36" fill="#d1fae5" stroke="#059669" strokeWidth="2" strokeLinejoin="round" />
    {/* Text lines */}
    <motion.line x1="14" y1="18" x2="36" y2="18" stroke="#059669" strokeWidth="2" strokeLinecap="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 3 }} />
    <motion.line x1="14" y1="24" x2="30" y2="24" stroke="#34d399" strokeWidth="2" strokeLinecap="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.3, repeat: Infinity, repeatDelay: 3 }} />
    <motion.line x1="14" y1="30" x2="26" y2="30" stroke="#a7f3d0" strokeWidth="2" strokeLinecap="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, delay: 0.6, repeat: Infinity, repeatDelay: 3 }} />
    {/* Response bubble */}
    <motion.rect x="30" y="30" width="28" height="20" rx="6" fill="#fffbeb" stroke="#f59e0b" strokeWidth="1.5"
      animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, delay: 1.5, repeat: Infinity, repeatDelay: 1 }} />
    <motion.text x="44" y="43" textAnchor="middle" fill="#d97706" fontSize="8" fontWeight="bold"
      animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: 4, delay: 1.5, repeat: Infinity, repeatDelay: 1 }}>🥗</motion.text>
  </motion.svg>
);

// Doctor with clipboard and checkmark
const IconDoctor = () => (
  <motion.svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
    {/* Head */}
    <circle cx="32" cy="18" r="10" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
    <circle cx="29" cy="16" r="1.2" fill="#065f46" />
    <circle cx="35" cy="16" r="1.2" fill="#065f46" />
    <path d="M30 21 Q32 23 34 21" stroke="#065f46" strokeWidth="1" fill="none" strokeLinecap="round" />
    {/* Stethoscope */}
    <motion.path d="M24 24 Q20 30 22 36" stroke="#6b7280" strokeWidth="1.5" fill="none" strokeLinecap="round"
      animate={{ rotate: [-3, 3, -3] }} transition={{ duration: 3, repeat: Infinity }} style={{ transformOrigin: '24px 24px' }} />
    <circle cx="22" cy="37" r="2.5" fill="#6b7280" />
    {/* Body (coat) */}
    <path d="M20 30 Q20 28 32 28 Q44 28 44 30 L46 54 Q46 58 32 58 Q18 58 18 54 Z" fill="#d1fae5" stroke="#059669" strokeWidth="1.5" />
    <line x1="32" y1="28" x2="32" y2="58" stroke="#059669" strokeWidth="1" />
    {/* Verified badge */}
    <motion.circle cx="50" cy="12" r="8" fill="#059669"
      animate={{ scale: [0.9, 1.1, 0.9] }} transition={{ duration: 2, repeat: Infinity }} />
    <motion.path d="M46 12 L49 15 L54 9" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2.5 }} />
  </motion.svg>
);

// Hero: Nutrition bowl with floating ingredients
const HeroIllustration = ({ className = '' }: { className?: string }) => (
  <motion.svg viewBox="0 0 320 320" className={className} fill="none">
    {/* Glow */}
    <motion.circle cx="160" cy="160" r="120" fill="#ecfdf5" fillOpacity={0.5}
      animate={{ r: [115, 125, 115] }} transition={{ duration: 4, repeat: Infinity }} />
    
    {/* Bowl */}
    <ellipse cx="160" cy="220" rx="100" ry="28" fill="#065f46" />
    <path d="M60 200 Q60 248 160 258 Q260 248 260 200 Q260 190 160 190 Q60 190 60 200Z" fill="#059669" />
    <ellipse cx="160" cy="200" rx="100" ry="24" fill="#d1fae5" stroke="#059669" strokeWidth="2" />

    {/* Floating food — contextual nutrition items */}
    {/* Avocado */}
    <motion.g animate={{ y: [0, -12, 0] }} transition={{ duration: 3, repeat: Infinity }}>
      <ellipse cx="120" cy="150" rx="18" ry="14" fill="#34d399" />
      <circle cx="120" cy="152" r="6" fill="#065f46" />
    </motion.g>
    {/* Orange/citrus  */}
    <motion.g animate={{ y: [0, -10, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}>
      <circle cx="175" cy="135" r="16" fill="#fbbf24" />
      <path d="M175 125 L175 145 M167 135 L183 135" stroke="#f59e0b" strokeWidth="1.5" />
      <circle cx="175" cy="125" r="2" fill="#059669" />
    </motion.g>
    {/* Broccoli */}
    <motion.g animate={{ y: [0, -8, 0] }} transition={{ duration: 2.8, repeat: Infinity, delay: 1 }}>
      <circle cx="210" cy="155" r="8" fill="#10b981" />
      <circle cx="202" cy="158" r="6" fill="#34d399" />
      <circle cx="216" cy="160" r="5" fill="#6ee7b7" />
      <rect x="207" y="160" width="4" height="12" rx="2" fill="#059669" />
    </motion.g>
    {/* Apple */}
    <motion.g animate={{ y: [0, -14, 0] }} transition={{ duration: 3.2, repeat: Infinity, delay: 0.8 }}>
      <circle cx="135" cy="115" r="12" fill="#ef4444" />
      <path d="M135 103 L137 108" stroke="#059669" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="139" cy="107" rx="4" ry="2" fill="#34d399" />
    </motion.g>
    {/* Egg */}
    <motion.g animate={{ y: [0, -6, 0] }} transition={{ duration: 2.5, repeat: Infinity, delay: 1.3 }}>
      <ellipse cx="195" cy="110" rx="10" ry="13" fill="#fef3c7" stroke="#fbbf24" strokeWidth="1.5" />
    </motion.g>

    {/* Sparkles */}
    {[{ x: 90, y: 120 }, { x: 240, y: 130 }, { x: 160, y: 85 }, { x: 110, y: 95 }, { x: 220, y: 100 }].map((s, i) => (
      <motion.g key={i} animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}>
        <line x1={s.x - 4} y1={s.y} x2={s.x + 4} y2={s.y} stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
        <line x1={s.x} y1={s.y - 4} x2={s.x} y2={s.y + 4} stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      </motion.g>
    ))}

    {/* Nutrient particles */}
    {[{ x: 100, y: 170, c: '#10b981' }, { x: 220, y: 165, c: '#fbbf24' }, { x: 150, y: 180, c: '#34d399' }].map((p, i) => (
      <motion.circle key={i} cx={p.x} cy={p.y} r="3" fill={p.c}
        animate={{ y: [0, -30, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6 }} />
    ))}
  </motion.svg>
);

// DNA helix for science section
const ScienceIllustration = ({ className = '' }: { className?: string }) => (
  <motion.svg viewBox="0 0 200 200" className={className} fill="none">
    {/* DNA Helix */}
    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
      <React.Fragment key={i}>
        <motion.circle
          cx={60 + Math.sin(i * 0.8) * 30}
          cy={20 + i * 22}
          r={5}
          fill="#059669"
          animate={{ cx: [60 + Math.sin(i * 0.8) * 30, 60 + Math.sin(i * 0.8 + Math.PI) * 30, 60 + Math.sin(i * 0.8) * 30] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
        />
        <motion.circle
          cx={140 - Math.sin(i * 0.8) * 30}
          cy={20 + i * 22}
          r={5}
          fill="#fbbf24"
          animate={{ cx: [140 - Math.sin(i * 0.8) * 30, 140 - Math.sin(i * 0.8 + Math.PI) * 30, 140 - Math.sin(i * 0.8) * 30] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
        />
        <motion.line
          x1={60 + Math.sin(i * 0.8) * 30} y1={20 + i * 22}
          x2={140 - Math.sin(i * 0.8) * 30} y2={20 + i * 22}
          stroke="#a7f3d0" strokeWidth={2} strokeOpacity={0.5}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
        />
      </React.Fragment>
    ))}
  </motion.svg>
);

/* ═══════════════════ 3D BACKGROUND — SUBTLE NUTRIENT PARTICLES ═══════════════════ */

function NutrientParticles() {
  const pointsRef = useRef<THREE.Points>(null!);
  const count = 400;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.008;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.003) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        {/* @ts-ignore — R3F/TS type mismatch for attach shorthand */}
        <bufferAttribute attach="attributes-position" count={count} array={positions} itemSize={3} args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#34d399" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function NutritionScene({ scrollProgress }: { scrollProgress: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.y = scrollProgress * -3;
    }
  });
  return (
    <>
      <ambientLight intensity={0.3} color="#ecfdf5" />
      <group ref={groupRef}>
        <NutrientParticles />
      </group>
    </>
  );
}

/* ═══════════════════ UI COMPONENTS ═══════════════════ */

const OrganicButton = ({ children, href, variant = 'primary' }: { children: React.ReactNode; href: string; variant?: 'primary' | 'secondary' }) => (
  <Link href={href}>
    <motion.div
      className={`relative inline-flex items-center justify-center px-7 py-3.5 text-base font-semibold rounded-full cursor-pointer transition-all duration-300 ${
        variant === 'primary'
          ? 'bg-emerald-700 text-white shadow-lg shadow-emerald-700/25 hover:bg-emerald-800'
          : 'bg-white/80 text-emerald-800 border border-emerald-200 backdrop-blur-sm hover:bg-emerald-50'
      }`}
      whileHover={{ scale: 1.04, y: -2 }}
      whileTap={{ scale: 0.97 }}
    >{children}</motion.div>
  </Link>
);

const ICONS: Record<string, React.FC> = { ai: IconAI, meal: IconMeal, water: IconWater, chart: IconChart, chat: IconChat, doctor: IconDoctor };

const FeatureCard = ({ iconKey, title, description, index }: { iconKey: string; title: string; description: string; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const Icon = ICONS[iconKey];
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 50 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.7, delay: index * 0.12 }} whileHover={{ y: -6 }} className="group">
      <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-3xl p-7 h-full transition-all duration-300 group-hover:shadow-xl group-hover:shadow-emerald-100/50 group-hover:border-emerald-300">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5 group-hover:bg-emerald-100 transition-colors p-2">
          {Icon && <Icon />}
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
      </div>
    </motion.div>
  );
};

const StatCounter = ({ value, suffix = '', label, index }: { value: number; suffix?: string; label: string; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (isInView) {
      const duration = 2000, startTime = Date.now();
      const timer = setInterval(() => {
        const p = Math.min((Date.now() - startTime) / duration, 1);
        setCount(Math.round((1 - Math.pow(1 - p, 3)) * value));
        if (p >= 1) clearInterval(timer);
      }, 16);
      return () => clearInterval(timer);
    }
  }, [isInView, value]);
  return (
    <motion.div ref={ref} initial={{ opacity: 0, scale: 0.8 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.5, delay: index * 0.1 }} className="text-center">
      <div className="text-4xl md:text-5xl font-bold text-emerald-700">{count}{suffix}</div>
      <div className="text-gray-400 text-xs mt-1.5 uppercase tracking-widest font-medium">{label}</div>
    </motion.div>
  );
};

const StepCard = ({ number, title, description, index }: { number: string; title: string; description: string; index: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, x: index % 2 === 0 ? -60 : 60 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.7, delay: index * 0.15 }} className="flex items-start gap-5 group">
      <motion.div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-emerald-700 flex items-center justify-center text-xl font-bold text-white shadow-md shadow-emerald-700/20" whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
        {number}
      </motion.div>
      <div className="pt-1 flex-1">
        <h4 className="text-lg font-bold text-gray-900 mb-1.5">{title}</h4>
        <p className="text-gray-500 leading-relaxed text-sm">{description}</p>
      </div>
    </motion.div>
  );
};

/* ═══════════════════ MAIN PAGE ═══════════════════ */

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 50, damping: 20 });
  const [scrollValue, setScrollValue] = useState(0);
  useEffect(() => smoothProgress.on('change', (v) => setScrollValue(v)), [smoothProgress]);

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -120]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const features = [
    { iconKey: 'ai', title: 'AI-Powered Analysis', description: 'Azai analyzes your body metrics, lifestyle, and goals to create the perfect nutrition blueprint unique to you.' },
    { iconKey: 'meal', title: 'Smart Meal Planning', description: 'Get 7-slot daily meal plans with precise quantities, timing, and calorie tracking — all personalized to your palate.' },
    { iconKey: 'water', title: 'Hydration Intelligence', description: 'Smart water tracking that adapts to your activity level, weather, and body weight throughout the day.' },
    { iconKey: 'chart', title: 'Progress Insights', description: 'Track weight, energy, sleep, and mood with AI predictions and pattern recognition.' },
    { iconKey: 'chat', title: 'Chat with Azai', description: 'Ask nutrition questions anytime. Azai draws from a curated knowledge base tailored to your region.' },
    { iconKey: 'doctor', title: 'Expert Verified', description: 'Every AI-generated plan is reviewed and approved by certified nutritionists before delivery.' },
  ];

  return (
    <div ref={containerRef} className="relative overflow-x-hidden" style={{ background: 'linear-gradient(180deg, #ecfdf5 0%, #f0fdf4 15%, #fffbeb 40%, #fefce8 60%, #f0fdf4 80%, #ecfdf5 100%)' }}>
      {/* Subtle particle background */}
      <div className="fixed inset-0 z-0 opacity-40">
        <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 1.5]}>
          <Suspense fallback={null}><NutritionScene scrollProgress={scrollValue} /></Suspense>
        </Canvas>
      </div>

      {/* Scroll bar */}
      <motion.div className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-600 to-amber-400 z-50 origin-left" style={{ scaleX: scrollYProgress }} />

      {/* Navigation */}
      <motion.nav className="fixed top-0 left-0 right-0 z-40 px-4 sm:px-6 py-3" initial={{ y: -100 }} animate={{ y: 0 }} transition={{ duration: 0.8, delay: 0.2 }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-white/80 backdrop-blur-xl border border-emerald-100 rounded-full px-5 py-2.5 shadow-sm">
          <motion.div className="flex items-center gap-2.5" whileHover={{ scale: 1.03 }}>
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center"><span className="text-white font-bold text-sm">A</span></div>
            <span className="text-gray-900 font-bold text-lg tracking-tight hidden sm:inline">AZIAF</span>
          </motion.div>
          <div className="hidden md:flex items-center gap-7">
            <a href="#features" className="text-gray-500 hover:text-emerald-700 transition-colors text-sm font-medium">Features</a>
            <a href="#how-it-works" className="text-gray-500 hover:text-emerald-700 transition-colors text-sm font-medium">How It Works</a>
            <a href="#results" className="text-gray-500 hover:text-emerald-700 transition-colors text-sm font-medium">Results</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-500 hover:text-emerald-700 transition-colors text-sm font-medium hidden sm:inline">Login</Link>
            <Link href="/signup">
              <motion.div className="px-5 py-2 bg-emerald-700 text-white text-sm font-semibold rounded-full shadow-sm shadow-emerald-700/20" whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>Join Us</motion.div>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero */}
      <motion.section className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6" style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.5 }} className="mb-5">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Powered by Azai Intelligence
              </span>
            </motion.div>
            <motion.h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.05] mb-6" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.7 }}>
              <span className="block">Nutrition for a</span>
              <span className="block mt-1 bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">Vibrant Life</span>
            </motion.h1>
            <motion.p className="text-base sm:text-lg text-gray-500 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed" initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, delay: 0.9 }}>
              Discover AI-crafted meal plans, expert-verified nutrition, and mindful eating guides — personalized to your body.
            </motion.p>
            <motion.div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 1.1 }}>
              <OrganicButton href="/signup" variant="primary">Start Your Journey</OrganicButton>
              <OrganicButton href="#features" variant="secondary">Explore Features</OrganicButton>
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.85, x: 50 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: 1, delay: 0.8 }} className="hidden lg:flex justify-center items-center">
            <HeroIllustration className="w-full max-w-lg" />
          </motion.div>
        </div>
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 10, 0] }} transition={{ duration: 2.5, repeat: Infinity }}>
          <div className="w-5 h-9 rounded-full border-2 border-emerald-300 flex items-start justify-center p-1.5">
            <motion.div className="w-1 h-1 rounded-full bg-emerald-500" animate={{ y: [0, 14, 0] }} transition={{ duration: 2.5, repeat: Infinity }} />
          </div>
        </motion.div>
      </motion.section>

      {/* Stats */}
      <section id="results" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/70 backdrop-blur-xl border border-emerald-100 rounded-[2rem] p-8 sm:p-10 shadow-sm">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              <StatCounter value={5000} suffix="+" label="Active Users" index={0} />
              <StatCounter value={98} suffix="%" label="Satisfaction" index={1} />
              <StatCounter value={15000} suffix="+" label="Plans Created" index={2} />
              <StatCounter value={12} suffix="+" label="Expert Dietitians" index={3} />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <span className="text-emerald-600 text-xs uppercase tracking-[0.25em] font-medium">What We Offer</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-4">
              Intelligent Nutrition, <br className="hidden sm:block" /><span className="text-emerald-600">Simplified.</span>
            </h2>
            <p className="text-gray-400 text-base max-w-lg mx-auto">Everything you need to transform your diet, powered by AI that understands your body.</p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => <FeatureCard key={i} {...f} index={i} />)}
          </div>
        </div>
      </section>

      {/* Science */}
      <section className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, x: -50 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <span className="text-emerald-600 text-xs uppercase tracking-[0.25em] font-medium">The Science</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-5">Built on Your <br /><span className="text-emerald-600">Unique Biology</span></h2>
            <p className="text-gray-500 text-base leading-relaxed mb-8">Azai analyzes your BMI, activity level, medical history, geographic location, and dietary preferences to generate plans that are as unique as your DNA.</p>
            <div className="space-y-3.5">
              {['Personalized macro & micro nutrient targets', 'Region-specific ingredient recommendations', 'Adaptive calorie redistribution', 'Real-time plan adjustments'].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -15 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                  <span className="text-gray-600 text-sm">{item}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
            className="bg-white/60 backdrop-blur-sm border border-emerald-100 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-center mb-5"><ScienceIllustration className="w-48 h-48" /></div>
            <div className="text-center space-y-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Azai Intelligence Engine</h3>
                <p className="text-gray-500 text-sm leading-relaxed">Our proprietary AI processes 40+ health parameters for medical-grade precision.</p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-emerald-100">
                {[{ v: '40+', l: 'Parameters' }, { v: '3s', l: 'Gen Time' }, { v: '99%', l: 'Accuracy' }].map((s, i) => (
                  <div key={i} className="text-center">
                    <div className="text-2xl font-bold text-emerald-700">{s.v}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative z-10 py-20 sm:py-28 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="text-center mb-14">
            <span className="text-emerald-600 text-xs uppercase tracking-[0.25em] font-medium">Your Journey</span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-4">Four Steps to <br /><span className="text-emerald-600">Better Health</span></h2>
          </motion.div>
          <div className="space-y-10">
            <StepCard number="01" title="Tell Us About You" description="Quick onboarding with your health metrics, dietary preferences, medical history, and goals." index={0} />
            <StepCard number="02" title="Azai Crafts Your Plan" description="Our AI creates a personalized meal plan with precise portions, timing, and calorie targets." index={1} />
            <StepCard number="03" title="Expert Review" description="A certified nutritionist reviews and fine-tunes your plan for safety and effectiveness." index={2} />
            <StepCard number="04" title="Track & Transform" description="Follow your plan with real-time tracking, hydration reminders, and insights from Azai." index={3} />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 sm:py-32 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="bg-gradient-to-br from-emerald-700 to-emerald-800 rounded-[2.5rem] p-10 sm:p-16 shadow-xl shadow-emerald-900/20">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4">Ready to Transform<br />Your Nutrition?</h2>
              <p className="text-emerald-200 text-base max-w-md mx-auto mb-8">Join thousands who have already embraced a healthier, more mindful way of eating.</p>
              <Link href="/signup">
                <motion.div className="inline-flex items-center justify-center px-8 py-3.5 bg-white text-emerald-800 text-base font-semibold rounded-full shadow-lg cursor-pointer" whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                  Create Your Plan →
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-emerald-100 py-8 px-4 sm:px-6 bg-white/40 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-700 flex items-center justify-center"><span className="text-white font-bold text-xs">A</span></div>
            <span className="text-gray-400 text-sm">© 2026 AZIAF. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-5 text-gray-400 text-sm">
            <Link href="/login" className="hover:text-emerald-700 transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-emerald-700 transition-colors">Sign Up</Link>
            <span className="text-gray-300">·</span>
            <span>Powered by Azai</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
