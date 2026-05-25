"use client";

// import {
//   cleanup,
//   initThreeJS,
//   renderHandsFromData,
//   setWordList,
// } from "@/hooks/Main";
import { NewThree, updateWordList } from "@/hooks/NewMain";
import axios from "axios";
import {
  Activity,
  Eye,
  Heart,
  Loader2,
  Mic,
  MicOff,
  Pause,
  Sparkles,
  Star,
  Target,
  Volume2,
  Zap,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import useSpeechToText from "react-hook-speech-to-text";

export default function SpeechToTextClient() {
  const {
    error,
    interimResult,
    isRecording,
    results,
    startSpeechToText,
    stopSpeechToText,
  } = useSpeechToText({
    continuous: true,
    useLegacyResults: false,
    speechRecognitionProperties: {
      lang: "en-US",
      interimResults: true, // Allows for displaying real-time speech results
    },
  });

  const [wordStream, setWordStream] = useState<string[]>([]);
  const [DjangoData, setDjangodata] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [processing, setIsProcessing] = useState(false);
  const [currentWord, setCurrentWord] = useState("");
  const [wordIdx, setWordIdx] = useState(0);

  const [isThreeJSInitialized, setIsThreeJSInitialized] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  // tracking words sent to backend
  const sentWordsRef = useRef<Set<string>>(new Set());
  console.log(DjangoData);

  //   // Initialize Three.js after component mounts
  //   useEffect(() => {
  //     const initializeThreeJS = () => {
  //       try {
  //         // if (DjangoData.length > 0 && isThreeJSInitialized) {
  //         console.log("Processing Django data:", DjangoData);
  //         console.log("Initializing Three.js...");

  //         NewThree("container", "label", DjangoData);

  //         setIsThreeJSInitialized(true);
  //         console.log("Three.js initialized successfully");
  //         // }
  //       } catch (error) {
  //         console.error("Failed to initialize Three.js:", error);
  //       }
  //     };

  //     // Small delay to ensure DOM elements are ready
  //     const timer = setTimeout(initializeThreeJS, 100);

  //     return () => {
  //       clearTimeout(timer);
  //       cleanup();
  //       setIsThreeJSInitialized(false);
  //     };
  //   }, [DjangoData]);

  // Handle Django data and update word list - NOW USING renderHandsFromData
  //   useEffect(() => {
  //     if (DjangoData.length > 0 && isThreeJSInitialized) {
  //       console.log("Processing Django data:", DjangoData);
  //       // Use the exported function to handle the data properly
  //       renderHandsFromData(DjangoData);
  //     }
  //   }, [DjangoData, isThreeJSInitialized]);

  useEffect(() => {
    const initializeThreeJS = () => {
      try {
        console.log("Initializing Three.js...");
        const cleanup = NewThree("label", "container");
        cleanupRef.current = cleanup || null;
        setIsThreeJSInitialized(true);
        console.log("Three.js initialized successfully");
      } catch (error) {
        console.error("Failed to initialize Three.js:", error);
      }
    };

    // Only initialize once when component mounts
    initializeThreeJS();

    return () => {
      cleanupRef.current?.();
      setIsThreeJSInitialized(false);
    };
  }, []);

  useEffect(() => {
    if (DjangoData.length === 0) return;
    setIsPlaying(true);
    setIsDone(false);
    setWordIdx(0);
    setCurrentWord(DjangoData[0] || "");

    updateWordList(
      DjangoData,
      (word: string, idx: number) => {
        setCurrentWord(word);
        setWordIdx(idx);
      },
      () => {
        setIsPlaying(false);
        setIsDone(true);
      }
    );
  }, [DjangoData]);

  useEffect(() => {
    const newWords: string[] = [];

    results.forEach((result) => {
      const phrase = typeof result === "string" ? result : result.transcript;
      if (!sentWordsRef.current.has(phrase)) {
        // if the word is already sent then no need to send it again
        newWords.push(phrase);
        sentWordsRef.current.add(phrase); // marking as sent
      }
    });

    if (newWords.length > 0) {
      // Both prev and newWords are arrays but the spread operator ... flattens both the arrays and makes a single array having elements from both of them
      setWordStream((prev) => [...prev, ...newWords]);

      // Send each new word to the backend
      newWords.forEach((word) => {
        console.log("sending to backend:   " + word);
        sendToBackend(word);
        setIsProcessing(true);
      });
    }
  }, [results]);

  const sendToBackend = async (word: string) => {
    try {
      console.log(word);

      const formData = new FormData(); // As Django backend accepts from-data instead of json
      formData.append("category", "text");
      formData.append("text", word);

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.post(
        `${backendUrl}/api/process/`,
        formData
      );

      console.log(response);
      setDjangodata(response.data.gloss);
      console.log("Backend response:", response.data);
    } catch (error) {
      console.error("Error sending word to backend:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-red-500/10 backdrop-blur-xl rounded-3xl p-8 border border-red-500/20 text-center max-w-md mx-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <MicOff className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Speech Recognition Unavailable
          </h2>
          <p className="text-red-300">
            Web Speech API is not available in this browser. Please use Chrome
            for the best experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-700" />

        {/* Floating icons */}
        <div className="absolute top-32 left-1/4 animate-float">
          <Mic className="w-8 h-8 text-blue-400/20" />
        </div>
        <div className="absolute top-1/3 right-1/4 animate-float-delayed">
          <Sparkles className="w-6 h-6 text-purple-400/20" />
        </div>
        <div className="absolute bottom-1/3 left-1/3 animate-float-slow">
          <Zap className="w-7 h-7 text-pink-400/20" />
        </div>
        <div className="absolute top-1/4 right-1/3 animate-float">
          <Heart className="w-5 h-5 text-indigo-400/20" />
        </div>
        <div className="absolute bottom-1/4 right-1/4 animate-float-delayed">
          <Star className="w-6 h-6 text-cyan-400/20" />
        </div>
        <div className="absolute top-2/3 left-1/5 animate-float-slow">
          <Target className="w-8 h-8 text-emerald-400/20" />
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-4 h-screen flex flex-col">
        {/* Header */}
        <div className="text-center mb-8 animate-fadeInUp">
          <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed animate-fadeInUp delay-300">
            Speak naturally and watch your words transform into beautiful 3D
            sign language animations in real-time.
          </p>
        </div>

        {/* Main Content */}
        <div className="flex-1 grid lg:grid-cols-5 gap-6 min-h-0 h-auto animate-fadeInUp delay-500">
          {/* Control Panel */}
          <div className="lg:col-span-2 order-2 lg:order-1">
            <div className="h-full bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/30 to-slate-900/50 rounded-3xl" />

              {/* Header */}
              <div className="relative z-10 mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Volume2 className="w-6 h-6 text-white" />
                    </div>
                    {isRecording && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-red-400 to-pink-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">
                      Voice Control
                    </h2>
                    <div className="w-16 h-1 bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full mt-1" />
                  </div>
                </div>
                <p className="text-white/70 text-sm leading-relaxed">
                  Start speaking to see real-time transcription and sign
                  language visualization
                </p>
              </div>

              {/* Recording Status */}
              <div className="relative z-10 mb-6">
                <div
                  className={`p-6 rounded-2xl border transition-all duration-500 ${
                    isRecording
                      ? "bg-gradient-to-br from-red-500/20 to-pink-500/20 border-red-400/50 shadow-lg"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          isRecording
                            ? "bg-red-400 animate-pulse"
                            : "bg-gray-400"
                        }`}
                      />
                      <span className="text-white font-medium">
                        {isRecording ? "Recording..." : "Ready to Record"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60 text-sm">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </div>

                  <button
                    onClick={isRecording ? stopSpeechToText : startSpeechToText}
                    className={`group w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl ${
                      isRecording
                        ? "bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white"
                        : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                    }`}
                  >
                    {isRecording ? (
                      <>
                        <Pause className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        Stop Recording
                      </>
                    ) : (
                      <>
                        <Mic className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                        Start Recording
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Live Transcription */}
              {interimResult && (
                <div className="relative z-10 mb-6 animate-in slide-in-from-top-4 duration-500">
                  <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm rounded-2xl p-4 border border-blue-400/30">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-400 animate-pulse" />
                      <span className="text-blue-300 text-sm font-medium">
                        Live Transcription
                      </span>
                    </div>
                    <p className="text-white text-lg leading-relaxed break-words">
                      {interimResult}
                    </p>
                  </div>
                </div>
              )}

              {/* System Status */}
              <div className="relative z-10">
                <h3 className="text-white/90 font-semibold mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" />
                  System Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <span className="text-white/70 text-sm">
                      Words Processed
                    </span>
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          wordStream.length > 0 ? "bg-blue-400" : "bg-gray-400"
                        } animate-pulse`}
                      />
                      <span className="text-white text-sm">
                        {wordStream.length}
                      </span>
                    </div>
                  </div>
                </div>
                {processing && (
                  <div className="mt-4 p-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl border border-blue-400/30 animate-in fade-in duration-300">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                      <span className="text-white/90 font-medium">
                        Processing your speech...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Floating background elements */}
              <div className="absolute top-10 left-10 w-20 h-20 bg-blue-400/10 rounded-full blur-xl animate-pulse" />
              <div className="absolute bottom-10 right-10 w-16 h-16 bg-purple-400/10 rounded-full blur-xl animate-pulse delay-1000" />
              <div className="absolute top-1/2 left-1/4 w-12 h-12 bg-pink-400/10 rounded-full blur-xl animate-pulse delay-500" />
            </div>
          </div>

          {/* 3D Visualization Panel */}
          <div className="lg:col-span-3 order-1 lg:order-2">
            <div className="h-full bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden relative">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900/50 via-purple-900/30 to-slate-900/50 rounded-3xl" />

              {/* Header */}
              <div className="relative z-10 bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm p-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                        <Eye className="w-6 h-6 text-white" />
                      </div>
                      {isThreeJSInitialized && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full animate-pulse" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        3D Sign Language Viewer
                        {isPlaying && (
                          <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                        )}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isThreeJSInitialized
                              ? "bg-green-400"
                              : "bg-yellow-400"
                          } animate-pulse`}
                        />
                        <span className="text-sm text-white/70">
                          {isThreeJSInitialized
                            ? "Ready for visualization"
                            : "Initializing..."}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status indicators */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                      <Sparkles className="w-4 h-4 text-blue-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Current word display - wrapping the original label */}
              <div className="relative z-10 bg-midnight backdrop-blur-sm p-2">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Volume2 className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-white/60 uppercase tracking-wider">
                      Currently Displaying
                    </span>
                  </div>
                  {/* ORIGINAL LABEL DIV - pure DOM target, Three.js writes textContent */}
                  <h1
                    id="label"
                    className="text-3xl md:text-2xl font-black tracking-[0.15em] bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-400 bg-clip-text text-transparent min-h-[2rem]"
                  />
                  <div className="w-24 h-0.5 bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-500 rounded-full mx-auto mt-2 opacity-60" />
                  {DjangoData.length > 0 && (
                    <div className="mt-2 px-4">
                      <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
                          style={{ width: `${DjangoData.length > 0 ? ((wordIdx) / DjangoData.length) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  )}
                  {isDone && (
                    <p className="text-emerald-400 text-xs font-medium mt-1 tracking-wide">✓ Done</p>
                  )}
                </div>
              </div>

              {/* 3D Visualization Container - ORIGINAL CONTAINER DIV PRESERVED */}
              <div className="relative z-10 flex-1 bg-midnight backdrop-blur-sm">
                <div
                  id="container"
                  className="w-full h-120 relative overflow-hidden bg-midnight"
                  style={{ minHeight: "400px" }}
                >
                  {/* Loading state overlay - only shows when not initialized */}
                  {!isThreeJSInitialized && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-spin">
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-white/70 text-lg">
                          Initializing 3D Environment...
                        </p>
                        <div className="w-32 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mx-auto mt-3 animate-pulse" />
                      </div>
                    </div>
                  )}

                  {/* Ready state overlay - only shows when initialized but no data */}
                  {isThreeJSInitialized && !DjangoData && (
                    <div className="absolute inset-0 flex items-center justify-center z-10">
                      <div className="text-center">
                        <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce">
                          <Eye className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">
                          Ready to Visualize
                        </h3>
                        <p className="text-white/60 text-lg">
                          Enter text or upload a file to see sign language
                          animation
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-4">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-200" />
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse delay-400" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Floating particles effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
                <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-60" />
                <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-40 delay-1000" />
                <div className="absolute bottom-1/4 left-1/3 w-1 h-1 bg-pink-400 rounded-full animate-ping opacity-50 delay-500" />
                <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-emerald-400 rounded-full animate-ping opacity-60 delay-700" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
