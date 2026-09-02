# Unified Lifecycle Figure

Combine the two views on the Workflow page into a single interactive figure that keeps the editorial feel of Fig.01 and the utility of the swimlane.

## The idea

One chart, two layers:

- **Backbone (from Fig.01):** the diagonal dotted path with roman-numeral nodes I–XI, swimlane row labels down the left (Custodian, SEIA CRM, BDO, Catchlight, PlanScout, Claude, Advisors), and the amber "sample lead" glow that travels the path.
- **Overlay (from Eleven-Stage Lifecycle):** each roman-numeral node doubles as the stage card — hover/focus reveals the stage name (Referral Intake, SEIA CRM Intake, …, Client Won), the owner tag (Salesforce, Catchlight AI, SEIA Advisor…), and a subtle connector back to its swimlane row.
- **Detail panel below:** the existing Inputs / Outputs / Tools / Timing block from the lifecycle view, driven by whichever node is active. Guided tour controls (Prev · Start tour · Next · "Step N of 11 · Harold Winters") sit above the figure and drive both the glow position and the detail panel.

## Layout

```text
                The Referral-to-Client Journey
        [ ← Prev ] [ ▷ Start guided tour ] [ Next → ]   STEP 1 OF 11 · HAROLD WINTERS

  CUSTODIAN   ●I·······
  SEIA CRM         ·······●II·······●IV·······
  BDO                          ●III        ·······
  CATCHLIGHT                                       ●V·······
  PLANSCOUT                                              ●VI·······
  CLAUDE                                                       ●VII·······
  ADVISORS                                                            ●VIII──●IX──●X──●XI

  ─────────────────────────────────────────────────────────────
  STAGE VI · PLANSCOUT
  PlanScout Analysis
  Inputs · Outputs · Tools · Timing
```

Diagonal dotted connectors between nodes (Fig.01 style), horizontal ruled lane guides behind them, small kickers above each node ("REFERRAL / SEIA / BDO / CRM / …"). Active node gets the amber halo; inactive nodes stay ink-on-paper.

## Interactions

- Click any node → sets active stage, moves glow, updates detail panel, updates "STEP N OF 11".
- Prev / Next → step through I → XI.
- Start guided tour → auto-advances every ~2.2s with the glow easing along the path; pauses on hover or click.
- Keyboard: ← / → step, Esc stops tour.
- Reduced motion: glow snaps instead of animating; tour still works but without easing.

## What gets removed

The two current sections on the Workflow page — the standalone `FigureOneSchematic` and the standalone Eleven-Stage swimlane — collapse into this one figure. The lead simulator, funnel band, and everything else on the page stay as-is.

## Technical notes

- New component `src/components/lifecycle-figure.tsx` renders one responsive SVG (viewBox 0 0 1600 900) with:
  - lane labels + dotted lane rules (left column)
  - node positions from a single `STAGES` array (already the shape used by the lifecycle view — id, roman, kicker, lane, name, owner, inputs, outputs, tools, timing)
  - dashed connectors drawn as `<path>` between consecutive node centers
  - amber glow as a `<circle>` whose cx/cy animates along the same path via `getPointAtLength` on a hidden reference path
- Reuse existing tokens (`ink`, `bark`, `sand`, `cream`, `paper-grain`) — no new colors.
- Reuse the existing detail-panel markup from the current lifecycle component; just wire it to the shared active-stage state.
- Delete `FigureOneSchematic` usage on the Workflow route and the standalone swimlane; keep the `fig1-svg` / `fig1-fallback` test IDs on the new SVG so `tests/fig1.spec.ts` still passes.
- Mobile (<768px): SVG scales down; on very narrow widths the lane labels move above each node instead of the left column, and the guided tour auto-scrolls the active node into view.

## Out of scope

No data-model changes. No new routes. No changes to dashboard, branches, advisors, or auth.
