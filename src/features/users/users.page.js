import { fetchUsers, updateUserRole, deactivateUser } from './users.service.js';
import { formatDate } from '../../shared/utils/date.utils.js';

let users = [];

export async function renderUsersPage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">Manage system access and roles</p>
      </div>
    </div>
    
    <div class="card p-0 mt-4">
      <div id="users-table-container">
        <div class="p-4 text-center text-gray-500">Loading users...</div>
      </div>
    </div>
    
    <!-- Edit Role Modal -->
    <div class="modal-backdrop hidden" id="edit-role-modal">
      <div class="modal">
        <div class="modal__header">
          <h2 class="modal__title">Edit User Role</h2>
          <button class="modal__close" id="edit-role-close" aria-label="Close modal">&times;</button>
        </div>
        <form class="modal__body" id="edit-role-form">
          <input type="hidden" id="edit-user-id" />
          
          <div class="form-group">
            <label class="form-label" for="edit-user-name">User Name</label>
            <input class="form-input" type="text" id="edit-user-name" disabled />
          </div>
          
          <div class="form-group">
            <label class="form-label" for="edit-user-role">Role <span class="text-error">*</span></label>
            <select class="form-input" id="edit-user-role" required>
              <option value="administrator">Administrator</option>
              <option value="nutrition_personnel">Nutrition Personnel</option>
            </select>
          </div>
          
          <div class="modal__footer">
            <button type="button" class="btn btn--outline" id="edit-role-cancel">Cancel</button>
            <button type="submit" class="btn btn--primary" id="edit-role-submit">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  await loadUsers();
  attachEventListeners();
}

async function loadUsers() {
  const container = document.getElementById('users-table-container');
  if (!container) return;

  try {
    users = await fetchUsers();
    
    if (users.length === 0) {
      container.innerHTML = `<div class="p-4 text-center text-gray-500">No users found.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr>
              <th>NAME</th>
              <th>ROLE</th>
              <th>STATUS</th>
              <th>DATE JOINED</th>
              <th class="text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${users.map(user => `
              <tr>
                <td class="font-medium">${escapeHtml(user.full_name)}</td>
                <td>
                  <span class="badge ${user.role === 'administrator' ? 'badge--info' : 'badge--success'}">
                    ${user.role === 'administrator' ? 'Administrator' : 'Personnel'}
                  </span>
                </td>
                <td>
                  <span class="badge ${user.is_active ? 'badge--success' : 'badge--error'}">
                    ${user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>${formatDate(user.created_at)}</td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-3">
                    ${user.is_active ? `
                      <button class="text-primary hover-opacity" onclick="window.editUserRole('${user.id}')">
                        Edit Role
                      </button>
                      <button class="text-error hover-opacity" onclick="window.deactivateUserProfile('${user.id}')">
                        Deactivate
                      </button>
                    ` : '<span class="text-gray-400">N/A</span>'}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div class="p-4 mb-4 text-error bg-error-light rounded border border-error/20 flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        Failed to load users.
      </div>
    `;
  }
}

function attachEventListeners() {
  const modal = document.getElementById('edit-role-modal');
  const closeBtn = document.getElementById('edit-role-close');
  const cancelBtn = document.getElementById('edit-role-cancel');
  const form = document.getElementById('edit-role-form');

  if (closeBtn) closeBtn.addEventListener('click', closeEditModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeEditModal);
  
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = document.getElementById('edit-role-submit');
      const originalText = btn.textContent;
      btn.textContent = 'Saving...';
      btn.disabled = true;
      
      try {
        const userId = document.getElementById('edit-user-id').value;
        const newRole = document.getElementById('edit-user-role').value;
        
        await updateUserRole(userId, newRole);
        closeEditModal();
        await loadUsers();
      } catch (err) {
        alert('Failed to update role: ' + err.message);
      } finally {
        btn.textContent = originalText;
        btn.disabled = false;
      }
    });
  }
}

function closeEditModal() {
  const modal = document.getElementById('edit-role-modal');
  if (modal) modal.classList.add('hidden');
}

// Global functions for inline event handlers
window.editUserRole = (id) => {
  const user = users.find(u => u.id === id);
  if (!user) return;
  
  document.getElementById('edit-user-id').value = user.id;
  document.getElementById('edit-user-name').value = user.full_name;
  document.getElementById('edit-user-role').value = user.role;
  
  document.getElementById('edit-role-modal').classList.remove('hidden');
};

window.deactivateUserProfile = async (id) => {
  const user = users.find(u => u.id === id);
  if (!user) return;
  
  if (confirm(`Are you sure you want to deactivate ${user.full_name}? They will no longer be able to log in.`)) {
    try {
      await deactivateUser(id);
      await loadUsers();
    } catch (err) {
      alert('Failed to deactivate user: ' + err.message);
    }
  }
};

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
