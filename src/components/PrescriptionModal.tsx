import React, {useState, useEffect} from 'react';
import {X, Plus, Trash2, Printer, Share2, Pill, Check, UserCheck} from 'lucide-react';
import {collection, getDocs, addDoc} from 'firebase/firestore';
import {db} from '../lib/firebase';

interface Props {
  onClose: () => void;
}

interface Medication {
  name: string;
  dosage: string;
  instructions: string;
  duration: string;
}

const CARDIOLOGY_DRUGS = [
  {name: 'Atorvastatin (Lipitor)', dosage: '20 mg', instructions: 'Take 1 tablet daily at bedtime', duration: '3 months'},
  {name: 'Atorvastatin (Lipitor)', dosage: '40 mg', instructions: 'Take 1 tablet daily at bedtime', duration: '3 months'},
  {name: 'Rosuvastatin (Crestor)', dosage: '10 mg', instructions: 'Take 1 tablet daily at bedtime', duration: '3 months'},
  {name: 'Bisoprolol (Concor)', dosage: '2.5 mg', instructions: 'Take 1 tablet once daily in the morning', duration: '3 months'},
  {name: 'Bisoprolol (Concor)', dosage: '5 mg', instructions: 'Take 1 tablet once daily in the morning', duration: '3 months'},
  {name: 'Ramipril (Tritace)', dosage: '5 mg', instructions: 'Take 1 capsule once daily', duration: '3 months'},
  {name: 'Ramipril (Tritace)', dosage: '10 mg', instructions: 'Take 1 capsule once daily', duration: '3 months'},
  {name: 'Valsartan (Diovan)', dosage: '80 mg', instructions: 'Take 1 tablet once daily', duration: '3 months'},
  {name: 'Sacubitril/Valsartan (Entresto)', dosage: '49/51 mg', instructions: 'Take 1 tablet twice daily', duration: '3 months'},
  {name: 'Empagliflozin (Jardiance)', dosage: '10 mg', instructions: 'Take 1 tablet once daily in the morning', duration: '3 months'},
  {name: 'Dapagliflozin (Forxiga)', dosage: '10 mg', instructions: 'Take 1 tablet once daily in the morning', duration: '3 months'},
  {name: 'Aspirin Protect', dosage: '81 mg', instructions: 'Take 1 tablet once daily after lunch', duration: 'Ongoing'},
  {name: 'Clopidogrel (Plavix)', dosage: '75 mg', instructions: 'Take 1 tablet once daily', duration: '12 months'},
  {name: 'Rivaroxaban (Xarelto)', dosage: '20 mg', instructions: 'Take 1 tablet daily with dinner', duration: 'Ongoing'}
];

