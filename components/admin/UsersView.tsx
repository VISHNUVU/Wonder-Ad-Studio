
import React, { useState } from 'react';
import { User, AdminRole } from '../../types';
import { Search, MoreVertical, ShieldAlert, UserCheck, Mail, Shield, Loader2 } from 'lucide-react';
import { adminService } from '../../services/admin';

interface ExtendedUser extends User {
    adminRole?: AdminRole;
}

interface UsersViewProps {
  users: ExtendedUser[];
  role: AdminRole;
  refresh: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ users, role, refresh }) => {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleStatusChange = async (userId: string, status: 'active' | 'banned') => {
      setIsUpdating(true);
      await adminService.updateUserStatus(userId, status);
      setIsUpdating(false);
      refresh();
      setSelectedUser(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
      const targetId = userId;
      setUpdatingId(targetId); // Local loading state for inline
      setIsUpdating(true); 

      // Determine if it's an admin role or regular customer
      const roleValue = newRole === 'customer' ? 'customer' : newRole as AdminRole;
      try {
        await adminService.updateUserRole(targetId, roleValue);
      } catch (e) {
        console.error("Failed to update role", e);
      }
      
      setIsUpdating(false);
      setUpdatingId(null);
      refresh();
      if (selectedUser?.id === userId) setSelectedUser(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-white">Users</h2>
            <div className="relative w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none" 
                    placeholder="Search users..." 
                />
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm text-slate-400">
                <thead className="bg-slate-800/50 text-slate-200 uppercase text-xs font-bold tracking-wider">
                    <tr>
                        <th className="p-4">User</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Joined</th>
                        <th className="p-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {filteredUsers.map(u => (
                        <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                            <td className="p-4">
                                <div className="font-medium text-white">{u.name}</div>
                                <div className="text-xs text-slate-500">{u.email}</div>
                            </td>
                            <td className="p-4">
                                <div className="flex items-center gap-2">
                                    {updatingId === u.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                    ) : role === 'super_admin' ? (
                                        <select
                                            value={u.adminRole || 'customer'}
                                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                            className={`bg-slate-950 border border-slate-700 text-xs rounded px-2 py-1 focus:border-indigo-500 outline-none cursor-pointer hover:border-indigo-500 transition-colors ${
                                                u.adminRole ? 'text-purple-400 font-bold' : 'text-slate-400'
                                            }`}
                                        >
                                            <option value="customer">Customer</option>
                                            <option value="support">Support Agent</option>
                                            <option value="admin">Admin</option>
                                            <option value="super_admin">Super Admin</option>
                                        </select>
                                    ) : (
                                        <>
                                            {u.adminRole ? (
                                                <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded text-xs border border-purple-500/20 capitalize font-bold flex items-center gap-1">
                                                    <Shield className="w-3 h-3" /> {u.adminRole.replace('_', ' ')}
                                                </span>
                                            ) : (
                                                <span className="bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded text-xs border border-indigo-500/20">
                                                    Customer
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </td>
                            <td className="p-4 font-mono text-xs">
                                {new Date().toLocaleDateString()}
                            </td>
                            <td className="p-4 text-right">
                                <button 
                                    onClick={() => setSelectedUser(u)}
                                    className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredUsers.length === 0 && (
                <div className="p-12 text-center text-slate-500">
                    No users found matching "{search}"
                </div>
            )}
        </div>

        {/* Manage User Modal */}
        {selectedUser && (
            <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-md w-full shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-4">Manage User</h3>
                    <div className="bg-slate-800 p-4 rounded-lg mb-6 flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {selectedUser.name[0]}
                        </div>
                        <div>
                            <div className="font-bold text-white">{selectedUser.name}</div>
                            <div className="text-sm text-slate-400">{selectedUser.email}</div>
                            <div className="text-xs text-slate-500 font-mono mt-1">{selectedUser.id}</div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        {/* Status Management */}
                        <div className="space-y-2">
                            <button 
                                onClick={() => handleStatusChange(selectedUser.id, 'banned')}
                                disabled={isUpdating}
                                className="w-full flex items-center gap-3 p-3 bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg transition-colors"
                            >
                                <ShieldAlert className="w-5 h-5" />
                                <span>Ban User Access</span>
                            </button>
                            
                            <button 
                                disabled={isUpdating}
                                className="w-full flex items-center gap-3 p-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors"
                            >
                                <Mail className="w-5 h-5" />
                                <span>Send Password Reset</span>
                            </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setSelectedUser(null)}
                        className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
