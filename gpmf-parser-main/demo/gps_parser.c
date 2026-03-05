#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <math.h>
#include <time.h>

#include "../GPMF_parser.h"
#include "../GPMF_common.h"
#include "../GPMF_utils.h"
#include "GPMF_mp4reader.h"

#define GPS9_SAMPLES 9

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
static int output_json = 0;
static int output_csv = 0;

void print_gps9_data(GPMF_stream* ms, double in, double out, int payload_idx) {
    uint32_t samples = GPMF_Repeat(ms);
    uint32_t elements = GPMF_ElementsInStruct(ms);
    
    if (elements != GPS9_SAMPLES) {
        printf("  Unexpected GPS9 format: elements=%u (expected %d)\n", elements, GPS9_SAMPLES);
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

void print_accel_data(GPMF_stream* ms, double in, double out, int payload_idx, double sample_rate) {
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
        if (output_json) {
            printf("{\"error\": \"No GPS data found\"}");
        } else {
            printf("\nNo GPS data found!\n");
        }
        return;
    }
    
    if (output_json) {
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
    
    printf("\n========== TELEMETRY SUMMARY ==========\n");
    printf("GPS Points: %d\n", gps_count);
    printf("Accel Points: %d\n", accel_count);
    printf("Duration: %.1f seconds\n", total_duration);
    printf("\n--- Speed ---\n");
    printf("Max Speed: %.1f km/h\n", max_speed);
    printf("Avg Speed: %.1f km/h\n", avg_speed);
    printf("\n--- Altitude ---\n");
    printf("Min: %.1f m\n", min_alt);
    printf("Max: %.1f m\n", max_alt);
    printf("\n--- Distance ---\n");
    printf("Total: %.2f km\n", total_dist / 1000);
    printf("\n--- G-Force ---\n");
    printf("Max G: %.2fG\n", max_g);
    printf("Avg G: %.2fG\n", avg_g);
    
    printf("\n--- Sample Data (first 5 GPS points) ---\n");
    for (int i = 0; i < 5 && i < gps_count; i++) {
        printf("  %.2fs: %.6f, %.6f, %.1fm, %.1f km/h, Fix=%d\n",
               gps_points[i].timestamp,
               gps_points[i].lat,
               gps_points[i].lon,
               gps_points[i].altitude,
               gps_points[i].speed2d,
               gps_points[i].fix);
    }
    
    printf("\n--- Sample Data (first 5 ACCL points) ---\n");
    for (int i = 0; i < 5 && i < accel_count; i++) {
        printf("  %.3fs: X=%.2f, Y=%.2f, Z=%.2f, Total=%.2fG\n",
               accel_points[i].timestamp,
               accel_points[i].x,
               accel_points[i].y,
               accel_points[i].z,
               accel_points[i].total_g);
    }
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        printf("Usage: %s <video.mp4> [-csv|-json]\n", argv[0]);
        printf("  -csv: Output CSV file (telemetry.csv)\n");
        printf("  -json: Output JSON to stdout\n");
        return -1;
    }
    
    char* filename = argv[1];
    output_csv = (argc > 2 && strcmp(argv[2], "-csv") == 0);
    output_json = (argc > 2 && strcmp(argv[2], "-json") == 0);
    
    if (!output_json) {
        printf("Processing: %s\n\n", filename);
    }
    
    size_t mp4handle = OpenMP4Source(filename, MOV_GPMF_TRAK_TYPE, MOV_GPMF_TRAK_SUBTYPE, 0);
    if (mp4handle == 0) {
        printf("Error: No GPMF data found in %s\n", filename);
        return -1;
    }
    
    total_duration = GetDuration(mp4handle);
    uint32_t payloads = GetNumberPayloads(mp4handle);
    
    if (!output_json) {
        printf("Metadata: %.2f seconds, %d payloads\n", total_duration, payloads);
    }
    
    GPMF_stream metadata_stream = {0};
    GPMF_stream* ms = &metadata_stream;
    
    mp4callbacks cbobject;
    cbobject.mp4handle = mp4handle;
    cbobject.cbGetNumberPayloads = GetNumberPayloads;
    cbobject.cbGetPayload = GetPayload;
    cbobject.cbGetPayloadSize = GetPayloadSize;
    cbobject.cbGetPayloadResource = GetPayloadResource;
    cbobject.cbGetPayloadTime = GetPayloadTime;
    cbobject.cbFreePayloadResource = FreePayloadResource;
    cbobject.cbGetEditListOffsetRationalTime = GetEditListOffsetRationalTime;
    
    double accel_rate = GetGPMFSampleRate(cbobject, STR2FOURCC("ACCL"), STR2FOURCC("SHUT"), GPMF_SAMPLE_RATE_FAST, NULL, NULL);
    if (!output_json) {
        printf("Accelerometer sample rate: %.1f Hz\n", accel_rate);
    }
    
    uint32_t payloadsize = 0;
    size_t payloadres = 0;
    
    for (uint32_t index = 0; index < payloads; index++) {
        double in = 0.0, out = 0.0;
        
        payloadsize = GetPayloadSize(mp4handle, index);
        payloadres = GetPayloadResource(mp4handle, payloadres, payloadsize);
        uint32_t* payload = GetPayload(mp4handle, payloadres, index);
        
        if (payload == NULL) continue;
        
        GetPayloadTime(mp4handle, index, &in, &out);
        
        GPMF_Init(ms, payload, payloadsize);
        
        while (GPMF_OK == GPMF_FindNext(ms, STR2FOURCC("GPS9"), GPMF_RECURSE_LEVELS | GPMF_TOLERANT)) {
            print_gps9_data(ms, in, out, index);
        }
        
        GPMF_ResetState(ms);
        
        while (GPMF_OK == GPMF_FindNext(ms, STR2FOURCC("ACCL"), GPMF_RECURSE_LEVELS | GPMF_TOLERANT)) {
            print_accel_data(ms, in, out, index, accel_rate);
        }
        
        GPMF_ResetState(ms);
    }
    
    if (payloadres) FreePayloadResource(mp4handle, payloadres);
    GPMF_Free(ms);
    CloseSource(mp4handle);
    
    compute_and_print_stats();
    
    if (output_csv && gps_count > 0) {
        FILE* fp = fopen("telemetry.csv", "w");
        if (fp) {
            fprintf(fp, "timestamp,lat,lon,altitude,speed_kmh,speed2d_kmh,speed3d_kmh,dop,fix,g_force\n");
            for (int i = 0; i < gps_count; i++) {
                double g = 1.0;
                int accel_idx = (int)(accel_count * gps_points[i].timestamp / total_duration);
                if (accel_idx >= 0 && accel_idx < accel_count) {
                    g = accel_points[accel_idx].total_g;
                }
                fprintf(fp, "%.3f,%.6f,%.6f,%.1f,%.1f,%.1f,%.1f,%.1f,%d,%.2f\n",
                        gps_points[i].timestamp,
                        gps_points[i].lat,
                        gps_points[i].lon,
                        gps_points[i].altitude,
                        gps_points[i].speed2d,
                        gps_points[i].speed2d,
                        gps_points[i].speed3d,
                        gps_points[i].dop,
                        gps_points[i].fix,
                        g);
            }
            fclose(fp);
            printf("\nCSV saved to: telemetry.csv\n");
        }
    }
    
    return 0;
}
