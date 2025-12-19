import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Database } from '../lib/database.types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectMember = Database['public']['Tables']['project_members']['Row'];

interface ProjectContextType {
  currentProject: Project | null;
  projects: Project[];
  userRole: 'owner' | 'admin' | 'member' | null;
  loading: boolean;
  setCurrentProject: (project: Project) => void;
  createProject: (name: string, description: string, weeklyGoal: number) => Promise<void>;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  refreshProject: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentProject, setCurrentProjectState] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [userRole, setUserRole] = useState<'owner' | 'admin' | 'member' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUserProjects();
    } else {
      setCurrentProjectState(null);
      setProjects([]);
      setUserRole(null);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (currentProject) {
      fetchUserRole();
    }
  }, [currentProject]);

  const fetchUserProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);

      if (data && data.length > 0 && !currentProject) {
        setCurrentProjectState(data[0]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserRole = async () => {
    if (!user || !currentProject) return;

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', currentProject.id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      setUserRole(data?.role as 'owner' | 'admin' | 'member' || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    }
  };

  const setCurrentProject = (project: Project) => {
    setCurrentProjectState(project);
    localStorage.setItem('currentProjectId', project.id);
  };

  const createProject = async (name: string, description: string, weeklyGoal: number) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        weekly_goal: weeklyGoal,
        creator_id: user.id,
        user_id: user.id
      })
      .select()
      .single();

    if (error) throw error;

    await refreshProjects();
    setCurrentProject(data);
  };

  const updateProject = async (updates: Partial<Project>) => {
    if (!currentProject) return;

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', currentProject.id);

    if (error) throw error;

    setCurrentProjectState({ ...currentProject, ...updates } as Project);
    await refreshProjects();
  };

  const refreshProject = async () => {
    if (!currentProject) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', currentProject.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setCurrentProjectState(data);
    } catch (error) {
      console.error('Error refreshing project:', error);
    }
  };

  const refreshProjects = async () => {
    await fetchUserProjects();
  };

  return (
    <ProjectContext.Provider value={{
      currentProject,
      projects,
      userRole,
      loading,
      setCurrentProject,
      createProject,
      updateProject,
      refreshProject,
      refreshProjects
    }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
