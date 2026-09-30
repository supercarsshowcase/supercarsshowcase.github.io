import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

/**
 * Serve seeded car thumbnails from Convex file storage. Immutable cache
 * headers — storage ids are content-addressed and never change meaning, so
 * every visitor's browser caches each thumbnail after the first view.
 */
http.route({
  pathPrefix: "/api/thumb/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const id = new URL(request.url).pathname.split("/").pop();
    if (!id) return new Response("Not found", { status: 404 });
    const storageId = id as Id<"_storage">;
    const metadata = await ctx.storage.getMetadata(storageId);
    const blob = await ctx.storage.get(storageId);
    if (!metadata || !blob) return new Response("Not found", { status: 404 });
    return new Response(blob, {
      headers: {
        "Content-Type": metadata.contentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }),
});

export default http;
