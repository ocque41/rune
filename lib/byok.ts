import { getSecret } from '@/lib/secrets-manager';

export type ModelProvider = 'openai' | 'anthropic' | 'google';

export class MissingProviderKeyError extends Error {
  constructor(
    readonly provider: ModelProvider,
    readonly attemptedRefs: string[],
  ) {
    super(
      `No ${provider} API key configured. Add your own key in Secrets and select it in the model settings.`,
    );
    this.name = 'MissingProviderKeyError';
  }
}

const DEFAULT_PROVIDER_KEY_REFS: Record<ModelProvider, string[]> = {
  openai: ['OPENAI_API_KEY'],
  anthropic: ['ANTHROPIC_API_KEY'],
  google: ['GOOGLE_API_KEY', 'GEMINI_API_KEY'],
};

export function getDefaultProviderKeyRef(provider: ModelProvider): string {
  return DEFAULT_PROVIDER_KEY_REFS[provider][0];
}

export function getProviderKeyCandidates(provider: ModelProvider, providerKeyRef?: string | null): string[] {
  const explicit = providerKeyRef?.trim();
  if (explicit) return [explicit];
  return DEFAULT_PROVIDER_KEY_REFS[provider];
}

export async function getUserProviderApiKey({
  provider,
  providerKeyRef,
  userId,
}: {
  provider: ModelProvider;
  providerKeyRef?: string | null;
  userId: string;
}): Promise<{ apiKey: string; keyRef: string }> {
  const candidates = getProviderKeyCandidates(provider, providerKeyRef);

  for (const keyRef of candidates) {
    const apiKey = await getSecret(keyRef, userId);
    if (apiKey) return { apiKey, keyRef };
  }

  throw new MissingProviderKeyError(provider, candidates);
}

export function providerFromModel(model: string): ModelProvider | null {
  if (model.startsWith('gpt-') || /^o\d/.test(model) || model.startsWith('chatgpt-')) return 'openai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gemini-')) return 'google';
  return null;
}
