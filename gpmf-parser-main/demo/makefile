# Address-sanitizer library
ASAN_FLAGS := -lasan
WIN_FLAGS := -D_WINDOWS -D_USE_MATH_DEFINES
EXE_SUFFIX :=
ifeq ($(OS),Windows_NT)
	ASAN_FLAGS :=
	EXE_SUFFIX := .exe
else
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Darwin)
		ASAN_FLAGS := -fsanitize=address
	endif
endif

gpmfdemo : GPMF_demo.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o GPMF_print.o
		gcc -o gpmfdemo$(EXE_SUFFIX) GPMF_demo.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o GPMF_print.o $(ASAN_FLAGS)

gps_parser : gps_parser.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o
		gcc -o gps_parser$(EXE_SUFFIX) gps_parser.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o $(ASAN_FLAGS) -lm

mp4_offsets : mp4_offsets.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o
		gcc -o mp4_offsets$(EXE_SUFFIX) mp4_offsets.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o $(ASAN_FLAGS) -lm

gps_parser_gpmf : gps_parser_gpmf.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o
		gcc -o gps_parser_gpmf$(EXE_SUFFIX) gps_parser_gpmf.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o $(ASAN_FLAGS) -lm

gps_parser.o : gps_parser.c ../GPMF_parser.h ../GPMF_common.h ../GPMF_utils.h
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c gps_parser.c
else
		gcc -g -c gps_parser.c
endif

GPMF_demo.o : GPMF_demo.c
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c GPMF_demo.c
else
		gcc -g -c GPMF_demo.c
endif

GPMF_mp4reader.o : GPMF_mp4reader.c ../GPMF_parser.h
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c GPMF_mp4reader.c
else
		gcc -g -c GPMF_mp4reader.c
endif

GPMF_print.o : GPMF_print.c ../GPMF_parser.h
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c GPMF_print.c
else
		gcc -g -c GPMF_print.c
endif

GPMF_parser.o : ../GPMF_parser.c ../GPMF_parser.h
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c ../GPMF_parser.c
else
		gcc -g -c ../GPMF_parser.c
endif

GPMF_utils.o : ../GPMF_utils.c ../GPMF_utils.h
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c ../GPMF_utils.c
else
		gcc -g -c ../GPMF_utils.c
endif

mp4_offsets.o : mp4_offsets.c ../GPMF_parser.h ../GPMF_common.h ../GPMF_utils.h GPMF_mp4reader.h
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c mp4_offsets.c
else
		gcc -g -c mp4_offsets.c
endif

gps_parser_gpmf.o : gps_parser_gpmf.c ../GPMF_parser.h ../GPMF_common.h ../GPMF_utils.h GPMF_mp4reader.h
ifeq ($(OS),Windows_NT)
		gcc -g $(WIN_FLAGS) -c gps_parser_gpmf.c
else
		gcc -g -c gps_parser_gpmf.c
endif

clean :
ifeq ($(OS),Windows_NT)
		del /Q gpmfdemo.exe gps_parser.exe *.o 2>nul
else
		rm -f gpmfdemo gps_parser mp4_offsets gps_parser_gpmf *.o
endif
