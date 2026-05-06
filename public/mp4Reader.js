var mp4Reader = (function() {

    function readUint32BE(buf, offset) {
        return (buf[offset] << 24) | (buf[offset+1] << 16) | (buf[offset+2] << 8) | buf[offset+3];
    }

    function findMoovAtom(file) {
        return new Promise(function(resolve, reject) {
            var chunkSize = Math.min(256 * 1024, file.size);
            var reader = new FileReader();
            reader.onload = function(e) {
                var buf = new Uint8Array(e.target.result);
                var pos = 0;
                while (pos + 8 <= buf.length) {
                    var size = readUint32BE(buf, pos);
                    var tag = String.fromCharCode(buf[pos+4], buf[pos+5], buf[pos+6], buf[pos+7]);
                    if (tag === 'moov') {
                        resolve({ offset: pos, size: size });
                        return;
                    }
                    if (size < 8) break;
                    pos += size;
                }

                readEndOfFileForMoov(file).then(resolve).catch(reject);
            };
            reader.onerror = function() { reject(new Error('Failed to read file for moov atom')); };
            reader.readAsArrayBuffer(file.slice(0, chunkSize));
        });
    }

    function readEndOfFileForMoov(file) {
        return new Promise(function(resolve, reject) {
            var readSize = Math.min(4 * 1024 * 1024, file.size);
            var startOffset = file.size - readSize;
            var reader = new FileReader();
            reader.onload = function(e) {
                var buf = new Uint8Array(e.target.result);
                for (var pos = 0; pos + 8 <= buf.length; pos++) {
                    var size = readUint32BE(buf, pos);
                    var tag = String.fromCharCode(buf[pos+4], buf[pos+5], buf[pos+6], buf[pos+7]);
                    if (tag === 'moov' && size > 8 && size < file.size) {
                        resolve({ offset: startOffset + pos, size: size });
                        return;
                    }
                }
                reject(new Error('moov atom not found'));
            };
            reader.onerror = function() { reject(new Error('Failed to read end of file')); };
            reader.readAsArrayBuffer(file.slice(startOffset, file.size));
        });
    }

    function readMoovAtom(file) {
        return new Promise(function(resolve, reject) {
            findMoovAtom(file).then(function(moovInfo) {
                var reader = new FileReader();
                reader.onload = function(e) {
                    resolve({ moovData: new Uint8Array(e.target.result), moovInfo: moovInfo });
                };
                reader.onerror = function() { reject(new Error('Failed to read moov atom')); };
                reader.readAsArrayBuffer(file.slice(moovInfo.offset, moovInfo.offset + moovInfo.size));
            }).catch(reject);
        });
    }

    function analyzeMoov(moovData) {
        var formData = new FormData();
        formData.append('moov', new Blob([moovData], { type: 'application/octet-stream' }), 'moov.bin');

        return fetch('/api/analyze-moov', {
            method: 'POST',
            body: formData
        }).then(function(r) {
            if (!r.ok) throw new Error('analyze-moov failed: ' + r.status);
            return r.json();
        });
    }

    function readGpmfData(file, readPlan, onProgress) {
        return new Promise(function(resolve, reject) {
            var offsets = readPlan.payloadOffsets;
            var sizes = readPlan.payloadSizes;
            var numPayloads = readPlan.numPayloads;

            var totalDataSize = 0;
            for (var i = 0; i < sizes.length; i++) {
                totalDataSize += sizes[i];
            }

            var gpmfBuffer = new Uint8Array(totalDataSize);
            var newOffsets = new Array(numPayloads);
            var readIndex = 0;
            var writePos = 0;

            function readNext() {
                if (readIndex >= numPayloads) {
                    resolve({ gpmfData: gpmfBuffer, metadata: buildMetadata(readPlan, newOffsets) });
                    return;
                }

                var offset = offsets[readIndex];
                var size = sizes[readIndex];
                newOffsets[readIndex] = writePos;

                var reader = new FileReader();
                reader.onload = function(e) {
                    var chunk = new Uint8Array(e.target.result);
                    gpmfBuffer.set(chunk, writePos);
                    writePos += chunk.length;
                    readIndex++;

                    if (onProgress) {
                        onProgress(readIndex, numPayloads, writePos, totalDataSize);
                    }

                    readNext();
                };
                reader.onerror = function() {
                    reject(new Error('Failed to read GPMF payload ' + readIndex));
                };
                reader.readAsArrayBuffer(file.slice(offset, offset + size));
            }

            readNext();
        });
    }

    function buildMetadata(readPlan, newOffsets) {
        return {
            numPayloads: readPlan.numPayloads,
            duration: readPlan.duration,
            basemetadataduration: readPlan.basemetadataduration,
            meta_clockdemon: readPlan.meta_clockdemon,
            meta_clockcount: readPlan.meta_clockcount,
            clockdemon: readPlan.clockdemon,
            clockcount: readPlan.clockcount,
            metadataoffset_clockcount: readPlan.metadataoffset_clockcount,
            metadatalength: readPlan.metadatalength,
            metasize_count: readPlan.metasize_count,
            indexcount: readPlan.indexcount,
            payloadOffsets: newOffsets,
            payloadSizes: readPlan.payloadSizes
        };
    }

    function extractGpmfTelemetry(gpmfData, metadata) {
        var formData = new FormData();
        formData.append('gpmf_data', new Blob([gpmfData], { type: 'application/octet-stream' }), 'gpmf.bin');
        formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }), 'meta.json');

        return fetch('/api/extract-gpmf', {
            method: 'POST',
            body: formData
        }).then(function(r) {
            if (!r.ok) throw new Error('extract-gpmf failed: ' + r.status);
            return r.json();
        });
    }

    function extractTelemetry(file, onProgress) {
        return new Promise(function(resolve, reject) {
            if (onProgress) onProgress('reading', 0, 0, 0);

            readMoovAtom(file).then(function(result) {
                if (onProgress) onProgress('analyzing', 0, 0, 0);
                return analyzeMoov(result.moovData);
            }).then(function(readPlan) {
                if (readPlan.error) {
                    throw new Error(readPlan.error);
                }
                if (onProgress) onProgress('extracting', 0, 0, 0);
                return readGpmfData(file, readPlan, function(idx, total, bytes, totalBytes) {
                    if (onProgress) onProgress('extracting', idx, total, bytes);
                });
            }).then(function(result) {
                if (onProgress) onProgress('parsing', 0, 0, 0);
                return extractGpmfTelemetry(result.gpmfData, result.metadata);
            }).then(function(telemetry) {
                resolve(telemetry);
            }).catch(function(err) {
                reject(err);
            });
        });
    }

    return {
        extractTelemetry: extractTelemetry
    };
})();
