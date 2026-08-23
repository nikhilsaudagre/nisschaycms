'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Doctor } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DoctorForm } from '@/components/doctor-form';
import {
  Stethoscope,
  Plus,
  Search,
  Users,
  UserCheck,
  UserX,
  Phone,
  Mail,
  Building,
  Clock,
  IndianRupee,
  Award,
  Calendar,
  Edit2,
  Eye,
  ToggleLeft,
  ToggleRight,
  LayoutGrid,
  List,
  Sparkles,
  CheckCircle2,
  X,
  CalendarPlus,
  ShieldCheck,
  Briefcase,
  AlertCircle
} from 'lucide-react';

const SPECIALIZATIONS = [
  'All Specializations',
  'General Medicine',
  'Cardiology',
  'Pediatrics',
  'Dermatology',
  'Orthopedics',
  'Gynecology & Obstetrics',
  'ENT (Otolaryngology)',
  'Ophthalmology',
  'Neurology',
  'Psychiatry',
  'Dental Surgery',
  'Physiotherapy',
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DoctorsDirectoryPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All Specializations');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modals / Drawers
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);

  // Fetch doctors list
  const { data: doctors = [], isLoading, isError, error } = useQuery<Doctor[]>({
    queryKey: ['doctors-profiles'],
    queryFn: async () => {
      const response = await apiClient.get('/doctors');
      return response.data;
    },
  });

  // Toggle active status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/doctors/${id}/status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
    },
  });

  // Filtered doctors list
  const filteredDoctors = useMemo(() => {
    return doctors.filter(doc => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !doc.active) return false;
      if (statusFilter === 'INACTIVE' && doc.active) return false;

      // Specialization filter
      if (
        selectedSpecialization !== 'All Specializations' &&
        doc.specialization?.toLowerCase() !== selectedSpecialization.toLowerCase()
      ) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const nameMatch = doc.name?.toLowerCase().includes(query);
        const specMatch = doc.specialization?.toLowerCase().includes(query);
        const phoneMatch = doc.phone?.toLowerCase().includes(query);
        const emailMatch = doc.email?.toLowerCase().includes(query);
        const regMatch = doc.registrationNumber?.toLowerCase().includes(query);
        const qualMatch = doc.qualification?.toLowerCase().includes(query);
        return nameMatch || specMatch || phoneMatch || emailMatch || regMatch || qualMatch;
      }

      return true;
    });
  }, [doctors, statusFilter, selectedSpecialization, searchTerm]);

  // Key metrics calculation
  const totalDoctors = doctors.length;
  const activeDoctors = doctors.filter(d => d.active).length;
  const uniqueSpecialties = Array.from(new Set(doctors.map(d => d.specialization).filter(Boolean))).length;
  const avgConsultFee = doctors.length > 0
    ? Math.round(doctors.reduce((sum, d) => sum + (d.consultationFee || 0), 0) / doctors.length)
    : 0;

  // Calculate doctor counts per specialization
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    doctors.forEach(doc => {
      const spec = doc.specialization || 'General Medicine';
      counts[spec] = (counts[spec] || 0) + 1;
    });
    return counts;
  }, [doctors]);

  const getInitials = (name: string) => {
    if (!name) return 'DR';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getSpecialtyBadgeStyle = (specialty?: string) => {
    const s = (specialty || '').toLowerCase();
    if (s.includes('cardio')) return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800';
    if (s.includes('pediat')) return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';
    if (s.includes('ortho')) return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800';
    if (s.includes('derma')) return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800';
    if (s.includes('neuro')) return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800';
    if (s.includes('gynec')) return 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/40 dark:text-pink-300 dark:border-pink-800';
    return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800';
  };

  // Helper to test if a day is active in availability
  const isDayActive = (schedule: string | undefined, day: string) => {
    if (!schedule) return true;
    const s = schedule.toLowerCase();
    const d = day.toLowerCase();
    if (s.includes('mon-fri') || s.includes('monday to friday')) {
      return ['mon', 'tue', 'wed', 'thu', 'fri'].includes(d);
    }
    if (s.includes('mon-sat') || s.includes('monday to saturday') || s.includes('daily')) {
      return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].includes(d);
    }
    if (s.includes('all days') || s.includes('24x7') || s.includes('sunday')) {
      return true;
    }
    return s.includes(d);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. EXECUTIVE HEADER & STATS OVERVIEW (Matching Patients / Appointments Pages) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-6 rounded-3xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2.5 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-2xl border border-teal-100 dark:border-teal-800">
              <Stethoscope className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Medical Practitioners & Doctors
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Manage doctor profiles, clinical credentials, consultation tariffs, and OPD schedules.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link href="/appointments/new" className="w-full md:w-auto">
            <Button variant="outline" className="w-full md:w-auto h-10 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs px-4 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2">
              <CalendarPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>Schedule OPD</span>
            </Button>
          </Link>
          <Link href="/doctors/new" className="w-full md:w-auto">
            <Button className="w-full md:w-auto h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 rounded-xl shadow-xs cursor-pointer flex items-center justify-center gap-2 border-0">
              <Plus className="w-4 h-4" />
              <span>Register New Doctor</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* STATS CARDS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Doctors</span>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{totalDoctors}</div>
          </div>
          <div className="w-11 h-11 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Active On Duty</span>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeDoctors}</div>
          </div>
          <div className="w-11 h-11 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Specialties</span>
            <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400">{uniqueSpecialties}</div>
          </div>
          <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4.5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Avg. Consult Fee</span>
            <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">₹{avgConsultFee}</div>
          </div>
          <div className="w-11 h-11 bg-teal-50 dark:bg-teal-950/50 rounded-xl flex items-center justify-center text-teal-600 dark:text-teal-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. SEARCH & ADVANCED FILTER TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by doctor name, specialization, qualification, phone, or license..."
              className="pl-9.5 pr-8 h-10 text-xs rounded-xl bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-700"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Specialization Filter Dropdown */}
          <div className="w-full lg:w-56 shrink-0">
            <select
              value={selectedSpecialization}
              onChange={(e) => setSelectedSpecialization(e.target.value)}
              className="w-full h-10 px-3 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {SPECIALIZATIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Status Pills */}
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
              All ({doctors.length})
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
              Active ({activeDoctors})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Inactive ({doctors.length - activeDoctors})
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

        {/* Quick Specialty Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1">
          <button
            type="button"
            onClick={() => setSelectedSpecialization('All Specializations')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
              selectedSpecialization === 'All Specializations'
                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 font-bold'
                : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>All Specializations</span>
            <span className="text-[10px] text-slate-400">({doctors.length})</span>
          </button>

          {SPECIALIZATIONS.filter(s => s !== 'All Specializations').map((spec) => {
            const count = specialtyCounts[spec] || 0;
            if (count === 0 && selectedSpecialization !== spec) return null; // Show populated ones
            const isSelected = selectedSpecialization === spec;

            return (
              <button
                key={spec}
                type="button"
                onClick={() => setSelectedSpecialization(spec)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 font-bold'
                    : 'bg-transparent text-slate-500 dark:text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{spec}</span>
                {count > 0 && <span className="text-[10px] text-slate-400">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CONTENT AREA */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-500 font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs">
          <div className="w-9 h-9 border-3 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-3"></div>
          <span className="text-xs font-semibold">Loading doctor directory...</span>
        </div>
      ) : isError ? (
        <div className="p-16 text-center text-rose-600 font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto text-rose-500" />
          <p className="text-sm">Failed to load doctor profiles.</p>
          <p className="text-xs text-slate-400 font-normal">{(error as Error)?.message || 'Please refresh or try again.'}</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="p-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
          <div className="w-14 h-14 bg-slate-50 dark:bg-slate-850 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Stethoscope className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Doctor Profiles Found</h3>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            {searchTerm || selectedSpecialization !== 'All Specializations' || statusFilter !== 'ALL'
              ? 'No medical practitioners match the search or filter criteria. Try resetting filters.'
              : 'Add your clinic doctors to begin scheduling consultations and writing e-prescriptions.'}
          </p>
          {searchTerm || selectedSpecialization !== 'All Specializations' || statusFilter !== 'ALL' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setSelectedSpecialization('All Specializations');
                setStatusFilter('ALL');
              }}
              className="text-xs mt-2"
            >
              Reset Filters
            </Button>
          ) : (
            <Link href="/doctors/new">
              <Button className="bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-2xs mt-2">
                Register First Doctor
              </Button>
            </Link>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc: Doctor) => {
            const specBadge = getSpecialtyBadgeStyle(doc.specialization);

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:border-teal-500/50 dark:hover:border-teal-500/50 rounded-3xl p-5 shadow-xs hover:shadow-md transition-all space-y-4.5 flex flex-col justify-between group"
              >
                {/* Top Section: Avatar, Status & Core Info */}
                <div className="space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center space-x-3.5">
                      {/* Avatar */}
                      <div className="relative">
                        <div className="w-13 h-13 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm border border-white/20">
                          {getInitials(doc.name)}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 ${
                            doc.active ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                          title={doc.active ? 'Active' : 'Inactive'}
                        />
                      </div>

                      {/* Doctor Name & Spec */}
                      <div className="space-y-0.5">
                        <h3 className="font-extrabold text-slate-900 dark:text-white text-base leading-tight group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                          {doc.name}
                        </h3>
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${specBadge}`}>
                          {doc.specialization || 'General Physician'}
                        </span>
                        {doc.qualification && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {doc.qualification}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status Toggle Button */}
                    <button
                      type="button"
                      onClick={() => toggleStatusMutation.mutate(doc.id)}
                      className="cursor-pointer text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title={doc.active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {doc.active ? (
                        <ToggleRight className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <ToggleLeft className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                      )}
                    </button>
                  </div>

                  {/* Key Metrics Chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consultation</span>
                      <strong className="text-slate-900 dark:text-white font-bold text-sm">
                        ₹{doc.consultationFee ?? 500}
                      </strong>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Chamber / Slot</span>
                      <strong className="text-slate-900 dark:text-white font-medium text-xs truncate block">
                        {doc.roomNumber ? `Room ${doc.roomNumber}` : 'General OPD'} • {doc.slotDuration || 15}m
                      </strong>
                    </div>
                  </div>

                  {/* Weekly Schedule Days Strip */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> OPD Availability:
                      </span>
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[130px]">
                        {doc.availabilitySchedule || 'Mon - Sat (Regular)'}
                      </span>
                    </div>

                    {/* Day pills */}
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {WEEK_DAYS.map((day) => {
                        const active = isDayActive(doc.availabilitySchedule, day);
                        return (
                          <div
                            key={day}
                            className={`py-0.5 rounded text-[9px] font-bold uppercase transition-all ${
                              active
                                ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                                : 'bg-slate-50 dark:bg-slate-850 text-slate-300 dark:text-slate-600'
                            }`}
                            title={`${day}: ${active ? 'Available' : 'Off'}`}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-medium bg-slate-50/50 dark:bg-slate-850/40 p-3 rounded-xl border border-slate-150/60 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Phone className="w-3.5 h-3.5" /> Phone:
                      </span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {doc.phone || 'Not Provided'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-400">
                        <Mail className="w-3.5 h-3.5" /> Email:
                      </span>
                      <span className="font-mono text-slate-800 dark:text-slate-200 truncate max-w-[160px]" title={doc.email}>
                        {doc.email}
                      </span>
                    </div>

                    {doc.registrationNumber && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                        <span className="text-slate-400">Reg / MCI License:</span>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300 uppercase">
                          {doc.registrationNumber}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewingDoctor(doc)}
                    className="h-8.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Profile</span>
                  </Button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingDoctor(doc)}
                      className="h-8.5 text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer p-2"
                      title="Edit Doctor"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => router.push(`/appointments/new?doctorId=${doc.id}`)}
                      className="h-8.5 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      <span>Book OPD</span>
                    </Button>
                  </div>
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
                  <th className="py-3.5 px-5">Doctor / Specialty</th>
                  <th className="py-3.5 px-5">Contact Details</th>
                  <th className="py-3.5 px-5">Registration No.</th>
                  <th className="py-3.5 px-5">Chamber & Slot</th>
                  <th className="py-3.5 px-5">Tariff (Fee)</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDoctors.map((doc: Doctor) => {
                  const specBadge = getSpecialtyBadgeStyle(doc.specialization);

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {getInitials(doc.name)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block text-sm">
                              {doc.name}
                            </span>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border mt-0.5 ${specBadge}`}>
                              {doc.specialization || 'General Practitioner'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-5 font-medium">
                        <div className="text-slate-800 dark:text-slate-200 font-mono">{doc.phone || 'N/A'}</div>
                        <div className="text-slate-400 text-[11px] truncate max-w-[150px]">{doc.email}</div>
                      </td>

                      <td className="py-3.5 px-5 font-mono text-slate-700 dark:text-slate-300 font-semibold uppercase">
                        {doc.registrationNumber || '—'}
                      </td>

                      <td className="py-3.5 px-5 text-slate-700 dark:text-slate-300 font-medium">
                        <div>{doc.roomNumber ? `Room ${doc.roomNumber}` : 'General OPD'}</div>
                        <div className="text-slate-400 text-[11px]">{doc.slotDuration || 15} Mins / Slot</div>
                      </td>

                      <td className="py-3.5 px-5">
                        <span className="text-slate-900 dark:text-white font-bold block">
                          ₹{doc.consultationFee ?? 500}
                        </span>
                        {doc.followUpFee ? (
                          <span className="text-slate-400 text-[11px]">Follow-up: ₹{doc.followUpFee}</span>
                        ) : null}
                      </td>

                      <td className="py-3.5 px-5">
                        <button
                          type="button"
                          onClick={() => toggleStatusMutation.mutate(doc.id)}
                          className="cursor-pointer flex items-center gap-1.5"
                          title={doc.active ? 'Active' : 'Inactive'}
                        >
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              doc.active ? 'bg-emerald-500' : 'bg-slate-300'
                            }`}
                          />
                          <span className={`font-bold ${doc.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {doc.active ? 'Active' : 'Inactive'}
                          </span>
                        </button>
                      </td>

                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingDoctor(doc)}
                            className="h-8 text-xs rounded-lg px-2.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingDoctor(doc)}
                            className="h-8 text-xs rounded-lg px-2.5"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => router.push(`/appointments/new?doctorId=${doc.id}`)}
                            className="h-8 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg px-3"
                          >
                            Book
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

      {/* 4. DOCTOR PROFILE QUICK VIEW MODAL */}
      {viewingDoctor && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                  {getInitials(viewingDoctor.name)}
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {viewingDoctor.name}
                  </h2>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border mt-0.5 ${getSpecialtyBadgeStyle(viewingDoctor.specialization)}`}>
                    {viewingDoctor.specialization || 'General Medicine'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingDoctor(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Regular Fee</span>
                <strong className="text-base font-extrabold text-teal-600 dark:text-teal-400">
                  ₹{viewingDoctor.consultationFee ?? 500}
                </strong>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Follow-up Fee</span>
                <strong className="text-base font-extrabold text-slate-800 dark:text-slate-200">
                  ₹{viewingDoctor.followUpFee ?? 300}
                </strong>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Fee</span>
                <strong className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                  ₹{viewingDoctor.emergencyFee ?? 1000}
                </strong>
              </div>
            </div>

            {/* Detailed Info */}
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Qualifications:</span>
                  <strong className="text-slate-900 dark:text-white font-semibold">
                    {viewingDoctor.qualification || 'MBBS'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Medical License / Reg No:</span>
                  <strong className="font-mono text-slate-900 dark:text-white font-bold">
                    {viewingDoctor.registrationNumber || 'Not Specified'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Clinical Chamber:</span>
                  <strong className="text-slate-900 dark:text-white">
                    {viewingDoctor.roomNumber ? `Room ${viewingDoctor.roomNumber}` : 'General OPD Chamber'}
                  </strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-medium">Consultation Slot Duration:</span>
                  <strong className="text-slate-900 dark:text-white">
                    {viewingDoctor.slotDuration || 15} Minutes
                  </strong>
                </div>
              </div>

              {viewingDoctor.availabilitySchedule && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OPD Schedule & Hours</span>
                  <p className="text-slate-800 dark:text-slate-200 font-semibold">{viewingDoctor.availabilitySchedule}</p>
                </div>
              )}

              {viewingDoctor.biography && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Professional Biography</span>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{viewingDoctor.biography}</p>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingDoctor(viewingDoctor);
                  setViewingDoctor(null);
                }}
                className="text-xs font-semibold rounded-xl"
              >
                <Edit2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Edit Profile</span>
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  router.push(`/appointments/new?doctorId=${viewingDoctor.id}`);
                  setViewingDoctor(null);
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl px-5"
              >
                <CalendarPlus className="w-3.5 h-3.5 mr-1.5" />
                <span>Book OPD Appointment</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 5. EDIT DOCTOR MODAL */}
      {editingDoctor && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <DoctorForm
              doctor={editingDoctor}
              onCancel={() => setEditingDoctor(null)}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['doctors-profiles'] });
                setEditingDoctor(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
