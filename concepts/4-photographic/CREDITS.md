# Credits: photography and footage

Every photograph and clip on the page is a real, free-licensed asset. Each one was downloaded into the project (nothing is hotlinked) and then graded into a single look with `scripts/grade.py` ("Ink & Lamplight": ink-navy shadows, lamp-gold highlights, restrained native colour, one shared grain layer on the page).
The grading parameters for each image are in `scripts/media.json`. The same grade is exported as a 3D LUT (`media-src/ink-lamplight.cube`), and `scripts/build-video.sh` applies that LUT to the video.

**Licences**
- **Pexels License** (https://www.pexels.com/license/): free for commercial use, attribution not required, and modification allowed.
- **Mixkit Stock Video Free License** (https://mixkit.co/license/#videoFree): free for commercial use and no attribution required.

Photographer names are given where the source listing showed them. Where it did not, the Pexels page linked below shows the contributor. Neither licence requires attribution.

## Video

| Used as | Source | Author | Licence |
|---|---|---|---|
| Hero loop: a macro shot of a nib writing in ink (`public/media/video/hero-nib.mp4` / `.webm`, plus the poster `hero-nib-poster`) | https://www.pexels.com/video/person-writing-using-a-fountain-pen-9388054/ (file: `videos.pexels.com/video-files/9388054/9388054-hd_1920_1080_25fps.mp4`) | emirkhan bal | Pexels License |
| Method scene: a time-lapse of a shadow crossing a dune, turned into a 60-frame scroll-scrubbed sequence (`public/media/seq/dune/`) | https://mixkit.co/free-stock-video/dunes-in-the-sahara-desert-4149/ (file: `assets.mixkit.co/videos/4149/4149-1080.mp4`) | Mixkit | Mixkit Stock Video Free License |

## Photographs (all Pexels)

| Slug on the page | Where it is used | Pexels page | Author |
|---|---|---|---|
| `rawshan-single` | Numbers sheet (07), mobile menu | https://www.pexels.com/photo/31367601/ | Muhannad al zabidi |
| `rawshan-alley` | «من نحن»: the rawshan that assembles | https://www.pexels.com/photo/31367599/ | Pexels contributor (same series as 31367601; not confirmed) |
| `rawshan-diagonal` | Expertise plate 04 (الأصول العقارية) | https://www.pexels.com/photo/31367600/ | Pexels contributor (same series; not confirmed) |
| `rawshan-facade` | Numbers sheet (01) | https://www.pexels.com/photo/31367598/ | Pexels contributor (same series; not confirmed) |
| `balad-golden` | Closing: «لنتحدث عن ملفك» | https://www.pexels.com/photo/28558788/ | Pexels contributor |
| `lanterns` | Expertise plate 05 (النزاعات), numbers sheet (06) | https://www.pexels.com/photo/11843618/ | Pexels contributor |
| `door` | Expertise plate 02 (التركات والأوقاف), numbers sheet (02) | https://www.pexels.com/photo/11843621/ | Pexels contributor |
| `files` | Expertise plate 01 (التصفيات والإفلاس), numbers sheet (03) | https://www.pexels.com/photo/a-pile-of-old-paper-files-17846111/ | Adil Khan Marwat |
| `script-pen` | Numbers sheet (08) | https://www.pexels.com/photo/29079518/ (series of 29079520, "Antique Calligraphy Pen on Arabic Script Document") | Pexels contributor |
| `hands-docs` | Expertise plate 06 (التحكيم والوساطة), numbers sheet (05) | https://www.pexels.com/photo/close-up-photo-of-person-pointing-on-documents-7821543/ | Pexels contributor |
| `tower` | Expertise plate 03 (الشركات والاستثمار) | https://www.pexels.com/photo/dramatic-black-and-white-brutalist-architecture-32191170/ | Pexels contributor |
| `dune` | Method still (phones, reduced motion, no-JS) | https://www.pexels.com/photo/shadow-on-sunlit-desert-19896998/ | Pexels contributor |
| `marble` | Value: المؤسسية | https://www.pexels.com/photo/black-and-brown-marble-surface-8350474/ | Pexels contributor |
| `seals` | Value: السرية, numbers sheet (09) | https://www.pexels.com/photo/close-up-of-black-envelopes-with-wax-stamps-17262454/ | Andrei Ciubotariu |
| `nib` | Value: الاحترافية | https://www.pexels.com/photo/fountain-pen-on-black-background-19875634/ | Luis Alberto Garcia Garcia |
| `bokeh` | Value: التميز | https://www.pexels.com/photo/round-light-spots-glowing-in-dark-6315054/ | Pexels contributor |
| `lattice-light` | Value: الشفافية | https://www.pexels.com/photo/abstract-image-of-a-light-pattern-cast-on-a-floor-18453549/ | Pexels contributor |
| `glass-desert` | Value: الابتكار, numbers sheet (04) | https://www.pexels.com/photo/dramatic-desert-landscape-reflected-in-modern-glass-30137370/ | Fatih Dağlı |

Image file URLs follow `https://images.pexels.com/photos/<id>/pexels-photo-<id>.jpeg`. `scripts/grade_all.py` downloads them again if `media-src/raw/` is empty.

## Editorial notes
- No faces, no religious sites, no gavels or courtrooms. Crops were chosen so that people and minarets in the wider series stay out of frame.
- The traced logo, the calligraphy strokes and the fonts (Almarai, Noto Naskh Arabic, SIL OFL) come from `concepts/shared/`.
