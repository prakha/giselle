import { GenerationId } from "@giselle-sdk/data-type";
import { after } from "next/server";
import { GiselleEngine, type GiselleEngineConfig } from "../core";
import {
  type FormDataRouterHandlers,
  type JsonRouterHandlers,
  createFormDataRouters,
  createJsonRouters,
  isFormDataRouterPath,
  isJsonRouterPath,
} from "../http";

interface NextGiselleEngineConfig extends GiselleEngineConfig {
  basePath: string;
}

async function getBody(
  req: Request,
): Promise<Record<string, unknown> | undefined> {
  if (!("body" in req) || !req.body || req.method !== "POST") return;

  const contentType = req.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    const text = await req.text();
    if (text.length === 0) return;
    return JSON.parse(text);
  }
  if (contentType?.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(await req.text());
    return Object.fromEntries(params);
  }
  if (contentType?.includes("multipart/form-data")) {
    const formData = await req.formData();
    const data = Object.fromEntries(formData.entries());
    return data;
  }
}

export function createHttpHandler({
  giselleEngine,
  config,
}: {
  giselleEngine: GiselleEngine;
  config: NextGiselleEngineConfig;
}) {
  const jsonRouter: JsonRouterHandlers = {} as JsonRouterHandlers;
  for (const [path, createRoute] of Object.entries(createJsonRouters)) {
    if (isJsonRouterPath(path)) {
      // @ts-expect-error
      jsonRouter[path] = createRoute(giselleEngine);
    }
  }

  const formDataRouter: FormDataRouterHandlers = {} as FormDataRouterHandlers;
  for (const [path, createRoute] of Object.entries(createFormDataRouters)) {
    if (isFormDataRouterPath(path)) {
      formDataRouter[path] = createRoute(giselleEngine);
    }
  }

  return async function httpHandler(request: Request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // Check if pathname matches /generations/{generationId}/generated-images/{filename}
    const generatedImageMatch = pathname.match(
      new RegExp(`^${basePath}/generations/([^/]+)/generated-images/([^/]+)$`),
    );
    if (generatedImageMatch) {
      const generationId = generatedImageMatch[1];
      const filename = generatedImageMatch[2];
      const file = await giselleEngine.getGeneratedImage(
        GenerationId.parse(generationId),
        filename,
      );
      return new Response(file, {
        headers: {
          "Content-Type": file.type,
          "Content-Disposition": `inline; filename="${file.name}"`,
        },
      });
    }

    const a = url.pathname.match(new RegExp(`^${basePath}(.+)`));

    const segmentString = a?.at(-1);
    if (segmentString == null)
      throw new Error(`Cannot parse action at ${pathname}`);
    const segments = segmentString
      .replace(/^\//, "")
      .split("/")
      .filter(Boolean);

    if (segments.length !== 1) {
      throw new Error(`Invalid action at ${pathname}`);
    }

    const [routerPath] = segments;

    if (config?.telemetry?.isEnabled && config?.telemetry?.waitForFlushFn) {
      after(config.telemetry.waitForFlushFn);
    }

    if (isJsonRouterPath(routerPath)) {
      return await jsonRouter[routerPath]({
        // @ts-expect-error
        input: await getBody(request),
      });
    }
    if (isFormDataRouterPath(routerPath)) {
      return await formDataRouter[routerPath]({
        // @ts-expect-error
        input: await getBody(request),
      });
    }
    throw new Error(`Invalid router path at ${pathname}`);
  };
}

export function NextGiselleEngine(config: NextGiselleEngineConfig) {
  const giselleEngine = GiselleEngine(config);
  const httpHandler = createHttpHandler({
    giselleEngine,
    config,
  });
  return {
    ...giselleEngine,
    handlers: {
      GET: httpHandler,
      POST: httpHandler,
    },
  };
}
