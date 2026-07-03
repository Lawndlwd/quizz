import { QuizIntroCard } from '@/components/game/QuizIntroCard';
import { PageCenter } from '@/components/layout';
import type { QuizIntro } from '@/types';
import { AvatarDisplay } from '../../../components/AvatarPicker';

interface Props {
  username: string;
  avatar: string;
  reconnecting?: boolean;
  intro?: QuizIntro | null;
}

export function WaitingScreen({ username, avatar, reconnecting, intro }: Props) {
  const title = intro ? intro.title : reconnecting ? 'Welcome back!' : 'Get ready!';

  return (
    <PageCenter>
      <div className="mx-auto w-full max-w-[820px] px-4 py-6">
        <QuizIntroCard
          intro={intro}
          title={title}
          layout="grid"
          typesHeading="What to expect"
          footer={
            /* Pinned to the bottom of the right column */
            <div className="mt-auto pt-6">
              <div className="mb-4 h-px bg-border" />
              <div className="flex items-center gap-3">
                <AvatarDisplay
                  avatar={avatar}
                  size={44}
                  style={{ border: '3px solid var(--accent)' }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{username}</p>
                  <p className="text-sm text-muted-foreground">
                    {reconnecting ? 'Resuming your game' : 'Waiting for the host to start'}
                    <span className="dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  </p>
                </div>
                <span className="inline-block h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
              </div>
            </div>
          }
        />
      </div>
    </PageCenter>
  );
}
