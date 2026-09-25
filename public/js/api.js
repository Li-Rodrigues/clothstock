/* Cliente REST leve para centralizar credenciais e erros da API. */
(function (global) {
  'use strict';

  async function request(path, options = {}) {
    const config = { credentials: 'include', ...options };
    config.headers = {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(path, config);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401 && !location.pathname.endsWith('/login.html')) {
        location.replace('/login.html');
      }
      const error = new Error(result.error?.message || 'Não foi possível concluir a operação.');
      error.status = response.status;
      error.code = result.error?.code;
      throw error;
    }
    return result;
  }

  global.ClothstockApi = { request };
}(window));
