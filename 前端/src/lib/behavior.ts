export interface BehaviorRecord {
  action_type: 'view' | 'redirect' | 'generate';
  target_id: number;
  category?: string;
  title?: string;
}

export async function recordBehavior(record: BehaviorRecord): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    await fetch('/api/behavior/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        action_type: record.action_type,
        target_id: record.target_id,
        category: record.category || '综合',
        title: record.title || '',
      }),
    });
  } catch {
  }
}

export async function handleNewsRedirect(newsId: number, url: string, category?: string, title?: string): Promise<void> {
  await recordBehavior({
    action_type: 'redirect',
    target_id: newsId,
    category,
    title,
  });
  window.open(url, '_blank', 'noreferrer noopener');
}