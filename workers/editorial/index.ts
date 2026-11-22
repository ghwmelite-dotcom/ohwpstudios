import { generateWeeklyDraft, type EditorialEnvironment } from '../../src/lib/editorial-automation';

export default {
  async scheduled(controller: { scheduledTime: number }, env: EditorialEnvironment) {
    const result = await generateWeeklyDraft(env, new Date(controller.scheduledTime));
    console.log(JSON.stringify({ event: 'weekly_editorial', week: result.week, status: result.status, code: result.code }));
    if (result.status === 'failed') throw new Error(`Editorial generation failed: ${result.code}`);
  },
  // No production route or workers.dev address is registered.
  async fetch() { return new Response('Not found', { status: 404 }); },
};
