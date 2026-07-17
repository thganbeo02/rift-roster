import type { Player } from "@/engine";

export type RosterPlayerSource = "manual" | "generated";

export type RosterPlayer = Player & {
  in: boolean;
  source: RosterPlayerSource;
};

type EditableRosterPlayer = Omit<RosterPlayer, "id">;

export type RosterAction =
  | { type: "replace"; players: RosterPlayer[] }
  | { type: "add"; player: RosterPlayer }
  | { type: "add-many"; players: RosterPlayer[] }
  | {
      type: "update";
      id: string;
      changes: Partial<EditableRosterPlayer>;
    }
  | { type: "remove"; id: string }
  | { type: "remove-many"; ids: string[] }
  | { type: "set-availability"; ids: string[] }
  | { type: "toggle-availability"; id: string };

function assertUniquePlayerIds(
  roster: readonly RosterPlayer[],
  players: readonly RosterPlayer[],
): void {
  const ids = new Set(roster.map((player) => player.id));

  for (const player of players) {
    if (ids.has(player.id)) {
      throw new Error(`roster already contains player id "${player.id}"`);
    }
    ids.add(player.id);
  }
}

export function rosterReducer(
  roster: readonly RosterPlayer[],
  action: RosterAction,
): RosterPlayer[] {
  switch (action.type) {
    case "replace":
      assertUniquePlayerIds([], action.players);
      return [...action.players];

    case "add": {
      assertUniquePlayerIds(roster, [action.player]);
      return [...roster, action.player];
    }

    case "add-many":
      assertUniquePlayerIds(roster, action.players);
      return [...roster, ...action.players];

    case "update":
      return roster.map((player) =>
        player.id === action.id ? { ...player, ...action.changes } : player,
      );

    case "remove":
      return roster.filter((player) => player.id !== action.id);

    case "remove-many": {
      const removedIds = new Set(action.ids);
      return roster.filter((player) => !removedIds.has(player.id));
    }

    case "set-availability": {
      const availableIds = new Set(action.ids);
      return roster.map((player) => ({
        ...player,
        in: availableIds.has(player.id),
      }));
    }

    case "toggle-availability":
      return roster.map((player) =>
        player.id === action.id ? { ...player, in: !player.in } : player,
      );
  }
}
