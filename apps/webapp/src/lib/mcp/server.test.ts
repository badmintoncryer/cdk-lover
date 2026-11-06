import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { describe, expect, it } from 'vitest';
import { createMcpServer, type Caller } from './server';

async function toolNames(caller: Caller) {
  const server = createMcpServer(caller);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: 'test', version: '0' });
  await client.connect(b);
  const { tools } = await client.listTools();
  await client.close();
  return tools.map((t) => t.name);
}

const participant: Caller = {
  kind: 'participant',
  participant: {
    session: {
      id: '1130',
      title: 'CDK Lover',
      passphraseHash: 'h',
      status: 'open',
      summaryEn: null,
      summaryJa: null,
      summaryCount: 0,
      translateCount: null,
      summarizedAt: null,
      createdAt: new Date(0),
    },
    authorKey: 'a',
    voterKey: 'v',
    ownerKey: 'o',
  },
};

describe('createMcpServer', () => {
  it('never lists admin tools for a participant', async () => {
    const names = await toolNames(participant);
    expect(names).toContain('post_opinion');
    expect(names).toContain('save_profile');
    expect(names.filter((n) => n.startsWith('admin_'))).toEqual([]);
  });

  it('lists the admin page operations for the admin', async () => {
    const names = await toolNames({ kind: 'admin' });
    expect(names).toEqual(
      expect.arrayContaining([
        'admin_list_sessions',
        'admin_upsert_session',
        'admin_add_group',
        'admin_delete_opinion',
        'admin_run_summary',
        'admin_export',
        'admin_delete_session_data',
      ]),
    );
    expect(names).not.toContain('post_opinion');
  });
});
