"use client"

import { useCallback, useState } from "react"
import { Share2, Trash2 } from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type AssignableRole = "editor" | "viewer"

type ShareMember = {
  userId: string
  role: "owner" | "editor" | "viewer"
  name: string
  email: string
  image: string | null
}

function displayName(name: string, email: string) {
  if (name) return name
  if (email) return email.split("@")[0] || "Member"
  return "Member"
}

function initials(name: string, email: string) {
  const source = name || email || "?"
  return source.slice(0, 1).toUpperCase()
}

function parseMembers(payload: unknown): ShareMember[] {
  if (!payload || typeof payload !== "object" || !("members" in payload)) {
    return []
  }
  const members = (payload as { members: unknown }).members
  if (!Array.isArray(members)) return []

  return members.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return []
    const row = entry as Record<string, unknown>
    const user =
      row.user && typeof row.user === "object"
        ? (row.user as Record<string, unknown>)
        : null
    const role = row.role
    const userId = typeof row.userId === "string" ? row.userId : ""
    if (!userId || (role !== "owner" && role !== "editor" && role !== "viewer")) {
      return []
    }
    return [
      {
        userId,
        role,
        name: typeof user?.name === "string" ? user.name.trim() : "",
        email: typeof user?.email === "string" ? user.email : "",
        image: typeof user?.image === "string" ? user.image : null,
      },
    ]
  })
}

function messageForAddFailure(status: number, error: string | undefined) {
  if (status === 401 || status === 403) {
    return "You don't have permission to manage this board."
  }
  if (status === 409) {
    return "User already has access to this board."
  }
  if (status === 404) {
    return "No Drawnix account found for this email."
  }
  if (status === 400 && error?.toLowerCase().includes("email")) {
    return "Enter a valid email address."
  }
  return "Something went wrong. Please try again."
}

function messageForManageFailure(status: number) {
  if (status === 401 || status === 403) {
    return "You don't have permission to manage this board."
  }
  return "Something went wrong. Please try again."
}

const selectClassName =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"

