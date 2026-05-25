"use client";

import { useState } from "react";
import { NewDisplayPanel } from "./NewDisplayPanel";
import NewInputPanel from "./NewInputPanel";

export default function NewUploadInterface() {
  const [data, setData] = useState<string[] | null>(null);

  return (
    <div className="min-h-screen bg-[#0d1117] relative overflow-hidden">
      {/* Ambient glow blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-96 h-96 bg-cyan-500/8 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-8%] w-[500px] h-[500px] bg-violet-500/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[30%] w-80 h-80 bg-blue-500/6 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 h-screen flex flex-col gap-4">

        {/* Page caption */}
        <p className="text-center text-sm text-white/35 font-medium tracking-wide flex-shrink-0">
          Studying ASL fosters awareness and sensitivity toward the Deaf and hard-of-hearing community.
        </p>

        {/* Main two-column layout — fills remaining height */}
        <div className="flex-1 grid lg:grid-cols-5 gap-4 min-h-0">
          {/* Input panel */}
          <div className="lg:col-span-2 order-2 lg:order-1 flex flex-col min-h-0">
            <NewInputPanel setData={(d) => setData(d)} />
          </div>

          {/* Display / 3D panel */}
          <div className="lg:col-span-3 order-1 lg:order-2 flex flex-col min-h-0">
            <NewDisplayPanel data={data} />
          </div>
        </div>
      </div>
    </div>
  );
}
