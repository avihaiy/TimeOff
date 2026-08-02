import { create } from 'zustand';

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
  userId: string | null;
  employeeName?: string;
  employeeId?: string;
  startDate: string; 
  endDate: string; 
  signature?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface AppState {
  users: User[];
  requests: VacationRequest[];
  announcements: Announcement[];
  currentUser: User | null;
  isLoading: boolean;
  
  fetchInitialData: () => Promise<void>;
  login: (username: string) => void;
  logout: () => void;
  addUser: (name: string, username: string, password: string | undefined, role: Role, annualQuota: number) => Promise<void>;
  addUsersBatch: (users: {name: string, username: string, annualQuota: number}[]) => Promise<void>;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  updateUser: (userId: string, updates: { name: string, username: string, annualQuota: number }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  addRequest: (userId: string | null, employeeName: string, employeeId: string, startDate: string, endDate: string, signature?: string) => Promise<void>;
  updateRequestStatus: (requestId: string, status: 'approved' | 'rejected' | 'pending') => Promise<void>;
  deleteRequest: (requestId: string) => Promise<void>;
  addAnnouncement: (title: string, content: string) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
}

const API_URL = 'https://vacation-manager-backend.avihaidj0.workers.dev';

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
  employeeName: dbReq.employee_name,
  employeeId: dbReq.employee_id,
  startDate: dbReq.start_date,
  endDate: dbReq.end_date,
  signature: dbReq.signature,
  status: dbReq.status,
  createdAt: dbReq.created_at,
});

export const useStore = create<AppState>()((set) => ({
  users: [],
  requests: [],
  announcements: [],
  currentUser: null,
  isLoading: true,

  fetchInitialData: async () => {
    set({ isLoading: true });
    try {
      const [usersRes, requestsRes, annRes] = await Promise.all([
        fetch(`${API_URL}/users`),
        fetch(`${API_URL}/requests`),
        fetch(`${API_URL}/announcements`)
      ]);

      const users = await usersRes.json();
      const requests = await requestsRes.json();
      const announcements = await annRes.json();

      set({
        users: (users || []).map(mapUser),
        requests: (requests || []).map(mapRequest),
        announcements: (announcements || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          createdAt: a.created_at
        })),
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching data from API:', error);
      set({ isLoading: false });
    }
  },

  login: (username) =>
    set((state) => {
      const user = state.users.find((u) => u.username === username);
      if (user) {
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
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password, role, annualQuota })
      });
      const data = await res.json();
      
      set((state) => ({
        users: [...state.users, {
          id: data.id,
          name,
          username,
          password,
          role,
          annualQuota
        }],
      }));
    } catch (error) {
      console.error('Error adding user:', error);
      alert('שגיאה ביצירת משתמש');
    }
  },

  addUsersBatch: async (newUsers) => {
    try {
      // API currently handles one by one, we can just map POST requests for now
      // Or we can add a batch endpoint later
      const promises = newUsers.map(u => 
        fetch(`${API_URL}/users`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: u.name, 
            username: u.username, 
            password: '123', 
            role: 'employee', 
            annualQuota: u.annualQuota 
          })
        })
      );
      
      await Promise.all(promises);
      
      // Re-fetch all data to be safe
      const res = await fetch(`${API_URL}/users`);
      const usersData = await res.json();
      
      set({ users: usersData.map(mapUser) });
    } catch (error) {
      console.error('Error adding users batch:', error);
      alert('שגיאה בייבוא משתמשים');
    }
  },

  updateUserPassword: async (userId, newPassword) => {
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      });
      
      set((state) => ({
        users: state.users.map((user) => 
          user.id === userId ? { ...user, password: newPassword } : user
        ),
      }));
    } catch (error) {
      console.error('Error updating user password:', error);
      alert('שגיאה בעדכון סיסמה');
    }
  },

  updateUser: async (userId, updates) => {
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      set((state) => ({
        users: state.users.map((user) => 
          user.id === userId ? { ...user, ...updates } : user
        ),
      }));
    } catch (error) {
      console.error('Error updating user:', error);
      alert('שגיאה בעדכון משתמש');
    }
  },

  deleteUser: async (userId) => {
    try {
      await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE'
      });
      
      set((state) => ({
        users: state.users.filter((user) => user.id !== userId),
      }));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('שגיאה במחיקת משתמש');
    }
  },

  addRequest: async (userId, employeeName, employeeId, startDate, endDate, signature) => {
    try {
      const res = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          employeeName,
          employeeId,
          startDate,
          endDate,
          signature,
          status: 'pending'
        })
      });
      const data = await res.json();
      
      set((state) => ({
        requests: [...state.requests, {
          id: data.id,
          userId,
          employeeName,
          employeeId,
          startDate,
          endDate,
          signature,
          status: 'pending',
          createdAt: new Date().toISOString()
        }],
      }));
    } catch (error) {
      console.error('Error adding request:', error);
      alert('שגיאה ביצירת בקשה');
    }
  },

  updateRequestStatus: async (requestId, status) => {
    try {
      await fetch(`${API_URL}/requests/${requestId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      set((state) => ({
        requests: state.requests.map((req) => 
          req.id === requestId ? { ...req, status } : req
        ),
      }));
    } catch (error) {
      console.error('Error updating request status:', error);
      alert('שגיאה בעדכון סטטוס בקשה');
    }
  },

  deleteRequest: async (requestId) => {
    try {
      await fetch(`${API_URL}/requests/${requestId}`, {
        method: 'DELETE'
      });
      
      set((state) => ({
        requests: state.requests.filter((req) => req.id !== requestId),
      }));
    } catch (error) {
      console.error('Error deleting request:', error);
      alert('שגיאה במחיקת בקשה');
    }
  },

  addAnnouncement: async (title, content) => {
    try {
      const res = await fetch(`${API_URL}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content })
      });
      const data = await res.json();
      
      set((state) => ({
        announcements: [
          {
            id: data.id,
            title,
            content,
            createdAt: new Date().toISOString()
          },
          ...state.announcements,
        ],
      }));
    } catch (error) {
      console.error('Error adding announcement:', error);
      alert('שגיאה ביצירת הודעה');
    }
  },

  deleteAnnouncement: async (id) => {
    try {
      await fetch(`${API_URL}/announcements/${id}`, {
        method: 'DELETE'
      });
      
      set((state) => ({
        announcements: state.announcements.filter((a) => a.id !== id),
      }));
    } catch (error) {
      console.error('Error deleting announcement:', error);
      alert('שגיאה במחיקת הודעה');
    }
  },
}));
