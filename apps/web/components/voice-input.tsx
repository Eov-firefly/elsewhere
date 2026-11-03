"use client";
import { useEffect, useRef, useState } from "react";

type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<RecognitionResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type RecognitionConstructor = new () => Recognition;

export function VoiceInput({
  value,
  onChange,
  onRecordingChange,
}: {
  value: string;
  onChange: (text: string) => void;
  onRecordingChange?: (active: boolean) => void;
}) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [message, setMessage] = useState("");
  const recognition = useRef<Recognition | null>(null);
  useEffect(() => {
    const browser = window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    setAvailable(
      Boolean(browser.SpeechRecognition || browser.webkitSpeechRecognition) &&
        window.isSecureContext,
    );
    setLanguage(
      navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US",
    );
    return () => {
      const current = recognition.current;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        try {
          current.abort();
        } catch {}
      }
    };
  }, []);
  function start() {
    const browser = window as unknown as {
      SpeechRecognition?: RecognitionConstructor;
      webkitSpeechRecognition?: RecognitionConstructor;
    };
    const Constructor =
      browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor || recording) return;
    const current = new Constructor();
    recognition.current = current;
    const base = value.trim();
    let finalWords = "";
    let truncated = false;
    current.lang = language;
    current.continuous = false;
    current.interimResults = true;
    current.onresult = (event) => {
      const complete: string[] = [];
      const partial: string[] = [];
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal)
          complete.push(event.results[i][0].transcript.trim());
        else partial.push(event.results[i][0].transcript.trim());
      }
      const final = complete.join(language.startsWith("zh") ? "" : " ");
      const pending = partial.join(language.startsWith("zh") ? "" : " ");
      finalWords = final;
      if (final) {
        const combined = `${base}${base ? "\n" : ""}${final}`;
        truncated = combined.length > 3000;
        onChange(combined.slice(0, 3000));
        if (truncated)
          setMessage(
            "The 3,000-character limit was reached. Review your words before saving.",
          );
      }
      setInterim(pending);
    };
    current.onerror = (event) => {
      const errors: Record<string, string> = {
        "not-allowed":
          "Microphone access wasn’t granted. Allow it in your browser, or type instead.",
        "service-not-allowed":
          "Your browser’s speech service isn’t available. You can type instead.",
        "audio-capture": "No microphone is available. You can type instead.",
        network:
          "The speech service couldn’t connect. Try again, or type instead.",
        "no-speech":
          "No speech was detected. Try another moment, or type instead.",
      };
      if (event.error !== "aborted")
        setMessage(
          errors[event.error] ||
            "Voice input stopped. Your existing words are still here; you can type instead.",
        );
      setRecording(false);
      onRecordingChange?.(false);
      setInterim("");
    };
    current.onend = () => {
      setRecording(false);
      onRecordingChange?.(false);
      setInterim("");
      if (finalWords && !truncated)
        setMessage(
          "Your words are ready to review. Nothing is uploaded until you save.",
        );
    };
    setMessage("");
    setInterim("");
    setRecording(true);
    onRecordingChange?.(true);
    try {
      current.start();
    } catch {
      setRecording(false);
      onRecordingChange?.(false);
      setMessage("Couldn’t start voice input. Try again, or type instead.");
    }
  }
  return (
    <div className="voice-input">
      <div className="voice-input-heading">
        <span
          className={`voice-symbol ${recording ? "is-recording" : ""}`}
          aria-hidden
        >
          ◉
        </span>
        <div>
          <strong>
            {recording
              ? "Listening to this moment…"
              : "Say what’s on your mind."}
          </strong>
          <p>No need to turn it into an essay.</p>
        </div>
      </div>
      <div className="voice-controls">
        <button
          type="button"
          onClick={() => (recording ? recognition.current?.stop() : start())}
          disabled={available !== true}
          aria-pressed={recording}
        >
          {recording ? "Stop and review" : "Speak your reflection"}
        </button>
        <label>
          Speech language
          <select
            value={language}
            disabled={recording}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en-US">English</option>
            <option value="zh-CN">中文（普通话）</option>
          </select>
        </label>
      </div>
      {available === false && (
        <p className="voice-unavailable">
          Voice recognition isn’t available in this browser or connection. Try a
          supported browser over HTTPS, or use the text option below.
        </p>
      )}
      {recording && (
        <p className="voice-interim" aria-live="polite">
          {interim || "Take your time. Speak when you’re ready."}
        </p>
      )}
      <p className="voice-privacy">
        Your browser may send audio to its speech provider. Elsewhere doesn’t
        receive or store the recording. Only text you confirm and save is
        uploaded.
      </p>
      <p className="voice-status" aria-live="polite">
        {message}
      </p>
    </div>
  );
}
