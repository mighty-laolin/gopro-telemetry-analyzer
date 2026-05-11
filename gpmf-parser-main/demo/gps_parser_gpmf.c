#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <math.h>

#include "../GPMF_parser.h"
#include "../GPMF_common.h"
#include "../GPMF_utils.h"
#include "GPMF_mp4reader.h"

#define GPS9_SAMPLES 9
#define GPS5_SAMPLES 5

typedef struct {
    double timestamp;
    double lat;
    double lon;
    double altitude;
    double speed2d;
    double speed3d;
    double dop;
    int fix;
} GPSPoint;

typedef struct {
    double timestamp;
    double x;
    double y;
    double z;
    double total_g;
} AccelPoint;

#define MAX_GPS_POINTS 20000
#define MAX_ACCEL_POINTS 400000

static GPSPoint gps_points[MAX_GPS_POINTS];
static int gps_count = 0;

static AccelPoint accel_points[MAX_ACCEL_POINTS];
static int accel_count = 0;

static double total_duration = 0;

static uint8_t *gpmf_databuf = NULL;
static uint64_t gpmf_datasize = 0;
static uint32_t *payload_offsets_arr = NULL;
static uint32_t *payload_sizes_arr = NULL;
static uint32_t num_payloads = 0;

static double basemetadataduration_val = 0;
static uint32_t meta_clockdemon_val = 0;
static uint32_t meta_clockcount_val = 0;
static uint32_t clockdemon_val = 0;
static uint32_t clockcount_val = 0;
static int32_t metadataoffset_clockcount_val = 0;
static double metadatalength_val = 0;

void write_gps9_data(GPMF_stream* ms, double in, double out, int payload_idx) {
    uint32_t samples = GPMF_Repeat(ms);
    uint32_t elements = GPMF_ElementsInStruct(ms);

    if (elements != GPS9_SAMPLES) {
        return;
    }

    uint32_t buffersize = samples * elements * sizeof(double);
    double* buffer = (double*)malloc(buffersize);
    if (!buffer) return;

    if (GPMF_OK == GPMF_ScaledData(ms, buffer, buffersize, 0, samples, GPMF_TYPE_DOUBLE)) {
        double sample_duration = (out - in) / samples;

        for (uint32_t i = 0; i < samples; i++) {
            if (gps_count >= MAX_GPS_POINTS) break;

            double* sample = &buffer[i * elements];

            GPSPoint pt;
            pt.timestamp = in + i * sample_duration;
            pt.lat = sample[0];
            pt.lon = sample[1];
            pt.altitude = sample[2];
            pt.speed2d = sample[3] * 3.6;
            pt.speed3d = sample[4] * 3.6;
            pt.dop = sample[7];
            pt.fix = (int)sample[8];

            gps_points[gps_count++] = pt;
        }
    }

    free(buffer);
}

void write_gps5_data(GPMF_stream* ms, double in, double out, int payload_idx) {
    uint32_t samples = GPMF_Repeat(ms);
    uint32_t elements = GPMF_ElementsInStruct(ms);

    if (elements != GPS5_SAMPLES) {
        return;
    }

    uint32_t buffersize = samples * elements * sizeof(double);
    double* buffer = (double*)malloc(buffersize);
    if (!buffer) return;

    if (GPMF_OK == GPMF_ScaledData(ms, buffer, buffersize, 0, samples, GPMF_TYPE_DOUBLE)) {
        double sample_duration = (out - in) / samples;

        for (uint32_t i = 0; i < samples; i++) {
            if (gps_count >= MAX_GPS_POINTS) break;

            double* sample = &buffer[i * elements];

            GPSPoint pt;
            pt.timestamp = in + i * sample_duration;
            pt.lat = sample[0];
            pt.lon = sample[1];
            pt.altitude = sample[2];
            pt.speed2d = sample[3] * 3.6;
            pt.speed3d = sample[4] * 3.6;
            pt.dop = 0;
            pt.fix = 0;

            gps_points[gps_count++] = pt;
        }
    }

    free(buffer);
}

void write_accel_data(GPMF_stream* ms, double in, double out, int payload_idx, double sample_rate) {
    uint32_t samples = GPMF_Repeat(ms);
    uint32_t elements = GPMF_ElementsInStruct(ms);

    uint32_t buffersize = samples * elements * sizeof(double);
    double* buffer = (double*)malloc(buffersize);
    if (!buffer) return;

    if (GPMF_OK == GPMF_ScaledData(ms, buffer, buffersize, 0, samples, GPMF_TYPE_DOUBLE)) {
        double sample_duration = 1.0 / sample_rate;

        for (uint32_t i = 0; i < samples; i++) {
            if (accel_count >= MAX_ACCEL_POINTS) break;

            double* sample = &buffer[i * elements];

            AccelPoint pt;
            pt.timestamp = in + i * sample_duration;
            pt.x = sample[0] / 9.81;
            pt.y = sample[1] / 9.81;
            pt.z = sample[2] / 9.81;
            pt.total_g = sqrt(pt.x*pt.x + pt.y*pt.y + pt.z*pt.z);

            accel_points[accel_count++] = pt;
        }
    }

    free(buffer);
}

