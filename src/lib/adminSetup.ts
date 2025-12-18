import { supabase } from './supabase';

export async function setupSuperAdmin(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, message: 'No authenticated user found' };
    }

    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if (!currentProfile) {
      return { success: false, message: 'User profile not found' };
    }

    if (currentProfile.role === 'super_admin') {
      return { success: true, message: 'User is already a super admin' };
    }

    const { data: authUser } = await supabase.auth.getUser();
    if (authUser.user?.email !== email) {
      return { success: false, message: 'Email does not match authenticated user' };
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        role: 'super_admin',
        project_id: null
      })
      .eq('id', user.id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'Successfully promoted to super admin' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Unknown error' };
  }
}

export async function promoteToSuperAdmin(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    const { data: currentUser } = await supabase.auth.getUser();

    if (!currentUser.user) {
      return { success: false, message: 'Not authenticated' };
    }

    const { data: currentProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', currentUser.user.id)
      .maybeSingle();

    if (currentProfile?.role !== 'super_admin') {
      return { success: false, message: 'Only super admins can promote other users' };
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        role: 'super_admin',
        project_id: null
      })
      .eq('id', userId);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: 'User promoted to super admin successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Unknown error' };
  }
}
