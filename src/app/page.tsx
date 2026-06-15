'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  Camera, MapPin, Clock, Users, LogOut,
  UserCheck, UserX, Fingerprint, ArrowRight, Timer, Home,
  Wallet, UserPlus, Receipt, CheckCircle2, Loader2,
  KeyRound, Sun, Moon, XCircle,
  CalendarDays, FileText, AlertCircle, Eye, ChevronDown,
  BookOpen, X, Download, Smartphone, Zap,
  BarChart3, Globe, ChevronRight, Plane, Phone, Image as ImageIcon,
  IndianRupee, Send, TrendingUp, UsersRound, BadgeCheck, Menu,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ========== TYPES ==========
interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkOutLat: number | null;
  checkOutLng: number | null;
  checkInPhoto: string | null;
  checkOutPhoto: string | null;
  checkInAddr: string | null;
  checkOutAddr: string | null;
  status: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectReason: string | null;
  workHours: number | null;
  isRegularised: boolean;
  regulariseReason: string | null;
  employee?: { name: string; empId: string; department: string; position?: string };
}

interface PayrollRecord {
  id: string; employeeId: string; month: number; year: number; basicSalary: number;
  workingDays: number; presentDays: number; overtime: number; deductions: number;
  bonus: number; netSalary: number; status: string; paidAt: string | null;
  employee?: { name: string; empId: string; department: string; position: string };
}

interface LeaveType { id: string; name: string; description?: string; defaultDays: number; active: boolean; }
interface LeaveBalance { id: string; employeeId: string; leaveTypeId: string; totalDays: number; usedDays: number; year: number; leaveType?: { name: string; defaultDays: number }; employee?: { name: string; empId: string; department: string }; }
interface LeaveApplication { id: string; employeeId: string; leaveTypeId: string; startDate: string; endDate: string; reason: string; status: string; approvedBy?: string; approvedAt?: string; rejectReason?: string; createdAt: string; employee?: { name: string; empId: string; department: string; position?: string }; leaveType?: { name: string; }; }

interface ReimbursementRecord {
  id: string; employeeId: string; type: string; amount: number; photo: string;
  description?: string; status: string; approvedBy?: string; approvedAt?: string;
  rejectReason?: string; createdAt: string;
  employee?: { name: string; empId: string; department: string; position: string };
}

interface DashboardStats {
  totalEmployees: number; todayPresent: number; todayCheckedOut: number; todayAbsent: number;
  pendingCount: number; monthlyPayroll: number; paidAmount: number; pendingAmount: number;
  departments: { department: string; _count: { id: number } }[];
  recentAttendance: AttendanceRecord[];
  todayAttendance: AttendanceRecord[];
  pendingLeaves: number;
}

// ========== HELPERS ==========
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#06b6d4', '#0ea5e9', '#2563eb'];

