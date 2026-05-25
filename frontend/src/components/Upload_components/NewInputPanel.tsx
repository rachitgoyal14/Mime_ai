"use client";

import { inputDataToFormData } from "@/utilities/Functions";
import axios from "axios";
import { FileText, Loader2, Mic, Send, Sparkles, Upload, UploadCloud, Video } from "lucide-react";
import { useRef, useState } from "react";

interface InputData {
  category? : string,
  text?: string,
  file?: File,
}

interface ChildProps {
  setData: (data: string[]) => void;
}

//@ts-expect-check
export default function NewInputPanel({setData}: ChildProps) {
  // data will be passed as a prop

  const textInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inputData, setInputData] = useState<InputData>({});
  const [isLoading, setIsLoading] = useState(false);

  const categories = [
    { value: "text", label: "Text", icon: FileText, color: "from-blue-500 to-cyan-500" },
    { value: "audio", label: "Audio", icon: Mic, color: "from-purple-500 to-pink-500" },
    { value: "video", label: "Video", icon: Video, color: "from-green-500 to-emerald-500" },
    { value: "file", label: "File", icon: Upload, color: "from-orange-500 to-red-500" },
  ];

  function handleCategorySelect(category: string) {
    setInputData({category: category})
  }

  function handleTextSubmit() { 
    if(textInputRef.current) {
      const text: string = textInputRef.current.value.trim();

      const updatedData = { ...inputData, text: text };

      setInputData(updatedData)
      console.log(updatedData)


      // send it to backend and roll it up to parent
      sendToBackend(updatedData);
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        console.log(files);

        
        const updatedData = { ...inputData, file: files[0] };

        setInputData(updatedData)

        console.log(updatedData);

        sendToBackend(updatedData);                     // need to send data to backend
      }
    };

  const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleTextSubmit();
      }
    };

  const sendToBackend = async (data: InputData) => {
    try {
      console.log(data);
      setIsLoading(true);

      const formData = inputDataToFormData(data)

      // const formData = new FormData();

      // Object.entries(data).forEach(([key, value]) => {
      //   if (value !== undefined && value !== null) {
      //     // value must be string or Blob (File extends Blob)
      //     formData.append(key, value as string | Blob);
      //   }
      // });

      console.log("Form Data: "+ formData)

      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await axios.post(
        `${backendUrl}/api/process/`,
        formData
      );

      console.log(response)
      console.log("Backend response:", response.data);
      setData(response.data.gloss);
    } catch (error) {
      console.error("Error sending word to backend:", error);
    }finally {
      setIsLoading(false);
    }
  }  

return (
    <div className="h-full max-h-164 bg-white/5 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/10 relative overflow-hidden">
      {/* Animated background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/5 rounded-3xl" />
      
      {/* Header */}
      <div className="relative z-10 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-6 text-white" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Start Communicating</h2>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full mt-1" />
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="relative z-10 mb-4">
        <h3 className="text-white/90 font-semibold mb-3 text-sm uppercase tracking-wider flex items-center gap-2">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full" />
          Select Input Type
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {categories.map((item, index) => (
            <button
              key={item.value}
              onClick={() => handleCategorySelect(item.value)}
              className={`group relative p-1 rounded-2xl border transition-all duration-500 hover:scale-105 hover:shadow-2xl transform-gpu ${
                inputData?.category === item.value
                  ? 'bg-gradient-to-br from-white/20 to-white/5 border-white/30 shadow-2xl scale-105'
                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex flex-col items-center gap-1 p-1 ">
                <div className={`relative p-4 rounded-xl transition-all duration-500 ${
                  inputData?.category === item.value
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg scale-90`
                    : 'bg-white/10 text-white/70 group-hover:bg-white/20 group-hover:text-white group-hover:scale-100'
                }`}>
                  <item.icon className="w-5 h-5" />
                  {inputData?.category === item.value && (
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
                  )}
                </div>
                <span className={`font-medium text-sm transition-all duration-300 ${
                  inputData?.category === item.value
                    ? 'text-white scale-105'
                    : 'text-white/70 group-hover:text-white'
                }`}>
                  {item.label}
                </span>
              </div>
              
              {/* Selection indicator */}
              {inputData?.category === item.value && (
                <div className="absolute inset-0 rounded-2xl border-2 border-blue-400/50 animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Text Input */}
      {inputData?.category === "text" && (
        <div className="relative z-10 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-1 shadow-2xl">
            <textarea
              ref={textInputRef}
              placeholder="Type your message here... (Press Enter to submit)"
              className="w-full h-50 px-6 py-4 bg-transparent text-white placeholder-white/50 focus:outline-none resize-none rounded-xl text-lg leading-relaxed"
              onKeyDown={handleKeyPress}
              disabled={isLoading}
            />
            <div className="flex justify-between items-center p-3">
              <div className="text-white/40 text-xs">
                {/* {isLoading ? "Processing..." : "Ready to translate"} */}
              </div>
              <button
                onClick={handleTextSubmit}
                disabled={isLoading}
                className="group flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-8 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                )}
                {isLoading ? "Processing" : "Translate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Upload */}
      {inputData && (inputData.category === "audio" || inputData.category === "video" || inputData.category === "file") && (
        <div className="relative z-10 animate-in slide-in-from-top-4 duration-500">
          <div 
            className="bg-white/5 backdrop-blur-sm rounded-2xl border-2 border-dashed border-white/30 p-10 text-center hover:border-white/50 hover:bg-white/10 transition-all duration-500 group cursor-pointer relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative z-10 flex flex-col items-center gap-1">
              <div className="relative p-6 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full group-hover:scale-110 transition-transform duration-500">
                <UploadCloud className="w-10 h-10 text-white/80" />
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/20 to-purple-400/20 animate-ping" />
              </div>
              
              <div>
                <p className="text-white font-semibold mb-1 text-xl">
                  Drop your {inputData.category} here
                </p>
                <p className="text-white/60 text-sm mb-2 leading-relaxed">
                  or click to browse your files
                  <br />
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  disabled={isLoading}
                  className="group/btn flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-500 disabled:to-gray-600 text-white px-8 py-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-xl disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileText className="w-5 h-5 group-hover/btn:rotate-12 transition-transform duration-300" />
                  )}
                  {isLoading ? "Processing" : "Browse Files"}
                </button>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept={
                  inputData.category === "audio" ? "audio/*" :
                  inputData.category === "video" ? "video/*" : "*/*"
                }
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black/20 backdrop-blur-sm rounded-3xl flex items-center justify-center z-50">
          {/* <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex items-center gap-4"> */}
            <Loader2 className="w-6 h-6 text-white animate-spin" />
            <span className="text-white font-medium">Processing your input...</span>
          {/* </div> */}
        </div>
      )}
    </div>
  );
}
