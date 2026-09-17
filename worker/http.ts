function expandOrigin(origin: string): string[] {
  try {
    const url = new URL(origin)
    const hosts = new Set([url.host])
    const portSuffix = url.port ? `:${url.port}` : ""
    if (url.hostname === "localhost") {
      hosts.add(`127.0.0.1${portSuffix}`)
    }
    if (url.hostname === "127.0.0.1") {
      hosts.add(`localhost${portSuffix}`)
    }
    return [...hosts].map((host) => `${url.protocol}//${host}`)
  } catch {
    return [origin]
  }
}

export function allowedOrigins(env: Env): string[] {
  return [
    ...new Set(
      env.APP_ORIGIN.split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
        .flatMap(expandOrigin)
    ),
  ]
}

export function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("origin")
  if (!origin || !allowedOrigins(env).includes(origin)) return {}

  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    vary: "origin",
  }
}

export function jsonResponse(
  data: unknown,
  status: number,
  request: Request,
  env: Env
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(request, env),
    },
  })
}

export function rejectIfBadOrigin(request: Request, env: Env): Response | null {
  const origin = request.headers.get("origin")
  if (!origin) {
    return new Response("Unauthorized", { status: 401 })
  }
  if (!allowedOrigins(env).includes(origin)) {
    return new Response("Forbidden", { status: 403 })
  }
  return null
}
