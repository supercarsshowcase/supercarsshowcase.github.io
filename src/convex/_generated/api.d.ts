/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminAbuse from "../adminAbuse.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as auth_usernamePassword from "../auth/usernamePassword.js";
import type * as cars from "../cars.js";
import type * as feedback from "../feedback.js";
import type * as gameSaves from "../gameSaves.js";
import type * as garage from "../garage.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as pages from "../pages.js";
import type * as presence from "../presence.js";
import type * as profile from "../profile.js";
import type * as site from "../site.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminAbuse: typeof adminAbuse;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  "auth/usernamePassword": typeof auth_usernamePassword;
  cars: typeof cars;
  feedback: typeof feedback;
  gameSaves: typeof gameSaves;
  garage: typeof garage;
  http: typeof http;
  leaderboard: typeof leaderboard;
  pages: typeof pages;
  presence: typeof presence;
  profile: typeof profile;
  site: typeof site;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
