import React, { useEffect, useRef } from "react";

/**
 * BrandCirclesAnimation
 *
 * Animates the three intertwined brand circles between two states:
 *
 *  1. LOGO state  — the three rings overlap exactly as in the brand logo
 *     (geometry extracted from the "Full Colour Circle" EPS artwork),
 *     scaled down and centred in the middle of the frame.
 *  2. VENN state  — the rings peel out one at a time (orange, then magenta,
 *     then cherry) into a labelled diagram: the orange "Leadership" circle
 *     on top intersects the magenta "Resolution" circle below (both drawn
 *     as white-filled outlines), and both sit inside the cherry "Culture"
 *     ring. Labels are dark grey.
 *
 * The rings use multiply blending, so the overlaps darken exactly like the
 * printed logo. Because of that, the component should be placed on a light
 * background (default white).
 *
 * Honours `prefers-reduced-motion` by rendering the static labelled diagram.
 */

interface ShapeState {
  x: number;
  y: number;
  r: number;
  sw: number;
}

interface Shape {
  logo: ShapeState;
  venn: ShapeState;
}

const CX = 309.5;
const CY = 309;

// The logo starts small, centred in the middle of where the 3 circles form
const LOGO_SCALE = 0.5;
const scaledLogo = (x: number, y: number, r: number, sw: number): ShapeState => ({
  x: CX + (x - CX) * LOGO_SCALE,
  y: CY + (y - CY) * LOGO_SCALE,
  r: r * LOGO_SCALE,
  sw: sw * LOGO_SCALE,
});

// Outline width shared by all three circles in the labelled diagram
const RING_W = 45;

// Each ring is a stroked circle: the painted annulus is [r - sw/2, r + sw/2].
// A "filled disc" of radius R is a stroked circle with r = R/2, sw = R.
const SHAPES: Record<"orange" | "magenta" | "cherry", Shape> = {
  orange: {
    logo: scaledLogo(324.5, 326.0, 250.0, 67.0),
    venn: { x: CX, y: CY - 70, r: 125, sw: RING_W }, // white-filled outline, top
  },
  magenta: {
    logo: scaledLogo(289.9, 322.1, 250.65, 61.7),
    venn: { x: CX, y: CY + 70, r: 125, sw: RING_W }, // white-filled outline, bottom
  },
  cherry: {
    logo: scaledLogo(297.5, 295.0, 249.7, 59.6),
    venn: { x: CX, y: CY, r: 272.5, sw: RING_W }, // enclosing ring
  },
};

const COLORS = {
  orange: "#EB4A19",
  magenta: "#A3098B",
  cherry: "#9A1014",
};

// Timeline (seconds)
const T = {
  logoHold: 2.0, // intertwined logo at rest
  morph: 1.7, // duration of each shape's morph
  stagger: 1.15, // delay between orange -> magenta -> cherry
  labelFade: 0.8,
  vennHold: 4.6, // labelled diagram at rest
  returnMorph: 2.0, // all shapes flow back into the logo together
  endHold: 1.8,
};
const tOrange = T.logoHold;
const tMagenta = tOrange + T.stagger;
const tCherry = tMagenta + T.stagger;
const tVennDone = tCherry + T.morph;
const tLabelsOut = tVennDone + T.vennHold;
const tReturn = tLabelsOut + T.labelFade;
const TOTAL = tReturn + T.returnMorph + T.endHold;

const SHAPE_TIMES = { orange: tOrange, magenta: tMagenta, cherry: tCherry };

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Progress 0 (logo) -> 1 (venn) for one shape at absolute time `now`
const shapeProgress = (now: number, tOut: number) => {
  const out = easeInOutCubic(clamp01((now - tOut) / T.morph));
  const back = easeInOutCubic(clamp01((now - tReturn) / T.returnMorph));
  return out * (1 - back);
};

// Labels fade in once their shape has settled, and out before the return
const labelOpacity = (now: number, tOut: number) => {
  const tIn = tOut + T.morph;
  const on = clamp01((now - tIn) / T.labelFade);
  const off = clamp01((now - tLabelsOut) / T.labelFade);
  return on * (1 - off);
};

