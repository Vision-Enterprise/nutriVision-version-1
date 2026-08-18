import { supabase } from '../../core/supabase.js';
import { AUDIT_ACTIONS } from '../../shared/constants/app.constants.js';

/**
 * Fetch all users (profiles).
 */
export async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  return data;
}

/**
 * Update a user's role.
 * @param {string} userId - Profile ID
 * @param {string} newRole - 'administrator' or 'nutrition_personnel'
 */
export async function updateUserRole(userId, newRole) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Not authenticated.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating user role:', error);
    throw error;
  }

  await supabase.from('audit_logs').insert({
    user_id:     authData.user.id,
    action:      AUDIT_ACTIONS.UPDATE_PROFILE,
    entity_type: 'profile',
    entity_id:   userId,
    description: `Updated role to ${newRole} for user ${data.full_name}`
  });

  return data;
}

/**
 * Deactivate a user (soft delete).
 * @param {string} userId - Profile ID
 */
export async function deactivateUser(userId) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) {
    throw new Error('Not authenticated.');
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error deactivating user:', error);
    throw error;
  }

  await supabase.from('audit_logs').insert({
    user_id:     authData.user.id,
    action:      AUDIT_ACTIONS.DEACTIVATE_PROFILE,
    entity_type: 'profile',
    entity_id:   userId,
    description: `Deactivated user ${data.full_name}`
  });

  return data;
}