function formatTime(d: string | null) {
  if (!d) return '--:--'; return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDate(d: string) { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function formatCurrency(n: number) { return '₹' + n.toLocaleString('en-IN'); }

// ========== MAIN ==========
export default function HomePage() {
  const { user, setUser, currentView, setCurrentView } = useAppStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try { return localStorage.getItem('darkMode') === 'true'; } catch { return false; }
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Login
  const [loginEmpId, setLoginEmpId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Attendance
  const [todayStatus, setTodayStatus] = useState<{ checkedIn: boolean; checkedOut: boolean; attendance: AttendanceRecord | null }>({ checkedIn: false, checkedOut: false, attendance: null });
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [pendingAttendance, setPendingAttendance] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);
  const [photoView, setPhotoView] = useState<{ photo: string; label: string } | null>(null);

  // Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Location
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Check In/Out
  const [checkInFlow, setCheckInFlow] = useState(false);
  const [checkOutFlow, setCheckOutFlow] = useState(false);

  // Employees
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ empId: '', name: '', email: '', phone: '', department: '', position: '', salary: '', role: 'employee', password: '' });

  // Payroll
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [generatingPayroll, setGeneratingPayroll] = useState(false);

  // Leave
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [allLeaveBalances, setAllLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<LeaveApplication[]>([]);
  const [myLeaveApplications, setMyLeaveApplications] = useState<LeaveApplication[]>([]);
  const [showAddLeaveType, setShowAddLeaveType] = useState(false);
  const [newLeaveType, setNewLeaveType] = useState({ name: '', description: '', defaultDays: '' });
  const [leaveApply, setLeaveApply] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const [showApplyLeave, setShowApplyLeave] = useState(false);

  // Regularise
  const [showRegularise, setShowRegularise] = useState(false);
  const [regulariseData, setRegulariseData] = useState({ employeeId: '', date: '', checkIn: '', checkOut: '', reason: '' });

  // Reimbursements
  const [reimbursements, setReimbursements] = useState<ReimbursementRecord[]>([]);
  const [myReimbursements, setMyReimbursements] = useState<ReimbursementRecord[]>([]);
  const [showReimbursementForm, setShowReimbursementForm] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [reimbursementType, setReimbursementType] = useState<string>('travel_allowance');
  const [reimbursementAmount, setReimbursementAmount] = useState('');
  const [reimbursementDescription, setReimbursementDescription] = useState('');
  const [reimbursementPhotos, setReimbursementPhotos] = useState<string[]>([]);
  const [reimbursementPhotoLoading, setReimbursementPhotoLoading] = useState(false);
  const reimburseFileRef = useRef<HTMLInputElement>(null);

  // Dark mode persist
  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); } else { document.documentElement.classList.remove('dark'); }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('attendance-khata-store');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.user && !user) {
          queueMicrotask(() => {
            setUser(parsed.user);
            setCurrentView(parsed.currentView || (parsed.user.role === 'admin' ? 'dashboard' : 'check-in-out'));
          });
        }
      } catch {}
    }
  }, []);

  // Seed
  useEffect(() => {
    if (!seeded) {
      fetch('/api/auth/seed', { method: 'POST' }).then(() => setSeeded(true)).catch(() => setSeeded(true));
    }
  }, [seeded]);

  // Load data
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try { const res = await fetch(`/api/attendance/today?employeeId=${user.id}`); const d = await res.json(); if (res.ok) setTodayStatus(d); } catch {}
      if (user.role === 'admin') {
        try { const res = await fetch('/api/dashboard'); const d = await res.json(); if (res.ok) setDashboardStats(d); } catch {}
        try { const res = await fetch('/api/employees'); const d = await res.json(); if (res.ok) setEmployees(d); } catch {}
        try { const res = await fetch('/api/attendance/approve?status=pending'); const d = await res.json(); if (res.ok) setPendingAttendance(d); } catch {}
        try { const res = await fetch('/api/attendance/history?employeeId=all'); const d = await res.json(); if (res.ok) setAllAttendance(d); } catch {}
        try { const res = await fetch('/api/payroll'); const d = await res.json(); if (res.ok) setPayrollRecords(d); } catch {}
        try { const res = await fetch('/api/leave/types'); const d = await res.json(); if (res.ok) setLeaveTypes(d); } catch {}
        try { const res = await fetch('/api/leave/apply?status=pending'); const d = await res.json(); if (res.ok) setLeaveApplications(d); } catch {}
        try { const res = await fetch('/api/leave/balance?employeeId=all'); const d = await res.json(); if (res.ok) setAllLeaveBalances(d); } catch {}
        try { const res = await fetch('/api/reimbursements'); const d = await res.json(); if (res.ok) setReimbursements(d); } catch {}
      } else {
        try { const res = await fetch(`/api/attendance/history?employeeId=${user.id}`); const d = await res.json(); if (res.ok) setAttendanceHistory(d); } catch {}
        try { const res = await fetch(`/api/payroll?employeeId=${user.id}`); const d = await res.json(); if (res.ok) setPayrollRecords(d); } catch {}
        try { const res = await fetch(`/api/leave/balance?employeeId=${user.id}`); const d = await res.json(); if (res.ok) setLeaveBalances(d); } catch {}
        try { const res = await fetch(`/api/leave/apply?employeeId=${user.id}`); const d = await res.json(); if (res.ok) setMyLeaveApplications(d); } catch {}
        try { const res = await fetch('/api/leave/types'); const d = await res.json(); if (res.ok) setLeaveTypes(d); } catch {}
        try { const res = await fetch(`/api/reimbursements?employeeId=${user.id}`); const d = await res.json(); if (res.ok) setMyReimbursements(d); } catch {}
      }
    };
    load();
  }, [user]);

  // Camera cleanup
  useEffect(() => { return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); }; }, []);

  // ===== CAMERA =====
  const startCamera = async () => {
    setCameraLoading(true);
    try {
      if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } }, audio: false });
      } catch {
        // Fallback: try without facingMode constraint
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => { resolve(); }, 5000); // Don't wait forever
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            video.play().then(resolve).catch(resolve);
          };
        });
        setCameraActive(true);
      } else {
        // Video ref not ready yet, wait a bit
        await new Promise(r => setTimeout(r, 200));
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => resolve(), 5000);
            v.onloadedmetadata = () => { clearTimeout(timeout); v.play().then(resolve).catch(resolve); };
          });
        }
        setCameraActive(true);
      }
    } catch (err) {
      toast({ title: 'Camera Error', description: 'Please allow camera permission and try again.', variant: 'destructive' });
    }
    setCameraLoading(false);
  };

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false); setCameraLoading(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current; const video = videoRef.current;
    canvas.width = 320; canvas.height = 320;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2; const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 320, 320);
    setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.7));
    stopCamera();
  };

  const retakePhoto = () => { setCapturedPhoto(null); startCamera(); };

  // ===== LOCATION =====
  const getLocation = async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) { toast({ title: 'Error', description: 'Geolocation not supported', variant: 'destructive' }); setLocationLoading(false); return; }

      const getPosition = (opts: PositionOptions): Promise<GeolocationPosition> =>
        new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, opts));

      let pos: GeolocationPosition | null = null;
      try {
        pos = await getPosition({ enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
      } catch {
        // Fallback to low accuracy
        try {
          pos = await getPosition({ enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 });
        } catch {
          toast({ title: 'Location Error', description: 'Allow location permission', variant: 'destructive' });
          setLocationLoading(false);
          return;
        }
      }

      if (!pos) { setLocationLoading(false); return; }

      // Show coordinates immediately
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setCurrentLocation({ lat, lng, address: `${lat.toFixed(6)}, ${lng.toFixed(6)}` });
      setLocationLoading(false);

      // Fetch address in background (don't block)
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then(r => r.json())
        .then(d => { if (d.display_name) setCurrentLocation(prev => prev ? { ...prev, address: d.display_name } : null); })
        .catch(() => {});
    } catch { setLocationLoading(false); }
  };

  // ===== CHECK IN/OUT =====
  const startCheckInFlow = () => {
    if (!user) return;
    if (todayStatus.checkedIn) { toast({ title: 'Already Checked In', description: 'Wait for admin approval', variant: 'destructive' }); return; }
    setCheckInFlow(true); setCheckOutFlow(false); setCapturedPhoto(null); startCamera(); getLocation();
  };

  const startCheckOutFlow = () => {
    if (!user || !todayStatus.checkedIn) { toast({ title: 'Not Checked In', description: 'Check in first', variant: 'destructive' }); return; }
    if (todayStatus.checkedOut) { toast({ title: 'Already Checked Out', description: 'Wait for admin approval', variant: 'destructive' }); return; }
    setCheckOutFlow(true); setCheckInFlow(false); setCapturedPhoto(null); startCamera(); getLocation();
  };

  const handleCheckIn = async () => {
    if (!user || !capturedPhoto) { toast({ title: 'Photo Required', variant: 'destructive' }); return; }
    setIsLoading(true);
    try {
      const body: any = { employeeId: user.id, photo: capturedPhoto };
      if (currentLocation) { body.latitude = currentLocation.lat; body.longitude = currentLocation.lng; body.address = currentLocation.address; }
      const res = await fetch('/api/attendance/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Check In Submitted!', description: 'Waiting for admin approval' });
        setTodayStatus({ checkedIn: true, checkedOut: false, attendance: data }); setCapturedPhoto(null); setCheckInFlow(false);
      } else { toast({ title: 'Failed', description: data.error, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setIsLoading(false);
  };

  const handleCheckOut = async () => {
    if (!user || !capturedPhoto) { toast({ title: 'Photo Required', variant: 'destructive' }); return; }
    setIsLoading(true);
    try {
      const body: any = { employeeId: user.id, photo: capturedPhoto };
      if (currentLocation) { body.latitude = currentLocation.lat; body.longitude = currentLocation.lng; body.address = currentLocation.address; }
      const res = await fetch('/api/attendance/check-out', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Check Out Submitted!', description: 'Waiting for admin approval' });
        setTodayStatus({ checkedIn: true, checkedOut: true, attendance: data }); setCapturedPhoto(null); setCheckOutFlow(false);
      } else { toast({ title: 'Failed', description: data.error, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setIsLoading(false);
  };

  const cancelFlow = () => { setCheckInFlow(false); setCheckOutFlow(false); setCapturedPhoto(null); stopCamera(); };

  // ===== ATTENDANCE APPROVE/REJECT =====
  const handleAttendanceAction = async (id: string, action: 'approve' | 'reject', rejectReason?: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/attendance/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ attendanceId: id, action, adminId: user.id, rejectReason }) });
      if (res.ok) {
        toast({ title: action === 'approve' ? 'Approved!' : 'Rejected!', description: `Attendance ${action}ed` });
        const r2 = await fetch('/api/attendance/approve?status=pending'); if (r2.ok) setPendingAttendance(await r2.json());
        const r3 = await fetch('/api/dashboard'); if (r3.ok) setDashboardStats(await r3.json());
        const r4 = await fetch('/api/attendance/history?employeeId=all'); if (r4.ok) setAllAttendance(await r4.json());
      }
    } catch {}
  };

  // ===== REGULARISE =====
  const handleRegularise = async () => {
    if (!regulariseData.employeeId || !regulariseData.date || !regulariseData.reason) { toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' }); return; }
    try {
      const res = await fetch('/api/attendance/regularise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regulariseData) });
      if (res.ok) {
        toast({ title: 'Regularised!', description: 'Sent for approval' });
        setShowRegularise(false);
        setRegulariseData({ employeeId: '', date: '', checkIn: '', checkOut: '', reason: '' });
        const r2 = await fetch('/api/attendance/approve?status=pending'); if (r2.ok) setPendingAttendance(await r2.json());
      } else { const d = await res.json(); toast({ title: 'Error', description: d.error, variant: 'destructive' }); }
    } catch {}
  };

  // ===== LEAVE =====
  const handleAddLeaveType = async () => {
    if (!newLeaveType.name || !newLeaveType.defaultDays) { toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' }); return; }
    try {
      const res = await fetch('/api/leave/types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLeaveType) });
      if (res.ok) {
        toast({ title: 'Added!', description: `${newLeaveType.name} leave type created` });
        setShowAddLeaveType(false);
        setNewLeaveType({ name: '', description: '', defaultDays: '' });
        const r2 = await fetch('/api/leave/types'); if (r2.ok) setLeaveTypes(await r2.json());
        const r3 = await fetch('/api/leave/balance?employeeId=all'); if (r3.ok) setAllLeaveBalances(await r3.json());
      }
    } catch {}
  };

  const handleApplyLeave = async () => {
    if (!user || !leaveApply.leaveTypeId || !leaveApply.startDate || !leaveApply.endDate || !leaveApply.reason) { toast({ title: 'Error', description: 'Fill all fields', variant: 'destructive' }); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/leave/apply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employeeId: user.id, ...leaveApply }) });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Leave Applied!', description: 'Waiting for admin approval' });
        setShowApplyLeave(false);
        setLeaveApply({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
        const r2 = await fetch(`/api/leave/apply?employeeId=${user.id}`); if (r2.ok) setMyLeaveApplications(await r2.json());
        const r3 = await fetch(`/api/leave/balance?employeeId=${user.id}`); if (r3.ok) setLeaveBalances(await r3.json());
      } else { toast({ title: 'Error', description: data.error, variant: 'destructive' }); }
    } catch {}
    setIsLoading(false);
  };

  const handleLeaveAction = async (id: string, action: 'approve' | 'reject', rejectReason?: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/leave/approve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: id, action, adminId: user.id, rejectReason }) });
      if (res.ok) {
        toast({ title: action === 'approve' ? 'Approved!' : 'Rejected!' });
        const r2 = await fetch('/api/leave/apply?status=pending'); if (r2.ok) setLeaveApplications(await r2.json());
        const r3 = await fetch('/api/leave/balance?employeeId=all'); if (r3.ok) setAllLeaveBalances(await r3.json());
        const r4 = await fetch('/api/dashboard'); if (r4.ok) setDashboardStats(await r4.json());
      }
    } catch {}
  };

  // ===== EMPLOYEE / PAYROLL =====
  const handleAddEmployee = async () => {
    try {
      const res = await fetch('/api/employees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newEmployee) });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: `${data.name} added` }); setShowAddEmployee(false);
        setNewEmployee({ empId: '', name: '', email: '', phone: '', department: '', position: '', salary: '', role: 'employee', password: '' });
        const r2 = await fetch('/api/employees'); if (r2.ok) setEmployees(await r2.json());
      } else { toast({ title: 'Error', description: data.error, variant: 'destructive' }); }
    } catch {}
  };

  const handleGeneratePayroll = async () => {
    setGeneratingPayroll(true);
    try {
      const res = await fetch('/api/payroll/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: payrollMonth, year: payrollYear }) });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Payroll Generated', description: data.message });
        const r2 = await fetch('/api/payroll'); if (r2.ok) setPayrollRecords(await r2.json());
        const r3 = await fetch('/api/dashboard'); if (r3.ok) setDashboardStats(await r3.json());
      } else { toast({ title: 'Error', description: data.error, variant: 'destructive' }); }
    } catch {}
    setGeneratingPayroll(false);
  };

  const handleMarkPaid = async (id: string) => {
    try {
      const res = await fetch('/api/payroll/mark-paid', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payrollId: id }) });
      if (res.ok) {
        toast({ title: 'Paid!' });
        const r2 = await fetch('/api/payroll'); if (r2.ok) setPayrollRecords(await r2.json());
        const r3 = await fetch('/api/dashboard'); if (r3.ok) setDashboardStats(await r3.json());
      }
    } catch {}
  };

  const handleLogin = async () => {
    if (!loginEmpId || !loginPassword) { toast({ title: 'Error', description: 'Enter ID and Password', variant: 'destructive' }); return; }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ empId: loginEmpId, password: loginPassword }) });
      const data = await res.json();
      if (!res.ok) { toast({ title: 'Login Failed', description: data.error, variant: 'destructive' }); }
      else { setUser(data); setCurrentView(data.role === 'admin' ? 'dashboard' : 'check-in-out'); toast({ title: 'Welcome!', description: `Hello, ${data.name}` }); }
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setIsLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('attendance-khata-store');
    setUser(null); setCurrentView('check-in-out'); setCameraActive(false); setCameraLoading(false);
    setCapturedPhoto(null); setCurrentLocation(null); setCheckInFlow(false); setCheckOutFlow(false);
    setLoginEmpId(''); setLoginPassword(''); stopCamera();
  };

  // ===== REIMBURSEMENT =====
  const handleSubmitReimbursementWithPhotos = async () => {
    if (!user || !reimbursementAmount || reimbursementPhotos.length === 0) {
      toast({ title: 'Error', description: 'Amount and at least one photo are required', variant: 'destructive' }); return;
    }
    setIsLoading(true);
    try {
      const photosJson = JSON.stringify(reimbursementPhotos);
      const res = await fetch('/api/reimbursements', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: user.id, type: reimbursementType,
          amount: reimbursementAmount, photo: photosJson,
          description: reimbursementDescription,
        }),
      });
      if (res.ok) {
        toast({ title: 'Submitted!', description: 'Your claim has been submitted for approval' });
        setShowReimbursementForm(false);
        setReimbursementAmount(''); setReimbursementDescription('');
        setReimbursementPhotos([]);
        const r2 = await fetch(`/api/reimbursements?employeeId=${user.id}`); if (r2.ok) setMyReimbursements(await r2.json());
      } else { const d = await res.json(); toast({ title: 'Error', description: d.error, variant: 'destructive' }); }
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    setIsLoading(false);
  };

  const handleReimbursementAction = async (id: string, action: 'approve' | 'reject', rejectReason?: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/reimbursements/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reimbursementId: id, action, adminId: user.id, rejectReason }),
      });
      if (res.ok) {
        toast({ title: action === 'approve' ? 'Approved!' : 'Rejected!' });
        const r2 = await fetch('/api/reimbursements'); if (r2.ok) setReimbursements(await r2.json());
      }
    } catch {}
  };

  // ===== INSTALL APP =====
  const handleInstallApp = async () => {
    try {
      // First try PWA install prompt if available (Android Chrome)
      const deferredPrompt = (window as any).deferredInstallPrompt;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        (window as any).deferredInstallPrompt = null;
        if (outcome === 'accepted') {
          toast({ title: 'App Installed!', description: 'AttendanceKhata has been added to your home screen' });
          return;
        }
      }
      // If no PWA prompt, show install guide modal
      setShowInstallGuide(true);
    } catch {
      setShowInstallGuide(true);
    }
  };



  // ========== HOME SCREEN (not logged in) ==========
  if (!user) {
    return (
      <div className={`${darkMode ? 'bg-gray-950' : 'bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800'}`}>
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Header */}
        <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between backdrop-blur-md bg-black/10">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-white text-lg">AttendanceKhata</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className={`w-9 h-9 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-white/20 text-white'} backdrop-blur-sm transition-all`}>
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Button onClick={handleInstallApp} className="bg-white text-blue-700 hover:bg-blue-50 rounded-xl h-9 font-bold text-sm shadow-lg">
              <Download className="w-4 h-4 mr-1" /> Install App
            </Button>
          </div>
        </header>

        {/* Hero Section */}
        <div className="pt-8 pb-10 px-6 text-center">
          <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-5 shadow-2xl">
            <Fingerprint className="w-10 h-10 text-white" />
          </div>
          <h1 className={`text-4xl md:text-5xl font-extrabold tracking-tight ${darkMode ? 'text-blue-400' : 'text-white'}`}>
            Attendance<br />Khata
          </h1>
          <p className={`text-sm mt-3 max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-blue-100'}`}>
            Smart Face Attendance System with Live Location Tracking, Leave Management, Payroll & Expense Claims
          </p>

          {/* Feature badges */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {[
              { icon: Camera, label: 'Face Recognition' },
              { icon: MapPin, label: 'Live Location' },
              { icon: CalendarDays, label: 'Leave Mgmt' },
              { icon: Receipt, label: 'Pay Slip' },
              { icon: Plane, label: 'Travel Claims' },
            ].map((f, i) => (
              <div key={i} className={`px-3 py-1.5 rounded-full text-xs font-medium ${darkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-white/20 text-white'} backdrop-blur-sm`}>
                <f.icon className="w-3 h-3 inline mr-1" /> {f.label}
              </div>
            ))}
          </div>

          {/* App Download CTA */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={handleInstallApp} className="inline-flex items-center justify-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-900 transition-all shadow-xl">
              <Smartphone className="w-5 h-5" />
              <div className="text-left"><span className="text-[10px] block leading-tight opacity-80">Install</span><span className="text-sm leading-tight">App on Phone</span></div>
            </button>
            <button className="inline-flex items-center justify-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30">
              <Globe className="w-5 h-5" />
              <div className="text-left"><span className="text-[10px] block leading-tight opacity-80">Use on</span><span className="text-sm leading-tight">Web Browser</span></div>
            </button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="px-6 pb-8">
          <div className="grid grid-cols-2 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
            {[
              { icon: Zap, title: 'Instant Pay Slips', desc: 'Generate and view salary slips with one click' },
              { icon: TrendingUp, title: 'Smart Analytics', desc: 'Real-time dashboard with attendance & payroll insights' },
            ].map((f, i) => (
              <div key={i} className={`p-4 rounded-2xl ${darkMode ? 'bg-gray-800/50' : 'bg-white/10'} backdrop-blur-sm`}>
                <f.icon className={`w-8 h-8 mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-200'}`} />
                <h3 className="text-sm font-bold text-white">{f.title}</h3>
                <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-blue-100'}`}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Login card */}
        <div className={`rounded-t-[2.5rem] px-5 pt-6 pb-8 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <h2 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Sign In to Your Account</h2>
          <div className="space-y-4 max-w-md mx-auto">
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : ''}`}>Employee ID</Label>
              <div className="relative">
                <KeyRound className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <Input id="empId" placeholder="e.g. ADMIN001 or EMP001" value={loginEmpId}
                  onChange={e => setLoginEmpId(e.target.value)}
                  className={`h-12 pl-10 rounded-xl text-base ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-200'}`}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={`text-sm font-medium ${darkMode ? 'text-gray-300' : ''}`}>Password</Label>
              <Input id="password" type="password" placeholder="Enter password" value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className={`h-12 rounded-xl text-base ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'border-gray-200'}`}
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button onClick={handleLogin} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-base font-bold shadow-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-2" />}
              Sign In
            </Button>
          </div>
          <div className={`mt-5 p-3 rounded-xl max-w-md mx-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <p className={`text-xs font-semibold mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Demo Credentials:</p>
            <div className={`text-xs space-y-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
              <p><span className="font-medium">Admin:</span> ADMIN001 / admin123</p>
              <p><span className="font-medium">Employee:</span> EMP001 / emp123</p>
            </div>
          </div>
        </div>

        {/* Install App Guide Modal */}
        <Dialog open={showInstallGuide} onOpenChange={setShowInstallGuide}>
          <DialogContent className={`rounded-2xl max-w-sm ${darkMode ? 'bg-gray-900 border-gray-800' : ''}`}>
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${darkMode ? 'text-white' : ''}`}>
                <Smartphone className="w-5 h-5 text-blue-600" /> Install AttendanceKhata
              </DialogTitle>
              <DialogDescription className={darkMode ? 'text-gray-400' : ''}>
                Install this app on your phone for the best experience
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              {/* Android Instructions */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-blue-50'}`}>
                <p className={`text-sm font-bold mb-3 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>For Android (Chrome):</p>
                <div className="space-y-2">
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">1</span>
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tap the <span className="font-bold">3 dots menu</span> at top-right of Chrome</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">2</span>
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tap <span className="font-bold">"Add to Home Screen"</span> or <span className="font-bold">"Install App"</span></p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">3</span>
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tap <span className="font-bold">"Install"</span> — app will appear on your home screen</p>
                  </div>
                </div>
              </div>
              {/* iPhone Instructions */}
              <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                <p className={`text-sm font-bold mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>For iPhone (Safari):</p>
                <div className="space-y-2">
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">1</span>
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tap the <span className="font-bold">Share button</span> at bottom of Safari</p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">2</span>
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Scroll down and tap <span className="font-bold">"Add to Home Screen"</span></p>
                  </div>
                  <div className="flex gap-3 items-start">
                    <span className="w-6 h-6 rounded-full bg-gray-600 text-white text-xs flex items-center justify-center flex-shrink-0 font-bold">3</span>
                    <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Tap <span className="font-bold">"Add"</span> — app icon will appear on home screen</p>
                  </div>
                </div>
              </div>
              <p className={`text-xs text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                The installed app works like a native app with fullscreen mode and home screen icon.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={() => setShowInstallGuide(false)} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-11 font-bold">Got it!</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ========== CAMERA FULL-SCREEN OVERLAY ==========
  if (checkInFlow || checkOutFlow) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area">
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white z-10">
          <Badge className={checkInFlow ? 'bg-blue-500 text-white px-3 py-1 text-sm' : 'bg-red-500 text-white px-3 py-1 text-sm'}>
            {checkInFlow ? <UserCheck className="w-4 h-4 mr-1" /> : <UserX className="w-4 h-4 mr-1" />}
            {checkInFlow ? 'Check In' : 'Check Out'}
          </Badge>
          <button onClick={cancelFlow} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20"><XCircle className="w-5 h-5 text-white" /></button>
        </div>
        <div className="flex-1 relative flex items-center justify-center bg-gray-900">
          {!cameraActive && !capturedPhoto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <Camera className="w-16 h-16 mb-3" /><p className="text-lg font-medium">Opening camera...</p>
              {cameraLoading && <Loader2 className="w-8 h-8 animate-spin mt-3" />}
            </div>
          )}
          <video ref={videoRef} autoPlay playsInline muted className={`w-full h-full object-cover ${!cameraActive || capturedPhoto ? 'hidden' : ''}`} />
          {cameraActive && !capturedPhoto && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-72 h-72 rounded-full border-4 border-blue-400/60"><div className="w-full h-full rounded-full border-2 border-blue-400/30" /></div>
            </div>
          )}
          {capturedPhoto && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <img src={capturedPhoto} alt="Captured" className="w-72 h-72 rounded-full object-cover border-4 border-blue-400" />
            </div>
          )}
        </div>
        <div className="bg-black/90 px-5 py-4 space-y-3 safe-area-bottom">
          {locationLoading && !currentLocation && <div className="flex items-center gap-2 text-blue-300 text-sm"><Loader2 className="w-4 h-4 animate-spin" /><span>Getting location...</span></div>}
          {currentLocation && <div className="flex items-start gap-2 text-blue-300 text-xs"><MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span className="line-clamp-2">{currentLocation.address}</span></div>}
          <div className="flex gap-3">
            {cameraActive && !capturedPhoto && <Button onClick={capturePhoto} className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-lg font-bold shadow-xl"><Camera className="w-6 h-6 mr-2" /> Capture</Button>}
            {capturedPhoto && (
              <>
                <Button variant="outline" onClick={retakePhoto} className="flex-1 h-14 rounded-2xl text-base font-semibold border-white/30 text-white hover:bg-white/10">Retake</Button>
                <Button onClick={checkInFlow ? handleCheckIn : handleCheckOut} disabled={isLoading} className={`flex-1 h-14 rounded-2xl text-lg font-bold shadow-xl text-white ${checkInFlow ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-500 hover:bg-red-600'}`}>
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : checkInFlow ? <UserCheck className="w-6 h-6 mr-2" /> : <UserX className="w-6 h-6 mr-2" />}
                  Submit
                </Button>
              </>
            )}
            {!cameraActive && !capturedPhoto && !cameraLoading && <Button onClick={startCamera} className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-base font-semibold shadow-xl"><Camera className="w-5 h-5 mr-2" /> Retry Camera</Button>}
          </div>
        </div>
      </div>
    );
  }

  // ========== PHOTO VIEWER ==========
  if (photoView) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center safe-area">
        <div className="absolute top-4 right-4 z-10">
          <button onClick={() => setPhotoView(null)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20"><XCircle className="w-6 h-6 text-white" /></button>
        </div>
        <p className="text-white text-sm mb-3 font-medium">{photoView.label}</p>
        <img src={photoView.photo} alt="Photo" className="max-w-[90vw] max-h-[70vh] rounded-2xl object-contain" />
      </div>
    );
  }

  // ========== MAIN APP ==========
  const isAdmin = user.role === 'admin';
  const dm = darkMode;

  const adminTabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'pending-approval', label: 'Approve', icon: CheckCircle2 },
    { id: 'employees', label: 'Staff', icon: Users },
    { id: 'leave-mgmt', label: 'Leave', icon: CalendarDays },
  ];

  const adminSidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'pending-approval', label: 'Approve Attendance', icon: CheckCircle2 },
    { id: 'employees', label: 'Staff Management', icon: Users },
    { id: 'payroll-admin', label: 'Payroll', icon: Wallet },
    { id: 'pay-slip-admin', label: 'Pay Slips', icon: Receipt },
    { id: 'leave-mgmt', label: 'Leave Management', icon: CalendarDays },
    { id: 'reimbursements-admin', label: 'Expense Claims', icon: IndianRupee },
  ];

  const empTabs = [
    { id: 'check-in-out', label: 'Home', icon: Fingerprint },
    { id: 'my-attendance', label: 'Records', icon: Clock },
    { id: 'my-leave', label: 'Leave', icon: CalendarDays },
    { id: 'pay-slip', label: 'Payslip', icon: Receipt },
    { id: 'reimbursements', label: 'Expenses', icon: IndianRupee },
    { id: 'profile', label: 'Profile', icon: Users },
  ];

  const empSidebarItems = [
    { id: 'check-in-out', label: 'Check In/Out', icon: Fingerprint },
    { id: 'my-attendance', label: 'Attendance Records', icon: Clock },
    { id: 'my-leave', label: 'Leave Management', icon: CalendarDays },
    { id: 'pay-slip', label: 'Pay Slips', icon: Receipt },
    { id: 'reimbursements', label: 'Expense Claims', icon: IndianRupee },
    { id: 'profile', label: 'My Profile', icon: Users },
  ];

  const sidebarItems = isAdmin ? adminSidebarItems : empSidebarItems;
  const tabs = isAdmin ? adminTabs : empTabs;

  const renderSidebar = () => (
    <aside className={`hidden lg:flex flex-col w-64 min-h-screen border-r ${dm ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <div className={`p-4 flex items-center gap-3 border-b ${dm ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
          <BookOpen className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-base leading-tight">AttendanceKhata</h1>
          <p className={`text-[10px] uppercase tracking-wider ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{isAdmin ? 'Admin Panel' : 'Employee Panel'}</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {sidebarItems.map(item => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button key={item.id} onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : dm
                    ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}>
              <Icon className="w-4 h-4" /> {item.label}
            </button>
          );
        })}
      </nav>
      <div className={`p-3 border-t ${dm ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => setDarkMode(!dm)} className={`w-9 h-9 rounded-xl flex items-center justify-center ${dm ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} transition-all`}>
            {dm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className={`flex-1 text-xs ${dm ? 'text-gray-500' : 'text-gray-400'}`}>
            {dm ? 'Dark Mode' : 'Light Mode'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8 border-2 border-blue-200">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${dm ? 'text-white' : ''}`}>{user.name}</p>
            <p className={`text-[10px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{user.empId}</p>
          </div>
          <button onClick={handleLogout} className={`w-8 h-8 flex items-center justify-center rounded-xl ${dm ? 'bg-gray-800 text-red-400 hover:bg-gray-700' : 'bg-red-50 text-red-500 hover:bg-red-100'} transition-all`}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  const renderContent = () => (
    <div className="space-y-4">

      {/* ===== ADMIN: DASHBOARD ===== */}
      {currentView === 'dashboard' && isAdmin && dashboardStats && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>Welcome back! 👋</h2>
              <p className={`text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-2 lg:hidden">
              <button onClick={() => setDarkMode(!dm)} className={`w-9 h-9 rounded-xl flex items-center justify-center ${dm ? 'bg-gray-800 text-yellow-400' : 'bg-gray-100 text-gray-600'} transition-all`}>
                {dm ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Users, val: dashboardStats.totalEmployees, label: 'Total Staff', from: 'from-blue-500', to: 'to-blue-600' },
              { icon: UserCheck, val: dashboardStats.todayPresent, label: 'Present', from: 'from-indigo-500', to: 'to-indigo-600' },
              { icon: AlertCircle, val: dashboardStats.pendingCount, label: 'Pending', from: 'from-amber-500', to: 'to-amber-600' },
              { icon: CalendarDays, val: dashboardStats.pendingLeaves, label: 'Leave Req', from: 'from-purple-500', to: 'to-purple-600' },
            ].map((s, i) => (
              <div key={i} className={`bg-gradient-to-br ${s.from} ${s.to} rounded-2xl p-4 text-white shadow-lg`}>
                <s.icon className="w-5 h-5 mb-2 opacity-80" />
                <p className="text-2xl font-bold">{s.val}</p>
                <p className="text-xs opacity-80">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <button onClick={() => setCurrentView('pending-approval')} className={`p-4 rounded-2xl text-left transition-all ${dm ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-50'} shadow-sm`}>
              <CheckCircle2 className={`w-5 h-5 mb-2 ${dm ? 'text-amber-400' : 'text-amber-600'}`} />
              <p className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Approve Attendance</p>
              {dashboardStats.pendingCount > 0 && <Badge className="bg-amber-100 text-amber-700 text-[10px] mt-1">{dashboardStats.pendingCount} pending</Badge>}
            </button>
            <button onClick={() => setCurrentView('leave-mgmt')} className={`p-4 rounded-2xl text-left transition-all ${dm ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-50'} shadow-sm`}>
              <CalendarDays className={`w-5 h-5 mb-2 ${dm ? 'text-purple-400' : 'text-purple-600'}`} />
              <p className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Leave Requests</p>
              {dashboardStats.pendingLeaves > 0 && <Badge className="bg-purple-100 text-purple-700 text-[10px] mt-1">{dashboardStats.pendingLeaves} pending</Badge>}
            </button>
            <button onClick={() => setCurrentView('reimbursements-admin')} className={`p-4 rounded-2xl text-left transition-all ${dm ? 'bg-gray-900 hover:bg-gray-800' : 'bg-white hover:bg-gray-50'} shadow-sm`}>
              <IndianRupee className={`w-5 h-5 mb-2 ${dm ? 'text-blue-400' : 'text-blue-600'}`} />
              <p className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Expense Claims</p>
            </button>
          </div>

          {/* Department chart */}
          <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Departments</CardTitle></CardHeader>
            <CardContent>
              {dashboardStats.departments.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart><Pie data={dashboardStats.departments.map(d => ({ name: d.department, value: d._count.id }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40} label={({ name, value }) => `${name}: ${value}`}>
                    {dashboardStats.departments.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              ) : <p className="text-sm text-gray-400 text-center py-6">No data</p>}
            </CardContent>
          </Card>

          {/* Regularise button */}
          <Button onClick={() => setShowRegularise(true)} className={`w-full h-11 rounded-xl font-semibold ${dm ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 border border-gray-200 hover:bg-gray-50'}`}>
            <FileText className="w-4 h-4 mr-2" /> Regularise Attendance
          </Button>
        </div>
      )}

      {/* ===== ADMIN: PENDING APPROVAL ===== */}
      {currentView === 'pending-approval' && isAdmin && (
        <div className="space-y-4">
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>Approve Attendance</h2>
          {pendingAttendance.length === 0 ? (
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
              <CardContent className="py-12 text-center"><CheckCircle2 className={`w-12 h-12 mx-auto mb-3 ${dm ? 'text-gray-600' : 'text-gray-300'}`} /><p className={dm ? 'text-gray-400' : 'text-gray-500'}>No pending approvals</p></CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingAttendance.map(a => (
                <Card key={a.id} className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-10 h-10"><AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-bold">{a.employee?.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${dm ? 'text-white' : ''}`}>{a.employee?.name}</p>
                        <p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{a.employee?.empId} · {a.employee?.department}</p>
                        <p className={`text-xs ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{formatDate(a.date)} · {formatTime(a.checkIn)} - {formatTime(a.checkOut)}</p>
                        {a.isRegularised && <Badge className="bg-blue-100 text-blue-700 text-[10px] mt-1">Regularised: {a.regulariseReason}</Badge>}
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {a.checkInPhoto && <button onClick={() => setPhotoView({ photo: a.checkInPhoto!, label: 'Check In Photo' })} className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium ${dm ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-700'}`}><Eye className="w-3 h-3" /> Check In Photo</button>}
                      {a.checkOutPhoto && <button onClick={() => setPhotoView({ photo: a.checkOutPhoto!, label: 'Check Out Photo' })} className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium ${dm ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'}`}><Eye className="w-3 h-3" /> Check Out Photo</button>}
                    </div>

                    {a.checkInAddr && <p className={`text-xs mt-2 ${dm ? 'text-gray-500' : 'text-gray-400'}`}><MapPin className="w-3 h-3 inline mr-1" />{a.checkInAddr}</p>}
                    {a.checkOutAddr && <p className={`text-xs ${dm ? 'text-gray-500' : 'text-gray-400'}`}><MapPin className="w-3 h-3 inline mr-1" />{a.checkOutAddr}</p>}

                    <div className="flex gap-2 mt-3">
                      <Button onClick={() => handleAttendanceAction(a.id, 'approve')} className="flex-1 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold"><CheckCircle2 className="w-4 h-4 mr-1" /> Approve</Button>
                      <Button onClick={() => handleAttendanceAction(a.id, 'reject', 'Rejected by admin')} variant="outline" className="flex-1 h-10 rounded-xl text-sm font-semibold text-red-600 border-red-200 hover:bg-red-50"><XCircle className="w-4 h-4 mr-1" /> Reject</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ADMIN: EMPLOYEES ===== */}
      {currentView === 'employees' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>Staff Management</h2>
            <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
              <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10"><UserPlus className="w-4 h-4 mr-1" /> Add</Button></DialogTrigger>
              <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl ${dm ? 'bg-gray-900 border-gray-800' : ''}`}>
                <DialogHeader><DialogTitle className={dm ? 'text-white' : ''}>Add New Employee</DialogTitle></DialogHeader>
                <div className="grid gap-3 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Employee ID *</Label><Input placeholder="EMP006" value={newEmployee.empId} onChange={e => setNewEmployee({ ...newEmployee, empId: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                    <div><Label className="text-xs">Full Name *</Label><Input placeholder="John Doe" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Email *</Label><Input type="email" placeholder="john@company.com" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                    <div><Label className="text-xs">Phone</Label><Input placeholder="+91-9876543216" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Department *</Label><Select value={newEmployee.department} onValueChange={v => setNewEmployee({ ...newEmployee, department: v })}><SelectTrigger className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`}><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="Engineering">Engineering</SelectItem><SelectItem value="Design">Design</SelectItem><SelectItem value="Marketing">Marketing</SelectItem><SelectItem value="Finance">Finance</SelectItem><SelectItem value="HR">HR</SelectItem><SelectItem value="Operations">Operations</SelectItem></SelectContent></Select></div>
                    <div><Label className="text-xs">Position *</Label><Input placeholder="Developer" value={newEmployee.position} onChange={e => setNewEmployee({ ...newEmployee, position: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Salary (₹) *</Label><Input type="number" placeholder="50000" value={newEmployee.salary} onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                    <div><Label className="text-xs">Role</Label><Select value={newEmployee.role} onValueChange={v => setNewEmployee({ ...newEmployee, role: v })}><SelectTrigger className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="employee">Employee</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></div>
                  </div>
                  <div><Label className="text-xs">Password *</Label><Input type="password" placeholder="Min 6 chars" value={newEmployee.password} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setShowAddEmployee(false)} className="rounded-xl">Cancel</Button><Button onClick={handleAddEmployee} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Add</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {employees.map(emp => (
              <Card key={emp.id} className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
                <CardContent className="p-4"><div className="flex items-center gap-3">
                  <Avatar className="w-11 h-11"><AvatarFallback className="bg-blue-100 text-blue-700 font-bold text-sm">{emp.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><p className={`font-semibold text-sm ${dm ? 'text-white' : ''}`}>{emp.name}</p><p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{emp.empId} · {emp.department}</p></div>
                  <div className="text-right"><p className={`text-sm font-bold ${dm ? 'text-white' : ''}`}>₹{emp.salary.toLocaleString('en-IN')}</p><Badge className={emp.role === 'admin' ? 'bg-purple-100 text-purple-700 text-[10px]' : 'bg-gray-100 text-gray-600 text-[10px]'}>{emp.role}</Badge></div>
                </div></CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ===== ADMIN: PAYROLL ===== */}
      {currentView === 'payroll-admin' && isAdmin && (
        <div className="space-y-4">
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>Payroll Management</h2>
          <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
            <CardContent className="p-4">
              <p className={`text-sm font-semibold mb-3 ${dm ? 'text-white' : ''}`}>Generate Payroll</p>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-xs">Month</Label><Select value={String(payrollMonth)} onValueChange={v => setPayrollMonth(parseInt(v))}><SelectTrigger className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`}><SelectValue /></SelectTrigger><SelectContent>{MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Year</Label><Input type="number" value={payrollYear} onChange={e => setPayrollYear(parseInt(e.target.value))} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                <div className="flex items-end"><Button onClick={handleGeneratePayroll} disabled={generatingPayroll} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold">{generatingPayroll ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generate'}</Button></div>
              </div>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {payrollRecords.map(pr => (
              <Card key={pr.id} className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold text-sm ${dm ? 'text-white' : ''}`}>{pr.employee?.name}</p>
                      <p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{pr.employee?.empId} · {MONTH_FULL[pr.month - 1]} {pr.year}</p>
                      <p className={`text-xs ${dm ? 'text-gray-500' : 'text-gray-400'}`}>Present: {pr.presentDays}/{pr.workingDays} days</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>{formatCurrency(pr.netSalary)}</p>
                      <Badge className={pr.status === 'paid' ? 'bg-blue-100 text-blue-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>{pr.status}</Badge>
                      {pr.status !== 'paid' && <Button onClick={() => handleMarkPaid(pr.id)} size="sm" className="ml-2 h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg">Mark Paid</Button>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ===== ADMIN: PAY SLIPS ===== */}
      {currentView === 'pay-slip-admin' && isAdmin && (
        <div className="space-y-4">
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>Pay Slips</h2>
          {payrollRecords.length === 0 ? (
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}><CardContent className="py-12 text-center"><Receipt className={`w-12 h-12 mx-auto mb-3 ${dm ? 'text-gray-600' : 'text-gray-300'}`} /><p className={dm ? 'text-gray-400' : 'text-gray-500'}>No pay slips generated yet</p></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {payrollRecords.map(pr => (
                <Card key={pr.id} className={`rounded-2xl border-0 shadow-sm overflow-hidden ${dm ? 'bg-gray-900' : ''}`}>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{pr.employee?.name}</p>
                        <p className="text-blue-200 text-xs">{pr.employee?.empId} · {pr.employee?.department}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(pr.netSalary)}</p>
                        <p className="text-blue-200 text-xs">{MONTH_FULL[pr.month - 1]} {pr.year}</p>
                      </div>
                    </div>
                  </div>
                  <CardContent className={`p-4 ${dm ? 'bg-gray-900' : ''}`}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Basic</p><p className={`font-semibold ${dm ? 'text-white' : ''}`}>{formatCurrency(pr.basicSalary)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Present Days</p><p className={`font-semibold ${dm ? 'text-white' : ''}`}>{pr.presentDays}/{pr.workingDays}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Overtime</p><p className={`font-semibold text-blue-600 ${dm ? 'text-blue-400' : ''}`}>+{formatCurrency(pr.overtime)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Deductions</p><p className={`font-semibold text-red-600 ${dm ? 'text-red-400' : ''}`}>-{formatCurrency(pr.deductions)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Bonus</p><p className={`font-semibold text-blue-600 ${dm ? 'text-blue-400' : ''}`}>+{formatCurrency(pr.bonus)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Status</p><Badge className={pr.status === 'paid' ? 'bg-blue-100 text-blue-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>{pr.status}</Badge></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ADMIN: LEAVE MANAGEMENT ===== */}
      {currentView === 'leave-mgmt' && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>Leave Management</h2>
            <Dialog open={showAddLeaveType} onOpenChange={setShowAddLeaveType}>
              <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 text-xs"><UserPlus className="w-3.5 h-3.5 mr-1" /> Add Type</Button></DialogTrigger>
              <DialogContent className={`rounded-2xl ${dm ? 'bg-gray-900 border-gray-800' : ''}`}>
                <DialogHeader><DialogTitle className={dm ? 'text-white' : ''}>Add Leave Type</DialogTitle></DialogHeader>
                <div className="space-y-3 py-2">
                  <div><Label className="text-xs">Name *</Label><Input placeholder="e.g. Casual Leave" value={newLeaveType.name} onChange={e => setNewLeaveType({ ...newLeaveType, name: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                  <div><Label className="text-xs">Description</Label><Input placeholder="Description" value={newLeaveType.description} onChange={e => setNewLeaveType({ ...newLeaveType, description: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                  <div><Label className="text-xs">Default Days/Year *</Label><Input type="number" placeholder="12" value={newLeaveType.defaultDays} onChange={e => setNewLeaveType({ ...newLeaveType, defaultDays: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                </div>
                <DialogFooter><Button onClick={handleAddLeaveType} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Create</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Leave Types</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {leaveTypes.map(lt => (
                <div key={lt.id} className={`flex items-center justify-between p-2 rounded-xl ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div><p className={`text-sm font-medium ${dm ? 'text-white' : ''}`}>{lt.name}</p><p className={`text-xs ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{lt.description || 'No description'}</p></div>
                  <Badge className="bg-blue-100 text-blue-700 text-xs">{lt.defaultDays} days/yr</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Pending Requests</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {leaveApplications.length === 0 ? <p className={`text-sm text-center py-4 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>No pending leave requests</p> :
                leaveApplications.map(la => (
                  <div key={la.id} className={`p-3 rounded-xl ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-start justify-between">
                      <div><p className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>{la.employee?.name}</p><p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{la.leaveType?.name} · {formatDate(la.startDate)} - {formatDate(la.endDate)}</p><p className={`text-xs mt-1 ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{la.reason}</p></div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => handleLeaveAction(la.id, 'approve')} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-8"><CheckCircle2 className="w-3 h-3 mr-1" /> Approve</Button>
                      <Button onClick={() => handleLeaveAction(la.id, 'reject', 'Rejected')} size="sm" variant="outline" className="text-red-600 border-red-200 rounded-lg text-xs h-8"><XCircle className="w-3 h-3 mr-1" /> Reject</Button>
                    </div>
                  </div>
                ))
              }
            </CardContent>
          </Card>

          <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Leave Balances</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const grouped: Record<string, LeaveBalance[]> = {};
                allLeaveBalances.forEach(b => { const key = b.employeeId; if (!grouped[key]) grouped[key] = []; grouped[key].push(b); });
                return Object.entries(grouped).map(([empId, balances]) => (
                  <div key={empId} className={`p-3 rounded-xl ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-semibold mb-2 ${dm ? 'text-white' : ''}`}>{balances[0]?.employee?.name || empId}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {balances.map(b => (
                        <div key={b.id} className={`text-center p-1.5 rounded-lg ${dm ? 'bg-gray-700' : 'bg-white'}`}>
                          <p className={`text-[10px] ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{b.leaveType?.name}</p>
                          <p className={`text-xs font-bold ${dm ? 'text-white' : ''}`}>{b.totalDays - b.usedDays}/{b.totalDays}</p>
                          <p className={`text-[9px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{b.usedDays} used</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </CardContent>
          </Card>

          <Button onClick={() => setShowRegularise(true)} className={`w-full h-11 rounded-xl font-semibold ${dm ? 'bg-gray-800 text-white hover:bg-gray-700' : 'bg-white text-gray-900 border border-gray-200'}`}>
            <FileText className="w-4 h-4 mr-2" /> Regularise Attendance
          </Button>
        </div>
      )}

      {/* ===== ADMIN: REIMBURSEMENTS ===== */}
      {currentView === 'reimbursements-admin' && isAdmin && (
        <div className="space-y-4">
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>Expense Claims</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
              <CardContent className="p-4 text-center">
                <Plane className={`w-6 h-6 mx-auto mb-2 ${dm ? 'text-blue-400' : 'text-blue-600'}`} />
                <p className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>{reimbursements.filter(r => r.type === 'travel_allowance' && r.status === 'pending').length}</p>
                <p className="text-xs text-gray-500">Travel Pending</p>
              </CardContent>
            </Card>
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
              <CardContent className="p-4 text-center">
                <Phone className={`w-6 h-6 mx-auto mb-2 ${dm ? 'text-indigo-400' : 'text-indigo-600'}`} />
                <p className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>{reimbursements.filter(r => r.type === 'mobile_recharge' && r.status === 'pending').length}</p>
                <p className="text-xs text-gray-500">Mobile Pending</p>
              </CardContent>
            </Card>
          </div>
          {reimbursements.length === 0 ? (
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
              <CardContent className="py-12 text-center"><IndianRupee className={`w-12 h-12 mx-auto mb-3 ${dm ? 'text-gray-600' : 'text-gray-300'}`} /><p className={dm ? 'text-gray-400' : 'text-gray-500'}>No expense claims submitted</p></CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reimbursements.map(r => {
                let photos: string[] = [];
                try { const parsed = JSON.parse(r.photo); if (Array.isArray(parsed)) photos = parsed; else photos = [r.photo]; } catch { photos = [r.photo]; }
                return (
                  <Card key={r.id} className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${r.type === 'travel_allowance' ? (dm ? 'bg-blue-900/50' : 'bg-blue-100') : (dm ? 'bg-indigo-900/50' : 'bg-indigo-100')}`}>
                          {r.type === 'travel_allowance' ? <Plane className={`w-5 h-5 ${dm ? 'text-blue-400' : 'text-blue-600'}`} /> : <Phone className={`w-5 h-5 ${dm ? 'text-indigo-400' : 'text-indigo-600'}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`font-semibold text-sm ${dm ? 'text-white' : ''}`}>{r.employee?.name}</p>
                            <p className={`font-bold ${dm ? 'text-white' : ''}`}>{formatCurrency(r.amount)}</p>
                          </div>
                          <p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{r.type === 'travel_allowance' ? 'Travel Allowance' : r.type === 'mobile_recharge' ? 'Mobile Recharge' : r.type.replace(/_/g, ' ')} · {r.employee?.empId}</p>
                          {r.description && <p className={`text-xs mt-1 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{r.description}</p>}
                          <p className={`text-[10px] mt-1 ${dm ? 'text-gray-600' : 'text-gray-400'}`}>{new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {photos.map((p, idx) => (
                          <img key={idx} src={p} alt={`Bill ${idx + 1}`} onClick={() => setPhotoView({ photo: p, label: `Bill ${idx + 1} - ${r.employee?.name}` })} className="w-14 h-14 rounded-lg object-cover cursor-pointer hover:opacity-80 flex-shrink-0" />
                        ))}
                      </div>
                      <div className="flex gap-2 mt-3">
                        {r.status === 'pending' && (
                          <>
                            <Button onClick={() => handleReimbursementAction(r.id, 'approve')} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs h-8 ml-auto"><CheckCircle2 className="w-3 h-3 mr-1" /> Approve</Button>
                            <Button onClick={() => handleReimbursementAction(r.id, 'reject', 'Rejected')} size="sm" variant="outline" className="text-red-600 border-red-200 rounded-lg text-xs h-8"><XCircle className="w-3 h-3 mr-1" /> Reject</Button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <>
                            <Badge className={`ml-auto bg-blue-100 text-blue-700 text-[10px]`}>Approved</Badge>
                            <Button onClick={async () => {
                              await fetch('/api/reimbursements/approve', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ reimbursementId: r.id, action: 'paid', adminId: user.id }),
                              });
                              toast({ title: 'Marked as Paid!' });
                              const r2 = await fetch('/api/reimbursements'); if (r2.ok) setReimbursements(await r2.json());
                            }} size="sm" className="bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs h-8">
                              <IndianRupee className="w-3 h-3 mr-1" /> Mark Paid
                            </Button>
                          </>
                        )}
                        {r.status === 'paid' && (
                          <Badge className={`ml-auto bg-green-100 text-green-700 text-[10px]`}>Paid</Badge>
                        )}
                        {r.status === 'rejected' && (
                          <Badge className={`ml-auto bg-red-100 text-red-700 text-[10px]`}>Rejected</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== EMPLOYEE: CHECK IN/OUT ===== */}
      {currentView === 'check-in-out' && !isAdmin && (
        <div className="space-y-4">
          <div className={`rounded-2xl p-5 ${todayStatus.checkedOut ? (dm ? 'bg-gray-800' : 'bg-gradient-to-r from-gray-100 to-gray-200') : todayStatus.checkedIn ? (dm ? 'bg-amber-900/30' : 'bg-gradient-to-r from-amber-50 to-amber-100') : (dm ? 'bg-blue-900/30' : 'bg-gradient-to-r from-blue-50 to-indigo-100')}`}>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${todayStatus.checkedOut ? (dm ? 'bg-gray-700' : 'bg-gray-200') : todayStatus.checkedIn ? (dm ? 'bg-amber-800' : 'bg-amber-200') : (dm ? 'bg-blue-800' : 'bg-blue-200')}`}>
                {todayStatus.checkedOut ? <CheckCircle2 className={`w-8 h-8 ${dm ? 'text-gray-400' : 'text-gray-600'}`} /> : todayStatus.checkedIn ? <Timer className="w-8 h-8 text-amber-600" /> : <Fingerprint className="w-8 h-8 text-blue-600" />}
              </div>
              <div>
                <h3 className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>
                  {todayStatus.checkedOut ? 'Day Complete!' : todayStatus.checkedIn ? 'Pending Approval' : 'Ready to Check In'}
                </h3>
                <p className={`text-sm ${dm ? 'text-gray-400' : 'text-gray-600'}`}>
                  {todayStatus.checkedOut ? 'Check out submitted' : todayStatus.checkedIn ? 'Waiting for admin approval' : 'Tap below to check in'}
                </p>
              </div>
            </div>
          </div>

          {!todayStatus.checkedOut && (
            <div className="grid grid-cols-2 gap-3">
              <button onClick={startCheckInFlow} disabled={isLoading || todayStatus.checkedIn} className="h-20 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white disabled:opacity-40 shadow-lg flex flex-col items-center justify-center gap-1">
                {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <UserCheck className="w-7 h-7" />}
                <span className="text-sm font-bold">Check In</span>
              </button>
              <button onClick={startCheckOutFlow} disabled={isLoading || !todayStatus.checkedIn || todayStatus.checkedOut} className="h-20 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white disabled:opacity-40 shadow-lg flex flex-col items-center justify-center gap-1">
                {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <UserX className="w-7 h-7" />}
                <span className="text-sm font-bold">Check Out</span>
              </button>
            </div>
          )}

          {todayStatus.checkedOut && <div className="text-center py-4"><CheckCircle2 className="w-16 h-16 mx-auto text-blue-400 mb-2" /><p className={`text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>Awaiting admin approval</p></div>}

          {todayStatus.attendance && (
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
              <CardHeader className="pb-2"><CardTitle className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Today&apos;s Record</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className={`rounded-xl p-3 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] uppercase text-gray-500">Check In</p><p className={`font-semibold ${dm ? 'text-white' : ''}`}>{formatTime(todayStatus.attendance.checkIn)}</p></div>
                  <div className={`rounded-xl p-3 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] uppercase text-gray-500">Check Out</p><p className={`font-semibold ${dm ? 'text-white' : ''}`}>{formatTime(todayStatus.attendance.checkOut)}</p></div>
                  <div className={`col-span-2 rounded-xl p-3 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] uppercase text-gray-500">Status</p><Badge className={`text-[10px] ${todayStatus.attendance.status === 'approved' ? 'bg-blue-100 text-blue-700' : todayStatus.attendance.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{todayStatus.attendance.status}</Badge></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== EMPLOYEE: MY ATTENDANCE ===== */}
      {currentView === 'my-attendance' && !isAdmin && (
        <div className="space-y-4">
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>My Attendance</h2>
          {attendanceHistory.length === 0 ? <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}><CardContent className="py-12 text-center"><Clock className={`w-12 h-12 mx-auto mb-3 ${dm ? 'text-gray-600' : 'text-gray-300'}`} /><p className={dm ? 'text-gray-400' : 'text-gray-500'}>No records yet</p></CardContent></Card> :
            <div className="space-y-2">
              {attendanceHistory.map(r => (
                <Card key={r.id} className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
                  <CardContent className="p-3"><div className="flex items-center justify-between">
                    <div><p className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>{formatDate(r.date)}</p><p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{formatTime(r.checkIn)} - {formatTime(r.checkOut)}</p></div>
                    <div className="text-right"><Badge className={`${r.status === 'approved' ? 'bg-blue-100 text-blue-700' : r.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} text-[10px]`}>{r.status}</Badge></div>
                  </div></CardContent>
                </Card>
              ))}
            </div>
          }
        </div>
      )}

      {/* ===== EMPLOYEE: MY LEAVE ===== */}
      {currentView === 'my-leave' && !isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>My Leave</h2>
            <Button onClick={() => setShowApplyLeave(true)} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 text-xs"><CalendarDays className="w-3.5 h-3.5 mr-1" /> Apply</Button>
          </div>

          <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>Leave Balance</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {leaveBalances.map(b => (
                  <div key={b.id} className={`p-3 rounded-xl text-center ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-xs font-medium ${dm ? 'text-gray-300' : 'text-gray-600'}`}>{b.leaveType?.name}</p>
                    <p className={`text-lg font-bold ${dm ? 'text-white' : ''}`}>{b.totalDays - b.usedDays}</p>
                    <p className={`text-[10px] ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{b.usedDays} used / {b.totalDays} total</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
            <CardHeader className="pb-2"><CardTitle className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>My Applications</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {myLeaveApplications.length === 0 ? <p className={`text-sm text-center py-4 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>No applications yet</p> :
                myLeaveApplications.map(la => (
                  <div key={la.id} className={`p-3 rounded-xl ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <div className="flex items-center justify-between">
                      <div><p className={`text-sm font-semibold ${dm ? 'text-white' : ''}`}>{la.leaveType?.name}</p><p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{formatDate(la.startDate)} - {formatDate(la.endDate)}</p></div>
                      <Badge className={`${la.status === 'approved' ? 'bg-blue-100 text-blue-700' : la.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'} text-[10px]`}>{la.status}</Badge>
                    </div>
                    <p className={`text-xs mt-1 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{la.reason}</p>
                  </div>
                ))
              }
            </CardContent>
          </Card>

          <Dialog open={showApplyLeave} onOpenChange={setShowApplyLeave}>
            <DialogContent className={`rounded-2xl ${dm ? 'bg-gray-900 border-gray-800' : ''}`}>
              <DialogHeader><DialogTitle className={dm ? 'text-white' : ''}>Apply for Leave</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Leave Type *</Label><Select value={leaveApply.leaveTypeId} onValueChange={v => setLeaveApply({ ...leaveApply, leaveTypeId: v })}><SelectTrigger className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`}><SelectValue placeholder="Select type" /></SelectTrigger><SelectContent>{leaveTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name} ({lt.defaultDays} days)</SelectItem>)}</SelectContent></Select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Start Date *</Label><Input type="date" value={leaveApply.startDate} onChange={e => setLeaveApply({ ...leaveApply, startDate: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                  <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>End Date *</Label><Input type="date" value={leaveApply.endDate} onChange={e => setLeaveApply({ ...leaveApply, endDate: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
                </div>
                <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Reason *</Label><Input placeholder="Enter reason" value={leaveApply.reason} onChange={e => setLeaveApply({ ...leaveApply, reason: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
              </div>
              <DialogFooter><Button onClick={handleApplyLeave} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">{isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}Submit</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* ===== EMPLOYEE: PAY SLIPS ===== */}
      {currentView === 'pay-slip' && !isAdmin && (
        <div className="space-y-4">
          <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>My Pay Slips</h2>
          {payrollRecords.length === 0 ? (
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
              <CardContent className="py-12 text-center">
                <Receipt className={`w-12 h-12 mx-auto mb-3 ${dm ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={dm ? 'text-gray-400' : 'text-gray-500'}>No pay slips available yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {payrollRecords.map(pr => (
                <Card key={pr.id} className={`rounded-2xl border-0 shadow-sm overflow-hidden ${dm ? 'bg-gray-900' : ''}`}>
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-lg">{MONTH_FULL[pr.month - 1]} {pr.year}</p>
                        <p className="text-blue-200 text-xs">Payslip</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{formatCurrency(pr.netSalary)}</p>
                        <Badge className={pr.status === 'paid' ? 'bg-white/20 text-white text-[10px]' : 'bg-amber-500/50 text-white text-[10px]'}>{pr.status}</Badge>
                      </div>
                    </div>
                  </div>
                  <CardContent className={`p-4 ${dm ? 'bg-gray-900' : ''}`}>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Basic Salary</p><p className={`font-semibold ${dm ? 'text-white' : ''}`}>{formatCurrency(pr.basicSalary)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Present Days</p><p className={`font-semibold ${dm ? 'text-white' : ''}`}>{pr.presentDays}/{pr.workingDays}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Overtime</p><p className={`font-semibold text-blue-600 ${dm ? 'text-blue-400' : ''}`}>+{formatCurrency(pr.overtime)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Deductions</p><p className={`font-semibold text-red-600 ${dm ? 'text-red-400' : ''}`}>-{formatCurrency(pr.deductions)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Bonus</p><p className={`font-semibold text-blue-600 ${dm ? 'text-blue-400' : ''}`}>+{formatCurrency(pr.bonus)}</p></div>
                      <div className={`rounded-xl p-2.5 ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}><p className="text-[10px] text-gray-500 uppercase">Net Salary</p><p className={`font-bold text-blue-600 ${dm ? 'text-blue-400' : ''}`}>{formatCurrency(pr.netSalary)}</p></div>
                    </div>
                    {pr.status === 'paid' && (
                      <Button onClick={() => {
                        const html = `<!DOCTYPE html><html><head><title>Payslip - ${MONTH_FULL[pr.month - 1]} ${pr.year}</title><style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;padding:20px;color:#333}.header{text-align:center;border-bottom:3px solid #2563eb;padding-bottom:20px;margin-bottom:20px}.header h1{color:#2563eb;margin:0;font-size:24px}.header p{color:#666;margin:4px 0 0}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0}.info-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px}.info-box .label{font-size:10px;color:#94a3b8;text-transform:uppercase}.info-box .value{font-size:16px;font-weight:bold;color:#1e293b;margin-top:4px}.total{background:#2563eb;color:white;border-radius:8px;padding:16px;text-align:center;margin-top:20px}.total .amount{font-size:28px;font-weight:bold}.total .label{font-size:12px;opacity:0.8}.negative{color:#dc2626!important}.positive{color:#2563eb!important}.footer{text-align:center;margin-top:30px;color:#94a3b8;font-size:11px}</style></head><body><div class="header"><h1>AttendanceKhata</h1><p>Payslip for ${MONTH_FULL[pr.month - 1]} ${pr.year}</p></div><div class="info-grid"><div class="info-box"><div class="label">Employee</div><div class="value">${user?.name || ''}</div></div><div class="info-box"><div class="label">Employee ID</div><div class="value">${user?.empId || ''}</div></div><div class="info-box"><div class="label">Department</div><div class="value">${user?.department || ''}</div></div><div class="info-box"><div class="label">Position</div><div class="value">${user?.position || ''}</div></div><div class="info-box"><div class="label">Basic Salary</div><div class="value">₹${pr.basicSalary.toLocaleString('en-IN')}</div></div><div class="info-box"><div class="label">Present Days</div><div class="value">${pr.presentDays}/${pr.workingDays}</div></div><div class="info-box"><div class="label">Overtime</div><div class="value positive">+₹${pr.overtime.toLocaleString('en-IN')}</div></div><div class="info-box"><div class="label">Deductions</div><div class="value negative">-₹${pr.deductions.toLocaleString('en-IN')}</div></div><div class="info-box"><div class="label">Bonus</div><div class="value positive">+₹${pr.bonus.toLocaleString('en-IN')}</div></div><div class="info-box"><div class="label">Status</div><div class="value">${pr.status.toUpperCase()}</div></div></div><div class="total"><div class="label">NET SALARY</div><div class="amount">₹${pr.netSalary.toLocaleString('en-IN')}</div></div><div class="footer">Generated on ${new Date().toLocaleDateString('en-IN')} · AttendanceKhata Payroll System</div></body></html>`;
                        const blob = new Blob([html], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Payslip_${MONTH_FULL[pr.month - 1]}_${pr.year}.html`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast({ title: 'Downloaded!', description: `Payslip for ${MONTH_FULL[pr.month - 1]} ${pr.year}` });
                      }} className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-semibold">
                        <Download className="w-4 h-4 mr-2" /> Download Pay Slip
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== EMPLOYEE: EXPENSE CLAIMS ===== */}
      {currentView === 'reimbursements' && !isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-bold ${dm ? 'text-white' : ''}`}>My Expense Claims</h2>
            <Button onClick={() => { setShowReimbursementForm(true); setReimbursementPhotos([]); setReimbursementAmount(''); setReimbursementDescription(''); }} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-9 text-xs">
              <IndianRupee className="w-3.5 h-3.5 mr-1" /> New Claim
            </Button>
          </div>

          {/* Claim Form Modal */}
          <Dialog open={showReimbursementForm} onOpenChange={setShowReimbursementForm}>
            <DialogContent className={`max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl ${dm ? 'bg-gray-900 border-gray-800' : ''}`}>
              <DialogHeader>
                <DialogTitle className={dm ? 'text-white' : ''}>Submit Expense Claim</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div><Label className="text-xs">Type</Label>
                  <Select value={reimbursementType} onValueChange={v => setReimbursementType(v)}>
                    <SelectTrigger className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="travel_allowance">Travel Allowance</SelectItem>
                      <SelectItem value="mobile_recharge">Mobile Recharge</SelectItem>
                      <SelectItem value="office_supplies">Office Supplies</SelectItem>
                      <SelectItem value="food">Food & Meals</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Amount (₹) *</Label>
                  <Input type="number" placeholder="Enter amount" value={reimbursementAmount} onChange={e => setReimbursementAmount(e.target.value)} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} />
                </div>
                <div><Label className="text-xs">Description</Label>
                  <Input placeholder="Brief description" value={reimbursementDescription} onChange={e => setReimbursementDescription(e.target.value)} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} />
                </div>
                <div>
                  <Label className="text-xs">Add Photos/Bills *</Label>
                  <div className="mt-2 space-y-2">
                    {reimbursementPhotos.map((photo, idx) => (
                      <div key={idx} className={`relative rounded-xl overflow-hidden ${dm ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-3 p-2">
                          <img src={photo} alt={`Photo ${idx + 1}`} className="w-16 h-16 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-medium ${dm ? 'text-gray-300' : 'text-gray-700'}`}>Photo {idx + 1}</p>
                          </div>
                          <button onClick={() => setReimbursementPhotos(prev => prev.filter((_, i) => i !== idx))} className="w-7 h-7 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {reimbursementPhotos.length < 5 && (
                    <div className="mt-2">
                      <input type="file" accept="image/*" capture="environment" ref={reimburseFileRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setReimbursementPhotoLoading(true);
                        const reader = new FileReader();
                        reader.onload = () => {
                          setReimbursementPhotos(prev => [...prev, reader.result as string]);
                          setReimbursementPhotoLoading(false);
                          if (reimburseFileRef.current) reimburseFileRef.current.value = '';
                        };
                        reader.onerror = () => { setReimbursementPhotoLoading(false); };
                        reader.readAsDataURL(file);
                      }} className="hidden" />
                      <Button onClick={() => reimburseFileRef.current?.click()} disabled={reimbursementPhotoLoading} variant="outline" className={`w-full rounded-xl h-10 ${dm ? 'border-gray-700 text-gray-300' : ''}`}>
                        {reimbursementPhotoLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                        {reimbursementPhotoLoading ? 'Adding...' : `Add Photo (${reimbursementPhotos.length}/5)`}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowReimbursementForm(false)} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSubmitReimbursementWithPhotos} disabled={isLoading || reimbursementPhotos.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}Submit Claim
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* My claims list */}
          {myReimbursements.length === 0 ? (
            <Card className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
              <CardContent className="py-12 text-center">
                <IndianRupee className={`w-12 h-12 mx-auto mb-3 ${dm ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={dm ? 'text-gray-400' : 'text-gray-500'}>No expense claims yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {myReimbursements.map(r => {
                let photos: string[] = [];
                try { const parsed = JSON.parse(r.photo); if (Array.isArray(parsed)) photos = parsed; else photos = [r.photo]; } catch { photos = [r.photo]; }
                return (
                  <Card key={r.id} className={`rounded-2xl border-0 shadow-sm ${dm ? 'bg-gray-900' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`font-semibold text-sm ${dm ? 'text-white' : ''}`}>{formatCurrency(r.amount)}</p>
                          <p className={`text-xs ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{r.type.replace(/_/g, ' ')} · {formatDate(r.createdAt)}</p>
                          {r.description && <p className={`text-xs mt-1 ${dm ? 'text-gray-500' : 'text-gray-400'}`}>{r.description}</p>}
                        </div>
                        <Badge className={r.status === 'approved' || r.status === 'paid' ? 'bg-blue-100 text-blue-700 text-[10px]' : r.status === 'rejected' ? 'bg-red-100 text-red-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>{r.status}</Badge>
                      </div>
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {photos.map((p, idx) => (
                          <img key={idx} src={p} alt={`Bill ${idx + 1}`} onClick={() => setPhotoView({ photo: p, label: `Bill Photo ${idx + 1}` })} className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:opacity-80 flex-shrink-0" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== EMPLOYEE: PROFILE ===== */}
      {currentView === 'profile' && !isAdmin && (
        <div className="space-y-4">
          <Card className={`rounded-2xl border-0 shadow-sm overflow-hidden ${dm ? 'bg-gray-900' : ''}`}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
              <Avatar className="w-20 h-20 mx-auto border-4 border-white/30"><AvatarFallback className="bg-white/20 text-white text-2xl font-bold">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
              <h3 className="text-xl font-bold text-white mt-3">{user.name}</h3>
              <p className="text-blue-100 text-sm">{user.empId} · {user.department}</p>
            </div>
            <CardContent className={`p-4 ${dm ? 'bg-gray-900' : ''}`}>
              {[
                ['Position', user.position],
                ['Email', user.email],
                ['Salary', `₹${user.salary.toLocaleString('en-IN')}`],
              ].map(([k, v]) => (
                <div key={k} className={`flex items-center justify-between py-2 border-b ${dm ? 'border-gray-800' : 'border-gray-100'}`}>
                  <span className={`text-sm ${dm ? 'text-gray-400' : 'text-gray-500'}`}>{k}</span>
                  <span className={`text-sm font-medium ${dm ? 'text-white' : ''}`}>{v}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Button onClick={handleLogout} variant="outline" className="w-full h-12 rounded-xl text-red-600 border-red-200 hover:bg-red-50 font-semibold"><LogOut className="w-4 h-4 mr-2" /> Logout</Button>
        </div>
      )}

    </div>
  );

  return (
    <div className={`flex flex-col lg:flex-row min-h-dvh ${dm ? 'bg-gray-950' : 'bg-gray-50'}`}>
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Desktop Sidebar */}
      {renderSidebar()}

      {/* Mobile Header */}
      <div className="lg:hidden flex-shrink-0">
        <header className={`flex items-center justify-between px-4 py-3 shadow-md ${dm ? 'bg-gray-900' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center"><BookOpen className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="font-bold text-lg leading-tight">AttendanceKhata</h1>
              <p className={`text-[10px] uppercase tracking-wider ${dm ? 'text-gray-400' : 'text-blue-100'}`}>{isAdmin ? 'Admin' : 'Employee'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!dm)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
              {dm ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4 text-white" />}
            </button>
            <Avatar className="w-8 h-8 border-2 border-white/30"><AvatarFallback className="bg-white/20 text-white text-xs font-bold">{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback></Avatar>
            <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25"><LogOut className="w-4 h-4 text-white" /></button>
          </div>
        </header>
      </div>

      {/* Content Area */}
      <main className={`flex-1 pb-24 lg:pb-4 ${dm ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="px-4 py-4 max-w-4xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Regularise Dialog */}
      <Dialog open={showRegularise} onOpenChange={setShowRegularise}>
        <DialogContent className={`rounded-2xl ${dm ? 'bg-gray-900 border-gray-800' : ''}`}>
          <DialogHeader><DialogTitle className={dm ? 'text-white' : ''}>Regularise Attendance</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Employee *</Label><Select value={regulariseData.employeeId} onValueChange={v => setRegulariseData({ ...regulariseData, employeeId: v })}><SelectTrigger className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`}><SelectValue placeholder="Select employee" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.empId})</SelectItem>)}</SelectContent></Select></div>
            <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Date *</Label><Input type="date" value={regulariseData.date} onChange={e => setRegulariseData({ ...regulariseData, date: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Check In Time</Label><Input type="time" value={regulariseData.checkIn} onChange={e => setRegulariseData({ ...regulariseData, checkIn: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
              <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Check Out Time</Label><Input type="time" value={regulariseData.checkOut} onChange={e => setRegulariseData({ ...regulariseData, checkOut: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
            </div>
            <div><Label className={`text-xs ${dm ? 'text-gray-300' : ''}`}>Reason *</Label><Input placeholder="Reason for regularisation" value={regulariseData.reason} onChange={e => setRegulariseData({ ...regulariseData, reason: e.target.value })} className={`h-10 rounded-xl ${dm ? 'bg-gray-800 border-gray-700 text-white' : ''}`} /></div>
          </div>
          <DialogFooter><Button onClick={handleRegularise} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">Submit</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Bottom Navigation */}
      <nav className={`lg:hidden fixed bottom-0 left-0 right-0 border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-area-bottom z-40 ${dm ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button key={tab.id} onClick={() => setCurrentView(tab.id)} className={`flex flex-col items-center justify-center w-full h-full transition-all ${isActive ? 'text-blue-600' : dm ? 'text-gray-500' : 'text-gray-400'}`}>
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-blue-50' : ''} ${dm && isActive ? 'bg-blue-900/30' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] mt-0.5 font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
