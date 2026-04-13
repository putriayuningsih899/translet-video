import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function translateVideo(videoBase64: string, mimeType: string, targetLanguage: string) {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Analyze the audio in this video. 
    1. Transcribe the Indonesian speech exactly as spoken.
    2. Translate the transcription into ${targetLanguage}.
    Return the result in JSON format with keys "transcription" and "translation".
  `;

  const videoPart = {
    inlineData: {
      mimeType,
      data: videoBase64,
    },
  };

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [videoPart, { text: prompt }] }],
    config: {
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text || "{}");
}

export async function generateSpeech(text: string, voice: string = "Kore") {
  const model = "gemini-2.5-flash-preview-tts";
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voice },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return base64Audio;
}