export interface BrandCirclesAnimationProps {
  className?: string;
  /** Label shown in the orange (top) circle. Default: "Leadership" */
  leadershipLabel?: string;
  /** Label shown in the magenta (bottom) circle. Default: "Resolution" */
  resolutionLabel?: string;
  /** Label shown on the cherry (outer) ring. Default: "Culture" */
  cultureLabel?: string;
}

const BrandCirclesAnimation: React.FC<BrandCirclesAnimationProps> = ({
  className,
  leadershipLabel = "Leadership",
  resolutionLabel = "Resolution",
  cultureLabel = "Culture",
}) => {
  const orangeRef = useRef<SVGCircleElement>(null);
  const magentaRef = useRef<SVGCircleElement>(null);
  const cherryRef = useRef<SVGCircleElement>(null);
  const leadershipRef = useRef<SVGTextElement>(null);
  const resolutionRef = useRef<SVGTextElement>(null);
  const cultureRef = useRef<SVGTextElement>(null);

  useEffect(() => {
    const circles = {
      orange: orangeRef.current,
      magenta: magentaRef.current,
      cherry: cherryRef.current,
    };
    const labels = {
      orange: leadershipRef.current,
      magenta: resolutionRef.current,
      cherry: cultureRef.current,
    };

    const apply = (now: number) => {
      (Object.keys(SHAPES) as Array<keyof typeof SHAPES>).forEach((name) => {
        const s = SHAPES[name];
        const circle = circles[name];
        const label = labels[name];
        if (!circle || !label) return;
        const p = shapeProgress(now, SHAPE_TIMES[name]);
        circle.setAttribute("cx", String(lerp(s.logo.x, s.venn.x, p)));
        circle.setAttribute("cy", String(lerp(s.logo.y, s.venn.y, p)));
        circle.setAttribute("r", String(Math.max(0.1, lerp(s.logo.r, s.venn.r, p))));
        circle.setAttribute("stroke-width", String(lerp(s.logo.sw, s.venn.sw, p)));
        label.setAttribute(
          "opacity",
          labelOpacity(now, SHAPE_TIMES[name]).toFixed(3)
        );
      });
    };

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Static labelled diagram for reduced-motion users
      apply(tVennDone + 0.5);
      return;
    }

    let raf = 0;
    let start: number | null = null;
    const frame = (ts: number) => {
      if (start === null) start = ts;
      apply(((ts - start) / 1000) % TOTAL);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg
      viewBox="0 0 619 618"
      className={className}
      role="img"
      aria-label={`Animated diagram: ${leadershipLabel} and ${resolutionLabel} circles intersect within a ${cultureLabel} circle, forming the company logo`}
    >
      <g style={{ isolation: "isolate" }}>
        <circle
          ref={cherryRef}
          stroke={COLORS.cherry}
          fill="none"
          style={{ mixBlendMode: "multiply" }}
        />
        <circle
          ref={orangeRef}
          stroke={COLORS.orange}
          fill="none"
          style={{ mixBlendMode: "multiply" }}
        />
        <circle
          ref={magentaRef}
          stroke={COLORS.magenta}
          fill="none"
          style={{ mixBlendMode: "multiply" }}
        />
      </g>
      <text
        ref={leadershipRef}
        x={CX}
        y={CY - 125}
        fontSize={28}
        opacity={0}
        style={labelStyle}
      >
        {leadershipLabel}
      </text>
      <text
        ref={resolutionRef}
        x={CX}
        y={CY + 125}
        fontSize={28}
        opacity={0}
        style={labelStyle}
      >
        {resolutionLabel}
      </text>
      <text
        ref={cultureRef}
        x={CX}
        y={CY + 233}
        fontSize={24}
        opacity={0}
        style={labelStyle}
      >
        {cultureLabel}
      </text>
    </svg>
  );
};

const labelStyle: React.CSSProperties = {
  fill: "#4A4A4A",
  textAnchor: "middle",
  dominantBaseline: "middle",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
};

export default BrandCirclesAnimation;
