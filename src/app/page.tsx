'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/app-store';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
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
  Menu, X, Smartphone, KeyRound, ShieldCheck,
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
  const { user, setUser, currentView, setCurrentView, sidebarOpen, setSidebarOpen } = useAppStore();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Login
  const [loginEmpId, setLoginEmpId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<'empid' | 'otp'>('otp');
  const [otpPhone, setOtpPhone] = useState('');
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

  // Camera
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  // ===== API FUNCTIONS (useCallback) =====
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (res.ok) setDashboardStats(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchTodayStatus = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/attendance/today?employeeId=${userId}`);
      const data = await res.json();
      if (res.ok) setTodayStatus(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAttendanceHistory = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`/api/attendance/history?employeeId=${userId}`);
      const data = await res.json();
      if (res.ok) setAttendanceHistory(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchAllAttendance = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance/history?employeeId=all');
      const data = await res.json();
      if (res.ok) setAllAttendance(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees');
      const data = await res.json();
      if (res.ok) setEmployees(data);
    } catch (e) { console.error(e); }
  }, []);

  const fetchPayroll = useCallback(async (employeeId?: string) => {
    try {
      const url = employeeId ? `/api/payroll?employeeId=${employeeId}` : '/api/payroll';
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) setPayrollRecords(data);
    } catch (e) { console.error(e); }
  }, []);

  // ===== EFFECTS =====
  useEffect(() => {
    if (!seeded) {
      fetch('/api/auth/seed', { method: 'POST' }).then(() => setSeeded(true)).catch(() => setSeeded(true));
    }
  }, [seeded]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Fetch today's status
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

  // ===== OTP LOGIN =====
  const handleSendOtp = async () => {
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
  };

  const handleVerifyOtp = async () => {
    if (!otpCode) {
      toast({ title: 'Error', description: 'Please enter the OTP', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: otpPhone, otp: otpCode }),
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
  };

  // ===== CAMERA =====
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 480, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch {
      toast({ title: 'Camera Error', description: 'Unable to access camera. Please allow camera permission.', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, 320, 320);
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
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch {
      setLocationLoading(false);
    }
  };

  // ===== CHECK IN/OUT FLOW STATE =====
  const [checkInFlow, setCheckInFlow] = useState(false);  // true = camera+location opened for check-in
  const [checkOutFlow, setCheckOutFlow] = useState(false); // true = camera+location opened for check-out

  // Start the check-in flow: auto open camera + get location
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
    if (!currentLocation) getLocation();
  };

  // Start the check-out flow: auto open camera + get location
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
    if (!currentLocation) getLocation();
  };

  // Submit check-in (after photo captured)
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

  // Submit check-out (after photo captured)
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
        fetchAttendanceHistory(user.id);
      } else {
        toast({ title: 'Check-out Failed', description: data.error, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to check out', variant: 'destructive' });
    }
    setIsLoading(false);
  };

  // Cancel the flow
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
        fetchEmployees();
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
        fetchPayroll();
        fetchDashboard();
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
        fetchPayroll();
        fetchDashboard();
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
    setCapturedPhoto(null);
    setCurrentLocation(null);
    setCheckInFlow(false);
    setCheckOutFlow(false);
    setOtpSent(false);
    setOtpCode('');
    setDemoOtp('');
    setOtpTimer(0);
    setOtpPhone('');
    setLoginEmpId('');
    setLoginPassword('');
    stopCamera();
  };

  // ========== LOGIN SCREEN ==========
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 p-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        </div>
        <Card className="w-full max-w-md relative backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
              <Fingerprint className="w-9 h-9 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              FaceAttend
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Face Recognition Attendance & Payroll System
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={loginMethod} onValueChange={v => { setLoginMethod(v as 'empid' | 'otp'); resetOtpFlow(); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="otp" className="flex items-center gap-1.5 text-sm">
                  <Smartphone className="w-4 h-4" /> Phone + OTP
                </TabsTrigger>
                <TabsTrigger value="empid" className="flex items-center gap-1.5 text-sm">
                  <KeyRound className="w-4 h-4" /> Emp ID
                </TabsTrigger>
              </TabsList>

              {/* ===== OTP LOGIN TAB ===== */}
              <TabsContent value="otp" className="space-y-4 mt-0">
                {!otpSent ? (
                  /* Step 1: Enter Phone */
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="otpPhone">Phone Number</Label>
                      <div className="relative">
                        <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="otpPhone"
                          placeholder="+91-9876543210"
                          value={otpPhone}
                          onChange={e => setOtpPhone(e.target.value)}
                          className="h-11 pl-10"
                          onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                        />
                      </div>
                    </div>
                    <Button
                      onClick={handleSendOtp}
                      className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      Send OTP
                    </Button>
                  </div>
                ) : (
                  /* Step 2: Enter OTP */
                  <div className="space-y-4">
                    <div className="p-3 bg-emerald-50 rounded-lg text-center">
                      <p className="text-sm text-emerald-800">OTP sent to <span className="font-bold">{otpPhone}</span></p>
                      {otpUserName && <p className="text-xs text-emerald-600 mt-1">Account: {otpUserName}</p>}
                    </div>

                    {/* Demo OTP Banner */}
                    {demoOtp && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                        <p className="text-xs text-amber-700 font-medium">🔑 Demo Mode - Your OTP:</p>
                        <p className="text-2xl font-bold text-amber-800 tracking-[0.3em] mt-1">{demoOtp}</p>
                        <p className="text-[10px] text-amber-600 mt-1">In production, OTP will be sent via SMS</p>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="otpCode">Enter 6-digit OTP</Label>
                      <Input
                        id="otpCode"
                        placeholder="000000"
                        value={otpCode}
                        onChange={e => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="h-14 text-center text-2xl tracking-[0.5em] font-mono"
                        maxLength={6}
                        onKeyDown={e => e.key === 'Enter' && otpCode.length === 6 && handleVerifyOtp()}
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOtp}
                      className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                      disabled={isLoading || otpCode.length !== 6}
                    >
                      {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
                      Verify & Login
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <Button variant="ghost" size="sm" onClick={resetOtpFlow} className="text-muted-foreground">
                        Change Number
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSendOtp}
                        disabled={otpTimer > 0}
                        className="text-emerald-600"
                      >
                        {otpTimer > 0 ? `Resend in ${otpTimer}s` : 'Resend OTP'}
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* ===== EMP ID LOGIN TAB ===== */}
              <TabsContent value="empid" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="empId">Employee ID</Label>
                  <Input
                    id="empId"
                    placeholder="e.g. ADMIN001 or EMP001"
                    value={loginEmpId}
                    onChange={e => setLoginEmpId(e.target.value)}
                    className="h-11"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="h-11"
                    onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  />
                </div>
                <Button
                  onClick={handleLogin}
                  className="w-full h-11 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg"
                  disabled={isLoading}
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArrowRight className="w-4 h-4 mr-2" />}
                  Sign In
                </Button>
              </TabsContent>
            </Tabs>

            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground font-medium mb-2">Demo Credentials:</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p><span className="font-medium">📱 OTP Login:</span> +91-9876543211 (Rahul)</p>
                <p><span className="font-medium">🔑 Emp ID:</span> ADMIN001 / admin123</p>
                <p><span className="font-medium">🔑 Emp ID:</span> EMP001 / emp123</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <canvas ref={canvasRef} className="hidden" />
      </div>
    );
  }

  // ========== DASHBOARD LAYOUT ==========
  const isAdmin = user.role === 'admin';

  const adminMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'employees', label: 'Employees', icon: Users },
    { id: 'attendance-all', label: 'Attendance', icon: Clock },
    { id: 'payroll', label: 'Payroll', icon: Wallet },
  ];

  const empMenuItems = [
    { id: 'check-in-out', label: 'Check In/Out', icon: Fingerprint },
    { id: 'my-attendance', label: 'My Attendance', icon: Clock },
    { id: 'my-payroll', label: 'My Payroll', icon: Wallet },
  ];

  const menuItems = isAdmin ? adminMenuItems : empMenuItems;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-white border-r border-gray-200 transition-all duration-300 flex-shrink-0 overflow-hidden fixed md:relative h-full z-30`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Fingerprint className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">FaceAttend</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{isAdmin ? 'Admin Panel' : 'Employee Portal'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {menuItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => { setCurrentView(item.id); if (window.innerWidth < 768) setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    currentView === item.id
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="p-3 border-t border-gray-100">
            <div className="flex items-center gap-3 p-2">
              <Avatar className="w-9 h-9 bg-emerald-100">
                <AvatarFallback className="bg-emerald-100 text-emerald-700 font-semibold text-sm">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.empId} · {user.department}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-gray-400 hover:text-red-500">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="h-9 w-9">
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-gray-900">
                {menuItems.find(m => m.id === currentView)?.label || 'Dashboard'}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Badge>
            </div>
          </div>
        </header>

        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          {/* ===== ADMIN DASHBOARD ===== */}
          {currentView === 'dashboard' && isAdmin && dashboardStats && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Total Staff</p>
                        <p className="text-2xl font-bold text-emerald-900 mt-1">{dashboardStats.totalEmployees}</p>
                      </div>
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-emerald-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-teal-50 to-teal-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-teal-600 uppercase tracking-wider">Present Today</p>
                        <p className="text-2xl font-bold text-teal-900 mt-1">{dashboardStats.todayPresent}</p>
                      </div>
                      <div className="w-10 h-10 bg-teal-500/20 rounded-xl flex items-center justify-center">
                        <UserCheck className="w-5 h-5 text-teal-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Absent Today</p>
                        <p className="text-2xl font-bold text-amber-900 mt-1">{dashboardStats.todayAbsent}</p>
                      </div>
                      <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <UserX className="w-5 h-5 text-amber-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">Monthly Payroll</p>
                        <p className="text-2xl font-bold text-purple-900 mt-1">₹{(dashboardStats.monthlyPayroll / 1000).toFixed(0)}k</p>
                      </div>
                      <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Department Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {dashboardStats.departments.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={dashboardStats.departments.map(d => ({ name: d.department, value: d._count.id }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={50}
                            label={({ name, value }) => `${name}: ${value}`}
                          >
                            {dashboardStats.departments.map((_, idx) => (
                              <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-12">No data available</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Today&apos;s Attendance Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[
                        { name: 'Present', value: dashboardStats.todayPresent, fill: '#10b981' },
                        { name: 'Checked Out', value: dashboardStats.todayCheckedOut, fill: '#06b6d4' },
                        { name: 'Absent', value: dashboardStats.todayAbsent, fill: '#ef4444' },
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                          {[
                            { fill: '#10b981' },
                            { fill: '#06b6d4' },
                            { fill: '#ef4444' },
                          ].map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Recent Attendance Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dashboardStats.recentAttendance.length === 0 ? (
                          <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No attendance records yet</TableCell></TableRow>
                        ) : (
                          dashboardStats.recentAttendance.slice(0, 8).map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.employee?.name}</TableCell>
                              <TableCell>{r.employee?.department}</TableCell>
                              <TableCell>{formatDate(r.date)}</TableCell>
                              <TableCell>{formatTime(r.checkIn)}</TableCell>
                              <TableCell>{formatTime(r.checkOut)}</TableCell>
                              <TableCell>{r.workHours?.toFixed(1) || '-'} hrs</TableCell>
                              <TableCell>
                                <Badge variant={r.status === 'checked-out' ? 'default' : 'secondary'}
                                  className={r.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700' : r.status === 'checked-in' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}>
                                  {r.status === 'checked-out' ? 'Completed' : r.status === 'checked-in' ? 'Active' : 'Pending'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== ADMIN: EMPLOYEES ===== */}
          {currentView === 'employees' && isAdmin && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Employee Management</h2>
                  <p className="text-sm text-muted-foreground">{employees.length} active employees</p>
                </div>
                <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <UserPlus className="w-4 h-4 mr-2" /> Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                      <DialogDescription>Fill in the details to add a new employee</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Employee ID *</Label><Input placeholder="EMP006" value={newEmployee.empId} onChange={e => setNewEmployee({ ...newEmployee, empId: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Full Name *</Label><Input placeholder="John Doe" value={newEmployee.name} onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Email *</Label><Input type="email" placeholder="john@company.com" value={newEmployee.email} onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Phone</Label><Input placeholder="+91-9876543216" value={newEmployee.phone} onChange={e => setNewEmployee({ ...newEmployee, phone: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Department *</Label>
                          <Select value={newEmployee.department} onValueChange={v => setNewEmployee({ ...newEmployee, department: v })}>
                            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
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
                        <div className="space-y-2"><Label>Position *</Label><Input placeholder="Software Developer" value={newEmployee.position} onChange={e => setNewEmployee({ ...newEmployee, position: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>Monthly Salary (₹) *</Label><Input type="number" placeholder="50000" value={newEmployee.salary} onChange={e => setNewEmployee({ ...newEmployee, salary: e.target.value })} /></div>
                        <div className="space-y-2">
                          <Label>Role</Label>
                          <Select value={newEmployee.role} onValueChange={v => setNewEmployee({ ...newEmployee, role: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="employee">Employee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Login Password *</Label>
                        <Input type="password" placeholder="Minimum 6 characters" value={newEmployee.password} onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowAddEmployee(false)}>Cancel</Button>
                      <Button onClick={handleAddEmployee} className="bg-emerald-600 hover:bg-emerald-700 text-white">Add Employee</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Emp ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Position</TableHead>
                          <TableHead>Salary</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map(emp => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-mono text-sm">{emp.empId}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="w-8 h-8">
                                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                                    {emp.name.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium">{emp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{emp.email}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{emp.department}</Badge></TableCell>
                            <TableCell className="text-muted-foreground">{emp.position}</TableCell>
                            <TableCell className="font-medium">₹{emp.salary.toLocaleString('en-IN')}</TableCell>
                            <TableCell>
                              <Badge className={emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                                {emp.role}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== ADMIN: ALL ATTENDANCE ===== */}
          {currentView === 'attendance-all' && isAdmin && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Attendance Records</h2>
                <p className="text-sm text-muted-foreground">All employee attendance data</p>
              </div>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Emp ID</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check In Location</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Work Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allAttendance.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No attendance records found</TableCell></TableRow>
                        ) : (
                          allAttendance.slice(0, 50).map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.employee?.name}</TableCell>
                              <TableCell className="font-mono text-sm">{r.employee?.empId}</TableCell>
                              <TableCell>{r.employee?.department}</TableCell>
                              <TableCell>{formatDate(r.date)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-muted-foreground" />
                                  {formatTime(r.checkIn)}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                                {r.checkInAddr || '-'}
                              </TableCell>
                              <TableCell>{formatTime(r.checkOut)}</TableCell>
                              <TableCell>{r.workHours?.toFixed(1) || '-'} hrs</TableCell>
                              <TableCell>
                                <Badge className={r.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700' : r.status === 'checked-in' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}>
                                  {r.status === 'checked-out' ? 'Completed' : r.status === 'checked-in' ? 'Active' : 'Pending'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== ADMIN: PAYROLL ===== */}
          {currentView === 'payroll' && isAdmin && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Payroll Management</h2>
                  <p className="text-sm text-muted-foreground">Generate and manage employee payroll</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Select value={String(payrollMonth)} onValueChange={v => setPayrollMonth(parseInt(v))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={String(payrollYear)} onValueChange={v => setPayrollYear(parseInt(v))}>
                    <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleGeneratePayroll}
                    disabled={generatingPayroll}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {generatingPayroll ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Receipt className="w-4 h-4 mr-2" />}
                    Generate
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Payroll</p>
                    <p className="text-2xl font-bold mt-1">₹{dashboardStats?.monthlyPayroll?.toLocaleString('en-IN') || '0'}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Paid</p>
                    <p className="text-2xl font-bold text-emerald-600 mt-1">₹{dashboardStats?.paidAmount?.toLocaleString('en-IN') || '0'}</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending</p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">₹{dashboardStats?.pendingAmount?.toLocaleString('en-IN') || '0'}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Basic</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Overtime</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Net Salary</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payrollRecords.length === 0 ? (
                          <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No payroll records. Click Generate to create payroll.</TableCell></TableRow>
                        ) : (
                          payrollRecords.map(p => (
                            <TableRow key={p.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{p.employee?.name}</p>
                                  <p className="text-xs text-muted-foreground">{p.employee?.empId}</p>
                                </div>
                              </TableCell>
                              <TableCell>{MONTH_FULL[p.month - 1]} {p.year}</TableCell>
                              <TableCell>₹{p.basicSalary.toLocaleString('en-IN')}</TableCell>
                              <TableCell>{p.presentDays}/{p.workingDays} days</TableCell>
                              <TableCell className="text-emerald-600">+₹{p.overtime.toLocaleString('en-IN')}</TableCell>
                              <TableCell className="text-red-500">-₹{p.deductions.toLocaleString('en-IN')}</TableCell>
                              <TableCell className="font-bold">₹{p.netSalary.toLocaleString('en-IN')}</TableCell>
                              <TableCell>
                                <Badge className={p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                                  {p.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Timer className="w-3 h-3 mr-1" />}
                                  {p.status === 'paid' ? 'Paid' : 'Pending'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {p.status === 'pending' && (
                                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleMarkPaid(p.id)}>
                                    Mark Paid
                                  </Button>
                                )}
                                {p.status === 'paid' && p.paidAt && (
                                  <span className="text-xs text-muted-foreground">{formatDate(p.paidAt)}</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== EMPLOYEE: CHECK IN/OUT ===== */}
          {currentView === 'check-in-out' && !isAdmin && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* Status Banner */}
              <Card className={`border-0 shadow-sm ${todayStatus.checkedOut ? 'bg-gradient-to-r from-slate-50 to-slate-100' : todayStatus.checkedIn ? 'bg-gradient-to-r from-amber-50 to-amber-100/50' : 'bg-gradient-to-r from-emerald-50 to-teal-100/50'}`}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${todayStatus.checkedOut ? 'bg-slate-200' : todayStatus.checkedIn ? 'bg-amber-200' : 'bg-emerald-200'}`}>
                      {todayStatus.checkedOut ? <CheckCircle2 className="w-7 h-7 text-slate-600" /> : todayStatus.checkedIn ? <Timer className="w-7 h-7 text-amber-600" /> : <Fingerprint className="w-7 h-7 text-emerald-600" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">
                        {todayStatus.checkedOut ? 'Day Complete!' : todayStatus.checkedIn ? 'Checked In' : 'Ready to Check In'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {todayStatus.checkedOut
                          ? `Work hours: ${todayStatus.attendance?.workHours?.toFixed(2)} hrs`
                          : todayStatus.checkedIn
                          ? `Since ${formatTime(todayStatus.attendance?.checkIn || null)}`
                          : 'Click Check In to open camera & capture location'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ===== CHECK IN/OUT BUTTONS (initial state - no flow active) ===== */}
              {!checkInFlow && !checkOutFlow && !todayStatus.checkedOut && (
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={startCheckInFlow}
                    disabled={isLoading || todayStatus.checkedIn}
                    className="h-16 text-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 shadow-lg"
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserCheck className="w-6 h-6 mr-2" />}
                    Check In
                  </Button>
                  <Button
                    onClick={startCheckOutFlow}
                    disabled={isLoading || !todayStatus.checkedIn || todayStatus.checkedOut}
                    className="h-16 text-lg bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 shadow-lg"
                  >
                    {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <UserX className="w-6 h-6 mr-2" />}
                    Check Out
                  </Button>
                </div>
              )}

              {/* ===== ACTIVE FLOW: Camera + Location ===== */}
              {(checkInFlow || checkOutFlow) && (
                <div className="space-y-4">
                  {/* Flow header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={checkInFlow ? 'bg-emerald-100 text-emerald-700 text-sm px-3 py-1' : 'bg-red-100 text-red-700 text-sm px-3 py-1'}>
                        {checkInFlow ? <UserCheck className="w-4 h-4 mr-1" /> : <UserX className="w-4 h-4 mr-1" />}
                        {checkInFlow ? 'Checking In...' : 'Checking Out...'}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={cancelFlow} className="text-muted-foreground hover:text-red-500">
                      <X className="w-4 h-4 mr-1" /> Cancel
                    </Button>
                  </div>

                  {/* Step 1: Camera */}
                  <Card className="border-0 shadow-sm border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Camera className="w-5 h-5 text-emerald-600" />
                        Step 1: Capture Your Face
                        {capturedPhoto && <CheckCircle2 className="w-5 h-5 text-emerald-500 ml-auto" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-square max-w-sm mx-auto">
                          {!cameraActive && !capturedPhoto && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                              <Camera className="w-12 h-12 mb-2" />
                              <p className="text-sm">Opening camera...</p>
                              <Loader2 className="w-6 h-6 animate-spin mt-2" />
                            </div>
                          )}
                          {cameraActive && (
                            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                          )}
                          {capturedPhoto && (
                            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                          )}
                          {cameraActive && (
                            <div className="absolute inset-0 border-4 border-emerald-400/50 rounded-xl pointer-events-none">
                              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-emerald-400" />
                              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-emerald-400" />
                              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-emerald-400" />
                              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-emerald-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 justify-center">
                          {cameraActive && (
                            <Button onClick={capturePhoto} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white px-8">
                              <Camera className="w-5 h-5 mr-2" /> Capture Photo
                            </Button>
                          )}
                          {capturedPhoto && (
                            <Button variant="outline" onClick={retakePhoto} size="lg">
                              Retake Photo
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 2: Location */}
                  <Card className="border-0 shadow-sm border-l-4 border-l-teal-500">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-teal-600" />
                        Step 2: Live Location
                        {currentLocation && <CheckCircle2 className="w-5 h-5 text-teal-500 ml-auto" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {locationLoading && !currentLocation && (
                          <div className="p-4 bg-teal-50 rounded-lg flex items-center gap-3">
                            <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                            <div>
                              <p className="text-sm font-medium text-teal-800">Fetching your location...</p>
                              <p className="text-xs text-teal-600">Please allow location access</p>
                            </div>
                          </div>
                        )}
                        {currentLocation && (
                          <div className="p-3 bg-teal-50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-teal-800">Location Captured</p>
                                <p className="text-xs text-teal-600 mt-1">{currentLocation.address}</p>
                                <p className="text-xs text-teal-500 mt-1">
                                  Lat: {currentLocation.lat.toFixed(6)}, Lng: {currentLocation.lng.toFixed(6)}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {!locationLoading && !currentLocation && (
                          <p className="text-sm text-muted-foreground">Getting location automatically...</p>
                        )}
                        <Button variant="outline" onClick={getLocation} disabled={locationLoading} className="w-full">
                          {locationLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}
                          {currentLocation ? 'Refresh Location' : 'Retry Location'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 3: Confirm */}
                  <Card className="border-0 shadow-sm border-l-4 border-l-emerald-600">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Fingerprint className="w-5 h-5 text-emerald-600" />
                        Step 3: Confirm {checkInFlow ? 'Check In' : 'Check Out'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Checklist */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            {capturedPhoto ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                            <span className={capturedPhoto ? 'text-emerald-700' : 'text-muted-foreground'}>Face photo captured</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {currentLocation ? <CheckCircle2 className="w-4 h-4 text-teal-500" /> : <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
                            <span className={currentLocation ? 'text-teal-700' : 'text-muted-foreground'}>Location captured</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <Button
                            onClick={checkInFlow ? handleCheckIn : handleCheckOut}
                            disabled={isLoading || !capturedPhoto}
                            className={`h-14 text-base text-white shadow-lg disabled:opacity-50 ${checkInFlow ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}
                          >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : checkInFlow ? <UserCheck className="w-5 h-5 mr-2" /> : <UserX className="w-5 h-5 mr-2" />}
                            Confirm {checkInFlow ? 'Check In' : 'Check Out'}
                          </Button>
                          <Button variant="outline" onClick={cancelFlow} className="h-14 text-base">
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Already checked out - show completed state */}
              {todayStatus.checkedOut && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-16 h-16 mx-auto text-emerald-400 mb-3" />
                  <h3 className="text-xl font-semibold text-emerald-700">Today Complete!</h3>
                  <p className="text-muted-foreground mt-1">You have successfully checked out for today</p>
                </div>
              )}

              {/* Today's Record */}
              {todayStatus.attendance && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Today&apos;s Record</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Check In Time</p>
                        <p className="font-medium">{formatTime(todayStatus.attendance.checkIn)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Check Out Time</p>
                        <p className="font-medium">{formatTime(todayStatus.attendance.checkOut)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Check In Location</p>
                        <p className="font-medium text-xs truncate">{todayStatus.attendance.checkInAddr || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Check Out Location</p>
                        <p className="font-medium text-xs truncate">{todayStatus.attendance.checkOutAddr || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Work Hours</p>
                        <p className="font-medium">{todayStatus.attendance.workHours?.toFixed(2) || '-'} hrs</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Status</p>
                        <Badge className={todayStatus.attendance.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {todayStatus.attendance.status === 'checked-out' ? 'Completed' : 'Active'}
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
              <div>
                <h2 className="text-xl font-semibold">My Attendance</h2>
                <p className="text-sm text-muted-foreground">{attendanceHistory.length} records found</p>
              </div>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Check In Location</TableHead>
                          <TableHead>Work Hours</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceHistory.length === 0 ? (
                          <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No attendance records yet</TableCell></TableRow>
                        ) : (
                          attendanceHistory.map(r => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{formatDate(r.date)}</TableCell>
                              <TableCell>{formatTime(r.checkIn)}</TableCell>
                              <TableCell>{formatTime(r.checkOut)}</TableCell>
                              <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">{r.checkInAddr || '-'}</TableCell>
                              <TableCell>{r.workHours?.toFixed(1) || '-'} hrs</TableCell>
                              <TableCell>
                                <Badge className={r.status === 'checked-out' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                                  {r.status === 'checked-out' ? 'Completed' : 'Active'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ===== EMPLOYEE: MY PAYROLL ===== */}
          {currentView === 'my-payroll' && !isAdmin && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">My Payroll</h2>
                <p className="text-sm text-muted-foreground">Your salary and payment details</p>
              </div>
              {payrollRecords.length === 0 ? (
                <Card className="border-0 shadow-sm">
                  <CardContent className="py-12 text-center">
                    <Wallet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No payroll records yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Payroll will be generated by admin at the end of each month</p>
                  </CardContent>
                </Card>
              ) : (
                payrollRecords.map(p => (
                  <Card key={p.id} className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{MONTH_FULL[p.month - 1]} {p.year}</CardTitle>
                        <Badge className={p.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
                          {p.status === 'paid' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <Timer className="w-3 h-3 mr-1" />}
                          {p.status === 'paid' ? 'Paid' : 'Pending'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-muted-foreground">Basic Salary</p>
                          <p className="font-semibold">₹{p.basicSalary.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-muted-foreground">Working Days</p>
                          <p className="font-semibold">{p.workingDays} days</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-muted-foreground">Present Days</p>
                          <p className="font-semibold">{p.presentDays} days</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-muted-foreground">Overtime</p>
                          <p className="font-semibold text-emerald-600">+₹{p.overtime.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded">
                          <p className="text-xs text-muted-foreground">Deductions</p>
                          <p className="font-semibold text-red-500">-₹{p.deductions.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded">
                          <p className="text-xs text-emerald-600">Net Salary</p>
                          <p className="font-bold text-emerald-700 text-lg">₹{p.netSalary.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>
      </main>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
