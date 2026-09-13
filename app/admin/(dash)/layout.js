import { redirect } from 'next/navigation';
import { getAdminUser } from '../../../lib/adminAuth';
import AdminNav from './AdminNav';
import GlobalDropZone from './_components/GlobalDropZone';

// Everything in this route group is behind the sign-in gate.
export const dynamic = 'force-dynamic';

export default async function DashLayout({ children }) {
  const user = await getAdminUser();
  if (!user) redirect('/admin/login');

  return (
    <div className="admin-shell">
      <AdminNav email={user.email} />
      <main className="admin-main">
        <GlobalDropZone>{children}</GlobalDropZone>
      </main>
    </div>
  );
}
