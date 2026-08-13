import React, { useEffect, useRef } from "react";

/**
 * BrandCirclesAnimation
 *
 * Animates the three intertwined brand circles between two states:
 *
 *  1. LOGO state  — the full logo lockup: the three rings overlap exactly
 *     as in the brand logo (geometry extracted from the "Full Colour
 *     Circle" EPS artwork), sitting above "The Resolution Centre" wordmark.
 *  2. VENN state  — the rings peel out one at a time (orange, then magenta,
 *     then cherry) into a labelled diagram: the orange "Leadership" circle
 *     on top intersects the magenta "Resolution" circle below (both drawn
 *     as white-filled outlines), and both sit inside the cherry "Culture"
 *     ring. Labels are dark grey. The wordmark fades out while the
 *     circles are unfolded, so only the words in the circles remain.
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

// The logo lockup: ring scaled down, sitting above the wordmark
const LOGO_SCALE = 0.43;
const LOGO_CY = 183.5; // ring centre while the wordmark is shown
const scaledLogo = (x: number, y: number, r: number, sw: number): ShapeState => ({
  x: CX + (x - CX) * LOGO_SCALE,
  y: LOGO_CY + (y - CY) * LOGO_SCALE,
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
  logoHold: 2.4, // full logo lockup at rest
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
const tWordmarkIn = tReturn + T.returnMorph * 0.85; // fade back as the logo re-forms
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

// "The Resolution Centre" is visible with the logo and hidden while the
// circles are out as the labelled diagram
const wordmarkOpacity = (now: number) => {
  const out = clamp01((now - tOrange) / 0.8);
  const back = clamp01((now - tWordmarkIn) / 0.8);
  return Math.max(1 - out, back);
};

export interface BrandCirclesAnimationProps {
  className?: string;
  /** Label shown in the orange (top) circle. Default: "Leadership" */
  leadershipLabel?: string;
  /** Label shown in the magenta (bottom) circle. Default: "Resolution" */
  resolutionLabel?: string;
  /** Label shown on the cherry (outer) ring. Default: "Culture" */
  cultureLabel?: string;
  /** Wordmark lines shown beneath the logo. Default: The / Resolution / Centre */
  wordmarkLines?: [string, string, string];
}

const BrandCirclesAnimation: React.FC<BrandCirclesAnimationProps> = ({
  className,
  leadershipLabel = "Leadership",
  resolutionLabel = "Resolution",
  cultureLabel = "Culture",
  wordmarkLines = ["The", "Resolution", "Centre"],
}) => {
  const orangeRef = useRef<SVGCircleElement>(null);
  const magentaRef = useRef<SVGCircleElement>(null);
  const cherryRef = useRef<SVGCircleElement>(null);
  const leadershipRef = useRef<SVGTextElement>(null);
  const resolutionRef = useRef<SVGTextElement>(null);
  const cultureRef = useRef<SVGTextElement>(null);
  const wordmarkRef = useRef<SVGGElement>(null);

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
      wordmarkRef.current?.setAttribute(
        "opacity",
        wordmarkOpacity(now).toFixed(3)
      );
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
      aria-label={`The Resolution Centre logo opens into a diagram: ${leadershipLabel} and ${resolutionLabel} circles intersect within a ${cultureLabel} circle`}
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
      <g ref={wordmarkRef}>
        {wordmarkLines.map((line, i) => (
          <text key={i} x={CX} y={384 + i * 76} fontSize={72} style={wordmarkStyle}>
            {line}
          </text>
        ))}
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

const brandFont =
  '"Arial Rounded MT Bold", "Helvetica Rounded", ui-rounded, "Trebuchet MS", "Helvetica Neue", Arial, sans-serif';

const labelStyle: React.CSSProperties = {
  fill: "#454546",
  textAnchor: "middle",
  dominantBaseline: "middle",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  fontFamily: brandFont,
};

const wordmarkStyle: React.CSSProperties = {
  fill: "#454546",
  textAnchor: "middle",
  dominantBaseline: "middle",
  fontWeight: 700,
  fontFamily: brandFont,
};

export default BrandCirclesAnimation;
