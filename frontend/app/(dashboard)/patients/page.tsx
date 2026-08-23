'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PatientListResponse, Patient } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Plus,
  Search,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Calendar,
  Heart,
  Activity,
  Edit2,
  Eye,
  ToggleLeft,
  ToggleRight,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  AlertTriangle,
  X,
  ShieldAlert,
  CalendarPlus,
  FileText
} from 'lucide-react';

const BLOOD_GROUPS = [
  'All Blood Groups',
  'A+',
  'A-',
  'B+',
  'B-',
  'O+',
  'O-',
  'AB+',
  'AB-',
];

export default function PatientsDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodGroup, setSelectedBloodGroup] = useState('All Blood Groups');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'ARCHIVED'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(0);

  // Fetch total patient count for stats badge
  const { data: countData } = useQuery<PatientListResponse>({
    queryKey: ['patientsCount'],
    queryFn: async () => {
      const response = await apiClient.get('/patients', {
        params: { size: 1 },
      });
      return response.data;
    },
  });

  // Fetch paginated patients list
  const { data, isLoading, isError, error } = useQuery<PatientListResponse>({
    queryKey: ['patients', searchQuery, page],
    queryFn: async () => {
      const response = await apiClient.get('/patients', {
        params: {
          search: searchQuery,
          page,
          size: 12,
        },
      });
      return response.data;
    },
  });

  // Toggle patient archive status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (patientId: string) => {
      await apiClient.patch(`/patients/${patientId}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientsCount'] });
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    setSearchQuery(searchTerm);
  };

  const calculateAge = (dobString?: string) => {
    if (!dobString) return 'N/A';
    try {
      const birthDate = new Date(dobString);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age >= 0 ? `${age} Yrs` : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PT';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Filter content by blood group & status
  const filteredContent = useMemo(() => {
    return (data?.content || []).filter((p: Patient) => {
      if (statusFilter === 'ACTIVE' && !p.active) return false;
      if (statusFilter === 'ARCHIVED' && p.active) return false;
      if (
        selectedBloodGroup !== 'All Blood Groups' &&
        p.bloodGroup?.toUpperCase() !== selectedBloodGroup.toUpperCase()
      ) {
        return false;
      }
      return true;
    });
  }, [data?.content, statusFilter, selectedBloodGroup]);

  // Derived metrics
  const totalRecords = countData?.totalElements || data?.totalElements || 0;
  const activeCount = filteredContent.filter(p => p.active).length;
  const withAllergies = filteredContent.filter(p => !!p.allergies).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-100 dark:border-teal-800">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Patient Directory & Clinical Records
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage electronic health records (EHR), medical histories, contact demographics, and consultations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/patients/new" className="w-full md:w-auto">
            <Button className="w-full md:w-auto h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 border-0">
              <Plus className="w-4 h-4" />
              <span>Register New Patient</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalRecords}</div>
          </div>
          <div className="w-11 h-11 bg-slate-50 dark:bg-slate-850 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active Files</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Allergy Alerts</span>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">{withAllergies}</div>
          </div>
          <div className="w-11 h-11 bg-rose-50 dark:bg-rose-950/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Current Page</span>
            <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">
              {page + 1} / {data?.totalPages || 1}
            </div>
          </div>
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. SEARCH & FILTER TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Instant Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Patient Name or Mobile Number (press Enter)..."
              className="pl-9.5 pr-20 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSearchQuery('');
                  setPage(0);
                }}
                className="absolute right-14 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold"
            >
              Go
            </button>
          </form>

          {/* Blood Group Filter Dropdown */}
          <div className="w-full lg:w-48 shrink-0">
            <select
              value={selectedBloodGroup}
              onChange={(e) => setSelectedBloodGroup(e.target.value)}
              className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {BLOOD_GROUPS.map(bg => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-emerald-600 dark:text-slate-400'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'ARCHIVED'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Archived
            </button>
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

        {searchQuery && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Filtered By:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              <span>{searchQuery}</span>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setSearchQuery('');
                  setPage(0);
                }}
                className="hover:text-teal-900 dark:hover:text-white font-extrabold ml-1"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {/* 3. CONTENT AREA */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="w-9 h-9 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Loading patient records directory...</span>
        </div>
      ) : isError ? (
        <div className="p-16 text-center text-rose-600 font-bold bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs space-y-2">
          <AlertTriangle className="w-10 h-10 mx-auto text-rose-500" />
          <p className="text-sm">Failed to load patient records.</p>
          <p className="text-xs text-slate-400 font-normal">{(error as Error)?.message || 'Please refresh and try again.'}</p>
        </div>
      ) : filteredContent.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-850 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Patient Records Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            {searchQuery || selectedBloodGroup !== 'All Blood Groups' || statusFilter !== 'ALL'
              ? 'No patients matched your search filters. Try clearing search criteria.'
              : 'Register your first patient file to begin clinical consultations and prescription logs.'}
          </p>
          {searchQuery || selectedBloodGroup !== 'All Blood Groups' || statusFilter !== 'ALL' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSearchQuery('');
                setSelectedBloodGroup('All Blood Groups');
                setStatusFilter('ALL');
                setPage(0);
              }}
              className="text-xs mt-2"
            >
              Reset Filters
            </Button>
          ) : (
            <Link href="/patients/new">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-2xs mt-2">
                Register First Patient
              </Button>
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredContent.map((patient: Patient) => {
            const age = calculateAge(patient.dateOfBirth);

            return (
              <div
                key={patient.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4.5 flex flex-col justify-between group"
              >
                {/* Top Section */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center space-x-3.5">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm border border-white/20">
                          {getInitials(patient.name)}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                            patient.active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={patient.active ? 'Active Record' : 'Archived Record'}
                        />
                      </div>

                      {/* Patient Name & Details */}
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {patient.name || 'Unnamed Patient'}
                        </h3>
                        <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-medium">
                          <span>{age}</span>
                          <span>•</span>
                          <span>{patient.gender || 'Not Specified'}</span>
                          {patient.bloodGroup && (
                            <span className="px-2 py-0.2 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800 rounded-md text-[10px]">
                              {patient.bloodGroup}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleStatusMutation.mutate(patient.id)}
                      className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title={patient.active ? 'Active (Click to archive)' : 'Archived (Click to restore)'}
                    >
                      {patient.active ? (
                        <ToggleRight className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Contact Info Box */}
                  <div className="bg-slate-50/70 dark:bg-slate-850/60 p-3 rounded-2xl border border-slate-150/70 dark:border-slate-800 space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                        <Phone className="w-3.5 h-3.5" /> Mobile:
                      </span>
                      <strong className="text-slate-900 dark:text-white font-mono">{patient.phone}</strong>
                    </div>

                    {patient.email && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-slate-400 font-medium">
                          <Mail className="w-3.5 h-3.5" /> Email:
                        </span>
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[160px]">{patient.email}</span>
                      </div>
                    )}

                    {patient.emergencyContactPhone && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-400">Emergency:</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {patient.emergencyContactName ? `${patient.emergencyContactName}: ` : ''}{patient.emergencyContactPhone}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Allergies / Medical History Alert Callout */}
                  {(patient.allergies || patient.medicalHistory) && (
                    <div className="p-2.5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-[11px] space-y-0.5">
                      {patient.allergies && (
                        <div className="flex items-center gap-1 text-rose-700 dark:text-rose-400 font-bold truncate">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Allergies: {patient.allergies}</span>
                        </div>
                      )}
                      {patient.medicalHistory && (
                        <div className="text-amber-800 dark:text-amber-300 truncate">
                          History: {patient.medicalHistory}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Link href={`/patients/${patient.id}`} className="flex-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-8.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-teal-600" />
                      <span>EHR Case File</span>
                    </Button>
                  </Link>

                  <Link href={`/patients/${patient.id}/edit`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8.5 text-xs rounded-xl border-slate-200 dark:border-slate-700 p-2 cursor-pointer"
                      title="Edit Patient"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    onClick={() => router.push(`/appointments/new?patientId=${patient.id}`)}
                    className="h-8.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5" />
                    <span>Consult</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Patient Profile</th>
                  <th className="py-3.5 px-5">Age / Gender</th>
                  <th className="py-3.5 px-5">Contact Mobile</th>
                  <th className="py-3.5 px-5">Blood Group</th>
                  <th className="py-3.5 px-5">Clinical Alerts</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredContent.map((patient: Patient) => {
                  const age = calculateAge(patient.dateOfBirth);

                  return (
                    <tr key={patient.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {getInitials(patient.name)}
                          </div>
                          <div>
                            <Link
                              href={`/patients/${patient.id}`}
                              className="font-bold text-slate-900 dark:text-white hover:text-teal-600 transition-colors block text-sm"
                            >
                              {patient.name || 'Unnamed Patient'}
                            </Link>
                            <span className="text-[11px] text-slate-400 font-mono">
                              ID: {patient.id.slice(0, 8).toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 font-medium text-slate-700 dark:text-slate-300">
                        {age} • {patient.gender || 'N/A'}
                      </td>

                      <td className="py-3.5 px-5 font-mono text-slate-800 dark:text-slate-200 font-semibold">
                        {patient.phone}
                      </td>

                      <td className="py-3.5 px-5">
                        {patient.bloodGroup ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-mono">
                            {patient.bloodGroup}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        {patient.allergies ? (
                          <span className="inline-block px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md text-[10px] font-bold truncate max-w-[150px]">
                            {patient.allergies}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None Reported</span>
                        )}
                      </td>

                      <td className="py-3.5 px-5">
                        <button
                          type="button"
                          onClick={() => toggleStatusMutation.mutate(patient.id)}
                          className="cursor-pointer flex items-center gap-1.5"
                          title={patient.active ? 'Active' : 'Archived'}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              patient.active ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <span className={`font-bold ${patient.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {patient.active ? 'Active' : 'Archived'}
                          </span>
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/patients/${patient.id}`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg px-2.5">
                              <FileText className="w-3.5 h-3.5 mr-1 text-teal-600" />
                              <span>EHR</span>
                            </Button>
                          </Link>
                          <Link href={`/patients/${patient.id}/edit`}>
                            <Button size="sm" variant="outline" className="h-8 text-xs rounded-lg px-2.5">
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => router.push(`/appointments/new?patientId=${patient.id}`)}
                            className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg px-3"
                          >
                            Consult
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. PAGINATION FOOTER */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 px-6 py-4 rounded-2xl shadow-xs text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-medium">
            Showing Page <strong className="text-slate-900 dark:text-white font-bold">{page + 1}</strong> of <strong className="text-slate-900 dark:text-white font-bold">{data.totalPages}</strong> ({data.totalElements} Total Patients)
          </span>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={data.first}
              onClick={() => setPage((prev) => Math.max(0, prev - 1))}
              className="h-8 rounded-lg px-3 font-semibold disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={data.last}
              onClick={() => setPage((prev) => prev + 1)}
              className="h-8 rounded-lg px-3 font-semibold disabled:opacity-40"
            >
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
