const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PARSER_DIR = path.join(__dirname, 'gpmf-parser-main', 'demo');
const PARSER_BIN = path.join(PARSER_DIR, 'gps_parser');
const TRACKS_FILE = path.join(__dirname, 'tracks.json');

function parseTelemetry(inputPath) {
    return new Promise((resolve, reject) => {
        const absInputPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(inputPath);
        const proc = spawn('./gps_parser', [absInputPath, '-json'], {
            cwd: PARSER_DIR
        });
        
        let stdout = '';
        let stderr = '';
        
        proc.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        proc.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        proc.on('close', (code) => {
            if (code !== 0) {
                console.error('Parser error:', stderr, 'code:', code);
                reject(new Error(`Parser exited with code ${code}: ${stderr}`));
                return;
            }
            
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (e) {
                console.error('JSON parse error. stdout:', stdout.substring(0, 500));
                reject(new Error('Failed to parse parser output'));
            }
        });
    });
}

app.post('/api/extract', upload.single('video'), async (req, res) => {
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

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
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
    const newTrack = req.body;
    if (!newTrack || !newTrack.name || !newTrack.sfLine || !newTrack.sfLine.start || !newTrack.sfLine.end) {
        return res.status(400).json({ error: 'Invalid track data' });
    }
    newTrack.id = Date.now().toString();

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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Telemetry server running on http://localhost:${PORT}`);
});
