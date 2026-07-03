import { useCreatorBase } from '../hooks/useCreatorBase';
import AdminNav from './AdminNav';
import UserNav from './UserNav';

export default function CreatorNav() {
  const basePath = useCreatorBase();
  return basePath === '/u' ? <UserNav /> : <AdminNav />;
}
