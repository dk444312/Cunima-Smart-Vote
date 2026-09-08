/**
 * Default profile photo resolver based on user/student gender.
 * Male default photo: "/images/Profile male.jpg"
 * Female default photo: "/images/female profile.jpg"
 */
export function getUserAvatarUrl(gender?: string | null): string {
  if (!gender) return "/images/Profile male.jpg";
  const g = gender.trim().toUpperCase();
  if (
    g === "F" ||
    g === "FEMALE" ||
    g === "WOMAN" ||
    g === "GIRL" ||
    g === "FEMALE PROFILE"
  ) {
    return "/images/female profile.jpg";
  }
  return "/images/Profile male.jpg";
}
