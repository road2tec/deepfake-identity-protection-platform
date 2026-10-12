import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth } from './auth';
import AppLayout from './components/AppLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Overview from './pages/Overview';
import NewScan from './pages/NewScan';
import History from './pages/History';
import ScanDetail from './pages/ScanDetail';
import Identity from './pages/Identity';
import Alerts from './pages/Alerts';
import Account from './pages/Account';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Overview />} />
        <Route path="scan" element={<NewScan />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<ScanDetail />} />
        <Route path="identity" element={<Identity />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
