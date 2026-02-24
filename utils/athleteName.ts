type UserLike = {
  id?: string | null;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
};

const normalizeAthleteName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const resolveAthleteNameFromUser = (user?: UserLike | null) => {
  if (!user) return "athlete";
  if (user.username) return normalizeAthleteName(user.username);
  if (user.fullName) return normalizeAthleteName(user.fullName);
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  if (fullName.trim().length > 0) return normalizeAthleteName(fullName);
  if (user.id) return normalizeAthleteName(user.id);
  return "athlete";
};
