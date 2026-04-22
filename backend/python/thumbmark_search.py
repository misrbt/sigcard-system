#!/usr/bin/env python3
"""
SigCard Thumbmark Search — Minutiae-based fingerprint matching.

How it works
------------
1. Enroll:  Load sigcard_front image → Gabor ridge enhancement → binarise →
            morphological thinning → crossing-number minutiae extraction →
            serialise (y, x, type) array as base64.

2. Search:  Extract probe minutiae → for each gallery template, count pairs
            where a probe minutia and a gallery minutia of the same type fall
            within MAX_DIST pixels of each other (simple translation-tolerant
            matching).  Return galleries with >= MATCH_THRESHOLD paired points.

Why not ORB:
   ORB matches visual texture / gradient corners.  All fingerprints share the
   same global structure (oval ridge patterns), so ORB cannot distinguish them.
   Minutiae (ridge endings + bifurcations) are the biometrically unique features.

Requirements
------------
    pip install opencv-python-headless Pillow numpy fingerprint-enhancer scikit-image scipy

Important note
--------------
   For highest accuracy the probe image should be a cropped/scanned thumbmark,
   NOT a full sigcard page scan.  Full-page scans mix document ridges (text
   outlines, form lines) with real fingerprint ridges, producing noisy minutiae.
   Gallery enrollment works on whatever image was stored as sigcard_front.
"""

import sys
import json
import base64
import struct
import warnings
import importlib

import cv2
import numpy as np
from PIL import Image

warnings.filterwarnings('ignore')

# ── Tuning constants ─────────────────────────────────────────────────────────
MATCH_THRESHOLD = 8  # minimum matched minutiae pairs → positive hit
MAX_DIST = 12  # pixel-distance tolerance for a minutiae pair
MINUTIAE_MAX = 180  # cap stored minutiae per template (keeps templates small)
BORDER_MARGIN = 12  # ignore minutiae within this many pixels of the image edge

# ── Image processing helpers ─────────────────────────────────────────────────


def _load_gray(path: str) -> np.ndarray:
    """Load any image format as uint8 grayscale."""
    return np.array(Image.open(path).convert('L'), dtype=np.uint8)


