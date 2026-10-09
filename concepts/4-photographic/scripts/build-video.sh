#!/bin/bash
# Grade + encode the two clips with the same LUT as the photographs.
# Run from the concept folder: bash scripts/build-video.sh
set -e
RAW=media-src/raw/video; OUT=public/media/video; mkdir -p $OUT media-src/graded/dune
python3 -I -c "import sys; sys.path.insert(0,'scripts'); import grade; grade.write_cube('media-src/ink-lamplight.cube',33)"
LUT=media-src/ink-lamplight.cube
# 1) Hero: macro nib writing (Pexels 9388054). Lift paper into lamplight, crush the toe, apply the LUT.
#    12 s loop: last 1.6 s cross-dissolves into the first frames so it never jumps.
PEN=$RAW/pexels-9388054-1080.mp4
G="curves=all='0/0 0.15/0.03 0.45/0.62 0.7/0.88 1/1',lut3d=$LUT"
ffmpeg -v error -y -i $PEN -filter_complex "[0:v]trim=0.4:13.6,setpts=PTS-STARTPTS,$G,split[a][b];[a]trim=0:11.6,setpts=PTS-STARTPTS[x];[b]trim=11.6:13.2,setpts=PTS-STARTPTS[y];[0:v]trim=0.4:2.0,setpts=PTS-STARTPTS,$G[z];[y][z]blend=all_expr='A*(1-T/1.6)+B*(T/1.6)'[w];[x][w]concat=n=2:v=1[o];[o]scale=1600:900:flags=lanczos,format=yuv420p" -an -c:v libx264 -preset slow -crf 24 -profile:v high -movflags +faststart $OUT/hero-nib.mp4
ffmpeg -v error -y -i $PEN -filter_complex "[0:v]trim=0.4:13.6,setpts=PTS-STARTPTS,$G,split[a][b];[a]trim=0:11.6,setpts=PTS-STARTPTS[x];[b]trim=11.6:13.2,setpts=PTS-STARTPTS[y];[0:v]trim=0.4:2.0,setpts=PTS-STARTPTS,$G[z];[y][z]blend=all_expr='A*(1-T/1.6)+B*(T/1.6)'[w];[x][w]concat=n=2:v=1[o];[o]scale=1600:900:flags=lanczos,format=yuv420p" -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 $OUT/hero-nib.webm
# poster = a frame with ink already on the paper
ffmpeg -v error -y -ss 9.2 -i $PEN -frames:v 1 -vf "$G" media-src/graded/hero-nib-poster.png
# 2) Method: dune shadow time-lapse (Mixkit 4149) as a 60-frame scroll-scrubbed sequence.
DUNE=$RAW/mixkit-4149-1080.mp4
rm -f media-src/graded/dune/*.png
ffmpeg -v error -y -i $DUNE -vf "fps=60/11.4,lut3d=$LUT,scale=1600:-2:flags=lanczos" media-src/graded/dune/f%03d.png
echo done
