import { copyFile, writeFile } from "node:fs/promises"
import path from "node:path"

const outDir = path.join(process.cwd(), "dist")
const indexPath = path.join(outDir, "index.html")
const notFoundPath = path.join(outDir, "404.html")

async function main() {
  await copyFile(indexPath, notFoundPath)
  await writeFile(path.join(outDir, ".nojekyll"), "", "utf8")
}

await main()
