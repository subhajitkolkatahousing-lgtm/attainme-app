import { NextRequest, NextResponse } from 'next/server';

// Haversine formula to calculate distance between two coordinates in km
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const { lat, lng } = await req.json();

    if (!lat || !lng) {
      return NextResponse.json({ spoofed: false, reason: '' });
    }

    // Get IP-based location from multiple free APIs for cross-verification
    let ipLat: number | null = null;
    let ipLng: number | null = null;
    let ipSource = '';

    // Try ip-api.com (free, no key needed)
    try {
      const res = await fetch('http://ip-api.com/json/?fields=status,lat,lon', {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.lat && data.lon) {
          ipLat = data.lat;
          ipLng = data.lon;
          ipSource = 'ip-api.com';
        }
      }
    } catch {}

    // Fallback: try ipapi.co
    if (ipLat === null) {
      try {
        const res = await fetch('https://ipapi.co/json/', {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.latitude && data.longitude) {
            ipLat = data.latitude;
            ipLng = data.longitude;
            ipSource = 'ipapi.co';
          }
        }
      } catch {}
    }

    // If we couldn't get IP location, skip this check (don't false-positive)
    if (ipLat === null || ipLng === null) {
      return NextResponse.json({
        spoofed: false,
        reason: '',
        note: 'IP geolocation unavailable, skipping check',
      });
    }

    // Calculate distance between GPS and IP location
    const distance = haversineDistance(lat, lng, ipLat, ipLng);

    // If GPS location is more than 500km from IP location, it's very suspicious
    // IP geolocation is city-level accurate (usually within 50-100km)
    // A 500km+ discrepancy strongly suggests GPS spoofing
    if (distance > 500) {
      return NextResponse.json({
        spoofed: true,
        reason: `GPS location is ${Math.round(distance)}km away from your network location. This strongly indicates a fake GPS app is active.`,
        ipLocation: { lat: ipLat, lng: ipLng, source: ipSource },
        gpsLocation: { lat, lng },
        distance: Math.round(distance),
      });
    }

    // If distance is between 200-500km, flag as suspicious
    if (distance > 200) {
      return NextResponse.json({
        spoofed: true,
        reason: `GPS location is ${Math.round(distance)}km from your network location. Possible location spoofing detected.`,
        ipLocation: { lat: ipLat, lng: ipLng, source: ipSource },
        gpsLocation: { lat, lng },
        distance: Math.round(distance),
      });
    }

    return NextResponse.json({
      spoofed: false,
      reason: '',
      distance: Math.round(distance),
      ipSource,
    });
  } catch (error) {
    console.error('Location verification error:', error);
    return NextResponse.json({ spoofed: false, reason: '' });
  }
}
