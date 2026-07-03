import CreatorNavBar from './CreatorNavBar';

export default function AdminNav() {
  return (
    <CreatorNavBar basePath="/admin" loginPath="/admin/login" showUsers playLabel="Player View ↗" />
  );
}
