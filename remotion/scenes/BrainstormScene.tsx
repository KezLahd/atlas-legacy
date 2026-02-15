import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { colors } from "../shared/colors";

export const BrainstormScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background title fade in (muted, like Research scene)
  const titleOpacity = interpolate(frame, [0, 25], [0, 0.15], {
    extrapolateRight: "clamp",
  });

  // Thought bubble dots - fade in while translating from previous dot position (cartoon style)
  // Positions: bottom-left trailing up toward cloud center
  const dotPositions = [
    { x: 720, y: 760, size: 16 },  // smallest, bottom-most
    { x: 740, y: 720, size: 26 },  // medium
    { x: 765, y: 670, size: 40 },  // largest, closest to cloud
  ];

  const dot1Progress = interpolate(frame, [5, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Dot 2 translates from dot 1 position to dot 2 position
  const dot2Progress = interpolate(frame, [12, 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  // Dot 3 translates from dot 2 position to dot 3 position
  const dot3Progress = interpolate(frame, [19, 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dotProgresses = [dot1Progress, dot2Progress, dot3Progress];

  // Cloud grows from the 4th dot position after dots appear
  const cloudProgress = spring({
    frame: frame - 26,
    fps,
    config: { damping: 200 },
  });

  const cloudScale = interpolate(cloudProgress, [0, 1], [0, 1], {
    extrapolateRight: "clamp",
  });

  // More ideas with different elliptical paths
  const thoughts = [
    // Inner ellipse
    { text: "5 Tips for Creators", delay: 40, pathIndex: 0, angle: 0, radiusX: 150, radiusY: 120, color: colors.blue },
    { text: "Behind the Scenes", delay: 45, pathIndex: 0, angle: 90, radiusX: 150, radiusY: 120, color: colors.pink },
    { text: "Trending Audio", delay: 50, pathIndex: 0, angle: 180, radiusX: 150, radiusY: 120, color: colors.dubaiChocolate },
    { text: "Product Launch", delay: 55, pathIndex: 0, angle: 270, radiusX: 150, radiusY: 120, color: colors.blueDark },

    // Middle ellipse
    { text: "Day in My Life", delay: 60, pathIndex: 1, angle: 45, radiusX: 220, radiusY: 160, color: colors.pinkDark },
    { text: "Tutorial Series", delay: 65, pathIndex: 1, angle: 135, radiusX: 220, radiusY: 160, color: colors.dubaiChocolateDark },
    { text: "Client Success Story", delay: 70, pathIndex: 1, angle: 225, radiusX: 220, radiusY: 160, color: colors.blue },
    { text: "Q&A Session", delay: 75, pathIndex: 1, angle: 315, radiusX: 220, radiusY: 160, color: colors.pink },

    // Outer ellipse
    { text: "Weekly Vlog", delay: 80, pathIndex: 2, angle: 0, radiusX: 280, radiusY: 180, color: colors.blueDark },
    { text: "Product Review", delay: 85, pathIndex: 2, angle: 60, radiusX: 280, radiusY: 180, color: colors.dubaiChocolate },
    { text: "Brand Collab", delay: 90, pathIndex: 2, angle: 120, radiusX: 280, radiusY: 180, color: colors.pinkDark },
    { text: "Challenge Video", delay: 95, pathIndex: 2, angle: 180, radiusX: 280, radiusY: 180, color: colors.blue },
    { text: "Office Tour", delay: 100, pathIndex: 2, angle: 240, radiusX: 280, radiusY: 180, color: colors.pink },
    { text: "Team Interview", delay: 105, pathIndex: 2, angle: 300, radiusX: 280, radiusY: 180, color: colors.dubaiChocolateDark },
  ];

  // Zoom effect for transition at end of scene
  const zoomProgress = spring({
    frame: frame - 120,
    fps,
    config: { damping: 100 },
  });

  const zoom = interpolate(zoomProgress, [0, 1], [1, 3], {
    extrapolateRight: "clamp",
  });

  // Blur the whole scene as it zooms out
  const exitBlur = interpolate(zoomProgress, [0, 1], [0, 20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out thought bubbles as cloud zooms
  const thoughtsFadeOut = interpolate(zoomProgress, [0, 0.5], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        overflow: "hidden",
        filter: exitBlur > 0 ? `blur(${exitBlur}px)` : undefined,
      }}
    >
      {/* Wallpaper background image */}
      <Img
        src={staticFile("wp9575774-minimalism-sky-wallpapers.jpg")}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Background muted "Brainstorm" text - behind cloud, large and effective */}
      <div
        style={{
          position: "absolute",
          top: 30,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: titleOpacity,
          zIndex: 1,
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: 200,
            fontWeight: 900,
            color: "#3a2415",
            letterSpacing: -4,
            textTransform: "uppercase",
          }}
        >
          Brainstorm
        </span>
      </div>

      {/* Cartoon thought bubble dots - bottom left trailing up to cloud */}
      {dotPositions.map((dot, i) => {
        const progress = dotProgresses[i];
        // Each dot translates from the previous dot's position (or from further below for dot 1)
        const fromX = i === 0 ? dot.x - 30 : dotPositions[i - 1].x;
        const fromY = i === 0 ? dot.y + 60 : dotPositions[i - 1].y;
        const currentX = interpolate(progress, [0, 1], [fromX, dot.x]);
        const currentY = interpolate(progress, [0, 1], [fromY, dot.y]);

        return (
          <div
            key={`dot-${i}`}
            style={{
              position: "absolute",
              left: currentX,
              top: currentY,
              width: dot.size,
              height: dot.size,
              borderRadius: "50%",
              backgroundColor: `${colors.white}ee`,
              opacity: progress,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              zIndex: 15,
            }}
          />
        );
      })}

      {/* Main brainstorm cloud with ideas */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: `translate(-50%, -50%) scale(${cloudScale * zoom})`,
          transformOrigin: "50% 50%",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: cloudProgress,
          zIndex: 10,
        }}
      >
        {/* Central cloud container */}
        <div
          style={{
            position: "relative",
            width: 800,
            height: 600,
          }}
        >
          {/* Cloud SVG */}
          <svg
            viewBox="0 0 465.416 465.416"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "100%",
              height: "100%",
              opacity: cloudProgress,
            }}
          >
            <path
              fill={`${colors.white}ee`}
              d="M359.504,403.814c-16.188,0-32.287-3.771-46.78-10.931c-6.164,3.61-13.109,5.507-20.299,5.507
                c-14.905,0-28.546-8.419-35.485-21.218c-17.376,11.594-37.46,17.692-58.541,17.692c-38.319,0-73.255-20.484-92.093-53.708
                c-0.131,0.006-0.263,0.006-0.394,0.006C47.508,341.162,0,293.648,0,235.25c0-58.404,47.508-105.912,105.912-105.912
                c9.923,0,19.822,1.438,29.524,4.284c14.416-42.705,54.782-72.02,100.255-72.02c33.295,0,64.711,15.8,84.694,42.43
                c0.609-0.03,1.211-0.048,1.826-0.048c58.398,0,105.912,47.508,105.912,105.912c0,2.369-0.084,4.744-0.257,7.202
                c23.909,20.21,37.549,49.477,37.549,80.803C465.416,356.3,417.902,403.814,359.504,403.814z"
              filter="drop-shadow(0 10px 30px rgba(0,0,0,0.15))"
            />
          </svg>

          {/* Rotating thought bubbles on different elliptical paths */}
          {thoughts.map((thought, i) => {
            const thoughtProgress = spring({
              frame: frame - thought.delay,
              fps,
              config: { damping: 200 },
            });

            const rotationSpeed = thought.pathIndex === 0 ? 1 : thought.pathIndex === 1 ? 0.7 : 0.5;
            const rotation = interpolate(
              frame,
              [thought.delay, thought.delay + 120],
              [0, 360 * rotationSpeed],
              {
                extrapolateRight: "extend",
              }
            );

            const angleRad = ((thought.angle + rotation) * Math.PI) / 180;
            const x = Math.cos(angleRad) * thought.radiusX;
            const y = Math.sin(angleRad) * thought.radiusY;

            const float = Math.sin((frame + i * 20) / 10) * 8;

            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y + float}px))`,
                  opacity: thoughtProgress * thoughtsFadeOut,
                  transition: "transform 0.2s ease-out",
                }}
              >
                <div
                  style={{
                    backgroundColor: colors.white,
                    padding: "12px 20px",
                    borderRadius: 20,
                    boxShadow: `0 6px 16px ${thought.color}25`,
                    border: `2px solid ${thought.color}`,
                    whiteSpace: "nowrap",
                  }}
                >
                  <div
                    style={{
                      fontSize: 18,
                      fontWeight: "600",
                      color: colors.grayDark,
                    }}
                  >
                    {thought.text}
                  </div>
                </div>

                <div
                  style={{
                    position: "absolute",
                    bottom: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 16,
                    height: 16,
                    backgroundColor: colors.white,
                    borderRadius: "50%",
                    border: `2px solid ${thought.color}`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    bottom: -24,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 10,
                    height: 10,
                    backgroundColor: colors.white,
                    borderRadius: "50%",
                    border: `2px solid ${thought.color}`,
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Zoom overlay for transition effect */}
      {zoomProgress > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: colors.white,
            opacity: interpolate(zoomProgress, [0.7, 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        />
      )}
    </AbsoluteFill>
  );
};
