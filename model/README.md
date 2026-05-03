1. Create the virtual environment:
   ```bash
   python3 -m venv ~/model/venv
   ```

2. Activate the virtual environment:
   ```bash
   source ~/model/venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install ultralytics
   ```

4. Run scripts with the venv active:
   ```bash
   python3 onnx-export.py
   ```

5. Deactivate when done:
   ```bash
   deactivate
   ```
