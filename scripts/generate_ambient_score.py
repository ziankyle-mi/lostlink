import numpy as np
import wave
import os

def create_ambient_track(filename="assets/ambient_bed.wav", duration=58.0, sr=44100):
    total_samples = int(duration * sr)
    t = np.linspace(0, duration, total_samples, endpoint=False)
    
    # Stereo buffers
    left = np.zeros(total_samples, dtype=np.float32)
    right = np.zeros(total_samples, dtype=np.float32)

    # Chords progression (frequencies in Hz):
    # Fmaj9 -> Cmaj9 -> Am9 -> Fmaj7 -> Cmaj9 -> Am9 -> Cmaj (resolving)
    chord_segments = [
        (0.0, 7.5, [87.31, 174.61, 220.00, 261.63, 329.63, 392.00], [523.25, 659.25, 783.99]),
        (7.5, 15.0, [65.41, 130.81, 164.81, 196.00, 246.94, 293.66], [587.33, 659.25, 987.77]),
        (15.0, 23.0, [55.00, 110.00, 130.81, 164.81, 196.00, 246.94], [493.88, 523.25, 659.25]),
        (23.0, 31.0, [87.31, 130.81, 174.61, 220.00, 261.63, 329.63], [523.25, 659.25, 1046.50]),
        (31.0, 40.0, [65.41, 130.81, 164.81, 196.00, 246.94, 293.66], [587.33, 659.25, 987.77]),
        (40.0, 49.0, [55.00, 110.00, 130.81, 164.81, 196.00, 246.94], [493.88, 523.25, 659.25]),
        (49.0, 58.0, [65.41, 130.81, 164.81, 196.00, 261.63, 329.63], [523.25, 659.25, 783.99]),
    ]
    
    # 1. GENERATE LUSH ANALOG SYNTH PADS
    pad_l = np.zeros(total_samples, dtype=np.float32)
    pad_r = np.zeros(total_samples, dtype=np.float32)
    
    for seg_start, seg_end, freqs, _ in chord_segments:
        idx_start = int(seg_start * sr)
        idx_end = int(seg_end * sr)
        seg_t = t[idx_start:idx_end]
        seg_len = idx_end - idx_start
        
        # Envelope with crossfade
        env = np.ones(seg_len, dtype=np.float32)
        fade_len = int(0.8 * sr)
        fade_in = np.sin(np.linspace(0, np.pi/2, fade_len))**2
        fade_out = np.cos(np.linspace(0, np.pi/2, fade_len))**2
        env[:fade_len] *= fade_in
        env[-fade_len:] *= fade_out
        
        for f in freqs:
            # Detuned oscillators for lush warmth
            detune = 0.003
            w1 = 2 * np.pi * f
            w2 = 2 * np.pi * f * (1 + detune)
            w3 = 2 * np.pi * f * (1 - detune)
            
            # Warm saw/tri blend
            osc1 = 0.6 * np.sin(w1 * seg_t) + 0.25 * np.sin(2 * w1 * seg_t) + 0.1 * np.sin(3 * w1 * seg_t)
            osc2 = 0.5 * np.sin(w2 * seg_t) + 0.2 * np.sin(2 * w2 * seg_t)
            osc3 = 0.5 * np.sin(w3 * seg_t) + 0.2 * np.sin(2 * w3 * seg_t)
            
            # Pan slightly across stereo field
            pan = (np.sin(f) * 0.4) + 0.5 # 0.1 to 0.9
            amp = (1.0 / np.sqrt(f / 60.0)) * 0.08
            
            pad_l[idx_start:idx_end] += (osc1 + osc2) * amp * pan * env
            pad_r[idx_start:idx_end] += (osc1 + osc3) * amp * (1.0 - pan) * env

    # 2. DELICATE HIGH ARPEGGIO / GLASS BELLS (Tech aesthetic)
    bell_l = np.zeros(total_samples, dtype=np.float32)
    bell_r = np.zeros(total_samples, dtype=np.float32)
    
    bpm = 116.0
    beat_dur = 60.0 / bpm
    step_dur = beat_dur / 2.0  # eighth notes
    num_steps = int(duration / step_dur)
    
    for step in range(num_steps):
        step_time = step * step_dur
        # Determine chord
        active_arps = chord_segments[0][3]
        for s_start, s_end, _, arps in chord_segments:
            if s_start <= step_time < s_end:
                active_arps = arps
                break
                
        # Select pitch in cycling pattern
        pitch = active_arps[step % len(active_arps)]
        if (step % 4) == 0:
            pitch *= 2.0  # high sparkle
            
        step_idx = int(step_time * sr)
        note_len = int(1.2 * sr) # ring out
        end_idx = min(total_samples, step_idx + note_len)
        actual_len = end_idx - step_idx
        
        if actual_len > 0:
            note_t = np.linspace(0, actual_len / sr, actual_len, endpoint=False)
            decay = np.exp(-note_t * 6.5) # fast smooth decay
            bell_osc = np.sin(2 * np.pi * pitch * note_t) + 0.3 * np.sin(2 * np.pi * pitch * 2 * note_t)
            
            # Alternate stereo panning
            pan_val = 0.3 if (step % 2 == 0) else 0.7
            gain = 0.045
            
            bell_l[step_idx:end_idx] += bell_osc * decay * gain * pan_val
            bell_r[step_idx:end_idx] += bell_osc * decay * gain * (1.0 - pan_val)

    # 3. GENTLE SUB PULSE (Rhythmic heartbeat, like an Apple product launch)
    beat_samples = int(beat_dur * sr)
    num_beats = int(duration / beat_dur)
    pulse_l = np.zeros(total_samples, dtype=np.float32)
    pulse_r = np.zeros(total_samples, dtype=np.float32)
    
    for beat in range(num_beats):
        b_time = beat * beat_dur
        # Bring in beat starting after 6s (hook) until 51s (before outro fade)
        if b_time < 6.0 or b_time > 51.0:
            continue
            
        b_idx = int(b_time * sr)
        k_len = int(0.28 * sr)
        end_k = min(total_samples, b_idx + k_len)
        actual_k = end_k - b_idx
        
        if actual_k > 0:
            k_t = np.linspace(0, actual_k / sr, actual_k, endpoint=False)
            # Pitch drop from 110Hz to 45Hz
            k_pitch = 45.0 + 65.0 * np.exp(-k_t * 35.0)
            k_phase = 2 * np.pi * np.cumsum(k_pitch) / sr
            k_env = np.exp(-k_t * 12.0)
            kick = np.sin(k_phase) * k_env * 0.12
            
            pulse_l[b_idx:end_k] += kick
            pulse_r[b_idx:end_k] += kick

    # 4. COMBINE AND MASTER
    left = pad_l + bell_l + pulse_l
    right = pad_r + bell_r + pulse_r

    # Reverb delay simulation (spaciousness)
    delay_samples = int(0.22 * sr)
    left[delay_samples:] += 0.25 * right[:-delay_samples]
    right[delay_samples:] += 0.25 * left[:-delay_samples]

    # Master Fade In (1.2s) and Fade Out (3.0s)
    fade_in_len = int(1.2 * sr)
    fade_out_len = int(3.0 * sr)
    master_env = np.ones(total_samples, dtype=np.float32)
    master_env[:fade_in_len] = np.sin(np.linspace(0, np.pi/2, fade_in_len))**2
    master_env[-fade_out_len:] = np.cos(np.linspace(0, np.pi/2, fade_out_len))**2

    left *= master_env
    right *= master_env

    # Normalize to -1.5 dB peak
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)), 1e-6)
    target_peak = 0.85
    left = (left / peak) * target_peak
    right = (right / peak) * target_peak

    # Convert to 16-bit PCM
    left_int16 = (left * 32767).astype(np.int16)
    right_int16 = (right * 32767).astype(np.int16)

    # Interleave stereo
    stereo = np.empty((total_samples * 2,), dtype=np.int16)
    stereo[0::2] = left_int16
    stereo[1::2] = right_int16

    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with wave.open(filename, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(stereo.tobytes())

    print(f"Generated ambient soundtrack: {filename} ({os.path.getsize(filename)} bytes)")

create_ambient_track("assets/ambient_bed.wav", duration=58.0)
create_ambient_track("public/assets/ambient_bed.wav", duration=58.0)
