import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { UserProfile } from './pages/Profile';
import { UsersList } from './pages/Users';
import { CreateOrEditUser } from './pages/Users/Create';
import { Toaster } from 'sonner';
import { ConfirmProvider } from './contexts/ConfirmContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { Dashboard } from './pages/Dashboard';
import { HealthCentersList } from './pages/HealthCenters';
import { CreateOrEditHealthCenter } from './pages/HealthCenters/Create';
import { HealthCenterDetails } from './pages/HealthCenters/Details';
import { PatientsList } from './pages/Patients';
import { CreatePatient } from './pages/Patients/Create';
import { EditPatient } from './pages/Patients/Edit';
import { PatientDetails } from './pages/Patients/Details';
import { SocketProvider } from './contexts/SocketContext';
import './App.css';

function App() {
  return (
    <ThemeProvider>
      <ConfirmProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected routes wrapped in Layout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<UserProfile />} />

                  {/* Admin Only Routes */}
                  <Route element={<ProtectedRoute requiredPermission="admin:access" />}>
                    <Route path="/users" element={<UsersList />} />
                    <Route path="/users/create" element={<CreateOrEditUser />} />
                    <Route path="/users/:id/edit" element={<CreateOrEditUser />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="health-centers:read" />}>
                    <Route path="/health-centers" element={<HealthCentersList />} />
                    <Route path="/health-centers/:id" element={<HealthCenterDetails />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="health-centers:write" />}>
                    <Route path="/health-centers/create" element={<CreateOrEditHealthCenter />} />
                    <Route path="/health-centers/:id/edit" element={<CreateOrEditHealthCenter />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="patients:read" />}>
                    <Route path="/patients" element={<PatientsList />} />
                    <Route path="/patients/:id" element={<PatientDetails />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="patients:write" />}>
                    <Route path="/patients/create" element={<CreatePatient />} />
                    <Route path="/patients/:id/edit" element={<EditPatient />} />
                  </Route>
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
        <Toaster position="top-right" richColors />
      </ConfirmProvider>
    </ThemeProvider>
  );
}

export default App;

