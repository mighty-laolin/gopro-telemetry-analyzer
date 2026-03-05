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

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Telemetry server running on http://localhost:${PORT}`);
});
