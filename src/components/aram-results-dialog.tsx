"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";

import type { Player } from "@/engine";
import type { AramTeams } from "@/lib/aram-shuffle";

type AramResultsDialogProps = Readonly<{
  teams: AramTeams;
  onClose: () => void;
  onShuffle: () => void;
}>;

function AramTeam({
  name,
  tone,
  players,
}: Readonly<{
  name: string;
  tone: "azure" | "crimson";
  players: readonly Player[];
}>) {
  return (
    <section className={`preview-team aram-team preview-team--${tone}`}>
      <header>
        <div>
          <span className="team-marker" aria-hidden="true" />
          <h3>{name}</h3>
        </div>
      </header>
      <div className="preview-team-header" aria-hidden="true">
        <span>#</span>
        <span>Player</span>
      </div>
      <ol>
        {players.map((player, index) => (
          <li key={player.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{player.name}</strong>
          </li>
        ))}
      </ol>
    </section>
  );
}

function teamText(name: string, players: readonly Player[]): string {
  return `${name}\n${players.map((player) => player.name).join("\n")}`;
}

export function AramResultsDialog({
  teams,
  onClose,
  onShuffle,
}: AramResultsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copyStatus, setCopyStatus] = useState("Copy Teams");

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
    try {
      await navigator.clipboard.writeText(
        [
          teamText("Team Azure", teams.teamA),
          teamText("Team Crimson", teams.teamB),
        ].join("\n\n"),
      );
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="balance-preview-dialog"
      aria-labelledby="aram-teams-title"
      onClose={onClose}
      onClick={closeFromBackdrop}
    >
      <div className="balance-preview-shell">
        <header className="balance-preview-header">
          <button type="button" onClick={closeDialog}>
            ← Back to Player Pool
          </button>
          <h2 id="aram-teams-title">ARAM Teams</h2>
          <p>Fun Mode shuffles the selected players without balance scoring.</p>
        </header>

        <section className="fun-mode-summary">
          <p className="section-kicker">Fun mode</p>
          <h3>Pure random shuffle</h3>
          <p>
            Rank, form, role preference, and recent split history were ignored.
          </p>
        </section>

        <div className="preview-teams-grid">
          <AramTeam name="Team Azure" tone="azure" players={teams.teamA} />
          <AramTeam name="Team Crimson" tone="crimson" players={teams.teamB} />
        </div>

        <footer className="balance-preview-actions">
          <button type="button" onClick={copyTeams}>
            {copyStatus}
          </button>
          <button type="button" onClick={onShuffle}>
            Shuffle Again
          </button>
          <button type="button" onClick={closeDialog}>
            Start Over
          </button>
        </footer>
      </div>
    </dialog>
  );
}
