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
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  currentView: 'dashboard',
  setCurrentView: (view) => set({ currentView: view }),
}));
