"use client";
import { moods, states, type Mood, type WatchingState } from "@/lib/journal";
import { VoiceInput } from "./voice-input";
import { useState } from "react";
export function ReflectionFields({
  body,
  state,
  mood,
  onBody,
  onState,
  onMood,
  id = "reflection",
  onRecordingChange,
}: {
  body: string;
  state: WatchingState;
  mood: Mood | "";
  onBody: (value: string) => void;
  onState: (value: WatchingState) => void;
  onMood: (value: Mood | "") => void;
  id?: string;
  onRecordingChange?: (active: boolean) => void;
}) {
  const [recording, setRecording] = useState(false);
  return (
    <>
      <VoiceInput
        value={body}
        onChange={onBody}
        onRecordingChange={(active) => {
          setRecording(active);
          onRecordingChange?.(active);
        }}
      />
      {body && (
        <div className="transcript-preview">
          <span className="eyebrow">YOUR WORDS · NOT SAVED YET</span>
          <p>{body}</p>
        </div>
      )}
      <details className="text-input-alternative">
        <summary>Edit transcript or type instead</summary>
        <label htmlFor={`${id}-body`}>
          Your reflection
          <textarea
            id={`${id}-body`}
            value={body}
            onChange={(e) => onBody(e.target.value)}
            disabled={recording}
            maxLength={3000}
            placeholder="A thought, a feeling, a question. It doesn’t have to be a lesson."
          />
        </label>
      </details>
      <div className="reflection-form-meta">
        <span>{body.length} / 3000</span>
        <span>There’s no right way to feel.</span>
      </div>
      <div className="form-row">
        <label>
          Where you are
          <select
            disabled={recording}
            value={state}
            onChange={(e) => onState(e.target.value as WatchingState)}
          >
            {Object.entries(states).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          A feeling, if you like
          <select
            disabled={recording}
            value={mood}
            onChange={(e) => onMood(e.target.value as Mood | "")}
          >
            <option value="">No label</option>
            {Object.entries(moods).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <small className="journal-note">
        Your viewing status is your own description, not a playback measurement.
      </small>
    </>
  );
}
