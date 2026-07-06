import { ArrowRight, Eye, FileText, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MainContent, Page, PageLoading, Subtitle } from '@/components/layout';
import { QuizPreviewModal } from '@/components/QuizPreviewModal';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { mapDbQuestionToImport } from '@/helpers';
import CreatorNav from '../../components/CreatorNav';
import { CompactQuizList } from '../../components/UserGroupCompactLists';
import { UserGroupPanel } from '../../components/UserGroupPanel';
import { useAuth } from '../../context/AuthContext';
import { useDialog } from '../../context/DialogContext';
import { groupQuizzesByOwner } from '../../helpers/groupByOwner';
import { useAuthFetch } from '../../hooks/useAuthFetch';
import { useCreatorBase } from '../../hooks/useCreatorBase';
import type { AppConfig, GameSettings, ImportQuestion, Quiz, Session, ThemeId } from '../../types';
import { PreGameSettingsModal } from './components/PreGameSettingsModal';

export default function Dashboard() {
  const { isSuperAdmin } = useAuth();
  const api = useAuthFetch();
  const navigate = useNavigate();
  const basePath = useCreatorBase();
  const { confirm, alert } = useDialog();
  const showGroupedByUser = basePath === '/admin' && isSuperAdmin;
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [pendingStartQuizId, setPendingStartQuizId] = useState<number | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [previewing, setPreviewing] = useState<number | null>(null);
  const [preview, setPreview] = useState<{
    title: string;
    theme?: ThemeId;
    questions: ImportQuestion[];
  } | null>(null);

  const [closing, setClosing] = useState<number | null>(null);

  const loadSessions = useCallback(async () => {
    const { ok, data } = await api.get<Session[]>('/api/admin/sessions');
    if (ok && Array.isArray(data)) setActiveSessions(data.filter((s) => s.status !== 'finished'));
  }, [api]);

  const load = useCallback(async () => {
    try {
      const [qRes, sRes] = await Promise.all([
        api.get<Quiz[]>('/api/admin/quizzes'),
        api.get<Session[]>('/api/admin/sessions'),
      ]);
      if (qRes.ok && Array.isArray(qRes.data)) setQuizzes(qRes.data);
      if (sRes.ok && Array.isArray(sRes.data)) {
        setActiveSessions(sRes.data.filter((s) => s.status !== 'finished'));
      }
    } finally {
      setLoading(false);
    }
  }, [api]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    load();
    pollRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') loadSessions();
    }, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load, loadSessions]);

  async function forceClose(sessionId: number) {
    const ok = await confirm({
      title: 'Force-close session?',
      message: 'All connected players will be disconnected.',
      confirmText: 'Force-close',
      variant: 'danger',
    });
    if (!ok) return;
    setClosing(sessionId);
    await api.post(`/api/admin/sessions/${sessionId}/force-end`);
    setClosing(null);
    loadSessions();
  }

  async function handleStartClick(quizId: number) {
    if (!appConfig) {
      const { ok, data } = await api.get<AppConfig>('/api/admin/config');
      if (!ok || !data) {
        await alert({ message: 'Could not load game settings. Please try again.' });
        return;
      }
      setAppConfig(data);
    }
    setPendingStartQuizId(quizId);
    setShowSettingsModal(true);
  }

  async function confirmStart(gameSettings: GameSettings) {
    if (!pendingStartQuizId) return;
    setStarting(pendingStartQuizId);
    setShowSettingsModal(false);
    const { ok, data } = await api.post<{ id: number }>('/api/admin/sessions', {
      quizId: pendingStartQuizId,
    });
    setStarting(null);
    setPendingStartQuizId(null);
    if (ok) {
      sessionStorage.setItem(`gameSettings:${data.id}`, JSON.stringify(gameSettings));
      navigate(`${basePath}/game/${data.id}`);
    }
  }

  async function deleteQuiz(id: number) {
    const ok = await confirm({
      title: 'Delete quiz?',
      message: 'This permanently deletes the quiz and all its data.',
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (!ok) return;
    setDeleting(id);
    await api.delete(`/api/admin/quizzes/${id}`);
    setDeleting(null);
    load();
  }

  async function openPreview(id: number) {
    setPreviewing(id);
    const { ok, data } = await api.get<{ title: string; theme?: ThemeId; questions: unknown[] }>(
      `/api/admin/quizzes/${id}`,
    );
    setPreviewing(null);
    if (!ok) return;
    setPreview({
      title: data.title,
      theme: data.theme,
      questions: (data.questions ?? []).map((q) =>
        mapDbQuestionToImport(q as Parameters<typeof mapDbQuestionToImport>[0]),
      ),
    });
  }

  const quizGroups = useMemo(
    () => (showGroupedByUser ? groupQuizzesByOwner(quizzes) : []),
    [showGroupedByUser, quizzes],
  );

  function renderQuizRow(q: Quiz) {
    return (
      <tr key={q.id} className="border-b border-border last:border-0">
        <td className="px-4 py-3">
          <div className="font-semibold">{q.title}</div>
          {q.description && (
            <div className="mt-1 max-w-[360px] truncate text-sm text-muted-foreground">
              {q.description}
            </div>
          )}
        </td>
        <td className="px-4 py-3">{q.question_count} Q</td>
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {new Date(q.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="success"
              size="sm"
              onClick={() => handleStartClick(q.id)}
              disabled={starting === q.id}
            >
              {starting === q.id ? (
                '…'
              ) : (
                <span className="flex items-center gap-1.5">
                  <Play className="size-4" /> Start
                </span>
              )}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => openPreview(q.id)}
              disabled={previewing === q.id}
              title="Preview how this quiz looks — no session needed"
            >
              {previewing === q.id ? (
                '…'
              ) : (
                <span className="flex items-center gap-1.5">
                  <Eye className="size-4" /> Preview
                </span>
              )}
            </Button>
            <Button variant="secondary" size="sm" asChild>
              <Link to={`${basePath}/quiz/${q.id}/edit`}>
                <span className="flex items-center gap-1.5">
                  <Pencil className="size-4" /> Edit
                </span>
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => deleteQuiz(q.id)}
              disabled={deleting === q.id}
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  if (loading) return <PageLoading />;

  return (
    <Page>
      <CreatorNav />
      <MainContent>
        {activeSessions.length > 0 && (
          <Card className="mb-6 border-blue-500/30 bg-blue-500/[0.05]">
            <CardContent className="flex flex-col gap-3 p-5">
              <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </span>
                {activeSessions.length} open session{activeSessions.length > 1 ? 's' : ''}
              </span>
              <div className="flex flex-col gap-2.5">
                {activeSessions.map((s) => (
                  <div
                    key={s.id}
                    className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <StatusBadge status={s.status} className="shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-semibold">{s.quiz_title}</span>
                    <span className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 font-mono text-sm tracking-wider text-blue-400">
                      <span className="text-[0.7rem] font-sans uppercase tracking-wide text-muted-foreground">
                        PIN
                      </span>
                      {s.pin}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => navigate(`${basePath}/game/${s.id}`)}
                      >
                        <span className="flex items-center gap-1.5">
                          Resume <ArrowRight className="size-4" />
                        </span>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => forceClose(s.id)}
                        disabled={closing === s.id}
                        title="Force-close this session"
                        className="text-destructive hover:bg-destructive/10"
                      >
                        {closing === s.id ? '…' : <X className="size-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1>{showGroupedByUser ? 'All Quizzes' : 'My Quizzes'}</h1>
            <Subtitle>
              {quizzes.length} quiz{quizzes.length !== 1 ? 'zes' : ''} total
              {showGroupedByUser && quizGroups.length > 0
                ? ` · ${quizGroups.length} user${quizGroups.length !== 1 ? 's' : ''}`
                : ''}
            </Subtitle>
          </div>
          <Button size="lg" asChild>
            <Link to={`${basePath}/quiz/new`}>
              <span className="flex items-center gap-1.5">
                <Plus className="size-4" /> Create Quiz
              </span>
            </Link>
          </Button>
        </div>

        {quizzes.length === 0 ? (
          <Card>
            <CardContent className="px-8 py-16 text-center">
              <FileText className="mx-auto mb-3 size-10 text-muted-foreground" />
              <h2>No quizzes yet</h2>
              <Subtitle className="mt-2 mb-6">Create your first quiz to get started</Subtitle>
              <Button size="lg" asChild>
                <Link to={`${basePath}/quiz/new`}>Create Quiz</Link>
              </Button>
            </CardContent>
          </Card>
        ) : showGroupedByUser ? (
          <div className="flex flex-col gap-4">
            {quizGroups.map((group, index) => (
              <UserGroupPanel
                key={group.key}
                email={group.email}
                username={group.username}
                count={group.items.length}
                countLabel={group.items.length === 1 ? 'quiz' : 'quizzes'}
                defaultOpen={index === 0}
              >
                <CompactQuizList
                  items={group.items}
                  basePath={basePath}
                  starting={starting}
                  deleting={deleting}
                  previewing={previewing}
                  onStart={handleStartClick}
                  onDelete={deleteQuiz}
                  onPreview={openPreview}
                />
              </UserGroupPanel>
            ))}
          </div>
        ) : (
          <>
            <Card className="w-full max-w-6xl overflow-hidden md:hidden">
              <CompactQuizList
                items={quizzes}
                basePath={basePath}
                starting={starting}
                deleting={deleting}
                previewing={previewing}
                onStart={handleStartClick}
                onDelete={deleteQuiz}
                onPreview={openPreview}
              />
            </Card>
            <Card className="hidden w-full max-w-6xl overflow-hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Title</th>
                      <th className="px-4 py-3 font-medium">Questions</th>
                      <th className="px-4 py-3 font-medium">Created</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>{quizzes.map(renderQuizRow)}</tbody>
                </table>
              </div>
            </Card>
          </>
        )}
      </MainContent>

      {showSettingsModal && appConfig && (
        <PreGameSettingsModal
          config={appConfig}
          onConfirm={confirmStart}
          onCancel={() => {
            setShowSettingsModal(false);
            setPendingStartQuizId(null);
          }}
        />
      )}

      {preview && (
        <QuizPreviewModal
          title={preview.title}
          questions={preview.questions}
          theme={preview.theme}
          onClose={() => setPreview(null)}
        />
      )}
    </Page>
  );
}