void compute_and_print_stats() {
    if (gps_count == 0) {
        printf("{\"error\": \"No GPS data found\"}");
        return;
    }

    double max_speed = 0, avg_speed = 0;
    double max_alt = -1e9, min_alt = 1e9;
    double max_g = 0, avg_g = 0;

    for (int i = 0; i < gps_count; i++) {
        if (gps_points[i].speed2d > max_speed) max_speed = gps_points[i].speed2d;
        avg_speed += gps_points[i].speed2d;
        if (gps_points[i].altitude > max_alt) max_alt = gps_points[i].altitude;
        if (gps_points[i].altitude < min_alt) min_alt = gps_points[i].altitude;
    }
    avg_speed /= gps_count;

    for (int i = 0; i < accel_count; i++) {
        if (accel_points[i].total_g > max_g) max_g = accel_points[i].total_g;
        avg_g += accel_points[i].total_g;
    }
    if (accel_count > 0) avg_g /= accel_count;

    double total_dist = 0;
    for (int i = 1; i < gps_count; i++) {
        double lat1 = gps_points[i-1].lat * M_PI / 180;
        double lat2 = gps_points[i].lat * M_PI / 180;
        double dlat = (gps_points[i].lat - gps_points[i-1].lat) * M_PI / 180;
        double dlon = (gps_points[i].lon - gps_points[i-1].lon) * M_PI / 180;

        double a = sin(dlat/2)*sin(dlat/2) + cos(lat1)*cos(lat2)*sin(dlon/2)*sin(dlon/2);
        double c = 2 * atan2(sqrt(a), sqrt(1-a));
        double dist = 6371000 * c;

        if (dist < 1000) total_dist += dist;
    }

    printf("{");
    printf("\"success\": true,");
    printf("\"gpsPoints\": %d,", gps_count);
    printf("\"accelPoints\": %d,", accel_count);
    printf("\"duration\": %.2f,", total_duration);
    printf("\"maxSpeed\": %.1f,", max_speed);
    printf("\"avgSpeed\": %.1f,", avg_speed);
    printf("\"minAltitude\": %.1f,", min_alt);
    printf("\"maxAltitude\": %.1f,", max_alt);
    printf("\"totalDistance\": %.2f,", total_dist / 1000);
    printf("\"maxGForce\": %.2f,", max_g);
    printf("\"avgGForce\": %.2f,", avg_g);
    printf("\"data\": [");

    for (int i = 0; i < gps_count; i++) {
        double g = 1.0, gx = 0, gy = 0, gz = 0;
        int accel_idx = (int)((double)accel_count * gps_points[i].timestamp / total_duration);
        if (accel_idx >= 0 && accel_idx < accel_count) {
            g = accel_points[accel_idx].total_g;
            gx = accel_points[accel_idx].x;
            gy = accel_points[accel_idx].y;
            gz = accel_points[accel_idx].z;
        }

        printf("%s{", i > 0 ? "," : "");
        printf("\"t\":%.3f,", gps_points[i].timestamp);
        printf("\"lat\":%.6f,", gps_points[i].lat);
        printf("\"lon\":%.6f,", gps_points[i].lon);
        printf("\"alt\":%.1f,", gps_points[i].altitude);
        printf("\"speed\":%.1f,", gps_points[i].speed2d);
        printf("\"gx\":%.2f,", gx);
        printf("\"gy\":%.2f,", gy);
        printf("\"gz\":%.2f,", gz);
        printf("\"g\":%.2f", g);
        printf("}");
    }

    printf("]}");
}

static uint32_t GetPayloadSizeGpmf(size_t handle, uint32_t index) {
    if (index >= num_payloads) return 0;
    return payload_sizes_arr[index];
}

static uint32_t *GetPayloadGpmf(size_t mp4handle, size_t resHandle, uint32_t index) {
    resObject *res = (resObject *)resHandle;
    if (res == NULL || index >= num_payloads) return NULL;

    uint64_t offset = payload_offsets_arr[index];
    uint32_t size = payload_sizes_arr[index];

    if (offset + size > gpmf_datasize) return NULL;

    resHandle = GetPayloadResource(mp4handle, resHandle, size);
    res = (resObject *)resHandle;
    if (res == NULL) return NULL;

    memcpy(res->buffer, gpmf_databuf + offset, size);
    return res->buffer;
}

