import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";

export const ResearchScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Title fade in (muted bg text) - slightly more visible
  const titleOpacity = interpolate(frame, [0, 25], [0, 0.1], {
    extrapolateRight: "clamp",
  });

  // Phone slides up from bottom - delayed so bg settles first
  const phoneProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 200 },
  });

  // Heart animation - Instagram style: pop in, hold, then scale up + fade out
  const heartProgress = spring({
    frame: frame - 55,
    fps,
    config: { damping: 12, stiffness: 150, mass: 0.5 },
  });

  // Pop in to full size, then grow slightly as it fades out
  const heartScale = interpolate(
    frame,
    [55, 65, 85, 105],
    [0, 1, 1, 1.3],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  ) * heartProgress;

  // Fade in quickly, hold, then fade out completely
  const heartOpacity = interpolate(frame, [55, 62, 85, 105], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Left metrics (likes & views) - after phone arrives
  const leftMetricsProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 200 },
  });

  // Right metrics (followers & retention)
  const rightMetricsProgress = spring({
    frame: frame - 50,
    fps,
    config: { damping: 200 },
  });

  // Retention graph draw
  const graphProgress = spring({
    frame: frame - 65,
    fps,
    config: { damping: 200 },
  });

  // Animated counters
  const likesCount = Math.floor(interpolate(leftMetricsProgress, [0, 1], [0, 45200], {
    extrapolateRight: "clamp",
  }));

  const viewsCount = Math.floor(interpolate(leftMetricsProgress, [0, 1], [0, 2500000], {
    extrapolateRight: "clamp",
  }));

  const followersCount = Math.floor(interpolate(rightMetricsProgress, [0, 1], [0, 252000], {
    extrapolateRight: "clamp",
  }));

  const formatCount = (n: number) => {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#2a1810",
        overflow: "hidden",
      }}
    >
      {/* Radial warm orange glow from bottom-left (softbox) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 90% 80% at 15% 90%, rgba(245, 158, 60, 0.45) 0%, rgba(217, 119, 40, 0.25) 25%, rgba(180, 80, 20, 0.12) 50%, transparent 75%)",
        }}
      />
      {/* Secondary subtle glow for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 60% 50% at 10% 95%, rgba(255, 180, 80, 0.2) 0%, transparent 60%)",
        }}
      />
      {/* Subtle vignette for depth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(15, 8, 4, 0.4) 100%)",
        }}
      />

      {/* Background muted "Research" text */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: 220,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: -4,
            textTransform: "uppercase",
          }}
        >
          Research
        </span>
      </div>

      {/* Main content layout - 3 columns */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          padding: "80px 80px 0 80px",
        }}
      >
        {/* Left column - Likes & Views */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 50,
            opacity: leftMetricsProgress,
            transform: `translateX(${interpolate(leftMetricsProgress, [0, 1], [-60, 0])}px)`,
            flex: "0 0 280px",
          }}
        >
          {/* Likes */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>
              Likes
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#ff6b8a", lineHeight: 1 }}>
              {formatCount(likesCount)}
            </div>
          </div>

          {/* Views */}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>
              Views
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, color: "rgba(255,255,255,0.9)", lineHeight: 1 }}>
              {formatCount(viewsCount)}
            </div>
          </div>
        </div>

        {/* Center - Phone */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            flex: "0 0 auto",
            height: "100%",
            position: "relative",
            opacity: phoneProgress,
            transform: `translateY(${interpolate(phoneProgress, [0, 1], [400, 60])}px)`,
          }}
        >
          <Img
            src={staticFile("frankgreefphone.png")}
            style={{
              height: "92%",
              width: "auto",
              objectFit: "contain",
            }}
          />

          {/* Instagram-style heart overlay on phone screen */}
          <div
            style={{
              position: "absolute",
              top: "42%",
              left: "50%",
              transform: `translate(-50%, -50%) scale(${heartScale})`,
              opacity: heartOpacity,
              pointerEvents: "none",
            }}
          >
            <svg width="120" height="120" viewBox="0 0 24 24" fill="none">
              {/* Glow behind heart */}
              <defs>
                <filter id="heartGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                fill="#ff2d55"
                filter="url(#heartGlow)"
              />
            </svg>
          </div>
        </div>

        {/* Right column - Followers & Retention */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 50,
            opacity: rightMetricsProgress,
            transform: `translateX(${interpolate(rightMetricsProgress, [0, 1], [60, 0])}px)`,
            flex: "0 0 280px",
          }}
        >
          {/* Followers */}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: 8, letterSpacing: 2, textTransform: "uppercase" }}>
              Followers
            </div>
            <div style={{ fontSize: 64, fontWeight: 800, color: "#89cff0", lineHeight: 1 }}>
              +{formatCount(followersCount)}
            </div>
          </div>

          {/* Retention Rate Graph */}
          <div style={{ textAlign: "left", width: "100%" }}>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.4)", fontWeight: 500, marginBottom: 16, letterSpacing: 2, textTransform: "uppercase" }}>
              Retention
            </div>
            <svg viewBox="0 0 280 120" style={{ width: 280 }}>
              {/* Subtle grid */}
              {[0, 40, 80].map((y) => (
                <line key={y} x1="0" y1={y + 10} x2="280" y2={y + 10} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              ))}

              {/* Filled area under curve */}
              <defs>
                <linearGradient id="retentionFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <polygon
                points="0,15 56,22 112,35 168,42 224,55 280,50 280,115 0,115"
                fill="url(#retentionFill)"
                opacity={graphProgress}
              />

              {/* Retention curve - typical retention dropoff then plateau */}
              <polyline
                points="0,15 56,22 112,35 168,42 224,55 280,50"
                fill="none"
                stroke="#22c55e"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="400"
                strokeDashoffset={interpolate(graphProgress, [0, 1], [400, 0])}
              />

              {/* Data points */}
              {[
                { x: 0, y: 15 },
                { x: 56, y: 22 },
                { x: 112, y: 35 },
                { x: 168, y: 42 },
                { x: 224, y: 55 },
                { x: 280, y: 50 },
              ].map((point, i) => (
                <circle
                  key={i}
                  cx={point.x}
                  cy={point.y}
                  r="5"
                  fill="#22c55e"
                  opacity={interpolate(graphProgress, [0.15 + i * 0.12, 0.35 + i * 0.12], [0, 1], {
                    extrapolateLeft: "clamp",
                    extrapolateRight: "clamp",
                  })}
                />
              ))}

              {/* Percentage labels */}
              <text x="0" y="8" fill="rgba(255,255,255,0.3)" fontSize="11" fontWeight="500">100%</text>
              <text x="280" y={45} fill="#22c55e" fontSize="14" fontWeight="700" textAnchor="end"
                opacity={interpolate(graphProgress, [0.7, 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
              >
                62%
              </text>
            </svg>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
