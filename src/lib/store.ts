import { create } from 'zustand';
import { supabase } from './supabase';

export type Role = 'admin' | 'employee';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: Role;
  annualQuota: number;
}

export interface VacationRequest {
  id: string;
  userId: string;
  startDate: string; 
  endDate: string; 
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

interface AppState {
  users: User[];
  requests: VacationRequest[];
  currentUser: User | null;
  isLoading: boolean;
  
  fetchInitialData: () => Promise<void>;
  login: (username: string) => void;
  logout: () => void;
  addUser: (name: string, username: string, password: string | undefined, role: Role, annualQuota: number) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  addRequest: (userId: string, startDate: string, endDate: string) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'approved' | 'rejected') => Promise<void>;
}

// Convert DB snake_case to camelCase
const mapUser = (dbUser: any): User => ({
  id: dbUser.id,
  name: dbUser.name,
  username: dbUser.username,
  password: dbUser.password,
  role: dbUser.role,
  annualQuota: dbUser.annual_quota,
});

const mapRequest = (dbReq: any): VacationRequest => ({
  id: dbReq.id,
  userId: dbReq.user_id,
  startDate: dbReq.start_date,
  endDate: dbReq.end_date,
  status: dbReq.status,
  createdAt: dbReq.created_at,
});

export const useStore = create<AppState>()((set) => ({
  users: [],
  requests: [],
  currentUser: null,
  isLoading: true,

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const [usersRes, requestsRes] = await Promise.all([
        supabase.from('vacation_users').select('*'),
        supabase.from('vacation_requests').select('*')
      ]);

      if (usersRes.error) throw usersRes.error;
      if (requestsRes.error) throw requestsRes.error;

      set({
        users: (usersRes.data || []).map(mapUser),
        requests: (requestsRes.data || []).map(mapRequest),
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
      set({ isLoading: false });
    }
  },

  login: (username) =>
    set((state) => {
      const user = state.users.find((u) => u.username === username);
      if (user) {
        // Simple persist to localStorage just for keeping session across reloads
        localStorage.setItem('vacation_currentUser', JSON.stringify(user));
      }
      return { currentUser: user || null };
    }),

  logout: () => {
    localStorage.removeItem('vacation_currentUser');
    set({ currentUser: null });
  },

  addUser: async (name, username, password, role, annualQuota) => {
    try {
      const { data, error } = await supabase
        .from('vacation_users')
        .insert([{
          name,
          username,
          password,
          role,
          annual_quota: annualQuota
        }])
        .select()
        .single();
        
      if (error) throw error;
      
      set((state) => ({
        users: [...state.users, mapUser(data)],
      }));
    } catch (error) {
      console.error('Error adding user:', error);
      alert('שגיאה ביצירת משתמש');
    }
  },

  updateUserPassword: async (userId, newPassword) => {
    try {
      const { error } = await supabase
        .from('vacation_users')
        .update({ password: newPassword })
        .eq('id', userId);
        
      if (error) throw error;
      
      set((state) => ({
        users: state.users.map((user) => 
          user.id === userId ? { ...user, password: newPassword } : user
        ),
      }));
    } catch (error) {
      console.error('Error updating password:', error);
      alert('שגיאה בעדכון סיסמה');
    }
  },

  addRequest: async (userId, startDate, endDate) => {
    try {
      const { data, error } = await supabase
        .from('vacation_requests')
        .insert([{
          user_id: userId,
          start_date: startDate,
          end_date: endDate,
          status: 'pending'
        }])
        .select()
        .single();
        
      if (error) throw error;

      set((state) => ({
        requests: [...state.requests, mapRequest(data)],
      }));
    } catch (error) {
      console.error('Error adding request:', error);
      alert('שגיאה בהגשת בקשה');
    }
  },

  updateRequestStatus: async (requestId, status) => {
    try {
      const { error } = await supabase
        .from('vacation_requests')
        .update({ status })
        .eq('id', requestId);
        
      if (error) throw error;

      set((state) => ({
        requests: state.requests.map((req) =>
          req.id === requestId ? { ...req, status } : req
        ),
      }));
    } catch (error) {
      console.error('Error updating request status:', error);
      alert('שגיאה בעדכון סטטוס');
    }
  },
}));

// Auto-restore session on load
const savedUser = localStorage.getItem('vacation_currentUser');
if (savedUser) {
  try {
    useStore.setState({ currentUser: JSON.parse(savedUser) });
  } catch (e) {
    console.error('Failed to parse saved user');
  }
}
