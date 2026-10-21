/**
 * LostLink Showcase Trailer Configuration
 * Minimalist, elegant design system for De La Salle Araneta University
 */

export const TRAILER_CONFIG = {
  // Video specifications (1920x1080 @ 30fps, 55.17 seconds = 1655 frames)
  fps: 30,
  width: 1920,
  height: 1080,
  totalFrames: 1655,

  // Scene Timings (in frames) - calibrated to actual neural voice lengths with human breathing room
  timings: {
    hook: { from: 0, duration: 185 },           // 0.00s - 6.17s (Problem Hook, voice ~4.4s)
    reveal: { from: 185, duration: 240 },       // 6.17s - 14.17s (Brand Reveal & Pitch, voice ~6.0s)
    feature1: { from: 425, duration: 265 },     // 14.17s - 23.00s (Campus Feed & FilterBar, voice ~6.8s)
    feature2: { from: 690, duration: 265 },     // 23.00s - 31.83s (Rapid Reporting & Custody, voice ~6.9s)
    feature3: { from: 955, duration: 240 },     // 31.83s - 39.83s (Disciplinary Office Console, voice ~6.1s)
    techStack: { from: 1195, duration: 280 },   // 39.83s - 49.17s (Modern Tech Stack, voice ~7.5s)
    outro: { from: 1475, duration: 180 },       // 49.17s - 55.17s (Outro & Made by Group 3, voice ~2.9s)
  },

  // Minimalist Palette (DLSAU LostLink Design Tokens)
  colors: {
    forest900: "#082e1a",       // Deep evergreen matte
    forest700: "#164f38",       // Primary brand forest
    forest600: "#17503a",       // Interactive state
    lime: "#d8ef8c",            // Electric accent lime
    limeGlow: "rgba(216, 239, 140, 0.25)",
    canvas: "#f5f1e6",          // Warm linen / cream
    surface: "#ffffff",
    cardTint: "#fcfbf8",
    sage700: "#413e39",
    sage600: "#818181",
    sage400: "#dadada",
    sage200: "#e3e9e0",
    line: "rgba(255, 255, 255, 0.12)",
    danger: "#9b2c1f",
  },

  // Typography
  fonts: {
    serif: "'Fraunces', Georgia, serif",
    sans: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  // Brand Identity
  system: {
    name: "LOSTLINK",
    displayName: "LostLink",
    institution: "De La Salle Araneta University",
    department: "Office of the Disciplinary Board",
    oneLinePitch: "De La Salle Araneta University's official lost and found platform.",
    tagline: "Reconnect with what matters on campus.",
    authorCredit: "Made by Group 3",
    teamCredit: "De La Salle Araneta University",
  },

  // Content for Scene 1: Hook (0s - 6.17s)
  hook: {
    eyebrow: "CAMPUS LOST & FOUND",
    mainText: "Lost something on campus?",
    subText: "Tracking it down shouldn't feel impossible.",
  },

  // Content for Scene 2: Reveal (6.17s - 14.17s)
  reveal: {
    eyebrow: "DE LA SALLE ARANETA UNIVERSITY",
    title: "LOSTLINK",
    pitch: "De La Salle Araneta University's official lost and found platform.",
    subPills: [
      "Real-Time Feed",
      "Photo Proof",
      "Claims Queue",
      "Custody Tracking",
    ],
  },

  // Content for Features (14.17s - 39.83s)
  features: {
    feature1: {
      stepNumber: "01",
      title: "Campus Discovery Feed",
      caption: "Filter instantly by Category, Campus Location, and Date",
      highlightLabel: "Dynamic FilterBar",
      highlightCoords: { top: "84%", left: "19%", width: "62%", height: "9%" },
      screenshot: "assets/screen_dashboard.png",
      fallbackImage: "assets/studdashboard.png",
    },
    feature2: {
      stepNumber: "02",
      title: "Rapid Item Reporting",
      caption: "Report lost or found items with photo proof and zone tagging",
      highlightLabel: "Instant Photo Upload",
      highlightCoords: { top: "50%", left: "37%", width: "26%", height: "24%" },
      screenshot: "assets/screen_report_modal.png",
      fallbackImage: "assets/createnewacc.png",
    },
    feature3: {
      stepNumber: "03",
      title: "Disciplinary Office Console",
      caption: "Live claims verification, intake custody, and audit log",
      highlightLabel: "Claims Verification Queue",
      highlightCoords: { top: "34%", left: "12%", width: "56%", height: "58%" },
      screenshot: "assets/screen_admin.png",
      fallbackImage: "assets/overview1admin.png",
    },
  },

  // Tech Stack (39.83s - 49.17s)
  techStack: [
    { name: "Astro 5", role: "Server-Side Rendering", color: "#FF5D01", icon: "🚀" },
    { name: "React 19", role: "Interactive Client State", color: "#61DAFB", icon: "⚛️" },
    { name: "Tailwind CSS v4", role: "Design Tokens", color: "#38BDF8", icon: "🎨" },
    { name: "Supabase", role: "PostgreSQL & Auth", color: "#3ECF8E", icon: "⚡" },
    { name: "Cloudflare", role: "Edge Workers Runtime", color: "#F38020", icon: "🌐" },
    { name: "Vitest & TS", role: "98 Passing Tests", color: "#FCC72B", icon: "🛡️" },
  ],

  // Outro (49.17s - 55.17s)
  outro: {
    heading: "Never lose track again.",
    cta: "dlsau.lostlink.edu.ph",
  },

  // Media & Voiceover Assets
  assets: {
    logoBadge: "assets/lostlink-badge.png",
    logoFull: "assets/lostlink-full-lockup.png",
    dlsauLogo: "assets/dlsau-logo.png",
    campusMap: "assets/campus-map.jpg",
    // Voiceovers for each scene (Realistic Neural Copilot voice)
    voiceHook: "assets/voice_scene1_hook.mp3",
    voiceReveal: "assets/voice_scene2_reveal.mp3",
    voiceFeature1: "assets/voice_scene3_feed.mp3",
    voiceFeature2: "assets/voice_scene4_report.mp3",
    voiceFeature3: "assets/voice_scene5_admin.mp3",
    voiceTech: "assets/voice_scene6_tech.mp3",
    voiceOutro: "assets/voice_scene7_outro.mp3",
    // Subtle ambient modern tech music track
    musicTrack: "assets/ambient_bed.wav",
  },
};
