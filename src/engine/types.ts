export const ROLES = ["Top", "Jungle", "Mid", "ADC", "Support"] as const;

export type Role = (typeof ROLES)[number];

export type RankIndex = 0 | 1 | 2 | 3 | 4 | 5;

export interface Player {
  id: string;
  name: string;
  rank: RankIndex;
  mainRole: Role;
  secondaryRoles: Role[];
  wins: number;
  games: number;

  peak?: RankIndex;
  adjust?: number;
}

export interface BalanceOptions {
  useWinRate?: boolean;
  splitTopTwo?: boolean;
  spreadWeight?: number;
  roleWeight?: number;
}

export type RolePreference = "main" | "secondary" | "off";

export interface RoleAssignment {
  player: Player;
  role: Role;
  preference: RolePreference;
  cost: number;
}

export interface RoleFitResult {
  penalty: number;
  assignments: RoleAssignment[];
}

export interface TeamEvaluation {
  players: Player[];
  effectiveScore: number;
  roleFit: RoleFitResult;
}

export interface ScoreBreakdown {
  rankDifference: number;
  spreadPenalty: number;
  rolePenalty: number;
  total: number;
}

export interface SplitEvaluation {
  teamA: TeamEvaluation;
  teamB: TeamEvaluation;
  score: ScoreBreakdown;
}

export interface BalanceResult extends SplitEvaluation {
  evaluatedSplits: number;
}
