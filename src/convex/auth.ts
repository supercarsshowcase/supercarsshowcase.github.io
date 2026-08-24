// Adding username-password provider alongside existing providers.

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import { emailOtp } from "./auth/emailOtp";
import { usernamePassword } from "./auth/usernamePassword";


export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [usernamePassword, emailOtp, Anonymous],
});
