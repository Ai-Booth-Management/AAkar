'use client';

import dynamic from 'next/dynamic';
import { MapPin } from 'lucide-react';
import React from 'react';

// Dynamic import with ssr: false MUST be inside a 'use client' file in Next.js App Router
const MapComponent = dynamic(() => import('./Map'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 animate-pulse flex items-center justify-center border border-gray-200">
      <span className="text-gray-400 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
        <MapPin className="animate-bounce" /> Loading Map Engine...
      </span>
    </div>
  )
});

export default function MapWrapper(props: any) {
  return <MapComponent {...props} />;
}
