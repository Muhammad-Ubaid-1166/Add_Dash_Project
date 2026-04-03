import { useState, useEffect, useMemo } from 'react';
import { Eye, MousePointerClick, Target, DollarSign, TrendingUp, ArrowUpRight, ArrowUpDown, Search, ArrowLeft, Users, Palette } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../services/api';
import mockData from '../data/mockData.json';
import CampaignFormModal from './CampaignFormModal';
import NotificationBell from './NotificationBell';
const dateRanges = ['Last 7d', 'Last 30d', 'Last 90d'];

const generateMockTrend = (campaign) => {
  const days = 30;
  const data = [];
  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - days);
  for(let i=0; i<days; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + i);
      data.push({
          date: `${currentDate.getMonth()+1}/${currentDate.getDate()}`,
          spend: campaign.spend > 0 ? Math.round((campaign.spend / days) * (0.6 + Math.random() * 0.8)) : 0,
          conversions: campaign.conversions > 0 ? Math.round((campaign.conversions / days) * (0.6 + Math.random() * 0.8)) : 0
      });
  }
  return data;
};

const Dashboard = ({ 
  selectedCampaignId, setSelectedCampaignId, campaigns, loading, refreshCampaigns, updateLocalCampaign,
  showCreateModal, setShowCreateModal, editCampaign, setEditCampaign 
}) => {
  const [activeRange, setActiveRange] = useState('Last 30d');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isDark, setIsDark] = useState(false);
  const itemsPerPage = 10;

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    setIsDark(document.documentElement.classList.contains('dark'));
    return () => observer.disconnect();
  }, []);

  const handleModalSuccess = () => {
    setShowCreateModal(false);
    setEditCampaign(null);
    refreshCampaigns();
  };

  const handleDeleteCampaign = async (e, campaignId) => {
    e.stopPropagation(); 
    if(window.confirm("Are you sure you want to soft-delete this campaign?")) {
      try {
        await api.delete(`/campaign/${campaignId}`);
        refreshCampaigns();
        if (selectedCampaignId === campaignId) {
          setSelectedCampaignId(null);
        }
      } catch (err) {
        alert("Failed to delete campaign. Make sure it's a Live API campaign.");
      }
    }
  };

  const selectedCampaign = useMemo(() => {
    return campaigns.find(c => c.id === selectedCampaignId) || null;
  }, [campaigns, selectedCampaignId]);

  const chartData = useMemo(() => {
    let baseData = selectedCampaign ? generateMockTrend(selectedCampaign) : mockData.trendData;
    if (activeRange === 'Last 7d') return baseData.slice(-7);
    return baseData;
  }, [activeRange, selectedCampaign]);

  const kpiAggregates = useMemo(() => {
    if (selectedCampaign) {
      const c = selectedCampaign;
      return {
        impressions: c.impressions, clicks: c.clicks, conversions: c.conversions, spend: c.spend,
        ctr: c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(2) : "0.00",
        roas: c.spend > 0 ? ((c.conversions * 50) / c.spend).toFixed(2) : "0.00",
      };
    }
    const totals = campaigns.reduce((acc, camp) => {
      acc.impressions += camp.impressions || 0; acc.clicks += camp.clicks || 0;
      acc.conversions += camp.conversions || 0; acc.spend += camp.spend || 0;
      return acc;
    }, { impressions: 0, clicks: 0, conversions: 0, spend: 0 });
    return {
      impressions: totals.impressions, clicks: totals.clicks, conversions: totals.conversions, spend: totals.spend,
      ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : "0.00",
      roas: totals.spend > 0 ? ((totals.conversions * 50) / totals.spend).toFixed(2) : "0.00",
    };
  }, [campaigns, selectedCampaign]);

  const kpis = [
    { title: 'Impressions', value: kpiAggregates.impressions.toLocaleString(), icon: Eye, color: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50' },
    { title: 'Clicks', value: kpiAggregates.clicks.toLocaleString(), icon: MousePointerClick, color: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50' },
    { title: 'CTR', value: `${kpiAggregates.ctr}%`, icon: TrendingUp, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-900/50' },
    { title: 'Conversions', value: kpiAggregates.conversions.toLocaleString(), icon: Target, color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50' },
    { title: 'Spend', value: `$${kpiAggregates.spend.toLocaleString()}`, icon: DollarSign, color: 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50' },
    { title: 'ROAS', value: `${kpiAggregates.roas}x`, icon: ArrowUpRight, color: 'text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/50' },
  ];
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const processedCampaigns = useMemo(() => {
    let filtered = campaigns.filter(camp => 
      camp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camp.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
    filtered.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return filtered;
  }, [campaigns, searchTerm, sortConfig]);
  const totalPages = Math.ceil(processedCampaigns.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const currentTableData = processedCampaigns.slice(startIndex, startIndex + itemsPerPage);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getStatusStyle = (status) => {
    const styles = { active: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400', paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400', draft: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400' };
    return styles[status] || styles.draft;
  };

  if (loading) return <main className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950"><p className="text-gray-500 dark:text-gray-400">Loading...</p></main>;

  return (
    <main className="flex-1 p-4 md:p-6 bg-gray-50 dark:bg-gray-950 overflow-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          {selectedCampaign && (
            <button onClick={() => setSelectedCampaignId(null)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400"><ArrowLeft size={20} /></button>
          )}
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedCampaign ? selectedCampaign.name : "Campaign Overview"}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedCampaign ? `Viewing metrics for ${selectedCampaign.client}` : "Showing Local Mock + Live Backend Data"}</p>
          </div>
        </div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div className="flex items-center gap-4">
          {/* ... existing back button and title ... */}
          
          {/* ADD THE BELL HERE */}
          <NotificationBell />
        </div>
        
        {/* Date range picker */}
        <div className="flex gap-2 bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-800">
          {/* ... date buttons ... */}
        </div>
      </div>
        <div className="flex gap-2 bg-white dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-800">
          {dateRanges.map(range => (
            <button key={range} onClick={() => setActiveRange(range)} className={`px-3 py-1.5 text-sm rounded-md transition ${activeRange === range ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{range}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-3"><span className="text-sm text-gray-500 dark:text-gray-400">{kpi.title}</span><div className={`p-2 rounded-lg ${kpi.color}`}><kpi.icon size={16} /></div></div>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Performance Trend ({activeRange})</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#f3f4f6"} />
              <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: isDark ? '#1f2937' : '#fff', border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`, borderRadius: '8px', color: isDark ? '#f3f4f6' : '#374151' }} />
              <Line type="monotone" dataKey="spend" stroke="#3b82f6" strokeWidth={2} dot={false} name="Spend ($)" />
              <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} dot={false} name="Conversions" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {selectedCampaign ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Campaign Details</h3>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(selectedCampaign.status)}`}>{selectedCampaign.status}</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2"><span className="text-gray-500 dark:text-gray-400">Budget</span><span className="font-medium text-gray-800 dark:text-gray-200">${selectedCampaign.budget.toLocaleString()}</span></div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2"><span className="text-gray-500 dark:text-gray-400">Spend</span><span className="font-medium text-gray-800 dark:text-gray-200">${selectedCampaign.spend.toLocaleString()}</span></div>
              <div className="flex justify-between border-b border-gray-200 dark:border-gray-700 pb-2"><span className="text-gray-500 dark:text-gray-400">Industry</span><span className="font-medium text-gray-800 dark:text-gray-200">{selectedCampaign.industry || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500 dark:text-gray-400">Website</span><a href={selectedCampaign.website} target="_blank" className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate ml-4">{selectedCampaign.website || 'N/A'}</a></div>
            </div>
            {selectedCampaign.key_competitors?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Key Competitors</p>
                <div className="flex flex-wrap gap-2">{selectedCampaign.key_competitors.map((comp, i) => <span key={i} className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs px-2 py-1 rounded">{comp}</span>)}</div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Users size={18}/> Target Audience</h3>
              <div className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
                <p><span className="font-medium text-gray-800 dark:text-gray-200">Demographics:</span> {selectedCampaign.target_audience?.demographics || 'N/A'}</p>
                <p><span className="font-medium text-gray-800 dark:text-gray-200">Objective:</span> <span className="capitalize">{selectedCampaign.objective || 'N/A'}</span></p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2"><Palette size={18}/> Creative Preferences</h3>
              <div className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
                <p><span className="font-medium text-gray-800 dark:text-gray-200">Tone:</span> {selectedCampaign.creative_preferences?.tone || 'N/A'}</p>
                <p><span className="font-medium text-gray-800 dark:text-gray-200">Imagery:</span> {selectedCampaign.creative_preferences?.imagery_style || 'N/A'}</p>
              </div>
              {selectedCampaign.creative_preferences?.color_direction?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase mb-2">Colors</p>
                  <div className="flex gap-2">
                    {selectedCampaign.creative_preferences.color_direction.map((color, i) => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow" style={{backgroundColor: color}} title={color}></div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">All Campaigns ({campaigns.length} total)</h3>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 w-full sm:w-64 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
          <div className="px-6 pt-4">
            <button onClick={() => setShowCreateModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition">+ New Campaign</button>
          </div>
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('name')}><div className="flex items-center gap-1">Name <ArrowUpDown size={14} /></div></th>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('client')}><div className="flex items-center gap-1">Client <ArrowUpDown size={14} /></div></th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Source</th>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('budget')}><div className="flex items-center gap-1">Budget <ArrowUpDown size={14} /></div></th>
                  <th className="px-6 py-3 cursor-pointer" onClick={() => requestSort('spend')}><div className="flex items-center gap-1">Spend <ArrowUpDown size={14} /></div></th>
                  <th className="px-6 py-3">CTR</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {currentTableData.length > 0 ? (
                  currentTableData.map(campaign => {
                    const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2) : '0.00';
                    return (
                      <tr key={`${campaign.source}-${campaign.id}`} onClick={() => setSelectedCampaignId(campaign.id)} className="hover:bg-blue-50 dark:hover:bg-blue-900/20 transition cursor-pointer">
                        <td className="px-6 py-4 font-medium text-gray-800 dark:text-gray-200">{campaign.name}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-2">
                            {campaign.client}
                            {campaign.deleted_at && (
                              <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 text-xs rounded-full font-semibold whitespace-nowrap">
                                Deleted
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${getStatusStyle(campaign.status)}`}>{campaign.status}</span></td>
                        <td className="px-6 py-4"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${campaign.source === 'live' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>{campaign.source === 'live' ? 'Live API' : 'Local JSON'}</span></td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">${campaign.budget.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">${campaign.spend.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{ctr}%</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setEditCampaign(campaign); }} 
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button 
                              onClick={(e) => handleDeleteCampaign(e, campaign.id)} 
                              className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="8" className="px-6 py-10 text-center text-gray-500 dark:text-gray-400">No campaigns found</td></tr>
                )}
              </tbody>
            </table>
                


          </div>
         

          {/* --- ADD THE PAGINATION UI EXACTLY HERE --- */}
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
            <p>
              Showing <span className="font-medium text-gray-800 dark:text-gray-200">{startIndex + 1}</span> to <span className="font-medium text-gray-800 dark:text-gray-200">{Math.min(startIndex + itemsPerPage, processedCampaigns.length)}</span> of <span className="font-medium text-gray-800 dark:text-gray-200">{processedCampaigns.length}</span> results
            </p>
            <div className="flex items-center gap-2 mt-4 sm:mt-0">
              <button 
                onClick={() => setCurrentPage(p => p - 1)} 
                disabled={safePage === 1}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-white dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-4 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md font-medium">
                Page {safePage} of {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => p + 1)} 
                disabled={safePage === totalPages}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-white dark:hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
          {/* ----------------------------------------- */}

    
        </div>
      )}

  {(showCreateModal || editCampaign) && (
    <CampaignFormModal 
      onClose={() => { setShowCreateModal(false); setEditCampaign(null); }} 
      onCampaignUpdated={handleModalSuccess}
      existingCampaign={editCampaign} 
      updateLocalCampaign={updateLocalCampaign}
    />
  )}
    </main>
  );
};

export default Dashboard;