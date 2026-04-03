import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, Sparkles, CheckCircle } from 'lucide-react';
import api from '../services/api';
import { generateBriefPdf } from '../utils/generateBriefPdf';

const initialFormState = {
  name: "", client: "", industry: "", website: "", key_competitors: [""],
  objective: "awareness", status: "draft", budget: "",
  start_date: "", end_date: "",
  target_audience: { demographics: "", interests: [""], location: [""], devices: [""] },
  creative_preferences: { tone: "", imagery_style: "", color_direction: [""], dos: [""], donts: [""] }
};

// 1. MOVE ArrayInput OUTSIDE of CampaignFormModal to prevent it from unmounting on every keystroke
const ArrayInput = ({ label, field, parent, formData, handleArrayChange, addArrayItem, removeArrayItem }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <div className="space-y-2">
      {(parent ? formData[parent][field] : formData[field]).map((item, index) => (
        // 2. Add a stable key combining field and index
        <div key={`${field}-${index}`} className="flex gap-2">
          <input 
            type="text" 
            value={item} 
            onChange={(e) => handleArrayChange(field, index, e.target.value, parent)} 
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition" 
          />
          <button type="button" onClick={() => removeArrayItem(field, index, parent)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addArrayItem(field, parent)} className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline font-medium">
        <Plus size={14} /> Add {label}
      </button>
    </div>
  </div>
);


const CampaignFormModal = ({ onClose, onCampaignUpdated, existingCampaign = null, updateLocalCampaign }) => {
  const isEdit = !!existingCampaign;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormState);
  const [isPreview, setIsPreview] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState(null);
  const [aiBrief, setAiBrief] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEdit && existingCampaign) {
      const fillArray = (arr) => arr?.length ? arr : [""];
      setFormData({
        name: existingCampaign.name || "", client: existingCampaign.client || "",
        industry: existingCampaign.industry || "", website: existingCampaign.website || "",
        key_competitors: fillArray(existingCampaign.key_competitors),
        objective: existingCampaign.objective || "awareness", status: existingCampaign.status || "draft",
        budget: existingCampaign.budget?.toString() || "",
        start_date: existingCampaign.start_date ? existingCampaign.start_date.slice(0, 16) : "",
        end_date: existingCampaign.end_date ? existingCampaign.end_date.slice(0, 16) : "",
        target_audience: {
          demographics: existingCampaign.target_audience?.demographics || "",
          interests: fillArray(existingCampaign.target_audience?.interests),
          location: fillArray(existingCampaign.target_audience?.location),
          devices: fillArray(existingCampaign.target_audience?.devices)
        },
        creative_preferences: {
          tone: existingCampaign.creative_preferences?.tone || "",
          imagery_style: existingCampaign.creative_preferences?.imagery_style || "",
          color_direction: fillArray(existingCampaign.creative_preferences?.color_direction),
          dos: fillArray(existingCampaign.creative_preferences?.dos),
          donts: fillArray(existingCampaign.creative_preferences?.donts)
        }
      });
    }
  }, [isEdit, existingCampaign]);

  const handleArrayChange = (field, index, value, parent = null) => {
    const updatedData = { ...formData };
    const target = parent ? { ...updatedData[parent] } : updatedData;
    target[field] = [...target[field]];
    target[field][index] = value;
    if (parent) updatedData[parent] = target;
    setFormData(updatedData);
  };

  const addArrayItem = (field, parent = null) => {
    const updatedData = { ...formData };
    const target = parent ? { ...updatedData[parent] } : updatedData;
    target[field] = [...target[field], ""];
    if (parent) updatedData[parent] = target;
    setFormData(updatedData);
  };

  const removeArrayItem = (field, index, parent = null) => {
    const updatedData = { ...formData };
    const target = parent ? { ...updatedData[parent] } : updatedData;
    if (target[field].length > 1) {
      target[field] = target[field].filter((_, i) => i !== index);
      if (parent) updatedData[parent] = target;
      setFormData(updatedData);
    }
  };

  const cleanDataForApi = (data) => {
    const safeDateParse = (dateString) => {
      if (!dateString) return null;
      const dateObj = new Date(dateString);
      return !isNaN(dateObj.getTime()) ? dateObj.toISOString() : null;
    };
    return { ...data, budget: parseFloat(data.budget) || 0, start_date: safeDateParse(data.start_date), end_date: safeDateParse(data.end_date) };
  };

  const getErrorMessage = (err) => {
    if (err.response?.data?.detail) {
      return Array.isArray(err.response.data.detail) ? err.response.data.detail.map(e => e.msg).join(', ') : err.response.data.detail;
    }
    return "Failed to process request.";
  };

  const handleSaveAndPreview = async () => {
    if (!formData.name || !formData.client || !formData.budget) return setError("Name, Client, and Budget are required.");
    setIsLoading(true); setError(null); setAiBrief(null);
    const payload = cleanDataForApi(formData);
    try {
      if (isEdit && existingCampaign?.source === 'mock') {
        updateLocalCampaign(existingCampaign.id, payload);
        setCreatedCampaign({ ...existingCampaign, ...payload });
      } else if (isEdit) {
        const response = await api.put(`/campaign/${existingCampaign.id}`, payload);
        setCreatedCampaign(response.data);
      } else {
        const response = await api.post('/campaign/', payload);
        setCreatedCampaign(response.data);
      }
      setIsPreview(true);
    } catch (err) { setError(getErrorMessage(err)); } 
    finally { setIsLoading(false); }
  };

  const handleGenerateBrief = async () => {
    setIsLoading(true);
    try { const response = await api.post(`/campaign/${createdCampaign.id}/generate-brief`); setAiBrief(response.data); } 
    catch (err) { setError(getErrorMessage(err)); } 
    finally { setIsLoading(false); }
  };

  // --- BEAUTIFUL PREVIEW UI ---
  if (isPreview && createdCampaign) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8 border border-gray-200 dark:border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-xl"><CheckCircle className="text-green-600 dark:text-green-400" size={28} /></div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{isEdit ? "Campaign Updated" : "Campaign Created"}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-xl transition"><X size={24} /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b-2 border-blue-200 dark:border-blue-800 pb-2 mb-4">Campaign Details</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Name:</span><p className="text-gray-800 dark:text-gray-100 font-semibold text-base">{createdCampaign.name}</p></div>
                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Client:</span><p className="text-gray-800 dark:text-gray-200">{createdCampaign.client}</p></div>
                <div className="flex items-center gap-2"><span className="text-gray-500 dark:text-gray-400 font-medium">Status:</span><span className="px-2.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-xs capitalize font-medium">{createdCampaign.status}</span></div>
                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Industry:</span><p className="text-gray-800 dark:text-gray-200">{createdCampaign.industry || 'N/A'}</p></div>
                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Budget:</span><p className="text-gray-800 dark:text-gray-100 font-semibold">${createdCampaign.budget.toLocaleString()}</p></div>
                {createdCampaign.key_competitors?.length > 0 && (
                  <div><span className="text-gray-500 dark:text-gray-400 font-medium block mb-1">Competitors:</span>
                  <div className="flex flex-wrap gap-1">{createdCampaign.key_competitors.map((c,i)=> <span key={i} className="bg-white dark:bg-gray-700 border dark:border-gray-600 px-2 py-0.5 rounded-lg text-xs text-gray-700 dark:text-gray-300">{c}</span>)}</div></div>
                )}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white border-b-2 border-purple-200 dark:border-purple-800 pb-2 mb-4">Audience & Creative</h3>
              <div className="space-y-3 text-sm">
                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Objective:</span><p className="text-gray-800 dark:text-gray-200 capitalize">{createdCampaign.objective || 'N/A'}</p></div>
                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Demographics:</span><p className="text-gray-800 dark:text-gray-200">{createdCampaign.target_audience?.demographics || 'N/A'}</p></div>
                <div><span className="text-gray-500 dark:text-gray-400 font-medium">Tone:</span><p className="text-gray-800 dark:text-gray-200">{createdCampaign.creative_preferences?.tone || 'N/A'}</p></div>
                {createdCampaign.creative_preferences?.color_direction?.length > 0 && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400 font-medium block mb-2">Color Direction:</span>
                    <div className="flex gap-2">{createdCampaign.creative_preferences.color_direction.map((c,i)=> <div key={i} className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600 shadow" style={{backgroundColor: c}} title={c}></div>)}</div>
                  </div>
                )}
                {createdCampaign.creative_preferences?.dos?.length > 0 && (
                  <div><span className="text-gray-500 dark:text-gray-400 font-medium block mb-1 text-green-600 dark:text-green-400">Do's:</span><ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">{createdCampaign.creative_preferences.dos.map((d,i)=><li key={i}>{d}</li>)}</ul></div>
                )}
                {createdCampaign.creative_preferences?.donts?.length > 0 && (
                  <div><span className="text-gray-500 dark:text-gray-400 font-medium block mb-1 text-red-600 dark:text-red-400">Don'ts:</span><ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">{createdCampaign.creative_preferences.donts.map((d,i)=><li key={i}>{d}</li>)}</ul></div>
                )}
              </div>
            </div>
          </div>

          {error && <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm mt-6">{error}</div>}

          {createdCampaign?.source === 'mock' ? (
            <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
               <span className="font-semibold">Local Edit:</span> This campaign was updated in your local state. AI Brief is only available for live backend campaigns.
            </div>
          ) : !aiBrief ? (
            <button onClick={handleGenerateBrief} disabled={isLoading} className="w-full mt-6 bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 transition font-medium flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.01] active:scale-[0.99]">
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
              {isLoading ? "Generating..." : "Generate AI Creative Brief"}
            </button>
          ) : (
            <div className="mt-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-5 space-y-5">
              <h3 className="font-bold text-purple-800 dark:text-purple-300 flex items-center gap-2 text-lg"><Sparkles size={20}/> AI Creative Brief</h3>
              <div><h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Suggested Title</h4><p className="text-gray-700 dark:text-gray-300">{aiBrief.campaign_title_suggestion}</p></div>
              <div><h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Headlines</h4><ul className="list-disc pl-5 text-gray-700 dark:text-gray-300 space-y-1">{aiBrief.headline_options.map((h, i) => <li key={i}>{h}</li>)}</ul></div>
              <div><h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Tone of Voice</h4><p className="text-gray-700 dark:text-gray-300">{aiBrief.tone_of_voice_guide}</p></div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Recommended Channels</h4>
                <div className="flex gap-2 flex-wrap">{aiBrief.recommended_channels.map((ch, i) => (<span key={i} className="bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-300 text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-purple-700 font-medium">{ch}</span>))}</div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Budget Allocation</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {aiBrief.budget_allocation_percentages && Object.entries(aiBrief.budget_allocation_percentages).map(([channel, percent], i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-2 border border-purple-100 dark:border-purple-800 text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{channel.replace(/_/g, ' ')}</p>
                      <p className="text-lg font-bold text-purple-700 dark:text-purple-300">{percent}%</p>
                    </div>
                  ))}
                </div>
              </div>
              <div><h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">Key Visual Direction</h4><p className="text-gray-700 dark:text-gray-300">{aiBrief.key_visual_direction}</p></div>
              <button onClick={() => generateBriefPdf(aiBrief, createdCampaign)} className="w-full mt-6 bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-3 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition font-medium flex items-center justify-center gap-2 shadow-lg hover:scale-[1.01] active:scale-[0.99]">⬇ Download Brief as PDF</button>
            </div>
          )}
          <button onClick={() => { onCampaignUpdated(); onClose(); }} className="w-full mt-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition font-medium">Close & Finish</button>
        </div>
      </div>
    );
  }

  // --- MULTI-STEP FORM UI ---
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">{isEdit ? "Edit Campaign" : "Create New Campaign"}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-xl transition"><X size={24} /></button>
        </div>

        <div className="px-6 pt-6">
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                step >= i ? 'bg-blue-600 dark:bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
              }`}></div>
            ))}
          </div>
        </div>

        {error && <div className="mx-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-xl text-sm">{error}</div>}
        
        <div className="p-6 pt-2">
          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Campaign Name *</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name *</label>
                  <input type="text" required value={formData.client} onChange={(e) => setFormData({...formData, client: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition">
                  <option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option><option value="completed">Completed</option><option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Industry</label>
                <input type="text" value={formData.industry} onChange={(e) => setFormData({...formData, industry: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                <input type="url" value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
              </div>
              
              {/* FIX: Pass props to ArrayInput */}
              <ArrayInput 
                label="Key Competitors" 
                field="key_competitors" 
                formData={formData}
                handleArrayChange={handleArrayChange}
                addArrayItem={addArrayItem}
                removeArrayItem={removeArrayItem}
              />
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Objective</label>
                <select value={formData.objective} onChange={(e) => setFormData({...formData, objective: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition">
                  <option value="awareness">Awareness</option><option value="consideration">Consideration</option><option value="conversion">Conversion</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Budget (USD) *</label>
                <input type="number" required value={formData.budget} onChange={(e) => setFormData({...formData, budget: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                  <input type="datetime-local" value={formData.start_date} onChange={(e) => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date</label>
                  <input type="datetime-local" value={formData.end_date} onChange={(e) => setFormData({...formData, end_date: e.target.value})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                </div>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h4 className="font-medium text-gray-800 dark:text-white mb-3">Target Audience</h4>
                <div className="mb-4">
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Demographics</label>
                  <input type="text" value={formData.target_audience.demographics} onChange={(e) => setFormData({...formData, target_audience: {...formData.target_audience, demographics: e.target.value}})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
                </div>
                {/* FIX: Pass props to ArrayInput */}
                <ArrayInput label="Interests" field="interests" parent="target_audience" formData={formData} handleArrayChange={handleArrayChange} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />
                <ArrayInput label="Locations" field="location" parent="target_audience" formData={formData} handleArrayChange={handleArrayChange} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />
                <ArrayInput label="Devices" field="devices" parent="target_audience" formData={formData} handleArrayChange={handleArrayChange} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tone of Voice</label>
                <input type="text" value={formData.creative_preferences.tone} onChange={(e) => setFormData({...formData, creative_preferences: {...formData.creative_preferences, tone: e.target.value}})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagery Style</label>
                <input type="text" value={formData.creative_preferences.imagery_style} onChange={(e) => setFormData({...formData, creative_preferences: {...formData.creative_preferences, imagery_style: e.target.value}})} className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition" />
              </div>
              {/* FIX: Pass props to ArrayInput */}
              <ArrayInput label="Color Direction" field="color_direction" parent="creative_preferences" formData={formData} handleArrayChange={handleArrayChange} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />
              <ArrayInput label="Do's" field="dos" parent="creative_preferences" formData={formData} handleArrayChange={handleArrayChange} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />
              <ArrayInput label="Don'ts" field="donts" parent="creative_preferences" formData={formData} handleArrayChange={handleArrayChange} addArrayItem={addArrayItem} removeArrayItem={removeArrayItem} />
            </div>
          )}
        </div>

        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
          {step > 1 ? 
            <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-medium">Back</button> 
            : <div></div>}
          {step < 3 ? 
            <button onClick={() => { setError(null); setStep(step + 1); }} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-md shadow-blue-500/25 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">Next Step</button> 
            : 
            <button onClick={handleSaveAndPreview} disabled={isLoading} className="px-6 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition flex items-center gap-2 disabled:opacity-50 font-medium shadow-md shadow-green-500/25 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]">
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : null} {isEdit ? 'Update & Preview' : 'Save & Preview'}
            </button>}
        </div>
      </div>
    </div>
  );
};

export default CampaignFormModal;