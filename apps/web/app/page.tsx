import { SparklesText } from "@/components/ui/sparkles-text"
import { Highlighter } from "@/components/ui/highlighter"
import { EyeFollowButton } from "@/components/ui/eye-follow-button"
import { LightRays } from "@/components/ui/light-rays"

export default function Home() {
  return (
    <div className="relative flex min-h-svh flex-1 flex-col items-center justify-center overflow-hidden bg-zinc-50 font-sans dark:bg-black">
      <LightRays length="100vh" />
      <main className="relative z-10 flex flex-1 w-full flex-col items-center justify-center gap-8">
        <SparklesText className="font-sans">Drawnix</SparklesText>
        <p>
          {" "}
          <Highlighter action="underline" color="#FF9800">
            Think.
          </Highlighter>{" "}
            Draw.{" "}
          <Highlighter action="highlight" color="#C7EA46">
            Collaborate.
          </Highlighter>{" "}
            Build with AI.
        </p>
        <EyeFollowButton>See it in action</EyeFollowButton>
      </main>
    </div>
  );
}
