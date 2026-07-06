import { ArrowLeft, Check, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MainContent, Page, PageLoading, Subtitle } from '@/components/layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import UserNav from '@/components/UserNav';
import { useAuthFetch } from '@/hooks/useAuthFetch';
import type { Player, Question, Session } from '@/types';

interface PlaySessionData {
  session: Session;
  myPlayerId: number;
  myRank: number | null;
  players: Player[];
  questions: Question[];
  answers: Array<{
    player_id: number;
    username: string;
    question_id: number;
    chosen_index: number;
    is_correct: number;
    score: number;
  }>;
}

export default function PlaySessionDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useAuthFetch();
  const [data, setData] = useState<PlaySessionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<PlaySessionData>(`/api/auth/play-history/${id}`)
      .then(({ ok, data: d }) => {
        if (ok && d?.session) setData(d);
        else setError('Could not load this game.');
      })
      .catch(() => setError('Could not load this game.'));
  }, [api, id]);

  if (!data) return <PageLoading nav={<UserNav />} message={error ?? 'Loading…'} />;

  const { session, myPlayerId, myRank, players, questions, answers } = data;
  const answerMap = new Map(answers.map((a) => [`${a.player_id}:${a.question_id}`, a]));
  const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score);
  const myPlayer = players.find((p) => p.id === myPlayerId);

  return (
    <Page>
      <UserNav />
      <MainContent>
        <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/u/my-games">
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="size-4" /> Back
              </span>
            </Link>
          </Button>
          <div>
            <h1>{session.quiz_title}</h1>
            <Subtitle>
              PIN <code className="font-mono text-blue-400">{session.pin}</code>
              {session.finished_at && ` · ${new Date(session.finished_at).toLocaleString()}`}
            </Subtitle>
          </div>
          <StatusBadge status={session.status} className="sm:ml-auto" />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
            <div className="text-3xl font-extrabold text-blue-400">{myRank ?? '—'}</div>
            <div className="mt-1 text-sm text-muted-foreground">Your rank</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
            <div className="text-3xl font-extrabold text-blue-400">
              {myPlayer?.total_score.toLocaleString() ?? 0}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">Your score</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
            <div className="text-3xl font-extrabold text-blue-400">{players.length}</div>
            <div className="mt-1 text-sm text-muted-foreground">Players</div>
          </div>
        </div>

        {session.status !== 'finished' && (
          <Button asChild className="mb-6">
            <Link to={`/play/game/${session.id}`}>Resume game</Link>
          </Button>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-1.5">
                <Trophy className="size-4" /> Final leaderboard
              </h2>
              <ul className="leaderboard" style={{ gap: 6 }}>
                {sortedPlayers.map((p, i) => (
                  <li
                    key={p.id}
                    className={`lb-item rank-${Math.min(i + 1, 4)} ${p.id === myPlayerId ? 'ring-2 ring-primary/40' : ''}`}
                  >
                    <div className="lb-rank">{i + 1}</div>
                    <div className="lb-name">
                      {p.username}
                      {p.id === myPlayerId && (
                        <span className="ml-1.5 text-xs text-primary">(you)</span>
                      )}
                    </div>
                    <div className="lb-score">{p.total_score.toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4">Your answers</h2>
              {questions.map((q, qi) => {
                const a = answerMap.get(`${myPlayerId}:${q.id}`);
                return (
                  <div key={q.id} className="mb-3 border-b border-border pb-3 last:border-0">
                    <div className="text-sm font-semibold">
                      Q{qi + 1}: {q.text.slice(0, 80)}
                      {q.text.length > 80 ? '…' : ''}
                    </div>
                    <div className="mt-1 text-sm">
                      {a == null ? (
                        <span className="text-muted-foreground">No answer</span>
                      ) : a.is_correct ? (
                        <span className="inline-flex items-center gap-1 text-emerald-500">
                          <Check className="size-4" /> Correct (+{a.score})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-destructive">
                          <X className="size-4" /> Wrong
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </MainContent>
    </Page>
  );
}
