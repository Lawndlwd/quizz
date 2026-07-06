import { ArrowLeft, BarChart3, Check, Trophy, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MedalIcon } from '@/components/game/MedalIcon';
import { MainContent, Page, PageLoading, Subtitle } from '@/components/layout';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import CreatorNav from '../../components/CreatorNav';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useCreatorBase } from '../../hooks/useCreatorBase';
import type { Player, Question, Session } from '../../types';

interface FullSession {
  session: Session;
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

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const api = useAuthFetch();
  const basePath = useCreatorBase();
  const [data, setData] = useState<FullSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<FullSession>(`/api/admin/sessions/${id}`)
      .then(({ ok, data: d }) => {
        if (ok && d?.session) setData(d);
        else setError('Could not load this session.');
      })
      .catch(() => setError('Could not load this session.'));
  }, [api, id]);

  if (!data) return <PageLoading message={error ?? 'Loading…'} />;

  const { session, players, questions, answers } = data;
  const answerMap = new Map(answers.map((a) => [`${a.player_id}:${a.question_id}`, a]));

  const sortedPlayers = [...players].sort((a, b) => b.total_score - a.total_score);

  return (
    <Page>
      <CreatorNav />
      <MainContent>
        <div className="mb-6 flex flex-wrap items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`${basePath}/history`}>
              <span className="flex items-center gap-1.5">
                <ArrowLeft className="size-4" /> Back
              </span>
            </Link>
          </Button>
          <div>
            <h1>{session.quiz_title}</h1>
            <Subtitle>
              Session <code className="font-mono text-blue-400">#{session.id}</code> · PIN{' '}
              <code className="font-mono text-blue-400">{session.pin}</code>
              {session.finished_at && ` · ${new Date(session.finished_at).toLocaleString()}`}
            </Subtitle>
          </div>
          <StatusBadge status={session.status} className="ml-auto" />
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
            <div className="text-3xl font-extrabold text-blue-400">{players.length}</div>
            <div className="mt-1 text-sm text-muted-foreground">Players</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
            <div className="text-3xl font-extrabold text-blue-400">{questions.length}</div>
            <div className="mt-1 text-sm text-muted-foreground">Questions</div>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 p-5 text-center">
            <div className="text-3xl font-extrabold text-blue-400">
              {sortedPlayers[0]?.total_score ?? 0}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">Top Score</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-1.5">
                <Trophy className="size-4" /> Final Leaderboard
              </h2>
              <ul className="leaderboard" style={{ gap: 6 }}>
                {sortedPlayers.map((p, i) => (
                  <li key={p.id} className={`lb-item rank-${Math.min(i + 1, 4)}`}>
                    <div className="lb-rank">{i + 1}</div>
                    <div className="lb-name">{p.username}</div>
                    <div className="lb-score">{p.total_score.toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-1.5">
                <BarChart3 className="size-4" /> Question Breakdown
              </h2>
              {questions.map((q, qi) => {
                const qAnswers = players.map((p) => answerMap.get(`${p.id}:${q.id}`));
                const correct = qAnswers.filter((a) => a?.is_correct).length;
                const pct = players.length ? Math.round((correct / players.length) * 100) : 0;
                return (
                  <div key={q.id} className="mb-4">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        Q{qi + 1}: {q.text.slice(0, 60)}
                        {q.text.length > 60 ? '…' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {correct}/{players.length} ({pct}%)
                      </span>
                    </div>
                    <div className="answer-bar">
                      <div className="answer-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Correct: {q.options[q.correct_index]}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 w-full max-w-6xl overflow-hidden">
          <CardContent className="p-6 pb-0">
            <h2>Answer Matrix</h2>
            <Subtitle>Every player&apos;s answer for each question</Subtitle>
          </CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Player</th>
                  {questions.map((q, i) => (
                    <th key={q.id} className="px-4 py-3 font-medium">
                      Q{i + 1}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, pi) => (
                  <tr key={p.id} className="border-b border-border last:border-0">
                    <td className={`px-4 py-3 ${pi < 3 ? 'font-bold' : ''}`}>
                      <span className="inline-flex items-center gap-1.5">
                        <MedalIcon place={pi + 1} className="size-4" />
                        {p.username}
                      </span>
                    </td>
                    {questions.map((q) => {
                      const a = answerMap.get(`${p.id}:${q.id}`);
                      return (
                        <td key={q.id} className="px-4 py-3">
                          {a == null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : a.is_correct ? (
                            <span className="inline-flex items-center gap-1 text-emerald-500">
                              <Check className="size-4" /> +{a.score}
                            </span>
                          ) : (
                            <span className="text-destructive">
                              <X className="size-4" />
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 font-bold text-blue-400">
                      {p.total_score.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </MainContent>
    </Page>
  );
}
