
import React from 'react';
import { ArrowUpRight, ArrowDownRight, Users, Film, DollarSign, Activity } from 'lucide-react';

interface DashboardViewProps {
  stats: any;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ stats }) => {
  const StatCard = ({ label, value, icon: Icon, trend, color }: any) => (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-lg bg-${color}-500/10`}>
                <Icon className={`w-6 h-6 text-${color}-400`} />
            </div>
            {trend && (
                <div className={`flex items-center text-xs font-medium ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trend > 0 ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
        <div className="text-slate-400 text-sm mb-1">{label}</div>
        <div className="text-3xl font-bold text-white">{value}</div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                label="Total Users" 
                value={stats?.totalUsers || 0} 
                icon={Users} 
                color="indigo"
                trend={12} 
            />
            <StatCard 
                label="Projects Created" 
                value={stats?.totalProjects || 0} 
                icon={Film} 
                color="purple"
                trend={8} 
            />
            <StatCard 
                label="Active Subscribers" 
                value={stats?.activeSubscribers || 0} 
                icon={Activity} 
                color="blue" 
                trend={5}
            />
            <StatCard 
                label="Est. Monthly Revenue" 
                value={`$${stats?.mrr || 0}`} 
                icon={DollarSign} 
                color="green" 
                trend={15}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Revenue Growth</h3>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-lg text-slate-500">
                    [Chart Placeholder: Line Chart of MRR over last 6 months]
                </div>
            </div>
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-6">Plan Distribution</h3>
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Free Tier</span>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className="w-[70%] h-full bg-slate-500"></div>
                            </div>
                            <span className="text-sm text-white">70%</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Starter</span>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className="w-[20%] h-full bg-indigo-500"></div>
                            </div>
                            <span className="text-sm text-white">20%</span>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400">Pro</span>
                        <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div className="w-[10%] h-full bg-purple-500"></div>
                            </div>
                            <span className="text-sm text-white">10%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
