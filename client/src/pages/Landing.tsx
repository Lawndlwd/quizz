import { Link } from 'react-router-dom';
import { AppLogo, AuthCard, PageCenter, Subtitle } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { useApp } from '../context/AppContext';

export default function Landing() {
  const { displayName } = useApp();

  return (
    <PageCenter>
      <AuthCard maxWidth="lg" className="max-w-[420px]">
        <div className="text-center mb-6">
          <AppLogo>{displayName}</AppLogo>
          <Subtitle className="mt-2">Real-time multiplayer quizzes</Subtitle>
        </div>
        <div className="flex flex-col gap-3">
          <Button asChild variant="default" size="lg" className="w-full">
            <Link to="/play">Play a game</Link>
          </Button>
          <Button asChild variant="secondary" size="lg" className="w-full">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="w-full">
            <Link to="/register">Create account</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="w-full text-muted-foreground">
            <Link to="/admin/login">Admin login</Link>
          </Button>
        </div>
      </AuthCard>
    </PageCenter>
  );
}
