"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";

import {
  effScore,
  RANKS,
  ROLES,
  type BalanceResult,
  type RoleAssignment,
  type RolePreference,
  type TeamEvaluation,
} from "@/engine";
import { balanceMeter } from "@/lib/balance-meter";

type BalancePreviewDialogProps = Readonly<{
  result: BalanceResult;
  optimalCost: number;
  eligibleCandidates: number;
  historyExhausted: boolean;
  onClose: () => void;
  onRebalance: () => void;
}>;

function preferenceLabel(preference: RolePreference): string {
  switch (preference) {
    case "main":
      return "Main";
    case "secondary":
      return "Secondary";
    case "off":
      return "Off-role";
  }
}

function orderedAssignments(
  assignments: readonly RoleAssignment[],
): RoleAssignment[] {
  return [...assignments].sort(
    (left, right) => ROLES.indexOf(left.role) - ROLES.indexOf(right.role),
  );
}

function PreviewTeam({
  name,
  tone,
  team,
  winProbability,
}: Readonly<{
  name: string;
  tone: "azure" | "crimson";
  team: TeamEvaluation;
  winProbability: number;
}>) {
  return (
    <section className={`preview-team preview-team--${tone}`}>
      <header>
        <div>
          <span className="team-marker" aria-hidden="true" />
          <h3>{name}</h3>
        </div>
        <span>{Math.round(winProbability * 100)}% model estimate</span>
      </header>
      <dl className="preview-team-meta">
        <div>
          <dt>Average rank</dt>
          <dd>{averageRankLabel(team)}</dd>
        </div>
        <div>
          <dt>Top player</dt>
          <dd>{topPlayerRankLabel(team)}</dd>
        </div>
        <div>
          <dt>Total score</dt>
          <dd>{Math.round(team.effectiveScore)}</dd>
        </div>
      </dl>
      <div className="preview-team-header" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
        <span>Rank</span>
        <span>Assigned role</span>
        <span>Role-fit</span>
      </div>
      <ol>
        {orderedAssignments(team.roleFit.assignments).map((assignment, index) => (
          <li key={assignment.player.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{assignment.player.name}</strong>
            <span className="preview-rank">
              {RANKS[assignment.player.rank].bucket}
            </span>
            <span>{assignment.role}</span>
            <span
              className={`role-fit-badge role-fit-badge--${assignment.preference}`}
            >
              {preferenceLabel(assignment.preference)}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function offRoleCount(team: TeamEvaluation): number {
  return team.roleFit.assignments.filter(
    (assignment) => assignment.preference === "off",
  ).length;
}

function averageRankLabel(team: TeamEvaluation): string {
  const total = team.players.reduce((sum, player) => sum + player.rank, 0);
  const index = Math.round(total / team.players.length);
  const clamped = Math.max(0, Math.min(RANKS.length - 1, index));
  return RANKS[clamped].bucket;
}

function topPlayerRankLabel(team: TeamEvaluation): string {
  const strongest = team.players.reduce(
    (best, player) => (effScore(player) > effScore(best) ? player : best),
    team.players[0],
  );
  return RANKS[strongest.rank].bucket;
}

type MetricTone = "good" | "warn" | "bad";

/**
 * Colour thresholds for the split metrics. Each raw value is rated good /
 * warn / bad only to tint the number green / yellow / red — the ranges are
 * deliberately NOT surfaced in the UI. Tune the numbers here if the colours
 * feel off. All three metrics are "lower is better".
 *
 * Units (see the engine for exact definitions):
 *   - Skill gap    : effective-score points between the team totals (~100 ≈ one rank tier)
 *   - Spread       : top-heaviness penalty (0 ≈ evenly shaped teams)
 *   - Balance cost : the engine's overall badness (a single off-role player alone adds ~120)
 *
 *                  good (green)   warn (yellow)   bad (red)
 *   Skill gap        ≤ 100         101 – 250        > 250
 *   Spread           ≤ 40          41 – 100         > 100
 *   Balance cost     ≤ 150         151 – 350        > 350
 */
const METRIC_THRESHOLDS = {
  skill: { good: 100, warn: 250 },
  spread: { good: 40, warn: 100 },
  cost: { good: 150, warn: 350 },
} as const;

function toneFor(
  value: number,
  thresholds: { good: number; warn: number },
): MetricTone {
  if (value <= thresholds.good) return "good";
  if (value <= thresholds.warn) return "warn";
  return "bad";
}

function matchupSummary(
  verdict: string,
  favoredName: string,
  favoredWinPct: number,
): string {
  switch (verdict) {
    case "Dead even":
      return "Nothing separates these two. Whoever plays better on the day takes it.";
    case "Slight edge":
      return `The model gives ${favoredName} a slight edge at roughly ${favoredWinPct}% — but it's anyone's game.`;
    case "Clear favorite":
      return `The model favors ${favoredName} at roughly ${favoredWinPct}%. Winnable for the underdogs, but an uphill fight.`;
    case "Lopsided":
      return `The model gives ${favoredName} a firm lead (~${favoredWinPct}%). This is as close as this roster splits.`;
    default:
      return `The model strongly favors ${favoredName} (~${favoredWinPct}%). Even the fairest split can't even out this lineup.`;
  }
}

function teamText(name: string, team: TeamEvaluation): string {
  const assignments = orderedAssignments(team.roleFit.assignments).map(
    (assignment) => `${assignment.role}: ${assignment.player.name}`,
  );
  return `${name}\n${assignments.join("\n")}`;
}

export function BalancePreviewDialog({
  result,
  optimalCost,
  eligibleCandidates,
  historyExhausted,
  onClose,
  onRebalance,
}: BalancePreviewDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copyStatus, setCopyStatus] = useState("Copy Teams");
  const [openMetric, setOpenMetric] = useState<string | null>(null);
  const meter = balanceMeter(result);
  const favoredName =
    meter.favored === "crimson" ? "Team Crimson" : "Team Azure";
  const favoredWinPct = Math.round(
    Math.max(meter.winProbabilityAzure, meter.winProbabilityCrimson) * 100,
  );
  const azureOffRoles = offRoleCount(result.teamA);
  const crimsonOffRoles = offRoleCount(result.teamB);
  const costDelta = result.score.total - optimalCost;

  const splitMetrics = [
    {
      key: "skill",
      label: "Skill gap",
      value: result.score.rankDifference.toFixed(1),
      tone: toneFor(result.score.rankDifference, METRIC_THRESHOLDS.skill),
      explanation:
        "Points between the two teams' combined skill totals. 0 means the teams are exactly matched on paper; the larger it is, the more one side outweighs the other.",
    },
    {
      key: "spread",
      label: "Spread",
      value: result.score.spreadPenalty.toFixed(1),
      tone: toneFor(result.score.spreadPenalty, METRIC_THRESHOLDS.spread),
      explanation:
        "How top-heavy the teams are. Low means both sides are evenly shaped; high means one team leans on a single strong carry the other can't match.",
    },
    {
      key: "cost",
      label: "Balance cost",
      value: result.score.total.toFixed(1),
      tone: toneFor(result.score.total, METRIC_THRESHOLDS.cost),
      explanation:
        "The overall score the engine minimized — it blends the skill gap, role fit, and spread into one number. Lower is a better split.",
    },
  ];

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  function closeDialog() {
    dialogRef.current?.close();
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }

  async function copyTeams() {
    const text = [
      teamText("Team Azure", result.teamA),
      teamText("Team Crimson", result.teamB),
    ].join("\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="balance-preview-dialog"
      aria-labelledby="balanced-teams-title"
      onClose={onClose}
      onClick={closeFromBackdrop}
    >
      <div className="balance-preview-shell">
        <header className="balance-preview-header">
          <button type="button" onClick={closeDialog}>
            ← Back to Player Pool
          </button>
          <h2 id="balanced-teams-title">Balanced Teams</h2>
          <p>Review this fresh near-optimal split and copy the roles into the lobby.</p>
        </header>

        <section className="balance-summary" aria-label="Balance result summary">
          <div
            className="balance-score-placeholder balance-score-result"
            style={{ "--score": meter.balanceScore } as CSSProperties}
            role="img"
            aria-label={`Balance score ${Math.round(meter.balanceScore)} out of 100`}
          >
            <strong>{Math.round(meter.balanceScore)}</strong>
          </div>
          <div className="balance-verdict-placeholder">
            <p className="section-kicker">Summoner Split</p>
            <h3>{meter.verdict}</h3>
            <span>
              {matchupSummary(meter.verdict, favoredName, favoredWinPct)}
            </span>
          </div>
          <dl className="balance-metrics-preview">
            {splitMetrics.map((metric, index) => {
              const isOpen = openMetric === metric.key;
              const explanationId = `metric-explanation-${metric.key}`;
              const alignEnd = index >= splitMetrics.length - 2;
              return (
                <div
                  key={metric.key}
                  className={`viewer-metric${alignEnd ? " align-end" : ""}`}
                >
                  <dt>
                    <span>{metric.label}</span>
                    <button
                      type="button"
                      className="metric-info-button"
                      aria-label={`What does ${metric.label} mean?`}
                      aria-expanded={isOpen}
                      aria-controls={explanationId}
                      onClick={() =>
                        setOpenMetric(isOpen ? null : metric.key)
                      }
                    >
                      i
                    </button>
                  </dt>
                  <dd className={`metric-value--${metric.tone}`}>
                    {metric.value}
                  </dd>
                  {isOpen ? (
                    <p id={explanationId} className="metric-explanation">
                      {metric.explanation}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </dl>
        </section>

        <div className="preview-teams-grid">
          <PreviewTeam
            name="Team Azure"
            tone="azure"
            team={result.teamA}
            winProbability={meter.winProbabilityAzure}
          />
          <PreviewTeam
            name="Team Crimson"
            tone="crimson"
            team={result.teamB}
            winProbability={meter.winProbabilityCrimson}
          />
        </div>

        <section className="balance-notes-preview">
          <p className="section-kicker">Balance notes</p>
          <div>
            <p>
              {eligibleCandidates} near-optimal choice
              {eligibleCandidates === 1 ? " was" : "s were"} available from{" "}
              {result.evaluatedSplits} valid splits.
            </p>
            <p>
              {costDelta <= 1e-9
                ? "This is an optimal split for the selected roster."
                : `This alternative is +${costDelta.toFixed(1)} cost from optimal.`}
            </p>
            <p>
              {historyExhausted
                ? "All fresh eligible splits were recently used; history has cycled."
                : `Azure has ${azureOffRoles} off-role assignment${azureOffRoles === 1 ? "" : "s"}; Crimson has ${crimsonOffRoles}.`}
            </p>
          </div>
        </section>

        <footer className="balance-preview-actions">
          <button type="button" onClick={copyTeams}>
            {copyStatus}
          </button>
          <button type="button" onClick={onRebalance}>
            Rebalance
          </button>
          <button
            type="button"
            disabled
            title="Save and sharing will be enabled when publishing is connected."
          >
            Save Team
          </button>
        </footer>
      </div>
    </dialog>
  );
}
