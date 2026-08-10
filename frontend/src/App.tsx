import { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Activity,
  ArrowRight,
  Box,
  ChevronRight,
  CircleDot,
  Code2,
  Eye,
  FastForward,
  Flame,
  Gauge,
  Github,
  Layers3,
  Pause,
  Play,
  RotateCcw,
  Satellite,
  ShieldCheck,
  Wind,
} from "lucide-react";
import * as THREE from "three";
import type { Telemetry, Report, Phase } from "./types";

const API = import.meta.env.VITE_API_URL || "";
const PHASES: Phase[] = [
  "entry",
  "guided_entry",
  "parachute",
  "powered_descent",
  "final_approach",
  "touchdown",
];
const phaseName = (p: string) => p.replaceAll("_", " ").toUpperCase();
const num = (v: number, d = 1) =>
  Number.isFinite(v)
    ? v.toLocaleString(undefined, { maximumFractionDigits: d })
    : "—";

function Mark() {
  return (
    <Link className="brand" to="/">
      <span className="mark">
        <span />
      </span>
      <span>
        <b>ARES</b>
        <small>AUTONOMOUS EDL SYSTEM</small>
      </span>
    </Link>
  );
}
function Header() {
  return (
    <header>
      <Mark />
      <div className="nasa-badge" title="Independent project inspired by NASA missions">
        <img src="/nasa-logo.png" alt="NASA" />
        <span>
          <b>INSPIRED BY NASA MISSIONS</b>
          <small>INDEPENDENT · NOT AFFILIATED</small>
        </span>
      </div>
      <nav>
        <Link to="/">HOME</Link>
        <Link to="/mission">MISSION CONTROL</Link>
        <Link to="/architecture">ARCHITECTURE</Link>
        <Link to="/technology">TECHNOLOGY</Link>
        <Link to="/about">ABOUT</Link>
      </nav>
      <a
        className="github"
        href="https://github.com/ninadnaik03/Autonomous-Reinforcement-Learning-For-Mars-Entry-Descent-Landing-ARES"
        target="_blank"
      >
        <Github size={15} /> GITHUB
      </a>
    </header>
  );
}
function Landing() {
  const nav = useNavigate();
  return (
    <>
      <main className="hero">
        <img
          src="/ares-mars-hero.png"
          className="hero-bg"
          alt="Mars entry capsule crossing the Martian horizon"
        />
        <Header />
        <div className="hero-content">
          <div className="eyebrow">AUTONOMOUS · ADAPTIVE · INTELLIGENT</div>
          <h1>ARES</h1>
          <h2>
            Autonomous Reinforcement Learning
            <br />
            for Mars Entry, Descent & Landing
          </h2>
          <p>
            An autonomous guidance research system that carries a simulated
            spacecraft from atmospheric entry through staged descent and powered
            touchdown on Mars.
          </p>
          <div className="actions">
            <button className="primary" onClick={() => nav("/mission")}>
              INITIATE EDL <ArrowRight size={17} />
            </button>
            <Link className="secondary" to="/architecture">
              EXPLORE SYSTEM
            </Link>
          </div>
          <div className="nasa-note">
            <span className="nasa-orbit">N</span>
            <span>
              <b>INSPIRED BY PLANETARY EXPLORATION</b>
              <small>
                Independent research project · Not affiliated with NASA
              </small>
            </span>
          </div>
        </div>
        <div className="preview panel">
          <div className="panel-head">
            <span>SIMULATION PREVIEW</span>
            <i>MISSION READY</i>
          </div>
          {[
            ["ALTITUDE", "118 KM"],
            ["ENTRY VELOCITY", "1.8 KM/S"],
            ["GUIDANCE", "PPO READY"],
            ["MODEL", "STAGED V2"],
          ].map((x) => (
            <div className="row" key={x[0]}>
              <span>{x[0]}</span>
              <b>{x[1]}</b>
            </div>
          ))}
          <div className="phase-mini">
            <strong>EDL SEQUENCE</strong>
            <div>
              <i className="on" />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      </main>
      <section className="journey">
        <div className="section-label">THE MISSION JOURNEY</div>
        <div className="journey-grid">
          {[
            [
              "130 KM",
              "ATMOSPHERIC ENTRY",
              "Guided hypersonic passage through the Martian atmosphere.",
            ],
            [
              "60–20 KM",
              "PARACHUTE DESCENT",
              "Reefed and full-chute aerodynamic deceleration.",
            ],
            [
              "<20 KM",
              "POWERED DESCENT",
              "Fuel-aware braking, throttle and velocity control.",
            ],
            [
              "0 M",
              "TOUCHDOWN",
              "Outcome determined by real simulation limits.",
            ],
          ].map((x, i) => (
            <article key={x[1]}>
              <span>{x[0]}</span>
              <div className="hex">
                {i === 0 ? (
                  <Satellite />
                ) : i === 1 ? (
                  <Wind />
                ) : i === 2 ? (
                  <Flame />
                ) : (
                  <CircleDot />
                )}
              </div>
              <b>{x[1]}</b>
              <p>{x[2]}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="capabilities">
        {[
          [Activity, "RL GUIDANCE", "PPO-ready policy interface"],
          [Box, "FULL EDL CHAIN", "Entry to touchdown"],
          [Gauge, "PHYSICS BASED", "Mars atmosphere + 2D dynamics"],
          [ShieldCheck, "TRACEABLE DATA", "No fabricated telemetry"],
        ].map(([I, t, s]: any) => (
          <div key={t}>
            <I />
            <span>
              <b>{t}</b>
              <small>{s}</small>
            </span>
          </div>
        ))}
      </section>
      <Footer />
    </>
  );
}

const presets: any = {
  nominal: { wind_ms: 4, initial_fuel_kg: 9000, vertical_velocity_ms: -1800 },
  high_wind: {
    wind_ms: 35,
    initial_fuel_kg: 9000,
    vertical_velocity_ms: -1800,
  },
  entry_error: {
    wind_ms: 12,
    initial_fuel_kg: 9000,
    vertical_velocity_ms: -2100,
    horizontal_velocity_ms: 130,
  },
  low_fuel: { wind_ms: 6, initial_fuel_kg: 4500, vertical_velocity_ms: -1800 },
};
function MissionConfig() {
  const nav = useNavigate();
  const [preset, setPreset] = useState("nominal");
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [bootSeconds, setBootSeconds] = useState(60);
  useEffect(() => {
    let active = true;
    const checkSystems = () =>
      fetch(`${API}/api/system/status`)
        .then((r) => {
          if (!r.ok) throw new Error();
          return r.json();
        })
        .then((data) => active && setStatus(data))
        .catch(() => active && setStatus(null));
    checkSystems();
    const poll = window.setInterval(checkSystems, 5000);
    const countdown = window.setInterval(
      () => setBootSeconds((seconds) => (seconds > 0 ? seconds - 1 : 0)),
      1000,
    );
    return () => {
      active = false;
      window.clearInterval(poll);
      window.clearInterval(countdown);
    };
  }, []);
  const online = status?.simulation === "ready";
  async function begin() {
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/missions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preset,
          seed: 7,
          entry_altitude_m: 118000,
          downrange_m: 2000,
          horizontal_velocity_ms: 20,
          ...presets[preset],
        }),
      });
      if (!r.ok) throw new Error();
      const d = await r.json();
      nav(`/mission/control/${d.mission_id}`);
    } catch {
      setBusy(false);
      alert(
        "ARES backend is not reachable. Start the FastAPI service and try again.",
      );
    }
  }
  return (
    <div className="page">
      <Header />
      <div className="config-shell">
        <div className="kicker">PRE-FLIGHT / EDL-01</div>
        <h1>MISSION CONFIGURATION</h1>
        <p className="lede">
          Define only conditions supported by the ARES environment. The
          simulation remains the source of truth.
        </p>
        <div className="config-grid">
          <section className="config-main panel">
            <h3>SCENARIO PRESET</h3>
            <div className="preset-grid">
              {Object.keys(presets).map((p) => (
                <button
                  className={preset === p ? "selected" : ""}
                  onClick={() => setPreset(p)}
                  key={p}
                >
                  {phaseName(p)}
                </button>
              ))}
              <button disabled>
                MONTE CARLO <small>COMING SOON</small>
              </button>
            </div>
            <h3>ENTRY CONDITIONS</h3>
            <Field label="ENTRY ALTITUDE" value="118.0" unit="KM" />
            <Field
              label="VERTICAL VELOCITY"
              value={String(
                Math.abs(presets[preset].vertical_velocity_ms) / 1000,
              )}
              unit="KM/S"
            />
            <Field
              label="HORIZONTAL VELOCITY"
              value={String(presets[preset].horizontal_velocity_ms ?? 20)}
              unit="M/S"
            />
            <h3>ENVIRONMENT & VEHICLE</h3>
            <Field
              label="CROSSWIND"
              value={String(presets[preset].wind_ms)}
              unit="M/S"
            />
            <Field
              label="INITIAL FUEL"
              value={String(Math.round(presets[preset].initial_fuel_kg / 90))}
              unit="%"
            />
          </section>
          <aside className="checks panel">
            <h3>SYSTEM CHECKS</h3>
            {!online && (
              <div className="boot-sequence">
                <span>ARES SYSTEM STARTUP</span>
                <b>
                  {bootSeconds > 0
                    ? `T-${bootSeconds.toString().padStart(2, "0")}`
                    : "STILL CONNECTING"}
                </b>
                <div>
                  <i
                    style={{
                      width: `${Math.max(5, ((60 - bootSeconds) / 60) * 100)}%`,
                    }}
                  />
                </div>
                <small>Booting guidance, dynamics and telemetry systems…</small>
              </div>
            )}
            {[
              ["ENV", "Simulation environment", status?.simulation === "ready"],
              ["ATM", "Atmospheric model", status?.atmosphere === "ready"],
              ["DYN", "Vehicle dynamics", status?.dynamics === "ready"],
              ["TLM", "Telemetry service", status?.telemetry === "ready"],
            ].map((x) => (
              <div className="check" key={String(x[0])}>
                <i className={x[2] ? "ok" : "booting"} />
                <span>
                  <b>{x[0]}</b>
                  {x[1]}
                </span>
                <strong>{x[2] ? "ONLINE" : "BOOTING"}</strong>
              </div>
            ))}
            <div className="policy-warning">
              <span>GUIDANCE MODE</span>
              <b>
                {status?.policy?.available
                  ? "PRETRAINED PPO"
                  : "INITIALIZING PPO"}
              </b>
              <p>
                {online
                  ? "Checkpoint and normalization statistics loaded."
                  : "Waiting for autonomous guidance service."}
              </p>
            </div>
            <button
              className={`arm ${armed ? "armed" : ""}`}
              onClick={() => setArmed(!armed)}
            >
              {armed ? "AUTONOMOUS GUIDANCE ARMED" : "ARM AUTONOMOUS GUIDANCE"}
            </button>
            <button
              className="primary wide"
              disabled={!armed || busy || !online}
              onClick={begin}
            >
              {busy ? "INITIALIZING…" : "BEGIN ENTRY"} <ArrowRight size={17} />
            </button>
          </aside>
        </div>
      </div>
    </div>
  );
}
function Field({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <div>
        <input value={value} readOnly />
        <b>{unit}</b>
      </div>
    </label>
  );
}

