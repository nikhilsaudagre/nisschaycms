'use client';

import React from 'react';

export function ClinicWorkspaceSvg({ className = 'w-full h-auto' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 540 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Nisschay Clinic Workspace Illustration"
    >
      <defs>
        {/* Glow Filters */}
        <filter id="tealGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
        <filter id="softShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#000000" floodOpacity="0.35" />
        </filter>

        {/* Gradients */}
        <linearGradient id="screenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0E232E" />
          <stop offset="100%" stopColor="#08141A" />
        </linearGradient>

        <linearGradient id="accentTeal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#087F8C" />
          <stop offset="100%" stopColor="#0AA0B0" />
        </linearGradient>

        <linearGradient id="accentEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22A06B" />
          <stop offset="100%" stopColor="#2ECC71" />
        </linearGradient>

        <linearGradient id="accentCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4FA8DB" />
          <stop offset="100%" stopColor="#087F8C" />
        </linearGradient>

        <linearGradient id="cardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#17313D" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0C1B22" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Ambient background glow dots */}
      <circle cx="270" cy="140" r="120" fill="#087F8C" fillOpacity="0.12" filter="url(#tealGlow)" />
      <circle cx="430" cy="80" r="70" fill="#22A06B" fillOpacity="0.1" filter="url(#emeraldGlow)" />

      {/* Base Platform Table Grid */}
      <ellipse cx="270" cy="245" rx="230" ry="25" fill="#061217" fillOpacity="0.7" />
      <path d="M 60 240 L 480 240 L 440 245 L 100 245 Z" fill="#0E242E" opacity="0.6" />

      {/* 1. Main Clinical Monitor Center */}
      <g filter="url(#softShadow)">
        {/* Monitor Frame */}
        <rect x="135" y="35" width="270" height="175" rx="14" fill="url(#screenGrad)" stroke="#1F4352" strokeWidth="2" />
        
        {/* Monitor Top Bar */}
        <path d="M 136 49 C 136 41 142 36 150 36 L 390 36 C 398 36 404 41 404 49 L 404 60 L 136 60 Z" fill="#132B37" />
        <circle cx="152" cy="48" r="4" fill="#E74C3C" opacity="0.8" />
        <circle cx="164" cy="48" r="4" fill="#F1C40F" opacity="0.8" />
        <circle cx="176" cy="48" r="4" fill="#2ECC71" opacity="0.8" />

        {/* Live Status Pill in Title Bar */}
        <rect x="315" y="42" width="76" height="12" rx="6" fill="#087F8C" fillOpacity="0.3" stroke="#087F8C" strokeWidth="0.8" />
        <circle cx="323" cy="48" r="2.5" fill="#22A06B" className="animate-pulse" />
        <text x="330" y="51" fill="#A5D6A7" fontSize="7" fontWeight="bold" fontFamily="system-ui, sans-serif">OPD LIVE #18</text>

        {/* Inner Screen Content - Left Metric: Heart & Vitals */}
        <rect x="148" y="70" width="118" height="64" rx="8" fill="url(#cardGrad)" stroke="#1B3846" strokeWidth="1" />
        <text x="158" y="84" fill="#88A5B2" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif">ECG MONITOR • LEAD II</text>
        
        {/* ECG Waveform Pulse (Animated Look) */}
        <path
          d="M 158 110 L 175 110 L 180 102 L 185 118 L 190 88 L 195 125 L 200 110 L 210 110 L 215 104 L 220 115 L 224 95 L 228 118 L 232 110 L 254 110"
          fill="none"
          stroke="#22A06B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <text x="158" y="126" fill="#22A06B" fontSize="9" fontWeight="bold" fontFamily="monospace">74 BPM</text>
        <text x="210" y="126" fill="#4FA8DB" fontSize="8" fontWeight="bold" fontFamily="monospace">99% SpO2</text>

        {/* Inner Screen Content - Right Metric: Bed / Queue Command */}
        <rect x="274" y="70" width="118" height="64" rx="8" fill="url(#cardGrad)" stroke="#1B3846" strokeWidth="1" />
        <text x="284" y="84" fill="#88A5B2" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif">IPD OCCUPANCY</text>
        
        {/* Bed Status Visual Bars */}
        <rect x="284" y="94" width="98" height="6" rx="3" fill="#1B3846" />
        <rect x="284" y="94" width="76" height="6" rx="3" fill="url(#accentTeal)" />
        
        <rect x="284" y="108" width="98" height="6" rx="3" fill="#1B3846" />
        <rect x="284" y="108" width="88" height="6" rx="3" fill="url(#accentEmerald)" />
        <text x="284" y="126" fill="#FFFFFF" fontSize="8" fontWeight="bold" fontFamily="system-ui, sans-serif">42 / 50 Beds Active</text>

        {/* Lower Screen Section: Smart Indent & Rx Flow */}
        <rect x="148" y="142" width="244" height="56" rx="8" fill="#0A1820" stroke="#1B3846" strokeWidth="1" />
        <circle cx="164" cy="170" r="12" fill="#087F8C" fillOpacity="0.25" stroke="#087F8C" strokeWidth="1" />
        <path d="M 160 170 L 168 170 M 164 166 L 164 174" stroke="#4FA8DB" strokeWidth="2" strokeLinecap="round" />
        
        <text x="184" y="165" fill="#FFFFFF" fontSize="8.5" fontWeight="bold" fontFamily="system-ui, sans-serif">Dr. Rajesh Sharma • MD Internal Medicine</text>
        <text x="184" y="177" fill="#698A98" fontSize="7.5" fontFamily="system-ui, sans-serif">Active Session • Token #18 Ananya Verma (28y/F) • Smart Rx Dispensed</text>
        
        <rect x="340" y="160" width="44" height="18" rx="4" fill="#22A06B" fillOpacity="0.2" stroke="#22A06B" strokeWidth="1" />
        <text x="348" y="172" fill="#2ECC71" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif">Synced</text>

        {/* Monitor Stand Base */}
        <path d="M 252 210 L 288 210 L 296 238 L 244 238 Z" fill="#132B37" stroke="#1F4352" strokeWidth="1" />
        <rect x="230" y="236" width="80" height="7" rx="3" fill="#1F4352" />
      </g>

      {/* 2. Left Floating Card: Digital Rx Notepad */}
      <g filter="url(#softShadow)" transform="translate(30, 95) rotate(-4)">
        <rect x="0" y="0" width="105" height="130" rx="10" fill="#0F242F" stroke="#087F8C" strokeWidth="1.5" />
        {/* Clip Top */}
        <rect x="36" y="-6" width="33" height="12" rx="4" fill="#087F8C" />
        
        <text x="12" y="24" fill="#4FA8DB" fontSize="8" fontWeight="bold" fontFamily="system-ui, sans-serif">Rx PRESCRIPTION</text>
        <line x1="12" y1="32" x2="93" y2="32" stroke="#1F4352" strokeWidth="1" />

        {/* Prescription lines */}
        <rect x="12" y="40" width="70" height="5" rx="2.5" fill="#22A06B" fillOpacity="0.8" />
        <rect x="12" y="50" width="80" height="4" rx="2" fill="#275061" />
        <rect x="12" y="60" width="60" height="4" rx="2" fill="#275061" />

        <rect x="12" y="74" width="75" height="5" rx="2.5" fill="#087F8C" fillOpacity="0.8" />
        <rect x="12" y="84" width="82" height="4" rx="2" fill="#275061" />
        <rect x="12" y="94" width="50" height="4" rx="2" fill="#275061" />

        {/* Doctor Stamp Badge */}
        <circle cx="80" cy="112" r="10" fill="#22A06B" fillOpacity="0.2" stroke="#22A06B" strokeWidth="1" />
        <path d="M 76 112 L 79 115 L 85 109" stroke="#2ECC71" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* 3. Right Floating Card: Bed Stay & 12h Tariff Ledger */}
      <g filter="url(#softShadow)" transform="translate(405, 100) rotate(4)">
        <rect x="0" y="0" width="105" height="125" rx="10" fill="#0F242F" stroke="#22A06B" strokeWidth="1.5" />
        <rect x="10" y="12" width="85" height="18" rx="5" fill="#22A06B" fillOpacity="0.15" />
        <text x="16" y="24" fill="#2ECC71" fontSize="7.5" fontWeight="bold" fontFamily="system-ui, sans-serif">BED 108 • DELUXE</text>

        <text x="12" y="46" fill="#88A5B2" fontSize="7" fontFamily="system-ui, sans-serif">12h Tariff Sync:</text>
        <text x="12" y="58" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="monospace">₹ 3,500 / day</text>

        <line x1="12" y1="68" x2="93" y2="68" stroke="#1F4352" strokeWidth="1" />

        <text x="12" y="82" fill="#88A5B2" fontSize="7" fontFamily="system-ui, sans-serif">Doctor Rounds:</text>
        <rect x="12" y="88" width="55" height="5" rx="2.5" fill="#4FA8DB" fillOpacity="0.8" />

        <rect x="12" y="102" width="81" height="14" rx="4" fill="#087F8C" fillOpacity="0.3" stroke="#087F8C" strokeWidth="0.8" />
        <text x="18" y="112" fill="#4FA8DB" fontSize="7" fontWeight="bold" fontFamily="system-ui, sans-serif">Auto-Tariff Active</text>
      </g>

      {/* 4. Draped Stethoscope Illustration on Desk */}
      <g filter="url(#softShadow)">
        <path
          d="M 100 230 C 120 220, 140 245, 165 238 C 190 230, 205 242, 225 235"
          fill="none"
          stroke="#4FA8DB"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <circle cx="228" cy="235" r="7" fill="#132B37" stroke="#4FA8DB" strokeWidth="2.5" />
        <circle cx="228" cy="235" r="3.5" fill="#087F8C" />
      </g>
    </svg>
  );
}
