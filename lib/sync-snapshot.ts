export function toTldrawSyncSnapshot(data: unknown): unknown | undefined {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined

  const value = data as Record<string, unknown>
  if (typeof value.clock === "number" && Array.isArray(value.documents)) {
    return data
  }

  if (value.store && typeof value.store === "object" && value.schema) {
    return data
  }

  if (value.document && typeof value.document === "object" && !Array.isArray(value.document)) {
    const document = value.document as Record<string, unknown>
    if (document.store || document.schema || document.clock) {
      return value.document
    }
  }

  return undefined
}