function Vehicle({ frame, layers }: { frame: Telemetry; layers: any }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => {
    if (ref.current) ref.current.rotation.y = s.clock.elapsedTime * 0.18;
  });
  const y = Math.max(1, Math.min(24, frame.altitude_m / 5000));
  return (
    <group
      ref={ref}
      position={[Math.max(-7, Math.min(7, frame.downrange_m / 1000)), y, 0]}
      rotation={[frame.orientation.pitch, 0, frame.orientation.roll]}
    >
      {frame.phase === "parachute" && (
        <>
          <mesh position={[0, 2.1, 0]}>
            <sphereGeometry
              args={[1.8, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]}
            />
            <meshStandardMaterial color="#dfc9ae" wireframe />
          </mesh>
          <mesh>
            <cylinderGeometry args={[0.35, 0.7, 1, 12]} />
            <meshStandardMaterial color="#b34b2c" />
          </mesh>
        </>
      )}
      {frame.phase !== "parachute" && (
        <mesh>
          <coneGeometry args={[0.75, 1.5, 32]} />
          <meshStandardMaterial
            color={frame.phase === "entry" ? "#ff6b29" : "#a9a29a"}
            emissive={frame.phase === "entry" ? "#8b1e00" : "#000"}
            emissiveIntensity={2}
          />
        </mesh>
      )}
      {frame.action.applied_throttle > 0 && (
        <mesh position={[0, -1, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry
            args={[0.22, 1 + frame.action.applied_throttle * 2, 12]}
          />
          <meshBasicMaterial color="#ff8a32" transparent opacity={0.85} />
        </mesh>
      )}
      {layers.velocity && (
        <arrowHelper
          args={[
            new THREE.Vector3(
              frame.horizontal_velocity_ms,
              -Math.abs(frame.vertical_velocity_ms),
              0,
            ).normalize(),
            new THREE.Vector3(0, 0, 0),
            2.3,
            0xffa24c,
          ]}
        />
      )}
    </group>
  );
}
function MarsScene({ frame, layers }: { frame: Telemetry; layers: any }) {
  return (
    <Canvas camera={{ position: [0, 10, 28], fov: 48 }}>
      <color attach="background" args={["#040302"]} />
      <fog attach="fog" args={["#090503", 22, 48]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[8, 18, 8]} color="#ffab72" intensity={3} />
      <Stars radius={90} depth={40} count={800} factor={2} />
      <mesh position={[0, -3, 0]}>
        <sphereGeometry args={[18, 64, 32]} />
        <meshStandardMaterial color="#6f2315" roughness={1} />
      </mesh>
      {layers.atmosphere && (
        <mesh position={[0, -3, 0]}>
          <sphereGeometry args={[18.35, 64, 32]} />
          <meshBasicMaterial
            color="#e94b1b"
            transparent
            opacity={0.08}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      <Vehicle frame={frame} layers={layers} />
      {layers.target && (
        <mesh position={[0, 14.96, 9.7]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.35, 0.48, 32]} />
          <meshBasicMaterial color="#ff4c32" />
        </mesh>
      )}
      <OrbitControls enablePan={false} minDistance={18} maxDistance={42} />
    </Canvas>
  );
}
const EMPTY: Telemetry = {
  mission_time: 0,
  phase: "entry",
  altitude_m: 118000,
  horizontal_velocity_ms: 20,
  vertical_velocity_ms: -1800,
  speed_ms: 1800,
  mach: 7.5,
  fuel_fraction: 1,
  heat_flux_kw_m2: 0,
  g_load: 0,
  atmospheric_density_kg_m3: 0,
  downrange_m: 2000,
  target_error_m: 2000,
  position: { x: 2000, y: 118000, z: 0 },
  orientation: { pitch: 0, yaw: 0, roll: 0 },
  action: {
    policy_thrust_command: 0,
    policy_tilt_command: 0,
    applied_throttle: 0,
    applied_tilt_rad: 0,
  },
  forces_n: { gravity: 0, drag: 0, lift: 0, thrust: 0 },
  reward: 0,
  cumulative_reward: 0,
};
function MissionControl() {
  const { id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState<Telemetry[]>([]);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [report, setReport] = useState<Report | null>(null);
  const [inspector, setInspector] = useState(false);
  const [layerOpen, setLayerOpen] = useState(false);
  const [layers, setLayers] = useState({
    vehicle: true,
    trajectory: true,
    target: true,
    atmosphere: true,
    velocity: false,
    forces: false,
  });
  useEffect(() => {
    const root =
      import.meta.env.VITE_WS_URL || location.origin.replace("http", "ws");
    const ws = new WebSocket(`${root}/ws/missions/${id}`);
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.type === "telemetry") setData((v) => [...v, m.data]);
      if (m.type === "completed") {
        setReport(m.report);
      }
    };
    return () => ws.close();
  }, [id]);
  useEffect(() => {
    if (!playing || !data.length || index >= data.length - 1) return;
    const timer = setTimeout(
      () => setIndex((x) => Math.min(x + 1, data.length - 1)),
      Math.max(16, 1000 / speed),
    );
    return () => clearTimeout(timer);
  }, [playing, index, data.length, speed]);
  const f = data[index] || EMPTY;
  const events = useMemo(
    () => data.filter((x, i) => i === 0 || x.phase !== data[i - 1].phase),
    [data],
  );
  return (
    <div className="control">
      <div className="control-top">
        <Mark />
        <span className="mission-id">ARES / {id}</span>
        <div className="guidance">
          <i /> AUTONOMOUS GUIDANCE ACTIVE
        </div>
        <span>{phaseName(f.phase)}</span>
        <b>T+ {f.mission_time.toFixed(1)} S</b>
      </div>
      <aside className="timeline">
        <div className="rail-label">MISSION PHASE</div>
        {PHASES.map((p, i) => {
          const pi = PHASES.indexOf(f.phase);
          return (
            <div
              className={`${i < pi ? "complete" : i === pi ? "active" : ""}`}
              key={p}
            >
              <i />
              {phaseName(p)}
            </div>
          );
        })}
        <div className="events">
          <div className="rail-label">MISSION EVENTS</div>
          {events
            .slice(-5)
            .reverse()
            .map((e, i) => (
              <p key={i}>
                <time>T+{e.mission_time.toFixed(1)}</time>
                {phaseName(e.phase)}
              </p>
            ))}
        </div>
      </aside>
      <section className="viewport">
        <MarsScene frame={f} layers={layers} />
        <div className="view-label">
          <span>CAM / AUTO</span>
          <b>{phaseName(f.phase)} VIEW</b>
        </div>
        {f.altitude_m < 500 && (
          <div className="approach">
            <span>FINAL APPROACH</span>
            <b>
              {num(f.altitude_m)} <small>M</small>
            </b>
            <p>
              V/S {num(f.vertical_velocity_ms)} M/S · THR{" "}
              {num(f.action.applied_throttle * 100)}%
            </p>
          </div>
        )}
        {f.phase === "touchdown" && (
          <div className="touchdown">
            <span>EDL SEQUENCE COMPLETE</span>
            <b>
              {report?.status === "success"
                ? "TOUCHDOWN CONFIRMED"
                : "MISSION FAILURE"}
            </b>
            <button onClick={() => nav(`/mission/report/${id}`)}>
              VIEW MISSION REPORT <ChevronRight />
            </button>
          </div>
        )}
        <button className="layers-btn" onClick={() => setLayerOpen(!layerOpen)}>
          <Layers3 /> VIEW LAYERS
        </button>
        {layerOpen && (
          <div className="layers panel">
            {Object.entries(layers).map(([k, v]) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={v}
                  onChange={() => setLayers((x) => ({ ...x, [k]: !v }))}
                />
                <span>{phaseName(k)}</span>
              </label>
            ))}
            <label className="disabled">
              <input type="checkbox" disabled />
              <span>PREDICTED TRAJECTORY</span>
              <small>NO SOURCE DATA</small>
            </label>
          </div>
        )}
      </section>
      <aside className="telemetry">
        <div className="rail-label">FLIGHT TELEMETRY</div>
        <Metric
          label="ALTITUDE"
          value={
            f.altitude_m > 1000
              ? num(f.altitude_m / 1000, 2)
              : num(f.altitude_m)
          }
          unit={f.altitude_m > 1000 ? "KM" : "M"}
        />
        <Metric label="TOTAL SPEED" value={num(f.speed_ms)} unit="M/S" />
        <Metric
          label="VERTICAL V"
          value={num(f.vertical_velocity_ms)}
          unit="M/S"
        />
        <Metric label="MACH" value={num(f.mach, 2)} />
        <Metric label="G-LOAD" value={num(f.g_load, 2)} unit="G" />
        <Metric label="HEAT FLUX" value={num(f.heat_flux_kw_m2)} unit="KW/M²" />
        <Metric label="FUEL" value={num(f.fuel_fraction * 100)} unit="%" />
        <Metric label="TARGET ERROR" value={num(f.target_error_m)} unit="M" />
        <button
          className="inspector-toggle"
          onClick={() => setInspector(!inspector)}
        >
          ARES AI <ChevronRight className={inspector ? "open" : ""} />
        </button>
        {inspector && (
          <div className="inspector">
            <span>GUIDANCE</span>
            <b>PPO / STAGED GUIDANCE</b>
            <small>Normalized deterministic inference</small>
            <hr />
            <span>OBSERVATION</span>
            <p>ALT {num(f.altitude_m)} M</p>
            <p>VX {num(f.horizontal_velocity_ms)} M/S</p>
            <p>VY {num(f.vertical_velocity_ms)} M/S</p>
            <p>FUEL {num(f.fuel_fraction * 100)}%</p>
            <hr />
            <span>APPLIED ACTION</span>
            <p>THROTTLE {num(f.action.applied_throttle * 100)}%</p>
            <p>TILT {num(f.action.applied_tilt_rad * 57.3)}°</p>
            <p>REWARD {num(f.reward, 2)}</p>
          </div>
        )}
      </aside>
      <div className="controls">
        <button
          aria-label={playing ? "Pause" : "Play"}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause /> : <Play />}
        </button>
        <button
          aria-label="Step one frame"
          onClick={() => {
            setPlaying(false);
            setIndex((x) => Math.min(x + 1, data.length - 1));
          }}
        >
          <FastForward />
        </button>
        <button aria-label="Restart playback" onClick={() => setIndex(0)}>
          <RotateCcw />
        </button>
        <div className="speeds">
          {[0.5, 1, 2, 4, 6, 10].map((x) => (
            <button
              className={speed === x ? "on" : ""}
              onClick={() => setSpeed(x)}
              key={x}
            >
              {x}×
            </button>
          ))}
        </div>
        <div className="progress">
          <i
            style={{
              width: `${data.length ? (index / (data.length - 1)) * 100 : 0}%`,
            }}
          />
        </div>
        <span>
          {index + 1} / {data.length || "—"} FRAMES
        </span>
      </div>
    </div>
  );
}
function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <b>
        {value} <small>{unit}</small>
      </b>
    </div>
  );
}
function ReportPage() {
  const { id } = useParams();
  const [r, setR] = useState<Report | null>(null);
  const [d, setD] = useState<Telemetry[]>([]);
  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/missions/${id}/report`).then((x) => x.json()),
      fetch(`${API}/api/missions/${id}/telemetry`).then((x) => x.json()),
    ]).then(([a, b]) => {
      setR(a);
      setD(b);
    });
  }, [id]);
  if (!r) return <div className="loading">RECONSTRUCTING MISSION REPORT…</div>;
  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(d, null, 2)], { type: "application/json" }),
    );
    a.download = `${id}-telemetry.json`;
    a.click();
  };
  return (
    <div className="page report-page">
      <Header />
      <main className="report">
        <div className="kicker">ARES / {id} · FINAL MISSION REPORT</div>
        <h1 className={r.status}>
          {r.status === "success" ? "LANDING SUCCESS" : "MISSION FAILURE"}
        </h1>
        <p>
          Outcome calculated from the ARES environment. Guidance mode:{" "}
          {phaseName(r.guidance_mode)}.
        </p>
        <div className="report-metrics">
          {[
            ["LANDING ERROR", r.landing_error_m, "M"],
            ["TOUCHDOWN SPEED", r.touchdown_velocity_ms, "M/S"],
            ["FUEL REMAINING", r.fuel_remaining_fraction * 100, "%"],
            ["PEAK HEATING", r.peak_heat_flux_kw_m2, "KW/M²"],
            ["PEAK G-LOAD", r.peak_g_load, "G"],
            ["FLIGHT DURATION", r.flight_duration_s, "S"],
            ["MAXIMUM MACH", r.max_mach, ""],
            ["TOTAL REWARD", r.cumulative_reward, ""],
          ].map((x) => (
            <div key={String(x[0])}>
              <span>{x[0]}</span>
              <b>
                {num(Number(x[1]), 2)} <small>{x[2]}</small>
              </b>
            </div>
          ))}
        </div>
        <div className="charts">
          <Chart title="ALTITUDE / TIME" data={d} keyName="altitude_m" />
          <Chart title="VELOCITY / TIME" data={d} keyName="speed_ms" />
          <Chart
            title="FUEL / TIME"
            data={d.map((x) => ({
              ...x,
              fuel_fraction: x.fuel_fraction * 100,
            }))}
            keyName="fuel_fraction"
          />
          <Chart title="RL REWARD / TIME" data={d} keyName="reward" />
        </div>
        <div className="actions">
          <Link className="primary" to={`/mission/control/${id}`}>
            REPLAY MISSION
          </Link>
          <Link className="secondary" to="/mission">
            RUN NEW MISSION
          </Link>
          <button className="secondary" onClick={download}>
            DOWNLOAD TELEMETRY
          </button>
        </div>
      </main>
    </div>
  );
}
function Chart({
  title,
  data,
  keyName,
}: {
  title: string;
  data: any[];
  keyName: string;
}) {
  return (
    <div className="chart panel">
      <span>{title}</span>
      <ResponsiveContainer width="100%" height={190}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e54b2a" stopOpacity={0.45} />
              <stop offset="1" stopColor="#e54b2a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="mission_time" hide />
          <YAxis hide domain={["auto", "auto"]} />
          <Tooltip
            contentStyle={{
              background: "#100b08",
              border: "1px solid #4e2419",
            }}
          />
          <Area
            type="monotone"
            dataKey={keyName}
            stroke="#f05b32"
            fill="url(#g)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
function InfoPage({ kind }: { kind: "architecture" | "technology" | "about" }) {
  const content = {
    architecture: [
      "SIMULATION ARCHITECTURE",
      "The browser never invents flight state. Mission configuration reaches FastAPI, which runs the Python MarsDeepSpaceEnv and returns normalized telemetry frames.",
      "Frontend → FastAPI → Mars EDL Environment → Guidance Controller → Dynamics + Atmosphere → Telemetry → Three.js",
    ],
    technology: [
      "TECHNOLOGY",
      "ARES models a two-dimensional vehicle state across entry, reefed chute, full chute, and powered descent. Its exponential atmosphere and force model remain intentionally compact and educational.",
      "OBSERVATION: altitude, vertical and horizontal velocity, pitch, pitch rate, fuel, wind, chute · ACTION: normalized thrust and tilt commands",
    ],
    about: [
      "ABOUT ARES",
      "ARES explores how reinforcement-learning interfaces can be applied to a simplified Mars EDL problem. It is research software—not flight-certified guidance.",
      "The current environment omits 6-DOF motion, detailed terrain, winds aloft, sensor noise, communications delay, high-fidelity aerothermodynamics and hardware constraints.",
    ],
  }[kind];
  return (
    <div className="page">
      <Header />
      <main className="info">
        <div className="kicker">ARES / TECHNICAL BRIEF</div>
        <h1>{content[0]}</h1>
        <p className="lede">{content[1]}</p>
        <div className="diagram panel">
          {content[2].split(" → ").map((x, i, a) => (
            <div key={x}>
              <b>{x}</b>
              {i < a.length - 1 && <ChevronRight />}
            </div>
          ))}
        </div>
        <section>
          <h2>TECHNICALLY DEFENSIBLE BY DESIGN</h2>
          <p>
            The site distinguishes simulated facts from illustrative visuals.
            Values shown during a mission are serialized from the Python
            environment or correctly derived from its state. Missing PPO
            artifacts are reported openly and prediction overlays remain
            disabled.
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
function Footer() {
  return (
    <footer>
      ARES is an independent research and educational project inspired by
      planetary exploration systems. It is not affiliated with or endorsed by
      NASA.
    </footer>
  );
}
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/mission" element={<MissionConfig />} />
      <Route path="/mission/control/:id" element={<MissionControl />} />
      <Route path="/mission/report/:id" element={<ReportPage />} />
      <Route path="/architecture" element={<InfoPage kind="architecture" />} />
      <Route path="/technology" element={<InfoPage kind="technology" />} />
      <Route path="/about" element={<InfoPage kind="about" />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
