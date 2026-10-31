export type FaceState = "play" | "gasp" | "win" | "lose";

/** A swept-back dorsal fin: convex leading edge, deeply scooped trailing edge.
 * No continuous wave under it, which can read as a sailboat hull at tile size. */
export function Fin() {
  return (
    <svg className="shark-fin" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 19C7.5 16 6.8 7 18.2 2.8C15.3 7.2 13.3 13.6 21 19Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Surfboard() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g transform="rotate(38 12 12)">
        <path className="sb-body" d="M12 2c3.2 3 4.2 7 4.2 10.5S15 20 12 22c-3-2-4.2-5.5-4.2-9.5S8.8 5 12 2z" />
        <path className="sb-stripe" d="M12 3.5v17" />
      </g>
    </svg>
  );
}

export function Stopwatch() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="line-icon">
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2M10 3h4" />
    </svg>
  );
}

export function SunLogo() {
  return (
    <svg viewBox="0 0 56 56" aria-hidden="true">
      <circle cx="28" cy="26" r="22" className="logo-sun" />
      <g className="logo-cut">
        <rect x="0" y="29" width="56" height="3" />
        <rect x="0" y="35" width="56" height="3.5" />
        <rect x="0" y="41.5" width="56" height="4" />
        <rect x="0" y="48.5" width="56" height="8" />
      </g>
      <path d="M6 50c4-3 8-3 11 0s8 3 11 0 8-3 11 0 8 3 11 0" className="logo-wave" />
    </svg>
  );
}

const RAY_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

/** The rays are their own group, so only they spin on a win and the face stays upright. */
export function SunFace() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <g className="rays">
        {RAY_ANGLES.map((angle) => (
          <rect key={angle} x="29.5" y="3" width="5" height="10" rx="2.5" transform={`rotate(${angle} 32 32)`} />
        ))}
      </g>
      <circle cx="32" cy="32" r="17" className="sun-disc" />
      <g className="f f-play">
        <circle cx="26" cy="29" r="2.3" />
        <circle cx="38" cy="29" r="2.3" />
        <path className="stroke" d="M25 37q7 6 14 0" />
      </g>
      <g className="f f-gasp">
        <circle cx="26" cy="28.5" r="2.3" />
        <circle cx="38" cy="28.5" r="2.3" />
        <ellipse cx="32" cy="38.5" rx="3" ry="3.7" />
      </g>
      <g className="f f-win">
        <path d="M18.5 26h27v2.6c0 3.4-2.2 5.9-5.6 5.9s-5.1-2.5-5.9-5.4h-4c-.8 2.9-2.5 5.4-5.9 5.4s-5.6-2.5-5.6-5.9z" />
        <path className="stroke" d="M25 39.5q7 5 14 0" />
      </g>
      <g className="f f-lose">
        <path className="stroke" d="M23.5 26l5 5m0-5l-5 5M35.5 26l5 5m0-5l-5 5" />
        <path className="stroke" d="M24 40.5q2-2.4 4 0t4 0 4 0 4 0" />
      </g>
    </svg>
  );
}
