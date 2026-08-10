# ARES repository audit

## Reusable source of truth

- `mars_edl_env.py`: eight-value observation and two-value continuous action spaces; randomized reset; altitude-triggered aeroshell, reefed-chute, full-chute, and powered-descent regimes; fuel and touchdown reward.
- `dynamics.py`: 2D translational/aerodynamic dynamics, pitch response, thrust and propellant flow.
- `atmosphere.py`: exponential density model clipped to 0–130 km.
- `constants.py`: timestep, mass, propulsion, aerodynamic, atmospheric and landing constraints.
- Existing plotting scripts established heat-flux and g-load derivations used by the normalized web telemetry.

## Gaps found

- The original GitHub checkout contained no policy artifacts. The matching final pair was subsequently recovered from the owner's local `Projects/ARES-EDL/trained model ARES-EDL` folder and added to this working tree.
- Script model names disagree (`staged_landing_v2`, `fresh_run_v1`, `orbital_final_legend`, `aero_master_v1`).
- `mission_analytics.py` imports `MarsDustStormEnv`, which does not exist in the repository.
- The original environment did not retain applied thrust, tilt, or action values for telemetry.
- The README claimed variable atmosphere and robustness beyond what the current implementation demonstrates; the web copy avoids those benchmark claims.

## Web integration

`backend/simulation.py` wraps the environment in `run_mission(config, callback)`, normalizes scientifically traceable fields, calculates outcome from the original safety limits, and reports policy availability honestly. `backend/main.py` isolates missions from the API lifecycle and exposes REST/WebSocket surfaces. `frontend` consumes those frames without reproducing physics.

## Current limitation

Mission Control now loads the matching `inator_edl_staged_landing_v2.zip` and `vec_normalize_edl_staged_v2.pkl` artifacts for deterministic PPO inference. The environment still owns phase-dependent applied control logic. Prediction and ghost layers remain disabled because the source simulator does not provide them.
