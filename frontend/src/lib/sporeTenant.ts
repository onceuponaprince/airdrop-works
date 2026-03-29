const ACTIVE_TENANT_KEY = 'spore_active_tenant';

export function getActiveSporeTenant(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(ACTIVE_TENANT_KEY);
}

export function setActiveSporeTenant(slug: string) {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ACTIVE_TENANT_KEY, slug);
}

export function clearActiveSporeTenant() {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.removeItem(ACTIVE_TENANT_KEY);
}
