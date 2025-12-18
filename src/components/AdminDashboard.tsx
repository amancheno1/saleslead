import { useState } from 'react';
import { Key, Users } from 'lucide-react';
import InvitationCodes from './InvitationCodes';
import ProjectMembers from './ProjectMembers';
import { useProject } from '../context/ProjectContext';

type AdminTab = 'members' | 'invitations';

export default function AdminDashboard() {
  const { currentProject } = useProject();
  const [activeTab, setActiveTab] = useState<AdminTab>('members');

  if (!currentProject) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Equipo</h1>
        <p className="text-gray-600">Administra miembros y códigos de invitación para Amz Kickstart</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('members')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users size={20} />
              Miembros del Equipo
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`px-6 py-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'invitations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Key size={20} />
              Códigos de Invitación
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'members' && <ProjectMembers />}
      {activeTab === 'invitations' && <InvitationCodes />}
    </div>
  );
}
