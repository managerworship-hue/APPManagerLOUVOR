export function formatDate(iso: string): string {
  // iso like "2026-02-15" or full ISO
  try {
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

export function formatDay(iso: string): string {
  try {
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return String(d.getDate()).padStart(2, '0');
  } catch {
    return iso.slice(8, 10);
  }
}

export function formatMonth(iso: string): string {
  try {
    const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
    return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
  } catch {
    return '';
  }
}

export function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60) return 'agora';
    if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d atrás`;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}
