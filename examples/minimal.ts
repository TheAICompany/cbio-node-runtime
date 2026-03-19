import { CbioIdentity } from '@the-ai-company/agent-identity-sdk';

async function main() {
  const privateKey = process.env.AGENT_PRIV_KEY!;
  const identity = await CbioIdentity.load({ privateKey });
  const agent = identity.getAgent();

  // Use the agent to call external services with automatic authentication
  const response = await agent.fetchWithAuth('my-service', 'https://api.example.com/data');
  console.log(await response.json());
}

main().catch(console.error);
