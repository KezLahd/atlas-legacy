import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { colors } from "../shared/colors";
import { AtlasIconLogo } from "../shared/AtlasLogo";

export const AnalyticsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Title ────────────────────────────────────────────────────
  const titleOpacity = interpolate(frame, [0, 25], [0, 0.15], {
    extrapolateRight: "clamp",
  });

  // ── Dock-style app entrance ──────────────────────────────────
  const layoutProgress = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200 },
  });

  // Bounce scale (low damping for overshoot like macOS dock)
  const dockScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.8 },
  });

  // Slide up from bottom
  const dockY = spring({
    frame: frame - 8,
    fps,
    config: { damping: 16, stiffness: 100, mass: 0.9 },
  });

  // ── Videos data ──────────────────────────────────────────────
  const THUMB_BASE =
    "https://vmyasmlyddbtaestuwua.supabase.co/storage/v1/object/public/thumbnails";

  const videos = [
    {
      title: "5 Tips for Creators",
      status: "published" as const,
      views: "892K",
      likes: "127K",
      change: "+12%",
      color: colors.blue,
      spark: [30, 45, 42, 60, 55, 72, 89],
      platform: "instagram" as const,
      thumbnail: `${THUMB_BASE}/avayuergens.JPEG`,
    },
    {
      title: "Behind the Scenes",
      status: "published" as const,
      views: "1.2M",
      likes: "184K",
      change: "+8%",
      color: colors.pink,
      spark: [50, 55, 48, 65, 70, 62, 68],
      platform: "tiktok" as const,
      thumbnail: `${THUMB_BASE}/frankgreef.JPEG`,
    },
    {
      title: "Product Launch",
      status: "viral" as const,
      views: "2.4M",
      likes: "312K",
      change: "+156%",
      color: colors.purple,
      spark: [20, 25, 30, 45, 78, 95, 100],
      platform: "tiktok" as const,
      thumbnail: `${THUMB_BASE}/kieranjxn.JPEG`,
    },
    {
      title: "Q&A Session",
      status: "scheduled" as const,
      views: "",
      likes: "",
      change: "",
      color: colors.dubaiChocolate,
      spark: [] as number[],
      platform: "instagram" as const,
      thumbnail: `${THUMB_BASE}/tahliakennedy.JPEG`,
    },
  ];

  // ── Graph data ───────────────────────────────────────────────
  const graphData = [120, 180, 165, 240, 310, 420, 580];
  const graphMax = 620;
  const graphW = 360;
  const graphH = 160;

  const graphProgress = spring({
    frame: frame - 30,
    fps,
    config: { damping: 200 },
  });

  const graphPoints = graphData.map((val, i) => ({
    x: (i / (graphData.length - 1)) * graphW,
    y: graphH - (val / graphMax) * graphH,
  }));
  const graphLinePath = graphPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  const graphFillPath = `${graphLinePath} L ${graphW} ${graphH} L 0 ${graphH} Z`;

  // ── Graph cursor animation ──────────────────────────────────
  const cursorStart = 75;
  const cursorEnd = 165;

  const cursorOpacity = interpolate(
    frame,
    [cursorStart, cursorStart + 10, cursorEnd - 8, cursorEnd],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const cursorProgress = interpolate(
    frame,
    [cursorStart + 8, cursorEnd - 8],
    [0, 6],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const floorIdx = Math.min(Math.floor(cursorProgress), 5);
  const ceilIdx = Math.min(floorIdx + 1, 6);
  const t = cursorProgress - floorIdx;
  const smoothT = t * t * (3 - 2 * t);

  const cursorX =
    graphPoints[floorIdx].x +
    (graphPoints[ceilIdx].x - graphPoints[floorIdx].x) * smoothT;
  const cursorY =
    graphPoints[floorIdx].y +
    (graphPoints[ceilIdx].y - graphPoints[floorIdx].y) * smoothT;

  const nearestIdx = Math.min(Math.round(cursorProgress), 6);
  const distToNearest = Math.abs(cursorProgress - nearestIdx);
  const tooltipOpacity = interpolate(distToNearest, [0, 0.25], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Close-button cursor & window close ─────────────────────
  const closeCursorStart = 163;
  const closeCursorArrival = 182;
  const closeClickFrame = 187;
  const closeAnimEnd = 200;

  const closeCursorOpacity = interpolate(
    frame,
    [closeCursorStart, closeCursorStart + 4, closeCursorArrival + 2, closeClickFrame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const closeCursorT = interpolate(
    frame,
    [closeCursorStart + 3, closeCursorArrival],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const smoothCloseT = closeCursorT * closeCursorT * (3 - 2 * closeCursorT);

  // From roughly graph area to close button (in window coordinates)
  const closeCursorX = 620 + (22 - 620) * smoothCloseT;
  const closeCursorY = 160 + (19 - 160) * smoothCloseT;

  // Red button hover highlight
  const redButtonHover = frame >= closeCursorArrival - 3 && frame < closeClickFrame;

  // Window close animation
  const closeScale = interpolate(
    frame,
    [closeClickFrame, closeAnimEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const closeOpacity = interpolate(
    frame,
    [closeClickFrame, closeAnimEnd],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Logo behind window (revealed when window closes)
  const logoOpacity = interpolate(
    frame,
    [closeClickFrame, closeClickFrame + 12],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // ── End zoom: logo scales up to match TitleScene size ──────
  const zoomStart = closeAnimEnd + 5;
  const zoomEnd = 235;

  const logoScale = interpolate(
    frame,
    [zoomStart, zoomEnd],
    [1, 2.4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x: number) => x * x }
  );

  const bgZoom = interpolate(
    frame,
    [zoomStart, zoomEnd],
    [1, 1.6],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x: number) => x * x }
  );

  // Background fades to TitleScene bg color (#f5f1e8) during zoom
  const bgOverlayOpacity = interpolate(
    frame,
    [zoomStart, zoomEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: (x: number) => x * x }
  );

  // ── Summary stats ────────────────────────────────────────────
  const summaryStats = [
    { label: "Total Views", value: "4.5M", color: colors.blue },
    { label: "Engagement", value: "14.2%", color: colors.green },
    { label: "Growth", value: "+58%", color: colors.orange },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#000", overflow: "hidden" }}>
      {/* ── Background image ──────────────────────────────────────── */}
      <Img
        src={staticFile("laptopscreen.png")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${bgZoom})`,
          transformOrigin: "center center",
        }}
      />

      {/* ── Color overlay fading to TitleScene bg ─────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "#f5f1e8",
          opacity: bgOverlayOpacity,
        }}
      />

      {/* ── Muted "ANALYTICS" background text ──────────────────── */}
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
          Analytics
        </span>
      </div>

      {/* ── Atlas logo (revealed when window closes, scales up) ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${logoScale})`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          opacity: logoOpacity,
        }}
      >
        <AtlasIconLogo size={50} />
        <div style={{ fontSize: 50, fontWeight: "bold", display: "flex" }}>
          <span style={{ color: colors.blue }}>at</span>
          <span style={{ color: colors.primary }}>las</span>
        </div>
      </div>

      {/* ── Mac app window container (dock-style entrance) ─────── */}
      <div
        style={{
          position: "absolute",
          top: "49%",
          left: "50.5%",
          transform: `translate(-50%, calc(-50% + ${interpolate(dockY, [0, 1], [280, 0])}px)) scale(${interpolate(dockScale, [0, 1], [0.3, 1.02]) * closeScale})`,
          transformOrigin: frame >= closeClickFrame ? "22px 19px" : "center center",
          width: 860,
          opacity: interpolate(layoutProgress, [0, 0.4], [0, 1], {
            extrapolateRight: "clamp",
          }) * closeOpacity,
        }}
      >
        {/* ── Title bar ───────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: "#f6f6f6",
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            borderBottom: "1px solid rgba(0,0,0,0.08)",
            padding: "0 16px",
            height: 38,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {/* Traffic light buttons */}
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#ff5f57",
              boxShadow: redButtonHover ? "0 0 8px rgba(255,95,87,0.6)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {redButtonHover && (
              <svg width="6" height="6" viewBox="0 0 6 6">
                <line x1="0.5" y1="0.5" x2="5.5" y2="5.5" stroke="rgba(80,0,0,0.7)" strokeWidth="1.2" strokeLinecap="round" />
                <line x1="5.5" y1="0.5" x2="0.5" y2="5.5" stroke="rgba(80,0,0,0.7)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
          </div>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#febc2e",
            }}
          />
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "#28c840",
            }}
          />
          <div
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 600,
              color: "rgba(0,0,0,0.45)",
              marginRight: 52,
            }}
          >
            Atlas — Analytics
          </div>
        </div>

        {/* ── Window body ─────────────────────────────────────────── */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            border: "1px solid rgba(0,0,0,0.1)",
            borderTop: "none",
            padding: "20px 24px",
            display: "flex",
            gap: 22,
            boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          }}
        >
        {/* ── Left column: Video cards ──────────────────────────── */}
        <div
          style={{
            flex: "0 0 420",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {videos.map((video, index) => {
            const cardProgress = spring({
              frame: frame - (15 + index * 8),
              fps,
              config: { damping: 200 },
            });

            const statusColor =
              video.status === "viral"
                ? colors.pinkDark
                : video.status === "published"
                  ? colors.green
                  : colors.blueDark;

            const statusLabel =
              video.status === "viral"
                ? "Viral"
                : video.status === "published"
                  ? "Published"
                  : "Scheduled";

            // Mini sparkline
            const sparkW = 50;
            const sparkH = 20;
            const sparkPoints =
              video.spark.length > 0
                ? video.spark
                    .map((v, si) => {
                      const sx =
                        (si / (video.spark.length - 1)) * sparkW;
                      const sy = sparkH - (v / 100) * sparkH;
                      return `${sx},${sy}`;
                    })
                    .join(" ")
                : "";

            return (
              <div
                key={index}
                style={{
                  opacity: cardProgress,
                  transform: `translateX(${interpolate(cardProgress, [0, 1], [-30, 0])}px)`,
                  backgroundColor:
                    video.status === "viral"
                      ? "rgba(168,85,247,0.06)"
                      : "rgba(0,0,0,0.03)",
                  border:
                    video.status === "viral"
                      ? "1px solid rgba(168,85,247,0.2)"
                      : "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow:
                    video.status === "viral"
                      ? "0 0 16px rgba(168,85,247,0.08)"
                      : "none",
                }}
              >
                {/* Portrait Thumbnail */}
                <div
                  style={{
                    width: 46,
                    height: 66,
                    borderRadius: 6,
                    flexShrink: 0,
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.1)",
                  }}
                >
                  <Img
                    src={video.thumbnail}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  {/* Platform icon badge */}
                  <div
                    style={{
                      position: "absolute",
                      bottom: 2,
                      right: 2,
                      width: 15,
                      height: 15,
                      borderRadius: 3,
                      backgroundColor: "rgba(0,0,0,0.65)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {video.platform === "instagram" ? (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 48 48"
                        fill="none"
                      >
                        <rect
                          x="11"
                          y="11"
                          width="26"
                          height="26"
                          rx="7"
                          stroke="white"
                          strokeWidth="3"
                          fill="none"
                        />
                        <circle
                          cx="24"
                          cy="24"
                          r="6"
                          stroke="white"
                          strokeWidth="3"
                          fill="none"
                        />
                        <circle cx="32" cy="16" r="1.5" fill="white" />
                      </svg>
                    ) : (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 48 48"
                        fill="none"
                      >
                        <path
                          d="M28.034,19.63c1.576,1.126,3.507,1.788,5.592,1.788v-3.157c-1.164-0.248-2.194-0.856-2.969-1.701c-1.326-0.827-2.281-2.191-2.561-3.788h-2.923v16.018c-0.007,1.867-1.523,3.379-3.393,3.379c-1.102,0-2.081-0.525-2.701-1.338c-1.107-0.558-1.866-1.705-1.866-3.029c0-1.873,1.519-3.391,3.393-3.391c0.359,0,0.705,0.056,1.03,0.159V21.38c-4.024,0.083-7.26,3.369-7.26,7.411c0,2.018,0.806,3.847,2.114,5.183c1.18,0.792,2.601,1.254,4.129,1.254c4.096,0,7.417-3.319,7.417-7.413L28.034,19.63z"
                          fill="white"
                        />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "rgba(0,0,0,0.85)",
                      marginBottom: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {video.title}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {/* Status badge */}
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: statusColor,
                        backgroundColor: `${statusColor}18`,
                        padding: "2px 6px",
                        borderRadius: 3,
                        letterSpacing: 0.5,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                    >
                      {video.status === "viral" && (
                        <span style={{ fontSize: 9 }}>🔥</span>
                      )}
                      {statusLabel}
                    </span>
                    {video.views && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(0,0,0,0.45)",
                        }}
                      >
                        {video.views} views
                      </span>
                    )}
                    {video.likes && (
                      <span
                        style={{
                          fontSize: 10,
                          color: "rgba(0,0,0,0.3)",
                        }}
                      >
                        · {video.likes} likes
                      </span>
                    )}
                  </div>
                </div>

                {/* Sparkline + change */}
                {video.spark.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 3,
                      flexShrink: 0,
                    }}
                  >
                    <svg
                      width={sparkW}
                      height={sparkH}
                      viewBox={`0 0 ${sparkW} ${sparkH}`}
                    >
                      <polyline
                        points={sparkPoints}
                        fill="none"
                        stroke={
                          video.status === "viral"
                            ? colors.purple
                            : colors.green
                        }
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {video.change && (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color:
                            video.status === "viral"
                              ? colors.purple
                              : colors.green,
                        }}
                      >
                        {video.change}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Right column: Graph + Summary ─────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Views graph */}
          <div
            style={{
              backgroundColor: "rgba(0,0,0,0.03)",
              border: "1px solid rgba(0,0,0,0.08)",
              borderRadius: 10,
              padding: "14px 18px",
              opacity: graphProgress,
              transform: `translateY(${interpolate(graphProgress, [0, 1], [16, 0])}px)`,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "rgba(0,0,0,0.5)",
                letterSpacing: 1,
                marginBottom: 12,
                textTransform: "uppercase",
              }}
            >
              Views This Week
            </div>
            <svg
              viewBox={`-10 -10 ${graphW + 20} ${graphH + 36}`}
              style={{ width: "100%" }}
            >
              {/* Grid lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                <line
                  key={ratio}
                  x1="0"
                  y1={graphH * ratio}
                  x2={graphW}
                  y2={graphH * ratio}
                  stroke="rgba(0,0,0,0.06)"
                  strokeWidth="1"
                />
              ))}

              {/* Y-axis labels */}
              {[
                { ratio: 0, label: "600K" },
                { ratio: 0.5, label: "300K" },
                { ratio: 1, label: "0" },
              ].map(({ ratio, label }) => (
                <text
                  key={label}
                  x="-8"
                  y={graphH * ratio + 4}
                  fill="rgba(0,0,0,0.3)"
                  fontSize="8"
                  textAnchor="end"
                  fontWeight="500"
                >
                  {label}
                </text>
              ))}

              {/* Filled area under curve */}
              <defs>
                <linearGradient
                  id="viewsFill"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="0%"
                    stopColor={colors.blueDark}
                    stopOpacity="0.2"
                  />
                  <stop
                    offset="100%"
                    stopColor={colors.blueDark}
                    stopOpacity="0.02"
                  />
                </linearGradient>
              </defs>
              <path
                d={graphFillPath}
                fill="url(#viewsFill)"
                opacity={graphProgress}
              />

              {/* Animated line */}
              <polyline
                points={graphPoints
                  .map((p) => `${p.x},${p.y}`)
                  .join(" ")}
                fill="none"
                stroke={colors.blueDark}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="600"
                strokeDashoffset={interpolate(
                  graphProgress,
                  [0, 1],
                  [600, 0]
                )}
              />

              {/* Data points */}
              {graphPoints.map((p, pi) => (
                <circle
                  key={pi}
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill={colors.blueDark}
                  opacity={interpolate(
                    graphProgress,
                    [0.3 + pi * 0.08, 0.5 + pi * 0.08],
                    [0, 1],
                    {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    }
                  )}
                />
              ))}

              {/* X-axis labels */}
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                (day, di) => (
                  <text
                    key={day}
                    x={(di / 6) * graphW}
                    y={graphH + 20}
                    fill="rgba(0,0,0,0.3)"
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="500"
                  >
                    {day}
                  </text>
                )
              )}

              {/* ── Cursor + Tooltip ──────────────────────────── */}
              {cursorOpacity > 0 && (
                <g opacity={cursorOpacity}>
                  {/* Vertical guide line */}
                  <line
                    x1={cursorX}
                    y1={cursorY + 4}
                    x2={cursorX}
                    y2={graphH}
                    stroke="rgba(0,0,0,0.12)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />

                  {/* Highlight ring at nearest point */}
                  {tooltipOpacity > 0 && (
                    <circle
                      cx={graphPoints[nearestIdx].x}
                      cy={graphPoints[nearestIdx].y}
                      r="7"
                      fill="white"
                      stroke={colors.blueDark}
                      strokeWidth="2"
                      opacity={tooltipOpacity}
                    />
                  )}

                  {/* Tooltip bubble */}
                  {tooltipOpacity > 0 && (
                    <g opacity={tooltipOpacity}>
                      <rect
                        x={graphPoints[nearestIdx].x - 26}
                        y={graphPoints[nearestIdx].y - 38}
                        width={52}
                        height={24}
                        rx={6}
                        fill="rgba(30,30,30,0.92)"
                      />
                      <polygon
                        points={`${graphPoints[nearestIdx].x - 5},${graphPoints[nearestIdx].y - 14} ${graphPoints[nearestIdx].x + 5},${graphPoints[nearestIdx].y - 14} ${graphPoints[nearestIdx].x},${graphPoints[nearestIdx].y - 8}`}
                        fill="rgba(30,30,30,0.92)"
                      />
                      <text
                        x={graphPoints[nearestIdx].x}
                        y={graphPoints[nearestIdx].y - 22}
                        textAnchor="middle"
                        fill="white"
                        fontSize="11"
                        fontWeight="700"
                      >
                        {graphData[nearestIdx]}K views
                      </text>
                    </g>
                  )}

                  {/* macOS arrow cursor */}
                  <g transform={`translate(${cursorX}, ${cursorY})`}>
                    <path
                      d="M0,0 L0,16 L4,12 L7,19 L9.5,18 L6.5,11 L11,11 Z"
                      fill="white"
                      stroke="rgba(0,0,0,0.65)"
                      strokeWidth="0.8"
                      strokeLinejoin="round"
                    />
                  </g>
                </g>
              )}
            </svg>
          </div>

          {/* Summary stats row */}
          <div style={{ display: "flex", gap: 8 }}>
            {summaryStats.map(({ label, value, color }, si) => {
              const statProgress = spring({
                frame: frame - (45 + si * 8),
                fps,
                config: { damping: 200 },
              });

              return (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    backgroundColor: "rgba(0,0,0,0.03)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    borderRadius: 8,
                    padding: "10px 12px",
                    textAlign: "center",
                    opacity: statProgress,
                    transform: `scale(${statProgress})`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "rgba(0,0,0,0.4)",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 800,
                      color,
                    }}
                  >
                    {value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>

        {/* ── Close-button cursor ────────────────────────────── */}
        {closeCursorOpacity > 0 && (
          <svg
            style={{
              position: "absolute",
              left: closeCursorX,
              top: closeCursorY,
              width: 20,
              height: 24,
              opacity: closeCursorOpacity,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            <path
              d="M0,0 L0,16 L4,12 L7,19 L9.5,18 L6.5,11 L11,11 Z"
              fill="white"
              stroke="rgba(0,0,0,0.65)"
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </AbsoluteFill>
  );
};
