import type { HostedAuthAdapter } from "~utils/hosted-auth-adapter"
import { hostedAuthAdapter } from "~utils/hosted-supabase-auth"
import type { HostedSignInData } from "~types/messages"

type HostedSignInDependencies = {
  adapter?: HostedAuthAdapter
}

export async function handleHostedSignIn(
  dependencies: HostedSignInDependencies = {}
): Promise<HostedSignInData> {
  const adapter = dependencies.adapter ?? hostedAuthAdapter
  const result = await adapter.startHostedSignIn()

  if (result.failure) {
    return {
      status: result.failure.status,
      stage: result.failure.stage,
      error: result.failure.error
    }
  }

  return {
    status: result.status,
    stage: result.stage
  }
}
