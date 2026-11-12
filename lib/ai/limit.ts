export const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 100);
export const since24h = () => new Date(Date.now() - 864e5).toISOString();
