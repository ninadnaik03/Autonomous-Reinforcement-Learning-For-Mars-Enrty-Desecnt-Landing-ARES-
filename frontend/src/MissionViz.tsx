import { useMemo } from "react";
import type { Telemetry } from "./types";

type Layers = {
  vehicle: boolean;
  trajectory: boolean;
  target: boolean;
  atmosphere: boolean;
  velocity: boolean;
  forces: boolean;
};

const SURFACE_Y = 574;
const TOP_Y = 62;
const altitudeY = (altitude: number) => {
  const normalized = Math.sqrt(Math.max(0, Math.min(1, altitude / 130000)));
  return SURFACE_Y - normalized * (SURFACE_Y - TOP_Y);
};

function Capsule({ hot }: { hot: boolean }) {
  return (
    <g className={hot ? "viz-capsule hot" : "viz-capsule"}>
      {hot && <path className="plasma" d="M 18 -7 C 47 -5 72 3 101 18 C 66 11 43 15 14 10 Z" />}
      <path d="M -18 9 Q -11 -18 9 -22 Q 22 -8 20 11 Z" className="capsule-shell" />
      <path d="M -20 10 Q 1 20 22 11" className="heatshield" />
      <path d="M -8 -7 L 10 -11 M -12 2 L 15 -2" className="capsule-detail" />
    </g>
  );
}

function Parachute() {
  return (
    <g className="viz-parachute">
      <path d="M -64 -65 Q 0 -128 64 -65 Q 34 -79 0 -65 Q -34 -79 -64 -65 Z" className="canopy" />
      <path d="M -64 -65 L -14 7 M 0 -65 L 0 7 M 64 -65 L 14 7" className="chute-lines" />
      <path d="M -17 8 L -13 31 Q 0 39 13 31 L 17 8 Z" className="capsule-shell" />
      <path d="M -14 31 Q 0 37 14 31" className="heatshield" />
    </g>
  );
}

function Lander({ throttle, touchdown }: { throttle: number; touchdown: boolean }) {
  return (
    <g className="viz-lander">
      <path d="M -31 -29 L -22 -57 L 22 -57 L 31 -29 L 24 20 L -24 20 Z" className="lander-body" />
      <path d="M -18 -57 L -10 -72 L 10 -72 L 18 -57 M 0 -72 L 0 -89 M -7 -89 L 7 -89" className="lander-top" />
      <path d="M -22 12 L -48 53 L -64 53 M 22 12 L 48 53 L 64 53" className="lander-legs" />
      <circle cx="-10" cy="-35" r="4" className="lander-port" />
      <circle cx="10" cy="-35" r="4" className="lander-port" />
      {throttle > 0.01 && !touchdown && (
        <g className="thrusters" style={{ opacity: 0.55 + throttle * 0.45 }}>
          <path d={`M -14 20 L -4 ${32 + throttle * 42} L 2 20 Z`} />
          <path d={`M 14 20 L 4 ${32 + throttle * 42} L -2 20 Z`} />
        </g>
      )}
      {touchdown && <path className="dust" d="M -92 58 Q -49 26 0 54 Q 49 26 92 58 Q 48 47 0 62 Q -48 47 -92 58" />}
    </g>
  );
}