static size_t GetPayloadResourceGpmf(size_t mp4handle, size_t resHandle, uint32_t payloadBufferSize) {
    resObject *res = (resObject *)resHandle;

    if (res == NULL) {
        res = (resObject*)malloc(sizeof(resObject));
        if (res) {
            memset(res, 0, sizeof(resObject));
            resHandle = (size_t)res;
        }
    }

    if (res) {
        uint32_t myBufferSize = payloadBufferSize + 256;

        if (res->buffer == NULL) {
            res->buffer = (uint32_t*)malloc(myBufferSize);
            if (res->buffer) {
                res->bufferSize = myBufferSize;
            } else {
                free(res);
                return 0;
            }
        } else if (payloadBufferSize > res->bufferSize) {
            res->buffer = (uint32_t*)realloc(res->buffer, myBufferSize);
            res->bufferSize = myBufferSize;
            if (res->buffer == NULL) {
                free(res);
                return 0;
            }
        }
    }

    return resHandle;
}

static void FreePayloadResourceGpmf(size_t mp4handle, size_t resHandle) {
    resObject *res = (resObject *)resHandle;
    if (res) {
        if (res->buffer) free(res->buffer);
        free(res);
    }
}

static uint32_t GetPayloadTimeGpmf(size_t handle, uint32_t index, double *in, double *out) {
    if (payload_offsets_arr == NULL || basemetadataduration_val == 0 || meta_clockdemon_val == 0 || in == NULL || out == NULL)
        return MP4_ERROR_MEMORY;

    *in = ((double)index * (double)basemetadataduration_val / (double)meta_clockdemon_val);
    *out = ((double)(index + 1) * (double)basemetadataduration_val / (double)meta_clockdemon_val);

    if (*out > (double)metadatalength_val)
        *out = (double)metadatalength_val;

    *in += (double)metadataoffset_clockcount_val / (double)clockdemon_val;
    *out += (double)metadataoffset_clockcount_val / (double)clockdemon_val;
    return MP4_ERROR_OK;
}

static uint32_t GetNumberPayloadsGpmf(size_t handle) {
    return num_payloads;
}

static uint32_t GetEditListOffsetRationalTimeGpmf(size_t handle, int32_t *offset_numerator, uint32_t *denominator) {
    if (clockdemon_val == 0) return MP4_ERROR_MEMORY;
    *offset_numerator = metadataoffset_clockcount_val;
    *denominator = clockdemon_val;
    return MP4_ERROR_OK;
}

static char* read_file(const char* path, size_t* out_size) {
    FILE *f = fopen(path, "rb");
    if (!f) return NULL;
    fseek(f, 0, SEEK_END);
    long sz = ftell(f);
    fseek(f, 0, SEEK_SET);
    char *buf = (char*)malloc(sz + 1);
    if (!buf) { fclose(f); return NULL; }
    fread(buf, 1, sz, f);
    buf[sz] = 0;
    fclose(f);
    if (out_size) *out_size = sz;
    return buf;
}

static double parse_double(const char* json, const char* key) {
    char search[128];
    snprintf(search, sizeof(search), "\"%s\":", key);
    const char *p = strstr(json, search);
    if (!p) return 0;
    p += strlen(search);
    while (*p == ' ') p++;
    return strtod(p, NULL);
}

static uint32_t parse_uint32(const char* json, const char* key) {
    return (uint32_t)parse_double(json, key);
}

static int32_t parse_int32(const char* json, const char* key) {
    return (int32_t)parse_double(json, key);
}

static uint32_t* parse_uint32_array(const char* json, const char* key, uint32_t* out_count) {
    char search[128];
    snprintf(search, sizeof(search), "\"%s\":", key);
    const char *p = strstr(json, search);
    if (!p) { *out_count = 0; return NULL; }
    p += strlen(search);
    while (*p == ' ') p++;
    if (*p != '[') { *out_count = 0; return NULL; }
    p++;

    uint32_t count = 0;
    const char *scan = p;
    while (*scan && *scan != ']') {
        if (*scan == ',') count++;
        scan++;
    }
    count++;

    uint32_t *arr = (uint32_t*)malloc(count * sizeof(uint32_t));
    if (!arr) { *out_count = 0; return NULL; }

    for (uint32_t i = 0; i < count; i++) {
        while (*p == ' ' || *p == ',') p++;
        arr[i] = (uint32_t)strtoull(p, (char**)&p, 10);
    }

    *out_count = count;
    return arr;
}