export function ShareBoardButton({
  boardId,
  boardName,
}: {
  boardId: string
  boardName: string
}) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<ShareMember[]>([])
  const [canManage, setCanManage] = useState(false)
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [pendingRemove, setPendingRemove] = useState<ShareMember | null>(null)
  const [email, setEmail] = useState("")
  const [addRole, setAddRole] = useState<AssignableRole>("editor")
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reset = () => {
    setMembers([])
    setCanManage(false)
    setLoading(false)
    setAdding(false)
    setUpdatingUserId(null)
    setRemoving(false)
    setPendingRemove(null)
    setEmail("")
    setAddRole("editor")
    setNotice(null)
    setError(null)
  }

  const loadMembers = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
      setNotice(null)
    }
    try {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        cache: "no-store",
      })
      const payload = (await response.json().catch(() => null)) as
        | { members?: unknown; error?: string }
        | null

      if (response.status === 401 || response.status === 403) {
        setCanManage(false)
        setMembers([])
        setError("You don't have permission to manage this board.")
        return
      }
      if (!response.ok) {
        setCanManage(false)
        setMembers([])
        setError("Something went wrong. Please try again.")
        return
      }

      setCanManage(true)
      setMembers(parseMembers(payload))
      if (!silent) setError(null)
    } catch {
      setCanManage(false)
      setMembers([])
      setError("Something went wrong. Please try again.")
    } finally {
      if (!silent) setLoading(false)
    }
  }, [boardId])

  const addMember = async () => {
    const nextEmail = email.trim()
    if (!nextEmail || adding || !canManage) return

    setAdding(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/boards/${boardId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nextEmail, role: addRole }),
      })
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null

      if (!response.ok) {
        setError(messageForAddFailure(response.status, payload?.error))
        return
      }

      setEmail("")
      setNotice("User added to this board.")
      await loadMembers(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setAdding(false)
    }
  }

  const changeRole = async (member: ShareMember, role: AssignableRole) => {
    if (!canManage || member.role === "owner" || member.role === role) return

    setUpdatingUserId(member.userId)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/boards/${boardId}/members/${member.userId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role }),
        }
      )
      if (!response.ok) {
        setError(messageForManageFailure(response.status))
        return
      }
      await loadMembers(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setUpdatingUserId(null)
    }
  }

  const confirmRemove = async () => {
    if (!pendingRemove || !canManage || pendingRemove.role === "owner") return

    setRemoving(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(
        `/api/boards/${boardId}/members/${pendingRemove.userId}`,
        { method: "DELETE" }
      )
      if (!response.ok) {
        setError(messageForManageFailure(response.status))
        return
      }
      setPendingRemove(null)
      await loadMembers(true)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setRemoving(false)
    }
  }

  const busy = loading || adding || updatingUserId !== null || removing

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-full"
        onClick={() => {
          setOpen(true)
          void loadMembers()
        }}
      >
        <Share2 className="size-4" />
        Share
      </Button>

      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) reset()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share {boardName}</DialogTitle>
            <DialogDescription>
              Share this board with people who already have a Drawnix account.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading members...</p>
          ) : (
            <div className="grid gap-4">
              {canManage ? (
                <div className="grid gap-2">
                  <h3 className="text-sm font-medium">People with access</h3>
                  {members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No one has been added to this board yet.
                    </p>
                  ) : (
                    <ul className="max-h-56 space-y-2 overflow-y-auto pr-1">
                      {members.map((member) => {
                      const name = displayName(member.name, member.email)
                      const isOwner = member.role === "owner"
                      return (
                        <li
                          key={member.userId}
                          className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/70 px-3 py-2"
                        >
                          <Avatar size="sm">
                            {member.image ? (
                              <AvatarImage src={member.image} alt="" />
                            ) : null}
                            <AvatarFallback>
                              {initials(member.name, member.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium leading-5">
                              {name}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {member.email || "No email"}
                            </p>
                          </div>
                          {isOwner ? (
                            <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                              Owner
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <select
                                aria-label={`Role for ${name}`}
                                className={cn(selectClassName, "w-[6.5rem]")}
                                value={member.role}
                                disabled={busy}
                                onChange={(event) => {
                                  const role = event.target.value
                                  if (role === "editor" || role === "viewer") {
                                    void changeRole(member, role)
                                  }
                                }}
                              >
                                <option value="editor">Editor</option>
                                <option value="viewer">Viewer</option>
                              </select>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`Remove ${name}`}
                                disabled={busy}
                                onClick={() => setPendingRemove(member)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          )}
                        </li>
                      )
                      })}
                    </ul>
                  )}
                </div>
              ) : null}

              {canManage ? (
                <form
                  className="grid gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void addMember()
                  }}
                >
                  <label className="text-sm font-medium" htmlFor="share-email">
                    Add people by email
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="share-email"
                      type="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                      value={email}
                      disabled={adding}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                    <div className="flex gap-2">
                      <select
                        aria-label="Permission"
                        className={cn(selectClassName, "w-full sm:w-[6.5rem]")}
                        value={addRole}
                        disabled={adding}
                        onChange={(event) => {
                          const role = event.target.value
                          if (role === "editor" || role === "viewer") {
                            setAddRole(role)
                          }
                        }}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <Button
                        type="submit"
                        disabled={adding || !email.trim()}
                        className="rounded-full"
                      >
                        {adding ? "Adding..." : "Add"}
                      </Button>
                    </div>
                  </div>
                </form>
              ) : null}

              {notice ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {notice}
                </p>
              ) : null}
              {error ? (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {pendingRemove ? (
      <Dialog
        open
        onOpenChange={(nextOpen) => {
          if (!nextOpen && !removing) setPendingRemove(null)
        }}
      >
        <DialogContent className="sm:max-w-sm" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              Remove {displayName(pendingRemove.name, pendingRemove.email)} from this board?
            </DialogTitle>
            <DialogDescription>
              They will lose access to this board. You can add them again later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={removing}
              onClick={() => setPendingRemove(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={removing}
              onClick={() => void confirmRemove()}
            >
              {removing ? "Removing..." : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      ) : null}
    </>
  )
}
