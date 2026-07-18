"use client";

import {
  useEffect,
  useReducer,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

import {
  effScore,
  rankBalanceCandidates,
  RANKS,
  ROLES,
  type BalanceResult,
  type RankIndex,
  type Role,
} from "@/engine";
import { BalancePreviewDialog } from "@/components/balance-preview-dialog";
import { AramResultsDialog } from "@/components/aram-results-dialog";
import { shuffleAramTeams, type AramTeams } from "@/lib/aram-shuffle";
import {
  buildScenario,
  SCENARIO_PRESETS,
  type ScenarioId,
} from "@/state/admin-scenarios";
import {
  addRecentSplit,
  BALANCE_HISTORY_STORAGE_KEY,
  balanceCohortKey,
  chooseFreshBalance,
  parseBalanceHistory,
  serializeBalanceHistory,
  type BalanceHistory,
} from "@/state/balance-history";
import { rosterReducer, type RosterPlayer } from "@/state/roster";
import {
  parseRoster,
  ROSTER_STORAGE_KEY,
  serializeRoster,
} from "@/state/roster-storage";
import { exportRoster, importRoster } from "@/state/roster-transfer";

type PlayerDraft = {
  name: string;
  rank: RankIndex;
  peakRank: RankIndex | "";
  mainRole: Role | "";
  secondaryRoles: Role[];
};

type OrganizerView = "roster" | "settings";

const EMPTY_DRAFT: PlayerDraft = {
  name: "",
  rank: 0,
  peakRank: "",
  mainRole: "",
  secondaryRoles: [],
};

function randomInteger(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

function generatedPlayer(): RosterPlayer {
  const id = crypto.randomUUID();
  const mainRole = ROLES[randomInteger(ROLES.length)];
  const secondaryRoles = ROLES.filter((role) => role !== mainRole);
  const games = randomInteger(31);

  return {
    id,
    name: `Generated ${id.slice(0, 6)}`,
    rank: randomInteger(RANKS.length) as RankIndex,
    peak:
      Math.random() < 0.35
        ? (randomInteger(RANKS.length) as RankIndex)
        : undefined,
    mainRole,
    secondaryRoles: [secondaryRoles[randomInteger(secondaryRoles.length)]],
    wins: games === 0 ? 0 : randomInteger(games + 1),
    games,
    in: false,
    source: "generated",
  };
}

function randomSubset<T>(items: readonly T[], count: number): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [
      shuffled[swapIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(0, count);
}

function PlayerPlusIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="12" cy="8" r="5" />
      <path d="M3.5 25c0-5.5 3.7-9 8.5-9s8.5 3.5 8.5 9H3.5Z" />
      <path d="M24 14v12M18 20h12" />
    </svg>
  );
}

function PlayerRow({
  player,
  position,
  toggleAvailability,
  openPlayerMenu,
}: Readonly<{
  player: RosterPlayer;
  position: number;
  toggleAvailability: (id: string) => void;
  openPlayerMenu: (player: RosterPlayer, x: number, y: number) => void;
}>) {
  const secondaries = player.secondaryRoles.length
    ? player.secondaryRoles.length === ROLES.length - 1 &&
      !player.secondaryRoles.includes(player.mainRole)
      ? "Fill"
      : player.secondaryRoles.join(", ")
    : "—";

  function openFromPointer(event: MouseEvent<HTMLLIElement>) {
    event.preventDefault();
    openPlayerMenu(player, event.clientX, event.clientY);
  }

  function openFromKeyboard(event: KeyboardEvent<HTMLLIElement>) {
    if (
      (event.shiftKey && event.key === "F10") ||
      event.key === "ContextMenu"
    ) {
      event.preventDefault();
      const bounds = event.currentTarget.getBoundingClientRect();
      openPlayerMenu(player, bounds.left + bounds.width / 2, bounds.top + 12);
    }
  }

  return (
    <li
      className="player-row"
      tabIndex={0}
      onContextMenu={openFromPointer}
      onKeyDown={openFromKeyboard}
    >
      <label className="player-selection">
        <input
          type="checkbox"
          checked={player.in}
          aria-label={`Select ${player.name} for balancing`}
          onChange={() => toggleAvailability(player.id)}
        />
        <span aria-hidden="true" />
      </label>
      <span className="player-position">
        {String(position).padStart(2, "0")}
      </span>
      <span className="player-identity">
        <strong className="player-name">{player.name}</strong>
        {player.source === "generated" ? (
          <small className="generated-badge">Generated</small>
        ) : null}
      </span>
      <span className="rank-badge">{RANKS[player.rank].bucket}</span>
      <span className="role-value">{player.mainRole}</span>
      <span className="secondary-value">{secondaries}</span>
      <span className="record-value">
        {player.wins}W / {player.games}G
      </span>
      <span className={`status-badge${player.in ? " is-in" : ""}`}>
        {player.in ? "In" : "Out"}
      </span>
    </li>
  );
}

type PlayerMenu = {
  player: RosterPlayer;
  x: number;
  y: number;
};

export function RosterEditor() {
  const [roster, dispatch] = useReducer(rosterReducer, []);
  const [draft, setDraft] = useState<PlayerDraft>(EMPTY_DRAFT);
  const [activeView, setActiveView] = useState<OrganizerView>("roster");
  const [randomPlayerCount, setRandomPlayerCount] = useState<number | "">("");
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [storageSnapshot, setStorageSnapshot] = useState("");
  const [copyStatus, setCopyStatus] = useState("Copy raw JSON");
  const [showBalancePreview, setShowBalancePreview] = useState(false);
  const [balanceResult, setBalanceResult] = useState<BalanceResult | null>(null);
  const [optimalBalanceCost, setOptimalBalanceCost] = useState(0);
  const [eligibleBalanceCount, setEligibleBalanceCount] = useState(0);
  const [balanceHistoryExhausted, setBalanceHistoryExhausted] = useState(false);
  const [aramTeams, setAramTeams] = useState<AramTeams | null>(null);
  const [resultError, setResultError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [transferMessage, setTransferMessage] = useState<string | null>(null);
  const [playerMenu, setPlayerMenu] = useState<PlayerMenu | null>(null);
  const playingCount = roster.filter((player) => player.in).length;
  const generatedCount = roster.filter(
    (player) => player.source === "generated",
  ).length;

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ROSTER_STORAGE_KEY);
      const restored = parseRoster(stored);
      setStorageSnapshot(stored ?? "");
      dispatch({ type: "replace", players: restored });
    } catch {
      setStorageError(true);
    } finally {
      setStorageReady(true);
    }
  }, []);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    try {
      const serialized = serializeRoster(roster);
      localStorage.setItem(ROSTER_STORAGE_KEY, serialized);
      setStorageSnapshot(serialized);
    } catch {
      setStorageError(true);
    }
  }, [roster, storageReady]);

  useEffect(() => {
    setShowBalancePreview(false);
    setBalanceResult(null);
    setAramTeams(null);
    setPlayerMenu(null);
  }, [roster]);

  useEffect(() => {
    if (!playerMenu) return;

    function closePlayerMenu() {
      setPlayerMenu(null);
    }

    function closePlayerMenuFromKey(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") closePlayerMenu();
    }

    window.addEventListener("pointerdown", closePlayerMenu);
    window.addEventListener("blur", closePlayerMenu);
    window.addEventListener("scroll", closePlayerMenu, true);
    window.addEventListener("keydown", closePlayerMenuFromKey);

    return () => {
      window.removeEventListener("pointerdown", closePlayerMenu);
      window.removeEventListener("blur", closePlayerMenu);
      window.removeEventListener("scroll", closePlayerMenu, true);
      window.removeEventListener("keydown", closePlayerMenuFromKey);
    };
  }, [playerMenu]);

  function openDialog() {
    setDraft(EMPTY_DRAFT);
    dialogRef.current?.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }

  function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = draft.name.trim();
    if (!name || !draft.mainRole) {
      return;
    }

    dispatch({
      type: "add",
      player: {
        id: crypto.randomUUID(),
        name,
        rank: draft.rank,
        peak: draft.peakRank === "" ? undefined : draft.peakRank,
        mainRole: draft.mainRole,
        secondaryRoles: draft.secondaryRoles,
        wins: 0,
        games: 0,
        in: true,
        source: "manual",
      },
    });
    closeDialog();
  }

  function addGeneratedPlayers() {
    const count = randomPlayerCount === "" ? 1 : randomPlayerCount;
    dispatch({
      type: "add-many",
      players: Array.from({ length: count }, generatedPlayer),
    });
  }

  function removeGeneratedPlayers() {
    const count = randomPlayerCount === "" ? 1 : randomPlayerCount;
    const generatedIds = roster
      .filter((player) => player.source === "generated")
      .map((player) => player.id);

    dispatch({
      type: "remove-many",
      ids: randomSubset(generatedIds, count),
    });
  }

  function selectPlayers(mode: "random" | "strongest" | "weakest" | "clear" | "invert") {
    let ids: string[];

    switch (mode) {
      case "random":
        ids = randomSubset(
          roster.map((player) => player.id),
          10,
        );
        break;
      case "strongest":
        ids = [...roster]
          .sort((a, b) => effScore(b) - effScore(a))
          .slice(0, 10)
          .map((player) => player.id);
        break;
      case "weakest":
        ids = [...roster]
          .sort((a, b) => effScore(a) - effScore(b))
          .slice(0, 10)
          .map((player) => player.id);
        break;
      case "clear":
        ids = [];
        break;
      case "invert":
        ids = roster.filter((player) => !player.in).map((player) => player.id);
        break;
    }

    dispatch({ type: "set-availability", ids });
  }

  function loadScenario(scenario: ScenarioId) {
    dispatch({
      type: "replace",
      players: buildScenario(scenario, () => crypto.randomUUID()),
    });
  }

  async function copyStorage() {
    try {
      await navigator.clipboard.writeText(storageSnapshot);
      setCopyStatus("Copied");
    } catch {
      setCopyStatus("Copy failed");
    }
  }

  function corruptStorage() {
    try {
      const corrupted = "{ intentionally-corrupted-roster";
      localStorage.setItem(ROSTER_STORAGE_KEY, corrupted);
      setStorageSnapshot(corrupted);
    } catch {
      setStorageError(true);
    }
  }

  function reloadStorage() {
    try {
      const stored = localStorage.getItem(ROSTER_STORAGE_KEY);
      setStorageSnapshot(stored ?? "");
      dispatch({ type: "replace", players: parseRoster(stored) });
    } catch {
      setStorageError(true);
    }
  }

  function clearStorage() {
    try {
      localStorage.removeItem(ROSTER_STORAGE_KEY);
      setStorageSnapshot("");
      dispatch({ type: "replace", players: [] });
    } catch {
      setStorageError(true);
    }
  }

  function removePlayer(player: RosterPlayer) {
    if (!window.confirm(`Delete ${player.name} from the player pool?`)) {
      return;
    }

    dispatch({ type: "remove", id: player.id });
  }

  function openPlayerMenu(player: RosterPlayer, x: number, y: number) {
    const menuWidth = 144;
    const menuHeight = 96;
    const viewportPadding = 8;

    setPlayerMenu({
      player,
      x: Math.max(
        viewportPadding,
        Math.min(x, window.innerWidth - menuWidth - viewportPadding),
      ),
      y: Math.max(
        viewportPadding,
        Math.min(y, window.innerHeight - menuHeight - viewportPadding),
      ),
    });
  }

  function downloadRoster() {
    const blob = new Blob([exportRoster(roster)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rift-roster.json";
    link.click();
    URL.revokeObjectURL(url);
    setTransferMessage(`Exported ${roster.length} players.`);
  }

  async function uploadRoster(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) {
      return;
    }

    try {
      const imported = importRoster(await file.text());
      if (!imported.ok) {
        setTransferMessage(imported.error);
        return;
      }

      dispatch({ type: "replace", players: imported.players });
      setTransferMessage(`Imported ${imported.players.length} players.`);
    } catch {
      setTransferMessage("The selected roster file could not be read.");
    }
  }

  function runBalance() {
    const selectedPlayers = roster.filter((player) => player.in);
    if (selectedPlayers.length !== 10) {
      return;
    }

    try {
      const candidates = rankBalanceCandidates(selectedPlayers);
      const cohortKey = balanceCohortKey(selectedPlayers);
      let history: BalanceHistory = {};

      try {
        history = parseBalanceHistory(
          localStorage.getItem(BALANCE_HISTORY_STORAGE_KEY),
        );
      } catch {
        setStorageError(true);
      }

      const selection = chooseFreshBalance(
        candidates,
        history[cohortKey] ?? [],
      );

      try {
        const updatedHistory = addRecentSplit(
          history,
          cohortKey,
          selection.signature,
        );
        localStorage.setItem(
          BALANCE_HISTORY_STORAGE_KEY,
          serializeBalanceHistory(updatedHistory),
        );
      } catch {
        setStorageError(true);
      }

      setBalanceResult(selection.result);
      setOptimalBalanceCost(selection.optimalCost);
      setEligibleBalanceCount(selection.eligibleCandidates);
      setBalanceHistoryExhausted(selection.historyExhausted);
      setResultError(null);
      setShowBalancePreview(true);
    } catch {
      setResultError("The selected roster could not be balanced.");
    }
  }

  function runAramShuffle() {
    const selectedPlayers = roster.filter((player) => player.in);
    if (selectedPlayers.length !== 10) {
      return;
    }

    try {
      setAramTeams(shuffleAramTeams(selectedPlayers));
      setResultError(null);
    } catch {
      setResultError("The selected roster could not be shuffled.");
    }
  }

  const availableSecondaryRoles = draft.mainRole
    ? ROLES.filter((role) => role !== draft.mainRole)
    : [];
  const isFill =
    availableSecondaryRoles.length === ROLES.length - 1 &&
    availableSecondaryRoles.every((role) =>
      draft.secondaryRoles.includes(role),
    );
  const storageBytes = new TextEncoder().encode(storageSnapshot).byteLength;
  const storedPlayerCount = parseRoster(storageSnapshot).length;

  return (
    <main className="app-shell">
      <aside className="side-navigation">
        <div className="nav-brand">
          <span className="nav-mark" aria-hidden="true">
            RR
          </span>
          <div>
            <strong>Rift Roster</strong>
            <span>Command console</span>
          </div>
        </div>

        <nav aria-label="Organizer navigation">
          <p>Workspace</p>
          <button
            className={`nav-tab${activeView === "roster" ? " is-active" : ""}`}
            type="button"
            aria-current={activeView === "roster" ? "page" : undefined}
            onClick={() => setActiveView("roster")}
          >
            <span aria-hidden="true">01</span>
            Roster Management
          </button>
          <button className="nav-tab" type="button" disabled>
            <span aria-hidden="true">02</span>
            Match History
          </button>
          <button
            className={`nav-tab${activeView === "settings" ? " is-active" : ""}`}
            type="button"
            aria-current={activeView === "settings" ? "page" : undefined}
            onClick={() => setActiveView("settings")}
          >
            <span aria-hidden="true">03</span>
            Draft Settings
          </button>
        </nav>

        <p className="nav-version">Summoner Split · v0.4</p>
      </aside>

      <div className="organizer-workspace">
        {storageError ? (
          <p className="storage-warning" role="status">
            Roster changes cannot be saved in this browser.
          </p>
        ) : null}
        <header className="app-header">
          <div>
            <p className="eyebrow">
              {activeView === "roster" ? "Summoner Split" : "Admin tools"}
            </p>
            <h1>{activeView === "roster" ? "Rift Roster" : "Draft Settings"}</h1>
            <p className="app-intro">
              {activeView === "roster"
                ? "Assemble the roster. Command the fairest possible split."
                : "Configure and seed the organizer workspace for development."}
            </p>
          </div>
          {activeView === "roster" ? (
            <div
              className={`playing-count${playingCount === 10 ? " is-ready" : ""}`}
            >
              <strong>{playingCount}</strong>
              <span>/ 10 playing</span>
            </div>
          ) : null}
        </header>

        {activeView === "roster" ? (
          <section className="roster-panel" aria-labelledby="roster-heading">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Organizer console</p>
                <h2 id="roster-heading">Player pool</h2>
              </div>
              <div className="section-actions">
                <button
                  className="roster-transfer-button"
                  type="button"
                  onClick={() => importInputRef.current?.click()}
                >
                  Import
                </button>
                <input
                  ref={importInputRef}
                  className="visually-hidden"
                  type="file"
                  accept="application/json,.json"
                  onChange={uploadRoster}
                />
                <button
                  className="roster-transfer-button"
                  type="button"
                  onClick={downloadRoster}
                >
                  Export
                </button>
                {playingCount === 10 ? (
                  <>
                    <button
                      className="aram-shuffle"
                      type="button"
                      onClick={runAramShuffle}
                    >
                      Shuffle ARAM
                    </button>
                    <button
                      className="balance-teams"
                      type="button"
                      onClick={runBalance}
                    >
                      Balance Teams
                    </button>
                  </>
                ) : null}
                <button className="add-player" type="button" onClick={openDialog}>
                  <span aria-hidden="true">+</span> Add player
                </button>
              </div>
            </div>

            {transferMessage ? (
              <p className="transfer-message" role="status">
                {transferMessage}
              </p>
            ) : null}
            {resultError ? (
              <p className="result-error" role="alert">
                {resultError}
              </p>
            ) : null}

            {roster.length === 0 ? (
              <div className="empty-roster">
                <PlayerPlusIcon />
                <p>No players registered</p>
                <span>Add a summoner to begin building your roster.</span>
              </div>
            ) : (
              <div className="roster-table">
                <div className="roster-header" aria-hidden="true">
                  <span />
                  <span>#</span>
                  <span>Player</span>
                  <span>Rank</span>
                  <span>Main role</span>
                  <span>Secondary</span>
                  <span>Record</span>
                  <span>Status</span>
                </div>
                <ol className="roster-list">
                  {roster.map((player, index) => (
                    <PlayerRow
                      key={player.id}
                      player={player}
                      position={index + 1}
                      toggleAvailability={(id) =>
                        dispatch({ type: "toggle-availability", id })
                      }
                      openPlayerMenu={openPlayerMenu}
                    />
                  ))}
                </ol>
                {playerMenu ? (
                  <div
                    className="player-context-menu"
                    role="menu"
                    aria-label={`Actions for ${playerMenu.player.name}`}
                    style={{ left: playerMenu.x, top: playerMenu.y }}
                    onPointerDown={(event) => event.stopPropagation()}
                  >
                    <button type="button" role="menuitem" disabled>
                      Edit
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        const selectedPlayer = playerMenu.player;
                        setPlayerMenu(null);
                        removePlayer(selectedPlayer);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>
        ) : (
          <div className="settings-stack">
            <section className="settings-panel" aria-labelledby="scenarios-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Known edge cases</p>
                  <h2 id="scenarios-heading">Scenario presets</h2>
                </div>
              </div>
              <div className="scenario-grid">
                {SCENARIO_PRESETS.map((scenario) => (
                  <button
                    key={scenario.id}
                    type="button"
                    onClick={() => loadScenario(scenario.id)}
                  >
                    <strong>{scenario.name}</strong>
                    <span>{scenario.description}</span>
                  </button>
                ))}
              </div>
              <p className="destructive-note">
                Loading a scenario replaces the current player pool.
              </p>
            </section>

            <section className="settings-panel" aria-labelledby="selection-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Availability controls</p>
                  <h2 id="selection-heading">Selection presets</h2>
                </div>
                <span className="generated-count">{playingCount} selected</span>
              </div>
              <div className="preset-actions">
                <button type="button" onClick={() => selectPlayers("random")}>
                  Random 10
                </button>
                <button type="button" onClick={() => selectPlayers("strongest")}>
                  Strongest 10
                </button>
                <button type="button" onClick={() => selectPlayers("weakest")}>
                  Weakest 10
                </button>
                <button type="button" onClick={() => selectPlayers("invert")}>
                  Invert selection
                </button>
                <button type="button" onClick={() => selectPlayers("clear")}>
                  Clear selection
                </button>
              </div>
            </section>

            <section className="settings-panel" aria-labelledby="generator-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Disposable data</p>
                  <h2 id="generator-heading">Random roster generator</h2>
                </div>
                <span className="generated-count">{generatedCount} generated</span>
              </div>
              <div className="settings-content">
                <p>
                  Add randomized entries or remove generated entries without
                  touching manually entered players.
                </p>
                <label className="admin-count-field">
                  <span>Player quantity</span>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    placeholder="1"
                    value={randomPlayerCount}
                    onChange={(event) => {
                      if (event.currentTarget.value === "") {
                        setRandomPlayerCount("");
                        return;
                      }
                      const value = Number.parseInt(event.currentTarget.value, 10);
                      setRandomPlayerCount(
                        Number.isFinite(value)
                          ? Math.min(50, Math.max(1, value))
                          : 1,
                      );
                    }}
                  />
                </label>
                <div className="admin-actions">
                  <button type="button" onClick={addGeneratedPlayers}>
                    Add random players
                  </button>
                  <button
                    className="remove-generated"
                    type="button"
                    disabled={generatedCount === 0}
                    onClick={removeGeneratedPlayers}
                  >
                    Remove random players
                  </button>
                </div>
              </div>
            </section>

            <section className="settings-panel" aria-labelledby="storage-heading">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Persistence diagnostics</p>
                  <h2 id="storage-heading">Storage inspector</h2>
                </div>
              </div>
              <div className="storage-content">
                <dl className="storage-stats">
                  <div>
                    <dt>Storage key</dt>
                    <dd>{ROSTER_STORAGE_KEY}</dd>
                  </div>
                  <div>
                    <dt>Payload size</dt>
                    <dd>{storageBytes} bytes</dd>
                  </div>
                  <div>
                    <dt>Parsed players</dt>
                    <dd>{storedPlayerCount}</dd>
                  </div>
                </dl>
                <textarea
                  readOnly
                  aria-label="Raw roster storage JSON"
                  value={storageSnapshot}
                />
                <div className="admin-actions storage-actions">
                  <button type="button" onClick={copyStorage}>
                    {copyStatus}
                  </button>
                  <button type="button" onClick={reloadStorage}>
                    Reload from storage
                  </button>
                  <button className="remove-generated" type="button" onClick={corruptStorage}>
                    Corrupt storage
                  </button>
                  <button className="remove-generated" type="button" onClick={clearStorage}>
                    Clear storage
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {showBalancePreview && balanceResult ? (
        <BalancePreviewDialog
          result={balanceResult}
          optimalCost={optimalBalanceCost}
          eligibleCandidates={eligibleBalanceCount}
          historyExhausted={balanceHistoryExhausted}
          onClose={() => setShowBalancePreview(false)}
          onRebalance={runBalance}
        />
      ) : null}

      {aramTeams ? (
        <AramResultsDialog
          teams={aramTeams}
          onClose={() => setAramTeams(null)}
          onShuffle={runAramShuffle}
        />
      ) : null}

      <dialog
        ref={dialogRef}
        className="player-dialog"
        aria-labelledby="add-player-title"
        onClick={closeFromBackdrop}
      >
        <form className="player-form" onSubmit={addPlayer}>
          <header className="dialog-header">
            <div className="dialog-icon">
              <PlayerPlusIcon />
            </div>
            <div>
              <h2 id="add-player-title">Add Player</h2>
              <p>Add a player to your roster.</p>
            </div>
            <button
              className="close-dialog"
              type="button"
              aria-label="Close add player dialog"
              onClick={closeDialog}
            >
              ×
            </button>
          </header>

          <div className="dialog-fields">
            <label className="modal-field modal-field--wide">
              <span>Player name *</span>
              <input
                autoFocus
                required
                type="text"
                placeholder="Enter player name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.currentTarget.value })
                }
              />
            </label>

            <label className="modal-field">
              <span>Current rank *</span>
              <select
                required
                value={draft.rank}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    rank: Number(event.currentTarget.value) as RankIndex,
                  })
                }
              >
                {RANKS.map((rank, index) => (
                  <option key={rank.bucket} value={index}>
                    {rank.bucket}
                  </option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>
                Peak rank <em>(Optional)</em>
              </span>
              <select
                value={draft.peakRank}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    peakRank:
                      event.currentTarget.value === ""
                        ? ""
                        : (Number(event.currentTarget.value) as RankIndex),
                  })
                }
              >
                <option value="">No peak rank</option>
                {RANKS.map((rank, index) => (
                  <option key={rank.bucket} value={index}>
                    {rank.bucket}
                  </option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>Main role *</span>
              <select
                required
                value={draft.mainRole}
                onChange={(event) => {
                  const mainRole = event.currentTarget.value as Role | "";
                  setDraft({
                    ...draft,
                    mainRole,
                    secondaryRoles: draft.secondaryRoles.filter(
                      (role) => role !== mainRole,
                    ),
                  });
                }}
              >
                <option value="" disabled>
                  Select main role
                </option>
                {ROLES.map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </label>

            <label className="modal-field">
              <span>
                Secondary role <em>(Optional)</em>
              </span>
              <select
                disabled={!draft.mainRole}
                value={isFill ? "Fill" : (draft.secondaryRoles[0] ?? "")}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setDraft({
                    ...draft,
                    secondaryRoles:
                      value === "Fill"
                        ? [...availableSecondaryRoles]
                        : value
                          ? [value as Role]
                          : [],
                  });
                }}
              >
                <option value="">
                  {draft.mainRole
                    ? "Select secondary role"
                    : "Select a main role first"}
                </option>
                {availableSecondaryRoles.map((role) => (
                  <option key={role}>{role}</option>
                ))}
                {draft.mainRole ? <option value="Fill">Fill</option> : null}
              </select>
            </label>
          </div>

          <footer className="dialog-actions">
            <button
              className="cancel-dialog"
              type="button"
              onClick={closeDialog}
            >
              Cancel
            </button>
            <button className="confirm-player" type="submit">
              Add Player
            </button>
          </footer>
        </form>
      </dialog>
    </main>
  );
}
