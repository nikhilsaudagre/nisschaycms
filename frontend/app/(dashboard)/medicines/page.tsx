'use client';

import React, { useState, useMemo, useDeferredValue } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Medicine } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Pill,
  Search,
  Plus,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Tag,
  Clock,
  FileText,
  Upload,
  Download,
  Loader2,
  LayoutGrid,
  List,
  Building,
  Sparkles,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

export default function MedicinesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Bulk import states
  const [importError, setImportError] = useState<string | null>(null);
  const [importTab, setImportTab] = useState<'preload' | 'custom'>('preload');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 18;

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Form states
  const [name, setName] = useState('');
  const [manufacturerName, setManufacturerName] = useState('');
  const [saltComposition, setSaltComposition] = useState('');
  const [medicineDesc, setMedicineDesc] = useState('');
  const [sideEffects, setSideEffects] = useState('');
  const [savingMed, setSavingMed] = useState(false);

  // Selected medicine for detail panel/drawer
  const [selectedMed, setSelectedMed] = useState<Medicine | null>(null);

  // Fetch medicines list
  const { data: medicines = [], isLoading, isError, error } = useQuery<Medicine[]>({
    queryKey: ['medicines'],
    queryFn: async () => {
      const response = await apiClient.get('/medicines');
      return response.data;
    },
  });

  const deferredSearch = useDeferredValue(searchQuery);

  // Filter medicines
  const filteredMedicines = useMemo(() => {
    const term = deferredSearch.toLowerCase().trim();
    if (!term) return medicines;

    return medicines.filter((med) => {
      const name = (med.name || '').toLowerCase();
      const manufacturer = (med.manufacturerName || '').toLowerCase();
      const salt = (med.saltComposition || '').toLowerCase();
      return name.includes(term) || manufacturer.includes(term) || salt.includes(term);
    });
  }, [medicines, deferredSearch]);

  const totalPages = Math.ceil(filteredMedicines.length / itemsPerPage);
  const paginatedMedicines = filteredMedicines.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Key metrics calculation
  const totalMeds = medicines.length;
  const uniqueManufacturers = Array.from(new Set(medicines.map((m) => m.manufacturerName).filter(Boolean))).length;
  const uniqueSalts = Array.from(new Set(medicines.map((m) => m.saltComposition).filter(Boolean))).length;

  // Add new medicine mutation
  const addMedicineMutation = useMutation({
    mutationFn: async (newMed: Partial<Medicine>) => {
      const res = await apiClient.post('/medicines', newMed);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = apiErr?.response?.data?.message || apiErr?.message || 'Failed to register medicine';
      setModalError(msg);
    },
  });

  // Reseed Indian medicines database mutation
  const reseedMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/medicines/reseed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowImportModal(false);
      alert('Successfully preloaded 48 essential Indian medicines into your directory!');
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = apiErr?.response?.data?.message || apiErr?.message || 'Failed to preload medicines';
      setImportError(msg);
    },
  });

  // Toggle active/delete status mutation
  const deleteMedicineMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/medicines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      if (selectedMed?.id) setSelectedMed(null);
    },
  });

  // Download sample template
  const downloadSampleTemplate = (type: 'csv' | 'json') => {
    let data = '';
    let filename = '';

    const sampleDataset = [
      {
        name: 'Dolo 650mg',
        manufacturerName: 'Micro Labs Ltd',
        saltComposition: 'Paracetamol (650mg)',
        medicineDesc: 'Used for fever and mild to moderate pain relief.',
        sideEffects: 'Nausea, skin rashes on overdose',
      },
      {
        name: 'Augmentin 625 Duo',
        manufacturerName: 'GlaxoSmithKline Pharmaceuticals Ltd',
        saltComposition: 'Amoxicillin (500mg) + Clavulanic Acid (125mg)',
        medicineDesc: 'Broad spectrum penicillin antibiotic for bacterial infections.',
        sideEffects: 'Diarrhea, yeast infection, nausea',
      },
    ];

    if (type === 'csv') {
      const headers = ['name', 'manufacturerName', 'saltComposition', 'medicineDesc', 'sideEffects'];
      const rows = sampleDataset.map(
        (item) => `"${item.name}","${item.manufacturerName}","${item.saltComposition}","${item.medicineDesc}","${item.sideEffects}"`
      );
      data = [headers.join(','), ...rows].join('\n');
      filename = 'preloaded_indian_medicines_template.csv';
    } else {
      data = JSON.stringify(sampleDataset, null, 2);
      filename = 'preloaded_indian_medicines_template.json';
    }

    const blob = new Blob([data], { type: type === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Safe file upload
  const fileUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await apiClient.post('/medicines/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      setShowImportModal(false);
      setImportError(null);
      alert(`Import completed successfully! Registered ${data.length} medicines.`);
    },
    onError: (err: unknown) => {
      const apiErr = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = apiErr?.response?.data?.message || apiErr?.message || 'Failed to upload and import file';
      setImportError(msg);
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension !== 'csv' && extension !== 'json') {
      setImportError('Unsupported file type. Please upload a .csv or .json file.');
      return;
    }

    fileUploadMutation.mutate(file);
  };

  const resetForm = () => {
    setName('');
    setManufacturerName('');
    setSaltComposition('');
    setMedicineDesc('');
    setSideEffects('');
    setModalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMed(true);
    setModalError(null);

    addMedicineMutation.mutate(
      {
        name,
        manufacturerName,
        saltComposition,
        medicineDesc,
        sideEffects,
      },
      {
        onSettled: () => setSavingMed(false),
      }
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-100 dark:border-teal-800">
              <Pill className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Medicines & Drug Directory
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage pharmacological database, generic salt compositions, manufacturer catalogs, and e-prescription auto-complete.
              </p>
            </div>
          </div>
        </div>

        {user?.role === 'ADMIN' && (
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Button
              variant="outline"
              onClick={() => setShowImportModal(true)}
              className="h-10 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Bulk Import</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                if (confirm('Preload 50+ top Indian medicine brands & generic formulations into your clinic database?')) {
                  reseedMutation.mutate();
                }
              }}
              disabled={reseedMutation.isPending}
              className="h-10 border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 bg-teal-50/50 dark:bg-teal-950/30 font-semibold text-xs rounded-xl"
            >
              <span>{reseedMutation.isPending ? 'Loading...' : '🇮🇳 Load 50+ Indian Meds'}</span>
            </Button>

            <Button
              onClick={() => setShowAddModal(true)}
              className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 rounded-xl shadow-xs cursor-pointer flex items-center gap-2 border-0"
            >
              <Plus className="w-4 h-4" />
              <span>Register Medicine</span>
            </Button>
          </div>
        )}
      </div>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Formulations</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalMeds}</div>
          </div>
          <div className="w-11 h-11 bg-slate-50 dark:bg-slate-850 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Pill className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Generic Salts</span>
            <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">{uniqueSalts}</div>
          </div>
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Pharma Brands</span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{uniqueManufacturers}</div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Building className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Page Filter</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {currentPage} / {totalPages || 1}
            </div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. SEARCH & CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by brand name (Dolo), salt composition (Paracetamol), manufacturer..."
              className="pl-9.5 pr-8 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View Mode Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. MEDICINES CONTENT */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="w-9 h-9 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Loading medicines database...</span>
        </div>
      ) : isError ? (
        <div className="p-16 text-center text-rose-600 font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
          <p className="text-sm">Failed to load medicines directory.</p>
          <p className="text-xs text-slate-400 font-normal">{(error as Error)?.message || 'Please refresh.'}</p>
        </div>
      ) : paginatedMedicines.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <Pill className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Medicines Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            {searchQuery
              ? 'No drug matches your search term. Try searching with generic salt composition.'
              : 'Add medicines to enable rapid e-prescription writing.'}
          </p>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-2xs mt-2"
          >
            Register First Medicine
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {paginatedMedicines.map((med: Medicine) => (
            <div
              key={med.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800 flex items-center justify-center font-extrabold text-sm shrink-0">
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {med.name}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">{med.manufacturerName || 'Generic Formulation'}</p>
                    </div>
                  </div>

                  {user?.role === 'ADMIN' && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove ${med.name} from clinic database?`)) {
                          deleteMedicineMutation.mutate(med.id);
                        }
                      }}
                      className="text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors p-1"
                      title="Delete Medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Salt Composition */}
                <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Salt / Active Ingredients</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{med.saltComposition || 'Not Specified'}</p>
                </div>

                {/* Indication / Description */}
                {med.medicineDesc && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {med.medicineDesc}
                  </p>
                )}

                {/* Side Effects Badge */}
                {med.sideEffects && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200/80 dark:border-amber-900/40">
                    <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span className="truncate">Caution: {med.sideEffects}</span>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedMed(med)}
                  className="w-full h-8.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Info className="w-3.5 h-3.5 mr-1.5 text-teal-600" />
                  <span>View Drug Details</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Brand Name</th>
                  <th className="py-3.5 px-5">Manufacturer</th>
                  <th className="py-3.5 px-5">Salt Composition</th>
                  <th className="py-3.5 px-5">Therapeutic Indication</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {paginatedMedicines.map((med: Medicine) => (
                  <tr key={med.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-slate-900 dark:text-white text-sm">
                      {med.name}
                    </td>
                    <td className="py-3.5 px-5 text-slate-600 dark:text-slate-300 font-medium">
                      {med.manufacturerName || 'Generic Formulation'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-800 dark:text-slate-200 font-semibold">
                      {med.saltComposition || '—'}
                    </td>
                    <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 max-w-xs truncate">
                      {med.medicineDesc || '—'}
                    </td>
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedMed(med)}
                          className="h-8 text-xs rounded-lg px-2.5"
                        >
                          <Info className="w-3.5 h-3.5 text-teal-600" />
                        </Button>
                        {user?.role === 'ADMIN' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (confirm(`Delete ${med.name}?`)) {
                                deleteMedicineMutation.mutate(med.id);
                              }
                            }}
                            className="h-8 text-xs rounded-lg px-2.5 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-6 py-4 rounded-2xl shadow-xs text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Showing Page <strong className="text-slate-900 dark:text-white font-bold">{currentPage}</strong> of <strong className="text-slate-900 dark:text-white font-bold">{totalPages}</strong> ({filteredMedicines.length} Formulations)
          </span>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              className="h-8 rounded-lg px-3 font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              className="h-8 rounded-lg px-3 font-semibold disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* 5. ADD MEDICINE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Pill className="w-5 h-5 text-teal-600" />
                  <span>Register New Medicine</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Add pharmaceutical formulation to your clinic catalog.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Brand / Medicine Name *</label>
                <Input
                  required
                  placeholder="e.g. Dolo 650mg Tablet, Augmentin 625 Duo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Manufacturer / Pharma Company</label>
                <Input
                  placeholder="e.g. Micro Labs Ltd, Sun Pharma, Cipla"
                  value={manufacturerName}
                  onChange={(e) => setManufacturerName(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Salt / Active Ingredients</label>
                <Input
                  placeholder="e.g. Paracetamol (650mg), Amoxicillin + Clavulanate"
                  value={saltComposition}
                  onChange={(e) => setSaltComposition(e.target.value)}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Therapeutic Indications / Usage</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Used for high fever, acute body aches, and pain relief."
                  value={medicineDesc}
                  onChange={(e) => setMedicineDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700 dark:text-slate-300">Side Effects / Contraindications</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Nausea, dizziness, avoid in severe hepatic impairment."
                  value={sideEffects}
                  onChange={(e) => setSideEffects(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingMed}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl px-5"
                >
                  {savingMed ? 'Registering...' : 'Save Medicine'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. BULK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-teal-600" />
                  <span>Bulk Import Medicines</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Upload CSV or JSON file to populate your catalog.</p>
              </div>

              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {importError && (
              <div className="p-3 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold">
                {importError}
              </div>
            )}

            <div className="space-y-4 text-xs">
              <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-center space-y-2 bg-slate-50 dark:bg-slate-850">
                <Upload className="w-8 h-8 mx-auto text-slate-400" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">Choose CSV or JSON dataset</p>
                <input
                  type="file"
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                  className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-600 file:text-white hover:file:bg-teal-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400 font-medium">Download sample template:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadSampleTemplate('csv')}
                    className="text-xs rounded-lg h-8"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadSampleTemplate('json')}
                    className="text-xs rounded-lg h-8"
                  >
                    <Download className="w-3.5 h-3.5 mr-1" /> JSON
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. DRUG DETAIL MODAL */}
      {selectedMed && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800 flex items-center justify-center font-extrabold text-sm">
                  <Pill className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {selectedMed.name}
                  </h2>
                  <p className="text-xs text-slate-400 font-medium">{selectedMed.manufacturerName || 'Generic Manufacturer'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedMed(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Salt Composition</span>
                <p className="text-slate-900 dark:text-white font-bold text-sm">{selectedMed.saltComposition || 'Not Specified'}</p>
              </div>

              {selectedMed.medicineDesc && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Therapeutic Indications</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{selectedMed.medicineDesc}</p>
                </div>
              )}

              {selectedMed.sideEffects && (
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-1">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block">Side Effects & Contraindications</span>
                  <p className="text-amber-900 dark:text-amber-200 font-medium">{selectedMed.sideEffects}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end border-t border-slate-100 dark:border-slate-800">
              <Button
                size="sm"
                onClick={() => setSelectedMed(null)}
                className="bg-slate-900 dark:bg-slate-800 text-white text-xs font-semibold rounded-xl px-5"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
