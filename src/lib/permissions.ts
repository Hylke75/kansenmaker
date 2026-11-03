import type { Role } from "./types";

/** Rechtenmatrix uit §5 van het functioneel ontwerp. Rechten gelden alleen binnen het project. */
export type Permission =
  | "idee.toevoegen"
  | "idee.eigenWijzigen"
  | "idee.aanvullen"
  | "bijdragen.modereren"
  | "concepten.beheren"
  | "concepten.klaarVoorProefBevestigen"
  | "sessies.begeleiden"
  | "gebruikers.uitnodigen"
  | "project.instellingen"
  | "gebruikers.rechten";

const matrix: Record<Permission, Role[]> = {
  "idee.toevoegen": ["deelnemer", "redacteur", "begeleider", "beheerder"],
  "idee.eigenWijzigen": ["deelnemer", "redacteur", "begeleider", "beheerder"],
  "idee.aanvullen": ["deelnemer", "redacteur", "begeleider", "beheerder"],
  "bijdragen.modereren": ["redacteur", "beheerder"],
  "concepten.beheren": ["redacteur", "begeleider", "beheerder"],
  "concepten.klaarVoorProefBevestigen": ["beheerder"],
  "sessies.begeleiden": ["begeleider", "beheerder"],
  "gebruikers.uitnodigen": ["begeleider", "beheerder"],
  "project.instellingen": ["beheerder"],
  "gebruikers.rechten": ["beheerder"],
};

export function can(role: Role | undefined, permission: Permission): boolean {
  if (!role) return false;
  return matrix[permission].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  deelnemer: "Deelnemer",
  redacteur: "Redacteur",
  begeleider: "Begeleider",
  beheerder: "Beheerder",
};

export const ROLES: Role[] = ["deelnemer", "redacteur", "begeleider", "beheerder"];
