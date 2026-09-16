import { uniqueId, type TLAssetStore } from "tldraw"

export function createSyncAssetStore(
  syncUrl: string,
  boardId: string
): TLAssetStore {
  return {
    async upload(_asset, file) {
      const tokenResponse = await fetch(`/api/boards/${boardId}/sync-token`, {
        cache: "no-store",
      })
      const payload = (await tokenResponse.json().catch(() => null)) as
        | { token?: string }
        | null
      if (!tokenResponse.ok || !payload?.token) {
        throw new Error("Could not authorize asset upload")
      }

      const objectName = `${uniqueId()}-${file.name}`.replace(
        /[^a-zA-Z0-9._-]+/g,
        "-"
      )
      const url = `${syncUrl}/api/uploads/${encodeURIComponent(boardId)}/${encodeURIComponent(objectName)}`
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${payload.token}`,
          "content-type": file.type || "application/octet-stream",
        },
        body: file,
      })

      if (!response.ok) {
        throw new Error(`Failed to upload asset: ${response.statusText}`)
      }

      return { src: url }
    },
    resolve(asset) {
      return asset.props.src
    },
  }
}
