import React from 'react';
import {Activity, FileText, ClipboardList, Stethoscope, CheckCircle, X} from 'lucide-react';

export default function LandingPage({onLaunch}: {onLaunch: () => void}) {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <nav className="p-6 flex justify-between items-center border-b">
        <h1 className="text-2xl font-bold text-blue-600">Cardios</h1>
        <div className="space-x-4">
          <button onClick={onLaunch} className="bg-blue-600 text-white px-6 py-2 rounded-full font-semibold">Launch Dashboard</button>
        </div>
      </nav>

      <header className="py-20 text-center">
        <h1 className="text-5xl font-extrabold mb-6">Cardiology-First EHR & RPM Platform</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Modernizing cardiology practices in Egypt with seamless EHR, real-time remote monitoring, and smart clinical workflows.</p>
        <button onClick={onLaunch} className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold text-lg mr-4">Launch Dashboard</button>
        <button className="bg-gray-100 text-gray-800 px-8 py-3 rounded-full font-semibold text-lg">Book Demo</button>
      </header>

      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
                <h2 className="text-3xl font-bold mb-6">Why Cardios?</h2>
                <table className="w-full border-collapse bg-white shadow rounded-lg overflow-hidden">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-4 text-left">Feature</th>
                            <th className="p-4">Cardios</th>
                            <th className="p-4">Altibbi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {[
                            {f: 'Cardio-Specific EHR', c: true, a: false},
                            {f: 'Real-time RPM/Alerts', c: true, a: false},
                            {f: 'Lab/Echo Integration', c: true, a: false},
                        ].map((row, i) => (
                            <tr key={i} className="border-t">
                                <td className="p-4">{row.f}</td>
                                <td className="p-4 text-center">{row.c ? <CheckCircle className="text-green-500 mx-auto"/> : <X className="text-red-500 mx-auto"/>}</td>
                                <td className="p-4 text-center">{row.a ? <CheckCircle className="text-green-500 mx-auto"/> : <X className="text-red-500 mx-auto"/>}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {[
                    {title: 'Cardiology-Native EHR', icon: <Stethoscope />},
                    {title: 'Smart Prescription Engine', icon: <FileText />},
                    {title: 'Real-time RPM & Vitals', icon: <Activity />},
                    {title: 'Cardiology Reports & Echo', icon: <ClipboardList />},
                ].map((card, i) => (
                    <div key={i} className="bg-white p-6 shadow rounded-lg flex flex-col items-center text-center">
                        <div className="text-blue-600 mb-4">{card.icon}</div>
                        <h3 className="font-semibold">{card.title}</h3>
                    </div>
                ))}
            </div>
        </div>
      </section>
    </div>
  );
}
