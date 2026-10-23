import express from 'express';
import {GoogleGenAI} from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.post('/api/consult-ai', async (req, res) => {
    const {vitals, patientName} = req.body;
    const prompt = `Patient: ${patientName}. Vitals: ${JSON.stringify(vitals)}. Provide cardiology clinical advice regarding hypertension management based on these vitals.`;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: prompt,
            config: {
              systemInstruction: "You are an expert Cardiology Clinical Assistant. Provide concise, actionable hypertension management guidance."
            }
        });
        res.json({advice: response.text});
    } catch (e) {
        console.error('Consult AI error:', e);
        res.status(500).json({error: 'AI service failed'});
    }
});

app.post('/api/chat', async (req, res) => {
    const {history, message, patientContext} = req.body;
    try {
        const contents = Array.isArray(history) && history.length > 0
          ? [...history, { role: 'user', parts: [{ text: message }] }]
          : [{ role: 'user', parts: [{ text: message }] }];

        let systemInstruction = "You are an expert Cardiology AI Clinical Assistant for cardiologists. You assist with clinical guidelines (AHA/ACC, ESC, Egyptian Society of Cardiology), cardiology medications (Statins, Beta-blockers, ACE inhibitors, ARBs, DOACs, Antiarrhythmics), ECG & Echocardiogram findings interpretation, and patient risk stratification. Keep your answers well-structured, concise, and clinically rigorous.";

        if (patientContext && patientContext.name) {
          systemInstruction += `\n\nCURRENT PATIENT MEDICAL RECORD ACTIVE IN CLINIC:
- Patient Name: ${patientContext.name}
- Age / DOB: ${patientContext.dob || 'Adult'}
- Recent Blood Pressure & Pulse readings: ${JSON.stringify(patientContext.vitals || [])}
- Active Prescriptions / Medications: ${JSON.stringify(patientContext.medications || [])}
- Clinical Status: ${patientContext.status || 'Active patient'}

CLINICAL INSTRUCTION: The doctor is consulting you directly about THIS patient (${patientContext.name}). Reference their actual blood pressure values, heart rate trends, and current medications directly in your clinical analysis. Do NOT ask the doctor to re-explain the patient's vitals or medications.`;
        }

        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: contents,
            config: {
                systemInstruction: systemInstruction
            }
        });
        res.json({response: response.text});
    } catch (e) {
        console.error('Chat error:', e);
        res.status(500).json({error: 'AI service failed'});
    }
});

app.listen(3001, () => console.log('Server running on 3001'));
