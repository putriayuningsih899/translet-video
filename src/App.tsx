import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  Upload, 
  Languages, 
  Volume2, 
  Play, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Video,
  FileVideo,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, fileToBase64 } from './lib/utils';
import { translateVideo, generateSpeech } from './lib/gemini';
import { playPCM } from './lib/pcmPlayer';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'ru', name: 'Russian' },
  { code: 'zh', name: 'Chinese' },
];

const VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];

export default function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [targetLang, setTargetLang] = useState(LANGUAGES[0].name);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{ transcription: string; translation: string } | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState('Kore');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setResult(null);
      setAudioUrl(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': [] },
    multiple: false,
  } as any);

  const handleTranslate = async () => {
    if (!videoFile) return;

    setIsProcessing(true);
    setError(null);
    try {
      const base64 = await fileToBase64(videoFile);
      const data = await translateVideo(base64, videoFile.type, targetLang);
      setResult(data);
    } catch (err) {
      console.error(err);
      setError('Failed to process video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateVoice = async () => {
    if (!result?.translation) return;

    setIsGeneratingAudio(true);
    try {
      const base64Audio = await generateSpeech(result.translation, selectedVoice);
      if (base64Audio) {
        await playPCM(base64Audio);
        setAudioUrl('played'); // Just to show it's ready/played
      }
    } catch (err) {
      console.error(err);
      setError('Failed to generate voice.');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const clearVideo = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setResult(null);
    setAudioUrl(null);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col items-center max-w-6xl mx-auto">
      <header className="w-full mb-12 text-center">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4"
        >
          <Languages size={14} />
          <span>AI-POWERED VIDEO TRANSLATOR</span>
        </motion.div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter mb-4">
          LingoVideo <span className="text-blue-500">Translator</span>
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          Translate Indonesian video content into any language with high-fidelity transcription and AI voice synthesis.
        </p>
      </header>

      <main className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Column: Upload & Preview */}
        <section className="space-y-6">
          <div className="hardware-border rounded-2xl overflow-hidden bg-[#111]">
            <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#151515]">
              <div className="flex items-center gap-2">
                <Video size={18} className="text-blue-500" />
                <span className="text-sm font-mono uppercase tracking-widest text-gray-400">Video Input</span>
              </div>
              {videoFile && (
                <button 
                  onClick={clearVideo}
                  className="p-1 hover:bg-white/5 rounded-md transition-colors text-gray-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>
            
            <div className="aspect-video relative bg-black flex items-center justify-center">
              {videoUrl ? (
                <video 
                  src={videoUrl} 
                  controls 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "w-full h-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300",
                    isDragActive ? "bg-blue-500/5" : "hover:bg-white/5"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Upload size={24} className="text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-300">
                    {isDragActive ? "Drop video here" : "Click or drag video to upload"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">MP4, MOV, WEBM (Max 50MB)</p>
                </div>
              )}
            </div>
          </div>

          <div className="glass rounded-2xl p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono uppercase tracking-widest text-gray-500">Target Language</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setTargetLang(lang.name)}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-all border",
                      targetLang === lang.name 
                        ? "bg-blue-500 border-blue-400 text-white shadow-lg shadow-blue-500/20" 
                        : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                    )}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              disabled={!videoFile || isProcessing}
              onClick={handleTranslate}
              className={cn(
                "w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3",
                !videoFile || isProcessing
                  ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 active:scale-[0.98]"
              )}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Processing Video...
                </>
              ) : (
                <>
                  <Languages size={20} />
                  Translate Now
                </>
              )}
            </button>
          </div>
        </section>

        {/* Right Column: Results */}
        <section className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-3"
              >
                <AlertCircle size={20} />
                <p className="text-sm">{error}</p>
              </motion.div>
            )}

            {result ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="hardware-border rounded-2xl bg-[#111] overflow-hidden">
                  <div className="p-4 border-b border-[#222] bg-[#151515] flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-green-500" />
                    <span className="text-sm font-mono uppercase tracking-widest text-gray-400">Transcription (ID)</span>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-300 leading-relaxed italic">
                      "{result.transcription}"
                    </p>
                  </div>
                </div>

                <div className="hardware-border rounded-2xl bg-[#111] overflow-hidden">
                  <div className="p-4 border-b border-[#222] bg-[#151515] flex items-center gap-2">
                    <Languages size={18} className="text-blue-500" />
                    <span className="text-sm font-mono uppercase tracking-widest text-gray-400">Translation ({targetLang})</span>
                  </div>
                  <div className="p-6 space-y-6">
                    <p className="text-white text-lg font-medium leading-relaxed">
                      {result.translation}
                    </p>

                    <div className="pt-6 border-t border-[#222] space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-mono uppercase tracking-widest text-gray-500">Voice Synthesis</label>
                        <select 
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs text-gray-300 outline-none focus:border-blue-500"
                        >
                          {VOICES.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      
                      <button
                        onClick={handleGenerateVoice}
                        disabled={isGeneratingAudio}
                        className={cn(
                          "w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                          isGeneratingAudio 
                            ? "bg-gray-800 text-gray-500" 
                            : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                        )}
                      >
                        {isGeneratingAudio ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Volume2 size={18} />
                        )}
                        {isGeneratingAudio ? "Generating Voice..." : "Generate Voice Audio"}
                      </button>

                      {audioUrl && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex items-center gap-4"
                        >
                          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                            <Volume2 size={18} />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Audio Generated</p>
                            <button 
                              onClick={handleGenerateVoice}
                              className="text-sm text-white hover:underline mt-1 flex items-center gap-1"
                            >
                              <Play size={12} /> Play Again
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-[#222] rounded-3xl"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                  <FileVideo size={32} className="text-gray-600" />
                </div>
                <h3 className="text-xl font-medium text-gray-400 mb-2">No Translation Yet</h3>
                <p className="text-sm text-gray-500 max-w-xs">
                  Upload a video and select a target language to see the magic happen.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      <footer className="mt-20 w-full border-t border-[#222] pt-8 pb-12 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-xs font-mono uppercase tracking-widest">
        <p>© 2024 LingoVideo AI Labs</p>
        <div className="flex gap-6">
          <span>Powered by Gemini 3.1</span>
          <span>Indonesian to Global</span>
        </div>
      </footer>
    </div>
  );
}
