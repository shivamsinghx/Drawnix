export function allowedOrigins(env: Env): string[] {
  return env.APP_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
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
