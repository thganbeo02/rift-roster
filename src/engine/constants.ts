import type { Role } from "@/engine/types";

export const RANKS = [
  {
    bucket: "Iron/Bronze",
    score: 100,
  },
  {
    bucket: "Silver",
    score: 200,
  },
  {
    bucket: "Gold",
    score: 300,
  },
  {
    bucket: "Platinum",
    score: 400,
  },
  {
    bucket: "Emerald",
    score: 500,
  },
  {
    bucket: "Diamond+",
    score: 650,
  },
] as const;

export const ROLE_IMPACT = {
  Top: 1,
  Jungle: 1.3,
  Mid: 1.2,
  ADC: 1.05,
  Support: 0.85,
} as const satisfies Record<Role, number>;

export const ROLE_COST = {
  main: 0,
  secondary: 1,
  off: 3,
} as const;

export const DEFAULT_WEIGHTS = {
  spread: 1,
  role: 40,
} as const;

export const FORM = {
  minimumGames: 5,
  fullConfidenceGames: 20,
  maximumAdjustment: 60,
} as const;
