import {DurableObject} from 'cloudflare:workers';
import synchronization from './synchronize.cjs';

const INTERVAL = 15 * 60 * 1000;
const RETRY = 5 * 60 * 1000;

export class MatchSync extends DurableObject {
  async fetch() {
    let nextRunAt = await this.ctx.storage.getAlarm();
    if (nextRunAt === null) {
      nextRunAt = Date.now() + 1000;
      await this.ctx.storage.setAlarm(nextRunAt);
    }
    return Response.json({source: 'cloudflare', nextRunAt});
  }

  async alarm() {
    const startedAt = Date.now();
    // Persist a future wake-up before network operations, including on interruption.
    await this.ctx.storage.setAlarm(startedAt + INTERVAL);
    const query = async (sql, params = []) => {
      const result = await this.env.DB.prepare(sql).bind(...params).all();
      if (!result.success) throw new Error('Database operation failed');
      return result.results;
    };
    try {
      await synchronization.synchronize({query, henrik: this.env.HENRIK_API_KEY});
      await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, startedAt + INTERVAL));
    } catch (error) {
      console.error('Scheduled match update failed:', error.message);
      await this.ctx.storage.setAlarm(Date.now() + RETRY);
    }
  }
}
