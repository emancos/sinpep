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
import { UserDetails } from './pages/Users/Details';
import { DoctorDetails } from './pages/Doctors/Details';
import { HealthCenterDetails } from './pages/HealthCenters/Details';
import { PatientsList } from './pages/Patients';
import { CreatePatient } from './pages/Patients/Create';
import { EditPatient } from './pages/Patients/Edit';
import { PatientDetails } from './pages/Patients/Details';
import { DoctorsList } from './pages/Doctors';
import { CreateOrEditDoctor } from './pages/Doctors/Create';
import { SpecialtiesPage } from './pages/Specialties';
import { ProceduresList } from './pages/Procedures';
import { MedicalHistory } from './pages/MedicalRecords/History';
import { CreateRecord } from './pages/MedicalRecords/CreateRecord';
import { CreateOrEditProcedure } from './pages/Procedures/Create';
import { ProcedureDetails } from './pages/Procedures/Details';
import { SocketProvider } from './contexts/SocketContext';
import { Reports } from './pages/Reports';
import { Reception } from './pages/Reception';
import { WaitingList } from './pages/Reception/WaitingList';
import { RoomsList } from './pages/Rooms';
import { MedicationsList } from './pages/Medications';
import { MunicipalitiesPage } from './pages/Municipalities';
import { SolicitorInbox } from './pages/Regulation/SolicitorInbox';
import { CreateRegulationRequest } from './pages/Regulation/CreateRegulationRequest';
import { OperatorInbox } from './pages/Regulation/OperatorInbox';
import { WaitingListPage } from './pages/Regulation/WaitingListPage';
import { AutoSchedulingRulesPage } from './pages/Regulation/AutoSchedulingRulesPage';
import { EsusImportPage } from './pages/Regulation/EsusImportPage';
import { ChangeProcedurePage } from './pages/Regulation/ChangeProcedurePage';
import { RequestDetailsPage } from './pages/Regulation/RequestDetailsPage';
import { SchedulesPage } from './pages/Schedules';
import { CreateOrEditSchedule } from './pages/Schedules/CreateOrEditSchedule';
import BpaPage from './pages/BPA';
import { AboutSystem } from './pages/Public/AboutSystem';
import { TermsOfUse } from './pages/Public/TermsOfUse';
import { PrivacyPolicy } from './pages/Public/PrivacyPolicy';
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

              {/* Rotas Públicas Institucionais */}
              <Route path="/about" element={<AboutSystem />} />
              <Route path="/sobre" element={<AboutSystem />} />
              <Route path="/terms" element={<TermsOfUse />} />
              <Route path="/termos" element={<TermsOfUse />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/privacidade" element={<PrivacyPolicy />} />

              {/* Protected routes wrapped in Layout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<UserProfile />} />
                  <Route element={<ProtectedRoute requiredPermission="reports:read" />}>
                    <Route path="/reports" element={<Reports />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="bpa:access" />}>
                    <Route path="/bpa" element={<BpaPage />} />
                  </Route>

                  <Route path="/reception" element={<Reception />} />
                  <Route path="/reception/queue" element={<WaitingList />} />

                  <Route element={<ProtectedRoute requiredPermission="regulation-solicitor:read" />}>
                    <Route path="/regulation/solicitor" element={<SolicitorInbox />} />
                    <Route path="/regulation/solicitor/new" element={<CreateRegulationRequest />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="regulation-operator:read" />}>
                    <Route path="/regulation/inbox" element={<OperatorInbox />} />
                    <Route path="/regulation/waiting-list" element={<WaitingListPage />} />
                    <Route path="/regulation/auto-scheduling/rules" element={<AutoSchedulingRulesPage />} />
                    <Route path="/regulation/esus-import" element={<EsusImportPage />} />
                    <Route path="/regulation/requests/:id/change-procedure" element={<ChangeProcedurePage />} />
                  </Route>
                  <Route path="/regulation/requests/:id" element={<RequestDetailsPage />} />

                  {/* Agendas & Escalas de Atendimento */}
                  <Route element={<ProtectedRoute requiredPermission="schedules:read" />}>
                    <Route path="/schedules" element={<SchedulesPage />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="schedules:write" />}>
                    <Route path="/schedules/new" element={<CreateOrEditSchedule />} />
                    <Route path="/schedules/:id/edit" element={<CreateOrEditSchedule />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="rooms:read" />}>
                    <Route path="/rooms" element={<RoomsList />} />
                  </Route>

                  {/* Admin Only Routes */}
                  <Route element={<ProtectedRoute requiredPermission="admin:access" />}>
                    <Route path="/users" element={<UsersList />} />
                    <Route path="/users/:id" element={<UserDetails />} />
                    <Route path="/users/create" element={<CreateOrEditUser />} />
                    <Route path="/users/:id/edit" element={<CreateOrEditUser />} />
                    <Route path="/medications" element={<MedicationsList />} />
                    <Route path="/municipalities" element={<MunicipalitiesPage />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="health-centers:read" />}>
                    <Route path="/health-centers" element={<HealthCentersList />} />
                    <Route path="/health-centers/:id" element={<HealthCenterDetails />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="health-centers:write" />}>
                    <Route path="/health-centers/create" element={<CreateOrEditHealthCenter />} />
                    <Route path="/health-centers/:id/edit" element={<CreateOrEditHealthCenter />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="doctors:read" />}>
                    <Route path="/doctors" element={<DoctorsList />} />
                    <Route path="/doctors/:id" element={<DoctorDetails />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="doctors:write" />}>
                    <Route path="/doctors/new" element={<CreateOrEditDoctor />} />
                    <Route path="/doctors/:id/edit" element={<CreateOrEditDoctor />} />
                  </Route>



                  <Route element={<ProtectedRoute requiredPermission="procedure-groups:read" />}>
                    <Route path="/specialties" element={<SpecialtiesPage />} />
                    <Route path="/auxiliary-tables" element={<Navigate to="/specialties" replace />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="procedures:read" />}>
                    <Route path="/procedures" element={<ProceduresList />} />
                    <Route path="/procedures/:id" element={<ProcedureDetails />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="procedures:write" />}>
                    <Route path="/procedures/create" element={<CreateOrEditProcedure />} />
                    <Route path="/procedures/:id/edit" element={<CreateOrEditProcedure />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="patients:read" />}>
                    <Route path="/patients" element={<PatientsList />} />
                    <Route path="/patients/:id" element={<PatientDetails />} />
                  </Route>
                  <Route element={<ProtectedRoute requiredPermission="patients:write" />}>
                    <Route path="/patients/create" element={<CreatePatient />} />
                    <Route path="/patients/:id/edit" element={<EditPatient />} />
                  </Route>

                  <Route element={<ProtectedRoute requiredPermission="medical-records:read" />}>
                    <Route path="/medical-records" element={<Navigate to="/patients" replace />} />
                    <Route path="/medical-records/:id" element={<MedicalHistory />} />
                    <Route path="/medical-records/:id/new" element={<CreateRecord />} />
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

