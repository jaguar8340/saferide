import { useEffect, useRef, useState } from "react";

/**
 * Animated speedometer / tacho with a needle that sweeps from 0 to a target
 * angle the moment the gauge scrolls into view. Pure SVG, no external deps.
 *
 * The visible arc spans 240° (from -120° at the bottom-left to +120° at the
 * bottom-right). `progress` is 0..1 and drives both the coloured fill of the
 * arc AND the needle angle.
 *
 * Props:
 *   - value: string shown centered (e.g. "200+")
 *   - label: caption below
 *   - progress: 0..1 target for the needle (default 0.78)
 *   - color: dial accent colour (default coral)
 *   - textColor: value/label colour (default ink navy)
 */
export default function Speedo({
  value,
  label,
  progress = 0.78,
  color = "#ff5a36",
  textColor = "#0f172a",
  trackColor = "#e2e8f0",
  testid,
  children,
}) {
  const wrapRef = useRef(null);
  const [needle, setNeedle] = useState(0); // 0..1 animated
  const rafRef = useRef(null);

  // Kick off the sweep when the element enters the viewport.
  useEffect(() => {
    if (!wrapRef.current) return;
    let started = false;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !started) {
            started = true;
            const start = performance.now();
            const duration = 1600;
            const tick = (now) => {
              const t = Math.min(1, (now - start) / duration);
              // easeOutCubic
              const eased = 1 - Math.pow(1 - t, 3);
              setNeedle(eased * progress);
              if (t < 1) rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.35 },
    );
    io.observe(wrapRef.current);
    return () => {
      io.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [progress]);

  // Geometry — 240° arc centred on the top of the dial.
  const SIZE = 220;
  const CX = SIZE / 2;
  const CY = SIZE / 2 + 12; // shift down slightly so labels fit
  const R = 82;
  const ARC_TOTAL_DEG = 240;
  const START_DEG = -210; // start angle (bottom-left)

  const polar = (deg, radius = R) => {
    const rad = (Math.PI / 180) * deg;
    return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
  };

  const arcPath = (fromDeg, toDeg, radius = R) => {
    const p0 = polar(fromDeg, radius);
    const p1 = polar(toDeg, radius);
    const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;
    return `M ${p0.x} ${p0.y} A ${radius} ${radius} 0 ${large} 1 ${p1.x} ${p1.y}`;
  };

  const trackFrom = START_DEG;
  const trackTo = START_DEG + ARC_TOTAL_DEG;
  const fillTo = START_DEG + ARC_TOTAL_DEG * needle;

  // Tick marks (11 ticks along the arc)
  const ticks = [];
  const TICK_COUNT = 11;
  for (let i = 0; i < TICK_COUNT; i++) {
    const t = i / (TICK_COUNT - 1);
    const deg = START_DEG + ARC_TOTAL_DEG * t;
    const inner = polar(deg, R - 12);
    const outer = polar(deg, R - 2);
    ticks.push({ x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, active: t <= needle + 0.001 });
  }

  const needleDeg = START_DEG + ARC_TOTAL_DEG * needle;
  const needleEnd = polar(needleDeg, R - 14);

  return (
    <div
      ref={wrapRef}
      data-testid={testid}
      className="relative flex flex-col items-center justify-center py-3"
    >
      <svg
        width={SIZE}
        height={SIZE * 0.78}
        viewBox={`0 0 ${SIZE} ${SIZE * 0.9}`}
        className="block max-w-full h-auto"
        aria-hidden="true"
      >
        {/* Track arc (grey) */}
        <path
          d={arcPath(trackFrom, trackTo)}
          fill="none"
          stroke={trackColor}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Filled arc (colour) */}
        <path
          d={arcPath(trackFrom, fillTo)}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Tick marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.active ? color : trackColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ))}
        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={textColor}
          strokeWidth={3}
          strokeLinecap="round"
        />
        {/* Needle hub */}
        <circle cx={CX} cy={CY} r={9} fill={textColor} />
        <circle cx={CX} cy={CY} r={3.5} fill={color} />
      </svg>
      {children ? (
        children
      ) : (
        <>
          <div
            className="mt-[-14px] font-display leading-none tabular-nums"
            style={{ color: textColor, fontSize: "clamp(1.9rem, 3.5vw, 2.8rem)" }}
          >
            {value}
          </div>
          <div
            className="mt-2 text-[10px] tracking-[0.2em] uppercase font-semibold"
            style={{ color: textColor, opacity: 0.72 }}
          >
            {label}
          </div>
        </>
      )}
    </div>
  );
}
