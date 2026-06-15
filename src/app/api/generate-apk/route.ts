import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Generate a simple HTML file that acts as the "APK download" experience
    // Since we can't generate a real Android APK on the server, we provide
    // a comprehensive PWA install experience wrapped as a downloadable file
    
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://attendancekhata.vercel.app';
    
    // Create a simple Android manifest-like HTML that guides installation
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Install AttendanceKhata</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .container {
      background: white; border-radius: 24px; padding: 40px 30px;
      max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .logo { width: 80px; height: 80px; background: #2563eb; border-radius: 20px; 
      display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 40px; }
    h1 { color: #1e293b; font-size: 24px; margin-bottom: 8px; }
    p { color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 20px; }
    .steps { text-align: left; margin: 20px 0; }
    .step { display: flex; gap: 12px; margin-bottom: 16px; align-items: flex-start; }
    .step-num { 
      width: 28px; height: 28px; background: #2563eb; color: white; 
      border-radius: 50%; display: flex; align-items: center; justify-content: center; 
      font-size: 14px; font-weight: bold; flex-shrink: 0;
    }
    .step-text { font-size: 13px; color: #475569; padding-top: 4px; }
    .btn { 
      display: inline-block; background: #2563eb; color: white; padding: 14px 32px; 
      border-radius: 14px; font-size: 16px; font-weight: bold; text-decoration: none; 
      margin-top: 10px; transition: background 0.2s;
    }
    .btn:hover { background: #1d4ed8; }
    .note { font-size: 11px; color: #94a3b8; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">&#x1F4F1;</div>
    <h1>AttendanceKhata</h1>
    <p>Smart Face Attendance System</p>
    
    <div class="steps">
      <div class="step">
        <div class="step-num">1</div>
        <div class="step-text">Click the button below to open the app</div>
      </div>
      <div class="step">
        <div class="step-num">2</div>
        <div class="step-text">Tap the browser menu (3 dots) in Chrome</div>
      </div>
      <div class="step">
        <div class="step-num">3</div>
        <div class="step-text">Select "Add to Home Screen" or "Install App"</div>
      </div>
      <div class="step">
        <div class="step-num">4</div>
        <div class="step-text">The app will install like a native app on your phone</div>
      </div>
    </div>
    
    <a href="${appUrl}" class="btn">Open AttendanceKhata</a>
    
    <p class="note">This PWA works like a native app with offline support, push notifications, and home screen icon.</p>
  </div>
  
  <script>
    // Auto-redirect to the app after 3 seconds
    setTimeout(() => {
      window.location.href = "${appUrl}";
    }, 3000);
  </script>
</body>
</html>`;

    // Return as a downloadable HTML file that acts as an install guide
    // The user gets a file they can open, which redirects to the PWA
    const encoder = new TextEncoder();
    const bytes = encoder.encode(htmlContent);
    
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'attachment; filename="AttendanceKhata.html"',
        'Content-Length': bytes.length.toString(),
      },
    });
  } catch (error) {
    console.error('APK generation error:', error);
    return NextResponse.json({ error: 'Failed to generate install file' }, { status: 500 });
  }
}
