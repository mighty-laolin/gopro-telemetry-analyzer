# Address-sanitizer library
ASAN_FLAGS := -lasan
ifneq ($(OS),Windows_NT)
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Darwin)
		# macOS requires different a flag
		ASAN_FLAGS := -fsanitize=address
	endif
endif

gpmfdemo : GPMF_demo.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o GPMF_print.o
		gcc -o gpmfdemo GPMF_demo.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o GPMF_print.o $(ASAN_FLAGS)

gps_parser : gps_parser.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o
		gcc -o gps_parser gps_parser.o GPMF_parser.o GPMF_utils.o GPMF_mp4reader.o $(ASAN_FLAGS) -lm

gps_parser.o : gps_parser.c ../GPMF_parser.h ../GPMF_common.h ../GPMF_utils.h
		gcc -g -c gps_parser.c

GPMF_demo.o : GPMF_demo.c
		gcc -g -c GPMF_demo.c
GPMF_mp4reader.o : GPMF_mp4reader.c ../GPMF_parser.h
		gcc -g -c GPMF_mp4reader.c
GPMF_print.o : GPMF_print.c ../GPMF_parser.h
		gcc -g -c GPMF_print.c
GPMF_parser.o : ../GPMF_parser.c ../GPMF_parser.h
		gcc -g -c ../GPMF_parser.c
GPMF_utils.o : ../GPMF_utils.c ../GPMF_utils.h
		gcc -g -c ../GPMF_utils.c
clean :
		rm gpmfdemo gps_parser *.o
