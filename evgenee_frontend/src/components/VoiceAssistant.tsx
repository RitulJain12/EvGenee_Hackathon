import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Loader2, VolumeX } from "lucide-react";
import { socket } from "@/lib/socket";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { toast } from "sonner";

// Type definitions for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

import { useAuth } from "@/lib/auth";

export function VoiceAssistant() {
  const { isAuthed, isOwner } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [stations, setStations] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const threadIdRef = useRef<string | undefined>(undefined);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isAuthed) return;

    // Preload voices
    if ("speechSynthesis" in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }

    // Ensure socket is connected
    if (!socket.connected) {
      socket.connect();
    }

    // Setup Socket Listeners
    socket.on("ai:voice_response", (data: any) => {
      setIsProcessing(false);
      if (data.success) {
        const aiText = data.response;
        threadIdRef.current = data.threadId;
        setResponse(aiText);
        setStations(data.stations || []);
        speakResponse(aiText);

        // Redirect to bookings if a booking was created
        if (data.redirect && data.bookingId) {
          setTimeout(() => {
            toast.success("Redirecting to bookings for payment...");
            navigate({ to: "/bookings" });
          }, 3000); // Small delay to let the AI finish speaking
        }
      } else {
        setResponse(data.error || "Sorry, I encountered an error. Please try again.");
      }
    });

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "en-US";

      recognitionRef.current.onresult = (event: any) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        setIsListening(false);
        processVoiceInput(currentTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      socket.off("ai:voice_response");
    };
  }, [isAuthed, navigate]);

  useEffect(() => {
    if (!isAuthed) return;

    const storedLocation = sessionStorage.getItem("userLocation");
    if (storedLocation) {
      try {
        setUserLocation(JSON.parse(storedLocation));
      } catch {
        sessionStorage.removeItem("userLocation");
      }
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc: [number, number] = [position.coords.latitude, position.coords.longitude];
          setUserLocation(loc);
          sessionStorage.setItem("userLocation", JSON.stringify(loc));
        },
        () => {
          // location permission denied or unavailable
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
      );
    }
  }, [isAuthed]);

  const processVoiceInput = (text: string) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setResponse("");

    const payload: any = {
      message: text,
      threadId: threadIdRef.current,
    };

    if (userLocation) {
      payload.location = { lat: userLocation[0], lng: userLocation[1] };
    }

    socket.emit("ai:voice_chat", payload);
  };

  const speakResponse = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Cancel any ongoing speech
      const utterance = new SpeechSynthesisUtterance(text);

      const voices = window.speechSynthesis.getVoices();

      const preferredVoice =
        voices.find((v) => {
          const lowerName = v.name.toLowerCase();
          return (
            lowerName.includes("female") ||
            lowerName.includes("zira") ||
            lowerName.includes("samantha") ||
            lowerName.includes("google uk english female") ||
            lowerName.includes("aria") ||
            lowerName.includes("jenny") ||
            lowerName.includes("hazel")
          );
        }) ||
        voices.find((v) => v.lang.includes("en")) ||
        voices[0];

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopAudio = () => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        alert("Your browser does not support Speech Recognition.");
        return;
      }
      setTranscript("");
      setResponse("");
      setStations([]);
      setIsListening(true);
      setIsOpen(true);
      recognitionRef.current.start();
    }
  };

  const isAllowedPath = location.pathname === "/" || location.pathname === "/bookings";

  if (!isAuthed || !isAllowedPath || isOwner) return null;

  return (
    <div className="fixed bottom-32 right-4 md:bottom-32 md:right-8 z-[999] flex flex-col items-end gap-3 sm:gap-4 font-sans text-xs">
      <style>{`
        @keyframes voiceWave {
          0%, 100% { height: 6px; transform: scaleY(1); }
          50% { height: 24px; transform: scaleY(1.5); }
        }
        .voice-bar {
          width: 3px;
          border-radius: 1px;
          background-color: #C64F38;
          display: inline-block;
        }
        .voice-bar:nth-child(1) { animation: voiceWave 1.2s ease-in-out infinite; }
        .voice-bar:nth-child(2) { animation: voiceWave 1.2s ease-in-out infinite 0.15s; }
        .voice-bar:nth-child(3) { animation: voiceWave 1.2s ease-in-out infinite 0.3s; }
        .voice-bar:nth-child(4) { animation: voiceWave 1.2s ease-in-out infinite 0.45s; }
        .voice-bar:nth-child(5) { animation: voiceWave 1.2s ease-in-out infinite 0.6s; }
      `}</style>

      {isOpen && (
        <div className="bg-[#FAF9F6] border border-[#D1D1D1] shadow-[0_8px_32px_rgba(0,0,0,0.06)] rounded-[4px] p-5 w-[calc(100vw-2rem)] sm:w-[360px] animate-in slide-in-from-bottom-8 fade-in duration-300 relative overflow-hidden">
          {/* Subtle noise pattern overlay */}
          <div
            className="absolute inset-0 z-0 pointer-events-none opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundRepeat: "repeat",
              backgroundSize: "128px 128px",
            }}
          />

          <div className="relative z-10 flex justify-between items-center mb-4 pb-2 border-b border-[#EAEAEA]">
            <h3 className="font-bold text-xs flex items-center gap-2 text-[#242426] tracking-wider uppercase font-space" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C64F38] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C64F38]"></span>
              </span>
              EvGenee AI Assistant
            </h3>
            <div className="flex items-center gap-2">
              {isSpeaking && (
                <button
                  onClick={stopAudio}
                  title="Stop Audio"
                  className="text-[#C64F38] hover:text-[#FAF9F6] hover:bg-[#C64F38] p-1.5 rounded-[4px] bg-[#FBE8E4] border border-[#FBDED9] transition-all duration-200"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#4A6163] hover:text-[#242426] bg-[#FAF9F6] hover:bg-[#EAEAEA] border border-[#D1D1D1] h-6 w-6 flex items-center justify-center rounded-[4px] transition-all duration-200"
              >
                &times;
              </button>
            </div>
          </div>

          <div className="h-[280px] overflow-y-auto flex flex-col gap-4 text-xs pr-1 relative z-10">
            {userLocation && (
              <div className="self-start bg-[#EAF3F2] text-[#235047] border border-[#CFE5DE] rounded-[4px] px-3.5 py-2 max-w-[95%] text-[10px] font-medium">
                Using your current location for nearby station searches.
              </div>
            )}
            {transcript && (
              <div className="self-end bg-[#FBE8E4] text-[#5B1F13] border border-[#FBDED9] rounded-[4px] px-3.5 py-2 max-w-[85%] font-medium">
                {transcript}
              </div>
            )}

            {isProcessing && (
              <div className="self-start bg-white text-[#4A6163] rounded-[4px] px-4 py-2 flex items-center gap-2.5 border border-[#D1D1D1]">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-[#4A6163] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#4A6163] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-1.5 h-1.5 bg-[#4A6163] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="font-bold uppercase tracking-wider text-[9px] font-space">Thinking...</span>
              </div>
            )}

            {response && !isProcessing && (
              <div className="self-start bg-white text-[#242426] rounded-[4px] px-4 py-3 max-w-[95%] border border-[#D1D1D1] leading-relaxed font-medium">
                {response}
              </div>
            )}

            {stations.length > 0 && (
              <div className="space-y-3 mt-3">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.22em] font-bold text-[#4A6163]">
                  <span>Nearby station results</span>
                  {userLocation ? <span className="text-[#235047]">Using current location</span> : null}
                </div>
                {stations.map((st) => (
                  <div
                    key={st.id}
                    className={`bg-white border-l-4 ${
                      st.isCompatible
                        ? "border-l-[#4A6163] border-y border-r border-[#D1D1D1]"
                        : st.isOpen
                        ? "border-l-[#242426] border-y border-r border-[#D1D1D1]"
                        : "border-l-[#C64F38] border-y border-r border-[#D1D1D1] opacity-80"
                    } rounded-[4px] p-4 transition-all hover:bg-[#FAF9F6] duration-200`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <p className="font-bold text-xs text-[#242426] font-space uppercase" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                        {st.name}
                      </p>
                      {st.isOpen ? (
                        <span className="text-[9px] bg-[#E0EAEB] text-[#192829] px-2 py-0.5 rounded-[4px] border border-[#C6DCDD] font-bold tracking-wider font-space">
                          {st.availablePorts}/{st.totalPorts} Ports
                        </span>
                      ) : (
                        <span className="text-[9px] bg-[#FBE8E4] text-[#C64F38] px-2 py-0.5 rounded-[4px] border border-[#FBDED9] font-bold tracking-wider font-space">
                          CLOSED
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#4A6163] mb-3 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-[#D1D1D1]"></span>{" "}
                      {st.city}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {st.chargerTypes.map((type: string) => (
                        <span
                          key={type}
                          className={`text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-[4px] border ${
                            st.isCompatible
                              ? "bg-[#E0EAEB] border-[#C6DCDD] text-[#192829]"
                              : "bg-white border-[#D1D1D1] text-[#4A6163]"
                          } font-space`}
                        >
                          {type}
                        </span>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-[#EAEAEA] flex justify-between items-center text-[10px]">
                      <span className="text-[#4A6163] font-bold uppercase tracking-wider font-space">
                        ⚡ {st.chargingSpeed} kW Fast
                      </span>
                      <span className="font-bold text-[#C64F38] bg-[#FBE8E4] border border-[#FBDED9] px-2 py-0.5 rounded-[4px] font-space">
                        ₹{st.pricing?.[0]?.priceperKWh || 0}/kWh
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!transcript && !isProcessing && !response && (
              <div className="h-full flex flex-col items-center justify-center text-[#4A6163] text-center px-4 animate-in fade-in duration-300">
                <div className="w-12 h-12 mb-3 rounded-[4px] bg-[#E0EAEB] border border-[#C6DCDD] flex items-center justify-center text-[#4A6163]">
                  {isListening ? (
                    <div className="flex items-end gap-1 h-6">
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                      <span className="voice-bar" />
                    </div>
                  ) : (
                    <Mic className="w-5 h-5 text-[#4A6163]" />
                  )}
                </div>
                <p className="text-xs font-bold text-[#242426] mb-1 font-space uppercase tracking-wider">
                  {isListening ? "Voice Protocol Active" : "Editorial AI Assistance"}
                </p>
                <p className="text-[10px] text-[#4A6163]/70 font-medium">
                  {isListening
                    ? "Speak standard query commands..."
                    : "Tap mic and speak, e.g. 'Find a fast charging terminal'"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Premium Mic Button & Label */}
      <div className="flex flex-col items-center gap-1.5 group relative z-10">
        <button
          onClick={toggleListening}
          className={`relative w-12 h-12 rounded-[4px] border flex items-center justify-center transition-all duration-300 hover:-translate-y-0.5 shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
            isListening
              ? "bg-[#C64F38] border-[#C64F38] text-white"
              : "bg-[#242426] border-[#242426] text-white hover:bg-[#343436]"
          }`}
        >
          {isListening && (
            <span className="absolute inset-0 rounded-[4px] animate-ping bg-[#C64F38]/20 opacity-70"></span>
          )}
          {isListening ? (
            <MicOff className="w-5 h-5 relative z-10" />
          ) : (
            <Mic className="w-5 h-5 relative z-10 group-hover:scale-105 transition-transform duration-300" />
          )}
        </button>

        <span
          className="text-[8px] font-bold tracking-[0.25em] uppercase text-[#4A6163] transition-all duration-300 group-hover:text-[#C64F38]"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {isListening ? "LISTENING" : "AI VOICE"}
        </span>
      </div>
    </div>
  );
}
