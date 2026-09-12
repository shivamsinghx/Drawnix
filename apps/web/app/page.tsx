import { SparklesText } from "@/components/ui/sparkles-text"
import { Highlighter } from "@/components/ui/highlighter"
import { LightRays } from "@/components/ui/light-rays"
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { LoginCard } from "@/components/login-card"

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
          <Highlighter
            action="highlight"
            color="#C7EA46"
            className="text-black dark:text-black"
          >
            Collaborate.
          </Highlighter>{" "}
          Build with{" "}
          <Highlighter
            action="circle"
            color="#3B6FA0"
            strokeWidth={1.5}
            iterations={6}
            padding={5}
            animationDuration={900}
            className="ml-0 inline-flex size-6 items-center justify-center leading-none"
          >
            <span className="translate-x-px">AI</span>
          </Highlighter>
          .
        </p>
        <div className="flex flex-col items-center gap-4">
          <LoginCard />
          <AnimatedThemeToggler />
        </div>
      </main>
    </div>
  );
}
