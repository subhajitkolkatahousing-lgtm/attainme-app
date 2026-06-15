import { create } from 'zustand';

interface User {
  id: string;
  empId: string;
  name: string;
  email: string;
  department: string;
  position: string;
  salary: number;
  role: string;
  photoUrl?: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  currentView: string;
  setCurrentView: (view: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}

const STORAGE_KEY = 'attendance-khata-store';

const loadState = (): Partial<AppState> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { user: parsed.user || null, currentView: parsed.currentView || 'dashboard' };
    }
  } catch {}
  return {};
};

const saveState = (state: { user: User | null; currentView: string }) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, currentView: state.currentView }));
  } catch {}
};

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  setUser: (user) => {
    set({ user });
    const state = get();
    saveState({ user, currentView: state.currentView });
  },
  currentView: 'dashboard',
  setCurrentView: (view) => {
    set({ currentView: view });
    const state = get();
    saveState({ user: state.user, currentView: view });
  },
  _hasHydrated: false,
  setHasHydrated: (state) => set({ _hasHydrated: state }),
}));

// Hydrate from localStorage on client
if (typeof window !== 'undefined') {
  const saved = loadState();
  if (saved.user) {
    useAppStore.setState({ user: saved.user, currentView: saved.currentView || 'dashboard', _hasHydrated: true });
  } else {
    useAppStore.setState({ _hasHydrated: true });
  }
}
