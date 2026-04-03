import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import api from './services/api';
import mockData from './data/mockData.json';
import { ThemeProvider } from './context/ThemeContext'; // <-- ADD THIS IMPORT

const DashboardLayout = () => {
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ADD THESE TWO STATES HERE:
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCampaign, setEditCampaign] = useState(null);
  
  const [localMockCampaigns, setLocalMockCampaigns] = useState(mockData?.campaigns || []);

  const fetchAndMergeData = async () => {
    const safeLocal = Array.isArray(localMockCampaigns) ? localMockCampaigns : [];
    try {
      const localData = safeLocal.map(c => ({ ...c, source: 'mock' }));
      const response = await api.get('/campaign/?page_size=100');
      const apiData = (response.data?.items || []).map(c => ({ ...c, source: 'live' }));
      setCampaigns([...localData, ...apiData]);
    } catch (error) {
      const localData = safeLocal.map(c => ({ ...c, source: 'mock' }));
      setCampaigns(localData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAndMergeData(); }, []);

  const updateLocalCampaign = (campaignId, updatedData) => {
    setLocalMockCampaigns(prev => 
      (Array.isArray(prev) ? prev : []).map(c => c.id === campaignId ? { ...c, ...updatedData } : c)
    );
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 font-sans antialiased text-gray-800 dark:text-gray-200">
      {/* ADD onOpenCreateModal PROP HERE */}
      <Sidebar 
        selectedCampaignId={selectedCampaignId} 
        setSelectedCampaignId={setSelectedCampaignId} 
        campaigns={campaigns} 
        onOpenCreateModal={() => setShowCreateModal(true)}
      />
      
      <Dashboard 
        selectedCampaignId={selectedCampaignId} 
        setSelectedCampaignId={setSelectedCampaignId}
        campaigns={campaigns} 
        loading={loading}
        refreshCampaigns={fetchAndMergeData}
        updateLocalCampaign={updateLocalCampaign}
        /* PASS MODAL STATES DOWN TO DASHBOARD HERE */
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        editCampaign={editCampaign}
        setEditCampaign={setEditCampaign}
      />
    </div>
  );
};

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  return (
    // <-- WRAP YOUR ENTIRE APP IN ThemeProvider HERE -->
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage />} />
          <Route path="/signup" element={isAuthenticated ? <Navigate to="/dashboard" /> : <SignupPage />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>} />
          <Route path="*" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
    // ------------------------------------------------
  );
}

export default App;