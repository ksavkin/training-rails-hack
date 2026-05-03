"""Train YOLOv8n-seg for rail defect detection.

Usage:
    python train.py path/to/data.yaml
"""
import sys
from ultralytics import YOLO


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    data = sys.argv[1]

    model = YOLO("yolov8n-seg.pt")
    model.train(
        data=data,
        epochs=100,
        imgsz=1280,
        batch=8,
        multi_scale=True,
    )


if __name__ == "__main__":
    main()
