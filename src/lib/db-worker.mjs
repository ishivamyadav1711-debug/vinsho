import { runAsWorker } from 'synckit';
import { createClient } from '@libsql/client';

let client;
let currentTx = null;

runAsWorker(async (action, ...args) => {
  try {
    if (action === 'init') {
      const url = args[0] || 'file:data/vinsho.db';
      client = createClient({ url, authToken: args[1] });
      return true;
    }
    if (action === 'begin') {
      currentTx = await client.transaction();
      return true;
    }
    if (action === 'commit') {
      if (currentTx) {
        await currentTx.commit();
        currentTx = null;
      }
      return true;
    }
    if (action === 'rollback') {
      if (currentTx) {
        await currentTx.rollback();
        currentTx = null;
      }
      return true;
    }
    if (action === 'execute') {
      const target = currentTx ? currentTx : client;
      const res = await target.execute(args[0]);
      return {
        rows: res.rows,
        lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : undefined,
        rowsAffected: res.rowsAffected
      };
    }
    if (action === 'executeMultiple') {
      const target = currentTx ? currentTx : client;
      await target.executeMultiple(args[0]);
      return true;
    }
  } catch (err) {
    if (currentTx && action !== 'rollback') {
      await currentTx.rollback().catch(() => {});
      currentTx = null;
    }
    throw err;
  }
});
