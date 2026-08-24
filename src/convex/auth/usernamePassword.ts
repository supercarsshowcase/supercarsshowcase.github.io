import { Password } from "@convex-dev/auth/providers/Password";

/**
 * Username + password auth via the Convex Password provider.
 *
 * Maps username to a synthetic email (username@supercars.showcase)
 * for internal credential storage. The built-in flow handles hashing.
 */
export const usernamePassword = Password({
  id: "username-password",
  profile(params) {
    const username = String(params.username ?? "").trim().toLowerCase();
    if (username.length < 3) {
      throw new Error("Username must be at least 3 characters.");
    }
    // Only runs on signUp — creates the user record
    return {
      name: username,
      username,
      email: `${username}@supercars.showcase`,
    };
  },
  validatePasswordRequirements(password: string) {
    if (password.length < 4) {
      throw new Error("Password must be at least 4 characters.");
    }
  },
});
