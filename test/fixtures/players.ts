import type { Player, Role } from "@/engine/types";

const ALL_ROLES: Role[] = ["Top", "Jungle", "Mid", "ADC", "Support"];

function fillRolesExcept(mainRole: Role): Role[] {
  return ALL_ROLES.filter((role) => role !== mainRole);
}

export const playerPool: Player[] = [
  {
    id: "an",
    name: "An",
    rank: 4, // Emerald
    peak: 5, // Master 10 LP → Diamond+ bucket
    mainRole: "Jungle",
    secondaryRoles: ["Support"],
    wins: 0,
    games: 0,
  },
  {
    id: "quang-huu",
    name: "Quang Huu",
    rank: 3, // Platinum
    mainRole: "ADC",
    secondaryRoles: ["Mid"],
    wins: 0,
    games: 0,
  },
  {
    id: "hai-son",
    name: "Hai Son",
    rank: 4, // Emerald
    mainRole: "Top",
    secondaryRoles: ["Jungle"],
    wins: 0,
    games: 0,
  },
  {
    id: "xuan-quang",
    name: "Xuan Quang",
    rank: 1, // Silver
    mainRole: "Jungle",
    secondaryRoles: ["ADC"],
    wins: 0,
    games: 0,
  },
  {
    id: "the-duy",
    name: "The Duy",
    rank: 4, // Emerald
    peak: 5, // Diamond 1 → Diamond+ bucket
    mainRole: "ADC",
    secondaryRoles: fillRolesExcept("ADC"),
    wins: 0,
    games: 0,
  },
  {
    id: "khuong-duy",
    name: "Khuong Duy",
    rank: 1, // Silver
    mainRole: "Top",
    secondaryRoles: ["Jungle"],
    wins: 0,
    games: 0,
  },
  {
    id: "viet-long",
    name: "Viet Long",
    rank: 4, // Emerald
    mainRole: "Mid",
    secondaryRoles: ["Top"],
    wins: 0,
    games: 0,
  },
  {
    id: "trung-thanh",
    name: "Trung Thanh",

    // Provisional Silver baseline because he is currently unranked and rusty.
    // His old Diamond 4 peak still contributes through the peak blend.
    rank: 1,
    peak: 5,
    mainRole: "Mid",
    secondaryRoles: fillRolesExcept("Mid"),
    wins: 0,
    games: 0,
  },
  {
    id: "van-thu",
    name: "Van Thu",

    // Conservative provisional baseline: currently unranked, no known peak,
    // and has not played recently.
    rank: 0,
    mainRole: "Support",
    secondaryRoles: fillRolesExcept("Support"),
    wins: 0,
    games: 0,
  },
  {
    id: "anh-son",
    name: "Anh Son",
    rank: 0, // Iron/Bronze bucket
    mainRole: "Support",
    secondaryRoles: [],
    wins: 0,
    games: 0,
  },
  {
    id: "van-hai",
    name: "Van Hai",
    rank: 1, // Silver
    mainRole: "Jungle",
    secondaryRoles: ["Support"],
    wins: 0,
    games: 0,
  },
];
