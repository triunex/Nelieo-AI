PowerShell instructions to install Python and run the verification script

1) Install Python (choose one):

- Using the official installer (recommended):
  - Download from https://www.python.org/downloads/windows/ and run the installer.
  - During install: check "Add Python 3.x to PATH" and choose "Install Now".

- Using winget (if you have Windows 10/11 and winget available):
  ```powershell
  winget install --id Python.Python.3 -e --source winget
  ```

2) Open a new PowerShell window and verify Python is available:

```powershell
python --version
py --version
```

3) From the repo root, install dependencies:

```powershell
cd "N:\lumina-search-flow-main\aios-xpra-app"
python -m pip install --upgrade pip --user
python -m pip install -r requirements.txt --user
```

(If `python` is not found but `py` is available, replace `python` with `py -3`.)

4) Run the verification script:

```powershell
python verify_aetherion.py
```

5) If you prefer not to install Python globally, you can use a virtual environment:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python verify_aetherion.py
```

6) If you want, I can modify `verify_aetherion.py` to avoid external dependencies and run with stock Python; tell me if you prefer that.