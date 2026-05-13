const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const uploadLarge = multer({ dest: 'uploads/' });
const uploadSmall = multer({ dest: 'uploads/', limits: { fileSize: 100 * 1024 * 1024 } });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PARSER_DIR = path.join(__dirname, 'gpmf-parser-main', 'demo');

function binName(name) {
    if (process.platform === 'win32') return name + '.exe';
    if (process.platform === 'linux') return name + '_linux';
    return name;
}

const PARSER_BIN = path.join(PARSER_DIR, binName('gps_parser'));
const OFFSETS_BIN = path.join(PARSER_DIR, binName('mp4_offsets'));
const GPMF_PARSER_BIN = path.join(PARSER_DIR, binName('gps_parser_gpmf'));
const TRACKS_FILE = path.join(__dirname, 'tracks.json');

function spawnBin(name, args) {
    const bin = binName(name);
    return spawn(process.platform === 'win32' ? bin : './' + bin, args, { cwd: PARSER_DIR });
}

function spawnWithTimeout(name, args, timeoutMs) {
    return new Promise((resolve, reject) => {
        let settled = false;
        const proc = spawnBin(name, args);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                proc.kill();
                reject(new Error(`${name} timed out after ${timeoutMs}ms`));
            }
        }, timeoutMs);

        proc.on('error', (err) => {
            if (!settled) {
                settled = true;
                clearTimeout(timer);
                reject(new Error(`Failed to spawn ${name}: ${err.message}`));
            }
        });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (settled) return;
            settled = true;

            if (code !== 0) {
                reject(new Error(`${name} exited with code ${code}: ${stderr}`));
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            } catch (e) {
                reject(new Error(`Failed to parse ${name} output`));
            }
        });
    });
}

function parseTelemetry(inputPath) {
    const absInputPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
    return spawnWithTimeout('gps_parser', [absInputPath, '-json'], 60000);
}

app.post('/api/extract', uploadLarge.single('video'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No video file uploaded' });
    }
    
    const inputPath = req.file.path;
    
    try {
        const telemetry = await parseTelemetry(inputPath);
        res.json(telemetry);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlink(inputPath, () => {});
    }
});

app.post('/api/analyze-moov', uploadSmall.single('moov'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No moov file uploaded' });
    }

    const moovUploadPath = path.resolve(req.file.path);
    const mp4Path = moovUploadPath + '.mp4';

    try {
        const moovData = fs.readFileSync(moovUploadPath);

        const ftyp = Buffer.from([
            0x00, 0x00, 0x00, 0x14,
            0x66, 0x74, 0x79, 0x70,
            0x69, 0x73, 0x6F, 0x6D,
            0x00, 0x00, 0x00, 0x01,
            0x69, 0x73, 0x6F, 0x6D
        ]);

        const mdatHeader = Buffer.from([
            0x00, 0x00, 0x00, 0x08,
            0x6D, 0x64, 0x61, 0x74
        ]);

        const mp4Buf = Buffer.concat([ftyp, moovData, mdatHeader]);
        fs.writeFileSync(mp4Path, mp4Buf);

        const result = await spawnWithTimeout('mp4_offsets', [mp4Path], 30000);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlink(moovUploadPath, () => {});
        if (fs.existsSync(mp4Path)) fs.unlink(mp4Path, () => {});
    }
});

app.post('/api/extract-gpmf', uploadSmall.fields([{ name: 'gpmf_data', maxCount: 1 }, { name: 'metadata', maxCount: 1 }]), async (req, res) => {
    if (!req.files || !req.files.gpmf_data || !req.files.metadata) {
        return res.status(400).json({ error: 'Missing gpmf_data or metadata' });
    }

    const gpmfPath = path.resolve(req.files.gpmf_data[0].path);
    const metaPath = path.resolve(req.files.metadata[0].path);

    try {
        const result = await spawnWithTimeout('gps_parser_gpmf', [metaPath, gpmfPath], 30000);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        fs.unlink(gpmfPath, () => {});
        fs.unlink(metaPath, () => {});
    }
});

const TRACKS_READ_ONLY = process.env.TRACKS_READ_ONLY === 'true';

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', tracksReadOnly: TRACKS_READ_ONLY });
});

app.get('/api/tracks', (req, res) => {
    fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') return res.json({ tracks: [] });
            return res.status(500).json({ error: 'Failed to read tracks' });
        }
        try {
            const tracks = JSON.parse(data);
            res.json(tracks);
        } catch (e) {
            res.json({ tracks: [] });
        }
    });
});

app.post('/api/tracks', (req, res) => {
    if (TRACKS_READ_ONLY) {
        return res.status(403).json({ error: 'Track writes are disabled on this server' });
    }
    const newTrack = req.body;
    if (!newTrack || !newTrack.name || !newTrack.sfLine || !newTrack.sfLine.start || !newTrack.sfLine.end) {
        return res.status(400).json({ error: 'Invalid track data' });
    }
    newTrack.id = Date.now().toString();
    newTrack.sectorLines = validateSectorLines(newTrack.sectorLines);

    fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
        let tracks = [];
        if (!err && data) {
            try { tracks = JSON.parse(data).tracks || []; } catch(e) {}
        }
        tracks.push(newTrack);
        fs.writeFile(TRACKS_FILE, JSON.stringify({ tracks }, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to save track' });
            res.json({ success: true, track: newTrack });
        });
    });
});

app.put('/api/tracks/:id', (req, res) => {
    if (TRACKS_READ_ONLY) {
        return res.status(403).json({ error: 'Track writes are disabled on this server' });
    }
    const trackId = req.params.id;
    const sectorLines = req.body.sectorLines;

    if (!Array.isArray(sectorLines)) {
        return res.status(400).json({ error: 'sectorLines must be an array' });
    }
    if (sectorLines.length > 2) {
        return res.status(400).json({ error: 'Maximum 2 sector lines allowed' });
    }
    const validated = validateSectorLines(sectorLines);

    fs.readFile(TRACKS_FILE, 'utf8', (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') return res.status(404).json({ error: 'Track not found' });
            return res.status(500).json({ error: 'Failed to read tracks' });
        }
        let tracks;
        try { tracks = JSON.parse(data).tracks || []; } catch(e) { tracks = []; }
        const index = tracks.findIndex(t => t.id === trackId);
        if (index === -1) return res.status(404).json({ error: 'Track not found' });
        tracks[index].sectorLines = validated;
        fs.writeFile(TRACKS_FILE, JSON.stringify({ tracks }, null, 2), (err) => {
            if (err) return res.status(500).json({ error: 'Failed to save track' });
            res.json({ success: true, track: tracks[index] });
        });
    });
});

function validateSectorLines(sectorLines) {
    if (!Array.isArray(sectorLines)) return [];
    return sectorLines.filter(line =>
        line && line.start && line.end &&
        typeof line.start.lat === 'number' && typeof line.start.lon === 'number' &&
        typeof line.end.lat === 'number' && typeof line.end.lon === 'number'
    ).slice(0, 2).map(line => ({
        start: { lat: line.start.lat, lon: line.start.lon },
        end: { lat: line.end.lat, lon: line.end.lon }
    }));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Telemetry server running on http://localhost:${PORT}`);
});
