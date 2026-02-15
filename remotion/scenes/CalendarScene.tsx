import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { colors } from "../shared/colors";

export const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── Title ────────────────────────────────────────────────────
  const titleOpacity = interpolate(frame, [0, 25], [0, 0.1], {
    extrapolateRight: "clamp",
  });

  // ── Grid entrance ────────────────────────────────────────────
  const gridProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  // ── Day flick-through cursor ─────────────────────────────────
  const flickStart = 45;
  const flickEnd = 110;
  const flickDuration = flickEnd - flickStart;

  const rawFlickProgress = interpolate(
    frame,
    [flickStart, flickEnd],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.quad),
    }
  );

  const activeDay =
    frame < flickStart
      ? 0
      : Math.min(15, Math.floor(1 + rawFlickProgress * 14.999));

  // Inverse of Easing.out(Easing.quad): y = 2x - x², x = 1 - sqrt(1 - y)
  const getFrameForDay = (d: number): number => {
    if (d <= 1) return flickStart;
    if (d > 15) return flickEnd;
    const targetProgress = (d - 1) / 14;
    const x = 1 - Math.sqrt(Math.max(0, 1 - targetProgress));
    return flickStart + x * flickDuration;
  };

  // ── Calendar data ────────────────────────────────────────────
  const today = 15;
  const daysInMonth = 31;
  const startDayOffset = 3; // January 2026 starts on Thursday (Mon=0)

  const events: Record<number, Array<{ title: string; color: string }>> = {
    3: [{ title: "Film Review", color: colors.pinkDark }],
    7: [{ title: "Edit Tutorial", color: colors.blueDark }],
    10: [{ title: "Post Reel", color: colors.green }],
    13: [{ title: "Brand Call", color: colors.purple }],
    15: [
      { title: "Film BTS", color: colors.pinkDark },
      { title: "Edit Vlog", color: colors.blueDark },
    ],
    19: [{ title: "Post Story", color: colors.green }],
    22: [{ title: "Film Q&A", color: colors.pinkDark }],
    27: [{ title: "Edit Series", color: colors.blueDark }],
    30: [{ title: "Team Sync", color: colors.purple }],
  };

  const futureEventDays = [19, 22, 27, 30];
  const futureEventsStart = flickEnd + 20;
  const futureEventsGap = 10;

  // Build cells
  const cells: Array<number | null> = [];
  for (let i = 0; i < startDayOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // ── Exit zoom + fade ───────────────────────────────────────
  const exitStart = 210;
  const exitEnd = 240;
  const exitProgress = interpolate(frame, [exitStart, exitEnd], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 1.25]);
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#161225", overflow: "hidden" }}>
      {/* Exit wrapper — zooms+fades content while BG stays solid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: exitOpacity,
          transform: `scale(${exitScale})`,
          transformOrigin: "50% 62%",
        }}
      >
      {/* ── Atmospheric lighting ────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 90% 80% at 80% 85%, rgba(59,159,216,0.25) 0%, rgba(59,100,180,0.12) 30%, rgba(40,40,100,0.06) 55%, transparent 75%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 50% 40% at 85% 90%, rgba(137,207,240,0.12) 0%, transparent 60%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 70% at 50% 50%, transparent 40%, rgba(8,5,15,0.5) 100%)",
        }}
      />

      {/* ── Muted "PLANNING" background text ───────────────────── */}
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
          Planning
        </span>
      </div>

      {/* ── Calendar area ───────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          top: "62%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 960,
        }}
      >
        {/* ── JANUARY CALENDAR ─────────────────────────────────── */}
        <div
          style={{
            position: "relative",
            opacity: gridProgress,
            transform: `scale(${interpolate(gridProgress, [0, 1], [0.97, 1])})`,
          }}
        >
          {/* Month header */}
          <div style={{ textAlign: "center", marginBottom: 16, paddingTop: 8 }}>
            <div
              style={{
                fontSize: 40,
                fontWeight: 800,
                color: "rgba(255,255,255,0.95)",
                letterSpacing: 6,
                textTransform: "uppercase",
              }}
            >
              January 2026
            </div>
            <div
              style={{
                width: 60,
                height: 3,
                backgroundColor: colors.blue,
                margin: "10px auto 0",
                borderRadius: 2,
                opacity: 0.6,
              }}
            />
          </div>

          {/* Day-of-week headers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 5,
              marginBottom: 5,
            }}
          >
            {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.3)",
                  letterSpacing: 2,
                  padding: "5px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 5,
            }}
          >
            {cells.map((day, i) => {
              if (day === null) return <div key={`e-${i}`} />;

              const isPast = activeDay > 0 && day < activeDay;
              const isActive = activeDay > 0 && day === activeDay;
              const dayEvents = events[day] || [];
              const row = Math.floor(i / 7);
              const col = i % 7;

              // Staggered cell entrance
              const cellDelay = 20 + row * 2.5 + col * 0.5;
              const cellProgress = spring({
                frame: frame - cellDelay,
                fps,
                config: { damping: 200 },
              });

              // Afterglow trail as cursor passes
              const dayReachedFrame = getFrameForDay(day);
              const framesSinceReached = frame - dayReachedFrame;
              const showAfterglow =
                day <= 14 &&
                isPast &&
                framesSinceReached >= 0 &&
                framesSinceReached < 12;
              const afterglow = showAfterglow
                ? interpolate(framesSinceReached, [0, 12], [0.5, 0], {
                    extrapolateRight: "clamp",
                  })
                : 0;

              // Today pulse (only once cursor settled on 15)
              const todaySettled = isActive && activeDay === today;
              const todayPulse = todaySettled
                ? interpolate(
                    Math.sin(frame * 0.12),
                    [-1, 1],
                    [0.4, 1]
                  )
                : 0;

              // Brief highlight while cursor is on this day during flick
              const flickHighlight =
                isActive && activeDay < today ? 0.6 : 0;

              const glowIntensity = todaySettled
                ? todayPulse
                : flickHighlight || afterglow;

              return (
                <div
                  key={day}
                  style={{
                    minHeight: 90,
                    backgroundColor:
                      isActive || todaySettled
                        ? `rgba(234,179,8,${0.08 + glowIntensity * 0.06})`
                        : afterglow > 0
                          ? `rgba(234,179,8,${afterglow * 0.06})`
                          : isPast
                            ? "rgba(255,255,255,0.015)"
                            : "rgba(255,255,255,0.04)",
                    border:
                      isActive || todaySettled
                        ? `2px solid rgba(234,179,8,${0.4 + glowIntensity * 0.5})`
                        : afterglow > 0
                          ? `1px solid rgba(234,179,8,${afterglow * 0.35})`
                          : isPast
                            ? "1px solid rgba(255,255,255,0.04)"
                            : "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 8,
                    padding: "6px 8px",
                    opacity: cellProgress,
                    transform: `scale(${cellProgress})`,
                    position: "relative",
                    boxShadow:
                      glowIntensity > 0
                        ? `0 0 ${6 + glowIntensity * 12}px rgba(234,179,8,${0.06 + glowIntensity * 0.14})`
                        : "none",
                  }}
                >
                  {/* Day number + badges */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 3,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 18,
                        fontWeight: isActive ? 800 : 600,
                        color: isActive
                          ? colors.yellow
                          : isPast
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(255,255,255,0.6)",
                      }}
                    >
                      {day}
                    </span>
                    {todaySettled && (
                      <span
                        style={{
                          fontSize: 8,
                          fontWeight: 800,
                          color: colors.yellow,
                          backgroundColor: "rgba(234,179,8,0.15)",
                          padding: "1px 5px",
                          borderRadius: 3,
                          letterSpacing: 1,
                        }}
                      >
                        TODAY
                      </span>
                    )}
                    {isPast && dayEvents.length > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          color: colors.green,
                          opacity: 0.5,
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </div>

                  {/* Events */}
                  {dayEvents.map((evt, ei) => {
                    let evtDelay: number;
                    if (day <= today) {
                      evtDelay = getFrameForDay(day) + ei * 3;
                    } else {
                      const futureIdx = futureEventDays.indexOf(day);
                      evtDelay =
                        futureEventsStart +
                        futureIdx * futureEventsGap +
                        ei * 3;
                    }

                    const evtProgress = spring({
                      frame: frame - evtDelay,
                      fps,
                      config: { damping: 200 },
                    });

                    return (
                      <div
                        key={ei}
                        style={{
                          opacity: isPast
                            ? evtProgress * 0.35
                            : evtProgress,
                          transform: `scale(${evtProgress})`,
                          transformOrigin: "left center",
                          fontSize: 11,
                          fontWeight: 600,
                          backgroundColor: isPast
                            ? `${evt.color}25`
                            : isActive
                              ? evt.color
                              : `${evt.color}70`,
                          color: isPast
                            ? "rgba(255,255,255,0.35)"
                            : "#ffffff",
                          padding: "2px 6px",
                          borderRadius: 4,
                          marginBottom: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textDecoration: isPast ? "line-through" : "none",
                        }}
                      >
                        {evt.title}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Legend bar */}
          <div
            style={{
              display: "flex",
              gap: 22,
              justifyContent: "center",
              marginTop: 14,
              opacity: interpolate(frame, [170, 185], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              }),
            }}
          >
            {[
              { color: colors.pinkDark, label: "Filming" },
              { color: colors.blueDark, label: "Editing" },
              { color: colors.purple, label: "Meetings" },
              { color: colors.green, label: "Posting" },
            ].map(({ color, label }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <div
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    backgroundColor: color,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: "rgba(255,255,255,0.35)",
                    fontWeight: 500,
                  }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </AbsoluteFill>
  );
};
