import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { Database } from '../lib/database.types';

type Project = Database['public']['Tables']['projects']['Row'];

const SINGLE_PROJECT_NAME = 'Amz Kickstart by Pol Brullas';

interface ProjectContextType {
  currentProject: Project | null;
  loading: boolean;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  refreshProject: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSingleProject();
    } else {
      setCurrentProject(null);
      setLoading(false);
    }
  }, [user]);

  const fetchSingleProject = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('name', SINGLE_PROJECT_NAME)
        .maybeSingle();

      if (error) throw error;

      setCurrentProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProject = async (updates: Partial<Project>) => {
    if (!currentProject) return;

    const { error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', currentProject.id);

    if (error) throw error;

    setCurrentProject({ ...currentProject, ...updates } as Project);
  };

  const refreshProject = async () => {
    await fetchSingleProject();
  };

  return (
    <ProjectContext.Provider value={{
      currentProject,
      loading,
      updateProject,
      refreshProject
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
