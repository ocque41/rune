import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createServerSupabaseClient } from '@cumulus/auth/server';
import {
  createSecret,
  deleteSecret,
  getSecret,
  listSecretKeys,
  updateSecret,
} from '@/lib/secrets-manager';
import { getStreamWritable } from '@/lib/workflow/runtime/streams';
import { GET, POST, PUT } from '@/app/api/rune/secrets/route';
import { MissingProviderKeyError, getUserProviderApiKey } from '@/lib/byok';
import { encrypt } from '@/lib/encryption';
import {
  REDACTED_SECRET,
  assertNoInlineSecrets,
  redactSecrets,
} from '@/lib/security/secrets-policy';
import { emitNodeOutput, generateWorkflowCode } from '@/lib/workflow-generator';

vi.mock('@cumulus/auth/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/secrets-manager', () => ({
  createSecret: vi.fn(),
  deleteSecret: vi.fn(),
  getSecret: vi.fn(),
  listSecretKeys: vi.fn(),
  updateSecret: vi.fn(),
}));

vi.mock('@/lib/workflow/runtime/streams', () => ({
  getStreamWritable: vi.fn(),
}));

const createClientMock = vi.mocked(createServerSupabaseClient);
const listSecretKeysMock = vi.mocked(listSecretKeys);
const createSecretMock = vi.mocked(createSecret);
const updateSecretMock = vi.mocked(updateSecret);
const deleteSecretMock = vi.mocked(deleteSecret);
const getSecretMock = vi.mocked(getSecret);
const getStreamWritableMock = vi.mocked(getStreamWritable);

function rawOpenAIKey() {
  return 'sk-' + 'a'.repeat(32);
}

function rawGoogleKey() {
  return 'AIza' + 'b'.repeat(32);
}

function mockAuthenticatedUser(userId = 'user-1') {
  createClientMock.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId } },
        error: null,
      }),
    },
  } as any);
}

describe('secret API responses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthenticatedUser();
  });

  it('lists only secret names and metadata', async () => {
    listSecretKeysMock.mockResolvedValue(['OPENAI_API_KEY']);

    const response = await GET(new Request('http://rune.test/api/rune/secrets'));
    const body = await response.json();

    expect(body).toEqual({
      secretKeys: ['OPENAI_API_KEY'],
      secrets: [{ name: 'OPENAI_API_KEY' }],
    });
    expect(JSON.stringify(body)).not.toContain('value');
    expect(JSON.stringify(body)).not.toContain(rawOpenAIKey());
  });

  it('accepts secret values but never returns them on create or replace', async () => {
    const value = rawOpenAIKey();
    createSecretMock.mockResolvedValue();
    updateSecretMock.mockResolvedValue();

    const createResponse = await POST(
      new Request('http://rune.test/api/rune/secrets', {
        method: 'POST',
        body: JSON.stringify({ name: 'OPENAI_API_KEY', value }),
      }),
    );
    const createBody = await createResponse.json();

    expect(createSecretMock).toHaveBeenCalledWith('user-1', 'OPENAI_API_KEY', value);
    expect(JSON.stringify(createBody)).not.toContain(value);
    expect(createBody.secret).toEqual({ name: 'OPENAI_API_KEY' });

    const replaceResponse = await PUT(
      new Request('http://rune.test/api/rune/secrets', {
        method: 'PUT',
        body: JSON.stringify({ name: 'OPENAI_API_KEY', value }),
      }),
    );
    const replaceBody = await replaceResponse.json();

    expect(updateSecretMock).toHaveBeenCalledWith('user-1', 'OPENAI_API_KEY', value);
    expect(JSON.stringify(replaceBody)).not.toContain(value);
    expect(replaceBody.secret).toEqual({ name: 'OPENAI_API_KEY' });
    expect(deleteSecretMock).not.toHaveBeenCalled();
  });
});