export default function PrescriptionModal({onClose}: Props) {
  const [patients, setPatients] = useState<{id: string; name: string}[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<{id: string; name: string} | null>(null);
  const [medications, setMedications] = useState<Medication[]>([
    {name: 'Atorvastatin (Lipitor)', dosage: '20 mg', instructions: 'Take 1 tablet daily at bedtime', duration: '3 months'},
    {name: 'Bisoprolol (Concor)', dosage: '5 mg', instructions: 'Take 1 tablet once daily in the morning', duration: '3 months'},
    {name: 'Aspirin Protect', dosage: '81 mg', instructions: 'Take 1 tablet once daily after lunch', duration: 'Ongoing'}
  ]);

  const [searchDrug, setSearchDrug] = useState('');
  const [dosage, setDosage] = useState('');
  const [instructions, setInstructions] = useState('');
  const [duration, setDuration] = useState('3 months');
  const [doctorNotes, setDoctorNotes] = useState('Low salt diet. Monitor home blood pressure daily. Repeat lipid profile in 3 months.');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const snap = await getDocs(collection(db, 'patients'));
        const list = snap.docs.map(d => ({id: d.id, name: d.data().name || 'Patient ' + d.id}));
        setPatients(list);
        if (list.length > 0) setSelectedPatient(list[0]);
      } catch (e) {
        const fallback = [
          {id: '1', name: 'Ahmed Hassan'},
          {id: '2', name: 'Fatma Ali'},
          {id: '3', name: 'Mohamed Ibrahim'},
        ];
        setPatients(fallback);
        setSelectedPatient(fallback[0]);
      }
    };
    fetchPatients();
  }, []);

  const handleSelectDrugSuggestion = (drug: typeof CARDIOLOGY_DRUGS[0]) => {
    setSearchDrug(drug.name);
    setDosage(drug.dosage);
    setInstructions(drug.instructions);
    setDuration(drug.duration);
  };

  const handleAddMedication = () => {
    if (!searchDrug.trim()) return;
    setMedications([
      ...medications,
      {
        name: searchDrug.trim(),
        dosage: dosage || 'As directed',
        instructions: instructions || 'Follow doctor instructions',
        duration: duration || '1 month'
      }
    ]);
    setSearchDrug('');
    setDosage('');
    setInstructions('');
  };

  const handleRemoveMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const handleSaveToEHR = async () => {
    if (!selectedPatient) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'patients', selectedPatient.id, 'prescriptions'), {
        medications,
        notes: doctorNotes,
        patientName: selectedPatient.name,
        createdAt: new Date().toISOString()
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      alert('Failed to save prescription.');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsAppSend = () => {
    if (!selectedPatient) return;
    const medsList = medications.map((m, idx) => `${idx + 1}. *${m.name}* (${m.dosage})\n   └ ${m.instructions} [لمدة: ${m.duration}]`).join('\n\n');
    const message = `*روشتة علاجية إلكترونية - Cardios Clinic* 🫀
👤 *المريض:* ${selectedPatient.name}
📅 *التاريخ:* ${new Date().toLocaleDateString('ar-EG')}

💊 *الأدوية المقررة:*
${medsList}

📝 *ملاحظات الطبيب:*
${doctorNotes}

⚠️ برجاء الالتزام بالمواعيد المحددة والجرعات وعدم إيقاف أي علاج دون الرجوع للطبيب المعالج.
👨‍⚕️ *د. القلب والأوعية الدموية - Cardios*`;

    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Top Header (no-print) */}
        <div className="p-4 bg-gray-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-400" />
              <label className="text-xs font-semibold text-gray-300">Prescription for:</label>
            </div>
            <select
              value={selectedPatient?.id || ''}
              onChange={(e) => {
                const found = patients.find(p => p.id === e.target.value);
                if (found) setSelectedPatient(found);
              }}
              className="bg-gray-800 text-white text-xs px-3 py-1.5 rounded-lg border border-gray-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (ID: {p.id})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveToEHR}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all"
            >
              <Check size={14} />
              <span>{savedSuccess ? 'Saved!' : saving ? 'Saving...' : 'Save to Record'}</span>
            </button>
            <button
              onClick={handleWhatsAppSend}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all"
            >
              <Share2 size={14} />
              <span>Send WhatsApp</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              <Printer size={14} />
              <span>Print Prescription</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/70 space-y-6">
          {/* Quick Drug Search & Add Box (no-print) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-2xs space-y-3 no-print">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <Pill size={16} className="text-blue-600" />
              Add Medication (with Cardiology Auto-Complete)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div className="sm:col-span-2">
                <input
                  type="text"
                  list="cardio-drugs-list"
                  value={searchDrug}
                  onChange={(e) => setSearchDrug(e.target.value)}
                  placeholder="Medication name (e.g. Bisoprolol, Atorvastatin...)"
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="cardio-drugs-list">
                  {CARDIOLOGY_DRUGS.map((d, i) => (
                    <option key={i} value={d.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <input
                  type="text"
                  value={dosage}
                  onChange={(e) => setDosage(e.target.value)}
                  placeholder="Dosage (e.g. 5 mg)"
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Duration (e.g. 3 months)"
                  className="w-full text-xs p-2.5 border border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Instructions (e.g. Take 1 tablet once daily in the morning)"
                className="flex-1 text-xs p-2.5 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleAddMedication}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shrink-0"
              >
                <Plus size={15} />
                <span>Add Drug</span>
              </button>
            </div>

            {/* Quick Suggestions Chips */}
            <div className="pt-1 flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] text-gray-400 font-medium mr-1">Frequent:</span>
              {CARDIOLOGY_DRUGS.slice(0, 5).map((d, i) => (
                <button
                  key={i}
                  onClick={() => handleSelectDrugSuggestion(d)}
                  className="text-[11px] px-2 py-1 bg-gray-100 hover:bg-blue-50 hover:text-blue-700 rounded-md text-gray-600 border border-gray-200 transition-colors"
                >
                  {d.name} ({d.dosage})
                </button>
              ))}
            </div>
          </div>

          {/* Printable Official Prescription Document */}
          <div id="prescription-content" className="printable bg-white p-8 rounded-xl border border-gray-200 shadow-sm text-gray-900">
            {/* Prescription Header */}
            <div className="border-b-2 border-blue-900 pb-4 mb-6 print-header">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-blue-900 tracking-tight">DR. CARDIOS CARDIOVASCULAR CLINIC</h1>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mt-0.5">
                    Consultant of Cardiology & Interventional Angiography
                  </p>
                  <p className="text-[11px] text-gray-500">M.D. Cardiology, FESC • Cairo, Egypt</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-blue-900 px-3 py-1 bg-blue-50 border border-blue-200 rounded uppercase">
                    Medical Prescription (روشتة علاجية)
                  </span>
                  <p className="text-xs text-gray-500 mt-2 font-mono">Date: {new Date().toLocaleDateString('en-GB')}</p>
                </div>
              </div>
            </div>

            {/* Patient Info Bar */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 mb-6 flex justify-between text-xs">
              <div>
                <span className="text-gray-500 font-medium">Patient Name (اسم المريض):</span>
                <p className="font-bold text-gray-900 text-sm mt-0.5">{selectedPatient?.name || 'Ahmed Hassan'}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Patient ID:</span>
                <p className="font-semibold text-gray-700 mt-0.5">{selectedPatient?.id || '001'}</p>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Specialty:</span>
                <p className="font-semibold text-gray-700 mt-0.5">Cardiology & Hypertension</p>
              </div>
            </div>

            {/* Symbol ℞ */}
            <div className="text-2xl font-serif font-black text-blue-900 mb-3 select-none">
              ℞
            </div>

            {/* Medications Table / List */}
            <div className="space-y-3 mb-6">
              {medications.map((m, i) => (
                <div key={i} className="p-3.5 rounded-lg border border-gray-200 bg-gray-50/40 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <h4 className="font-bold text-gray-900 text-sm">{m.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                        {m.dosage}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 pl-7">{m.instructions}</p>
                    <p className="text-[11px] text-gray-400 pl-7">Duration: {m.duration}</p>
                  </div>
                  <button
                    onClick={() => handleRemoveMedication(i)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors no-print"
                    title="Remove medication"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              {medications.length === 0 && (
                <div className="p-6 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl text-xs">
                  No medications added yet. Use the drug adder above.
                </div>
              )}
            </div>

            {/* Doctor Advice & Lifestyle notes */}
            <div className="p-4 bg-gray-50/70 rounded-xl border border-gray-200 text-xs mb-8">
              <span className="font-bold text-gray-700 block mb-1">Doctor Advice & Lifestyle Instructions:</span>
              <p className="text-gray-800 leading-relaxed">{doctorNotes}</p>
            </div>

            {/* Official Signature Footer */}
            <div className="pt-6 border-t border-gray-300 flex justify-between items-end text-xs text-gray-600 print-footer">
              <div>
                <p className="font-bold text-gray-800">Cardios Clinic Digital Prescription</p>
                <p className="text-[11px] text-gray-400">Emergency Hotline: 16XXX • Clinic Support</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 mb-6">Physician Signature & Stamp:</p>
                <div className="w-44 border-b-2 border-gray-800 pb-1 text-center font-serif text-sm font-bold text-gray-800">
                  Dr. Cardios, MD
                </div>
                <p className="text-[10px] text-gray-500 mt-1">Consultant of Cardiology</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
