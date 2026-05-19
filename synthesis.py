import sys
import os
import json
import wave
import struct
import re
import math

try:
    from g2p_en import G2p
    g2p_engine = G2p()
except:
    g2p_engine = None

VOWELS = {'A', '{', '@', 'O', 'aU', 'aI', 'OI', 'E', 'e', 'I', 'i', 'U', 'u', '3'}

ARPABET_TO_TETO = {
    'AA': 'A', 'AE': '{', 'AH': '@', 'AO': 'O', 'AW': 'aU', 'AY': 'aI',
    'B': 'b', 'CH': 'tS', 'D': 'd', 'DH': 'D', 'EH': 'E', 'ER': '3',
    'EY': 'eI', 'F': 'f', 'G': 'g', 'HH': 'h', 'IH': 'I', 'IY': 'i',
    'JH': 'dZ', 'K': 'k', 'L': 'l', 'M': 'm', 'N': 'n', 'NG': 'N',
    'OW': 'oU', 'OY': 'OI', 'P': 'p', 'R': 'r', 'S': 's', 'SH': 'S',
    'T': 't', 'TH': 'T', 'UH': 'U', 'UW': 'u', 'V': 'v', 'W': 'w',
    'Y': 'j', 'Z': 'z', 'ZH': 'Z'
}

def get_phonemes(text):
    if any('\u3040' <= c <= '\u30ff' for c in text): return [c for c in text if '\u3040' <= c <= '\u30ff']
    if not g2p_engine: return []
    try: raw = g2p_engine(text)
    except: return []
    phones = [ARPABET_TO_TETO.get(re.sub(r'\d+', '', p), p) for p in raw if p != ' ']
    if not phones: return []
    chain = [f"- {phones[0]}"]
    for i in range(len(phones) - 1):
        p1, p2 = phones[i], phones[i+1]
        if p2 in VOWELS: chain.append(f"{p1}{p2}")
        else: chain.append(f"{p1} {p2}")
    chain.append(f"{phones[-1]} -")
    return chain

def load_oto(vb_path):
    oto_map = {}
    oto_path = os.path.join(vb_path, 'oto.ini')
    if not os.path.exists(oto_path): return oto_map
    with open(oto_path, 'r', encoding='utf-8', errors='ignore') as f:
        for line in f:
            if '=' not in line: continue
            f_part, rest = line.split('=')
            p = rest.split(',')
            alias = p[0].strip()
            oto_map[alias] = {
                'wav': os.path.join(os.path.dirname(oto_path), f_part),
                'off': float(p[1]) if p[1] else 0,
                'cons': float(p[2]) if len(p) > 2 and p[2] else 0,
                'cut': float(p[3]) if len(p) > 3 and p[3] else 0,
                'ov': float(p[5]) if len(p) > 5 and p[5] else 0
            }
    return oto_map

def resample(data, ratio):
    if ratio == 1.0: return data
    samples = [struct.unpack('<h', data[i:i+2])[0] for i in range(0, len(data), 2)]
    out_len = int(len(samples) / ratio)
    out = []
    for i in range(out_len):
        idx = i * ratio
        idx_f = int(idx)
        alpha = idx - idx_f
        s = int(samples[idx_f] * (1-alpha) + samples[min(idx_f+1, len(samples)-1)] * alpha)
        out.append(s)
    return b''.join([struct.pack('<h', max(-32768, min(32767, s))) for s in out])

def normalize(data):
    if not data: return data
    samples = [struct.unpack('<h', data[i:i+2])[0] for i in range(0, len(data), 2)]
    peak = max(abs(s) for s in samples) if samples else 0
    if peak == 0: return data
    gain = 28000 / peak
    return b''.join([struct.pack('<h', int(s * gain)) for s in samples])

