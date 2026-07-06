import CreatorNavBar from './CreatorNavBar';

export default function AdminNav() {
  return (
    <CreatorNavBar basePath="/admin" loginPath="/login" showUsers playLabel="Player View ↗" />
  );
}