def _enhance(img: np.ndarray) -> np.ndarray:
    """
    Ridge-enhance a fingerprint image using a Gabor filter bank.

    Steps:
      1. CLAHE  — normalise local contrast
      2. Gabor  — amplify ridges, suppress background
      3. Otsu   — binarise (ridges = 255, background = 0)
    """
    # 1. Local contrast normalisation
    clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
    img = clahe.apply(img)

    # 2. Gabor filter bank (8 orientations)
    accumulated = np.zeros(img.shape, dtype=np.float32)
    for theta in np.linspace(0, np.pi, 8, endpoint=False):
        kern = cv2.getGaborKernel(
            ksize=(21, 21), sigma=3.0, theta=theta,
            lambd=8.0, gamma=0.5, psi=0, ktype=cv2.CV_32F,
        )
        filtered = cv2.filter2D(img.astype(np.float32), -1, kern)
        accumulated = np.maximum(accumulated, filtered)

    # 3. Binarise
    norm = cv2.normalize(accumulated, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)
    _, binary = cv2.threshold(norm, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    return binary


def _thin(binary: np.ndarray) -> np.ndarray:
    """Morphological thinning: reduce ridges to 1-pixel-wide skeletons."""
    bin_img = (binary > 0).astype(np.uint8)

    # Prefer scikit-image skeletonization if available.
    try:
        sk_morph = importlib.import_module("skimage.morphology")
        return sk_morph.skeletonize(bin_img > 0).astype(np.uint8)
    except Exception:
        pass

    # Fallback: OpenCV morphological skeletonization.
    img = (bin_img * 255).astype(np.uint8)
    skel = np.zeros_like(img)
    kernel = cv2.getStructuringElement(cv2.MORPH_CROSS, (3, 3))
    while True:
        eroded = cv2.erode(img, kernel)
        opened = cv2.dilate(eroded, kernel)
        temp = cv2.subtract(img, opened)
        skel = cv2.bitwise_or(skel, temp)
        img = eroded
        if cv2.countNonZero(img) == 0:
            break
    return (skel > 0).astype(np.uint8)


def _crossing_number(patch: np.ndarray) -> int:
    """
    Crossing Number (CN) for a 3×3 binary neighbourhood.
    CN=1 → ridge ending,  CN=3 → bifurcation.
    """
    # Clockwise neighbours starting from top-left
    p = [
        patch[0, 0], patch[0, 1], patch[0, 2],
        patch[1, 2], patch[2, 2], patch[2, 1],
        patch[2, 0], patch[1, 0],
    ]
    cn = sum(abs(p[(i + 1) % 8] - p[i]) for i in range(8))
    return cn // 2


def _extract_minutiae(path: str) -> np.ndarray | None:
    """
    Extract minutiae from a fingerprint image file.

    Returns an (N, 3) int32 array of (row, col, type)
    where type 1 = ridge ending, type 2 = bifurcation.
    Returns None if no minutiae detected.
    """
    img = _load_gray(path)
    binary = _enhance(img)
    ridge = _thin(binary)

    rows, cols = ridge.shape
    minutiae = []

    for r in range(1, rows - 1):
        for c in range(1, cols - 1):
            if ridge[r, c] == 0:
                continue
            patch = ridge[r - 1:r + 2, c - 1:c + 2]
            cn = _crossing_number(patch)
            if cn == 1:
                minutiae.append((r, c, 1))  # ridge ending
            elif cn == 3:
                minutiae.append((r, c, 2))  # bifurcation

    if not minutiae:
        return None

    arr = np.array(minutiae, dtype=np.int32)

    # Remove border minutiae (usually image-edge artefacts, not real ridges)
    mask = (
        (arr[:, 0] > BORDER_MARGIN) & (arr[:, 0] < rows - BORDER_MARGIN) & 
        (arr[:, 1] > BORDER_MARGIN) & (arr[:, 1] < cols - BORDER_MARGIN)
    )
    arr = arr[mask]

    if len(arr) == 0:
        return None

    # Keep the MINUTIAE_MAX most central minutiae to cap template size
    if len(arr) > MINUTIAE_MAX:
        cy = rows / 2.0
        cx = cols / 2.0
        dist = np.hypot(arr[:, 0] - cy, arr[:, 1] - cx)
        arr = arr[np.argsort(dist)[:MINUTIAE_MAX]]

    return arr

# ── Template serialisation ────────────────────────────────────────────────────


def _encode(arr: np.ndarray) -> str:
    """(N, 3) int32 ndarray → base64 string."""
    n, ncols = arr.shape
    header = struct.pack('>HH', n, ncols)
    return base64.b64encode(header + arr.astype(np.int32).tobytes()).decode('utf-8')


def _decode(encoded: str) -> np.ndarray | None:
    """base64 string → (N, 3) int32 ndarray, or None on error."""
    try:
        raw = base64.b64decode(encoded)
        n, ncols = struct.unpack('>HH', raw[:4])
        return np.frombuffer(raw[4:], dtype=np.int32).reshape(n, ncols).copy()
    except Exception:
        return None

# ── Matching ─────────────────────────────────────────────────────────────────


def _match_score(probe: np.ndarray, gallery: np.ndarray) -> float:
    """
    Count minutiae pairs where:
      - same type (both endings or both bifurcations)
      - Euclidean distance ≤ MAX_DIST pixels

    Greedy nearest-neighbour matching (each gallery minutia used at most once).
    Returns the count of matched pairs as the score.
    """
    if probe is None or gallery is None:
        return 0.0

    matched = 0
    used = set()

    for pm in probe:
        best_d = MAX_DIST + 1.0
        best_j = -1
        for j, gm in enumerate(gallery):
            if j in used or pm[2] != gm[2]:
                continue
            d = float(np.hypot(pm[0] - gm[0], pm[1] - gm[1]))
            if d < best_d:
                best_d = d
                best_j = j
        if best_j >= 0:
            matched += 1
            used.add(best_j)

    return float(matched)

# ── Commands ─────────────────────────────────────────────────────────────────


def cmd_enroll(image_path: str) -> None:
    """Extract minutiae template from a sigcard_front image and print as JSON."""
    try:
        arr = _extract_minutiae(image_path)
        if arr is None or len(arr) == 0:
            print(json.dumps({"ok": False, "error": "No minutiae detected — image may have no thumbmark"}))
            return
        encoded = _encode(arr)
        print(json.dumps({"ok": True, "template": encoded, "minutiae_count": len(arr)}))
    except Exception as exc:
        print(json.dumps({"ok": False, "error": str(exc)}))


def cmd_search(probe_path: str, gallery_json_path: str) -> None:
    """Compare probe minutiae against gallery templates and print scored matches."""
    try:
        probe_arr = _extract_minutiae(probe_path)
        if probe_arr is None or len(probe_arr) == 0:
            print(json.dumps({"error": "No minutiae detected in probe image"}), file=sys.stderr)
            sys.exit(1)

        with open(gallery_json_path, 'r', encoding='utf-8') as fh:
            gallery = json.load(fh)

        results = []
        for item in gallery:
            try:
                gallery_arr = _decode(item['template'])
                score = _match_score(probe_arr, gallery_arr)
                if score >= MATCH_THRESHOLD:
                    results.append({"id": item["id"], "score": round(score, 2)})
            except Exception:
                pass  # skip corrupted templates silently

        results.sort(key=lambda x: x['score'], reverse=True)
        print(json.dumps(results))

    except Exception as exc:
        print(json.dumps({"error": str(exc)}), file=sys.stderr)
        sys.exit(1)

# ── Entry point ───────────────────────────────────────────────────────────────


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"ok": False, "error": "Usage: thumbmark_search.py <enroll|search> <args...>"}))
        sys.exit(1)

    mode = sys.argv[1]

    if mode == 'enroll':
        cmd_enroll(sys.argv[2])
    elif mode == 'search':
        if len(sys.argv) < 4:
            print(json.dumps({"error": "search requires: <probe_path> <gallery_json_path>"}), file=sys.stderr)
            sys.exit(1)
        cmd_search(sys.argv[2], sys.argv[3])
    else:
        print(json.dumps({"ok": False, "error": f"Unknown mode: {mode}"}))
        sys.exit(1)