int main(int argc, char* argv[]) {
    if (argc < 3) {
        fprintf(stderr, "Usage: %s <metadata.json> <gpmf_data.bin>\n", argv[0]);
        return -1;
    }

    const char *meta_path = argv[1];
    const char *gpmf_path = argv[2];

    size_t meta_size = 0;
    char *meta_json = read_file(meta_path, &meta_size);
    if (!meta_json) {
        printf("{\"error\": \"Cannot read metadata file\"}\n");
        return -1;
    }

    size_t gpmf_size = 0;
    gpmf_databuf = (uint8_t*)read_file(gpmf_path, &gpmf_size);
    gpmf_datasize = gpmf_size;
    if (!gpmf_databuf) {
        printf("{\"error\": \"Cannot read GPMF data file\"}\n");
        free(meta_json);
        return -1;
    }

    num_payloads = parse_uint32(meta_json, "numPayloads");
    basemetadataduration_val = parse_double(meta_json, "basemetadataduration");
    meta_clockdemon_val = parse_uint32(meta_json, "meta_clockdemon");
    meta_clockcount_val = parse_uint32(meta_json, "meta_clockcount");
    clockdemon_val = parse_uint32(meta_json, "clockdemon");
    clockcount_val = parse_uint32(meta_json, "clockcount");
    metadataoffset_clockcount_val = parse_int32(meta_json, "metadataoffset_clockcount");
    metadatalength_val = parse_double(meta_json, "metadatalength");

    uint32_t offsets_count = 0, sizes_count = 0;
    payload_offsets_arr = parse_uint32_array(meta_json, "payloadOffsets", &offsets_count);
    payload_sizes_arr = parse_uint32_array(meta_json, "payloadSizes", &sizes_count);

    if (!payload_offsets_arr || !payload_sizes_arr || offsets_count != num_payloads || sizes_count != num_payloads) {
        printf("{\"error\": \"Invalid metadata: missing or mismatched offsets/sizes\"}\n");
        free(meta_json);
        free(gpmf_databuf);
        free(payload_offsets_arr);
        free(payload_sizes_arr);
        return -1;
    }

    total_duration = metadatalength_val;

    size_t dummy_handle = 1;

    mp4callbacks cbobject;
    cbobject.mp4handle = dummy_handle;
    cbobject.cbGetNumberPayloads = GetNumberPayloadsGpmf;
    cbobject.cbGetPayload = GetPayloadGpmf;
    cbobject.cbGetPayloadSize = GetPayloadSizeGpmf;
    cbobject.cbGetPayloadResource = GetPayloadResourceGpmf;
    cbobject.cbGetPayloadTime = GetPayloadTimeGpmf;
    cbobject.cbFreePayloadResource = FreePayloadResourceGpmf;
    cbobject.cbGetEditListOffsetRationalTime = GetEditListOffsetRationalTimeGpmf;

    double accel_rate = GetGPMFSampleRate(cbobject, STR2FOURCC("ACCL"), STR2FOURCC("SHUT"), GPMF_SAMPLE_RATE_FAST, NULL, NULL);

    GPMF_stream metadata_stream = {0};
    GPMF_stream* ms = &metadata_stream;

    uint32_t payloadsize = 0;
    size_t payloadres = 0;
    int gps_format = 0; // 0=unknown, 9=GPS9, 5=GPS5

    for (uint32_t index = 0; index < num_payloads; index++) {
        double in = 0.0, out = 0.0;

        payloadsize = GetPayloadSizeGpmf(dummy_handle, index);
        payloadres = GetPayloadResourceGpmf(dummy_handle, payloadres, payloadsize);
        uint32_t* payload = GetPayloadGpmf(dummy_handle, payloadres, index);

        if (payload == NULL) continue;

        GetPayloadTimeGpmf(dummy_handle, index, &in, &out);

        GPMF_Init(ms, payload, payloadsize);

        if (gps_format != 5) {
            while (GPMF_OK == GPMF_FindNext(ms, STR2FOURCC("GPS9"), GPMF_RECURSE_LEVELS | GPMF_TOLERANT)) {
                gps_format = 9;
                write_gps9_data(ms, in, out, index);
            }
        }

        GPMF_ResetState(ms);

        if (gps_format != 9) {
            while (GPMF_OK == GPMF_FindNext(ms, STR2FOURCC("GPS5"), GPMF_RECURSE_LEVELS | GPMF_TOLERANT)) {
                gps_format = 5;
                write_gps5_data(ms, in, out, index);
            }
        }

        GPMF_ResetState(ms);

        while (GPMF_OK == GPMF_FindNext(ms, STR2FOURCC("ACCL"), GPMF_RECURSE_LEVELS | GPMF_TOLERANT)) {
            write_accel_data(ms, in, out, index, accel_rate);
        }

        GPMF_ResetState(ms);
    }

    if (payloadres) FreePayloadResourceGpmf(dummy_handle, payloadres);
    GPMF_Free(ms);

    compute_and_print_stats();

    free(meta_json);
    free(gpmf_databuf);
    free(payload_offsets_arr);
    free(payload_sizes_arr);

    return 0;
}
