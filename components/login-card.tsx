"use client"

import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
} from "react"
import { signIn } from "next-auth/react"

import { EyeFollowButton } from "@/components/ui/eye-follow-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.28-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.28 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12 24 5.37 18.63 0 12 0Z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.55-5.17 3.55-8.65Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.47 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.63H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.37l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.36.61 4.61 1.8l3.45-3.45C17.95 1.09 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.63l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  )
}

function messageForAuthError(error: string | null | undefined) {
  switch (error) {
    case "OAuthAccountNotLinked":
      return "This Google or GitHub login is already connected to a different Drawnix account. Sign out, then try the provider you used originally."
    case "UnverifiedEmail":
      return "Google and GitHub need a verified email on the account. Verify an email there, then try again."
    case "OAuthCallback":
    case "OAuthCallbackError":
    case "Callback":
      return "Sign-in was interrupted. Try Google or GitHub again."
    case "AccessDenied":
      return "Access was denied. Try another account, or grant email access and retry."
    case "OAuthSignin":
    case "OAuthCreateAccount":
      return "Could not create your account. Try the other provider, or retry in a moment."
    case "Configuration":
      return "Sign-in is misconfigured. Try again in a moment."
    default:
      return error ? "Could not sign in. Try Google or GitHub again." : null
  }
}

export function LoginCard({
  trigger,
  authError,
}: {
  trigger?: ReactElement<{ onClick?: () => void }>
  authError?: string | null
}) {
  const [open, setOpen] = useState(Boolean(authError))
  const [pending, setPending] = useState<"google" | "github" | null>(null)
  const [errorText, setErrorText] = useState(() => messageForAuthError(authError))

  useEffect(() => {
    const url = new URL(window.location.href)
    const error = url.searchParams.get("error") ?? authError ?? null
    if (!error) return
    setErrorText(messageForAuthError(error))
    setOpen(true)
  }, [authError])

  const openCard = () => setOpen(true)

  const login = async (provider: "google" | "github") => {
    setPending(provider)
    setErrorText(null)
    await signIn(provider, { callbackUrl: "/dashboard" })
  }

  return (
    <>
      {trigger && isValidElement(trigger) ? (
        cloneElement(trigger, { onClick: openCard })
      ) : (
        <EyeFollowButton onClick={openCard}>See it in action</EyeFollowButton>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="overflow-hidden bg-transparent p-0 ring-0 sm:max-w-md"
          showCloseButton
        >
          <Card className="w-full shadow-xl ring-foreground/15">
            <CardHeader>
              <DialogHeader>
                <DialogTitle>Log in to Drawnix</DialogTitle>
                <DialogDescription>
                  Continue to start thinking, drawing, and collaborating.
                </DialogDescription>
              </DialogHeader>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {errorText ? (
                <p
                  role="alert"
                  className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
                >
                  {errorText}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full gap-2"
                disabled={pending !== null}
                onClick={() => login("google")}
              >
                <GoogleIcon className="size-4" />
                {pending === "google" ? "Connecting Google..." : "Login with Google"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 w-full gap-2"
                disabled={pending !== null}
                onClick={() => login("github")}
              >
                <GitHubIcon className="size-4" />
                {pending === "github" ? "Connecting GitHub..." : "Login with GitHub"}
              </Button>
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>
    </>
  )
}
