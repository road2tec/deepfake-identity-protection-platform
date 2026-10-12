# Deepfake Detection and Digital Identity Protection Platform

A web platform that checks whether a photo was generated or altered by AI, and tells you when
**your own face** shows up in manipulated media.

This is a rebuild of the earlier *Defake Detection (Audio / Video / Images)* project, reorganised around
digital identity protection. This release covers about half of the planned scope: the image and identity
modules work end to end, and audio and video are scheduled for the next phase.

| Module | Status |
|---|---|
| User registration / login (JWT, bcrypt) | Done |
| Image deepfake detection (metadata + face + CNN) | Done |
| Protected identity: enrol your face, auto-check every scan | Done |
| Identity misuse alerts | Done |
| Scan history, scan detail, statistics | Done |
| Audio deepfake (voice clone) detection | Planned |
| Video deepfake (face swap) detection | Planned |

## How image detection works

1. **Metadata forensics.** Looks for generator tags (IPTC `trainedAlgorithmicMedia`, Stable Diffusion
   parameters, Midjourney / DALL-E / Firefly / Imagen markers), C2PA manifests and camera EXIF.
2. **Face localisation.** OpenCV YuNet finds faces, and the largest one is cropped.
3. **Neural classifier.** EfficientNet-B0, fine-tuned on real (FFHQ) and GAN-generated (StyleGAN) faces from the
   *140k Real and Fake Faces* dataset. See `ml/train_cnn.py`.
4. **Identity check.** If you have enrolled a reference photo, every face in the scan is compared with your
   SFace embedding. A match inside an image classified as fake raises a high-severity alert.

### Model results

The bundled checkpoint (`models/image_detector/efficientnet_b0_faces.pt`) is a **baseline**. It was
trained briefly (1 epoch, 640 images) to prove the pipeline end to end:

| Metric | Value |
|---|---|
| Test accuracy (200 held-out faces) | 68.5% |
| ROC-AUC | 0.78 |

Full training (`--train 14000 --epochs 3`, about 1.5 hours on CPU) is the next step and is expected to
raise accuracy considerably. Ready-made Hugging Face detectors were also evaluated on the same test faces
(`dima806/deepfake_vs_real_image_detection` 55%, `prithivMLmods/Deep-Fake-Detector-v2-Model` 47%). They
were trained on other kinds of fakes and do not transfer to GAN faces, so the project uses its own model.

## Tech stack

- **Backend:** Python 3.10+, FastAPI, PyMongo, PyTorch, OpenCV
- **Frontend:** React 18, Vite, React Router
- **Database:** MongoDB (local or Atlas)

## Project layout

```
backend/        FastAPI app (app/main.py), routers for auth, scans, identity and alerts
frontend/       React single-page app
ml/             Dataset download, training and evaluation scripts
models/         Trained image model + OpenCV face detection / recognition models
```

## Running locally

Prerequisites: Python 3.10+, Node 18+, and MongoDB running on `mongodb://localhost:27017` (or set
`MONGODB_URL` in `backend/.env`).

```bash
# 1. Backend  (http://127.0.0.1:8001, API docs at /docs)
cd backend
pip install -r requirements.txt
copy .env.example .env          # Linux/macOS: cp .env.example .env
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload

# 2. Frontend (http://localhost:5173)
cd frontend
npm install
copy .env.example .env
npm run dev
```

On Windows you can also double-click `start-backend.bat` and `start-frontend.bat`.

Open http://localhost:5173, create an account, then use **New scan** to analyse an image. Use
**Protected identity** to enrol a photo of yourself.

## Retraining the image model

```bash
pip install -r ml/requirements.txt
python ml/download_data.py                      # ~770 MB from Hugging Face
python ml/train_cnn.py --train 14000 --val 2000 --test 4000 --epochs 3
python ml/evaluate_pipeline.py --n 1000         # end-to-end check through the API pipeline
```

## API overview

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account, returns token |
| POST | `/api/auth/login` | Sign in, returns token |
| GET / PATCH | `/api/auth/me` | Current user / update name |
| POST | `/api/scans/image` | Analyse an image |
| GET | `/api/scans`, `/api/scans/stats`, `/api/scans/{id}` | History, statistics, detail |
| DELETE | `/api/scans/{id}` | Delete a scan |
| GET / POST / DELETE | `/api/identity` | View, enrol or remove protected face |
| GET | `/api/alerts` | Identity misuse alerts |
| GET | `/api/health` | Service, database and model status |

## Limitations

- The classifier is trained on GAN face images. It is strongest on face photos. Images from newer diffusion
  models without metadata tags, or images without faces, are less reliable.
- No detector is 100% accurate on all real-world media. Treat results as evidence, not proof.
