#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <stdint.h>

#include "../GPMF_parser.h"
#include "../GPMF_common.h"
#include "GPMF_mp4reader.h"

int main(int argc, char* argv[]) {
    if (argc < 2) {
        fprintf(stderr, "Usage: %s <video.mp4>\n", argv[0]);
        return -1;
    }

    char* filename = argv[1];

    size_t mp4handle = OpenMP4Source(filename, MOV_GPMF_TRAK_TYPE, MOV_GPMF_TRAK_SUBTYPE, 0);
    if (mp4handle == 0) {
        printf("{\"error\": \"No GPMF data found\"}\n");
        return -1;
    }

    float duration = GetDuration(mp4handle);
    uint32_t numPayloads = GetNumberPayloads(mp4handle);

    mp4object *mp4 = (mp4object *)mp4handle;

    printf("{\"numPayloads\": %u", numPayloads);
    printf(", \"duration\": %.6f", (double)duration);
    printf(", \"basemetadataduration\": %.15g", mp4->basemetadataduration);
    printf(", \"meta_clockdemon\": %u", mp4->meta_clockdemon);
    printf(", \"meta_clockcount\": %u", mp4->meta_clockcount);
    printf(", \"clockdemon\": %u", mp4->clockdemon);
    printf(", \"clockcount\": %u", mp4->clockcount);
    printf(", \"metadataoffset_clockcount\": %d", mp4->metadataoffset_clockcount);
    printf(", \"metadatalength\": %.15g", mp4->metadatalength);
    printf(", \"metasize_count\": %u", mp4->metasize_count);
    printf(", \"indexcount\": %u", mp4->indexcount);

    printf(", \"payloadOffsets\": [");
    for (uint32_t i = 0; i < numPayloads; i++) {
        if (i > 0) printf(", ");
        printf("%llu", (unsigned long long)mp4->metaoffsets[i]);
    }
    printf("]");

    printf(", \"payloadSizes\": [");
    for (uint32_t i = 0; i < numPayloads; i++) {
        if (i > 0) printf(", ");
        printf("%u", mp4->metasizes[i]);
    }
    printf("]");

    printf("}\n");

    CloseSource(mp4handle);
    return 0;
}
