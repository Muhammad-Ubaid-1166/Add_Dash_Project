import { useContext } from 'react';
import { LayoutDashboard, Users, ListChecks, Settings, Sun, Moon, PlusCircle } from 'lucide-react';
import { ThemeContext } from '../context/ThemeContext';

const Sidebar = ({ selectedCampaignId, setSelectedCampaignId, campaigns = [], onOpenCreateModal }) => {
  
  const { darkMode, toggleDarkMode } = useContext(ThemeContext);
  const uniqueClients = [...new Set(campaigns.map(c => c.client))];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 p-4 h-full overflow-y-auto">
      
      {/* Modern Logo Area */}
      <div className="flex items-center gap-2.5 mb-8 px-2">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-blue-500/30">A</div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">AdDash</h1>
      </div>

      {/* New Campaign Button */}
      <button 
        onClick={onOpenCreateModal}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/40 mb-6 hover:scale-[1.02] active:scale-[0.98]"
      >
        <PlusCircle size={18} /> AI Brief Generator
      </button>

      <nav className="flex-1 space-y-1">
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); setSelectedCampaignId(null); }}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 ${
            !selectedCampaignId 
              ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
          }`}
        >
          <LayoutDashboard size={20} /> Dashboard Overview
        </a>
        
        <div className="pt-5 pb-2">
          <p className="px-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Clients</p>
          {uniqueClients.map(client => (
            <a key={client} href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-3 px-3 py-2 mt-1 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200">
              <Users size={16} /> {client}
            </a>
          ))}
        </div>

        <div className="pt-5 pb-2">
          <p className="px-3 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Campaigns</p>
          <div className="mt-1 space-y-0.5 max-h-52 overflow-y-auto">
            {campaigns.map(camp => (
              <a 
                key={`${camp.source}-${camp.id}`} 
                href="#" 
                onClick={(e) => { e.preventDefault(); setSelectedCampaignId(camp.id); }}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 truncate ${
                  selectedCampaignId === camp.id 
                    ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium shadow-sm' 
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }`}
              >
                <ListChecks size={16} className="flex-shrink-0" /> <span className="truncate">{camp.name}</span>
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Bottom Settings */}
      <div className="space-y-1 pt-4 border-t border-gray-200 dark:border-gray-800 mt-4">
        <button 
          onClick={toggleDarkMode} 
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 w-full text-left transition-all duration-200"
        >
          {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>

        <a href="#" onClick={(e) => e.preventDefault()} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-200">
          <Settings size={20} /> Settings
        </a>
      </div>
    </aside>
  );
};

export default Sidebar;