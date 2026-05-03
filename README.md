# training-rails — Rail Defect Detection

YOLOv8s-seg model that segments rail track and surface defects.

## Repo

```
training-rails/
├── model/best.pt   # trained weights
└── train.py        # training script
```

## Use the model

```python
from ultralytics import YOLO
m = YOLO("model/best.pt")
results = m.predict("path/to/image.jpg")
# video with tracking:
results = m.track("path/to/video.mp4", save=True)
```

Classes: `track`, `defect`.

## Training

```bash
pip install ultralytics
python train.py path/to/data.yaml
```
