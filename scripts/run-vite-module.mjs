import { createServer } from 'vite'

const modulePath = process.argv[2]
if (!modulePath) throw new Error('A TypeScript module path is required.')

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  await server.ssrLoadModule(modulePath)
} finally {
  await server.close()
}