export default function MissionViz({ frame, history, layers }: { frame: Telemetry; history: Telemetry[]; layers: Layers }) {
  const phaseIndex = ["entry", "guided_entry", "parachute", "powered_descent", "final_approach", "touchdown"].indexOf(frame.phase);
  const closeView = frame.altitude_m < 2500;
  const y = closeView
    ? 500 - Math.max(0, Math.min(1, frame.altitude_m / 2500)) * 330
    : altitudeY(frame.altitude_m);
  const x = closeView ? 650 + Math.max(-90, Math.min(90, frame.target_error_m / 30)) : 655 - Math.max(-250, Math.min(250, frame.downrange_m / 110));
  const path = useMemo(() => {
    if (!history.length) return "";
    return history.map((p, i) => {
      const py = altitudeY(p.altitude_m);
      const px = 655 - Math.max(-280, Math.min(280, p.downrange_m / 110));
      return `${i ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`;
    }).join(" ");
  }, [history]);
  const scale = closeView ? 0.68 : frame.phase === "parachute" ? 0.58 : 0.48;
  const rotate = frame.phase === "entry" || frame.phase === "guided_entry" ? -22 : 0;
  const maxForce = Math.max(1, frame.forces_n.gravity, frame.forces_n.drag, frame.forces_n.thrust);
  const vector = (value: number) => 24 + (value / maxForce) * 60;

  return (
    <div className={`mission-viz phase-${frame.phase} ${closeView ? "surface-view" : "profile-view"}`}>
      <svg viewBox="0 0 1000 650" role="img" aria-labelledby="edl-viz-title edl-viz-desc" preserveAspectRatio="xMidYMid meet">
        <title id="edl-viz-title">ARES Mars entry, descent and landing profile</title>
        <desc id="edl-viz-desc">A side profile driven by the current mission altitude, downrange, velocity, phase, forces and throttle.</desc>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#020202"/><stop offset="0.55" stopColor="#090403"/><stop offset="1" stopColor="#37110a"/></linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#9f301b"/><stop offset="1" stopColor="#35100b"/></linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <filter id="soft"><feGaussianBlur stdDeviation="9"/></filter>
        </defs>
        <rect width="1000" height="650" fill="url(#sky)" />
        <g className="stars"><circle cx="110" cy="92" r="1"/><circle cx="292" cy="144" r=".7"/><circle cx="515" cy="72" r="1"/><circle cx="830" cy="111" r=".8"/><circle cx="911" cy="215" r="1"/><circle cx="410" cy="265" r=".6"/></g>
        {layers.atmosphere && !closeView && <g className="altitude-grid">
          {[130, 80, 50, 20, 10, 2].map((alt) => <g key={alt}><line x1="82" x2="946" y1={altitudeY(alt * 1000)} y2={altitudeY(alt * 1000)}/><text x="28" y={altitudeY(alt * 1000) + 4}>{alt} KM</text></g>)}
          <text x="88" y="545" className="density-label">ATMOSPHERIC DENSITY INCREASES ↓</text>
        </g>}
        {closeView && <g className="surface-scale">
          {[2500, 1000, 500, 100, 20, 0].map((alt) => { const sy = 500 - Math.sqrt(alt / 2500) * 330; return <g key={alt}><line x1="55" x2="945" y1={sy} y2={sy}/><text x="24" y={sy - 7}>{alt >= 1000 ? `${alt / 1000} KM` : `${alt} M`}</text></g>; })}
        </g>}
        {!closeView && layers.trajectory && <path d={path} className="trajectory-path" />}
        <path className="horizon-glow" d="M -30 593 Q 500 495 1030 593" />
        <path className="surface" fill="url(#ground)" d="M -30 604 Q 500 500 1030 604 L 1030 680 L -30 680 Z" />
        <g className="terrain-detail"><path d="M 72 606 Q 126 574 192 601 M 732 584 Q 810 535 902 584"/><ellipse cx="290" cy="596" rx="52" ry="8"/><ellipse cx="842" cy="603" rx="34" ry="6"/></g>
        {layers.target && <g className="target" transform="translate(650 554)"><ellipse rx="41" ry="13"/><ellipse rx="18" ry="6"/><line x1="-55" x2="55"/><line y1="-27" y2="27"/><text x="0" y="43">LANDING TARGET</text></g>}
        {layers.vehicle && <g transform={`translate(${x} ${Math.min(y, 500)}) scale(${scale}) rotate(${rotate})`} filter={phaseIndex < 2 ? "url(#glow)" : undefined}>
          {phaseIndex < 2 && <Capsule hot={frame.heat_flux_kw_m2 > 100} />}
          {frame.phase === "parachute" && <Parachute />}
          {phaseIndex >= 3 && <Lander throttle={frame.action.applied_throttle} touchdown={frame.phase === "touchdown"} />}
          {layers.velocity && <g className="velocity-vector"><line x1="0" y1="0" x2={Math.sign(frame.horizontal_velocity_ms) * 62} y2="72"/><path d="M 62 72 L 48 68 L 56 57"/><text x="68" y="81">VELOCITY</text></g>}
          {layers.forces && <g className="force-vectors">
            <line x1="0" y1="0" x2="0" y2={vector(frame.forces_n.gravity)}/><text x="8" y={vector(frame.forces_n.gravity)}>GRAVITY</text>
            <line x1="0" y1="0" x2="0" y2={-vector(frame.forces_n.drag)}/><text x="8" y={-vector(frame.forces_n.drag)}>DRAG</text>
            {frame.forces_n.thrust > 0 && <><line x1="0" y1="0" x2="0" y2={-vector(frame.forces_n.thrust)}/><text x="-70" y={-vector(frame.forces_n.thrust)}>THRUST</text></>}
          </g>}
        </g>}
        <g className="profile-readout"><text x="950" y="42" textAnchor="end">ALT {frame.altitude_m >= 1000 ? `${(frame.altitude_m / 1000).toFixed(2)} KM` : `${frame.altitude_m.toFixed(1)} M`}</text><text x="950" y="61" textAnchor="end">DOWNRANGE {(frame.downrange_m / 1000).toFixed(2)} KM</text></g>
      </svg>
      <div className="phase-caption"><span>EDL PROFILE / {closeView ? "SURFACE TRACK" : "ALTITUDE TRACK"}</span><b>{frame.phase.replaceAll("_", " ")}</b></div>
    </div>
  );
}
