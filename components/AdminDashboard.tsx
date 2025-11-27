
import React, { useState, useEffect } from 'react';
import { adminService } from '../services/admin';
import { User, VideoJob, AdminRole } from '../types';
import { isSupabaseConfigured } from '../services/supabase';

// Modular Components
import { AdminLayout } from './admin/AdminLayout';
import { DashboardView } from './admin/DashboardView';
import { UsersView } from './admin/UsersView';
import { JobsView } from './admin/JobsView';
import { SettingsView } from './admin/SettingsView';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: 'DASHBOARD' | 'USERS' | 'JOBS' | 'SETTINGS';
  initialSection?: 'CONNECTION' | 'SCHEMA';
}

type AdminView = 'DASHBOARD' | 'USERS' | 'JOBS' | 'SETTINGS';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    isOpen, 
    onClose, 
    initialView = 'DASHBOARD',
    initialSection = 'CONNECTION'
}) => {
  const [view, setView] = useState<AdminView>(initialView);
  const [loading, setLoading] = useState(false);
  
  // Data State
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<(User & { adminRole?: AdminRole })[]>([]);
  const [jobs, setJobs] = useState<VideoJob[]>([]);

  // Sync initial view when opened
  useEffect(() => {
    if (isOpen) {
        // If explicitly requested to go to settings, go there
        if (initialView === 'SETTINGS') {
            setView('SETTINGS');
        } else if (!isSupabaseConfigured()) {
            // Force settings if not configured
            setView('SETTINGS');
        } else {
            // Otherwise use default or requested
            setView(initialView);
            loadData();
        }
    }
  }, [isOpen, initialView]);

  const loadData = async () => {
    setLoading(true);
    try {
        const dashboardStats = await adminService.getDashboardStats();
        setStats(dashboardStats);
        
        const userList = await adminService.getUsers();
        setUsers(userList);

        const jobList = await adminService.getRecentJobs();
        setJobs(jobList);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AdminLayout 
        currentView={view} 
        onNavigate={setView} 
        onClose={onClose}
        role="super_admin"
    >
        {view === 'DASHBOARD' && <DashboardView stats={stats} />}
        {view === 'USERS' && <UsersView users={users} role="super_admin" refresh={loadData} />}
        {view === 'JOBS' && <JobsView jobs={jobs} refresh={loadData} />}
        {view === 'SETTINGS' && <SettingsView initialSection={initialSection} />}
    </AdminLayout>
  );
};
