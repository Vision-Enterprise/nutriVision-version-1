/**
 * System Dialog Component
 * Replaces native window.alert, window.confirm, and window.prompt
 */

export const SystemDialog = {
  /**
   * Show an alert dialog
   * @param {string} message 
   * @param {string} title 
   * @returns {Promise<void>}
   */
  alert: function(message, title = 'Notification') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'system-alert-overlay';
      
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2 class="modal-title">${_escHtml(title)}</h2>
            <button class="modal-close" aria-label="Close modal">&times;</button>
          </div>
          <div class="modal-body">
            <p style="white-space: pre-wrap; font-size: var(--font-size-base); color: var(--color-text); margin: 0;">${_escHtml(message)}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-primary" id="alert-ok-btn">OK</button>
          </div>
        </div>
      `;

      // Remove any existing to prevent stacking
      const _existA = document.getElementById('system-alert-overlay');
      if (_existA) _existA.remove();
      document.body.appendChild(overlay);

      const okBtn = overlay.querySelector('#alert-ok-btn');
      const closeBtn = overlay.querySelector('.modal-close');

      const close = () => {
        document.removeEventListener('keydown', handleEsc);
        overlay.remove();
        resolve();
      };

      const handleEsc = (e) => {
        if (e.key === 'Escape' || e.key === 'Enter') close();
      };

      okBtn.addEventListener('click', close);
      closeBtn.addEventListener('click', close);
      document.addEventListener('keydown', handleEsc);
      
      okBtn.focus();
    });
  },

  /**
   * Show a confirmation dialog
   * @param {string} message 
   * @param {string} title 
   * @param {string} confirmText 
   * @param {boolean} isDanger 
   * @returns {Promise<boolean>}
   */
  confirm: function(message, title = 'Confirm Action', confirmText = 'Confirm', isDanger = false) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'system-confirm-overlay';
      
      const btnStyle = isDanger ? 'background: var(--color-danger); border-color: var(--color-danger);' : '';
      
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2 class="modal-title">${_escHtml(title)}</h2>
            <button class="modal-close" aria-label="Close modal">&times;</button>
          </div>
          <div class="modal-body">
            <p style="white-space: pre-wrap; font-size: var(--font-size-base); color: var(--color-text); margin: 0;">${_escHtml(message)}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="confirm-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="confirm-ok-btn" style="${btnStyle}">${_escHtml(confirmText)}</button>
          </div>
        </div>
      `;

      // Remove any existing to prevent stacking
      const _existC = document.getElementById('system-confirm-overlay');
      if (_existC) _existC.remove();
      document.body.appendChild(overlay);

      const okBtn = overlay.querySelector('#confirm-ok-btn');
      const cancelBtn = overlay.querySelector('#confirm-cancel-btn');
      const closeBtn = overlay.querySelector('.modal-close');

      const close = (result) => {
        document.removeEventListener('keydown', handleKey);
        overlay.remove();
        resolve(result);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') close(false);
      };

      okBtn.addEventListener('click', () => close(true));
      cancelBtn.addEventListener('click', () => close(false));
      closeBtn.addEventListener('click', () => close(false));
      document.addEventListener('keydown', handleKey);
      
      okBtn.focus();
    });
  },
  
  /**
   * Show a prompt dialog
   * @param {string} message 
   * @param {string} defaultValue 
   * @param {string} title 
   * @returns {Promise<string|null>}
   */
  prompt: function(message, defaultValue = '', title = 'Input Required') {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.id = 'system-prompt-overlay';
      
      overlay.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <div class="modal-header">
            <h2 class="modal-title">${_escHtml(title)}</h2>
            <button class="modal-close" aria-label="Close modal">&times;</button>
          </div>
          <div class="modal-body" style="display: flex; flex-direction: column; gap: var(--space-4);">
            <label for="prompt-input" class="form-label">${_escHtml(message)}</label>
            <input type="text" id="prompt-input" class="form-input" value="${_escHtml(defaultValue)}" />
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="prompt-cancel-btn">Cancel</button>
            <button class="btn btn-primary" id="prompt-ok-btn">OK</button>
          </div>
        </div>
      `;

      // Remove any existing to prevent stacking
      const _existP = document.getElementById('system-prompt-overlay');
      if (_existP) _existP.remove();
      document.body.appendChild(overlay);

      const okBtn = overlay.querySelector('#prompt-ok-btn');
      const cancelBtn = overlay.querySelector('#prompt-cancel-btn');
      const closeBtn = overlay.querySelector('.modal-close');
      const input = overlay.querySelector('#prompt-input');

      const close = (result) => {
        document.removeEventListener('keydown', handleKey);
        overlay.remove();
        resolve(result);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') close(null);
        if (e.key === 'Enter') close(input.value);
      };

      okBtn.addEventListener('click', () => close(input.value));
      cancelBtn.addEventListener('click', () => close(null));
      closeBtn.addEventListener('click', () => close(null));
      document.addEventListener('keydown', handleKey);
      
      input.focus();
      input.select();
    });
  }
};

function _escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