def crossfade(d1, d2, ov):
    if not d1 or not d2: return d1 + d2
    ov = max(0, min(ov, len(d1)//2, len(d2)//2))
    if ov == 0: return d1 + d2
    res = d1[:-ov*2]
    for i in range(ov):
        # Equal power (sine) crossfade
        alpha = i / float(ov)
        gain1 = math.cos(alpha * math.pi / 2)
        gain2 = math.sin(alpha * math.pi / 2)
        s1 = struct.unpack('<h', d1[len(d1)-ov*2+i*2:len(d1)-ov*2+i*2+2])[0]
        s2 = struct.unpack('<h', d2[i*2:i*2+2])[0]
        res += struct.pack('<h', int(s1 * gain1 + s2 * gain2))
    return res + d2[ov*2:]

def synthesize(text, vb_path, out_path, speed, pitch):
    try:
        oto = load_oto(vb_path)
        phones = get_phonemes(text)
        out_params, final = None, b''
        ratio = speed * pitch
        for p in phones:
            entry = oto.get(p)
            if not entry:
                v = next((v for v in VOWELS if v in p), None)
                entry = oto.get(p.lower()) or oto.get(p.upper()) or (oto.get(v) if v else None)
            if entry and os.path.exists(entry['wav']):
                with wave.open(entry['wav'], 'rb') as w:
                    out_params = w.getparams() if not out_params else out_params
                    sr = out_params.framerate
                    start = int((entry['off'] / 1000.0) * sr)
                    if entry['cut'] < 0: end = w.getnframes() + int((entry['cut']/1000.0)*sr)
                    elif entry['cut'] > 0: end = int((entry['cut']/1000.0)*sr)
                    else: end = start + int((entry['cons'] / 1000.0) * sr) + 1500 # 30ms buffer
                    
                    w.setpos(max(0, min(start, w.getnframes())))
                    seg = w.readframes(max(0, min(end or w.getnframes(), w.getnframes()) - w.tell()))
                    seg = normalize(resample(seg, ratio))
                    ov = int(((entry['ov'] + 80) / 1000.0) * sr / ratio)
                    final = crossfade(final, seg, ov)
        if final:
            with wave.open(out_path, 'wb') as out:
                out.setparams(out_params); out.writeframes(final)
    except Exception as e: print(f"Error: {e}"); sys.exit(1)

def synthesize_sequence(notes, vb_path, out_path, speed_mult, pitch_mult, base_freq):
    try:
        oto = load_oto(vb_path)
        sample_rate = 44100
        out_params = None
        
        # Get actual sample rate from first voice file
        for entry in oto.values():
            if os.path.exists(entry['wav']):
                with wave.open(entry['wav'], 'rb') as w:
                    out_params = w.getparams()
                    sample_rate = out_params.framerate
                    break
        if not out_params:
            print("Error: No voicebank WAVs found")
            sys.exit(1)
            
        # Determine total duration
        max_t = 0.0
        for n in notes:
            t_end = n['time'] + n.get('duration', 1.0)
            if t_end > max_t: max_t = t_end
            
        # Create silent canvas
        total_samples = int((max_t + 2.0) * sample_rate)
        master_samples = [0.0] * total_samples
        
        for n in notes:
            lyric = n['lyric']
            note_time = n['time']
            note_duration = n.get('duration', 0.5)
            note_freq = n['freq']
            
            # Compute pitch ratio relative to base frequency
            pitch_ratio = (note_freq / base_freq) * pitch_mult
            ratio = speed_mult * pitch_ratio
            
            phones = get_phonemes(lyric)
            final = b''
            for p in phones:
                entry = oto.get(p)
                if not entry:
                    v = next((v for v in VOWELS if v in p), None)
                    entry = oto.get(p.lower()) or oto.get(p.upper()) or (oto.get(v) if v else None)
                if entry and os.path.exists(entry['wav']):
                    with wave.open(entry['wav'], 'rb') as w:
                        sr = w.getframerate()
                        start = int((entry['off'] / 1000.0) * sr)
                        if entry['cut'] < 0: end = w.getnframes() + int((entry['cut']/1000.0)*sr)
                        elif entry['cut'] > 0: end = int((entry['cut']/1000.0)*sr)
                        else: end = start + int((entry['cons'] / 1000.0) * sr) + 1500
                        
                        w.setpos(max(0, min(start, w.getnframes())))
                        seg = w.readframes(max(0, min(end or w.getnframes(), w.getnframes()) - w.tell()))
                        seg = normalize(resample(seg, ratio))
                        ov = int(((entry['ov'] + 80) / 1000.0) * sr / ratio)
                        final = crossfade(final, seg, ov)
            
            if final:
                # Convert bytes to floats for mixing
                samples = [struct.unpack('<h', final[i:i+2])[0] for i in range(0, len(final), 2)]
                start_sample = int(note_time * sample_rate)
                max_samples = int(note_duration * sample_rate)
                
                # Trim if too long
                if len(samples) > max_samples:
                    samples = samples[:max_samples]
                    
                # Mix into master
                for idx, s in enumerate(samples):
                    m_idx = start_sample + idx
                    if m_idx < len(master_samples):
                        master_samples[m_idx] += s
                        
        # Normalize and clip to 16-bit int range
        peak = max(abs(s) for s in master_samples) if master_samples else 0
        gain = 1.0
        if peak > 32767:
            gain = 30000.0 / peak
            
        out_bytes = b''
        for s in master_samples:
            val = int(s * gain)
            val = max(-32768, min(32767, val))
            out_bytes += struct.pack('<h', val)
            
        with wave.open(out_path, 'wb') as out:
            out.setparams((out_params.nchannels, 2, sample_rate, len(out_bytes)//(2*out_params.nchannels), 'NONE', 'not compressed'))
            out.writeframes(out_bytes)
    except Exception as e:
        print(f"Sequence Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    with open(sys.argv[1], 'r', encoding='utf-8') as f: d = json.load(f)
    if 'notes' in d:
        synthesize_sequence(d['notes'], d['vb_path'], d['out_path'], d.get('speed', 1.0), d.get('pitch', 1.0), d.get('base_freq', 261.63))
    else:
        synthesize(d['text'], d['vb_path'], d['out_path'], d.get('speed', 1.0), d.get('pitch', 1.0))

