/**
 * Centralized UI constants previously duplicated across components.
 * Single source of truth for role colors, nav icon names, and avatar palettes.
 */

/** Role → text color token, used in the header user chip. */
export const ROLE_COLORS: Record<string, string> = {
  Admin: "var(--sem-rd-tx)",
  Manager: "var(--sem-bl-tx)",
  Operator: "var(--sem-gr-tx)",
};

/**
 * Avatar background/foreground color pairs. The full 8-pair palette is the
 * superset; screens that historically used 5 pairs should slice(0, 5) to keep
 * their existing rendered colors identical.
 */
export const AVATAR_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: "#EEEDFE", fg: "#3C3489" },
  { bg: "#E1F5EE", fg: "#085041" },
  { bg: "#FAECE7", fg: "#712B13" },
  { bg: "#E6F1FB", fg: "#0C447C" },
  { bg: "#FAEEDA", fg: "#633806" },
  { bg: "#F1EFE8", fg: "#444441" },
  { bg: "#FCEBEB", fg: "#791F1F" },
  { bg: "#FBEAF0", fg: "#72243E" },
];

/**
 * Deterministic avatar style by index, against the full 8-pair palette.
 * Matches the prior Screen20StaffList behavior (index % colors.length).
 */
export function getAvatarStyle(index: number): { bg: string; fg: string } {
  return AVATAR_PALETTE[index % AVATAR_PALETTE.length];
}
