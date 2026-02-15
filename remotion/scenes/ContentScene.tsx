import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { colors } from "../shared/colors";

const keyboardRows = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", ";"],
  ["Z", "X", "C", "V", "B", "N", "M", ",", ".", "?"],
];

export const ContentScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Muted background title
  const titleOpacity = interpolate(frame, [0, 25], [0, 0.15], {
    extrapolateRight: "clamp",
  });

  // Paper slides down into platen
  const paperProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 200 },
  });

  // Script text - two lines, carriage returns before "faster?"
  const fullText = '"Want to grow your audience\n10x faster?"';

  const charsPerFrame = 0.35;
  const typingStart = 45;
  const totalChars = Math.floor(
    interpolate(frame, [typingStart, typingStart + fullText.length / charsPerFrame], [0, fullText.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const displayText = fullText.substring(0, totalChars);
  const currentChar = totalChars > 0 ? fullText[totalChars - 1]?.toUpperCase() : "";
  const isTyping = frame >= typingStart && totalChars < fullText.length;

  // Carriage moves left as characters are typed on current line
  const currentLineStart = displayText.lastIndexOf("\n") + 1;
  const charsOnCurrentLine = displayText.length - currentLineStart;
  const carriageOffset = charsOnCurrentLine * 2.5;

  // Paper advances up by one row height per line break
  const lineCount = (displayText.match(/\n/g) || []).length;
  const lineHeight = 34;
  const paperAdvance = lineCount * lineHeight;

  // Paper rip exit animation near end of scene
  const ripStart = 168;
  const ripProgress = interpolate(frame, [ripStart, ripStart + 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const ripRotation = interpolate(ripProgress, [0, 1], [0, -8]);
  const ripY = interpolate(ripProgress, [0, 1], [0, -900]);
  const ripOpacity = interpolate(ripProgress, [0.6, 1], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
      }}
    >
      {/* Background image */}
      <Img
        src={staticFile("typewriterbg.png")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Background muted "Scripting" text - dark for light bg */}
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        <span
          style={{
            fontSize: 220,
            fontWeight: 900,
            color: "#3a2415",
            letterSpacing: -4,
            textTransform: "uppercase",
          }}
        >
          Scripting
        </span>
      </div>

      {/* Paper - flat facing camera, behind typewriter, concave curved sides */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: "8%",
          transform: `translateX(calc(-55% + ${-carriageOffset}px)) translateY(${interpolate(paperProgress, [0, 1], [-400, 0]) - paperAdvance + ripY}px) rotate(${ripRotation}deg)`,
          opacity: paperProgress * ripOpacity,
          zIndex: 5,
          width: 620,
          height: 420,
        }}
      >
        {/* Paper shape with concave sides via SVG clip path */}
        <svg
          viewBox="0 0 620 420"
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        >
          <defs>
            <clipPath id="paperClip">
              <path d="M 0,0 L 620,0 C 605,110 605,310 620,420 L 0,420 C 15,310 15,110 0,0 Z" />
            </clipPath>
            <filter id="paperShadow">
              <feDropShadow dx="0" dy="-2" stdDeviation="8" floodOpacity="0.08" />
              <feDropShadow dx="4" dy="0" stdDeviation="6" floodOpacity="0.05" />
              <feDropShadow dx="-4" dy="0" stdDeviation="6" floodOpacity="0.05" />
            </filter>
          </defs>
          {/* Paper background with concave edges */}
          <path
            d="M 0,0 L 620,0 C 605,110 605,310 620,420 L 0,420 C 15,310 15,110 0,0 Z"
            fill="#fffef6"
            filter="url(#paperShadow)"
          />
          {/* Left edge shadow for depth */}
          <path
            d="M 0,0 C 15,110 15,310 0,420"
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="8"
          />
          {/* Right edge shadow for depth */}
          <path
            d="M 620,0 C 605,110 605,310 620,420"
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth="8"
          />
          {/* Red margin lines */}
          <line x1="42" y1="0" x2="42" y2="420" stroke="rgba(200,70,70,0.25)" strokeWidth="1" />
          <line x1="46" y1="0" x2="46" y2="420" stroke="rgba(200,70,70,0.18)" strokeWidth="1" />
          {/* Horizontal ruled lines */}
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <line
              key={i}
              x1="50"
              y1={35 + i * 34}
              x2="600"
              y2={35 + i * 34}
              stroke="rgba(150,180,210,0.2)"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* Typed text - positioned over the SVG paper */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            padding: "35px 50px",
            paddingLeft: 68,
          }}
        >
          <div
            style={{
              fontFamily: "'Courier New', monospace",
              fontSize: 22,
              lineHeight: "34px",
              color: "#1a1008",
              whiteSpace: "pre-wrap",
              letterSpacing: 0.5,
            }}
          >
            {displayText}
            {isTyping && (
              <span style={{ opacity: Math.sin(frame * 0.4) > 0 ? 1 : 0, color: "#1a1008" }}>|</span>
            )}
          </div>
        </div>
      </div>

      {/* Typewriter assembly - angled */}
      <div
        style={{
          position: "absolute",
          bottom: "2%",
          left: "50%",
          transform: "translateX(-55%) perspective(1800px) rotateX(28deg)",
          transformOrigin: "50% 100%",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          opacity: ripOpacity,
        }}
      >
        {/* === PLATEN (cylinder roller) === */}
        <div style={{ position: "relative", marginBottom: -4 }}>
          <div
            style={{
              width: 720,
              height: 36,
              background: "linear-gradient(180deg, #1a1210 0%, #3a3028 20%, #5a4a38 45%, #3a3028 70%, #1a1210 100%)",
              borderRadius: 18,
              position: "relative",
              zIndex: 7,
              boxShadow: "0 3px 12px rgba(0,0,0,0.4)",
            }}
          >
            {/* Platen knobs (left and right) */}
            {["left", "right"].map((side) => (
              <div
                key={side}
                style={{
                  position: "absolute",
                  top: "50%",
                  [side]: -16,
                  transform: "translateY(-50%)",
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "radial-gradient(circle at 35% 35%, #7a6a58, #4a3a28)",
                  border: "2px solid #3a2a18",
                  boxShadow: "1px 2px 6px rgba(0,0,0,0.5)",
                }}
              />
            ))}

            {/* Platen highlight stripe */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 20,
                right: 20,
                height: 3,
                backgroundColor: "rgba(255,255,255,0.08)",
                borderRadius: 2,
              }}
            />
          </div>

          {/* === FEED ROLLERS (small cylinders pressing paper) === */}
          <div style={{ display: "flex", justifyContent: "center", gap: 200, marginTop: -6, position: "relative", zIndex: 6 }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: 60,
                  height: 10,
                  background: "linear-gradient(180deg, #2a2018, #4a3a28, #2a2018)",
                  borderRadius: 5,
                }}
              />
            ))}
          </div>
        </div>

        {/* === TYPEBAR BASKET / RIBBON AREA === */}
        <div
          style={{
            width: 600,
            height: 40,
            position: "relative",
            zIndex: 4,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Ribbon spool left */}
          <div style={{ position: "absolute", left: 40, width: 24, height: 24, borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, #4a4040, #1a1010)", border: "1px solid #5a5050" }} />
          {/* Ribbon */}
          <div style={{ width: 200, height: 8, background: "linear-gradient(90deg, #1a1010, #2a1818, #1a1010)", borderRadius: 2 }} />
          {/* Ribbon spool right */}
          <div style={{ position: "absolute", right: 40, width: 24, height: 24, borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, #4a4040, #1a1010)", border: "1px solid #5a5050" }} />
        </div>

        {/* === TYPEWRITER BODY with 3D depth === */}
        <div
          style={{
            position: "relative",
            zIndex: 3,
          }}
        >
          {/* Left side panel - darker trapezoid for 3D depth */}
          <div
            style={{
              position: "absolute",
              top: 8,
              left: -18,
              bottom: 8,
              width: 20,
              background: "linear-gradient(90deg, #0e0c0a, #161412)",
              borderRadius: "8px 0 0 16px",
              boxShadow: "inset -2px 0 4px rgba(0,0,0,0.3)",
              transform: "perspective(400px) rotateY(25deg)",
              transformOrigin: "right center",
            }}
          />
          {/* Right side panel - darker trapezoid for 3D depth */}
          <div
            style={{
              position: "absolute",
              top: 8,
              right: -18,
              bottom: 8,
              width: 20,
              background: "linear-gradient(270deg, #0e0c0a, #161412)",
              borderRadius: "0 8px 16px 0",
              boxShadow: "inset 2px 0 4px rgba(0,0,0,0.3)",
              transform: "perspective(400px) rotateY(-25deg)",
              transformOrigin: "left center",
            }}
          />
          {/* Bottom thickness panel */}
          <div
            style={{
              position: "absolute",
              bottom: -14,
              left: 4,
              right: 4,
              height: 16,
              background: "linear-gradient(180deg, #141210, #0a0806)",
              borderRadius: "0 0 20px 20px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.6)",
            }}
          />

          {/* Main top face */}
          <div
            style={{
              width: 680,
              background: "linear-gradient(180deg, #252220 0%, #1e1a18 40%, #1a1614 100%)",
              borderRadius: "12px 12px 20px 20px",
              padding: "22px 30px 40px",
              position: "relative",
              boxShadow: "0 12px 50px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {/* Top edge highlight for bevel */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 12,
                right: 12,
                height: 2,
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)",
                borderRadius: "12px 12px 0 0",
              }}
            />

            {/* Metal brand plate */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: "50%",
                transform: "translateX(-50%)",
                width: 140,
                height: 4,
                background: "linear-gradient(90deg, #5a4a3a, #8a7a6a, #5a4a3a)",
                borderRadius: 2,
              }}
            />

            {/* Keyboard */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 16 }}>
              {keyboardRows.map((row, rowIndex) => (
                <div
                  key={rowIndex}
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 8,
                    paddingLeft: rowIndex === 0 ? 0 : (rowIndex - 1) * 18,
                  }}
                >
                  {row.map((key) => {
                    const charToMatch = currentChar === '"' || currentChar === "'" ? ";" : currentChar;
                    const isPressed = isTyping && charToMatch === key;
                    const pressDepth = isPressed ? 5 : 0;

                    return (
                      <div
                        key={key}
                        style={{
                          width: 46,
                          height: 46,
                          borderRadius: "50%",
                          position: "relative",
                          transform: `translateY(${pressDepth}px)`,
                        }}
                      >
                        {/* Outer metal ring */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            borderRadius: "50%",
                            background: isPressed
                              ? "radial-gradient(circle at 40% 35%, #5a4a3a, #2a2018)"
                              : "radial-gradient(circle at 40% 35%, #7a6a58, #3a2a1a)",
                            boxShadow: isPressed
                              ? "0 1px 3px rgba(0,0,0,0.5), inset 0 2px 4px rgba(0,0,0,0.3)"
                              : "0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                          }}
                        />
                        {/* Inner key face (concave) */}
                        <div
                          style={{
                            position: "absolute",
                            inset: 5,
                            borderRadius: "50%",
                            background: isPressed
                              ? "radial-gradient(circle at 50% 55%, #3a3028, #252018)"
                              : "radial-gradient(circle at 45% 40%, #4a4038, #2a2520)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: `1px solid ${isPressed ? "#4a3a28" : "#5a4a38"}`,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: isPressed ? "#d0c0a0" : "#b0a088",
                              fontFamily: "serif",
                              textShadow: isPressed ? "none" : "0 1px 1px rgba(0,0,0,0.3)",
                            }}
                          >
                            {key}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {/* Spacebar */}
              <div style={{ display: "flex", justifyContent: "center", paddingLeft: 60, marginTop: 4 }}>
                {(() => {
                  const isSpacePressed = isTyping && (currentChar === " " || currentChar === "\n");
                  return (
                    <div
                      style={{
                        width: 280,
                        height: 34,
                        borderRadius: 17,
                        background: isSpacePressed
                          ? "linear-gradient(180deg, #3a3028, #2a2018)"
                          : "linear-gradient(180deg, #5a4a38, #3a2a1a)",
                        border: `1px solid ${isSpacePressed ? "#4a3a28" : "#6a5a48"}`,
                        transform: `translateY(${isSpacePressed ? 4 : 0}px)`,
                        boxShadow: isSpacePressed
                          ? "0 1px 3px rgba(0,0,0,0.5), inset 0 2px 4px rgba(0,0,0,0.2)"
                          : "0 4px 8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
                      }}
                    />
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
