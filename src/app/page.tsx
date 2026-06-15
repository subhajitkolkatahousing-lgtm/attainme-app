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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
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
  Smartphone, KeyRound, ShieldCheck, Mail,
  ChevronLeft, XCircle, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

// ========== TYPES ==========
interface AttendanceRecord {
  id: string;
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
  workHours: number | null;
  employee?: { name: string; empId: string; department: string };
}

interface PayrollRecord {
  id: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  workingDays: number;
  presentDays: number;
  overtime: number;
  deductions: number;
  bonus: number;
  netSalary: number;
  status: string;
  paidAt: string | null;
  employee?: { name: string; empId: string; department: string; position: string };
}

interface DashboardStats {
  totalEmployees: number;
  todayPresent: number;
  todayCheckedOut: number;
  todayAbsent: number;
  monthlyPayroll: number;
  paidAmount: number;
  pendingAmount: number;
  departments: { department: string; _count: { id: number } }[];
  recentAttendance: AttendanceRecord[];
  todayAttendance: AttendanceRecord[];
}

// ========== HELPERS ==========
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatTime(dateStr: string | null) {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

// ========== MAIN PAGE ==========
export default function HomePage() {
  const { user, setUser, currentView, setCurrentView } = useAppStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Login
  const [loginEmpId, setLoginEmpId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'email-otp' | 'otp' | 'empid'>('email-otp');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [demoOtp, setDemoOtp] = useState('');
  const [otpUserName, setOtpUserName] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);

  // Dashboard
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);

  // Attendance
  const [todayStatus, setTodayStatus] = useState<{ checkedIn: boolean; checkedOut: boolean; attendance: AttendanceRecord | null }>({
    checkedIn: false, checkedOut: false, attendance: null,
  });
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [allAttendance, setAllAttendance] = useState<AttendanceRecord[]>([]);

  // Camera - FIX: Always render video/canvas refs
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Location
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; address: string } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Employees
  const [employees, setEmployees] = useState<any[]>([]);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    empId: '', name: '', email: '', phone: '', department: '', position: '', salary: '', role: 'employee', password: '',
  });

  // Payroll
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().getMonth() + 1);
  const [payrollYear, setPayrollYear] = useState(new Date().getFullYear());
  const [generatingPayroll, setGeneratingPayroll] = useState(false);

  // Check In/Out Flow
  const [checkInFlow, setCheckInFlow] = useState(false);
  const [checkOutFlow, setCheckOutFlow] = useState(false);

  // ===== SEED =====
  useEffect(() => {
    if (!seeded) {
      fetch('/api/auth/seed', { method: 'POST' }).then(() => setSeeded(true)).catch(() => setSeeded(true));
    }
  }, [seeded]);

  // ===== LOAD DATA ON LOGIN =====
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await fetch(`/api/attendance/today?employeeId=${user.id}`);
        const data = await res.json();
        if (res.ok) setTodayStatus(data);
      } catch (e) { console.error(e); }

      if (user.role === 'admin') {
        try {
          const res = await fetch('/api/dashboard');
          const data = await res.json();
          if (res.ok) setDashboardStats(data);
        } catch (e) { console.error(e); }
        try {
          const res = await fetch('/api/employees');
          const data = await res.json();
          if (res.ok) setEmployees(data);
        } catch (e) { console.error(e); }
        try {
          const res = await fetch('/api/attendance/history?employeeId=all');
          const data = await res.json();
          if (res.ok) setAllAttendance(data);
        } catch (e) { console.error(e); }
        try {
          const res = await fetch('/api/payroll');
          const data = await res.json();
          if (res.ok) setPayrollRecords(data);
        } catch (e) { console.error(e); }
      } else {
        try {
          const res = await fetch(`/api/attendance/history?employeeId=${user.id}`);
          const data = await res.json();
          if (res.ok) setAttendanceHistory(data);
        } catch (e) { console.error(e); }
        try {
          const res = await fetch(`/api/payroll?employeeId=${user.id}`);
          const data = await res.json();
          if (res.ok) setPayrollRecords(data);
        } catch (e) { console.error(e); }
      }
    };
    load();
  }, [user]);

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpTimer]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ===== OTP LOGIN =====
  const handleSendOtp = async () => {
    if (loginMethod === 'email-otp') {
      if (!otpEmail) {
        toast({ title: 'Error', description: 'Please enter your email address', variant: 'destructive' });
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/send-email-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: otpEmail }),
        });
        const data = await res.json();
        if (res.ok) {
          setOtpSent(true);
          setOtpTimer(60);
          setDemoOtp(data.demoOtp);
          setOtpUserName(data.name);
          toast({ title: 'OTP Sent!', description: `OTP sent to ${otpEmail}` });
        } else {
          toast({ title: 'Error', description: data.error, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to send OTP', variant: 'destructive' });
      }
      setIsLoading(false);
    } else {
      if (!otpPhone) {
        toast({ title: 'Error', description: 'Please enter your phone number', variant: 'destructive' });
        return;
      }
      setIsLoading(true);
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: otpPhone }),
        });
        const data = await res.json();
        if (res.ok) {
          setOtpSent(true);
          setOtpTimer(60);
          setDemoOtp(data.demoOtp);
          setOtpUserName(data.name);
          toast({ title: 'OTP Sent!', description: `OTP sent to ${otpPhone}` });
        } else {
          toast({ title: 'Error', description: data.error, variant: 'destructive' });
        }
      } catch {
        toast({ title: 'Error', description: 'Failed to send OTP', variant: 'destructive' });
      }
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast({ title: 'Error', description: 'Please enter the OTP', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const isEmailOtp = loginMethod === 'email-otp';
      const url = isEmailOtp ? '/api/auth/verify-email-otp' : '/api/auth/verify-otp';
      const body = isEmailOtp
        ? { email: otpEmail, otp: otpCode }
        : { phone: otpPhone, otp: otpCode };

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data);
        setCurrentView(data.role === 'admin' ? 'dashboard' : 'check-in-out');
        setOtpVerified(true);
        toast({ title: 'Welcome!', description: `Hello, ${data.name}` });
      } else {
        toast({ title: 'Verification Failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to verify OTP', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const resetOtpFlow = () => {
    setOtpSent(false);
    setOtpCode('');
    setDemoOtp('');
    setOtpTimer(0);
    setOtpUserName('');
  };

  // ===== CAMERA - FIXED =====
  const startCamera = async () => {
    setCameraLoading(true);
    try {
      // Stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });

      streamRef.current = stream;

      // Wait for video element to be ready
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        // Wait for video to load metadata before playing
        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => {
            video.play();
            resolve();
          };
        });
        setCameraActive(true);
        setCameraLoading(false);
      } else {
        // Video ref not ready yet, try again after a short delay
        setTimeout(async () => {
          const v = videoRef.current;
          if (v) {
            v.srcObject = stream;
            await new Promise<void>((resolve) => {
              v.onloadedmetadata = () => {
                v.play();
                resolve();
              };
            });
          }
          setCameraActive(true);
          setCameraLoading(false);
        }, 100);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraLoading(false);
      toast({ title: 'Camera Error', description: 'Unable to access camera. Please allow camera permission and try again.', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Center crop the video
    const size = Math.min(video.videoWidth, video.videoHeight);
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 320, 320);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    setCapturedPhoto(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
    startCamera();
  };

  // ===== LOCATION =====
  const getLocation = async () => {
    setLocationLoading(true);
    try {
      if (!navigator.geolocation) {
        toast({ title: 'Error', description: 'Geolocation is not supported by your browser', variant: 'destructive' });
        setLocationLoading(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          let address = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data.display_name) address = data.display_name;
          } catch { /* fallback */ }
          setCurrentLocation({ lat: latitude, lng: longitude, address });
          setLocationLoading(false);
        },
        () => {
          toast({ title: 'Location Error', description: 'Unable to get location. Please allow location permission.', variant: 'destructive' });
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000 }
      );
    } catch {
      setLocationLoading(false);
    }
  };

  // ===== CHECK IN/OUT FLOW =====
  const startCheckInFlow = () => {
    if (!user) return;
    if (todayStatus.checkedIn) {
      toast({ title: 'Already Checked In', description: 'You have already checked in today', variant: 'destructive' });
      return;
    }
    setCheckInFlow(true);
    setCheckOutFlow(false);
    setCapturedPhoto(null);
    startCamera();
    getLocation();
  };

  const startCheckOutFlow = () => {
    if (!user) return;
    if (!todayStatus.checkedIn) {
      toast({ title: 'Not Checked In', description: 'Please check in first before checking out', variant: 'destructive' });
      return;
    }
    if (todayStatus.checkedOut) {
      toast({ title: 'Already Checked Out', description: 'You have already checked out today', variant: 'destructive' });
      return;
    }
    setCheckOutFlow(true);
    setCheckInFlow(false);
    setCapturedPhoto(null);
    startCamera();
    getLocation();
  };

  const handleCheckIn = async () => {
    if (!user) return;
    if (!capturedPhoto) {
      toast({ title: 'Photo Required', description: 'Please capture your face photo first', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = { employeeId: user.id, photo: capturedPhoto };
      if (currentLocation) {
        body.latitude = currentLocation.lat;
        body.longitude = currentLocation.lng;
        body.address = currentLocation.address;
      }
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Checked In!', description: `Successfully checked in at ${formatTime(data.checkIn)}` });
        setTodayStatus({ checkedIn: true, checkedOut: false, attendance: data });
        setCapturedPhoto(null);
        setCheckInFlow(false);
      } else {
        toast({ title: 'Check-in Failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to check in', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleCheckOut = async () => {
    if (!user) return;
    if (!capturedPhoto) {
      toast({ title: 'Photo Required', description: 'Please capture your face photo first', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const body: Record<string, unknown> = { employeeId: user.id, photo: capturedPhoto };
      if (currentLocation) {
        body.latitude = currentLocation.lat;
        body.longitude = currentLocation.lng;
        body.address = currentLocation.address;
      }
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Checked Out!', description: `Work hours: ${data.workHours?.toFixed(2)} hrs` });
        setTodayStatus({ checkedIn: true, checkedOut: true, attendance: data });
        setCapturedPhoto(null);
        setCheckOutFlow(false);
        try {
          const res2 = await fetch(`/api/attendance/history?employeeId=${user.id}`);
          const data2 = await res2.json();
          if (res2.ok) setAttendanceHistory(data2);
        } catch {}
      } else {
        toast({ title: 'Check-out Failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to check out', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const cancelFlow = () => {
    setCheckInFlow(false);
    setCheckOutFlow(false);
    setCapturedPhoto(null);
    stopCamera();
  };

  // ===== ADD EMPLOYEE =====
  const handleAddEmployee = async () => {
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Success', description: `${data.name} added successfully` });
        setShowAddEmployee(false);
        setNewEmployee({ empId: '', name: '', email: '', phone: '', department: '', position: '', salary: '', role: 'employee', password: '' });
        try {
          const res2 = await fetch('/api/employees');
          const data2 = await res2.json();
          if (res2.ok) setEmployees(data2);
        } catch {}
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to add employee', variant: 'destructive' });
    }
  };

  // ===== GENERATE PAYROLL =====
  const handleGeneratePayroll = async () => {
    setGeneratingPayroll(true);
    try {
      const res = await fetch('/api/payroll/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: payrollMonth, year: payrollYear }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Payroll Generated', description: data.message });
        try {
          const res2 = await fetch('/api/payroll');
          const data2 = await res2.json();
          if (res2.ok) setPayrollRecords(data2);
        } catch {}
        try {
          const res2 = await fetch('/api/dashboard');
          const data2 = await res2.json();
          if (res2.ok) setDashboardStats(data2);
        } catch {}
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate payroll', variant: 'destructive' });
    }
    setGeneratingPayroll(false);
  };

  // ===== MARK PAID =====
  const handleMarkPaid = async (payrollId: string) => {
    try {
      const res = await fetch('/api/payroll/mark-paid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payrollId }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'Marked as paid' });
        try {
          const res2 = await fetch('/api/payroll');
          const data2 = await res2.json();
          if (res2.ok) setPayrollRecords(data2);
        } catch {}
        try {
          const res2 = await fetch('/api/dashboard');
          const data2 = await res2.json();
          if (res2.ok) setDashboardStats(data2);
        } catch {}
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to mark as paid', variant: 'destructive' });
    }
  };

  // ===== LOGIN =====
  const handleLogin = async () => {
    if (!loginEmpId || !loginPassword) {
      toast({ title: 'Error', description: 'Please enter Employee ID and Password', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ empId: loginEmpId, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: 'Login Failed', description: data.error, variant: 'destructive' });
      } else {
        setUser(data);
        setCurrentView(data.role === 'admin' ? 'dashboard' : 'check-in-out');
        toast({ title: 'Welcome!', description: `Hello, ${data.name}` });
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('check-in-out');
    setCameraActive(false);
    setCameraLoading(false);
    setCapturedPhoto(null);
    setCurrentLocation(null);
    setCheckInFlow(false);
    setCheckOutFlow(false);
    setOtpSent(false);
    setOtpCode('');
    setDemoOtp('');
    setOtpTimer(0);
    setOtpPhone('');
    setOtpEmail('');
    setLoginEmpId('');
    setLoginPassword('');
    stopCamera();
  };

  // ========== LOGIN SCREEN ==========
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 safe-area-top">
        {/* Hidden video + canvas always in DOM for camera */}
        <video ref={videoRef} autoPlay playsInline muted className="hidden" />
        <canvas ref={canvasRef} className="hidden" />

        {/* Top decorative area */}
        <div className="flex-shrink-0 pt-12 pb-6 px-6 text-center">
          <div className="mx-auto w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-4 shadow-xl">
            <Fingerprint className="w-11 h-11 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">FaceAttend</h1>
          <p className="text-emerald-100 text-sm mt-1">Face Recognition Attendance</p>
        </div>

        {/* Login card */}
        <div className="flex-1 bg-white rounded-t-3xl px-5 pt-6 pb-8 overflow-auto">
          <Tabs value={loginMethod} onValueChange={v => { setLoginMethod(v as 'email-otp' | 'otp' | 'empid'); resetOtpFlow(); }} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-5 h-11 bg-gray-100 rounded-xl">
              <TabsTrigger value="email-otp" className="rounded-lg text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Mail className="w-3.5 h-3.5 mr-1" /> Email
              </TabsTrigger>
              <TabsTrigger value="otp" className="rounded-lg text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
                <Smartphone className="w-3.5 h-3.5 mr-1" /> Phone
              </TabsTrigger>
              <TabsTrigger value="empid" className="rounded-lg text-xs data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm">
                <KeyRound className="w-3.5 h-3.5 mr-1" /> Emp ID
              </TabsTrigger>
            </TabsList>

            {/* EMAIL OTP */}
            <TabsContent value="email-otp" className="space-y-4 mt-0">
              {!otpSent ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-xl flex items-start gap-2">
                    <Mail className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-emerald-800">Free Email OTP Login</p>
                      <p className="text-[10px] text-emerald-600 mt-0.5">No SMS charges! OTP sent to email</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="otpEmail" className="text-sm font-medium">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="otpEmail" type="email" placeholder="rahul@company.com"
                        value={otpEmail} onChange={e => setOtpEmail(e.target.value)}
                        className="h-12 pl-10 rounded-xl border-gray-200 text-base"
                        onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSendOtp} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-semibold shadow-lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                    Send OTP to Email
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-xl text-center">
                    <p className="text-sm text-emerald-800">OTP sent to <span className="font-bold">{otpEmail}</span></p>
                    {otpUserName && <p className="text-xs text-emerald-600 mt-1">Account: {otpUserName}</p>}
                  </div>
                  {demoOtp && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-xs text-amber-700 font-medium">Demo Mode - Your OTP:</p>
                      <p className="text-3xl font-bold text-amber-800 tracking-[0.3em] mt-1">{demoOtp}</p>
                      <p className="text-[10px] text-amber-600 mt-1">In production, OTP will be sent to your email</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="emailOtpCode" className="text-sm font-medium">Enter 6-digit OTP</Label>
                    <Input id="emailOtpCode" placeholder="000000" value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl" maxLength={6}
                      onKeyDown={e => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                    />
                  </div>
                  <Button onClick={handleVerifyOtp} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-semibold shadow-lg" disabled={isLoading || otpCode.length !== 6}>
                    {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                    Verify & Login
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <Button variant="ghost" size="sm" onClick={resetOtpFlow} className="text-gray-500">Change Email</Button>
                    <Button variant="ghost" size="sm" onClick={handleSendOtp} disabled={otpTimer > 0} className="text-emerald-600">
                      {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* PHONE OTP */}
            <TabsContent value="otp" className="space-y-4 mt-0">
              {!otpSent ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="otpPhone" className="text-sm font-medium">Phone Number</Label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input id="otpPhone" placeholder="+91-9876543210" value={otpPhone}
                        onChange={e => setOtpPhone(e.target.value)}
                        className="h-12 pl-10 rounded-xl border-gray-200 text-base"
                        onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                      />
                    </div>
                  </div>
                  <Button onClick={handleSendOtp} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-semibold shadow-lg" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                    Send OTP
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-xl text-center">
                    <p className="text-sm text-emerald-800">OTP sent to <span className="font-bold">{otpPhone}</span></p>
                    {otpUserName && <p className="text-xs text-emerald-600 mt-1">Account: {otpUserName}</p>}
                  </div>
                  {demoOtp && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center">
                      <p className="text-xs text-amber-700 font-medium">Demo Mode - Your OTP:</p>
                      <p className="text-3xl font-bold text-amber-800 tracking-[0.3em] mt-1">{demoOtp}</p>
                      <p className="text-[10px] text-amber-600 mt-1">In production, OTP will be sent via SMS</p>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="otpCode" className="text-sm font-medium">Enter 6-digit OTP</Label>
                    <Input id="otpCode" placeholder="000000" value={otpCode}
                      onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="h-14 text-center text-2xl tracking-[0.5em] font-mono rounded-xl" maxLength={6}
                      onKeyDown={e => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                    />
                  </div>
                  <Button onClick={handleVerifyOtp} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-semibold shadow-lg" disabled={isLoading || otpCode.length !== 6}>
                    {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ShieldCheck className="w-5 h-5 mr-2" />}
                    Verify & Login
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <Button variant="ghost" size="sm" onClick={resetOtpFlow} className="text-gray-500">Change Number</Button>
                    <Button variant="ghost" size="sm" onClick={handleSendOtp} disabled={otpTimer > 0} className="text-emerald-600">
                      {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* EMP ID LOGIN */}
            <TabsContent value="empid" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="empId" className="text-sm font-medium">Employee ID</Label>
                <Input id="empId" placeholder="e.g. ADMIN001 or EMP001" value={loginEmpId}
                  onChange={e => setLoginEmpId(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 text-base"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                <Input id="password" type="password" placeholder="Enter password" value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  className="h-12 rounded-xl border-gray-200 text-base"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <Button onClick={handleLogin} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-semibold shadow-lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ArrowRight className="w-5 h-5 mr-2" />}
                Sign In
              </Button>
            </TabsContent>
          </Tabs>

          {/* Demo credentials */}
          <div className="mt-5 p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 font-semibold mb-2">Demo Credentials:</p>
            <div className="text-xs text-gray-500 space-y-1">
              <p><span className="font-medium">Email OTP:</span> rahul@company.com</p>
              <p><span className="font-medium">Phone OTP:</span> +91-9876543211</p>
              <p><span className="font-medium">Emp ID:</span> ADMIN001 / admin123</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== APP LAYOUT ==========
  const isAdmin = user.role === 'admin';

  const adminTabs = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'employees', label: 'Staff', icon: Users },
    { id: 'attendance-all', label: 'Records', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
  ];

  const empTabs = [
    { id: 'check-in-out', label: 'Home', icon: Fingerprint },
    { id: 'my-attendance', label: 'Attendance', icon: Clock },
    { id: 'my-payroll', label: 'Payroll', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: Users },
  ];

  const tabs = isAdmin ? adminTabs : empTabs;

  // Full-screen camera overlay for check-in/out
  if (checkInFlow || checkOutFlow) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area">
        {/* Hidden canvas always in DOM */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Camera header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/80 text-white z-10">
          <div className="flex items-center gap-2">
            <Badge className={checkInFlow ? 'bg-emerald-500 text-white px-3 py-1 text-sm' : 'bg-red-500 text-white px-3 py-1 text-sm'}>
              {checkInFlow ? <UserCheck className="w-4 h-4 mr-1" /> : <UserX className="w-4 h-4 mr-1" />}
              {checkInFlow ? 'Check In' : 'Check Out'}
            </Badge>
          </div>
          <button onClick={cancelFlow} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20">
            <XCircle className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Camera view */}
        <div className="flex-1 relative flex items-center justify-center bg-gray-900">
          {!cameraActive && !capturedPhoto && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
              <Camera className="w-16 h-16 mb-3" />
              <p className="text-lg font-medium">Opening camera...</p>
              {cameraLoading && <Loader2 className="w-8 h-8 animate-spin mt-3" />}
            </div>
          )}

          {/* Video element - always rendered */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${!cameraActive || capturedPhoto ? 'hidden' : ''}`}
          />

          {cameraActive && !capturedPhoto && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-72 h-72 rounded-full border-4 border-emerald-400/60">
                <div className="w-full h-full rounded-full border-2 border-emerald-400/30" />
              </div>
            </div>
          )}

          {capturedPhoto && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <img src={capturedPhoto} alt="Captured" className="w-72 h-72 rounded-full object-cover border-4 border-emerald-400" />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="bg-black/90 px-5 py-4 space-y-3 safe-area-bottom">
          {/* Location info */}
          {locationLoading && !currentLocation && (
            <div className="flex items-center gap-2 text-emerald-300 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Getting location...</span>
            </div>
          )}
          {currentLocation && (
            <div className="flex items-start gap-2 text-emerald-300 text-xs">
              <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{currentLocation.address}</span>
            </div>
          )}
          {!locationLoading && !currentLocation && (
            <Button variant="ghost" size="sm" onClick={getLocation} className="text-emerald-300 text-xs p-0 h-auto">
              <MapPin className="w-3 h-3 mr-1" /> Tap to get location
            </Button>
          )}

          {/* Action buttons */}
          <div className="flex gap-3">
            {cameraActive && !capturedPhoto && (
              <Button onClick={capturePhoto} className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-lg font-bold shadow-xl">
                <Camera className="w-6 h-6 mr-2" /> Capture
              </Button>
            )}
            {capturedPhoto && (
              <>
                <Button variant="outline" onClick={retakePhoto} className="flex-1 h-14 rounded-2xl text-base font-semibold border-white/30 text-white hover:bg-white/10">
                  Retake
                </Button>
                <Button
                  onClick={checkInFlow ? handleCheckIn : handleCheckOut}
                  disabled={isLoading}
                  className={`flex-1 h-14 rounded-2xl text-lg font-bold shadow-xl text-white ${checkInFlow ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
                >
                  {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : checkInFlow ? <UserCheck className="w-6 h-6 mr-2" /> : <UserX className="w-6 h-6 mr-2" />}
                  {checkInFlow ? 'Check In' : 'Check Out'}
                </Button>
              </>
            )}
            {!cameraActive && !capturedPhoto && cameraLoading && (
              <Button disabled className="flex-1 h-14 rounded-2xl text-base font-semibold bg-gray-700 text-gray-400">
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Starting camera...
              </Button>
            )}
            {!cameraActive && !capturedPhoto && !cameraLoading && (
              <Button onClick={startCamera} className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-base font-semibold shadow-xl">
                <Camera className="w-5 h-5 mr-2" /> Retry Camera
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ========== MAIN APP INTERFACE ==========
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col safe-area-top">
      {/* Hidden video + canvas always in DOM for camera */}
      <video ref={videoRef} autoPlay playsInline muted className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* App Header */}
      <header className="flex-shrink-0 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">FaceAttend</h1>
              <p className="text-[10px] text-emerald-100 uppercase tracking-wider">{isAdmin ? 'Admin Panel' : 'Employee'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border-2 border-white/30">
              <AvatarFallback className="bg-white/20 text-white text-xs font-bold">
                {user.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <button onClick={handleLogout} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors">
              <LogOut className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-auto pb-20">
        <div className="px-4 py-4 max-w-2xl mx-auto">

          {/* ===== ADMIN: DASHBOARD ===== */}
          {currentView === 'dashboard' && isAdmin && dashboardStats && (
            <div className="space-y-4">
              {/* Welcome */}
              <div className="mb-2">
                <h2 className="text-xl font-bold text-gray-900">Welcome back! 👋</h2>
                <p className="text-sm text-gray-500">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                  <Users className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{dashboardStats.totalEmployees}</p>
                  <p className="text-xs text-emerald-100">Total Staff</p>
                </div>
                <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-4 text-white shadow-lg">
                  <UserCheck className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{dashboardStats.todayPresent}</p>
                  <p className="text-xs text-teal-100">Present Today</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-4 text-white shadow-lg">
                  <UserX className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">{dashboardStats.todayAbsent}</p>
                  <p className="text-xs text-amber-100">Absent Today</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 text-white shadow-lg">
                  <Wallet className="w-5 h-5 mb-2 opacity-80" />
                  <p className="text-2xl font-bold">₹{(dashboardStats.monthlyPayroll / 1000).toFixed(0)}k</p>
                  <p className="text-xs text-purple-100">Payroll</p>
                </div>
              </div>

              {/* Department chart */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Departments</CardTitle>
                </CardHeader>
                <CardContent>
                  {dashboardStats.departments.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={dashboardStats.departments.map(d => ({ name: d.department, value: d._count.id }))}
                          dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} innerRadius={40}
                          label={({ name, value }) => `${name}: ${value}`}>
                          {dashboardStats.departments.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-8">No data</p>
                  )}
                </CardContent>
              </Card>

              {/* Today overview */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Today&apos;s Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={[
                      { name: 'Present', value: dashboardStats.todayPresent, fill: '#10b981' },
                      { name: 'Out', value: dashboardStats.todayCheckedOut, fill: '#06b6d4' },
                      { name: 'Absent', value: dashboardStats.todayAbsent, fill: '#ef4444' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {[{ fill: '#10b981' }, { fill: '#06b6d4' }, { fill: '#ef4444' }].map((entry, idx) => (
                          <Cell key={idx} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Recent activity */}
              <Card className="rounded-2xl border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {dashboardStats.recentAttendance.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">No records yet</p>
                  ) : (
                    <div className="space-y-2">
                      {dashboardStats.recentAttendance.slice(0, 6).map(r => (
                        <div key={r.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-xl">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                              {r.employee?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{r.employee?.name}</p>
                            <p className="text-xs text-gray-500">{formatTime(r.checkIn)} - {formatTime(r.checkOut)} · {r.workHours?.toFixed(1) || '-'}h</p>
                          </div>
                          <Badge className={`${r.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700' : r.status === 'checked-in' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'} text-[10px]`}>
                            {r.status === 'checked-out' ? 'Done' : r.status === 'checked-in' ? 'Active' : 'Pending'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== ADMIN: EMPLOYEES ===== */}
          {currentView === 'employees' && isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Staff</h2>
                  <p className="text-sm text-gray-500">{employees.length} employees</p>
                </div>
                <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-10">
                      <UserPlus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                      <DialogDescription>Fill in the details</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-3 py-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Employee ID *</Label><Input placeholder="EMP006" value={newEmployee.empId} onChange={e => setNewEmployee({ ...newEmployee, empId: e.target.value })} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Full Name *</Label><Input placeholder="John Doe" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} className="h-10 rounded-xl" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Email *</Label><Input type="email" placeholder="john@company.com" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1"><Label className="text-xs">Phone</Label><Input placeholder="+91-9876543216" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} className="h-10 rounded-xl" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Department *</Label>
                          <Select value={newEmployee.department} onValueChange={v => setNewEmployee({ ...newEmployee, department: v })}>
                            <SelectTrigger className="h-10 rounded-xl"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Engineering">Engineering</SelectItem>
                              <SelectItem value="Design">Design</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="HR">HR</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1"><Label className="text-xs">Position *</Label><Input placeholder="Developer" value={newEmployee.position} onChange={e => setNewEmployee({ ...newEmployee, position: e.target.value })} className="h-10 rounded-xl" /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1"><Label className="text-xs">Salary (₹) *</Label><Input type="number" placeholder="50000" value={newEmployee.salary} onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })} className="h-10 rounded-xl" /></div>
                        <div className="space-y-1">
                          <Label className="text-xs">Role</Label>
                          <Select value={newEmployee.role} onValueChange={v => setNewEmployee({ ...newEmployee, role: v })}>
                            <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-1"><Label className="text-xs">Password *</Label><Input type="password" placeholder="Min 6 chars" value={newEmployee.password} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })} className="h-10 rounded-xl" /></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddEmployee(false)} className="rounded-xl">Cancel</Button>
                      <Button onClick={handleAddEmployee} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">Add</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Employee cards (mobile-friendly) */}
              <div className="space-y-3">
                {employees.map(emp => (
                  <Card key={emp.id} className="rounded-2xl border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-11 h-11">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 font-bold text-sm">
                            {emp.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.empId} · {emp.department}</p>
                          <p className="text-xs text-gray-400">{emp.position}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">₹{emp.salary.toLocaleString('en-IN')}</p>
                          <Badge className={emp.role === 'admin' ? 'bg-purple-100 text-purple-700 text-[10px]' : 'bg-gray-100 text-gray-600 text-[10px]'}>
                            {emp.role}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ===== ADMIN: ALL ATTENDANCE ===== */}
          {currentView === 'attendance-all' && isAdmin && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Attendance</h2>
              {allAttendance.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No attendance records yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {allAttendance.slice(0, 30).map(r => (
                    <Card key={r.id} className="rounded-2xl border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                              {r.employee?.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{r.employee?.name}</p>
                            <p className="text-xs text-gray-500">{formatDate(r.date)} · {formatTime(r.checkIn)} - {formatTime(r.checkOut)}</p>
                            {r.checkInAddr && <p className="text-[10px] text-gray-400 truncate mt-0.5">📍 {r.checkInAddr}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium">{r.workHours?.toFixed(1) || '-'}h</p>
                            <Badge className={`${r.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700' : r.status === 'checked-in' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'} text-[10px]`}>
                              {r.status === 'checked-out' ? 'Done' : r.status === 'checked-in' ? 'Active' : 'Pending'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== ADMIN: PAYROLL ===== */}
          {currentView === 'payroll' && isAdmin && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Payroll</h2>
                <div className="flex items-center gap-2">
                  <Select value={String(payrollMonth)} onValueChange={v => setPayrollMonth(parseInt(v))}>
                    <SelectTrigger className="w-[90px] h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={String(payrollYear)} onValueChange={v => setPayrollYear(parseInt(v))}>
                    <SelectTrigger className="w-[75px] h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleGeneratePayroll} disabled={generatingPayroll} className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold">
                {generatingPayroll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
                Generate Payroll
              </Button>

              {/* Payroll summary */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Total</p>
                  <p className="text-sm font-bold">₹{dashboardStats?.monthlyPayroll?.toLocaleString('en-IN') || '0'}</p>
                </div>
                <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <p className="text-[10px] text-emerald-600 uppercase">Paid</p>
                  <p className="text-sm font-bold text-emerald-600">₹{dashboardStats?.paidAmount?.toLocaleString('en-IN') || '0'}</p>
                </div>
                <div className="bg-white rounded-2xl p-3 shadow-sm text-center">
                  <p className="text-[10px] text-amber-600 uppercase">Pending</p>
                  <p className="text-sm font-bold text-amber-600">₹{dashboardStats?.pendingAmount?.toLocaleString('en-IN') || '0'}</p>
                </div>
              </div>

              {/* Payroll records as cards */}
              {payrollRecords.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Wallet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No payroll records</p>
                    <p className="text-xs text-gray-400 mt-1">Click Generate to create payroll</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {payrollRecords.map(p => (
                    <Card key={p.id} className="rounded-2xl border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <p className="font-semibold text-sm">{p.employee?.name}</p>
                            <p className="text-xs text-gray-500">{p.employee?.empId} · {MONTH_FULL[p.month - 1]} {p.year}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>
                              {p.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-0.5" /> : <Timer className="w-3 h-3 mr-0.5" />}
                              {p.status === 'paid' ? 'Paid' : 'Pending'}
                            </Badge>
                            {p.status === 'pending' && (
                              <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg" onClick={() => handleMarkPaid(p.id)}>
                                Pay
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="bg-gray-50 rounded-xl p-2 text-center">
                            <p className="text-gray-500">Present</p>
                            <p className="font-bold">{p.presentDays}/{p.workingDays}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-2 text-center">
                            <p className="text-emerald-600">OT</p>
                            <p className="font-bold text-emerald-700">+₹{p.overtime.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-2 text-center">
                            <p className="text-emerald-600">Net</p>
                            <p className="font-bold text-emerald-700">₹{p.netSalary.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== EMPLOYEE: CHECK IN/OUT ===== */}
          {currentView === 'check-in-out' && !isAdmin && (
            <div className="space-y-4">
              {/* Status card */}
              <div className={`rounded-2xl p-5 ${todayStatus.checkedOut ? 'bg-gradient-to-r from-gray-100 to-gray-200' : todayStatus.checkedIn ? 'bg-gradient-to-r from-amber-50 to-amber-100' : 'bg-gradient-to-r from-emerald-50 to-teal-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${todayStatus.checkedOut ? 'bg-gray-200' : todayStatus.checkedIn ? 'bg-amber-200' : 'bg-emerald-200'}`}>
                    {todayStatus.checkedOut ? <CheckCircle2 className="w-8 h-8 text-gray-600" /> : todayStatus.checkedIn ? <Timer className="w-8 h-8 text-amber-600" /> : <Fingerprint className="w-8 h-8 text-emerald-600" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">
                      {todayStatus.checkedOut ? 'Day Complete!' : todayStatus.checkedIn ? 'Checked In' : 'Ready to Check In'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {todayStatus.checkedOut
                        ? `Work hours: ${todayStatus.attendance?.workHours?.toFixed(2)} hrs`
                        : todayStatus.checkedIn
                        ? `Since ${formatTime(todayStatus.attendance?.checkIn || null)}`
                        : 'Tap below to open camera & capture location'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Check In/Out buttons */}
              {!todayStatus.checkedOut && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={startCheckInFlow}
                    disabled={isLoading || todayStatus.checkedIn}
                    className="h-20 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white disabled:opacity-40 disabled:active:scale-100 shadow-lg flex flex-col items-center justify-center gap-1"
                  >
                    {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <UserCheck className="w-7 h-7" />}
                    <span className="text-sm font-bold">Check In</span>
                  </button>
                  <button
                    onClick={startCheckOutFlow}
                    disabled={isLoading || !todayStatus.checkedIn || todayStatus.checkedOut}
                    className="h-20 rounded-2xl bg-red-500 hover:bg-red-600 active:scale-95 transition-all text-white disabled:opacity-40 disabled:active:scale-100 shadow-lg flex flex-col items-center justify-center gap-1"
                  >
                    {isLoading ? <Loader2 className="w-7 h-7 animate-spin" /> : <UserX className="w-7 h-7" />}
                    <span className="text-sm font-bold">Check Out</span>
                  </button>
                </div>
              )}

              {/* Completed state */}
              {todayStatus.checkedOut && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-400 mb-2" />
                  <h3 className="text-lg font-bold text-emerald-700">Today Complete!</h3>
                  <p className="text-sm text-gray-500">Successfully checked out</p>
                </div>
              )}

              {/* Today's record */}
              {todayStatus.attendance && (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Today&apos;s Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase">Check In</p>
                        <p className="font-semibold">{formatTime(todayStatus.attendance.checkIn)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase">Check Out</p>
                        <p className="font-semibold">{formatTime(todayStatus.attendance.checkOut)}</p>
                      </div>
                      <div className="col-span-2 bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase">Location</p>
                        <p className="text-xs truncate">{todayStatus.attendance.checkInAddr || '-'}</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase">Hours</p>
                        <p className="font-semibold">{todayStatus.attendance.workHours?.toFixed(2) || '-'}h</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] text-gray-500 uppercase">Status</p>
                        <Badge className={todayStatus.attendance.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>
                          {todayStatus.attendance.status === 'checked-out' ? 'Complete' : 'Active'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ===== EMPLOYEE: MY ATTENDANCE ===== */}
          {currentView === 'my-attendance' && !isAdmin && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">My Attendance</h2>
              <p className="text-sm text-gray-500">{attendanceHistory.length} records</p>
              {attendanceHistory.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No records yet</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-2">
                  {attendanceHistory.map(r => (
                    <Card key={r.id} className="rounded-2xl border-0 shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold">{formatDate(r.date)}</p>
                            <p className="text-xs text-gray-500">{formatTime(r.checkIn)} - {formatTime(r.checkOut)}</p>
                            {r.checkInAddr && <p className="text-[10px] text-gray-400 truncate max-w-[200px] mt-0.5">📍 {r.checkInAddr}</p>}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold">{r.workHours?.toFixed(1) || '-'}h</p>
                            <Badge className={`${r.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'} text-[10px]`}>
                              {r.status === 'checked-out' ? 'Complete' : 'Active'}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== EMPLOYEE: MY PAYROLL ===== */}
          {currentView === 'my-payroll' && !isAdmin && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">My Payroll</h2>
              {payrollRecords.length === 0 ? (
                <Card className="rounded-2xl border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Wallet className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No payroll records yet</p>
                    <p className="text-xs text-gray-400 mt-1">Payroll will be generated by admin</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {payrollRecords.map(p => (
                    <Card key={p.id} className="rounded-2xl border-0 shadow-sm">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <p className="font-bold">{MONTH_FULL[p.month - 1]} {p.year}</p>
                          <Badge className={p.status === 'paid' ? 'bg-emerald-100 text-emerald-700 text-[10px]' : 'bg-amber-100 text-amber-700 text-[10px]'}>
                            {p.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-0.5" /> : <Timer className="w-3 h-3 mr-0.5" />}
                            {p.status === 'paid' ? 'Paid' : 'Pending'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 rounded-xl p-2">
                            <p className="text-gray-500">Basic</p>
                            <p className="font-bold">₹{p.basicSalary.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-2">
                            <p className="text-gray-500">Days</p>
                            <p className="font-bold">{p.presentDays}/{p.workingDays}</p>
                          </div>
                          <div className="bg-emerald-50 rounded-xl p-2">
                            <p className="text-emerald-600">Overtime</p>
                            <p className="font-bold text-emerald-700">+₹{p.overtime.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="bg-red-50 rounded-xl p-2">
                            <p className="text-red-500">Deductions</p>
                            <p className="font-bold text-red-600">-₹{p.deductions.toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                        <div className="mt-3 bg-emerald-100 rounded-xl p-3 text-center">
                          <p className="text-xs text-emerald-600 font-medium">Net Salary</p>
                          <p className="text-2xl font-bold text-emerald-700">₹{p.netSalary.toLocaleString('en-IN')}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== EMPLOYEE: PROFILE ===== */}
          {currentView === 'profile' && !isAdmin && (
            <div className="space-y-4">
              {/* Profile card */}
              <Card className="rounded-2xl border-0 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-center">
                  <Avatar className="w-20 h-20 mx-auto border-4 border-white/30">
                    <AvatarFallback className="bg-white/20 text-white text-2xl font-bold">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold text-white mt-3">{user.name}</h3>
                  <p className="text-emerald-100 text-sm">{user.empId} · {user.department}</p>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Position</span>
                      <span className="text-sm font-medium">{user.position}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Email</span>
                      <span className="text-sm font-medium">{user.email}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100">
                      <span className="text-sm text-gray-500">Salary</span>
                      <span className="text-sm font-bold text-emerald-600">₹{user.salary.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick actions */}
              <Button onClick={handleLogout} variant="outline" className="w-full h-12 rounded-xl text-red-600 border-red-200 hover:bg-red-50 font-semibold">
                <LogOut className="w-4 h-4 mr-2" /> Logout
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] safe-area-bottom z-40">
        <div className="max-w-2xl mx-auto flex items-center justify-around h-16">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentView(tab.id)}
                className={`flex flex-col items-center justify-center w-full h-full transition-all ${
                  isActive ? 'text-emerald-600' : 'text-gray-400'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-emerald-50' : ''}`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : ''}`} />
                </div>
                <span className={`text-[10px] mt-0.5 font-medium ${isActive ? 'text-emerald-600' : ''}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
