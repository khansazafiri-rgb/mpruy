import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AppShell from './components/AppShell';
import { PageLoader } from './components/ui';
import { useAuth } from './context/AuthContext';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Privacy from './pages/Privacy';
import Home from './pages/Home';
import Subjects from './pages/Subjects';
import SubjectDetail from './pages/SubjectDetail';
import NotFound from './pages/NotFound';

const Lab = lazy(() => import('./pages/Lab'));
const LabObject = lazy(() => import('./pages/Lab').then((m) => ({ default: m.LabObject })));
const LabPathway = lazy(() => import('./pages/Lab').then((m) => ({ default: m.LabPathway })));
const LabAdmin = lazy(() => import('./pages/admin/LabAdmin'));

const Runner = lazy(() => import('./pages/Runner'));
const History = lazy(() => import('./pages/History'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Progress = lazy(() => import('./pages/Progress'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Notifications = lazy(() => import('./pages/Notifications'));
const ChatAdmin = lazy(() => import('./pages/ChatAdmin'));
const Profile = lazy(() => import('./pages/Profile'));
const SimulasiDokter = lazy(() => import('./pages/SimulasiDokter'));
const Drilling = lazy(() => import('./pages/Drilling'));
const TutorialLatihan = lazy(() => import('./pages/TutorialLatihan'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminSummary = lazy(() => import('./pages/admin/Summary'));
const AdminSubmissions = lazy(() => import('./pages/admin/Submissions'));
const AdminQuestions = lazy(() => import('./pages/admin/Questions'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminAnnouncements = lazy(() => import('./pages/admin/Announcements'));
const AdminSubjects = lazy(() => import('./pages/admin/SubjectsAdmin'));
const AdminPackages = lazy(() => import('./pages/admin/Packages'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminSupport = lazy(() => import('./pages/admin/SupportInbox'));
const AdminSettings = lazy(() => import('./pages/admin/SettingsAdmin'));
const AdminSim = lazy(() => import('./pages/admin/SimCases'));
const AdminDrilling = lazy(() => import('./pages/admin/DrillingAdmin'));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function RequireAuth({ children, admin = false }) {
  const { me, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <PageLoader />;
  if (!me) return <Navigate to={`/masuk?lanjut=${encodeURIComponent(loc.pathname + loc.search)}`} replace />;
  if (admin && me.role !== 'admin') return <Navigate to="/beranda" replace />;
  return children;
}

function GuestOnly({ children }) {
  const { me, ready } = useAuth();
  if (!ready) return <PageLoader />;
  if (me) return <Navigate to="/beranda" replace />;
  return children;
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/masuk" element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/daftar" element={<GuestOnly><Signup /></GuestOnly>} />
          <Route path="/lupa-password" element={<ForgotPassword />} />
          <Route path="/kebijakan-privasi" element={<Privacy />} />
          <Route path="/kerjakan/:id" element={<RequireAuth><Runner /></RequireAuth>} />
          <Route element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route path="/beranda" element={<Home />} />
            <Route path="/mata-kuliah" element={<Subjects />} />
            <Route path="/mata-kuliah/:slug" element={<SubjectDetail />} />
            <Route path="/riwayat" element={<History />} />
            <Route path="/jadwal" element={<Schedule />} />
            <Route path="/progres" element={<Progress />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/notifikasi" element={<Notifications />} />
            <Route path="/chat-admin" element={<ChatAdmin />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/simulasi-dokter" element={<SimulasiDokter />} />
            <Route path="/lab" element={<Lab />} />
            <Route path="/lab/objek/:slug" element={<LabObject />} />
            <Route path="/lab/jalur/:slug" element={<LabPathway />} />
            <Route path="/drilling" element={<Drilling />} />
            <Route path="/tutorial/latihan-soal" element={<TutorialLatihan />} />
          </Route>
          <Route path="/admin" element={<RequireAuth admin><AdminLayout /></RequireAuth>}>
            <Route index element={<AdminSummary />} />
            <Route path="pesan" element={<AdminSupport />} />
            <Route path="pengajuan" element={<AdminSubmissions />} />
            <Route path="lab" element={<LabAdmin />} />
            <Route path="soal" element={<AdminQuestions />} />
            <Route path="laporan" element={<AdminReports />} />
            <Route path="pengumuman" element={<AdminAnnouncements />} />
            <Route path="mata-kuliah" element={<AdminSubjects />} />
            <Route path="paket" element={<AdminPackages />} />
            <Route path="simulasi" element={<AdminSim />} />
            <Route path="drilling" element={<AdminDrilling />} />
            <Route path="pengguna" element={<AdminUsers />} />
            <Route path="pengaturan" element={<AdminSettings />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  );
}
