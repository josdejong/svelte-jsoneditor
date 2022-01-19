export async function handle({ request, resolve }) {
  return await resolve(request, {
    ssr: false
  })
}
