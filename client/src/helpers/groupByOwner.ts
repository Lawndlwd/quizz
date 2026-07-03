import type { Quiz, Session } from '../types';

export interface OwnerGroup<T> {
  key: string;
  userId: number | null;
  email: string | null;
  username: string;
  items: T[];
}

function sortGroups<T>(groups: OwnerGroup<T>[]): OwnerGroup<T>[] {
  return groups.sort((a, b) => {
    if (a.key === 'admin') return -1;
    if (b.key === 'admin') return 1;
    const aLabel = a.username || a.email || '';
    const bLabel = b.username || b.email || '';
    return aLabel.localeCompare(bLabel);
  });
}

function displayUsername(
  username: string | null | undefined,
  email: string | null | undefined,
  userId: number,
): string {
  if (username) return username;
  if (email) return email.split('@')[0] ?? email;
  return `User #${userId}`;
}

export function groupQuizzesByOwner(quizzes: Quiz[]): OwnerGroup<Quiz>[] {
  const map = new Map<string, OwnerGroup<Quiz>>();

  for (const quiz of quizzes) {
    const isUserOwned = quiz.owner_kind === 'user' && quiz.owner_id != null;
    const key = isUserOwned ? `user:${quiz.owner_id}` : 'admin';
    const email = isUserOwned ? (quiz.owner_email ?? null) : null;
    const username = isUserOwned
      ? displayUsername(quiz.owner_username, quiz.owner_email, quiz.owner_id as number)
      : 'Platform admin';

    if (!map.has(key)) {
      map.set(key, {
        key,
        userId: isUserOwned ? quiz.owner_id! : null,
        email,
        username,
        items: [],
      });
    }
    map.get(key)?.items.push(quiz);
  }

  return sortGroups(Array.from(map.values()));
}

export function groupSessionsByHost(sessions: Session[]): OwnerGroup<Session>[] {
  const map = new Map<string, OwnerGroup<Session>>();

  for (const session of sessions) {
    const isUserHosted = session.hosted_by_user_id != null;
    const key = isUserHosted ? `user:${session.hosted_by_user_id}` : 'admin';
    const email = isUserHosted ? (session.host_email ?? null) : null;
    const username = isUserHosted
      ? displayUsername(
          session.host_username,
          session.host_email,
          session.hosted_by_user_id as number,
        )
      : 'Platform admin';

    if (!map.has(key)) {
      map.set(key, {
        key,
        userId: isUserHosted ? session.hosted_by_user_id! : null,
        email,
        username,
        items: [],
      });
    }
    map.get(key)?.items.push(session);
  }

  return sortGroups(Array.from(map.values()));
}