describe('BYOK provider resolution', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('resolves provider keys through the user secret store', async () => {
    getSecretMock.mockImplementation(async (name, userId) => {
      if (name === 'MY_OPENAI_KEY' && userId === 'user-1') return rawOpenAIKey();
      return null;
    });

    await expect(
      getUserProviderApiKey({
        provider: 'openai',
        providerKeyRef: 'MY_OPENAI_KEY',
        userId: 'user-1',
      }),
    ).resolves.toEqual({ apiKey: rawOpenAIKey(), keyRef: 'MY_OPENAI_KEY' });

    expect(getSecretMock).toHaveBeenCalledWith('MY_OPENAI_KEY', 'user-1');
  });

  it('does not fall back to provider environment variables for hosted model calls', async () => {
    process.env.WORKFLOW_SECRET_OPENAI_API_KEY = rawOpenAIKey();
    getSecretMock.mockResolvedValue(null);

    await expect(
      getUserProviderApiKey({ provider: 'openai', userId: 'user-1' }),
    ).rejects.toBeInstanceOf(MissingProviderKeyError);

    expect(getSecretMock).toHaveBeenCalledWith('OPENAI_API_KEY', 'user-1');
  });
});

describe('secret encryption and policy', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('fails closed when Supabase-backed secret encryption has no key', () => {
    delete process.env.RUNE_SECRETS_ENCRYPTION_KEY;

    expect(() => encrypt('provider-key-value')).toThrow('RUNE_SECRETS_ENCRYPTION_KEY');
  });

  it('blocks inline raw provider keys and redacts logs', () => {
    expect(() =>
      assertNoInlineSecrets(
        { graph: { nodes: [{ data: { apiKey: rawGoogleKey() } }] } },
        'workflow',
      ),
    ).toThrow('workflow contains inline secret-looking values');

    expect(redactSecrets({ apiKey: rawGoogleKey(), ok: true })).toEqual({
      apiKey: REDACTED_SECRET,
      ok: true,
    });
  });
});

describe('generated workflow secret handling', () => {
  it('emits secret references and never provider environment fallbacks', () => {
    const code = generateWorkflowCode(
      'workflow-secret-test',
      [
        {
          id: 'start',
          type: 'step',
          position: { x: 0, y: 0 },
          data: { kind: 'startWorkflow', label: 'Start Workflow' },
        },
        {
          id: 'http',
          type: 'step',
          position: { x: 0, y: 120 },
          data: {
            kind: 'httpRequest',
            label: 'HTTP Request',
            httpRequest: {
              method: 'GET',
              url: 'https://api.example.com?key={{secrets.MAIL_API_KEY}}',
              headers: '{}',
              body: '{}',
            },
          },
        },
        {
          id: 'ai',
          type: 'ai',
          position: { x: 0, y: 240 },
          data: {
            aiConfig: {
              promptTemplate: 'Summarize the response',
              model: 'gemini-3-flash-preview',
              provider: 'gemini',
              providerKeyRef: 'GOOGLE_API_KEY',
            },
          },
        },
      ] as any,
      [
        { id: 'e1', source: 'start', target: 'http' },
        { id: 'e2', source: 'http', target: 'ai' },
      ] as any,
    );

    expect(code).toContain('await getSecret("MAIL_API_KEY")');
    expect(code).toContain("const keyRef = params.providerKeyRef || 'GOOGLE_API_KEY'");
    expect(code).toContain('providerKeyRef: "GOOGLE_API_KEY"');
    expect(code).not.toContain('process.env.GOOGLE_API_KEY');
    expect(code).not.toContain('process.env.OPENAI_API_KEY');
  });

  it('redacts node outputs before writing runtime logs', async () => {
    const writer = { write: vi.fn(), releaseLock: vi.fn() };
    getStreamWritableMock.mockReturnValue({ getWriter: () => writer } as any);

    await emitNodeOutput('node-1', { apiKey: rawOpenAIKey() }, 'run-1', 'step');

    const body = JSON.parse(writer.write.mock.calls[0][0]);
    expect(body.output).toEqual({ apiKey: REDACTED_SECRET });
  });
});
