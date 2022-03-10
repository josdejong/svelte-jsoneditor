export async function handle({ event, resolve }) {
  return await resolve(event, {
    ssr: false
  })
}
