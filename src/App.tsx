import { useState, useEffect } from 'react';
import { LayoutDashboard, Users, UserPlus, Settings as SettingsIcon, LogOut, Menu, X, DollarSign, Award, Database as DatabaseIcon, Shield } from 'lucide-react';
import { useAuth } from './context/AuthContext';
import { useProject } from './context/ProjectContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import LeadsTable from './components/LeadsTable';
import LeadForm from './components/LeadForm';
import Settings from './components/Settings';
import Billing from './components/Billing';
import Commissions from './components/Commissions';
import MetaLeads from './components/MetaLeads';
import AdminDashboard from './components/AdminDashboard';
import ProjectSelector from './components/ProjectSelector';
import SuperAdminSetup from './components/SuperAdminSetup';
import type { Database } from './lib/database.types';

type Lead = Database['public']['Tables']['leads']['Row'];

type View = 'dashboard' | 'leads' | 'add-lead' | 'billing' | 'commissions' | 'meta-leads' | 'settings' | 'admin';

function App() {
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { currentProject, loading: projectLoading } = useProject();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editingLead, setEditingLead] = useState<Lead | undefined>(undefined);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSuperAdminSetup, setShowSuperAdminSetup] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('setup') === 'super-admin') {
      setShowSuperAdminSetup(true);
    }
  }, []);

  const handleFormSuccess = () => {
    setCurrentView('leads');
    setEditingLead(undefined);
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setCurrentView('add-lead');
  };

  const handleCancelForm = () => {
    setCurrentView('leads');
    setEditingLead(undefined);
  };

  const handleSettingsUpdate = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const NavButton = ({ icon: Icon, label, view, active }: any) => (
    <button
      onClick={() => {
        setCurrentView(view);
        if (view !== 'add-lead') {
          setEditingLead(undefined);
        }
        setMobileMenuOpen(false);
      }}
      className={`group flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all w-full font-semibold ${
        active
          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 scale-105'
          : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 hover:scale-102'
      }`}
    >
      <Icon size={22} className={active ? '' : 'group-hover:scale-110 transition-transform'} />
      <span className="tracking-wide">{label}</span>
    </button>
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  if (showSuperAdminSetup && user) {
    return <SuperAdminSetup />;
  }

  if (projectLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando proyectos...</p>
        </div>
      </div>
    );
  }

  if (!currentProject) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="p-4 bg-blue-600 rounded-full inline-block mb-4">
            <LayoutDashboard className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Bienvenido a Lead Tracker</h2>
          <p className="text-gray-600 mb-6">Crea tu primer proyecto para comenzar a gestionar tus leads</p>
          <ProjectSelector />
          <button
            onClick={handleSignOut}
            className="mt-4 text-sm text-gray-600 hover:text-gray-900"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-gray-100">
      <div className="flex flex-col md:flex-row">
        <aside className={`${
          mobileMenuOpen ? 'block' : 'hidden'
        } md:block w-full md:w-72 min-h-screen bg-white shadow-2xl border-r border-gray-100 fixed md:static z-30`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg">
                  <LayoutDashboard className="text-white" size={28} />
                </div>
                <div>
                  <h1 className="text-xl font-black text-gray-900 tracking-tight">Lead Tracker</h1>
                  <p className="text-xs text-gray-600 font-semibold">Sistema de Ventas</p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="md:hidden text-gray-600 hover:text-gray-900"
              >
                <X size={24} />
              </button>
            </div>

            <div className="mb-4">
              <ProjectSelector />
            </div>

            <nav className="space-y-2">
              <NavButton
                icon={LayoutDashboard}
                label="Dashboard"
                view="dashboard"
                active={currentView === 'dashboard'}
              />
              <NavButton
                icon={Users}
                label="Todos los Leads"
                view="leads"
                active={currentView === 'leads'}
              />
              <NavButton
                icon={UserPlus}
                label="Agregar Lead"
                view="add-lead"
                active={currentView === 'add-lead'}
              />
              <NavButton
                icon={DollarSign}
                label="Facturación"
                view="billing"
                active={currentView === 'billing'}
              />
              <NavButton
                icon={Award}
                label="Comisiones"
                view="commissions"
                active={currentView === 'commissions'}
              />
              <NavButton
                icon={DatabaseIcon}
                label="Leads Meta"
                view="meta-leads"
                active={currentView === 'meta-leads'}
              />
              {(profile?.role === 'super_admin' || profile?.role === 'project_admin') && (
                <NavButton
                  icon={Shield}
                  label="Administración"
                  view="admin"
                  active={currentView === 'admin'}
                />
              )}
              <NavButton
                icon={SettingsIcon}
                label="Configuración"
                view="settings"
                active={currentView === 'settings'}
              />
            </nav>

            <div className="mt-8 pt-6 border-t-2 border-gray-100">
              <button
                onClick={handleSignOut}
                className="group flex items-center gap-3 px-4 py-3.5 rounded-xl text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-rose-50 transition-all w-full font-semibold hover:shadow-lg hover:shadow-red-500/10"
              >
                <LogOut size={22} className="group-hover:scale-110 transition-transform" />
                <span className="tracking-wide">Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-h-screen">
          <header className="md:hidden bg-white/80 backdrop-blur-lg border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-gray-600 hover:text-gray-900 p-2 hover:bg-gray-100 rounded-lg transition-all"
            >
              <Menu size={24} />
            </button>
            <h2 className="font-black text-gray-900 text-base tracking-tight">
              {currentView === 'dashboard' && 'Dashboard'}
              {currentView === 'leads' && 'Leads'}
              {currentView === 'add-lead' && (editingLead ? 'Editar Lead' : 'Agregar Lead')}
              {currentView === 'billing' && 'Facturación'}
              {currentView === 'commissions' && 'Comisiones'}
              {currentView === 'meta-leads' && 'Leads Meta'}
              {currentView === 'admin' && 'Administración'}
              {currentView === 'settings' && 'Configuración'}
            </h2>
            <div className="w-6" />
          </header>

          <main className="flex-1 p-4 md:p-8 lg:p-10">
            <div className="max-w-[1800px] mx-auto">
              {currentView === 'dashboard' && (
                <Dashboard refreshTrigger={refreshTrigger} />
              )}

              {currentView === 'leads' && (
                <div>
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">Todos los Leads</h2>
                    <p className="text-sm md:text-lg text-gray-600 font-medium">Gestiona y visualiza todos tus leads</p>
                  </div>
                  <LeadsTable onEdit={handleEdit} refreshTrigger={refreshTrigger} />
                </div>
              )}

              {currentView === 'add-lead' && (
                <div>
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">
                      {editingLead ? 'Editar Lead' : 'Agregar Nuevo Lead'}
                    </h2>
                    <p className="text-sm md:text-lg text-gray-600 font-medium">
                      {editingLead ? 'Actualiza la información del lead' : 'Completa el formulario para registrar un nuevo lead'}
                    </p>
                  </div>
                  <LeadForm
                    onSuccess={handleFormSuccess}
                    onCancel={handleCancelForm}
                    editLead={editingLead}
                  />
                </div>
              )}

              {currentView === 'billing' && (
                <div>
                  <div className="mb-6 md:mb-8 hidden md:block">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">Facturación</h2>
                    <p className="text-sm md:text-lg text-gray-600 font-medium">Datos económicos y financieros</p>
                  </div>
                  <Billing refreshTrigger={refreshTrigger} />
                </div>
              )}

              {currentView === 'commissions' && (
                <div>
                  <div className="mb-6 md:mb-8 hidden md:block">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">Comisiones</h2>
                    <p className="text-sm md:text-lg text-gray-600 font-medium">Cálculo de comisiones</p>
                  </div>
                  <Commissions refreshTrigger={refreshTrigger} />
                </div>
              )}

              {currentView === 'meta-leads' && (
                <div>
                  <div className="mb-6 md:mb-8 hidden md:block">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">Leads de Meta</h2>
                    <p className="text-sm md:text-lg text-gray-600 font-medium">Registro semanal de leads de formularios Meta</p>
                  </div>
                  <MetaLeads />
                </div>
              )}

              {currentView === 'admin' && <AdminDashboard />}

              {currentView === 'settings' && (
                <div>
                  <div className="mb-6 md:mb-8">
                    <h2 className="text-2xl md:text-4xl font-black text-gray-900 mb-2 tracking-tight">Configuración</h2>
                    <p className="text-sm md:text-lg text-gray-600 font-medium">Ajusta los parámetros del proyecto</p>
                  </div>
                  <Settings onUpdate={handleSettingsUpdate} />
                </div>
              )}
            </div>
          </main>

          <footer className="bg-white border-t border-gray-200 py-4 px-4 md:px-8">
            <div className="max-w-[1800px] mx-auto text-center">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} <span className="font-semibold text-gray-900">Alejandro Mancheño Rey</span>. Todos los derechos reservados.
              </p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default App;
