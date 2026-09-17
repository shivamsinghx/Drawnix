import { spawn } from "node:child_process"

const children = [
  spawn("npm", ["run", "dev:next"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  }),
  spawn("npm", ["run", "sync:dev"], {
    stdio: "inherit",
    shell: true,
    env: process.env,
  }),
]

function shutdown() {
  for (const child of children) {
    if (!child.killed) child.kill()
  }
}

process.on("SIGINT", shutdown)
process.on("SIGTERM", shutdown)
